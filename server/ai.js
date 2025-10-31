import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/:symbol/ai", async (req, res) => {
  const { symbol } = req.params;

  try {
    const analysisUrl = `${req.protocol}://${req.get("host")}/api/assets/${symbol}/analysis`;
    const analysisRes = await fetch(analysisUrl);
    const analysis = await analysisRes.json();

    const prompt = `You are an expert crypto analyst. Based on these metrics:\n${JSON.stringify(analysis, null, 2)}\nProvide a concise 3-4 sentence trading insight for ${symbol} including short-term direction, risk, and momentum.`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
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
    const ai_summary = aiData.choices?.[0]?.message?.content || "No insight available.";

    res.json({ symbol, ai_summary });
  } catch (err) {
    console.error("AI route error:", err);
    res.status(500).json({ error: "Failed to generate AI analysis." });
  }
});

export default router;
