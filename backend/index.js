// Load .env before any other module reads process.env
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import menteeRoutes from "./routes/menteeRoutes.js";
import mentorRoutes from "./routes/mentorRoutes.js";
import communicationRoutes from "./routes/communicationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();
const PORT = process.env.PORT || 4004;

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

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
