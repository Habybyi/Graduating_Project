import { Router } from "express";
import crypto from "node:crypto";
import multer from "multer";
import sharp from "sharp";
import { db } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { computeEmbedding } from "../services/embeddings.js";
import { findBestMatch } from "../services/matching.js";
import { detectRegions } from "../services/localization.js";
import { aggregateRegions } from "../services/aggregation.js";

// Crops one detected region out of the full photo. box_2d is normalized
// 0-1000 [ymin, xmin, ymax, xmax] (Gemini's bounding-box convention) — see
// Documentation/Architecture/AI_Recognition.md.
async function cropRegion(buffer, box_2d) {
  const image = sharp(buffer);
  const { width, height } = await image.metadata();
  const [ymin, xmin, ymax, xmax] = box_2d;

  const left = Math.max(0, Math.round((xmin / 1000) * width));
  const top = Math.max(0, Math.round((ymin / 1000) * height));
  const cropWidth = Math.min(width - left, Math.max(1, Math.round(((xmax - xmin) / 1000) * width)));
  const cropHeight = Math.min(height - top, Math.max(1, Math.round(((ymax - ymin) / 1000) * height)));

  return image.extract({ left, top, width: cropWidth, height: cropHeight }).toBuffer();
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const SESSION_TTL_MINUTES = 30; // see Documentation/Architecture/Network_Session.md
const CONFIDENCE_THRESHOLD = 0.7; // tuning parameter, see AI_Recognition.md — set empirically once real prototypes/test images exist

const insertSessionStmt = db.prepare(`
  INSERT INTO delivery_sessions (token, delivery_note_id, status, expires_at)
  VALUES (?, ?, 'active', ?)
`);
const findSessionStmt = db.prepare("SELECT * FROM delivery_sessions WHERE token = ?");
const findNoteStmt = db.prepare(`
  SELECT dn.id, dn.status, c.name AS customerName
  FROM delivery_notes dn JOIN customers c ON c.id = dn.customer_id
  WHERE dn.id = ?
`);
const listProductsStmt = db.prepare(
  "SELECT id, name, unit_type AS unitType FROM products WHERE is_active = 1 ORDER BY name"
);
const listPrototypesStmt = db.prepare(`
  SELECT pp.product_id AS productId, pp.embedding_vector AS embeddingVector,
         p.name AS productName, p.unit_type AS unitType
  FROM product_prototypes pp
  JOIN products p ON p.id = pp.product_id
  WHERE p.is_active = 1
`);
// Adding a product already on this note merges quantity into the existing
// row (see the UNIQUE constraint on delivery_note_items). The new
// confidence/correction values win on merge — they describe the photo
// just taken, which is more relevant than a stale earlier one.
const upsertItemStmt = db.prepare(`
  INSERT INTO delivery_note_items (delivery_note_id, product_id, quantity, ai_confidence, was_manually_corrected)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(delivery_note_id, product_id) DO UPDATE SET
    quantity = quantity + excluded.quantity,
    ai_confidence = excluded.ai_confidence,
    was_manually_corrected = was_manually_corrected OR excluded.was_manually_corrected
`);
const expireSessionStmt = db.prepare("UPDATE delivery_sessions SET status = 'expired' WHERE id = ?");

function loadValidSession(token) {
  const session = findSessionStmt.get(token);
  if (!session) return { error: "Neplatný QR kód." };
  if (session.status !== "active") return { error: "Tento QR kód už nie je aktívny." };
  if (new Date(session.expires_at) < new Date()) {
    expireSessionStmt.run(session.id);
    return { error: "Platnosť QR kódu vypršala. Vygeneruj nový na PC." };
  }
  return { session };
}

// Creating a session requires being logged in as the driver at the PC —
// everything under /sessions/:token below this is deliberately public
// (the token itself is the authorization, see Network_Session.md).
router.post("/for-note/:noteId", requireAuth, (req, res) => {
  const note = findNoteStmt.get(req.params.noteId);
  if (!note) {
    return res.status(404).json({ error: "Dodací list neexistuje." });
  }

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000).toISOString();
  insertSessionStmt.run(token, note.id, expiresAt);

  res.status(201).json({ token, expiresAt });
});

router.get("/:token", (req, res) => {
  const { session, error } = loadValidSession(req.params.token);
  if (error) return res.status(410).json({ error });

  const note = findNoteStmt.get(session.delivery_note_id);
  res.json({
    deliveryNoteId: note.id,
    customerName: note.customerName,
    products: listProductsStmt.all(),
    expiresAt: session.expires_at,
  });
});

// Single-item photo recognition — see Documentation/Architecture/AI_Recognition.md.
// Does NOT save anything; just returns a suggestion for the driver to
// confirm (with quantity) via POST /:token/items below. The photo itself
// is never written to disk (memoryStorage) and is discarded once this
// request finishes, matching the image-lifecycle rule for delivery photos.
router.post("/:token/recognize", upload.single("photo"), async (req, res) => {
  const { error } = loadValidSession(req.params.token);
  if (error) return res.status(410).json({ error });
  if (!req.file) {
    return res.status(400).json({ error: "Chýba fotka." });
  }

  let embedding;
  try {
    embedding = await computeEmbedding(req.file.buffer, req.file.mimetype);
  } catch (err) {
    return res.status(422).json({ error: err.message });
  }

  const prototypes = listPrototypesStmt.all().map((p) => ({
    ...p,
    embeddingVector: JSON.parse(p.embeddingVector),
  }));

  if (prototypes.length === 0) {
    return res.json({ match: null, confidence: 0 });
  }

  const best = findBestMatch(embedding, prototypes);
  res.json({
    match: {
      productId: best.productId,
      productName: best.productName,
      unitType: best.unitType,
    },
    confidence: best.similarity,
    confident: best.similarity >= CONFIDENCE_THRESHOLD,
  });
});

// Multi-item photo recognition — the actual two-stage pipeline from
// AI_Recognition.md: localize every distinct item/slice, classify each
// crop independently, then apply the piece/whole counting rules. Nothing
// is saved here either; the driver reviews the aggregated suggestion and
// confirms via /:token/items (looped client-side), same as the
// single-item path. No crop or the original photo is ever written to disk.
router.post("/:token/recognize-multi", upload.single("photo"), async (req, res) => {
  const { error } = loadValidSession(req.params.token);
  if (error) return res.status(410).json({ error });
  if (!req.file) {
    return res.status(400).json({ error: "Chýba fotka." });
  }

  const prototypes = listPrototypesStmt.all().map((p) => ({
    ...p,
    embeddingVector: JSON.parse(p.embeddingVector),
  }));
  if (prototypes.length === 0) {
    return res.json({ regions: [], aggregated: [] });
  }

  // Phone photos store their rotation as EXIF metadata rather than in the
  // pixels. Gemini honors it, sharp's extract() does not — so without
  // normalizing first, crops land on the wrong part of the photo. Resizing
  // here also keeps the Gemini upload small (a 12MP photo is overkill).
  let photo;
  try {
    photo = await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch {
    return res.status(422).json({ error: "Fotku sa nepodarilo načítať. Skús iný formát (JPEG/PNG)." });
  }

  let boxes;
  try {
    boxes = await detectRegions(photo, "image/jpeg");
  } catch (err) {
    return res.status(422).json({ error: `Lokalizácia zlyhala: ${err.message}` });
  }

  const regions = [];
  let failedCount = 0;
  for (const box of boxes) {
    try {
      const crop = await cropRegion(photo, box.box_2d);
      const embedding = await computeEmbedding(crop, "image/jpeg");
      const best = findBestMatch(embedding, prototypes);
      regions.push({
        label: box.label,
        productId: best.productId,
        productName: best.productName,
        unitType: best.unitType,
        confidence: best.similarity,
        confident: best.similarity >= CONFIDENCE_THRESHOLD,
      });
    } catch (err) {
      failedCount += 1;
      console.warn(`recognize-multi: skipped one region (${err.message})`);
    }
  }

  if (regions.length === 0) {
    return res.status(422).json({
      error: `Našlo sa ${boxes.length} kusov, ale žiadny sa nepodarilo spracovať. Skús to znova.`,
    });
  }

  const confidentRegions = regions.filter((r) => r.confident);
  const aggregated = aggregateRegions(confidentRegions);
  const unmatchedCount = regions.length - confidentRegions.length + failedCount;

  res.json({ regions, aggregated, unmatchedCount });
});

router.post("/:token/items", (req, res) => {
  const { session, error } = loadValidSession(req.params.token);
  if (error) return res.status(410).json({ error });

  const { productId, quantity, aiConfidence, wasManuallyCorrected } = req.body || {};
  if (!productId || !quantity || quantity < 1) {
    return res.status(400).json({ error: "Zadaj produkt a množstvo." });
  }

  upsertItemStmt.run(
    session.delivery_note_id,
    productId,
    quantity,
    typeof aiConfidence === "number" ? aiConfidence : null,
    wasManuallyCorrected ? 1 : 0
  );
  res.status(201).json({ status: "ok" });
});

export default router;
