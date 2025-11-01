import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const BINANCE_BASE = "https://data-api.binance.vision/api/v3";

router.get("/assets/:symbol/analysis", async (req, res) => {
  const { symbol } = req.params;

  try {
    // --- 1️⃣ Fetch ticker stats ---
    const tickerRes = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`);
    const ticker = await tickerRes.json();

    if (ticker.code) {
      throw new Error("Binance mirror rejected request");
    }

    // --- 2️⃣ Fetch recent klines for chart ---
    const klinesRes = await fetch(
      `${BINANCE_BASE}/klines?symbol=${symbol}&interval=1h&limit=24`
    );
    const klines = await klinesRes.json();

    // Format candles for chart.js
    const chart = klines.map((candle) => ({
      time: candle[0],
      price: parseFloat(candle[4]),
    }));

    // --- 3️⃣ Calculate indicators ---
    const prices = chart.map((c) => c.price);
    const ema = (arr, n) => {
      const k = 2 / (n + 1);
      return arr.reduce((acc, price, i) => {
        if (i === 0) return [price];
        acc.push(price * k + acc[i - 1] * (1 - k));
        return acc;
      }, []);
    };

    const ema50 = ema(prices, 50).pop();
    const ema200 = ema(prices, 200).pop();

    // ATR approximation
    const atr14 = (() => {
      let sum = 0;
      for (let i = 1; i < Math.min(14, prices.length); i++) {
        sum += Math.abs(prices[i] - prices[i - 1]);
      }
      return sum / 14;
    })();

    // VWAP (simplified)
    const vwap =
      prices.reduce((sum, p) => sum + p, 0) / (prices.length || 1);

    // --- 4️⃣ Assemble unified response ---
    const analysis = {
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
    };

    res.json(analysis);
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
