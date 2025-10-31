import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// --- AI Cache (symbol → { insight, timestamp }) ---
const aiCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ITEMS = 20; // Prevents memory leaks

function setCache(symbol, insight) {
  if (aiCache.size >= MAX_CACHE_ITEMS) {
    const oldestKey = aiCache.keys().next().value;
    aiCache.delete(oldestKey);
  }
  aiCache.set(symbol, { insight, timestamp: Date.now() });
}

router.get("/:symbol/ai", async (req, res) => {
  const { symbol } = req.params;
  const force = req.query.force === "true"; // ?force=true forces refresh
  const now = Date.now();

  // Serve from cache if still valid
  const cached = aiCache.get(symbol);
  if (cached && !force && now - cached.timestamp < CACHE_TTL) {
    return res.json({
      symbol,
      ai_summary: cached.insight,
      cached: true,
    });
  }

  try {
    // Fetch your base analysis
    const analysisUrl = `${req.protocol}://${req.get("host")}/api/assets/${symbol}/analysis`;
    const analysisRes = await fetch(analysisUrl);
    const analysis = await analysisRes.json();

    // Compress the data for prompt efficiency
    const compact = {
      price: analysis.price,
      ema50: analysis.indicators?.ema50,
      ema200: analysis.indicators?.ema200,
      atr14: analysis.indicators?.atr14,
      vwap: analysis.indicators?.vwap,
      buy_zone: analysis.buy_zone?.standard,
      sell_zone: analysis.sell_zone?.standard,
    };

    const prompt = `
You are a senior crypto analyst. Given this data:
${JSON.stringify(compact, null, 2)}
Summarize ${symbol}'s current market condition in 3–5 sentences.
Include short-term trend, momentum, and risk level.`;

    // Query OpenRouter (GPT-4o-mini)
    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a professional crypto market analyst." },
      { role: "user", content: prompt }
    ]
  })
});

    const aiData = await aiRes.json();
    console.log("AI raw response:", JSON.stringify(aiData, null, 2));
    const insight = aiData.choices?.[0]?.message?.content || "No AI insight generated.";

    // Save to cache
    setCache(symbol, insight);

    res.json({ symbol, ai_summary: insight, cached: false });
  } catch (err) {
    console.error("AI route error:", err);
    res.status(500).json({ error: "Failed to generate AI analysis." });
  }
});

export default router;
