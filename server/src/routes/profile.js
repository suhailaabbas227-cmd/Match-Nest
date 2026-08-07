// Phase 1/2 — Mode selection, profile builder, mode switching, photo upload.
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { selfView } from "../shape.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) =>
    cb(null, `${uuid()}${path.extname(file.originalname) || ".jpg"}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();

// --- Step 2: Pick a mode (dating | marriage) ---
router.post("/mode", requireAuth, (req, res) => {
  const { mode } = req.body || {};
  if (!["dating", "marriage"].includes(mode))
    return res.status(400).json({ error: "Mode must be 'dating' or 'marriage'" });

  const users = db.users();
  const user = users.findOne((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const patch = { mode };
  // Marriage mode defaults to photo privacy (blur until matched).
  if (mode === "marriage" && user.photoPrivacy === undefined) patch.photoPrivacy = true;
  users.update(user.id, patch);
  res.json({ user: selfView({ ...user, ...patch }) });
});

// --- Step 3: Save profile fields (mode-specific, merged) ---
router.put("/", requireAuth, (req, res) => {
  const { profile = {}, photoPrivacy } = req.body || {};
  const users = db.users();
  const user = users.findOne((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const merged = { ...user.profile, ...profile };
  const patch = { profile: merged, profileComplete: true };
  if (typeof photoPrivacy === "boolean") patch.photoPrivacy = photoPrivacy;
  users.update(user.id, patch);
  res.json({ user: selfView({ ...user, ...patch }) });
});

// --- Switch mode any time (existing data carries over) ---
router.post("/switch-mode", requireAuth, (req, res) => {
  const users = db.users();
  const user = users.findOne((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const next = user.mode === "marriage" ? "dating" : "marriage";
  const patch = { mode: next };
  if (next === "marriage") patch.photoPrivacy = user.photoPrivacy ?? true;
  users.update(user.id, patch);
  res.json({ user: selfView({ ...user, ...patch }), mode: next });
});

// --- Upload a profile photo or gallery photo ---
router.post("/photo", requireAuth, upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/uploads/${req.file.filename}`;
  const users = db.users();
  const user = users.findOne((u) => u.id === req.user.id);
  const asMain = req.query.main === "true";

  const photos = user.photos || [];
  const patch = {};
  if (asMain || !user.profilePhoto) patch.profilePhoto = url;
  if (!asMain) patch.photos = [...photos, url].slice(0, 5); // up to 5
  users.update(user.id, patch);
  res.json({ url, user: selfView({ ...user, ...patch }) });
});

export default router;
