// server/routes/ai-test.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Import or redefine your verified free models
const FREE_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "google/gemini-2.0-flash-exp:free"
];

// Helper function to test a single model
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

    if (data?.error?.message) {
      return { status: `⚠️ Error: ${data.error.message}` };
    }

    return { status: "❌ No response or malformed output" };
  } catch (err) {
    return { status: `⚠️ Exception: ${err.message}` };
  }
}

// Route to test all models sequentially
router.get("/test-models", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "Missing OPENROUTER_API_KEY in environment variables." });
  }

  const results = {};
  for (const model of FREE_MODELS) {
    console.log(`🧪 Testing model: ${model}`);
    results[model] = await testModel(model, apiKey);
  }

  res.json({
    success: true,
    tested: FREE_MODELS.length,
    results
  });
});

export default router;
