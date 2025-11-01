import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Whale Tracker – Stable Real-Time Feeds
 * - BTC → Blockchain.com (live unconfirmed)
 * - ETH → Ethplorer (fallback: Blockchair)
 * - USDT → Ethplorer (ERC20 token transfers)
 */

router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const min = parseFloat(req.query.min_btc) || 5;
  let url = "";
  let parser = null;

  try {
    switch (symbol) {
      // 🟠 BITCOIN (live)
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

      // 🟣 ETHEREUM (live w/ fallback)
      case "ETH":
        try {
          // Try Ethplorer first
          url = "https://api.ethplorer.io/getTopTransactions?apiKey=freekey";
          const ethplorerRes = await fetch(url);
          if (!ethplorerRes.ok)
            throw new Error("Ethplorer down or throttled");

          const ethplorerJson = await ethplorerRes.json();
          const ethTxs = ethplorerJson.transactions || [];

          const whales = ethTxs
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

          if (whales.length > 0) {
            return res.json({
              success: true,
              symbol,
              count: whales.length,
              whales,
              source: "Ethplorer",
              updatedAt: new Date().toISOString(),
            });
          }

          throw new Error("No data from Ethplorer");
        } catch (e) {
          // Fallback to Blockchair
          console.warn("⚠️ Ethplorer failed, switching to Blockchair...");
          url =
            "https://api.blockchair.com/ethereum/transactions?q=value(1000000000000000000..)&limit=15"; // ≥1 ETH
          const blockchairRes = await fetch(url);
          if (!blockchairRes.ok)
            throw new Error("Blockchair also failed");

          const blockchairJson = await blockchairRes.json();
          const txs = blockchairJson.data || [];

          const whales = txs.map((tx) => ({
            hash: tx.transaction_hash,
            amount: (tx.value / 1e18).toFixed(3),
            formatted: `${(tx.value / 1e18).toFixed(3)} ETH`,
            time: new Date(tx.time).toLocaleTimeString(),
          }));

          return res.json({
            success: true,
            symbol,
            count: whales.length,
            whales,
            source: "Blockchair",
            updatedAt: new Date().toISOString(),
          });
        }

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
          error: "Unsupported symbol. Use BTC, ETH, or USDT.",
        });
    }

    if (parser) {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Fetch failed: ${response.status}`);
      const json = await response.json();
      const whales = await parser(json);

      return res.json({
        success: true,
        symbol,
        count: whales.length,
        whales,
        source: "Direct",
        updatedAt: new Date().toISOString(),
      });
    }
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
