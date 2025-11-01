// server/routes/ai.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// --- In-memory AI Cache ---
const aiCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ITEMS = 20;

// --- Confirmed working models (from your test) ---
const FREE_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "google/gemini-2.0-flash-exp:free"
];

// --- Cache helper ---
function setCache(symbol, insight, model) {
  if (aiCache.size >= MAX_CACHE_ITEMS) {
    aiCache.delete(aiCache.keys().next().value);
  }
  aiCache.set(symbol, { insight, model, timestamp: Date.now() });
}

// --- Route ---
router.get("/:symbol/ai", async (req, res) => {
  const { symbol } = req.params;
  const force = req.query.force === "true";
  const userModel = req.query.model;
  const now = Date.now();

  // Check cache
  const cached = aiCache.get(symbol);
  if (cached && !force && now - cached.timestamp < CACHE_TTL) {
    return res.json({
      symbol,
      model: cached.model,
      ai_summary: cached.insight,
      cached: true
    });
  }

  try {
    // Fetch base market data
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
You are a professional crypto analyst.
Given this data:
${JSON.stringify(compact, null, 2)}
Summarize ${symbol}'s current market condition in 3–5 sentences.
Include short-term trend, momentum, and risk level.
Write clearly, with concise trading insights.
`;

    async function queryModel(modelId) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://crypto-advisor-starter.onrender.com",
          "X-Title": "Crypto Advisor Starter"
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: "system", content: "You are a senior crypto analyst providing factual insights." },
            { role: "user", content: prompt }
          ]
        })
      });
      return response.json();
    }

    const modelsToTry = userModel ? [userModel] : FREE_MODELS;
    let insight = null;
    let modelUsed = null;

    for (const model of modelsToTry) {
      console.log(`🔍 Trying model: ${model}`);
      try {
        const aiData = await queryModel(model);
        console.log(`AI raw response from ${model}:`, JSON.stringify(aiData, null, 2));

        if (aiData?.choices?.[0]?.message?.content) {
          insight = aiData.choices[0].message.content.trim();
          modelUsed = model;
          console.log(`✅ Success with ${model}`);
          break;
        }

        if (aiData?.error?.message?.includes("Rate limit")) {
          console.warn(`⚠️ Rate limit on ${model} — retrying next model`);
        } else {
          console.warn(`⚠️ ${model} returned no usable response — skipping`);
        }
      } catch (innerErr) {
        console.error(`❌ ${model} failed:`, innerErr);
      }
    }

    if (!insight) {
      insight = "No AI insight generated — all models unavailable or rate limited.";
      modelUsed = "none";
    }

    setCache(symbol, insight, modelUsed);

    res.json({
      symbol,
      model: modelUsed,
      ai_summary: insight,
      cached: false
    });

  } catch (err) {
    console.error("AI route error:", err);
    res.status(500).json({ error: "Failed to generate AI analysis." });
  }
});

export default router;
