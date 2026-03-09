import { randomUUID } from "crypto";
import { Transaction } from "../models/Transaction.js";
import { isDatabaseConnected } from "../db/state.js";
import { analyzeTransactionRisk } from "../services/fraudScoringService.js";
import { dispatchAlert, shouldTriggerAlert } from "../services/alertService.js";

const memoryTransactions = [];

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "Payload must be a JSON object.";
  }

  if (!payload.userId || typeof payload.userId !== "string") {
    return "userId is required and must be a string.";
  }

  if (typeof payload.amount !== "number" || Number.isNaN(payload.amount) || payload.amount < 0) {
    return "amount is required and must be a non-negative number.";
  }

  return null;
}

function createMemoryRecord(transactionInput, analysis, alerted) {
  const now = new Date();

  return {
    ...transactionInput,
    ...analysis,
    alerted,
    createdAt: now,
    updatedAt: now
  };
}

async function saveTransaction(transactionInput, analysis, alerted) {
  if (isDatabaseConnected()) {
    return Transaction.create({
      ...transactionInput,
      ...analysis,
      alerted
    });
  }

  const duplicate = memoryTransactions.some(
    (tx) => tx.transactionId === transactionInput.transactionId
  );

  if (duplicate) {
    const duplicateError = new Error("Duplicate transactionId");
    duplicateError.code = 11000;
    throw duplicateError;
  }

  const record = createMemoryRecord(transactionInput, analysis, alerted);
  memoryTransactions.unshift(record);

  return record;
}

export async function analyzeTransaction(req, res) {
  const validationError = validatePayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const transactionInput = {
    transactionId: req.body.transactionId || randomUUID(),
    userId: req.body.userId,
    amount: req.body.amount,
    currency: req.body.currency || "USD",
    merchant: req.body.merchant || "",
    location: req.body.location || "",
    paymentMethod: req.body.paymentMethod || "",
    deviceId: req.body.deviceId || "",
    timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date()
  };

  if (Number.isNaN(transactionInput.timestamp.getTime())) {
    return res.status(400).json({ error: "timestamp must be a valid ISO date string." });
  }

  try {
    const analysis = await analyzeTransactionRisk(transactionInput);
    const alerted = shouldTriggerAlert(analysis.riskScore);

    const record = await saveTransaction(transactionInput, analysis, alerted);

    const alert = alerted ? dispatchAlert(record) : null;

    return res.status(201).json({
      transaction: record,
      alert
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: "transactionId already exists." });
    }

    console.error("Failed to analyze transaction:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getRecentTransactions(req, res) {
  const requestedLimit = Number(req.query.limit || 20);
  const limit = Number.isNaN(requestedLimit) ? 20 : Math.min(100, Math.max(1, requestedLimit));

  try {
    const records = isDatabaseConnected()
      ? await Transaction.find({}).sort({ createdAt: -1 }).limit(limit)
      : memoryTransactions
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, limit);
    return res.json({ transactions: records });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTriggeredAlerts(req, res) {
  try {
    const alerts = isDatabaseConnected()
      ? await Transaction.find({ alerted: true }).sort({ createdAt: -1 }).limit(50)
      : memoryTransactions
          .filter((tx) => tx.alerted)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 50);
    return res.json({ alerts });
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
