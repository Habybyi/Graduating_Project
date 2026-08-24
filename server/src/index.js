import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db/connection.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import customersRoutes from "./routes/customers.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set — check server/.env (see .env.example).");
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users").get();
  res.json({ status: "ok", db: "connected", userCount: count });
});

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/customers", customersRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
