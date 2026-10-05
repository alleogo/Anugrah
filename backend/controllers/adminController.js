import User from "../models/User.js";
import AllotmentRequest from "../models/AllotmentRequest.js";
import { deleteUserAccount } from "../utils/accounts.js";
import { CONTACT_FIELDS, PROFILE_FIELDS, sendServerError } from "../utils/helpers.js";

// Mark a mentee's other pending requests as Rejected (used once a decision settles the mentee)
const rejectOtherPendingRequests = (menteeId, keepRequestId, adminId) =>
  AllotmentRequest.updateMany(
    { mentee: menteeId, _id: { $ne: keepRequestId }, status: "Pending" },
    { status: "Rejected", resolvedBy: adminId, resolvedAt: new Date() }
  );

export const getAllMentorsAndMentees = async (req, res) => {
  try {
    const sortOrder = { isApproved: -1, firstname: 1 };
    const [mentors, mentees] = await Promise.all([
      User.find({ role: "Mentor" }).select("-password").populate("mentee", CONTACT_FIELDS).sort(sortOrder),
      User.find({ role: "Mentee" }).select("-password").populate("mentor", CONTACT_FIELDS).sort(sortOrder),
    ]);

    return res.status(200).json({ success: true, mentors, mentees });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const getAllPreferenceRequests = async (req, res) => {
  try {
    const fields = `${CONTACT_FIELDS} bio isApproved`;
    const requests = await AllotmentRequest.find()
      .populate("mentee", fields)
      .populate("preferredMentors", fields)
      .populate("allottedMentor", fields)
      .populate("requestedByMentor", fields)
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Accept or reject a pending allotment / removal request.
// Body: { action: "accept" | "reject", allottedMentorId? }
export const resolvePreferenceRequest = async (req, res) => {
  try {
    const action = req.body.action?.toLowerCase();
    if (!["accept", "approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'accept' or 'reject'." });
    }
    const isAccepted = action !== "reject";

    const request = await AllotmentRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Preference request not found." });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${request.status.toLowerCase()}.`,
      });
    }

    const isRemoval = request.requestType === "Removal";

    if (isAccepted && isRemoval) {
      // De-allot the mentee from their mentor
      const mentee = await User.findById(request.mentee);
      const mentorId = request.requestedByMentor || mentee?.mentor;

      if (mentee) {
        mentee.mentor = null;
        await mentee.save();
      }
      if (mentorId) {
        await User.findByIdAndUpdate(mentorId, { $pull: { mentee: request.mentee } });
      }
    }

    if (isAccepted && !isRemoval) {
      const mentee = await User.findById(request.mentee);
      if (!mentee) {
        return res.status(404).json({ success: false, message: "Mentee no longer exists." });
      }
      if (mentee.mentor) {
        return res.status(400).json({ success: false, message: "This mentee already has an allotted mentor." });
      }

      // Admin may pick any mentor; otherwise use the mentee's first preference
      const mentorId = req.body.allottedMentorId || request.preferredMentors[0];
      if (!mentorId) {
        return res.status(400).json({
          success: false,
          message:
            "This request has no mentor preferences. Please specify 'allottedMentorId' in the request body to allot a mentor.",
        });
      }

      const mentor = await User.findById(mentorId);
      if (mentor?.role !== "Mentor") {
        return res
          .status(404)
          .json({ success: false, message: "Selected mentor to allot was not found or is not a Mentor." });
      }
      if (!mentor.isApproved) {
        return res.status(400).json({
          success: false,
          message: `${mentor.firstname} ${mentor.lastname} is not verified yet. Verify the mentor first.`,
        });
      }

      mentee.mentor = mentor._id;
      await mentee.save();
      await User.findByIdAndUpdate(mentor._id, { $addToSet: { mentee: mentee._id } });
      request.allottedMentor = mentor._id;
    }

    if (isAccepted) {
      await rejectOtherPendingRequests(request.mentee, request._id, req.user._id);
    }

    request.status = isAccepted ? "Approved" : "Rejected";
    request.resolvedBy = req.user._id;
    request.resolvedAt = new Date();
    await request.save();

    await request.populate([
      { path: "mentee", select: PROFILE_FIELDS },
      { path: "preferredMentors", select: PROFILE_FIELDS },
      { path: "allottedMentor", select: PROFILE_FIELDS },
      { path: "requestedByMentor", select: PROFILE_FIELDS },
      { path: "resolvedBy", select: "firstname lastname email" },
    ]);

    const message = isRemoval
      ? `Removal request successfully ${isAccepted ? "approved (mentee de-allotted)" : "rejected"}.`
      : `Request successfully ${request.status.toLowerCase()}.`;

    return res.status(200).json({ success: true, message, request });
  } catch (error) {
    return sendServerError(res, error, "Failed to resolve preference request.");
  }
};

// Approve / unapprove an account. Toggles when `isApproved` is not given.
export const toggleAccountApproval = async (req, res) => {
  try {
    const { isApproved, reject } = req.body; // reject: turn down a pending verification request

    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.isApproved = typeof isApproved === "boolean" ? isApproved : !user.isApproved;
    // Clear the request so an unapproved user can ask for verification again
    user.verificationRequested = false;
    user.verificationRequestedAt = null;
    await user.save();

    const status = user.isApproved ? "approved/verified" : "unapproved";
    return res.status(200).json({
      success: true,
      message: reject
        ? `Verification request from ${user.firstname} ${user.lastname} was rejected.`
        : `Account for ${user.firstname} ${user.lastname} (${user.role}) has been ${status}.`,
      user,
    });
  } catch (error) {
    return sendServerError(res, error, "Failed to update account approval status.");
  }
};

// Delete an account and clean up everything linked to it
export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user._id.equals(req.user._id)) {
      return res.status(400).json({ success: false, message: "You cannot delete your own admin account." });
    }

    await deleteUserAccount(user);

    return res.status(200).json({
      success: true,
      message: `Account for ${user.firstname} ${user.lastname} (${user.role}) was deleted successfully.`,
    });
  } catch (error) {
    return sendServerError(res, error, "Failed to delete account.");
  }
};

// Admin removes a mentee from their mentor directly (no request needed)
export const removeMenteeAllotment = async (req, res) => {
  try {
    const { menteeId, mentorId } = req.body;

    const mentee = await User.findOne({ _id: menteeId, role: "Mentee" });
    if (!mentee) {
      return res.status(404).json({ success: false, message: "Mentee not found." });
    }

    if (!mentee.mentor) {
      return res
        .status(400)
        .json({ success: false, message: "This mentee does not currently have an allotted mentor." });
    }

    const currentMentorId = mentorId || mentee.mentor;
    mentee.mentor = null;
    await mentee.save();
    await User.findByIdAndUpdate(currentMentorId, { $pull: { mentee: mentee._id } });

    // Settle pending removal requests for this mentee (allotment requests stay open)
    await AllotmentRequest.updateMany(
      { mentee: mentee._id, requestType: "Removal", status: "Pending" },
      { status: "Approved", resolvedBy: req.user._id, resolvedAt: new Date() }
    );

    return res.status(200).json({
      success: true,
      message: `Successfully removed mentorship allotment for ${mentee.firstname} ${mentee.lastname}.`,
      mentee,
    });
  } catch (error) {
    return sendServerError(res, error, "Failed to remove mentee allotment.");
  }
};
