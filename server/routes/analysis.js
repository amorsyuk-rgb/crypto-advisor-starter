import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/:symbol/analysis", async (req, res) => {
  const { symbol } = req.params;
  try {
    const external = `https://crypto-advisor-starter.onrender.com/api/assets/${symbol}/analysis`;
    const r = await fetch(external);
    const j = await r.json();
    res.json(j);
  } catch (err) {
    console.error("analysis proxy error:", err);
    res.status(500).json({ error: "analysis fetch failed" });
  }
});

export default router;
