// One-time bootstrap for the very first manager account — see
// Documentation/Architecture/Roles_And_Onboarding.md ("Bootstrapping the first account").
// Usage: node src/db/seed-manager.js <username> <password>
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./connection.js";
import { validatePasswordStrength } from "../utils/password.js";

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error("Usage: node src/db/seed-manager.js <username> <password>");
  process.exit(1);
}

const validationError = validatePasswordStrength(password);
if (validationError) {
  console.error("Password does not meet the strength requirement:", validationError);
  process.exit(1);
}

const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
if (existing) {
  console.error(`User '${username}' already exists.`);
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 10);

// The owner is deliberately setting their own real password here, not being
// handed a random temporary one — so must_change_password stays false.
db.prepare(
  "INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, 'manager', 0)"
).run(username, passwordHash);

console.log(`Manager account '${username}' created.`);
