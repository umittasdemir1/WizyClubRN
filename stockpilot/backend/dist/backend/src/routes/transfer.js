import { Router } from "express";
import { buildInventoryTransferPlan } from "../usecases/buildInventoryTransferPlan.js";
export const transferRouter = Router();
transferRouter.post("/", (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== "object") {
            res.status(400).json({ error: "VALIDATION_ERROR", message: "Request body is required." });
            return;
        }
        res.json(buildInventoryTransferPlan({ records: req.body.records }));
    }
    catch (error) {
        next(error);
    }
});
