import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/connection.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { generateTemporaryPassword } from "../utils/password.js";
import { logActivity } from "../services/activityLog.js";

const router = Router();

// Every route here is manager-only — see Documentation/Architecture/Roles_And_Onboarding.md.
router.use(requireAuth, requireRole("manager"));

const listUsersStmt = db.prepare(
  "SELECT id, username, role, must_change_password AS mustChangePassword, created_at AS createdAt FROM users ORDER BY created_at DESC"
);
const findUserByUsername = db.prepare("SELECT id FROM users WHERE username = ?");
const insertUserStmt = db.prepare(
  "INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, 1)"
);
const findUserByIdStmt = db.prepare("SELECT id, username, role FROM users WHERE id = ?");
const resetPasswordStmt = db.prepare(
  "UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?"
);
const updateRoleStmt = db.prepare("UPDATE users SET role = ? WHERE id = ?");

router.get("/", (req, res) => {
  res.json(listUsersStmt.all());
});

router.post("/", async (req, res) => {
  const { username, role } = req.body || {};
  if (!username || !role) {
    return res.status(400).json({ error: "Zadaj používateľské meno a rolu." });
  }
  if (findUserByUsername.get(username)) {
    return res.status(409).json({ error: "Toto používateľské meno už existuje." });
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  const { lastInsertRowid: userId } = insertUserStmt.run(username, passwordHash, role);

  logActivity({
    actingUser: req.user,
    action: "user.created",
    entityType: "User",
    entityId: userId,
    summary: `${req.user.username} vytvoril účet '${username}' (${role})`,
  });

  res.status(201).json({ id: userId, username, role, temporaryPassword });
});

router.post("/:id/reset-password", async (req, res) => {
  const targetUser = findUserByIdStmt.get(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: "Používateľ neexistuje." });
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);
  resetPasswordStmt.run(passwordHash, targetUser.id);

  logActivity({
    actingUser: req.user,
    action: "user.password_reset",
    entityType: "User",
    entityId: targetUser.id,
    summary: `${req.user.username} resetoval heslo pre '${targetUser.username}'`,
  });

  res.json({ temporaryPassword });
});

router.patch("/:id/role", (req, res) => {
  const { role } = req.body || {};
  if (!role) {
    return res.status(400).json({ error: "Zadaj novú rolu." });
  }

  const targetUser = findUserByIdStmt.get(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: "Používateľ neexistuje." });
  }

  const previousRole = targetUser.role;
  updateRoleStmt.run(role, targetUser.id);

  logActivity({
    actingUser: req.user,
    action: "user.role_changed",
    entityType: "User",
    entityId: targetUser.id,
    summary: `${req.user.username} zmenil rolu '${targetUser.username}' z ${previousRole} na ${role}`,
    metadata: { from: previousRole, to: role },
  });

  res.json({ id: targetUser.id, username: targetUser.username, role });
});

export default router;
