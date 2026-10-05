import User from "../models/User.js";
import AllotmentRequest from "../models/AllotmentRequest.js";
import { PUBLIC_FIELDS, sendServerError } from "../utils/helpers.js";

const GENERAL_REQUEST_MESSAGE =
  "General mentor allotment request submitted successfully! An administrator will review and pair you with an experienced mentor.";

export const getAllMentors = async (req, res) => {
  try {
    // Phone numbers are private: a mentee only sees their own mentor's number (via /my-mentor)
    const mentors = await User.find({ role: "Mentor" }).select("-password -mobileNumber");
    return res.status(200).json({ success: true, mentors });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const getAllottedMentor = async (req, res) => {
  try {
    const mentee = await User.findById(req.user._id).populate("mentor", "-password");
    return res.status(200).json({ success: true, mentor: mentee.mentor });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Create an allotment request for the logged-in mentee.
// With no preferred mentors it becomes a "general" request and the Admin picks the mentor.
const createAllotmentRequest = async (req, res, preferredMentorIds) => {
  try {
    if (req.user.mentor) {
      return res.status(400).json({ success: false, message: "You already have an allotted mentor" });
    }

    // Only the mentee's own pending request blocks a new one.
    // Mentor-initiated requests are separate and are weighed by the Admin alongside this one.
    const hasPending = await AllotmentRequest.exists({
      mentee: req.user._id,
      status: "Pending",
      requestedByMentor: null,
      requestType: { $ne: "Removal" },
    });
    if (hasPending) {
      return res
        .status(400)
        .json({ success: false, message: "You already have a pending request awaiting Admin review" });
    }

    const { notes, guidanceDomain, isGeneralAllotment } = req.body;
    const mentorIds = [...new Set(preferredMentorIds.map(String))];
    const validMentors = await User.countDocuments({ _id: { $in: mentorIds }, role: "Mentor" });
    if (validMentors !== mentorIds.length) {
      return res.status(400).json({ success: false, message: "Your preference list can only contain mentors." });
    }
    const isGeneral = Boolean(isGeneralAllotment || mentorIds.length === 0);

    const request = await AllotmentRequest.create({
      mentee: req.user._id,
      preferredMentors: mentorIds,
      requestType: "Allotment",
      isGeneralAllotment: isGeneral,
      guidanceDomain: guidanceDomain?.trim() || "",
      notes: notes?.trim() || "",
      requestedByRole: "Mentee",
      status: "Pending",
    });
    await request.populate("preferredMentors", PUBLIC_FIELDS);

    return res.status(201).json({
      success: true,
      message: isGeneral ? GENERAL_REQUEST_MESSAGE : "Preference request submitted successfully",
      request,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Mentee submits an ordered list of preferred mentors (resolved by Admin)
export const requestMentorPreference = (req, res) => {
  const { preferredMentorIds } = req.body;
  return createAllotmentRequest(req, res, Array.isArray(preferredMentorIds) ? preferredMentorIds : []);
};

// Mentee asks the Admin to pick any suitable mentor
export const requestGeneralAllotment = (req, res) => createAllotmentRequest(req, res, []);

// Requests the mentee submitted (mentor-initiated ones are excluded)
export const getMyRequests = async (req, res) => {
  try {
    const requests = await AllotmentRequest.find({ mentee: req.user._id, requestedByMentor: null })
      .populate("preferredMentors", PUBLIC_FIELDS)
      .populate("allottedMentor", PUBLIC_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    return sendServerError(res, error);
  }
};
