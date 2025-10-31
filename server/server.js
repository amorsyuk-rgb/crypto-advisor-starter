import express from "express";
import cors from "cors";
import analysisRoutes from "./routes/analysis.js";
import aiRoutes from "./routes/ai.js";
import assetsRoutes from "./routes/assets.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/analysis", analysisRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api", aiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
