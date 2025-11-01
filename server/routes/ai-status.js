// server/routes/ai-status.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// --- Import or sync with your AI route settings ---
const FREE_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "google/gemini-2.0-flash-exp:free"
];

// --- Local memory store (shared structure) ---
let lastSuccess = null;
let lastWorkingModels = [];
let cacheStatus = {};

// --- Helper: Ping OpenRouter status ---
async function checkProviderStatus(apiKey) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { ok: true, total: data.data?.length || 0 };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// --- Route: /api/ai/status ---
router.get("/status", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error: "Missing OPENROUTER_API_KEY in environment variables."
    });
  }

  const providerCheck = await checkProviderStatus(apiKey);
  const now = new Date().toISOString();

  res.json({
    success: true,
    checkedAt: now,
    api_key_detected: true,
    provider_access: providerCheck.ok ? "✅ Active" : `⚠️ ${providerCheck.error}`,
    available_model_count: providerCheck.total,
    active_models: FREE_MODELS,
    last_successful_ai_call: lastSuccess || "No AI calls yet",
    last_confirmed_models: lastWorkingModels.length ? lastWorkingModels : "None cached yet",
    cache_status: cacheStatus || {}
  });
});

// --- Optional: allow your AI route to update last success info ---
export function updateAIStatus({ successModel, cacheInfo }) {
  lastSuccess = new Date().toISOString();
  if (successModel && !lastWorkingModels.includes(successModel)) {
    lastWorkingModels.push(successModel);
  }
  cacheStatus = cacheInfo || {};
}

export default router;
