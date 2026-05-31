import express from "express";
import config from "./src/config/config.js";
import cookieParser from "cookie-parser";
import cors from "cors"
import rateLimit from "express-rate-limit"

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

// Global rate limit: 10 request per 15 min per IP
// FIX: INTEGRATE with REDIS to make Horizontally scalable 
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15min
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
}));

app.get("/health",(_req, res)=> {
    res.status(200).json({success: true, message:"OK"})
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);

app.listen(PORT, ()=>{
    console.log(`The server is running on Port: ${PORT}`)
})