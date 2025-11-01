// server/routes/ai-test.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// --- Cached test results to avoid rate limits ---
let lastTestTime = 0;
let cachedResults = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

// --- Verified API-usable free models ---
const FREE_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "google/gemini-2.0-flash-exp:free"
];

// --- Delay helper (to prevent hitting rate limits) ---
const delay = ms => new Promise(res => setTimeout(res, ms));

// --- Test a single model ---
async function testModel(modelId, apiKey) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://crypto-advisor-starter.onrender.com",
        "X-Title": "Crypto Advisor Starter"
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say a one-sentence summary of Bitcoin's trend." }
        ]
      })
    });

    const data = await response.json();

    if (data?.choices?.[0]?.message?.content) {
      return { status: "✅ Works", snippet: data.choices[0].message.content.slice(0, 80) + "..." };
    }

    if (data?.error?.message?.includes("cookie")) {
      return { status: "❌ Requires cookie (web-only)" };
    }

    if (data?.error?.message?.includes("Rate limit")) {
      return { status: "⚠️ Rate limited — try again in 60s" };
    }

    if (data?.error?.message?.includes("allowed providers")) {
      return { status: "⚠️ No allowed providers — account not authorized yet" };
    }

    if (data?.error?.message) {
      return { status: `⚠️ Error: ${data.error.message}` };
    }

    return { status: "❌ No response or malformed output" };
  } catch (err) {
    return { status: `⚠️ Exception: ${err.message}` };
  }
}

// --- Route: GET /api/ai/test-models ---
router.get("/test-models", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "Missing OPENROUTER_API_KEY in environment variables." });
  }

  // Serve from cache if still valid
  const now = Date.now();
  if (cachedResults && now - lastTestTime < CACHE_TTL) {
    return res.json({
      success: true,
      cached: true,
      info: { ageMinutes: Math.round((now - lastTestTime) / 60000), ttlMinutes: CACHE_TTL / 60000 },
      results: cachedResults
    });
  }

  // Run fresh tests sequentially (with delay)
  const results = {};
  for (const model of FREE_MODELS) {
    console.log(`🧪 Testing model: ${model}`);
    results[model] = await testModel(model, apiKey);
    await delay(2000); // wait 2 seconds before next test
  }

  // Cache results
  cachedResults = results;
  lastTestTime = now;

  res.json({
    success: true,
    tested: FREE_MODELS.length,
    cached: false,
    results
  });
});

export default router;
