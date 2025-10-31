import express from "express";
const router = express.Router();

// ✅ Your confirmed working mirror
const BINANCE_BASE = "https://data-api.binance.vision";

// Get current price
router.get("/price", async (req, res) => {
  const { symbol = "BTCUSDT" } = req.query;
  try {
    const response = await fetch(`${BINANCE_BASE}/api/v3/ticker/price?symbol=${symbol}`);
    const data = await response.json();
    res.json({ success: true, source: "binance", data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get candlestick data
router.get("/klines", async (req, res) => {
  const { symbol = "BTCUSDT", interval = "1h", limit = 10 } = req.query;
  try {
    const response = await fetch(
      `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    const data = await response.json();
    const formatted = data.map(k => ({
      openTime: new Date(k[0]).toISOString(),
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
    }));
    res.json({ success: true, source: "binance", data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
