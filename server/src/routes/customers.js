import { Router } from "express";
import { db } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { logActivity } from "../services/activityLog.js";

const router = Router();

// Both roles can view/manage customers — drivers need to pick one when
// creating a delivery note (Phase 2), managers need to keep the list tidy.
router.use(requireAuth);

const listCustomersStmt = db.prepare(
  "SELECT id, name, address, superfaktura_client_id AS superfakturaClientId, created_at AS createdAt FROM customers ORDER BY name"
);
const insertCustomerStmt = db.prepare("INSERT INTO customers (name, address) VALUES (?, ?)");

router.get("/", (req, res) => {
  res.json(listCustomersStmt.all());
});

router.post("/", (req, res) => {
  const { name, address } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "Zadaj názov zákazníka." });
  }

  const { lastInsertRowid: customerId } = insertCustomerStmt.run(name, address || null);

  logActivity({
    actingUser: req.user,
    action: "customer.created",
    entityType: "Customer",
    entityId: customerId,
    summary: `${req.user.username} pridal zákazníka '${name}'`,
  });

  res.status(201).json({ id: customerId, name, address: address || null });
});

export default router;
