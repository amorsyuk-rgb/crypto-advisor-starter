import express from "express";
const router = express.Router();

// Combined Binance + CoinGecko route
router.get("/price", async (req, res) => {
  const { symbol = "BTCUSDT" } = req.query;

  // 1️⃣ Try Binance first
  try {
    const binanceUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
    const binanceRes = await fetch(binanceUrl);
    const binanceData = await binanceRes.json();

    // If Binance blocks access or responds with error, switch to CoinGecko
    if (
      binanceData?.msg?.includes("restricted location") ||
      binanceData?.code !== undefined && binanceData?.price === undefined
    ) {
      console.warn("Binance restricted — switching to CoinGecko fallback");
      throw new Error("Binance region blocked");
    }

    // Success: return Binance data
    return res.json({
      success: true,
      source: "binance",
      data: binanceData,
    });
  } catch (error) {
    // 2️⃣ Fallback: use CoinGecko if Binance fails
    try {
      const geckoMap = {
        BTCUSDT: "bitcoin",
        ETHUSDT: "ethereum",
        BNBUSDT: "binancecoin",
        SOLUSDT: "solana",
      };
      const coinId = geckoMap[symbol.toUpperCase()] || "bitcoin";
      const geckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
      const geckoRes = await fetch(geckoUrl);
      const geckoData = await geckoRes.json();

      return res.json({
        success: true,
        source: "coingecko",
        data: { symbol, price: geckoData[coinId].usd },
      });
    } catch (fallbackErr) {
      console.error("Fallback error:", fallbackErr.message);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch from both Binance and CoinGecko",
      });
    }
  }
});

export default router;
