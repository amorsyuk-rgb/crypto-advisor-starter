import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Whale Tracker – Updated Real-Time Feeds
 * - BTC → Blockchain.com (live unconfirmed)
 * - ETH → Ethplorer (real ETH transactions)
 * - USDT → Ethplorer (ERC20 token transfers)
 */

router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const min = parseFloat(req.query.min_btc) || 5; // threshold
  let url = "";
  let parser = null;

  try {
    switch (symbol) {
      // 🟠 BITCOIN (realtime)
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

      // 🟣 ETHEREUM (real transactions via Ethplorer)
      case "ETH":
        // using the Ethplorer feed of recent Ethereum transactions
        // note: this includes token and ETH transfers; we’ll filter to pure ETH
        url = "https://api.ethplorer.io/getTopTransactions?apiKey=freekey";
        parser = async (json) => {
          const txs = json.transactions || [];
          return txs
            .filter((tx) => tx.value && Number(tx.value) / 1e18 >= min)
            .map((tx) => ({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              amount: (Number(tx.value) / 1e18).toFixed(3),
              formatted: `${(Number(tx.value) / 1e18).toFixed(3)} ETH`,
              time: new Date(tx.timestamp * 1000).toLocaleTimeString(),
            }))
            .slice(0, 15);
        };
        break;

      // 🟢 USDT (ERC-20 transfers via Ethplorer)
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
          error: "Unsupported symbol. Use BTC, ETH, or USDT.",
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
