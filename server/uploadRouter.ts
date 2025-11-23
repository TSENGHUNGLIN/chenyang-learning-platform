import express from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { randomBytes } from "crypto";
import { extractTextFromFile } from "./fileExtractor";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const randomSuffix = randomBytes(8).toString("hex");
    const fileKey = `uploads/${Date.now()}-${randomSuffix}-${file.originalname}`;

    const { url } = await storagePut(fileKey, file.buffer, file.mimetype);

    // Extract text from file
    const extractedText = await extractTextFromFile(file.buffer, file.mimetype);

    res.json({
      fileKey,
      fileUrl: url,
      filename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      extractedText,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;

