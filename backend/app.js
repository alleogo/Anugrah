// The Express app. index.js runs it as a normal server (local development);
// api/index.js at the repo root runs it as a Vercel serverless function.
// Load .env before any other module reads process.env
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import menteeRoutes from "./routes/menteeRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import communicationRoutes from "./routes/communicationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Backend is running" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/mentee", menteeRoutes);
app.use("/api/v1/mentor", mentorRoutes);
app.use("/api/v1/communication", communicationRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

export default app;
