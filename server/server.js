import express from "express";
import cors from "cors";
import analysisRoutes from "./routes/analysis.js";
import assetsRoutes from "./routes/assets.js";
import aiRoutes from "./routes/ai.js";
import modelsRoutes from "./routes/models.js";   // ✅ NEW

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/analysis", analysisRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api", aiRoutes);
app.use("/api/models", modelsRoutes);            // ✅ NEW

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
