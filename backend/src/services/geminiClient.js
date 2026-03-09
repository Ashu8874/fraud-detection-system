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

const MODEL_LIST_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey}`;
const MODEL_FALLBACK = "gemini-2.0-flash";

let cachedModel = "";

function normalizeModelName(name) {
  if (!name) {
    return "";
  }

  return String(name).replace(/^models\//, "").trim();
}

function buildGenerateEndpoint(modelName) {
  const cleanName = normalizeModelName(modelName);
  return `https://generativelanguage.googleapis.com/v1beta/models/${cleanName}:generateContent?key=${config.geminiApiKey}`;
}

function isModelUnavailable(status, details) {
  const message = (details?.error?.message || "").toLowerCase();
  return status === 404 || message.includes("is not found") || message.includes("not supported");
}

function rankModel(name) {
  if (name.includes("2.5-flash")) {
    return 0;
  }

  if (name.includes("2.0-flash")) {
    return 1;
  }

  if (name.includes("1.5-flash")) {
    return 2;
  }

  if (name.includes("flash")) {
    return 3;
  }

  if (name.includes("pro")) {
    return 4;
  }

  return 10;
}

async function discoverSupportedModel(excludeModelName = "") {
  try {
    const response = await fetch(MODEL_LIST_ENDPOINT);
    if (!response.ok) {
      return "";
    }

    const payload = await response.json();
    const excluded = normalizeModelName(excludeModelName);
    const candidates = (payload?.models || [])
      .filter((model) => {
        const methods = model?.supportedGenerationMethods || model?.generationMethods || [];
        return Array.isArray(methods) && methods.includes("generateContent");
      })
      .map((model) => normalizeModelName(model?.name || ""))
      .filter(Boolean)
      .filter((name) => name !== excluded)
      .filter((name) => !name.includes("embedding") && !name.includes("aqa"));

    if (candidates.length === 0) {
      return "";
    }

    candidates.sort((a, b) => {
      const rankDiff = rankModel(a) - rankModel(b);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      return a.localeCompare(b);
    });

    return candidates[0];
  } catch (error) {
    return "";
  }
}

async function requestGemini(modelName, payload) {
  const endpoint = buildGenerateEndpoint(modelName);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    return {
      ok: false,
      status: response.status,
      details
    };
  }

  const data = await response.json();
  return {
    ok: true,
    data
  };
}

function normalizeGeminiError(status, details) {
  const message = (details?.error?.message || "").toLowerCase();

  if (status === 401 || message.includes("api key not valid")) {
    return {
      signal: "Gemini key invalid",
      summary:
        "Gemini API key is invalid. Using rule-based scoring only. Update GEMINI_API_KEY."
    };
  }

  if (status === 400 && message.includes("api key expired")) {
    return {
      signal: "Gemini key expired",
      summary:
        "Gemini API key has expired. Using rule-based scoring only. Generate a new key and update GEMINI_API_KEY."
    };
  }

  if (status === 429 || message.includes("quota")) {
    return {
      signal: "Gemini quota exceeded",
      summary:
        "Gemini quota was exceeded. Using rule-based scoring only. Increase quota or retry later."
    };
  }

  if (isModelUnavailable(status, details)) {
    return {
      signal: "Gemini model unavailable",
      summary:
        "Configured Gemini model is unavailable. Using rule-based scoring only. Update GEMINI_MODEL."
    };
  }

  return {
    signal: "Gemini request failed",
    summary: "Gemini request failed. Using rule-based scoring only."
  };
}

export async function analyzeWithGemini(transaction) {
  if (!config.geminiApiKey) {
    return {
      suspicious: false,
      riskSignals: [],
      confidence: 0,
      summary: "Gemini API key not configured. Only rule-based scoring was used."
    };
  }

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
    const configuredModel = normalizeModelName(config.geminiModel);
    const primaryModel = cachedModel || configuredModel || MODEL_FALLBACK;

    let result = await requestGemini(primaryModel, payload);

    // Auto-recover when configured/default model is unavailable.
    if (!result.ok && isModelUnavailable(result.status, result.details)) {
      const discoveredModel = await discoverSupportedModel(primaryModel);
      if (discoveredModel) {
        const retry = await requestGemini(discoveredModel, payload);
        if (retry.ok) {
          cachedModel = discoveredModel;
          result = retry;
        } else {
          result = retry;
        }
      }
    }

    if (!result.ok) {
      const normalized = normalizeGeminiError(result.status, result.details);
      return {
        suspicious: false,
        riskSignals: [normalized.signal],
        confidence: 0,
        summary: normalized.summary
      };
    }

    const data = result.data;
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
      summary: "Gemini service unavailable. Using rule-based scoring only."
    };
  }
}
