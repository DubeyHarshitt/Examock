import express from "express";
import config from "./utils/config.js";
import cookieParser from "cookie-parser";
import cors from "cors"
import rateLimit from "express-rate-limit"

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
    windowMs: 15 * 10 * 1000, // 15min
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
}));

app.get("/health",(_req, res)=> {
    res.status(200).json({success: true, message:"OK"})
});

app.listen(PORT, ()=>{
    console.log(`The server is running on Port: ${PORT}`)
})