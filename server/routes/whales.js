import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const apiUrl = "https://api.whale-alert.io/v1/transactions?api_key=demo&min_value=500000";
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.transactions) {
      return res.status(200).json({
        success: true,
        whales: [],
        message: "No transactions found or rate limited",
      });
    }

    const whales = data.transactions.map((t) => ({
      symbol: t.symbol?.toUpperCase() || "N/A",
      amount: t.amount?.toLocaleString(),
      to_exchange: t.to?.exchange || "Unknown",
      to_address: t.to?.owner_type || "Private Wallet",
      time_ago: new Date(t.timestamp * 1000).toLocaleTimeString(),
    }));

    res.json({ success: true, whales: whales.slice(0, 10) });
  } catch (err) {
    console.error("🐋 Whale API Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch whale data from Whale Alert API.",
    });
  }
});

export default router;
