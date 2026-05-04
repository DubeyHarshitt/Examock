import express from "express";
import multer from "multer";
import { requireAuth } from "../auth/auth.middlewares.js";
import { handleChat, handleIngest } from "./rag.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Both routes protected by your existing auth
router.post("/ingest", requireAuth, upload.single("file"), handleIngest);
router.post("/chat", requireAuth, handleChat);

export default router;