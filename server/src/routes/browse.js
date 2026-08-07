// Phase 3 — Browsing with filters, connection requests, mutual matching.
import express from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { publicView } from "../shape.js";

const router = express.Router();

function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

// Are these two users matched (mutual accepted connection)?
function isMatched(a, b) {
  return db.connections().findOne(
    (c) =>
      c.status === "accepted" &&
      ((c.from === a && c.to === b) || (c.from === b && c.to === a))
  );
}

// --- Browse profiles (same mode, opposite/any, with filters) ---
router.get("/", requireAuth, (req, res) => {
  const me = db.users().findOne((u) => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: "User not found" });

  const { city, sect, religiosity, minAge, maxAge, gender, q } = req.query;

  const candidates = db.users().find((u) => {
    if (u.id === me.id) return false;
    if (u.role === "admin" || u.suspended) return false;
    if (!u.verified || !u.profileComplete) return false;
    if (u.mode !== me.mode) return false; // browse within the same mode
    if ((me.blockedUsers || []).includes(u.id)) return false;
    if ((u.blockedUsers || []).includes(me.id)) return false;

    const p = u.profile || {};
    if (city && !`${u.city} ${p.city || ""}`.toLowerCase().includes(city.toLowerCase()))
      return false;
    if (sect && (p.sect || "").toLowerCase() !== sect.toLowerCase()) return false;
    if (religiosity && (p.religiosity || "").toLowerCase() !== religiosity.toLowerCase())
      return false;
    if (gender && (u.gender || "").toLowerCase() !== gender.toLowerCase()) return false;

    const age = ageFromDob(u.dateOfBirth) ?? Number(p.age) ?? null;
    if (minAge && age != null && age < Number(minAge)) return false;
    if (maxAge && age != null && age > Number(maxAge)) return false;

    if (q) {
      const hay = `${u.fullName} ${p.displayName || ""} ${p.aboutMe || ""} ${p.occupation || ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const result = candidates.map((u) => {
    const matched = !!isMatched(me.id, u.id);
    return { ...publicView(u, { matched }), age: ageFromDob(u.dateOfBirth) };
  });
  res.json({ profiles: result });
});

// --- View a single profile ---
router.get("/:id", requireAuth, (req, res) => {
  const me = req.user.id;
  const u = db.users().findOne((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: "Profile not found" });
  const matched = !!isMatched(me, u.id);
  res.json({ profile: { ...publicView(u, { matched }), age: ageFromDob(u.dateOfBirth) } });
});

// --- Send a connection request ---
router.post("/connect/:id", requireAuth, (req, res) => {
  const from = req.user.id;
  const to = req.params.id;
  if (from === to) return res.status(400).json({ error: "Cannot connect to yourself" });

  const conns = db.connections();
  const existing = conns.findOne(
    (c) =>
      (c.from === from && c.to === to) || (c.from === to && c.to === from)
  );

  // If they already requested us, accept => match.
  if (existing) {
    if (existing.status === "accepted")
      return res.json({ status: "accepted", connection: existing });
    if (existing.from === to && existing.status === "pending") {
      conns.update(existing.id, { status: "accepted", acceptedAt: Date.now() });
      return res.json({ status: "accepted", matched: true, connection: existing });
    }
    return res.json({ status: existing.status, connection: existing });
  }

  const conn = conns.insert({
    id: uuid(),
    from,
    to,
    status: "pending",
    createdAt: Date.now(),
  });
  res.status(201).json({ status: "pending", connection: conn });
});

// --- Accept / decline an incoming request ---
router.post("/respond/:connId", requireAuth, (req, res) => {
  const { action } = req.body || {}; // 'accept' | 'decline'
  const conns = db.connections();
  const conn = conns.findOne((c) => c.id === req.params.connId);
  if (!conn) return res.status(404).json({ error: "Request not found" });
  if (conn.to !== req.user.id)
    return res.status(403).json({ error: "Not your request to answer" });

  if (action === "accept") {
    conns.update(conn.id, { status: "accepted", acceptedAt: Date.now() });
    return res.json({ status: "accepted", matched: true });
  }
  conns.update(conn.id, { status: "declined" });
  res.json({ status: "declined" });
});

// --- Incoming requests + my matches ---
router.get("/me/requests", requireAuth, (req, res) => {
  const me = req.user.id;
  const conns = db.connections();
  const incoming = conns
    .find((c) => c.to === me && c.status === "pending")
    .map((c) => {
      const u = db.users().findOne((x) => x.id === c.from);
      return { connId: c.id, user: publicView(u, { matched: false }) };
    });
  res.json({ requests: incoming });
});

router.get("/me/matches", requireAuth, (req, res) => {
  const me = req.user.id;
  const conns = db.connections();
  const matches = conns
    .find((c) => c.status === "accepted" && (c.from === me || c.to === me))
    .map((c) => {
      const otherId = c.from === me ? c.to : c.from;
      const u = db.users().findOne((x) => x.id === otherId);
      return { connId: c.id, user: publicView(u, { matched: true }) };
    });
  res.json({ matches });
});

export default router;
