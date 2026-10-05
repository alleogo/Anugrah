// Remove every account created by seedDummyData.js (emails ending in @dummy.anugrah.test)
// together with their requests and messages, and unlink them from real users.
// Usage: npm run seed:cleanup
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import AllotmentRequest from "../models/AllotmentRequest.js";
import Message from "../models/Message.js";

await connectDB();

const dummies = await User.find({ email: /@dummy\.anugrah\.test$/ }).select("_id");
const ids = dummies.map((u) => u._id);

// Requests made by or for dummy users go; real users' requests only lose dummy mentors from their lists
const requests = await AllotmentRequest.deleteMany({
  $or: [{ mentee: { $in: ids } }, { requestedByMentor: { $in: ids } }],
});
await AllotmentRequest.updateMany({ preferredMentors: { $in: ids } }, { $pull: { preferredMentors: { $in: ids } } });
await AllotmentRequest.updateMany({ allottedMentor: { $in: ids } }, { $set: { allottedMentor: null } });
const messages = await Message.deleteMany({ $or: [{ sender: { $in: ids } }, { receiver: { $in: ids } }] });
// Real users must not keep links to deleted dummy accounts
await User.updateMany({ mentor: { $in: ids } }, { $set: { mentor: null } });
await User.updateMany({}, { $pull: { mentee: { $in: ids } } });
const users = await User.deleteMany({ _id: { $in: ids } });

console.log(
  `Removed ${users.deletedCount} dummy users, ${requests.deletedCount} requests, ${messages.deletedCount} messages.`
);
await mongoose.disconnect();
