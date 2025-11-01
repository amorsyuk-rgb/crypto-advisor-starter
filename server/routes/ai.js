import express from "express";
import fetch from "node-fetch";
import { updateAIStatus } from "./ai-status.js";

const router = express.Router();

// Cache system
const aiCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 min
const MAX_CACHE_ITEMS = 20;

// Helper to manage cache
function setCache(symbol, insight) {
  if (aiCache.size >= MAX_CACHE_ITEMS) {
    const oldest = aiCache.keys().next().value;
    aiCache.delete(oldest);
  }
  aiCache.set(symbol, { insight, timestamp: Date.now() });
}

router.get("/:symbol/ai", async (req, res) => {
  const { symbol } = req.params;
  const force = req.query.force === "true";
  const now = Date.now();

  const cached = aiCache.get(symbol);
  if (cached && !force && now - cached.timestamp < CACHE_TTL) {
    return res.json({ symbol, ai_summary: cached.insight, cached: true });
  }

  try {
    // Get analysis data
    const analysisUrl = `${req.protocol}://${req.get("host")}/api/assets/${symbol}/analysis`;
    const analysisRes = await fetch(analysisUrl);
    const analysis = await analysisRes.json();

    const compact = {
      price: analysis.price,
      ema50: analysis.indicators?.ema50,
      ema200: analysis.indicators?.ema200,
      atr14: analysis.indicators?.atr14,
      vwap: analysis.indicators?.vwap,
      buy_zone: analysis.buy_zone?.standard,
      sell_zone: analysis.sell_zone?.standard
    };

    const prompt = `
You are a senior crypto analyst. Given this data:
${JSON.stringify(compact, null, 2)}
Summarize ${symbol}'s current market condition in 3–5 sentences.
Include trend, momentum, and risk level.
`;

    // Try free models in order
    const models = [
      "deepseek/deepseek-chat-v3.1:free",
      "meta-llama/llama-3.3-8b-instruct:free",
      "google/gemini-2.0-flash-exp:free"
    ];

    let insight = "";
    let modelUsed = null;

    for (const model of models) {
      try {
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
          },
          body: JSON.stringify({
            model,
            reasoning: { enabled: true },
            messages: [
              { role: "system", content: "You are a professional crypto analyst." },
              { role: "user", content: prompt }
            ]
          })
        });

        const aiData = await aiRes.json();
        console.log(`AI raw response from ${model}:`, JSON.stringify(aiData, null, 2));

        insight = aiData?.choices?.[0]?.message?.content?.trim();
        if (insight) {
          modelUsed = model;
          break;
        } else {
          console.warn(`⚠️ ${model} returned empty response, trying next...`);
        }
      } catch (err) {
        console.warn(`⚠️ Error from ${model}:`, err.message);
      }
    }

    // Fallback text if all models fail
    if (!insight) {
      insight = `${symbol} is currently trading at $${analysis.price}. Unable to generate deeper AI analysis at this time.`;
      modelUsed = "none";
    }

    setCache(symbol, insight);

    // ✅ Update monitor status
    updateAIStatus({
      successModel: modelUsed,
      cacheInfo: { lastUpdated: new Date().toISOString(), cachedCount: aiCache.size }
    });

    res.json({ symbol, model: modelUsed, ai_summary: insight, cached: false });

  } catch (err) {
    console.error("AI route error:", err);
    res.status(500).json({ error: "Failed to generate AI analysis." });
  }
});

export default router;
