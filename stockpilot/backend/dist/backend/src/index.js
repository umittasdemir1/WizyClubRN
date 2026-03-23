import "./loadEnv.js";
import cors from "cors";
import express from "express";
import { academiaRouter } from "./routes/academia.js";
import { analysisRouter } from "./routes/analysis.js";
import { transferRouter } from "./routes/transfer.js";
import { uploadRouter } from "./routes/upload.js";
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}
const app = express();
const port = Number(process.env.PORT ?? 8787);
// 1.2: Default to localhost when CORS_ORIGIN env is not set
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:5173"];
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
// 3.3: Request timeout middleware (30 seconds)
app.use((_req, res, next) => {
    res.setTimeout(30_000, () => {
        res.status(503).json({ error: "REQUEST_TIMEOUT", message: "Request timed out." });
    });
    next();
});
app.get("/api/health", (_req, res) => {
    // 4.1: Enhanced health check
    const memUsage = process.memoryUsage();
    res.json({
        ok: true,
        service: "stockpilot-api",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
            rssMB: Math.round(memUsage.rss / 1024 / 1024)
        },
        version: process.env.npm_package_version ?? "unknown"
    });
});
app.use("/api/upload", uploadRouter);
app.use("/api/analyze", analysisRouter);
app.use("/api/transfer-plan", transferRouter);
app.use("/api/academia", academiaRouter);
// 1.1: Proper status codes + 3.2: Structured error responses
app.use((error, _req, res, _next) => {
    if (error instanceof ValidationError) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: error.message });
        return;
    }
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    res.status(500).json({ error: "SERVER_ERROR", message });
});
app.listen(port, () => {
    console.log(`StockPilot API listening on http://localhost:${port}`);
});
