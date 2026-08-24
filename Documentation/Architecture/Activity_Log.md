# 🕒 Activity Log

> [!NOTE]
> Manager-facing accountability trail: who did what, when — as a filterable timeline, plus detail views for individual delivery notes. See [Data_Model.md](./Data_Model.md#activitylog) for the `ActivityLog` entity.

---

## 🎯 Purpose

The manager (currently: the father running the bakery) needs to be able to answer questions like *"who added this product?"*, *"who generated this delivery note?"*, *"did anyone correct what the AI guessed today?"* — without digging through raw data. This is a single append-only log, read from a timeline screen only managers can see.

**Scope decision:** this logs **actions that change something** (created, uploaded, corrected, generated), not passive views. Someone opening a delivery note to look at it isn't logged — only someone changing its state is. Keeps the log meaningful instead of noisy, and avoids it turning into general staff surveillance.

---

## 📋 What gets logged (v1 event list)

| `action` | Logged when |
|---|---|
| `customer.created` | A new customer is added |
| `product.created` | A new product is added to the catalog |
| `product.reference_photos_uploaded` | Reference/training photos are uploaded for a product (count included) |
| `delivery_note.created` | A driver starts a new delivery note for a customer |
| `delivery_note.item_corrected` | A driver overrides an AI-suggested product/quantity on a line item |
| `delivery_note.invoiced` | A delivery note is successfully generated through SuperFaktúra |
| `user.created` | Manager creates a new account |
| `user.password_reset` | Manager issues a new temporary password (see [Roles_And_Onboarding.md](./Roles_And_Onboarding.md)) |
| `user.role_changed` | Manager changes someone's role |

This list is extensible (new `action` values can be added without a schema change, same reasoning as `User.role` in [Data_Model.md](./Data_Model.md)) — but every entry needs a clear, specific `summary` so the timeline stays readable rather than becoming raw technical noise.

---

## 🧭 Timeline UI (manager only)

- Reverse-chronological list, grouped by day.
- Each row: timestamp, actor (name + role badge — badge reflects the role **at the time of the action**, not their current role, so history stays accurate even after a role change), a plain-language summary, and a link into the related record.
- **Filters:** role, specific user, action type, and date range. All combinable (e.g. "show me everything `driver` Peter did this week").
- Clicking a `delivery_note.*` entry opens that delivery note's detail view (below). Clicking a `product.*` entry opens that product's page.

---

## 🧾 Delivery note detail view

Opening a specific delivery note (from the timeline, or from a general delivery notes list) shows:

- Customer, created-by driver, timestamps, current status.
- **Every line item**, each showing: product, quantity, `aiConfidence`, and whether it was `wasManuallyCorrected` — this is the same data already defined on `DeliveryNoteItem` in [Data_Model.md](./Data_Model.md), it just didn't have a screen to live on until now.
- If corrected: what the AI originally guessed vs. what the driver changed it to (stored in the log entry's `metadata`, not on the item itself — the item only needs to know its final, correct value).
- Link to the generated SuperFaktúra document, once invoiced.

---

## 📈 Bonus: a second accuracy signal, for free

[Test_Plan.md](../Testing/Test_Plan.md) already measures accuracy against a held-out test set. Every `delivery_note.item_corrected` log entry is a **second, real-world accuracy signal** — actual corrections drivers made on actual deliveries, not synthetic test photos. Over time, "how often is product X getting corrected in real deliveries" is a good, free way to spot which products need better reference photos, worth surfacing alongside the formal test report for the maturita defense.
