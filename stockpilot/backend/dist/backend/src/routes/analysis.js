import { Router } from "express";
import { analyzeInventoryRecords } from "../usecases/analyzeInventoryRecords.js";
export const analysisRouter = Router();
analysisRouter.post("/", (req, res, next) => {
    try {
        res.json(analyzeInventoryRecords({ records: req.body.records }));
    }
    catch (error) {
        next(error);
    }
});
