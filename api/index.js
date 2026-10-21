// Vercel serverless entry: every /api/* request is handled by the backend Express app.
import app from "../backend/app.js";
import { connectDB } from "../backend/config/db.js";

// Reuse one database connection across requests while the function stays warm
let connecting = null;

export default async function handler(req, res) {
  try {
    connecting ??= connectDB();
    await connecting;
  } catch (error) {
    connecting = null; // try again on the next request
    console.error("Database connection failed:", error);
    return res.status(500).json({ success: false, message: "Could not connect to the database." });
  }
  return app(req, res);
}
