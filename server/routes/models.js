// server/routes/models.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// === Cache configuration ===
let cachedModels = null;
let cachedAt = 0;
const CACHE_TTL_MINUTES = 60; // 1 hour TTL (for age display only)

// === Helper: get cache info ===
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

  // Serve from cache unless refresh requested
  if (cachedModels && !refresh) {
    return res.json({
      success: true,
      cached: true,
      info: getCacheInfo(),
      total: cachedModels.length,
      models: cachedModels
    });
  }

  // Otherwise fetch fresh list from OpenRouter
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://crypto-advisor-starter.onrender.com",
        "X-Title": "Crypto Advisor Starter"
      }
    });

    const data = await response.json();

    if (!data || !data.data) {
      if (cachedModels) {
        console.warn("⚠️ Failed to fetch models — returning cached list.");
        return res.json({
          success: true,
          cached: true,
          warning: "Failed to refresh — returning last cached list.",
          info: getCacheInfo(),
          total: cachedModels.length,
          models: cachedModels
        });
      }
      return res.status(500).json({ success: false, error: "Failed to retrieve models from OpenRouter." });
    }

    // Filter free & available models
    const freeModels = data.data
      .filter(model =>
        (model.pricing?.prompt === 0 && model.pricing?.completion === 0) ||
        (typeof model.id === "string" && model.id.includes(":free"))
      )
      .map(model => ({
        id: model.id,
        name: model.name || model.id.split("/").pop(),
        provider: model.id.split("/")[0],
        description: model.description || "No description available",
        pricing: model.pricing || null,
        availability: model.availability || model.status || null
      }));

    // Update cache
    cachedModels = freeModels;
    cachedAt = Date.now();

    res.json({
      success: true,
      cached: false,
      info: getCacheInfo(),
      total: freeModels.length,
      models: freeModels
    });
  } catch (err) {
    console.error("Model fetch error:", err);

    if (cachedModels) {
      return res.json({
        success: true,
        cached: true,
        warning: "Error fetching fresh list — returning cached data.",
        info: getCacheInfo(),
        total: cachedModels.length,
        models: cachedModels
      });
    }

    res.status(500).json({ success: false, error: "Failed to fetch free model list." });
  }
});

// === GET /api/models/clear-cache ===
router.get("/clear-cache", (req, res) => {
  cachedModels = null;
  cachedAt = 0;
  res.json({
    success: true,
    message: "Model cache cleared successfully.",
    cacheStatus: {
      cached: false,
      cachedAt,
      total: 0
    }
  });
});

export default router;
