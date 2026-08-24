# 👤 Roles & Onboarding

> [!NOTE]
> How accounts get created, how roles/permissions work, and what happens on a driver's first day. See [Data_Model.md](./Data_Model.md#user) for the `User` fields referenced here.

---

## 🔑 Roles (current scope: two)

| Role | Can do |
|---|---|
| `manager` | Create/manage driver accounts (incl. resetting passwords, changing roles), add/manage products and their reference photos, view all customers and delivery notes |
| `driver` | Select a customer, create a delivery note, upload/capture crate photos, confirm/correct AI results, generate the final delivery note |

Only these two roles are active for now. `User.role` is stored as a plain string rather than a hardcoded two-value enum specifically so a **third role (e.g. `production`)** can be introduced later — for staff who should be able to add reference photos without getting full manager access to driver accounts and customer data — without a schema change. Adding it later is a permission-check change in the backend, not a data migration.

Which role can add products is intentionally the same as who can manage the rest of the system for now (`manager`) — see the workflow below for how that plays out day to day.

---

## 🌱 Bootstrapping the first account

The very first `manager` account (used by the business owner) is created manually — a one-time setup step (e.g. a seed script or a setup route guarded by an environment secret), not a signup form. There's no public registration anywhere in the app — every other account is created by a manager from inside the dashboard, on purpose (matches the existing [LoginPage.jsx](../../packing/src/pages/LoginPage.jsx) comment: *"No registration option is included by design"*).

---

## 🚚 Onboarding a driver (day one)

1. Manager creates a driver account in the dashboard (username + an auto-generated temporary password).
2. That temporary password is handed to the driver on paper (a small, trusted crew — this is a reasonable, low-tech handoff for now).
3. Driver logs in with the temporary password. `User.mustChangePassword` is `true` on this account, so the app **forces** a password-change screen before anything else is reachable — this isn't just written guidance, it's enforced in code so it can't be skipped.
4. Driver sets a real password (per the format already documented in [Website.md](../Navigation/Website.md): 8+ characters, 2 uppercase, 2 lowercase, 1 special character). `mustChangePassword` flips to `false`.
5. Driver lands on the normal dashboard — burger menu with **DB zákuskov** (product database, manager-only actions hidden if the driver doesn't have access) and **Packing list**.

## 🔁 Forgotten password

No email server, no self-service reset flow (the [ResetPasswordPage.jsx](../../packing/src/pages/ResetPasswordPage.jsx) mock's "email a reset link" idea is **not** used for v1 — realistic for a small crew is a manager-driven reset instead):

1. Manager opens the user list in the dashboard, finds the driver, clicks "Reset password."
2. A new temporary password is generated and shown to the manager to hand over (same mechanism as day-one onboarding).
3. `mustChangePassword` is set back to `true` — driver is forced through the change-password screen again on next login.

---

## 🧑‍🍳 Who actually adds products, in practice

Per the current plan: while the son (this project's author) is away at school, **his father** (the `manager` account) — or other production staff, once the `production` role exists — photographs new desserts directly in production and uploads them as reference/training photos (see [Data_Flow.md — B](./Data_Flow.md#-b-teaching-the-ai-a-new-product-training-flow)). When back, the son adds/refines the rest under the same account.

Because this upload will often happen without direct supervision, see the [grace-period recommendation](./Data_Flow.md#-grace-period-before-deletion-recommended) in Data_Flow.md — it exists specifically to catch bad reference photos from this exact scenario before they're gone for good.
