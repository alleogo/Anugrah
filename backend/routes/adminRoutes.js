import express from "express";
import {
  getAllMentorsAndMentees,
  getAllPreferenceRequests,
  resolvePreferenceRequest,
  removeMenteeAllotment,
  toggleAccountApproval,
  deleteAccount,
} from "../controllers/adminController.js";
import { auth, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// All admin routes require authentication and Admin role
router.use(auth, isAdmin);

router.get("/users", getAllMentorsAndMentees);
router.get("/requests", getAllPreferenceRequests);
router.put("/requests/:requestId/resolve", resolvePreferenceRequest);
router.post("/remove-allotment", removeMenteeAllotment);
router.patch("/users/:userId/approval", toggleAccountApproval);
router.delete("/users/:userId", deleteAccount);

export default router;
