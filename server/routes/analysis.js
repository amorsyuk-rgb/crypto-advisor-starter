router.get("/:symbol/analysis", async (req, res) => {
  const { symbol } = req.params;
  res.json({ symbol, price: 68000, indicators: { ema50: 67500, ema200: 66000 } });
});
export default router;
