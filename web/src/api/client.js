const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function request(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Niečo sa pokazilo. Skús to znova.");
  }
  return data;
}

export const api = {
  login: (username, password) => request("/auth/login", { method: "POST", body: { username, password } }),
  changePassword: (token, newPassword) =>
    request("/auth/change-password", { method: "POST", token, body: { newPassword } }),
  listUsers: (token) => request("/users", { token }),
  createUser: (token, username, role) =>
    request("/users", { method: "POST", token, body: { username, role } }),
  resetPassword: (token, userId) => request(`/users/${userId}/reset-password`, { method: "POST", token }),
  changeRole: (token, userId, role) =>
    request(`/users/${userId}/role`, { method: "PATCH", token, body: { role } }),
};
