import { Router } from "express";
import { analyzeInventoryRecords } from "../usecases/analyzeInventoryRecords.js";
export const analysisRouter = Router();
analysisRouter.post("/", (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== "object") {
            res.status(400).json({ error: "VALIDATION_ERROR", message: "Request body is required." });
            return;
        }
        res.json(analyzeInventoryRecords({ records: req.body.records }));
    }
    catch (error) {
        next(error);
    }
});
