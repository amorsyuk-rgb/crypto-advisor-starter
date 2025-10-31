// server/routes/ai.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const aiCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;
const MAX_CACHE_ITEMS = 20;

// Known models list (ordered by preference)
const MODEL_LIST = [
  "nousresearch/hermes-2-pro",
  "perplexity/sonar-small-online",
  "gryphe/mythomax-l2-13b",
  "openrouter/openai/gpt-4o-mini" // last resort (paid)
];

function setCache(symbol, insight) {
  if (aiCache.size >= MAX_CACHE_ITEMS) {
    aiCache.delete(aiCache.keys().next().value);
  }
  aiCache.set(symbol, { insight, timestamp: Date.now() });
}

router.get("/:symbol/ai", async (req, res) => {
  const { symbol } = req.params;
  const force = req.query.force === "true";
  const now = Date.now();

  const cached = aiCache.get(symbol);
  if (cached && !force && now - cached.timestamp < CACHE_TTL) {
    return res.json({ symbol, model: "cached", ai_summary: cached.insight, cached: true });
  }

  try {
    const baseUrl = `https://${req.get("host")}`;
    const analysisUrl = `${baseUrl}/api/assets/${symbol}/analysis`;
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
You are a professional crypto analyst. Given this data:
${JSON.stringify(compact, null, 2)}
Summarize ${symbol}'s current market condition in 3–5 sentences.
Include short-term trend, momentum, and risk level.`;

    // helper to call OpenRouter with a given model
    const askModel = async (model) => {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://crypto-advisor-starter.onrender.com",
          "X-Title": "Crypto Advisor Starter"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a professional crypto market analyst." },
            { role: "user", content: prompt }
          ]
        })
      });
      return res.json();
    };

    let insight = null;
    let modelUsed = null;

    // iterate through available models
    for (const m of MODEL_LIST) {
      const aiData = await askModel(m);
      if (aiData.choices?.[0]?.message?.content) {
        insight = aiData.choices[0].message.content;
        modelUsed = m;
        break;
      } else {
        console.warn(`⚠️ Model ${m} failed or unavailable`);
      }
    }

    if (!insight) {
      insight = "No AI insight generated — all models unavailable.";
      modelUsed = "none";
    }

    setCache(symbol, insight);

    res.json({ symbol, model: modelUsed, ai_summary: insight, cached: false });
  } catch (err) {
    console.error("AI route error:", err);
    res.status(500).json({ error: "Failed to generate AI analysis." });
  }
});

export default router;
