import express from "express";
import analysisRouter from "./routes/analysis.js";
import aiRouter from "./routes/ai.js";

const app = express();
app.use(express.json());

app.use("/api/assets", analysisRouter);
app.use("/api/assets", aiRouter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Server listening on", port));
