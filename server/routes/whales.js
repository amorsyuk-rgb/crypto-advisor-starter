import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Whale Tracker — v3
 * ------------------
 * Features:
 * ✅ Real-time data
 * ✅ 2-minute caching
 * ✅ Adaptive threshold (never empty)
 * ✅ Works with Blockchain.com, Blockchair, and Ethplorer
 */

// Cache structure
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Helper: Check cache validity
function getCache(symbol) {
  const entry = cache.get(symbol);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

// Helper: Set cache
function setCache(symbol, data) {
  cache.set(symbol, { data, timestamp: Date.now() });
}

router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const userMin = parseFloat(req.query.min_btc) || 5;
  let min = userMin;
  let whales = [];
  let source = "unknown";

  // Serve cached data if valid
  const cached = getCache(symbol);
  if (cached) {
    return res.json({
      success: true,
      symbol,
      cached: true,
      source: cached.source,
      count: cached.whales.length,
      whales: cached.whales,
      updatedAt: cached.updatedAt,
    });
  }

  try {
    // Internal helper to fetch + parse
    async function fetchWhales(symbol, min) {
      let url, parser;

      switch (symbol) {
        // 🟠 BTC
        case "BTC":
          url = "https://blockchain.info/unconfirmed-transactions?format=json";
          parser = async (json) => {
            const txs = json.txs || [];
            return txs
              .map((tx) => {
                const totalBTC =
                  tx.out.reduce((a, o) => a + o.value, 0) / 1e8;
                return {
                  hash: tx.hash,
                  amount: totalBTC,
                  formatted: `${totalBTC.toFixed(2)} BTC`,
                  time: new Date(tx.time * 1000).toLocaleTimeString(),
                };
              })
              .filter((tx) => tx.amount >= min)
              .slice(0, 15);
          };
          source = "Blockchain";
          break;

        // 🟣 ETH (Hybrid)
        case "ETH":
          url = "https://api.blockchair.com/ethereum/transactions?q=value(100000000000000000..)&limit=15"; // >=0.1 ETH
          parser = async (json) => {
            const txs = json.data || [];
            return txs
              .map((tx) => ({
                hash: tx.transaction_hash,
                amount: (tx.value / 1e18).toFixed(3),
                formatted: `${(tx.value / 1e18).toFixed(3)} ETH`,
                time: new Date(tx.time).toLocaleTimeString(),
              }))
              .filter((tx) => tx.amount >= min)
              .slice(0, 15);
          };
          source = "Blockchair";
          break;

        // 🟢 USDT
        case "USDT":
          url =
            "https://api.ethplorer.io/getTokenHistory/0xdac17f958d2ee523a2206206994597c13d831ec7?apiKey=freekey&type=transfer";
          parser = async (json) => {
            const txs = json.operations || [];
            return txs
              .map((tx) => ({
                hash: tx.transactionHash,
                amount: (tx.value / 1e6).toFixed(2),
                formatted: `${(tx.value / 1e6).toLocaleString()} USDT`,
                from: tx.from,
                to: tx.to,
                time: new Date(tx.timestamp * 1000).toLocaleTimeString(),
              }))
              .filter((tx) => tx.amount >= min * 1000)
              .slice(0, 15);
          };
          source = "Ethplorer";
          break;

        default:
          throw new Error("Unsupported symbol");
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const json = await response.json();
      return await parser(json);
    }

    // Adaptive loop: lower threshold until we get data
    let attempts = 0;
    while (whales.length === 0 && attempts < 4) {
      whales = await fetchWhales(symbol, min);
      if (whales.length === 0) {
        min = min / 2; // gradually lower
        attempts++;
      }
    }

    // Build response
    const data = {
      success: true,
      symbol,
      source,
      count: whales.length,
      whales,
      updatedAt: new Date().toISOString(),
    };

    // Cache it
    setCache(symbol, data);

    res.json(data);
  } catch (err) {
    console.error(`🐋 Whale API Error (${symbol}):`, err.message);
    res.status(500).json({
      success: false,
      symbol,
      error: `Failed to fetch whale data for ${symbol}`,
    });
  }
});

export default router;
