import { config } from "../config/env.js";
import { extractJson } from "../utils/extractJson.js";

const PROMPT = `You are a fraud detection analyst. Analyze the transaction and return only JSON with this schema:
{
  "suspicious": boolean,
  "riskSignals": string[],
  "confidence": number,
  "summary": string
}
Rules:
- confidence must be between 0 and 1
- riskSignals must contain short phrases
- summary must be <= 240 characters`;

export async function analyzeWithGemini(transaction) {
  if (!config.geminiApiKey) {
    return {
      suspicious: false,
      riskSignals: [],
      confidence: 0,
      summary: "Gemini API key not configured. Only rule-based scoring was used."
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${PROMPT}\n\nTransaction:\n${JSON.stringify(transaction)}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 400
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const details = await response.text();
      return {
        suspicious: false,
        riskSignals: ["Gemini request failed"],
        confidence: 0,
        summary: `Gemini error: ${details.slice(0, 180)}`
      };
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = extractJson(rawText) || {};

    return {
      suspicious: Boolean(parsed.suspicious),
      riskSignals: Array.isArray(parsed.riskSignals) ? parsed.riskSignals.map(String) : [],
      confidence:
        typeof parsed.confidence === "number"
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0,
      summary: typeof parsed.summary === "string" ? parsed.summary : "No summary returned by Gemini."
    };
  } catch (error) {
    return {
      suspicious: false,
      riskSignals: ["Gemini unavailable"],
      confidence: 0,
      summary: `Gemini request exception: ${error.message}`
    };
  }
}
