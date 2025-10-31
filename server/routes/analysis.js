import express from "express";
const router = express.Router();

// Candidate Binance public mirrors
const BINANCE_MIRRORS = [
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://data-api.binance.vision"
];

async function testBinanceMirrors(symbol = "BTCUSDT") {
  for (const base of BINANCE_MIRRORS) {
    try {
      const res = await fetch(`${base}/api/v3/ticker/price?symbol=${symbol}`);
      const data = await res.json();

      if (res.ok && data?.price && !data?.msg?.includes("restricted location")) {
        console.log(`✅ WORKING MIRROR: ${base}`);
        return { base, data };
      } else {
        console.warn(`⚠️ Blocked or invalid from ${base}:`, data?.msg);
      }
    } catch (e) {
      console.warn(`❌ Failed ${base}: ${e.message}`);
    }
  }
  throw new Error("All Binance mirrors blocked or unavailable.");
}

// Test route to find working mirror
router.get("/test-binance", async (req, res) => {
  try {
    const { base, data } = await testBinanceMirrors();
    res.json({
      success: true,
      workingMirror: base,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
