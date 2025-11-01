import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Universal Whale Tracker (BTC, ETH, USDT)
 * - BTC uses Blockchain.com live mempool feed
 * - ETH uses Etherscan community mirror (free public JSON)
 * - USDT uses Tronscan open data endpoint
 */

router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const minBTC = parseFloat(req.query.min_btc) || 50;
  let url = "";
  let parser = null;

  try {
    switch (symbol) {
      // 🟠 BITCOIN (public)
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

      // 🟣 ETHEREUM (alternate open-source feed)
      case "ETH":
        url = "https://api.blockchair.com/ethereum/transactions?q=value(10000000000000000000..)&limit=10";
        parser = async (json) => {
          const txs = json.data || [];
          return txs.map((tx) => ({
            hash: tx.transaction_hash,
            amount: (tx.value / 1e18).toFixed(2),
            formatted: `${(tx.value / 1e18).toFixed(2)} ETH`,
            time: new Date(tx.time).toLocaleTimeString(),
          }));
        };
        break;

      // 🟢 USDT (public Tronscan)
      case "USDT":
        url = "https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=20&start=0&sort=-timestamp&count=true&token=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
        parser = async (json) => {
          const txs = json.data || [];
          return txs
            .map((tx) => ({
              hash: tx.transaction_id,
              amount: tx.quant / 1e6,
              formatted: `${(tx.quant / 1e6).toLocaleString()} USDT`,
              from: tx.transfer_from_address,
              to: tx.transfer_to_address,
              time: new Date(tx.block_ts).toLocaleTimeString(),
            }))
            .filter((tx) => tx.amount >= minBTC * 1000)
            .slice(0, 10);
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error:
            "Unsupported symbol. Use BTC, ETH, or USDT (case-insensitive).",
        });
    }

    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`API fetch failed: ${response.status}`);

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
