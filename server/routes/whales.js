import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Universal Whale Tracker
 * Allows: /api/whales/:symbol?min_btc=50
 * Works for BTC, ETH, and USDT (with dynamic thresholds)
 */
router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const minBTC = parseFloat(req.query.min_btc) || 50; // default threshold

  let url = "";
  let parser = null;

  try {
    switch (symbol) {
      // 🟠 BITCOIN
      case "BTC":
        url = "https://blockchain.info/unconfirmed-transactions?format=json";
        parser = async (json) => {
          const txs = json.txs || [];
          return txs
            .map((tx) => {
              const totalBTC =
                tx.out.reduce((a, o) => a + o.value, 0) / 100000000;
              return {
                hash: tx.hash,
                amount: totalBTC,
                formatted: `${totalBTC.toFixed(2)} BTC`,
                time: new Date(tx.time * 1000).toLocaleTimeString(),
              };
            })
            .filter((tx) => tx.amount >= minBTC)
            .slice(0, 10);
        };
        break;

      // 🟣 ETHEREUM
      case "ETH":
        url =
          "https://api.etherscan.io/api?module=account&action=txlist&address=0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae&sort=desc";
        parser = async (json) => {
          const txs = json.result || [];
          return txs
            .map((tx) => ({
              hash: tx.hash,
              amount: tx.value / 1e18,
              formatted: `${(tx.value / 1e18).toFixed(2)} ETH`,
              from: tx.from,
              to: tx.to,
              time: new Date(tx.timeStamp * 1000).toLocaleTimeString(),
            }))
            .filter((tx) => tx.amount >= minBTC / 20) // roughly scale vs BTC
            .slice(0, 10);
        };
        break;

      // 🟢 USDT (TRON)
      case "USDT":
        url =
          "https://api.trongrid.io/v1/accounts/TLsvX46rK9wUq3dYLGJjYohZ9Uj6ahFgDY/transactions/trc20?limit=50";
        parser = async (json) => {
          const txs = json.data || [];
          return txs
            .map((tx) => ({
              hash: tx.transaction_id,
              amount: tx.value / 1e6,
              formatted: `${(tx.value / 1e6).toLocaleString()} USDT`,
              from: tx.from,
              to: tx.to,
              time: new Date(tx.block_timestamp).toLocaleTimeString(),
            }))
            .filter((tx) => tx.amount >= minBTC * 1000) // scale since USDT smaller
            .slice(0, 10);
        };
        break;

      // 🔴 Default
      default:
        return res.status(400).json({
          success: false,
          error:
            "Unsupported symbol. Try BTC, ETH, or USDT (case-insensitive).",
        });
    }

    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`API failed with status ${response.status}`);

    const json = await response.json();
    const whales = await parser(json);

    res.json({
      success: true,
      symbol,
      threshold: `${minBTC}`,
      count: whales.length,
      whales,
      updatedAt: new Date().toISOString(),
    });
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
