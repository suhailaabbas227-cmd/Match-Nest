// Phase 5 — Report, block, and a basic admin panel.
import express from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { selfView } from "../shape.js";

const router = express.Router();

// --- Block a user (hides them both ways) ---
router.post("/block/:id", requireAuth, (req, res) => {
  const users = db.users();
  const me = users.findOne((u) => u.id === req.user.id);
  const blocked = new Set(me.blockedUsers || []);
  blocked.add(req.params.id);
  users.update(me.id, { blockedUsers: [...blocked] });
  res.json({ blocked: [...blocked] });
});

router.post("/unblock/:id", requireAuth, (req, res) => {
  const users = db.users();
  const me = users.findOne((u) => u.id === req.user.id);
  const blocked = (me.blockedUsers || []).filter((id) => id !== req.params.id);
  users.update(me.id, { blockedUsers: blocked });
  res.json({ blocked });
});

// --- Report a user ---
router.post("/report/:id", requireAuth, (req, res) => {
  const { reason } = req.body || {};
  const target = db.users().findOne((u) => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });
  const report = db.reports().insert({
    id: uuid(),
    reportedUser: req.params.id,
    reportedBy: req.user.id,
    reason: reason || "Not specified",
    status: "open",
    createdAt: Date.now(),
  });
  res.status(201).json({ message: "Report submitted. Our team will review it.", report });
});

// ---------------- Admin panel ----------------
router.get("/admin/reports", requireAuth, requireAdmin, (req, res) => {
  const reports = db.reports().all().map((r) => ({
    ...r,
    reportedUser: selfView(db.users().findOne((u) => u.id === r.reportedUser)),
    reportedBy: selfView(db.users().findOne((u) => u.id === r.reportedBy)),
  }));
  res.json({ reports });
});

router.get("/admin/users", requireAuth, requireAdmin, (req, res) => {
  res.json({ users: db.users().all().map(selfView) });
});

// Grant / revoke the verification badge.
router.post("/admin/badge/:id", requireAuth, requireAdmin, (req, res) => {
  const { value = true } = req.body || {};
  const u = db.users().update(req.params.id, { badge: !!value });
  if (!u) return res.status(404).json({ error: "User not found" });
  res.json({ user: selfView(u) });
});

// Suspend (soft) a flagged account.
router.post("/admin/suspend/:id", requireAuth, requireAdmin, (req, res) => {
  const u = db.users().update(req.params.id, { suspended: true });
  if (!u) return res.status(404).json({ error: "User not found" });
  res.json({ user: selfView(u) });
});

router.post("/admin/resolve/:reportId", requireAuth, requireAdmin, (req, res) => {
  const r = db.reports().update(req.params.reportId, { status: "resolved" });
  if (!r) return res.status(404).json({ error: "Report not found" });
  res.json({ report: r });
});

export default router;
