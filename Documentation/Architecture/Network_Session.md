# 📶 Network & QR Session

> [!NOTE]
> Covers how the PC and phone find each other over local WiFi, how the QR-code handoff works, and a real technical constraint this creates that needs to be solved before coding the capture flow.

---

## 🏠 Current scope: local WiFi only

Per the project decision, the PC (running the dashboard + backend) and the driver's phone are on the **same WiFi network**, no public hosting for now. This is enough for development and for the maturita defense demo.

**Known limitation:** this only works if both devices are on the same network. It won't work over mobile data or a different WiFi — that's an accepted trade-off for now, not an oversight. Moving to public hosting later (see [System_Overview.md](./System_Overview.md)) removes this limitation.

---

## ⚠️ Important constraint: camera access needs HTTPS

Mobile browsers only allow camera access (`getUserMedia`) on a **secure context** — either `https://` or `http://localhost`. A plain `http://192.168.x.x:port` link, which is what a naive local-network QR code would use, is **not** considered secure by the browser, so the phone would be blocked from opening the camera at all.

This needs a fix before the capture page can work at all:

| Option | How | Trade-off |
|---|---|---|
| **Local HTTPS via `mkcert`** (recommended) | Generate a locally-trusted certificate for the PC's LAN IP/hostname, install `mkcert`'s root CA on the phone once | Free, works fully offline, one-time setup per phone |
| Tunnel (e.g. ngrok, Cloudflare Tunnel) | Exposes the local server through a public HTTPS URL | Requires internet access even though devices are on the same LAN; adds an external dependency |
| Self-signed cert without a trusted CA | Just generate a cert | Phone browsers show a scary warning / block it by default — bad for a demo |

**Recommendation:** `mkcert`, installed once during setup, reused for the whole project. This is a setup step to do when the backend is scaffolded, not a currently-solved item — flagging it here so it isn't discovered mid-coding.

---

## 🔑 Session / QR flow

1. PC creates a `DeliverySession` with a random, unguessable `token` (e.g. `crypto.randomUUID()`), tied to the current `DeliveryNote`.
2. QR code encodes: `https://<pc-lan-ip>:<port>/scan/<token>`
3. Phone scans → opens the capture page directly — **no login required on the phone**, the token itself is the authorization for that one delivery session.
4. Session `expiresAt` is short (suggest 30–60 minutes) — long enough for one delivery, short enough that an old QR code (e.g. left on screen, screenshotted) can't be reused later.
5. Once the delivery note is marked `ready` or the session expires, the token stops working.

## 🔒 Security notes

- The token is a capability, not a password — anyone with the link can upload photos for that one delivery note, but that's a narrow blast radius (one draft delivery note, not the whole account).
- No customer data is embedded in the QR code itself — just an opaque token; the backend resolves it to the actual session.
- Because this is LAN-only for now, the attack surface is already limited to people on the same WiFi — worth stating explicitly for the defense, but not a reason to skip the token-expiry design.
