import { Router } from "express";
import multer from "multer";
import { parseInventoryBuffer } from "../services/parser.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

export const uploadRouter = Router();

uploadRouter.post("/", upload.single("file"), (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({
                message: "A file is required."
            });
            return;
        }

        const payload = parseInventoryBuffer(req.file.buffer, req.file.originalname);
        res.json(payload);
    } catch (error) {
        next(error);
    }
});
