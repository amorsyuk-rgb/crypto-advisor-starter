import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const BINANCE_API = "https://data-api.binance.vision/api/v3";

function calculateEMA(values, period) {
  if (!values.length) return null;
  const k = 2 / (period + 1);
  return values.reduce((acc, price, i) => {
    if (i === 0) return [price];
    acc.push(price * k + acc[i - 1] * (1 - k));
    return acc;
  }, [])[values.length - 1];
}

router.get("/assets/:symbol/analysis", async (req, res) => {
  const { symbol } = req.params;

  try {
    // 1️⃣ Fetch 24hr ticker data
    const tickerRes = await fetch(`${BINANCE_API}/ticker/24hr?symbol=${symbol}`);
    const ticker = await tickerRes.json();

    if (ticker.code) throw new Error(ticker.msg || "Binance data unavailable");

    // 2️⃣ Fetch hourly klines for 24h trend
    const klinesRes = await fetch(`${BINANCE_API}/klines?symbol=${symbol}&interval=1h&limit=24`);
    const klines = await klinesRes.json();

    const chart = klines.map((k) => ({
      time: k[0],
      price: parseFloat(k[4]),
    }));

    const prices = chart.map((c) => c.price);
    const ema50 = calculateEMA(prices, 50);
    const ema200 = calculateEMA(prices, 200);
    const atr14 = (() => {
      let sum = 0;
      for (let i = 1; i < Math.min(14, prices.length); i++) {
        sum += Math.abs(prices[i] - prices[i - 1]);
      }
      return sum / 14;
    })();
    const vwap = prices.reduce((sum, p) => sum + p, 0) / (prices.length || 1);

    // 3️⃣ Construct response
    res.json({
      success: true,
      symbol,
      price: parseFloat(ticker.lastPrice),
      change24h: parseFloat(ticker.priceChangePercent),
      volume: parseFloat(ticker.volume),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      indicators: {
        ema50,
        ema200,
        atr14,
        vwap,
      },
      buy_zone: {
        standard: ema50 * 0.99,
      },
      sell_zone: {
        standard: ema50 * 1.03,
      },
      chart,
    });
  } catch (err) {
    console.error("Analysis route error:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analysis data.",
      details: err.message,
    });
  }
});

export default router;
