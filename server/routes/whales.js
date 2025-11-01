import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Whale Tracker – Live sources
 *  • BTC → Blockchain.com (unconfirmed)
 *  • ETH → Ethplorer top transactions (real-time)
 *  • USDT → Ethplorer token transfers (ERC20)
 */

router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const min = parseFloat(req.query.min_btc) || 5; // threshold
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
        break;

      // 🟣 ETHEREUM
      case "ETH":
        url = "https://api.ethplorer.io/getTop?apiKey=freekey";
        parser = async (json) => {
          const txs = json.holders || json.tokens || [];
          return (json.tokens || [])
            .map((tx) => ({
              name: tx.tokenInfo?.name || "Token",
              symbol: tx.tokenInfo?.symbol || "ETH",
              price: tx.price?.rate,
            }))
            .slice(0, 10);
        };
        break;

      // 🟢 USDT (ERC-20)
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
        break;

      default:
        return res.status(400).json({
          success: false,
          error:
            "Unsupported symbol. Try BTC, ETH, or USDT (case-insensitive).",
        });
    }

    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Fetch failed: ${response.status}`);

    const json = await response.json();
    const whales = await parser(json);

    res.json({
      success: true,
      symbol,
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
