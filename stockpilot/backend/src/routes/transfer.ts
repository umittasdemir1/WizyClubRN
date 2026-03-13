import { Router } from "express";
import { buildInventoryTransferPlan } from "../usecases/buildInventoryTransferPlan.js";

export const transferRouter = Router();

transferRouter.post("/", (req, res, next) => {
    try {
        res.json(buildInventoryTransferPlan({ records: req.body.records }));
    } catch (error) {
        next(error);
    }
});
