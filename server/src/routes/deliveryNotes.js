import { Router } from "express";
import { db } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";

const router = Router();
router.use(requireAuth);

const listStmt = db.prepare(`
  SELECT
    dn.id, dn.status, dn.created_at AS createdAt,
    c.id AS customerId, c.name AS customerName,
    u.username AS createdByUsername,
    (SELECT COUNT(*) FROM delivery_note_items WHERE delivery_note_id = dn.id) AS itemCount
  FROM delivery_notes dn
  JOIN customers c ON c.id = dn.customer_id
  JOIN users u ON u.id = dn.created_by_user_id
  ORDER BY dn.created_at DESC
`);

const getNoteStmt = db.prepare(`
  SELECT
    dn.id, dn.status, dn.superfaktura_doc_id AS superfakturaDocId, dn.created_at AS createdAt,
    c.id AS customerId, c.name AS customerName, c.address AS customerAddress,
    u.username AS createdByUsername
  FROM delivery_notes dn
  JOIN customers c ON c.id = dn.customer_id
  JOIN users u ON u.id = dn.created_by_user_id
  WHERE dn.id = ?
`);

const getItemsStmt = db.prepare(`
  SELECT dni.id, dni.quantity, dni.ai_confidence AS aiConfidence,
         dni.was_manually_corrected AS wasManuallyCorrected,
         p.id AS productId, p.name AS productName, p.unit_type AS unitType
  FROM delivery_note_items dni
  JOIN products p ON p.id = dni.product_id
  WHERE dni.delivery_note_id = ?
  ORDER BY dni.created_at
`);

const insertNoteStmt = db.prepare(
  "INSERT INTO delivery_notes (customer_id, created_by_user_id, status) VALUES (?, ?, 'draft')"
);
// Adding a product that's already on this delivery note merges the
// quantity into the existing row instead of creating a duplicate.
const upsertItemStmt = db.prepare(`
  INSERT INTO delivery_note_items (delivery_note_id, product_id, quantity)
  VALUES (?, ?, ?)
  ON CONFLICT(delivery_note_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity
`);
const deleteItemStmt = db.prepare("DELETE FROM delivery_note_items WHERE id = ? AND delivery_note_id = ?");
const updateStatusStmt = db.prepare("UPDATE delivery_notes SET status = ? WHERE id = ?");

function loadNoteWithItems(id) {
  const note = getNoteStmt.get(id);
  if (!note) return null;
  return { ...note, items: getItemsStmt.all(id) };
}

router.get("/", (req, res) => {
  res.json(listStmt.all());
});

router.post("/", (req, res) => {
  const { customerId } = req.body || {};
  if (!customerId) {
    return res.status(400).json({ error: "Zadaj zákazníka." });
  }

  const { lastInsertRowid: noteId } = insertNoteStmt.run(customerId, req.user.id);

  logActivity({
    actingUser: req.user,
    action: "delivery_note.created",
    entityType: "DeliveryNote",
    entityId: noteId,
    summary: `${req.user.username} vytvoril dodací list #${noteId}`,
  });

  res.status(201).json(loadNoteWithItems(noteId));
});

router.get("/:id", (req, res) => {
  const note = loadNoteWithItems(req.params.id);
  if (!note) {
    return res.status(404).json({ error: "Dodací list neexistuje." });
  }
  res.json(note);
});

router.post("/:id/items", (req, res) => {
  const note = getNoteStmt.get(req.params.id);
  if (!note) {
    return res.status(404).json({ error: "Dodací list neexistuje." });
  }
  const { productId, quantity } = req.body || {};
  if (!productId || !quantity || quantity < 1) {
    return res.status(400).json({ error: "Zadaj produkt a množstvo (aspoň 1)." });
  }

  upsertItemStmt.run(note.id, productId, quantity);
  res.status(201).json(loadNoteWithItems(note.id));
});

router.delete("/:id/items/:itemId", (req, res) => {
  deleteItemStmt.run(req.params.itemId, req.params.id);
  res.json(loadNoteWithItems(req.params.id));
});

router.patch("/:id/status", (req, res) => {
  const note = getNoteStmt.get(req.params.id);
  if (!note) {
    return res.status(404).json({ error: "Dodací list neexistuje." });
  }
  const { status } = req.body || {};
  if (!["draft", "ready_for_review"].includes(status)) {
    return res.status(400).json({ error: "Neplatný stav." });
  }

  updateStatusStmt.run(status, note.id);
  res.json(loadNoteWithItems(note.id));
});

export default router;
