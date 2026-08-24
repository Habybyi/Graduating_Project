import { Router } from "express";
import { db } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";

const router = Router();

// Both roles can view products; creating one is open to both for now too —
// see Documentation/Architecture/AI_Recognition.md, reference-photo upload
// (Phase 4) is a separate endpoint from this basic catalog entry.
router.use(requireAuth);

const listProductsStmt = db.prepare(
  "SELECT id, name, unit_type AS unitType, is_active AS isActive, created_at AS createdAt FROM products WHERE is_active = 1 ORDER BY name"
);
const insertProductStmt = db.prepare("INSERT INTO products (name, unit_type) VALUES (?, ?)");

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

export default router;
