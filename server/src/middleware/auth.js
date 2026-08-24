import jwt from "jsonwebtoken";
import { db } from "../db/connection.js";

const findUserById = db.prepare(
  "SELECT id, username, role, must_change_password AS mustChangePassword FROM users WHERE id = ?"
);

// Loads the user fresh from the DB on every request (not just from the JWT
// payload) so a role change or password reset takes effect immediately,
// without waiting for the token to expire.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Chýba prihlásenie." });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Neplatné alebo vypršané prihlásenie." });
  }

  const user = findUserById.get(payload.sub);
  if (!user) {
    return res.status(401).json({ error: "Účet už neexistuje." });
  }

  req.user = { ...user, mustChangePassword: Boolean(user.mustChangePassword) };
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Nemáš oprávnenie na túto akciu." });
    }
    next();
  };
}
