import { Router } from "express";
import os from "node:os";

const router = Router();

// So the frontend can put a real, phone-reachable address into the QR code
// instead of "localhost" (which only means something on the device that
// generated it) — see Documentation/Architecture/Network_Session.md.
function findLanIp() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return "localhost";
}

router.get("/", (req, res) => {
  res.json({ lanIp: findLanIp() });
});

export default router;
