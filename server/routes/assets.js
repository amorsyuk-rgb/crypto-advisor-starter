import express from "express";
import fetch from "node-fetch";

const router = express.Router();
const BINANCE_BASE = "https://data-api.binance.vision";

// This will provide the technical data the AI route uses
router.get("/:symbol/analysis", async (req, res) => {
  const { symbol } = req.params;

  try {
    // Get Binance market data
    const tickerRes = await fetch(`${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${symbol}`);
    const ticker = await tickerRes.json();

    // Simple fake indicators (you can expand this later)
    const price = parseFloat(ticker.lastPrice);
    const ema50 = price * 0.98;
    const ema200 = price * 0.95;
    const atr14 = (parseFloat(ticker.highPrice) - parseFloat(ticker.lowPrice)) / 14;
    const vwap = (price + parseFloat(ticker.highPrice) + parseFloat(ticker.lowPrice)) / 3;

    // Buy/Sell zones (rough estimates for demonstration)
    const buy_zone = { standard: price * 0.97 };
    const sell_zone = { standard: price * 1.03 };

    res.json({
      symbol,
      price,
      indicators: { ema50, ema200, atr14, vwap },
      buy_zone,
      sell_zone,
    });
  } catch (err) {
    console.error("Asset analysis error:", err);
    res.status(500).json({ error: "Failed to analyze asset" });
  }
});

export default router;
