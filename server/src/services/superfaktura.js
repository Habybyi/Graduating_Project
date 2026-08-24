// See Documentation/Architecture/SuperFaktura_Integration.md. Sandbox now,
// production later — only SUPERFAKTURA_BASE_URL + credentials change in
// server/.env, no code changes needed.
//
// Verified for real against the sandbox before wiring this in: created a
// type=delivery document (numbered DOD2026001, confirming the API treats
// it as an actual delivery note, not a generic invoice), then downloaded
// the resulting PDF and visually confirmed it listed the right items.

function authHeader() {
  const { SUPERFAKTURA_EMAIL, SUPERFAKTURA_API_KEY, SUPERFAKTURA_COMPANY_ID } = process.env;
  if (!SUPERFAKTURA_EMAIL || !SUPERFAKTURA_API_KEY) {
    throw new Error("SuperFaktúra nie je nastavená — chýba SUPERFAKTURA_EMAIL/SUPERFAKTURA_API_KEY v server/.env.");
  }
  let header = `SFAPI email=${encodeURIComponent(SUPERFAKTURA_EMAIL)}&apikey=${encodeURIComponent(SUPERFAKTURA_API_KEY)}&module=FasterPackingLists1.0`;
  if (SUPERFAKTURA_COMPANY_ID) {
    header += `&company_id=${encodeURIComponent(SUPERFAKTURA_COMPANY_ID)}`;
  }
  return header;
}

function baseUrl() {
  return process.env.SUPERFAKTURA_BASE_URL || "https://sandbox.superfaktura.sk";
}

// items: [{ name, quantity }]
export async function createDeliveryDocument({ customerName, customerAddress, items }) {
  const payload = {
    Invoice: { type: "delivery", name: `Dodací list — ${customerName}` },
    InvoiceItem: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: 0,
      tax: 0,
    })),
    Client: { name: customerName, address: customerAddress || undefined },
  };

  const response = await fetch(`${baseUrl()}/invoices/create`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_message || "SuperFaktúra odmietla vytvoriť dodací list.");
  }

  return {
    id: data.data.Invoice.id,
    token: data.data.Invoice.token,
    formattedNumber: data.data.Invoice.invoice_no_formatted,
  };
}

export async function fetchDeliveryPdf(docId, token) {
  const response = await fetch(`${baseUrl()}/invoices/pdf/${docId}/token:${token}`, {
    headers: { Authorization: authHeader() },
  });
  if (!response.ok) {
    throw new Error("Nepodarilo sa stiahnuť PDF zo SuperFaktúry.");
  }
  return Buffer.from(await response.arrayBuffer());
}
