// Local development server. On Vercel, api/index.js at the repo root is used instead.
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 4004;

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
