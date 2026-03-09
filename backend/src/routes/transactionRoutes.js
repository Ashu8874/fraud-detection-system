import { Router } from "express";
import {
  analyzeTransaction,
  getRecentTransactions,
  getTriggeredAlerts
} from "../controllers/transactionController.js";

const router = Router();

router.post("/analyze", analyzeTransaction);
router.get("/recent", getRecentTransactions);
router.get("/alerts", getTriggeredAlerts);

export default router;
