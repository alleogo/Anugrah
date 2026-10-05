import crypto from "node:crypto";
import mongoose from "mongoose";

// Node 18 has no global `crypto`, which the MongoDB driver needs
if (!globalThis.crypto) {
  globalThis.crypto = crypto;
}

const DB_URL = process.env.MONGODB_URL || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mentor-mentee";

export const connectDB = async () => {
  const conn = await mongoose.connect(DB_URL);
  console.log(`Database connected: ${conn.connection.host}/${conn.connection.name}`);
};
