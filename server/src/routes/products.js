import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { computeEmbedding } from "../services/embeddings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_IMAGES_DIR = path.join(__dirname, "../../data/test-images");
fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });

const router = Router();

// Both roles can view products; creating one is open to both for now too —
// see Documentation/Architecture/AI_Recognition.md, reference-photo upload
// (Phase 4) is a separate endpoint from this basic catalog entry.
router.use(requireAuth);

// Memory storage only — training photos are never written to disk at all,
// which trivially satisfies the "delete right after the embedding is
// extracted" rule in AI_Recognition.md (there's nothing to delete, they
// only ever exist in the request's memory buffer). Test-package photos are
// the deliberate exception and get written to TEST_IMAGES_DIR below.
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 20, fileSize: 15 * 1024 * 1024 } });

const listProductsStmt = db.prepare(
  "SELECT id, name, unit_type AS unitType, is_active AS isActive, created_at AS createdAt FROM products WHERE is_active = 1 ORDER BY name"
);
const insertProductStmt = db.prepare("INSERT INTO products (name, unit_type) VALUES (?, ?)");
const findProductStmt = db.prepare("SELECT * FROM products WHERE id = ?");
const countPrototypesStmt = db.prepare("SELECT COUNT(*) AS count FROM product_prototypes WHERE product_id = ?");
const countTestImagesStmt = db.prepare("SELECT COUNT(*) AS count FROM test_images WHERE product_id = ?");
const insertPrototypeStmt = db.prepare(
  "INSERT INTO product_prototypes (product_id, embedding_vector, source_photo_count) VALUES (?, ?, 1)"
);
const insertTestImageStmt = db.prepare(
  "INSERT INTO test_images (product_id, image_ref, embedding_vector) VALUES (?, ?, ?)"
);

router.get("/", (req, res) => {
  res.json(listProductsStmt.all());
});

router.post("/", (req, res) => {
  const { name, unitType } = req.body || {};
  if (!name || !["piece", "whole"].includes(unitType)) {
    return res.status(400).json({ error: "Zadaj názov a typ ('piece' alebo 'whole')." });
  }

  const { lastInsertRowid: productId } = insertProductStmt.run(name, unitType);

  logActivity({
    actingUser: req.user,
    action: "product.created",
    entityType: "Product",
    entityId: productId,
    summary: `${req.user.username} pridal produkt '${name}'`,
  });

  res.status(201).json({ id: productId, name, unitType, isActive: true });
});

router.get("/:id", (req, res) => {
  const product = findProductStmt.get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Produkt neexistuje." });
  }
  res.json({
    id: product.id,
    name: product.name,
    unitType: product.unit_type,
    isActive: Boolean(product.is_active),
    prototypeCount: countPrototypesStmt.get(product.id).count,
    testImageCount: countTestImagesStmt.get(product.id).count,
  });
});

// Accepts a batch of reference photos as one "package" — see
// Documentation/Navigation/Website.md ("Adding a new product") and
// Documentation/Architecture/AI_Recognition.md for the training vs. test
// distinction. multipart/form-data: field "type" = training|test, field
// "photos" = one or more files.
router.post("/:id/packages", upload.array("photos"), async (req, res) => {
  const product = findProductStmt.get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Produkt neexistuje." });
  }

  const { type } = req.body || {};
  if (!["training", "test"].includes(type)) {
    return res.status(400).json({ error: "Typ balíčka musí byť 'training' alebo 'test'." });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "Nahraj aspoň jednu fotku." });
  }

  let processed = 0;
  for (const file of req.files) {
    let embedding;
    try {
      embedding = await computeEmbedding(file.buffer, file.mimetype);
    } catch (err) {
      // Fail with whatever was already processed reported, rather than a
      // bare 500 — e.g. an unsupported format (Gemini only accepts
      // PNG/JPEG) should be a clear, actionable message, not a crash.
      return res.status(422).json({
        error: `Fotka '${file.originalname}' sa nedala spracovať: ${err.message}`,
        processed,
      });
    }

    if (type === "training") {
      insertPrototypeStmt.run(product.id, JSON.stringify(embedding));
      // file.buffer is never written to disk — see the multer config above.
    } else {
      const filename = `${product.id}-${Date.now()}-${processed}${path.extname(file.originalname) || ".jpg"}`;
      const imageRef = path.join(TEST_IMAGES_DIR, filename);
      fs.writeFileSync(imageRef, file.buffer);
      insertTestImageStmt.run(product.id, imageRef, JSON.stringify(embedding));
    }
    processed += 1;
  }

  if (type === "training") {
    logActivity({
      actingUser: req.user,
      action: "product.reference_photos_uploaded",
      entityType: "Product",
      entityId: product.id,
      summary: `${req.user.username} nahral ${processed} tréningových fotiek pre '${product.name}'`,
    });
  }

  res.status(201).json({
    processed,
    type,
    prototypeCount: countPrototypesStmt.get(product.id).count,
    testImageCount: countTestImagesStmt.get(product.id).count,
  });
});

export default router;
