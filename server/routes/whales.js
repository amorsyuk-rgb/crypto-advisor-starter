import express from "express";
import fetch from "node-fetch";

const router = express.Router();

/**
 * Whale Tracker Route (Free Version)
 * Uses BitInfoCharts to fetch the richest Bitcoin wallets
 * and simulate whale activity (no API key required)
 */
router.get("/", async (req, res) => {
  try {
    const response = await fetch(
      "https://bitinfocharts.com/comparison/bitcoin-richlist.json"
    );

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.json({
        success: true,
        whales: [],
        message: "No whale data available (source returned empty).",
      });
    }

    // Map and format top 10 richest wallets
    const whales = data.slice(0, 10).map((t, i) => ({
      rank: i + 1,
      address: t.address || "Unknown Wallet",
      balance: `${parseFloat(t.balance).toLocaleString()} BTC`,
      percentage: `${t.percent?.toFixed?.(2) || t.percent || "N/A"}%`,
    }));

    res.json({
      success: true,
      source: "BitInfoCharts",
      count: whales.length,
      whales,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("🐋 Whale Tracker Error:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch whale data (BitInfoCharts).",
    });
  }
});

export default router;
