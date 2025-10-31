// server/routes/models.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * GET /api/models/free
 * Fetches currently available free models from OpenRouter
 */
router.get("/free", async (req, res) => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://crypto-advisor-starter.onrender.com",
        "X-Title": "Crypto Advisor Starter"
      }
    });

    const data = await response.json();

    if (!data.data) {
      return res.status(500).json({ error: "Failed to retrieve models from OpenRouter." });
    }

    // ✅ Filter only free & available models
    const freeModels = data.data
      .filter(model =>
        (model.pricing?.prompt === 0 && model.pricing?.completion === 0) ||
        model.id.includes(":free")
      )
      .map(model => ({
        id: model.id,
        name: model.name || model.id.split("/").pop(),
        provider: model.id.split("/")[0],
        description: model.description || "No description available"
      }));

    res.json({
      success: true,
      total: freeModels.length,
      models: freeModels
    });
  } catch (err) {
    console.error("Model fetch error:", err);
    res.status(500).json({ error: "Failed to fetch free model list." });
  }
});

export default router;
