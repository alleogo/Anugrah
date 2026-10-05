import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  // Document is deleted automatically 5 minutes after creation
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 5 * 60,
  },
});

const OTP = mongoose.model("OTP", otpSchema);
export default OTP;
