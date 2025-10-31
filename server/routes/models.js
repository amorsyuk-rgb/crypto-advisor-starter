// server/routes/models.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// === Cache configuration ===
let cachedModels = null;
let cachedAt = 0;
const CACHE_TTL_MINUTES = 60; // 1 hour

// Verified API-accessible models (no cookies required)
const VERIFIED_API_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "mistralai/mistral-7b-instruct:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "google/gemini-2.0-flash-exp:free"
];

// Helper for cache info
function getCacheInfo() {
  if (!cachedAt) return null;
  const ageMs = Date.now() - cachedAt;
  return {
    cachedAt,
    ageMinutes: Math.round(ageMs / 60000),
    ttlMinutes: CACHE_TTL_MINUTES,
    expiresInMinutes: Math.max(0, CACHE_TTL_MINUTES - Math.round(ageMs / 60000))
  };
}

// === GET /api/models/free ===
router.get("/free", async (req, res) => {
  const refresh = req.query.refresh === "true";

  if (cachedModels && !refresh) {
    return res.json({
      success: true,
      cached: true,
      info: getCacheInfo(),
      total: cachedModels.length,
      models: cachedModels
    });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://crypto-advisor-starter.onrender.com",
        "X-Title": "Crypto Advisor Starter"
      }
    });

    const data = await response.json();

    if (!data?.data) {
      return res.status(500).json({ success: false, error: "Failed to retrieve models." });
    }

    // Filter: only free models that are verified to work via API
    const freeApiModels = data.data
      .filter(m =>
        VERIFIED_API_MODELS.includes(m.id)
      )
      .map(m => ({
        id: m.id,
        name: m.name || m.id.split("/").pop(),
        provider: m.id.split("/")[0],
        description: m.description || "No description available"
      }));

    cachedModels = freeApiModels;
    cachedAt = Date.now();

    res.json({
      success: true,
      cached: false,
      info: getCacheInfo(),
      total: freeApiModels.length,
      models: freeApiModels
    });

  } catch (err) {
    console.error("Model fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch model list." });
  }
});

// === Clear cache manually ===
router.get("/clear-cache", (req, res) => {
  cachedModels = null;
  cachedAt = 0;
  res.json({
    success: true,
    message: "Model cache cleared.",
    cacheStatus: { cached: false, cachedAt, total: 0 }
  });
});

export default router;
