import express from "express";
import {
  getAllMentors,
  getAllottedMentor,
  requestMentorPreference,
  requestGeneralAllotment,
  getMyRequests,
} from "../controllers/menteeController.js";
import { auth, isMentee } from "../middleware/auth.js";

const router = express.Router();

// All mentee routes require authentication and Mentee role
router.use(auth, isMentee);

router.get("/mentors", getAllMentors);
router.get("/my-mentor", getAllottedMentor);
router.post("/request-mentor", requestMentorPreference);
router.post("/request-general-allotment", requestGeneralAllotment);
router.get("/my-requests", getMyRequests);

export default router;
