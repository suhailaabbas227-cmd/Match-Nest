// Phase 1 — Account registration, OTP verification, login.
import express from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { signToken, requireAuth } from "../auth.js";
import { selfView } from "../shape.js";

const router = express.Router();

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// --- Step 1: Create account (name, email/phone, password, DOB, gender, location) ---
router.post("/signup", async (req, res) => {
  const {
    fullName, email, phone, password,
    dateOfBirth, gender, country, city, mode,
  } = req.body || {};

  if (!fullName || !email || !password)
    return res.status(400).json({ error: "Name, email and password are required" });

  const users = db.users();
  if (users.findOne((u) => u.email?.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ error: "An account with this email already exists" });

  const otp = genOtp();
  const user = {
    id: uuid(),
    role: "user",
    fullName,
    email,
    phone: phone || "",
    password: await bcrypt.hash(password, 10),
    dateOfBirth: dateOfBirth || "",
    gender: gender || "",
    country: country || "",
    city: city || "",
    profilePhoto: null,
    photos: [],
    verified: false,        // email/OTP verified
    badge: false,           // profile verification badge (admin granted)
    mode: mode === "dating" || mode === "marriage" ? mode : null, // chosen at signup or later
    profileComplete: false,
    profile: {},            // mode-specific fields
    photoPrivacy: false,    // blur photos until matched (marriage mode)
    blockedUsers: [],
    otp,
    otpExpires: Date.now() + 10 * 60 * 1000, // 10 min
    createdAt: Date.now(),
  };
  users.insert(user);

  // In production this is emailed/SMS'd. For the demo we return it so the
  // flow is testable end-to-end without a mail provider.
  console.log(`[OTP] ${email} -> ${otp}`);
  res.status(201).json({
    message: "Account created. Verify the code we sent you.",
    userId: user.id,
    devOtp: otp,
  });
});

// --- Step 1b: Verify the OTP code ---
router.post("/verify", (req, res) => {
  const { userId, code } = req.body || {};
  const users = db.users();
  const user = users.findOne((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.verified) return res.json({ message: "Already verified" });
  if (!user.otp || user.otpExpires < Date.now())
    return res.status(400).json({ error: "Code expired — request a new one" });
  if (String(code) !== String(user.otp))
    return res.status(400).json({ error: "Incorrect code" });

  users.update(user.id, { verified: true, otp: null, otpExpires: null });
  const token = signToken(user);
  res.json({ message: "Verified", token, user: selfView({ ...user, verified: true }) });
});

router.post("/resend", (req, res) => {
  const { userId } = req.body || {};
  const users = db.users();
  const user = users.findOne((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  const otp = genOtp();
  users.update(user.id, { otp, otpExpires: Date.now() + 10 * 60 * 1000 });
  console.log(`[OTP] resend ${user.email} -> ${otp}`);
  res.json({ message: "Code resent", devOtp: otp });
});

// --- Login ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const users = db.users();
  const user = users.findOne((u) => u.email?.toLowerCase() === email?.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await bcrypt.compare(password || "", user.password);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  if (!user.verified) {
    const otp = genOtp();
    users.update(user.id, { otp, otpExpires: Date.now() + 10 * 60 * 1000 });
    return res.status(403).json({
      error: "Account not verified",
      needsVerification: true,
      userId: user.id,
      devOtp: otp,
    });
  }

  const token = signToken(user);
  res.json({ token, user: selfView(user) });
});

// --- Current user ---
router.get("/me", requireAuth, (req, res) => {
  const user = db.users().findOne((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: selfView(user) });
});

export default router;
