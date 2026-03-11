import { Router } from "express";
import { buildTransferPlan } from "../services/transfer.js";
import { ensureInventoryRecords } from "../utils/validators.js";

export const transferRouter = Router();

transferRouter.post("/", (req, res, next) => {
    try {
        const records = ensureInventoryRecords(req.body.records);
        res.json(buildTransferPlan(records));
    } catch (error) {
        next(error);
    }
});
