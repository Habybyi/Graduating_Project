import { Router } from "express";
import multer from "multer";
import { db } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";
import { processPackageUpload, validatePackage } from "../services/productPackages.js";

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

export default router;
