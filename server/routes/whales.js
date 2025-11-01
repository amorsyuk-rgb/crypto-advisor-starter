import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Whale Tracker (Free, Reliable)
 * Uses Blockchain.com public API to show recent large Bitcoin transactions.
 */
router.get("/", async (req, res) => {
  try {
    const response = await fetch("https://blockchain.info/unconfirmed-transactions?format=json");

    if (!response.ok) {
      throw new Error(`Blockchain.com API responded with status ${response.status}`);
    }

    const data = await response.json();
    const transactions = data.txs || [];

    if (transactions.length === 0) {
      return res.json({
        success: true,
        whales: [],
        message: "No unconfirmed transactions found (empty feed).",
      });
    }

    // Extract only large whale-like transfers (>= 500 BTC)
    const whales = transactions
      .map((tx) => {
        const totalBTC = tx.out
          .map((o) => o.value)
          .reduce((a, b) => a + b, 0) / 100000000; // convert satoshi → BTC

        return {
          hash: tx.hash,
          totalBTC: totalBTC.toFixed(2),
          time: new Date(tx.time * 1000).toLocaleTimeString(),
          size: tx.size,
        };
      })
      .filter((tx) => tx.totalBTC >= 500) // large transfer threshold
      .slice(0, 10);

    res.json({
      success: true,
      source: "Blockchain.com (Public Feed)",
      count: whales.length,
      whales,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("🐋 Whale API Error:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch whale data (Blockchain.com).",
    });
  }
});

export default router;
