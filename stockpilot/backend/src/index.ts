import cors from "cors";
import express from "express";
import { analysisRouter } from "./routes/analysis.js";
import { transferRouter } from "./routes/transfer.js";
import { uploadRouter } from "./routes/upload.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(
    cors({
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true
    })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        service: "stockpilot-api",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/upload", uploadRouter);
app.use("/api/analyze", analysisRouter);
app.use("/api/transfer-plan", transferRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    res.status(400).json({
        message
    });
});

app.listen(port, () => {
    console.log(`StockPilot API listening on http://localhost:${port}`);
});
