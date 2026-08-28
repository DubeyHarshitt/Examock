import express from "express";
import config from "./src/config/config.js";
import cookieParser from "cookie-parser";
import cors from "cors"
import rateLimit from "express-rate-limit"

// Register pg-boss workers (runs once on server startup)
import "./src/modules/rag/workers/noteIngestion.worker.js";

import authRoutes from "./src/modules/auth/auth.routes.js"
import testRoutes from "./src/modules/test/test.route.js"
import ragRoutes from "./src/modules/rag/rag.routes.js"
import adminRoutes from "./src/modules/admin/admin.routes.js"
import studentRoutes from "./src/modules/student/student.routes.js"

const app = express();
const PORT = config.PORT ?? 3000;

app.use(cors({
    origin: config.CLIENT_URI ?? "http://localhost:5173/",
    credentials: true,
}))

app.use(express.json());
app.use(cookieParser());

// Global rate limit: guards against runaway traffic, but generous enough that
// normal UX (multi-panel loads, token refresh, dev reloads) never trips it.
// skipSuccessfulRequests -> only FAILED attempts count toward the window, so a
// brief flurry of bad requests can't lock a healthy user out of login/refresh.
// FIX: INTEGRATE with REDIS to make Horizontally scalable 
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15min
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: "Too many requests. Please try again in a few minutes." },
}));

app.get("/health",(_req, res)=> {
    res.status(200).json({success: true, message:"OK"})
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global error handler — MUST be last, MUST have 4 args ─────
app.use((err, req, res, next) => {
  console.error("🔴 ERROR:", err); // full object/stack to your terminal
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});


app.listen(PORT, ()=>{
    console.log(`The server is running on Port: ${PORT}`)
})