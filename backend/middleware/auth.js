import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Refuse to start without a real secret; a guessable fallback would let anyone forge login tokens
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set in backend/.env and be at least 32 characters long.");
}
export const JWT_SECRET = process.env.JWT_SECRET;

// Verify the JWT (cookie or Bearer header) and attach the user to req.user
export const auth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Token missing. Please log in to continue." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found with this token." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token.", error: error.message });
  }
};

// Allow only users with the given role
const allowRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({
      success: false,
      message: `Access forbidden: This route is protected for ${role}s only.`,
    });
  }
  next();
};

export const isAdmin = allowRole("Admin");
export const isMentor = allowRole("Mentor");
export const isMentee = allowRole("Mentee");
