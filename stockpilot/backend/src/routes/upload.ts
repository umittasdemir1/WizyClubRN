import fs from "fs";
import os from "os";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { processInventoryUpload } from "../usecases/processInventoryUpload.js";

// 1.5: MIME type whitelist
const ALLOWED_MIME_TYPES = new Set([
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel"
]);

// 1.6: Disk storage to prevent OOM with large files
const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, os.tmpdir()),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `stockpilot-upload-${Date.now()}${ext}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: CSV, XLSX, XLS.`));
        }
    }
});

export const uploadRouter = Router();

uploadRouter.post("/", upload.single("file"), (req, res, next) => {
    if (!req.file) {
        res.status(400).json({ error: "VALIDATION_ERROR", message: "A file is required." });
        return;
    }

    const filePath = req.file.path;
    try {
        const buffer = fs.readFileSync(filePath);
        const payload = processInventoryUpload({
            buffer,
            fileName: req.file.originalname
        });
        res.json(payload);
    } catch (error) {
        next(error);
    } finally {
        // Always clean up temp file
        fs.unlink(filePath, () => {});
    }
});
