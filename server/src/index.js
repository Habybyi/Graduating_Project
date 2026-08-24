import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db/connection.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users").get();
  res.json({ status: "ok", db: "connected", userCount: count });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
