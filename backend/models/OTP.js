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
  // "signup" codes confirm a new email; "reset" codes (stored hashed) allow a password reset
  purpose: {
    type: String,
    enum: ["signup", "reset"],
    default: "signup",
  },
  // Wrong guesses so far; a reset code is thrown away after too many
  attempts: {
    type: Number,
    default: 0,
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
