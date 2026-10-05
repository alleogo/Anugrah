import User from "../models/User.js";
import AllotmentRequest from "../models/AllotmentRequest.js";
import Message from "../models/Message.js";
import { deleteAvatar } from "../config/cloudinary.js";

// Permanently delete a user and everything linked to them.
// Used both when an admin deletes an account and when users delete their own.
export const deleteUserAccount = async (user) => {
  if (user.role === "Mentee" && user.mentor) {
    await User.findByIdAndUpdate(user.mentor, { $pull: { mentee: user._id } });
  }
  if (user.role === "Mentor") {
    await User.updateMany({ mentor: user._id }, { $set: { mentor: null } });
  }

  // Requests made by or about this user go; other mentees' requests only lose this user as an option
  await AllotmentRequest.deleteMany({ $or: [{ mentee: user._id }, { requestedByMentor: user._id }] });
  await AllotmentRequest.updateMany({ preferredMentors: user._id }, { $pull: { preferredMentors: user._id } });
  await AllotmentRequest.updateMany({ allottedMentor: user._id }, { $set: { allottedMentor: null } });
  await Message.deleteMany({ $or: [{ sender: user._id }, { receiver: user._id }] });
  await user.deleteOne();
  if (user.avatar) await deleteAvatar(user._id);
};
