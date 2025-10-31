import express from "express";
import analysisRoutes from "./routes/analysis.js";
import assetsRoutes from "./routes/assets.js";

app.use("/api/assets", assetsRoutes);
const app = express();

app.use("/api/analysis", analysisRoutes); // ✅ mount router

app.listen(3000, () => console.log("Server running on port 3000"));
