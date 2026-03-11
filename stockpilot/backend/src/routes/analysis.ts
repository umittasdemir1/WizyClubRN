import { Router } from "express";
import { analyzeInventory } from "../services/analyzer.js";
import { ensureInventoryRecords } from "../utils/validators.js";

export const analysisRouter = Router();

analysisRouter.post("/", (req, res, next) => {
    try {
        const records = ensureInventoryRecords(req.body.records);
        res.json(analyzeInventory(records));
    } catch (error) {
        next(error);
    }
});
