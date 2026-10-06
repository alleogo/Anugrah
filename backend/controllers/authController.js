import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OTP from "../models/OTP.js";
import { JWT_SECRET } from "../middleware/auth.js";
import { mailSender, otpEmailTemplate } from "../utils/mailSender.js";
import { deleteAvatar, uploadAvatar as uploadToCloudinary } from "../config/cloudinary.js";
import { deleteUserAccount } from "../utils/accounts.js";
import {
  CONTACT_FIELDS,
  INVALID_EMAIL_MESSAGE,
  INVALID_MOBILE_MESSAGE,
  COLLEGE_YEARS,
  INTEREST_LEVELS,
  isValidEmail,
  normalizeMobile,
  sendServerError,
} from "../utils/helpers.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Create a JWT, set it as an http-only cookie and return it
const setAuthCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: SEVEN_DAYS_MS,
  });
  return token;
};

// Load a user without the password, with their mentor / mentees filled in
const findUserWithLinks = (userId) =>
  User.findById(userId).select("-password").populate("mentor", CONTACT_FIELDS).populate("mentee", CONTACT_FIELDS);

// Send a 6-digit signup code to the given email
export const sendOTP = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: "Email address is required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: INVALID_EMAIL_MESSAGE });
    }

    if (await User.exists({ email })) {
      return res.status(400).json({ success: false, message: "Email is already registered. Please sign in instead." });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    await OTP.create({ email, otp });
    await mailSender(email, "Anugrah - Your Email Verification Code", otpEmailTemplate(otp));

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}. Please check your inbox.`,
    });
  } catch (error) {
    return sendServerError(res, error, `Failed to send email verification: ${error.message}`);
  }
};

// Register a Mentor or Mentee (email OTP required)
export const signup = async (req, res) => {
  try {
    const { firstname, lastname, email, password, role, otp, mobileNumber, collegeYear } = req.body;

    if (!firstname || !lastname || !email || !password || !role || !mobileNumber) {
      return res.status(400).json({ success: false, message: "All fields including mobile number are required" });
    }

    if (role === "Admin") {
      return res.status(403).json({ success: false, message: "Admin accounts cannot be registered publicly." });
    }

    if (!["Mentor", "Mentee"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role. Role must be Mentor or Mentee." });
    }

    const mobile = normalizeMobile(mobileNumber);
    if (!mobile) {
      return res.status(400).json({ success: false, message: INVALID_MOBILE_MESSAGE });
    }
    if (role === "Mentee" && !COLLEGE_YEARS.includes(collegeYear)) {
      return res.status(400).json({ success: false, message: "Select your current year in college." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: INVALID_EMAIL_MESSAGE });
    }

    if (!otp?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Email verification code (OTP) is required. Please click 'Send Code' to receive your verification code via email.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.exists({ email: normalizedEmail })) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const latestOtp = await OTP.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (!latestOtp || latestOtp.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code. Please request a new code via email.",
      });
    }
    await OTP.deleteMany({ email: normalizedEmail });

    // New accounts start unapproved, with a verification request already sent to Admin
    const user = await User.create({
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: normalizedEmail,
      mobileNumber: mobile,
      password: await bcrypt.hash(password, 10),
      role,
      collegeYear: role === "Mentee" ? collegeYear : "",
      isApproved: false,
      verificationRequested: true,
      verificationRequestedAt: new Date(),
    });

    const token = setAuthCookie(res, user._id);
    const userData = user.toObject();
    delete userData.password;

    return res.status(201).json({ success: true, message: "Account created successfully", token, user: userData });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .populate("mentor", CONTACT_FIELDS)
      .populate("mentee", CONTACT_FIELDS);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = setAuthCookie(res, user._id);
    const userData = user.toObject();
    delete userData.password;

    return res.status(200).json({ success: true, message: "Login successful", token, user: userData });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const logout = (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};

// Users permanently delete their own account. The password is required again to confirm.
export const deleteMyAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // An admin account cannot remove itself, so the platform is never left without an admin
    if (user.role === "Admin") {
      return res.status(403).json({ success: false, message: "Admin accounts cannot be deleted from here." });
    }

    const { password } = req.body || {};
    if (!password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    await deleteUserAccount(user);
    res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
    return res.status(200).json({ success: true, message: "Your account has been deleted." });
  } catch (error) {
    return sendServerError(res, error, "Failed to delete your account.");
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await findUserWithLinks(req.user._id);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Update profile fields. Only fields present in the body are changed.
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const {
      firstname,
      lastname,
      mobileNumber,
      skills,
      experienceYears,
      collegeYear,
      interestLevels,
      submitForVerification,
    } = req.body;

    if (firstname) user.firstname = firstname.trim();
    if (lastname) user.lastname = lastname.trim();
    if (mobileNumber !== undefined) {
      const mobile = normalizeMobile(mobileNumber);
      if (!mobile) {
        return res.status(400).json({ success: false, message: INVALID_MOBILE_MESSAGE });
      }
      user.mobileNumber = mobile;
    }
    // The avatar is changed only through the avatar endpoints, which store it on Cloudinary
    for (const field of ["organization", "bio", "linkedinUrl", "domain"]) {
      if (req.body[field] !== undefined) user[field] = req.body[field].trim();
    }
    if (user.role === "Mentee") {
      // Year in college and leveled interests are required for mentees
      if (collegeYear !== undefined) {
        if (!COLLEGE_YEARS.includes(collegeYear)) {
          return res.status(400).json({ success: false, message: "Select your current year in college." });
        }
        user.collegeYear = collegeYear;
      }
      if (interestLevels !== undefined) {
        const interests = (Array.isArray(interestLevels) ? interestLevels : [])
          .map((i) => ({ name: String(i?.name || "").trim(), level: i?.level }))
          .filter((i) => i.name);
        if (!interests.length) {
          return res.status(400).json({ success: false, message: "Add at least one area of interest." });
        }
        if (interests.some((i) => !INTEREST_LEVELS.includes(i.level))) {
          return res.status(400).json({ success: false, message: "Choose your level for every area of interest." });
        }
        user.interestLevels = interests;
        user.skills = interests.map((i) => i.name); // keeps search by interest working
      }
    } else if (Array.isArray(skills)) {
      user.skills = skills.map((s) => s.trim()).filter(Boolean);
    }

    if (experienceYears !== undefined) {
      const years = Number(experienceYears);
      if (!Number.isInteger(years) || years < 0 || years > 60) {
        return res
          .status(400)
          .json({ success: false, message: "Experience must be a whole number of years (0 to 60)." });
      }
      user.experienceYears = years;
    }

    if (submitForVerification) {
      user.profileSubmitted = true;
      user.verificationRequested = true;
      user.verificationRequestedAt = new Date();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: submitForVerification
        ? "Profile submitted for Administrator verification!"
        : "Profile updated successfully.",
      user: await findUserWithLinks(user._id),
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Submit the profile for Admin verification
export const requestVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isApproved) {
      return res.status(400).json({ success: false, message: "Your account is already verified by an Administrator." });
    }

    const { organization, bio, linkedinUrl, mobileNumber } = req.body || {};
    if (mobileNumber) {
      const mobile = normalizeMobile(mobileNumber);
      if (!mobile) {
        return res.status(400).json({ success: false, message: INVALID_MOBILE_MESSAGE });
      }
      user.mobileNumber = mobile;
    }
    if (organization !== undefined) user.organization = organization.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl.trim();

    user.profileSubmitted = true;
    user.verificationRequested = true;
    user.verificationRequestedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile submitted successfully for Administrator verification!",
      user: await findUserWithLinks(user._id),
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Can `viewer` see the phone number of `profile`?
// - Mentor's phone: only the mentor, an Admin, or the mentor's own mentees.
// - Mentee's phone: the mentee, an Admin, or any verified Mentor.
// - Admin's phone: everyone.
const canSeePhone = (viewer, profile) => {
  const isSelf = String(viewer._id) === String(profile._id);
  if (isSelf || viewer.role === "Admin" || profile.role === "Admin") return true;
  if (profile.role === "Mentor") return viewer.role === "Mentee" && String(viewer.mentor) === String(profile._id);
  return viewer.role === "Mentor" && viewer.isApproved;
};

// View another user's profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("-password")
      .populate("mentor", "firstname lastname email organization avatar domain skills");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userData = user.toObject();
    if (!canSeePhone(req.user, userData)) {
      delete userData.mobileNumber;
    }

    return res.status(200).json({ success: true, user: userData });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Save the avatar URL ("" removes it) and return the updated user
const saveAvatar = async (userId, avatar) => {
  await User.findByIdAndUpdate(userId, { avatar });
  return User.findById(userId).select("-password");
};

export const uploadAvatar = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: "Image data is required" });
    }

    const avatar = await uploadToCloudinary(image, req.user._id);
    const user = await saveAvatar(req.user._id, avatar);

    return res.status(200).json({ success: true, message: "Avatar uploaded and saved successfully", avatar, user });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const removeAvatar = async (req, res) => {
  try {
    await deleteAvatar(req.user._id);
    const user = await saveAvatar(req.user._id, "");
    return res.status(200).json({ success: true, message: "Profile picture removed successfully", avatar: "", user });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Live numbers shown on the landing page
export const getPublicStats = async (req, res) => {
  try {
    const [approvedMentors, activeMentees, allottedMatches, organizations] = await Promise.all([
      User.countDocuments({ role: "Mentor", isApproved: true }),
      User.countDocuments({ role: "Mentee" }),
      User.countDocuments({ role: "Mentee", mentor: { $ne: null } }),
      User.distinct("organization", { role: "Mentor", organization: { $ne: "" }, isApproved: true }),
    ]);

    return res.status(200).json({
      success: true,
      stats: { approvedMentors, activeMentees, allottedMatches, organizationsCount: organizations.length },
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};
