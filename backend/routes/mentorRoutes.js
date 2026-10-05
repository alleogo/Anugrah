import express from "express";
import {
  getUnallottedMentees,
  getMyMentees,
  selectMentee,
  requestMenteeRemoval,
  getOtherMentors,
  getMyRequests,
} from "../controllers/mentorController.js";
import { auth, isMentor } from "../middleware/auth.js";

const router = express.Router();

// All mentor routes require authentication and Mentor role
router.use(auth, isMentor);

router.get("/unallotted-mentees", getUnallottedMentees);
router.get("/my-mentees", getMyMentees);
router.get("/other-mentors", getOtherMentors);
router.get("/my-requests", getMyRequests);
router.post("/select-mentee", selectMentee);
router.post("/request-removal", requestMenteeRemoval);

export default router;
