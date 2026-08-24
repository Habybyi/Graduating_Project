import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { validatePasswordStrength } from "../utils/password.js";

const router = Router();

const findUserByUsername = db.prepare("SELECT * FROM users WHERE username = ?");
const updatePasswordStmt = db.prepare(
  "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?"
);

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Zadaj používateľské meno aj heslo." });
  }

  const user = findUserByUsername.get(username);
  if (!user) {
    return res.status(401).json({ error: "Nesprávne meno alebo heslo." });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Nesprávne meno alebo heslo." });
  }

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "12h" });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: Boolean(user.must_change_password),
    },
  });
});

// Any logged-in user can change their own password — used both for the
// forced first-login change and later voluntary changes. See
// Documentation/Architecture/Roles_And_Onboarding.md.
router.post("/change-password", requireAuth, async (req, res) => {
  const { newPassword } = req.body || {};
  const validationError = validatePasswordStrength(newPassword);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  updatePasswordStmt.run(passwordHash, req.user.id);

  res.json({ status: "ok" });
});

export default router;
