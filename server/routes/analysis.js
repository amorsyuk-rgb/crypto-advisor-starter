import express from "express";
const router = express.Router();

// ✅ Tested Binance public mirrors (bypass regional block)
const BINANCE_MIRRORS = [
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com"
];

async function fetchFromBinanceMirrors(path) {
  for (const base of BINANCE_MIRRORS) {
    try {
      const res = await fetch(`${base}${path}`);
      if (res.ok) {
        const data = await res.json();
        // Check if it’s not the restricted message
        if (!data?.msg?.includes("restricted location")) return data;
      }
    } catch (e) {
      console.warn(`⚠️ ${base} failed:`, e.message);
    }
  }
  throw new Error("All Binance mirrors blocked or unreachable.");
}

// ✅ Working Binance price route (tested previously)
router.get("/price", async (req, res) => {
  const { symbol = "BTCUSDT" } = req.query;
  try {
    const data = await fetchFromBinanceMirrors(`/api/v3/ticker/price?symbol=${symbol}`);
    res.json({ success: true, source: "binance", data });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
