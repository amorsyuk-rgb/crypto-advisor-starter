import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Whale Tracker v4
 * ----------------
 * ✅ Real-time tracking (BTC, ETH, USDT)
 * ✅ 2-min cache
 * ✅ Adaptive threshold fallback
 * ✅ /status route for monitoring
 */

// Cache store
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Cache helpers
function getCache(symbol) {
  const entry = cache.get(symbol);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(symbol, data) {
  cache.set(symbol, { data, timestamp: Date.now() });
}

// -----------------------------
// 🐋 Whale Data Endpoint
// -----------------------------
router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const userMin = parseFloat(req.query.min_btc) || 5;
  let min = userMin;
  let whales = [];
  let source = "unknown";

  // Serve cached version if valid
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
                const totalBTC = tx.out.reduce((a, o) => a + o.value, 0) / 1e8;
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
          source = "Blockchain.com";
          break;

        // 🟣 ETH
        case "ETH":
          url = "https://api.blockchair.com/ethereum/transactions?q=value(100000000000000000..)&limit=15";
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
          url = "https://api.ethplorer.io/getTokenHistory/0xdac17f958d2ee523a2206206994597c13d831ec7?apiKey=freekey&type=transfer";
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

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const json = await res.json();
      return await parser(json);
    }

    // Adaptive fetch loop
    let attempts = 0;
    while (whales.length === 0 && attempts < 4) {
      whales = await fetchWhales(symbol, min);
      if (whales.length === 0) {
        min = min / 2; // auto-lower threshold
        attempts++;
      }
    }

    const data = {
      success: true,
      symbol,
      source,
      count: whales.length,
      whales,
      updatedAt: new Date().toISOString(),
    };

    setCache(symbol, data);
    res.json(data);
  } catch (err) {
    console.error(`🐋 Whale API error (${symbol}):`, err.message);
    res.status(500).json({
      success: false,
      symbol,
      error: `Failed to fetch whale data for ${symbol}`,
    });
  }
});

// -----------------------------
// 📊 Status Monitor Endpoint
// -----------------------------
router.get("/status/check", async (req, res) => {
  try {
    const status = {};
    const now = Date.now();

    for (const [symbol, entry] of cache.entries()) {
      const ageSec = Math.round((now - entry.timestamp) / 1000);
      status[symbol] = {
        age_seconds: ageSec,
        fresh: ageSec < CACHE_TTL / 1000,
        last_updated: entry.data.updatedAt,
        count: entry.data.whales.length,
        source: entry.data.source,
      };
    }

    res.json({
      success: true,
      checkedAt: new Date().toISOString(),
      cache_ttl_minutes: CACHE_TTL / 60000,
      cached_symbols: Array.from(cache.keys()),
      status,
    });
  } catch (err) {
    console.error("Status check error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
