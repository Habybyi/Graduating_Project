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
const findCustomerStmt = db.prepare("SELECT * FROM customers WHERE id = ?");
const updateCustomerStmt = db.prepare("UPDATE customers SET name = ?, address = ? WHERE id = ?");
const deleteCustomerStmt = db.prepare("DELETE FROM customers WHERE id = ?");

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

router.patch("/:id", (req, res) => {
  const customer = findCustomerStmt.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: "Zákazník neexistuje." });
  }
  const { name, address } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "Zadaj názov zákazníka." });
  }

  updateCustomerStmt.run(name, address || null, customer.id);

  logActivity({
    actingUser: req.user,
    action: "customer.updated",
    entityType: "Customer",
    entityId: customer.id,
    summary: `${req.user.username} upravil zákazníka '${name}'`,
  });

  res.json({ id: customer.id, name, address: address || null });
});

router.delete("/:id", (req, res) => {
  const customer = findCustomerStmt.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: "Zákazník neexistuje." });
  }

  try {
    deleteCustomerStmt.run(customer.id);
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return res.status(409).json({ error: "Zákazníka nejde zmazať, má priradené dodacie listy." });
    }
    throw err;
  }

  logActivity({
    actingUser: req.user,
    action: "customer.deleted",
    entityType: "Customer",
    entityId: customer.id,
    summary: `${req.user.username} zmazal zákazníka '${customer.name}'`,
  });

  res.json({ status: "ok" });
});

export default router;
