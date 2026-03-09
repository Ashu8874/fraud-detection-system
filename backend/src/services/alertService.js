import { config } from "../config/env.js";

export function shouldTriggerAlert(riskScore) {
  return riskScore >= config.alertRiskThreshold;
}

export function dispatchAlert(transactionRecord) {
  const alert = {
    transactionId: transactionRecord.transactionId,
    userId: transactionRecord.userId,
    riskScore: transactionRecord.riskScore,
    riskLevel: transactionRecord.riskLevel,
    createdAt: new Date().toISOString()
  };

  // Replace this with email, Slack, webhook, or queue publisher.
  console.warn("ALERT_TRIGGERED", alert);

  return alert;
}
