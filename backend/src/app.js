import cors from "cors";
import express from "express";
import transactionRoutes from "./routes/transactionRoutes.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/transactions", transactionRoutes);
