import User from "../models/User.js";
import AllotmentRequest from "../models/AllotmentRequest.js";
import { PROFILE_FIELDS, sendServerError } from "../utils/helpers.js";

export const getUnallottedMentees = async (req, res) => {
  try {
    // Only verified mentors get students' phone numbers
    const hidden = req.user.isApproved ? "-password" : "-password -mobileNumber";
    const mentees = await User.find({ role: "Mentee", mentor: null }).select(hidden);
    return res.status(200).json({ success: true, mentees });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const getMyMentees = async (req, res) => {
  try {
    const mentees = await User.find({ role: "Mentee", mentor: req.user._id }).select("-password");
    return res.status(200).json({ success: true, mentees });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Mentor offers to mentor an unallotted mentee (needs Admin approval)
export const selectMentee = async (req, res) => {
  try {
    const { menteeId, notes } = req.body;
    const mentor = req.user;

    if (!mentor.isApproved) {
      return res
        .status(403)
        .json({ success: false, message: "Your mentor account is pending administrator verification." });
    }

    const mentee = await User.findOne({ _id: menteeId, role: "Mentee" });
    if (!mentee) {
      return res.status(404).json({ success: false, message: "Mentee not found" });
    }

    if (mentee.mentor) {
      return res.status(400).json({ success: false, message: "This mentee already has an allotted mentor." });
    }

    const alreadyRequested = await AllotmentRequest.exists({
      mentee: menteeId,
      requestedByMentor: mentor._id,
      status: "Pending",
    });
    if (alreadyRequested) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a request to mentor this student. Awaiting Administrator approval.",
      });
    }

    const request = await AllotmentRequest.create({
      mentee: menteeId,
      preferredMentors: [mentor._id],
      requestType: "Allotment",
      requestedByRole: "Mentor",
      requestedByMentor: mentor._id,
      notes:
        notes ||
        `Mentor ${mentor.firstname} ${mentor.lastname} requested to mentor ${mentee.firstname} ${mentee.lastname}`,
      status: "Pending",
    });

    return res
      .status(200)
      .json({ success: true, message: "Mentorship request submitted to Administrator for approval!", request });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Mentor asks to remove one of their mentees (needs Admin approval)
export const requestMenteeRemoval = async (req, res) => {
  try {
    const mentor = req.user;
    if (!mentor.isApproved) {
      return res
        .status(403)
        .json({ success: false, message: "Your mentor account is pending administrator verification." });
    }

    const { menteeId, reason, notes } = req.body;

    const mentee = await User.findOne({ _id: menteeId, role: "Mentee", mentor: mentor._id });
    if (!mentee) {
      return res.status(404).json({ success: false, message: "Mentee not found or is not currently allotted to you." });
    }

    const alreadyRequested = await AllotmentRequest.exists({
      mentee: menteeId,
      requestedByMentor: mentor._id,
      requestType: "Removal",
      status: "Pending",
    });
    if (alreadyRequested) {
      return res.status(400).json({
        success: false,
        message: "A removal request for this mentee is already pending Administrator approval.",
      });
    }

    const request = await AllotmentRequest.create({
      mentee: menteeId,
      preferredMentors: [],
      allottedMentor: mentor._id,
      status: "Pending",
      requestType: "Removal",
      requestedByRole: "Mentor",
      requestedByMentor: mentor._id,
      notes:
        notes ||
        reason ||
        `Mentor ${mentor.firstname} ${mentor.lastname} requested removal of mentee ${mentee.firstname} ${mentee.lastname}.`,
    });

    return res
      .status(200)
      .json({ success: true, message: "Removal request submitted to Administrator for approval!", request });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Requests this mentor submitted
export const getMyRequests = async (req, res) => {
  try {
    const requests = await AllotmentRequest.find({ requestedByMentor: req.user._id })
      .populate("mentee", PROFILE_FIELDS)
      .populate("allottedMentor", PROFILE_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Other verified mentors (phone numbers are always hidden)
export const getOtherMentors = async (req, res) => {
  try {
    const mentors = await User.find({ role: "Mentor", _id: { $ne: req.user._id }, isApproved: true })
      .select("-password -mobileNumber")
      .populate("mentor", "firstname lastname email organization avatar")
      .populate("mentee", "firstname lastname email organization avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, mentors });
  } catch (error) {
    return sendServerError(res, error);
  }
};
