// server/server.js
import express from "express";
import cors from "cors";

// Import routes
import analysisRoutes from "./routes/analysis.js";
import assetsRoutes from "./routes/assets.js";
import aiRoutes from "./routes/ai.js";

const app = express();
app.use(cors());
app.use(express.json());

// Mount routes
app.use("/api/analysis", analysisRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api", aiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
