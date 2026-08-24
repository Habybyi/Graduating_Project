import { Router } from "express";
import { db } from "../db/connection.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Manager-only — see Documentation/Architecture/Activity_Log.md.
router.use(requireAuth, requireRole("manager"));

router.get("/", (req, res) => {
  const { role, userId, action, from, to } = req.query;

  let query = `
    SELECT al.id, al.user_id AS userId, u.username, al.user_role AS userRole,
           al.action, al.entity_type AS entityType, al.entity_id AS entityId,
           al.summary, al.metadata, al.created_at AS createdAt
    FROM activity_log al
    JOIN users u ON u.id = al.user_id
    WHERE 1 = 1
  `;
  const params = [];

  if (role) {
    query += " AND al.user_role = ?";
    params.push(role);
  }
  if (userId) {
    query += " AND al.user_id = ?";
    params.push(userId);
  }
  if (action) {
    query += " AND al.action = ?";
    params.push(action);
  }
  if (from) {
    query += " AND al.created_at >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND al.created_at <= ?";
    params.push(to);
  }

  query += " ORDER BY al.created_at DESC LIMIT 300";

  res.json(db.prepare(query).all(...params));
});

// Powers the filter dropdowns — distinct values actually present in the
// log, rather than a hardcoded list that can drift from reality.
router.get("/filters", (req, res) => {
  const roles = db.prepare("SELECT DISTINCT user_role AS value FROM activity_log ORDER BY value").all();
  const actions = db.prepare("SELECT DISTINCT action AS value FROM activity_log ORDER BY value").all();
  res.json({
    roles: roles.map((r) => r.value),
    actions: actions.map((a) => a.value),
  });
});

export default router;
