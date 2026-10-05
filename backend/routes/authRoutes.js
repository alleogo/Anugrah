import express from "express";
import {
  sendOTP,
  signup,
  login,
  logout,
  deleteMyAccount,
  getMe,
  updateProfile,
  requestVerification,
  getUserProfile,
  uploadAvatar,
  removeAvatar,
  getPublicStats,
} from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.post("/send-otp", sendOTP);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/public-stats", getPublicStats);
router.get("/me", auth, getMe);
router.delete("/me", auth, deleteMyAccount);
router.put("/profile", auth, updateProfile);
router.post("/avatar", auth, uploadAvatar);
router.delete("/avatar", auth, removeAvatar);
router.post("/request-verification", auth, requestVerification);
router.get("/user/:userId", auth, getUserProfile);

export default router;
