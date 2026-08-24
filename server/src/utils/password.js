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

const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

// Generates a random password that already satisfies validatePasswordStrength,
// used for manager-issued temporary passwords (see Roles_And_Onboarding.md).
export function generateTemporaryPassword(length = 12) {
  let password;
  do {
    password = Array.from({ length }, () =>
      TEMP_PASSWORD_CHARS[Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)]
    ).join("");
  } while (validatePasswordStrength(password) !== null);
  return password;
}
