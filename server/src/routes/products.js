import { Router } from "express";
import multer from "multer";
import { db } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { processPackageUpload, validatePackage } from "../services/productPackages.js";
import { findBestMatch } from "../services/matching.js";

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
const updateProductStmt = db.prepare("UPDATE products SET name = ?, unit_type = ? WHERE id = ?");
const deactivateProductStmt = db.prepare("UPDATE products SET is_active = 0 WHERE id = ?");
const listTestImagesStmt = db.prepare(
  "SELECT id, embedding_vector AS embeddingVector FROM test_images WHERE product_id = ?"
);
const findTestImageStmt = db.prepare("SELECT * FROM test_images WHERE id = ? AND product_id = ?");
const listPrototypesStmt = db.prepare(`
  SELECT pp.product_id AS productId, pp.embedding_vector AS embeddingVector,
         p.name AS productName, p.unit_type AS unitType
  FROM product_prototypes pp
  JOIN products p ON p.id = pp.product_id
  WHERE p.is_active = 1
`);

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

router.patch("/:id", (req, res) => {
  const product = findProductStmt.get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Produkt neexistuje." });
  }
  const { name, unitType } = req.body || {};
  if (!name || !["piece", "whole"].includes(unitType)) {
    return res.status(400).json({ error: "Zadaj názov a typ ('piece' alebo 'whole')." });
  }

  updateProductStmt.run(name, unitType, product.id);

  logActivity({
    actingUser: req.user,
    action: "product.updated",
    entityType: "Product",
    entityId: product.id,
    summary: `${req.user.username} upravil produkt '${name}'`,
  });

  res.json({ id: product.id, name, unitType });
});

// Soft delete — products carry prototypes/delivery-note-item history that
// must survive (see Data_Model.md), so this deactivates rather than
// deletes. Deactivated products drop out of every listing/matching query.
router.delete("/:id", (req, res) => {
  const product = findProductStmt.get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Produkt neexistuje." });
  }

  deactivateProductStmt.run(product.id);

  logActivity({
    actingUser: req.user,
    action: "product.deactivated",
    entityType: "Product",
    entityId: product.id,
    summary: `${req.user.username} deaktivoval produkt '${product.name}'`,
  });

  res.json({ status: "ok" });
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
  const validationError = validatePackage(type, req.files?.length || 0);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  // Fail with whatever was already processed reported, rather than a bare
  // 500 — e.g. an unsupported format (Gemini only accepts PNG/JPEG) should
  // be a clear, actionable message, not a crash.
  const result = await processPackageUpload({ product, type, files: req.files, actingUser: req.user });
  if (result.error) {
    return res.status(422).json(result);
  }

  res.status(201).json(result);
});

// Runs each of this product's test images through the exact same
// recognition pipeline a real delivery photo goes through (embedding →
// compare against every active product's prototypes), and checks whether
// the top match was this product — see Documentation/Testing/Test_Plan.md
// ("Top-1 accuracy"). Test image embeddings are already cached from
// upload time, so this is just cosine-similarity math, no Gemini calls.
router.get("/:id/test-accuracy", (req, res) => {
  const product = findProductStmt.get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Produkt neexistuje." });
  }

  const testImages = listTestImagesStmt.all(product.id);
  if (testImages.length === 0) {
    return res.status(400).json({ error: "Produkt nemá žiadne testovacie fotky." });
  }

  const prototypes = listPrototypesStmt.all().map((p) => ({
    ...p,
    embeddingVector: JSON.parse(p.embeddingVector),
  }));
  if (prototypes.length === 0) {
    return res.status(400).json({ error: "V systéme ešte nie sú žiadne naučené fotky." });
  }

  const results = testImages.map((testImage) => {
    const embedding = JSON.parse(testImage.embeddingVector);
    const best = findBestMatch(embedding, prototypes);
    return {
      id: testImage.id,
      predictedProductId: best.productId,
      predictedProductName: best.productName,
      confidence: best.similarity,
      correct: best.productId === product.id,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;

  res.json({
    productId: product.id,
    productName: product.name,
    testImageCount: results.length,
    correctCount,
    accuracyPercent: Math.round((correctCount / results.length) * 100),
    results,
  });
});

// Serves one stored test-image file for display in the accuracy report
// above — requires auth like the rest of this router, and is scoped to
// the product in the URL so one product's test images can't be fetched
// through another product's id.
router.get("/:id/test-images/:testImageId/photo", (req, res) => {
  const testImage = findTestImageStmt.get(req.params.testImageId, req.params.id);
  if (!testImage) {
    return res.status(404).json({ error: "Fotka neexistuje." });
  }
  res.sendFile(testImage.image_ref);
});

export default router;
