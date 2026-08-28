import { Router } from "express";
import crypto from "node:crypto";
import multer from "multer";
import { db } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { processPackageUpload, validatePackage } from "../services/productPackages.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 30, fileSize: 15 * 1024 * 1024 } });

const SESSION_TTL_MINUTES = 30; // see Documentation/Architecture/Network_Session.md

const insertSessionStmt = db.prepare(`
  INSERT INTO product_photo_sessions (token, product_id, package_type, status, expires_at)
  VALUES (?, ?, ?, 'active', ?)
`);
const findSessionStmt = db.prepare("SELECT * FROM product_photo_sessions WHERE token = ?");
const findProductStmt = db.prepare("SELECT * FROM products WHERE id = ?");
const completeSessionStmt = db.prepare("UPDATE product_photo_sessions SET status = 'completed' WHERE id = ?");
const expireSessionStmt = db.prepare("UPDATE product_photo_sessions SET status = 'expired' WHERE id = ?");

function loadValidSession(token) {
  const session = findSessionStmt.get(token);
  if (!session) return { error: "Neplatný QR kód." };
  if (session.status === "completed") return { error: "Tento balíček už bol odoslaný." };
  if (session.status !== "active") return { error: "Tento QR kód už nie je aktívny." };
  if (new Date(session.expires_at) < new Date()) {
    expireSessionStmt.run(session.id);
    return { error: "Platnosť QR kódu vypršala. Vygeneruj nový na PC." };
  }
  return { session };
}

// Creating a session requires being logged in as manager/driver at the PC —
// everything under /:token below this is deliberately public (the token
// itself is the authorization, same pattern as sessions.js).
router.post("/for-product/:productId", requireAuth, (req, res) => {
  const product = findProductStmt.get(req.params.productId);
  if (!product) {
    return res.status(404).json({ error: "Produkt neexistuje." });
  }
  const { type } = req.body || {};
  if (!["training", "test"].includes(type)) {
    return res.status(400).json({ error: "Typ balíčka musí byť 'training' alebo 'test'." });
  }

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000).toISOString();
  insertSessionStmt.run(token, product.id, type, expiresAt);

  res.status(201).json({ token, expiresAt, packageType: type });
});

router.get("/:token", (req, res) => {
  const { session, error } = loadValidSession(req.params.token);
  if (error) return res.status(410).json({ error });

  const product = findProductStmt.get(session.product_id);
  res.json({
    productId: product.id,
    productName: product.name,
    packageType: session.package_type,
    expiresAt: session.expires_at,
  });
});

// Submits the whole package collected on the phone in one go — same
// processing (and same minimum-photo rule) as the PC upload in
// products.js, via the shared helper. Public/token-authorized, so no
// activity-log attribution (actingUser: null), matching phone-submitted
// delivery items in sessions.js.
router.post("/:token/photos", upload.array("photos"), async (req, res) => {
  const { session, error } = loadValidSession(req.params.token);
  if (error) return res.status(410).json({ error });

  const validationError = validatePackage(session.package_type, req.files?.length || 0);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const product = findProductStmt.get(session.product_id);
  const result = await processPackageUpload({
    product,
    type: session.package_type,
    files: req.files,
    actingUser: null,
  });
  if (result.error) {
    return res.status(422).json(result);
  }

  completeSessionStmt.run(session.id);
  res.status(201).json(result);
});

export default router;
