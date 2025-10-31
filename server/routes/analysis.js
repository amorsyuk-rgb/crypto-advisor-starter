import express from "express";

const router = express.Router(); // ✅ define router before using it

// Example route
router.get("/", (req, res) => {
  res.send("Analysis route working!");
});

// Export router correctly
export default router;
