# 🌐 Website / Dashboard navigation

> [!NOTE]
> The website navigation is still in progress.

## 🔐 Login

- Your username and first password will be provided by the manager who created your account.
- After your first sign-in, you will be asked to create a new password.
  - Use a standard password format: at least 8 characters, with at least 2 uppercase letters, 2 lowercase letters, and a special character.

---

## 🖥️ Dashboard

### 📍 Navigation bar

- You can find the menu on the left side of the screen.
- If the icon view is not clear enough, you can expand it by pressing the **menu** button (the burger icon).
- In this menu, you will find the main options:
  - **Create packing list**
  - **Database / Packages**
  - **Users** (managers only) — create driver accounts, reset a forgotten password, change roles. See [Roles & Onboarding](../Architecture/Roles_And_Onboarding.md) for the full process.
  - **Activity log** (managers only) — a filterable timeline of who did what (products added, deliveries created/invoiced, corrections made, account changes). Filter by role, user, action type, or date. Clicking an entry opens the related delivery note or product. See [Activity Log](../Architecture/Activity_Log.md).

### 🧾 Create packing list

1. Select or create the customer you're delivering to.
2. Click **Create packing list** — a QR code appears on screen.
3. Scan the QR code with your phone (must be on the same WiFi as this PC). Your phone opens the photo capture screen automatically — no login needed there.
4. Photograph the crates, then get the photos into the app one of two ways:
   - **Upload (recommended for many crates):** take photos with your phone's normal camera app for all the crates first, then tap **Upload** and select them all at once — faster than doing it one by one.
   - **Capture:** tap **Take photo** to use the camera directly inside the app, one crate at a time.
5. For each photo, the AI suggests a product and quantity.
   - If it's confident, the suggestion is pre-filled — just confirm it.
   - If it's not confident, pick the product yourself from the list.
   - Check the photo thumbnail next to each result if anything looks off — helps you trace a wrong match back to the right crate.
6. Repeat until every crate is accounted for.
7. Back on the PC (or on your phone), review the full list and totals.
8. Click **Generate delivery note** — this creates the real delivery note through SuperFaktúra and shows you the PDF.

> [!TIP]
> The QR code expires after a while for security — if it stops working mid-delivery, just refresh the page on the PC to get a new one.

### 📦 Database / Packages

- This is where you can upload your reference packages.
- Use this section to add the photo sets needed by the AI system.

#### ➕ Adding a new product

1. Go to **Database / Packages** and click **Add package**.
2. Pick an existing product or create a new one (name + whether it's sold as a `whole` cake or `piece`-by-piece).
3. **Choose the package type — this matters, pick carefully:**
   - **Training package** — teaches the AI. Photos are processed, then deleted (after a short safety window).
   - **Test package** — kept permanently, used only to measure accuracy (see [Test_Plan.md](../Testing/Test_Plan.md)). Never teaches the AI anything.
4. Upload at least 5 photos (training) or 2–3 photos (test), following the [photo guide](../Tutorials/How_to_create_photos.md) — different angles, lighting, and background for each.
5. Submit. You'll see a progress count while each photo is processed, then a confirmation (e.g. "5/5 processed for Venček ✅").
6. For a training package, the uploaded photos are **not kept** after processing — only what the AI learned from them stays. Once processing finishes, the product is ready to be recognized during deliveries. Test package photos stay in the system on purpose.