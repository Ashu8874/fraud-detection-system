import { analyzeWithGemini } from "./geminiClient.js";

function evaluateRuleSignals(transaction) {
  const signals = [];
  let points = 0;

  if (transaction.amount >= 10000) {
    points += 45;
    signals.push("Very high amount");
  } else if (transaction.amount >= 5000) {
    points += 35;
    signals.push("High amount");
  } else if (transaction.amount >= 1000) {
    points += 20;
    signals.push("Above-normal amount");
  }

  const ts = new Date(transaction.timestamp);
  const hour = ts.getUTCHours();
  if (hour <= 5) {
    points += 10;
    signals.push("Odd transaction hour");
  }

  const highRiskMerchants = ["crypto", "gift card", "wire", "cash advance"];
  const merchant = (transaction.merchant || "").toLowerCase();
  if (highRiskMerchants.some((keyword) => merchant.includes(keyword))) {
    points += 20;
    signals.push("High-risk merchant pattern");
  }

  const riskyPaymentMethods = ["crypto", "prepaid", "giftcard"];
  const paymentMethod = (transaction.paymentMethod || "").toLowerCase();
  if (riskyPaymentMethods.some((keyword) => paymentMethod.includes(keyword))) {
    points += 15;
    signals.push("Risk-prone payment method");
  }

  const location = (transaction.location || "").toLowerCase();
  if (location.includes("vpn") || location.includes("proxy")) {
    points += 15;
    signals.push("Suspicious network/location signal");
  }

  if ((transaction.deviceId || "").length < 8) {
    points += 8;
    signals.push("Low-trust device identifier");
  }

  return {
    points: Math.min(70, points),
    signals
  };
}

function mapRiskLevel(score) {
  if (score >= 70) {
    return "HIGH";
  }

  if (score >= 35) {
    return "MEDIUM";
  }

  return "LOW";
}

export async function analyzeTransactionRisk(transaction) {
  const ruleResult = evaluateRuleSignals(transaction);
  const aiResult = await analyzeWithGemini(transaction);

  let total = ruleResult.points + Math.round(aiResult.confidence * 30);
  if (aiResult.suspicious) {
    total += 10;
  }

  const riskScore = Math.min(100, total);

  return {
    riskScore,
    riskLevel: mapRiskLevel(riskScore),
    ruleSignals: ruleResult.signals,
    aiSignals: aiResult.riskSignals,
    aiExplanation: aiResult.summary
  };
}
