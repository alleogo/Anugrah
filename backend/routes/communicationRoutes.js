import express from "express";
import { sendMessage, getMessages, getConversations } from "../controllers/communicationController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Verified users can communicate and check active conversations
router.use(auth);

router.post("/send", sendMessage);
router.get("/conversations", getConversations);
router.get("/messages/:otherUserId", getMessages);

export default router;
