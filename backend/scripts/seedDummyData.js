// Create 50 dummy mentors and 50 dummy mentees, then drive real platform flows through the HTTP API:
// mentee preference requests, general requests, mentor offers, admin approvals / rejections,
// removals and chats. Every dummy account uses an @dummy.anugrah.test email.
//
// Needs the backend running (npm run dev) and the admin quick-login account.
// Usage: npm run seed:dummy            (remove with: npm run seed:cleanup)
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

const API = process.env.SEED_API_URL || "http://localhost:4004/api/v1";
const DOMAIN = "dummy.anugrah.test";
const PASSWORD = "dummy12345";
const ADMIN = { email: "rvipuleo@gmail.com", password: "12345" };

const FIRST = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Vihaan",
  "Arjun",
  "Sai",
  "Reyansh",
  "Krishna",
  "Ishaan",
  "Shaurya",
  "Ananya",
  "Diya",
  "Saanvi",
  "Aadhya",
  "Kiara",
  "Myra",
  "Anika",
  "Navya",
  "Ira",
  "Meera",
  "Rohan",
  "Kabir",
  "Dev",
  "Aryan",
  "Nikhil",
  "Pranav",
  "Rahul",
  "Siddharth",
  "Varun",
  "Yash",
  "Priya",
  "Sneha",
  "Pooja",
  "Riya",
  "Tanvi",
  "Neha",
  "Kavya",
  "Isha",
  "Aditi",
  "Nandini",
  "Harsh",
  "Karthik",
  "Manav",
  "Om",
  "Parth",
  "Ritvik",
  "Samar",
  "Tejas",
  "Uday",
  "Zoya",
];
const LAST = [
  "Sharma",
  "Verma",
  "Iyer",
  "Reddy",
  "Nair",
  "Gupta",
  "Mehta",
  "Kulkarni",
  "Banerjee",
  "Chopra",
  "Joshi",
  "Pillai",
  "Rao",
  "Desai",
  "Malhotra",
  "Bose",
  "Kapoor",
  "Menon",
  "Saxena",
  "Agarwal",
];
const COMPANIES = [
  "Google",
  "Microsoft",
  "Amazon",
  "Flipkart",
  "Razorpay",
  "Zerodha",
  "Swiggy",
  "Infosys",
  "Atlassian",
  "Adobe",
  "Freshworks",
  "PhonePe",
  "CRED",
  "Zomato",
  "Meesho",
  "Postman",
  "BrowserStack",
  "Uber",
  "Salesforce",
  "Intuit",
];
const COLLEGES = [
  "IIT Bombay",
  "NIT Trichy",
  "BITS Pilani",
  "Delhi Technological University",
  "IIIT Hyderabad",
  "VIT Vellore",
  "Manipal Institute of Technology",
  "NSUT Delhi",
  "Jadavpur University",
  "Anna University",
];
const DOMAINS = {
  "Backend & Distributed Systems": ["Go", "Kafka", "PostgreSQL", "System Design"],
  "Frontend Development": ["React", "TypeScript", "CSS", "Accessibility"],
  "AI, Machine Learning & Data Science": ["Python", "PyTorch", "MLOps", "Statistics"],
  "Cloud, DevOps & Infrastructure": ["AWS", "Kubernetes", "Terraform", "CI/CD"],
  "Product Management": ["Roadmapping", "User Research", "Analytics", "Prioritisation"],
  "Mobile Application Development": ["Kotlin", "Swift", "Flutter", "React Native"],
  "Cybersecurity & Network Security": ["AppSec", "Threat Modelling", "Cryptography", "SOC"],
};
const DOMAIN_NAMES = Object.keys(DOMAINS);

const pick = (list, i) => list[i % list.length];
const phone = (n) => `+91 9${String(810000000 + n * 7919).slice(0, 4)} ${String(100000 + n * 37).slice(1)}`;

// ── HTTP helpers ─────────────────────────────────────────────
const issues = []; // anything unexpected found while seeding
const note = (msg) => {
  issues.push(msg);
  console.log("  ! " + msg);
};

async function call(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function login(email, password = PASSWORD) {
  const res = await call(null, "POST", "/auth/login", { email, password });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.data.message}`);
  return res.data.token;
}

// Call that must succeed; records an issue if it doesn't
async function must(token, method, path, body, label) {
  const res = await call(token, method, path, body);
  if (!res.ok) note(`${label} failed (${res.status}): ${res.data.message}`);
  return res;
}

// ── 1. Accounts ─────────────────────────────────────────────
await connectDB();
if (await User.exists({ email: new RegExp(`@${DOMAIN.replace(/\./g, "\\.")}$`) })) {
  console.log("Dummy data already exists. Run `npm run seed:cleanup` first.");
  await mongoose.disconnect();
  process.exit(1);
}

const hash = await bcrypt.hash(PASSWORD, 10);
const makeUser = (role, i) => {
  const firstname = pick(FIRST, role === "Mentor" ? i : i + 25);
  const lastname = pick(LAST, role === "Mentor" ? i * 3 : i * 7 + 1);
  const domain = pick(DOMAIN_NAMES, i);
  const verified = i < 45; // the last 5 of each role stay unverified
  return {
    firstname,
    lastname,
    email: `${firstname}.${lastname}.${role === "Mentor" ? "mr" : "me"}${i}@${DOMAIN}`.toLowerCase(),
    password: hash,
    role,
    mobileNumber: phone(role === "Mentor" ? i : i + 100),
    organization: role === "Mentor" ? pick(COMPANIES, i) : pick(COLLEGES, i),
    domain,
    skills: DOMAINS[domain].slice(0, 2 + (i % 3)),
    experienceYears: role === "Mentor" ? 2 + ((i * 3) % 14) : 0,
    bio:
      role === "Mentor"
        ? `${domain} at ${pick(COMPANIES, i)}. Happy to help with interviews, projects and career choices.`
        : `Student at ${pick(COLLEGES, i)} interested in ${domain.toLowerCase()}.`,
    isApproved: verified,
    profileSubmitted: true,
    verificationRequested: !verified,
    verificationRequestedAt: verified ? null : new Date(),
  };
};

const mentors = await User.insertMany(Array.from({ length: 50 }, (_, i) => makeUser("Mentor", i)));
const mentees = await User.insertMany(Array.from({ length: 50 }, (_, i) => makeUser("Mentee", i)));
console.log(`Created ${mentors.length} mentors and ${mentees.length} mentees (password: ${PASSWORD})`);
await mongoose.disconnect();

// ── 2. Flows through the API ────────────────────────────────
const adminToken = await login(ADMIN.email, ADMIN.password);
const tokens = new Map();
const tokenFor = async (user) => {
  if (!tokens.has(user.email)) tokens.set(user.email, await login(user.email));
  return tokens.get(user.email);
};
const id = (doc) => String(doc._id);

// Approve a request and allot the given mentor
const approve = (requestId, mentorId, label) =>
  must(
    adminToken,
    "PUT",
    `/admin/requests/${requestId}/resolve`,
    { action: "accept", allottedMentorId: mentorId },
    label
  );

// Different numbers of mentees per mentor: 6, 5, 4, 3, 3, 2, 2, 2, 1 x5 (32 mentees in total)
const quotas = [6, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1];
let menteeIndex = 0;
console.log("Allotting mentees through the three request types...");
for (const [mentorIndex, quota] of quotas.entries()) {
  const mentor = mentors[mentorIndex];
  for (let k = 0; k < quota; k++, menteeIndex++) {
    const mentee = mentees[menteeIndex];
    const flow = menteeIndex % 3;

    if (flow === 0) {
      // Mentee ranks three mentors; the admin allots this mentor (not always their first choice)
      const prefs = [mentor, mentors[(mentorIndex + 7) % 45], mentors[(mentorIndex + 13) % 45]].map(id);
      if (menteeIndex % 2) prefs.reverse();
      const res = await must(
        await tokenFor(mentee),
        "POST",
        "/mentee/request-mentor",
        { preferredMentorIds: prefs },
        `preference request #${menteeIndex}`
      );
      if (res.ok) await approve(res.data.request._id, id(mentor), `approve preference #${menteeIndex}`);
    } else if (flow === 1) {
      // Mentee asks the admin to pick
      const res = await must(
        await tokenFor(mentee),
        "POST",
        "/mentee/request-general-allotment",
        { guidanceDomain: mentee.domain, notes: "Looking for help with internships and projects." },
        `general request #${menteeIndex}`
      );
      if (res.ok) await approve(res.data.request._id, id(mentor), `approve general #${menteeIndex}`);
    } else {
      // Mentor offers to mentor the student
      const res = await must(
        await tokenFor(mentor),
        "POST",
        "/mentor/select-mentee",
        { menteeId: id(mentee) },
        `mentor offer #${menteeIndex}`
      );
      if (res.ok) await approve(res.data.request._id, id(mentor), `approve offer #${menteeIndex}`);
    }
  }
}

console.log("Creating pending requests...");
// Mentees 32-37: pending preference requests
for (let i = 32; i <= 37; i++) {
  await must(
    await tokenFor(mentees[i]),
    "POST",
    "/mentee/request-mentor",
    { preferredMentorIds: [id(mentors[i % 45]), id(mentors[(i + 3) % 45])] },
    `pending preference #${i}`
  );
}
// Mentees 38-40: pending general requests
for (let i = 38; i <= 40; i++) {
  await must(
    await tokenFor(mentees[i]),
    "POST",
    "/mentee/request-general-allotment",
    { guidanceDomain: mentees[i].domain, notes: "Preparing for placements." },
    `pending general #${i}`
  );
}
// Mentees 41-42: competing requests (two mentor offers plus the mentee's own preference)
for (let i = 41; i <= 42; i++) {
  await must(
    await tokenFor(mentors[20]),
    "POST",
    "/mentor/select-mentee",
    { menteeId: id(mentees[i]) },
    `offer A #${i}`
  );
  await must(
    await tokenFor(mentors[21]),
    "POST",
    "/mentor/select-mentee",
    { menteeId: id(mentees[i]) },
    `offer B #${i}`
  );
  await must(
    await tokenFor(mentees[i]),
    "POST",
    "/mentee/request-mentor",
    { preferredMentorIds: [id(mentors[22])] },
    `own preference #${i}`
  );
}
// Mentee 43: request rejected by the admin
{
  const res = await must(
    await tokenFor(mentees[43]),
    "POST",
    "/mentee/request-general-allotment",
    { guidanceDomain: "" },
    "request to reject"
  );
  if (res.ok)
    await must(
      adminToken,
      "PUT",
      `/admin/requests/${res.data.request._id}/resolve`,
      { action: "reject" },
      "reject request"
    );
}
// Mentee 44: nothing. Unverified mentees 45-46 send requests anyway
for (let i = 45; i <= 46; i++) {
  await call(await tokenFor(mentees[i]), "POST", "/mentee/request-mentor", { preferredMentorIds: [id(mentors[1])] });
}

console.log("Removals...");
// Mentor 0 asks to drop one mentee (left pending); mentor 1's removal is approved
await must(
  await tokenFor(mentors[0]),
  "POST",
  "/mentor/request-removal",
  { menteeId: id(mentees[0]), reason: "Schedules no longer match." },
  "pending removal"
);
{
  const res = await must(
    await tokenFor(mentors[1]),
    "POST",
    "/mentor/request-removal",
    { menteeId: id(mentees[6]) },
    "removal to approve"
  );
  if (res.ok)
    await must(
      adminToken,
      "PUT",
      `/admin/requests/${res.data.request._id}/resolve`,
      { action: "accept" },
      "approve removal"
    );
}
// Admin removes one allotment directly
await must(adminToken, "POST", "/admin/remove-allotment", { menteeId: id(mentees[7]) }, "direct removal");

console.log("Chats...");
for (let i = 0; i < 8; i++) {
  const mentee = mentees[i + 10];
  const mentorOfMentee =
    mentors[quotas.findIndex((_, m) => quotas.slice(0, m + 1).reduce((a, b) => a + b, 0) > i + 10)];
  await must(
    await tokenFor(mentee),
    "POST",
    "/communication/send",
    { receiverId: id(mentorOfMentee), message: `Hi! Could we schedule our first session this week? (${i + 1})` },
    `chat mentee→mentor ${i}`
  );
  await must(
    await tokenFor(mentorOfMentee),
    "POST",
    "/communication/send",
    { receiverId: id(mentee), message: "Sure, does Thursday 6 pm work?" },
    `chat mentor→mentee ${i}`
  );
}

console.log(`\nDone. ${issues.length} unexpected failures during seeding.`);
if (issues.length) console.log(issues.map((m) => " - " + m).join("\n"));
