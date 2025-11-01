import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Multi-coin Whale Tracker (BTC / ETH / USDT)
 * Automatically uses open APIs — no API key required.
 */
router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  let url = "";
  let parser = null;

  try {
    switch (symbol) {
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
                amount: `${totalBTC.toFixed(2)} BTC`,
                time: new Date(tx.time * 1000).toLocaleTimeString(),
              };
            })
            .filter((tx) => parseFloat(tx.amount) >= 50) // default threshold: 50 BTC
            .slice(0, 10);
        };
        break;

      case "ETH":
        url = "https://api.etherscan.io/api?module=account&action=txlist&address=0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae&startblock=0&endblock=99999999&sort=desc";
        parser = async (json) => {
          const txs = json.result || [];
          return txs.slice(0, 10).map((tx) => ({
            hash: tx.hash,
            amount: `${(tx.value / 1e18).toFixed(2)} ETH`,
            from: tx.from,
            to: tx.to,
            time: new Date(tx.timeStamp * 1000).toLocaleTimeString(),
          }));
        };
        break;

      case "USDT":
        url = "https://api.trongrid.io/v1/accounts/TLsvX46rK9wUq3dYLGJjYohZ9Uj6ahFgDY/transactions/trc20?limit=10";
        parser = async (json) => {
          const txs = json.data || [];
          return txs.slice(0, 10).map((tx) => ({
            hash: tx.transaction_id,
            amount: `${tx.value / 1e6} USDT`,
            from: tx.from,
            to: tx.to,
            time: new Date(tx.block_timestamp).toLocaleTimeString(),
          }));
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: "Unsupported symbol. Use BTC, ETH, or USDT.",
        });
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`API failed: ${response.status}`);

    const data = await response.json();
    const whales = await parser(data);

    res.json({
      success: true,
      symbol,
      count: whales.length,
      whales,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`🐋 ${symbol} Whale API Error:`, err.message);
    res.status(500).json({
      success: false,
      symbol,
      error: `Failed to fetch whale data for ${symbol}`,
    });
  }
});

export default router;
