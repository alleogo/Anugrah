import mongoose from "mongoose";

const allotmentRequestSchema = new mongoose.Schema(
  {
    mentee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    preferredMentors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    allottedMentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    requestType: {
      type: String,
      enum: ["Allotment", "Removal"],
      default: "Allotment",
    },
    isGeneralAllotment: {
      type: Boolean,
      default: false,
    },
    guidanceDomain: {
      type: String,
      default: "",
    },
    requestedByRole: {
      type: String,
      enum: ["Mentee", "Mentor"],
      default: "Mentee",
    },
    requestedByMentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const AllotmentRequest = mongoose.model("AllotmentRequest", allotmentRequestSchema);
export default AllotmentRequest;
