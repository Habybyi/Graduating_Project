// Deliberately NOT hardcoded to "localhost" — when this page is opened on
// a phone via the PC's LAN IP, "localhost" would mean the phone itself.
// Using the same host the page was loaded from means this works whether
// you're on the PC (localhost) or a phone (LAN IP) without any config.
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

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

async function requestForm(path, { token, formData } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
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
  listCustomers: (token) => request("/customers", { token }),
  createCustomer: (token, name, address) =>
    request("/customers", { method: "POST", token, body: { name, address } }),
  listProducts: (token) => request("/products", { token }),
  createProduct: (token, name, unitType) =>
    request("/products", { method: "POST", token, body: { name, unitType } }),
  getProduct: (token, id) => request(`/products/${id}`, { token }),
  uploadPackage: (token, productId, type, files) => {
    const formData = new FormData();
    formData.append("type", type);
    for (const file of files) formData.append("photos", file);
    return requestForm(`/products/${productId}/packages`, { token, formData });
  },
  listDeliveryNotes: (token) => request("/delivery-notes", { token }),
  getDeliveryNote: (token, id) => request(`/delivery-notes/${id}`, { token }),
  createDeliveryNote: (token, customerId) =>
    request("/delivery-notes", { method: "POST", token, body: { customerId } }),
  addDeliveryNoteItem: (token, noteId, productId, quantity) =>
    request(`/delivery-notes/${noteId}/items`, { method: "POST", token, body: { productId, quantity } }),
  removeDeliveryNoteItem: (token, noteId, itemId) =>
    request(`/delivery-notes/${noteId}/items/${itemId}`, { method: "DELETE", token }),
  setDeliveryNoteStatus: (token, noteId, status) =>
    request(`/delivery-notes/${noteId}/status`, { method: "PATCH", token, body: { status } }),
  createSession: (token, noteId) => request(`/sessions/for-note/${noteId}`, { method: "POST", token }),
  getNetworkInfo: () => request("/network-info"),
  getScanSession: (sessionToken) => request(`/sessions/${sessionToken}`),
  addScanItem: (sessionToken, productId, quantity) =>
    request(`/sessions/${sessionToken}/items`, { method: "POST", body: { productId, quantity } }),
};
