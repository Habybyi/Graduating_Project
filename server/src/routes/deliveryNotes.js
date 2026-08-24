import { Router } from "express";
import { db } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { createDeliveryDocument, fetchDeliveryPdf } from "../services/superfaktura.js";

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
    dn.id, dn.status, dn.superfaktura_doc_id AS superfakturaDocId,
    dn.superfaktura_token AS superfakturaToken, dn.superfaktura_number AS superfakturaNumber,
    dn.created_at AS createdAt,
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
const setInvoicedStmt = db.prepare(`
  UPDATE delivery_notes
  SET status = 'invoiced', superfaktura_doc_id = ?, superfaktura_token = ?, superfaktura_number = ?
  WHERE id = ?
`);

// superfakturaToken is intentionally not exposed to the frontend — it
// isn't needed there, the PDF is fetched through our own proxy route below.
function loadNoteWithItems(id) {
  const note = getNoteStmt.get(id);
  if (!note) return null;
  const { superfakturaToken, ...publicFields } = note;
  return { ...publicFields, items: getItemsStmt.all(id) };
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

// Generates the real delivery note document via SuperFaktúra — see
// Documentation/Architecture/SuperFaktura_Integration.md. Only allowed
// once the note is ready_for_review and has at least one item, so a
// half-empty draft can't accidentally get invoiced.
router.post("/:id/invoice", async (req, res) => {
  const note = getNoteStmt.get(req.params.id);
  if (!note) {
    return res.status(404).json({ error: "Dodací list neexistuje." });
  }
  if (note.status !== "ready_for_review") {
    return res.status(409).json({ error: "Dodací list musí byť najprv označený ako pripravený na kontrolu." });
  }

  const items = getItemsStmt.all(note.id);
  if (items.length === 0) {
    return res.status(400).json({ error: "Dodací list nemá žiadne položky." });
  }

  let doc;
  try {
    doc = await createDeliveryDocument({
      customerName: note.customerName,
      customerAddress: note.customerAddress,
      items: items.map((i) => ({ name: i.productName, quantity: i.quantity })),
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }

  setInvoicedStmt.run(doc.id, doc.token, doc.formattedNumber, note.id);

  logActivity({
    actingUser: req.user,
    action: "delivery_note.invoiced",
    entityType: "DeliveryNote",
    entityId: note.id,
    summary: `${req.user.username} vygeneroval dodací list ${doc.formattedNumber} cez SuperFaktúru`,
    metadata: { superfakturaDocId: doc.id, formattedNumber: doc.formattedNumber },
  });

  res.json(loadNoteWithItems(note.id));
});

// Proxies the PDF through our backend rather than exposing the
// SuperFaktúra token/credentials to the browser directly.
router.get("/:id/pdf", async (req, res) => {
  const note = getNoteStmt.get(req.params.id);
  if (!note || !note.superfakturaDocId || !note.superfakturaToken) {
    return res.status(404).json({ error: "Pre tento dodací list ešte nebolo vygenerované PDF." });
  }

  try {
    const pdfBuffer = await fetchDeliveryPdf(note.superfakturaDocId, note.superfakturaToken);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="dodaci-list-${note.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
