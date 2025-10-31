import express from "express";
const router = express.Router();

// ✅ Working Binance public mirror
const BINANCE_MIRRORS = [
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://data-api.binance.vision" // extra fallback
];

async function fetchFromMirrors(path) {
  for (const base of BINANCE_MIRRORS) {
    try {
      const res = await fetch(`${base}${path}`);
      if (res.ok) {
        const data = await res.json();
        // skip restricted-region messages
        if (!data?.msg?.includes("restricted location")) {
          console.log(`✅ Successful from ${base}`);
          return data;
        } else {
          console.warn(`⚠️ Restricted response from ${base}`);
        }
      }
    } catch (err) {
      console.warn(`❌ ${base} failed: ${err.message}`);
    }
  }
  throw new Error("All Binance mirrors blocked or unavailable.");
}

// ✅ Route to get live price (tested yesterday)
router.get("/price", async (req, res) => {
  const { symbol = "BTCUSDT" } = req.query;
  try {
    const data = await fetchFromMirrors(`/api/v3/ticker/price?symbol=${symbol}`);
    res.json({ success: true, source: "binance", data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Route for candlestick data (optional)
router.get("/klines", async (req, res) => {
  const { symbol = "BTCUSDT", interval = "1h", limit = 10 } = req.query;
  try {
    const data = await fetchFromMirrors(
      `/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    const formatted = data.map(k => ({
      openTime: new Date(k[0]).toISOString(),
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5]
    }));
    res.json({ success: true, source: "binance", data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
