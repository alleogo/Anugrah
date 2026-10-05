import Message from "../models/Message.js";
import User from "../models/User.js";
import { isVerified, sendServerError } from "../utils/helpers.js";

// No phone numbers here: chat is open to more people than may see them
const CHAT_USER_FIELDS = "firstname lastname email role isApproved avatar";

// Chat rules:
// - Both users must be verified (Admins always are)
// - Mentees cannot message other mentees
const checkChatAllowed = (userA, userB) => {
  if (!userA || !userB) return { allowed: false, reason: "User not found." };

  if (!isVerified(userA) || !isVerified(userB)) {
    return { allowed: false, reason: "Messages are only allowed between verified accounts." };
  }

  if (userA.role === "Mentee" && userB.role === "Mentee") {
    return {
      allowed: false,
      reason:
        "Mentees cannot message other mentees. Messages are allowed only between mentors and mentees, or between mentors.",
    };
  }

  return { allowed: true };
};

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const sender = req.user;

    if (!receiverId || !message?.trim()) {
      return res.status(400).json({ success: false, message: "Receiver ID and message are required" });
    }

    if (String(sender._id) === String(receiverId)) {
      return res.status(400).json({ success: false, message: "You cannot message yourself" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: "Recipient user not found" });
    }

    const check = checkChatAllowed(sender, receiver);
    if (!check.allowed) {
      return res.status(403).json({ success: false, message: check.reason });
    }

    const newMessage = await Message.create({ sender: sender._id, receiver: receiver._id, message: message.trim() });
    await newMessage.populate([
      { path: "sender", select: CHAT_USER_FIELDS },
      { path: "receiver", select: CHAT_USER_FIELDS },
    ]);

    return res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Messages between the current user and another user (oldest first)
export const getMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const me = req.user;

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ success: false, message: "Recipient user not found" });
    }

    const check = checkChatAllowed(me, otherUser);
    if (!check.allowed) {
      return res.status(403).json({ success: false, message: check.reason });
    }

    const messages = await Message.find({
      $or: [
        { sender: me._id, receiver: otherUserId },
        { sender: otherUserId, receiver: me._id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", CHAT_USER_FIELDS)
      .populate("receiver", CHAT_USER_FIELDS);

    // Mark incoming messages as read
    await Message.updateMany({ sender: otherUserId, receiver: me._id, isRead: false }, { isRead: true });

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// One entry per chat partner: last message and unread count
export const getConversations = async (req, res) => {
  try {
    const me = req.user;
    if (!isVerified(me)) {
      return res.status(200).json({ success: true, conversations: [] });
    }

    const fields = `${CHAT_USER_FIELDS} organization`;
    const messages = await Message.find({ $or: [{ sender: me._id }, { receiver: me._id }] })
      .sort({ createdAt: -1 })
      .populate("sender", fields)
      .populate("receiver", fields);

    const conversations = new Map();
    for (const msg of messages) {
      const sentByMe = String(msg.sender?._id) === String(me._id);
      const other = sentByMe ? msg.receiver : msg.sender;
      if (!other?._id || !checkChatAllowed(me, other).allowed) continue;

      const otherId = String(other._id);
      if (!conversations.has(otherId)) {
        // Messages are newest first, so the first one seen is the latest
        conversations.set(otherId, {
          user: other,
          lastMessage: msg.message,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      }
      if (!sentByMe && !msg.isRead) {
        conversations.get(otherId).unreadCount += 1;
      }
    }

    return res.status(200).json({ success: true, conversations: [...conversations.values()] });
  } catch (error) {
    return sendServerError(res, error);
  }
};
