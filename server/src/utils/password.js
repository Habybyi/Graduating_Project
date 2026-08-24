// Rule from Documentation/Navigation/Website.md: 8+ chars, 2 uppercase, 2 lowercase, 1 special char.
const SPECIAL_CHAR_RE = /[^A-Za-z0-9]/;

export function validatePasswordStrength(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Heslo musí mať aspoň 8 znakov.";
  }
  const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
  const lowercaseCount = (password.match(/[a-z]/g) || []).length;
  if (uppercaseCount < 2) {
    return "Heslo musí obsahovať aspoň 2 veľké písmená.";
  }
  if (lowercaseCount < 2) {
    return "Heslo musí obsahovať aspoň 2 malé písmená.";
  }
  if (!SPECIAL_CHAR_RE.test(password)) {
    return "Heslo musí obsahovať aspoň 1 špeciálny znak.";
  }
  return null;
}

// Deliberately excludes look-alike characters (0/O, 1/l/I) so it's easy to
// read and copy off a handwritten paper slip. Only letters + digits, no
// special characters — it only has to be typeable once at first login, not
// meet the strength policy in Documentation/Navigation/Website.md. That
// policy applies to the real password the driver chooses afterwards, via
// validatePasswordStrength() below, at /auth/change-password.
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTemporaryPassword(length = 8) {
  return Array.from({ length }, () =>
    TEMP_PASSWORD_CHARS[Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)]
  ).join("");
}
