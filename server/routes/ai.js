// server/routes/ai.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// --- AI Cache ---
const aiCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ITEMS = 20;

// Cache helper
function setCache(symbol, insight) {
  if (aiCache.size >= MAX_CACHE_ITEMS) {
    aiCache.delete(aiCache.keys().next().value);
  }
  aiCache.set(symbol, { insight, timestamp: Date.now() });
}

// --- Model priority list (all free) ---
const FREE_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-72b-instruct:free"
];

// --- Route definition ---
router.get("/:symbol/ai", async (req, res) => {
  const { symbol } = req.params;
  const force = req.query.force === "true";
  const now = Date.now();

  // Serve from cache if valid
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
    // --- Step 1: fetch base market data ---
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
      sell_zone: analysis.sell_zone?.standard,
    };

    const prompt = `
You are a professional crypto analyst. Given this data:
${JSON.stringify(compact, null, 2)}
Summarize ${symbol}'s current market condition in 3–5 sentences.
Include short-term trend, momentum, and risk level in clear trader language.
`;

    // --- Helper to call OpenRouter ---
    async function queryModel(modelId, reasoning = false) {
      const body = {
        model: modelId,
        messages: [
          { role: "system", content: "You are a professional crypto market analyst." },
          { role: "user", content: prompt }
        ]
      };
      if (reasoning) body.reasoning = { effort: "medium" };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://crypto-advisor-starter.onrender.com",
          "X-Title": "Crypto Advisor Starter"
        },
        body: JSON.stringify(body)
      });
      return response.json();
    }

    // --- Step 2: Try models in order until one succeeds ---
    let insight = null;
    let modelUsed = null;

    for (const model of FREE_MODELS) {
      console.log(`🔍 Trying model: ${model}`);
      const useReasoning = model.startsWith("deepseek/");
      const aiData = await queryModel(model, useReasoning);
      console.log("AI raw response:", JSON.stringify(aiData, null, 2));

      if (aiData.choices?.[0]?.message?.content) {
        insight = aiData.choices[0].message.content;
        modelUsed = model;
        console.log(`✅ Success with ${model}`);
        break;
      } else {
        console.warn(`⚠️ Model ${model} returned no content, trying next...`);
      }
    }

    if (!insight) {
      insight = "No AI insight generated — all free models unavailable.";
      modelUsed = "none";
    }

    // Cache result
    setCache(symbol, insight);
    aiCache.get(symbol).model = modelUsed;

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
