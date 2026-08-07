// Phase 4 — Conversations & messages (REST side; realtime via Socket.io).
import express from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { publicView } from "../shape.js";

const router = express.Router();

function matchedConn(a, b) {
  return db.connections().findOne(
    (c) =>
      c.status === "accepted" &&
      ((c.from === a && c.to === b) || (c.from === b && c.to === a))
  );
}

// Get (or lazily create) the conversation between me and another matched user.
function getOrCreateConversation(meId, otherId) {
  const convos = db.conversations();
  let convo = convos.findOne(
    (c) => c.participants.includes(meId) && c.participants.includes(otherId)
  );
  if (!convo) {
    convo = convos.insert({
      id: uuid(),
      participants: [meId, otherId],
      chaperones: [],
      createdAt: Date.now(),
    });
  }
  return convo;
}

// --- List my conversations ---
router.get("/conversations", requireAuth, (req, res) => {
  const me = req.user.id;
  const convos = db
    .conversations()
    .find((c) => c.participants.includes(me) || c.chaperones?.includes(me));
  const out = convos.map((c) => {
    const otherId = c.participants.find((p) => p !== me) || c.participants[0];
    const other = db.users().findOne((u) => u.id === otherId);
    const last = db
      .messages()
      .find((m) => m.conversationId === c.id)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    return {
      id: c.id,
      user: publicView(other, { matched: true }),
      lastMessage: last?.text || null,
      lastAt: last?.createdAt || c.createdAt,
      chaperones: c.chaperones || [],
    };
  });
  res.json({ conversations: out.sort((a, b) => b.lastAt - a.lastAt) });
});

// --- Open conversation with a matched user ---
router.get("/with/:userId", requireAuth, (req, res) => {
  const me = req.user.id;
  const other = req.params.userId;
  if (!matchedConn(me, other))
    return res.status(403).json({ error: "You can only chat with matched users" });
  const convo = getOrCreateConversation(me, other);
  const messages = db
    .messages()
    .find((m) => m.conversationId === convo.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  res.json({ conversation: convo, messages });
});

// --- Send a message (also broadcast via socket from index.js) ---
router.post("/:conversationId/message", requireAuth, (req, res) => {
  const { text } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: "Empty message" });
  const convo = db.conversations().findOne((c) => c.id === req.params.conversationId);
  if (!convo) return res.status(404).json({ error: "Conversation not found" });
  const allowed = [...convo.participants, ...(convo.chaperones || [])];
  if (!allowed.includes(req.user.id))
    return res.status(403).json({ error: "Not part of this conversation" });

  const sender = db.users().findOne((u) => u.id === req.user.id);
  const msg = db.messages().insert({
    id: uuid(),
    conversationId: convo.id,
    from: req.user.id,
    fromName: sender?.profile?.displayName || sender?.fullName || "User",
    isChaperone: (convo.chaperones || []).includes(req.user.id),
    text: text.trim(),
    createdAt: Date.now(),
  });

  // Broadcast to the room (io attached on app in index.js).
  req.app.get("io")?.to(convo.id).emit("message", msg);
  res.status(201).json({ message: msg });
});

// --- Chaperone: add a family member (marriage mode) to a conversation ---
router.post("/:conversationId/chaperone", requireAuth, (req, res) => {
  const { email } = req.body || {};
  const convo = db.conversations().findOne((c) => c.id === req.params.conversationId);
  if (!convo) return res.status(404).json({ error: "Conversation not found" });
  if (!convo.participants.includes(req.user.id))
    return res.status(403).json({ error: "Only participants can add a chaperone" });

  const chaperone = db.users().findOne((u) => u.email?.toLowerCase() === email?.toLowerCase());
  if (!chaperone)
    return res.status(404).json({ error: "No MatchNest account with that email" });
  if (convo.chaperones?.includes(chaperone.id))
    return res.json({ message: "Already a chaperone", conversation: convo });

  const chaperones = [...(convo.chaperones || []), chaperone.id];
  db.conversations().update(convo.id, { chaperones });
  res.json({ message: "Chaperone added", conversation: { ...convo, chaperones } });
});

export default router;
