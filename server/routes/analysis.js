import express from "express";
const router = express.Router();

// ✅ Route 1: Current Binance price
router.get("/binance-price", async (req, res) => {
  try {
    const { symbol = "BTCUSDT" } = req.query;
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    const data = await response.json();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
