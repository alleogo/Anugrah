// Move avatars stored as data URIs in MongoDB to Cloudinary and save the Cloudinary URL instead.
// Usage: npm run migrate:avatars            (migrate)
//        npm run migrate:avatars -- --dry-run (only list what would be migrated)
import "dotenv/config";
import { connectDB } from "../config/db.js";
import { uploadAvatar } from "../config/cloudinary.js";
import User from "../models/User.js";
import mongoose from "mongoose";

const dryRun = process.argv.includes("--dry-run");

await connectDB();

const users = await User.find({ avatar: /^data:/ }).select("firstname lastname email avatar");
console.log(`${users.length} avatar(s) stored in the database${dryRun ? " (dry run)" : ""}`);

let failed = 0;
for (const user of users) {
  const label = `${user.firstname} ${user.lastname} <${user.email}>`;
  if (dryRun) {
    console.log(`  would migrate: ${label}`);
    continue;
  }
  try {
    const url = await uploadAvatar(user.avatar, user._id);
    await User.updateOne({ _id: user._id }, { avatar: url });
    console.log(`  migrated: ${label} -> ${url}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAILED: ${label}: ${error.message}`);
  }
}

await mongoose.disconnect();
process.exit(failed ? 1 : 0);
