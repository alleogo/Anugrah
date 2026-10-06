// Small helpers shared by the controllers.

// User fields to include when populating related users.
export const CONTACT_FIELDS = "firstname lastname email mobileNumber organization";
export const PROFILE_FIELDS = "firstname lastname email mobileNumber organization bio avatar";
// Same without the phone number, for anyone not allowed to see it
export const PUBLIC_FIELDS = "firstname lastname email organization bio avatar";

// Send an error response. Bad ids and invalid data are the caller's fault (400); anything else is a 500.
export const sendServerError = (res, error, message = error.message) => {
  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid id." });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: "Invalid data." });
  }
  console.error(error);
  return res.status(500).json({ success: false, message });
};

// A user is verified when an Admin has approved them. Admins always count as verified.
export const isVerified = (user) => Boolean(user?.isApproved || user?.role === "Admin");

// Basic email format check: something@domain.extension, no spaces
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim());

// Indian mobile number: exactly 10 digits, optionally written with +91 / 0 in front and spaces or dashes.
// Returns it as "+91 98765 43210", or null when it isn't valid.
export const normalizeMobile = (value) => {
  let digits = String(value || "").replace(/[\s-]/g, "");
  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^\d{10}$/.test(digits)) return null;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};

export const INVALID_MOBILE_MESSAGE = "Enter a valid 10-digit mobile number.";
export const INVALID_EMAIL_MESSAGE = "Enter a valid email address.";

// Mentee profile options (the frontend shows the same lists)
export const COLLEGE_YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year"];
export const INTEREST_LEVELS = ["Beginner", "Basic", "Intermediate", "Advanced", "Expert"];

// A mentee can request a mentor once their year and leveled interests are filled in
export const isMenteeProfileComplete = (user) =>
  COLLEGE_YEARS.includes(user.collegeYear) && Array.isArray(user.interestLevels) && user.interestLevels.length > 0;
