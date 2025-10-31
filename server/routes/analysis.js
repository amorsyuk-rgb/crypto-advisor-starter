// server/routes/analysis.js
import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Crypto Advisor API is active",
    endpoints: [
      "/api/assets/:symbol/analysis",
      "/api/:symbol/ai",
      "/api/analysis/price",
      "/api/analysis/klines"
    ]
  });
});

// Optional example subroutes
router.get("/price", async (req, res) => {
  res.json({ success: true, message: "Price endpoint placeholder OK" });
});

export default router;
