import express from "express";
import multer from "multer";
import { verifyAccessToken } from '../../utils/jwt.js';
import { handleChat, handleIngest } from "./rag.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Both routes protected by your existing auth
router.post("/ingest", verifyAccessToken, upload.single("file"), handleIngest);
router.post("/chat", verifyAccessToken, handleChat);

export default router;