# 🧾 SuperFaktúra Integration

> [!NOTE]
> Facts in this document (base URLs, auth header format, endpoint) come from the official [SuperFaktúra API docs](https://github.com/superfaktura/docs). The exact value of the `type` field for a delivery note should be double-checked against the live docs when this is actually implemented — treat it as "very likely `delivery`", not gospel.

---

## 🎯 What this integration does

Once a delivery note is fully packed and reviewed on the PC dashboard, the backend calls SuperFaktúra's API to generate the *real* delivery note document (dodací list) for the customer — instead of the app inventing its own PDF layout.

---

## 🧪 Current phase: sandbox

Per the project decision: **sandbox now, real production API key later** (once this goes live for the actual company).

| Environment | Base URL |
|---|---|
| Sandbox (SK) | `https://sandbox.superfaktura.sk` |
| Production (SK) | `https://moja.superfaktura.sk` |

Both are configured via environment variables so switching from sandbox to production later is a config change, not a code change:

```env
# server/.env (created during the Phase 0 backend scaffold)
SUPERFAKTURA_BASE_URL=https://sandbox.superfaktura.sk
SUPERFAKTURA_EMAIL=
SUPERFAKTURA_API_KEY=
SUPERFAKTURA_COMPANY_ID=
```

> ⚠️ Make sure `.env` is in `server/.gitignore` from the very first commit of the backend scaffold — a lesson learned from the discarded prototype, which shipped a `.env` file that wasn't ignored (see [System_Overview.md](./System_Overview.md)).

---

## 🔐 Authentication

SuperFaktúra uses a custom `Authorization` header, not a standard Bearer token:

```
Authorization: SFAPI email=YOUR@EMAIL.TLD&apikey=YOURTOKEN&module=PackingApp1.0&company_id=YOUR_COMPANY_ID
```

- `email` + `apikey` — from the SuperFaktúra account (sandbox account for now).
- `module` — a free-text identifier for the integration (e.g. `PackingApp1.0`), required by SuperFaktúra to identify third-party tools.
- `company_id` — optional, needed only if the account has multiple companies.
- All values must be URL-encoded.

---

## 📤 Creating the delivery note

**Endpoint:** `POST /invoices/create`
**Content-Type:** JSON body (SuperFaktúra also supports form-encoded, but JSON is simpler from Node.js)

```json
{
  "Invoice": {
    "type": "delivery",
    "name": "Delivery note"
  },
  "InvoiceItem": [
    {
      "name": "Venček",
      "quantity": 24,
      "unit_price": 0,
      "tax": 0
    }
  ],
  "Client": {
    "name": "Customer Name",
    "address": "Customer Address"
  }
}
```

Mapping from our data model (see [Data_Model.md](./Data_Model.md)):

| Our field | SuperFaktúra field |
|---|---|
| `DeliveryNote.customerId` → `Customer` | `Client.name`, `Client.address` |
| `DeliveryNoteItem.productId` → `Product.name` | `InvoiceItem[].name` |
| `DeliveryNoteItem.quantity` | `InvoiceItem[].quantity` |

Since this is a delivery note (not a priced invoice), `unit_price` and `tax` are expected to be `0` unless the business later wants pricing on the delivery note too — that's a product decision to confirm with the company, not a technical one.

---

## 📥 After the call

- On success, SuperFaktúra returns a document ID → stored in `DeliveryNote.superfakturaDocId`.
- `DeliveryNote.status` moves from `ready_for_review` to `invoiced`.
- The generated PDF can be fetched/displayed to the driver (exact download endpoint to confirm against the live docs when implementing).

---

## ➡️ Path to production

1. Build and test everything against the sandbox using a free SuperFaktúra sandbox account.
2. Once the company (the actual client this is being built for) provides a real account + API key, only the `.env` values change — no code changes needed, since the base URL and credentials are already externalized.
3. Confirm with the company whether delivery notes should carry prices at that point, since sandbox testing will likely use `0` throughout.
