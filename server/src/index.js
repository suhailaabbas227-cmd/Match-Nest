// MatchNest API server — Express + Socket.io.
import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import browseRoutes from "./routes/browse.js";
import chatRoutes from "./routes/chat.js";
import safetyRoutes from "./routes/safety.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Serve uploaded photos.
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "MatchNest" }));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/browse", browseRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/safety", safetyRoutes);

// --- Realtime chat rooms ---
io.on("connection", (socket) => {
  socket.on("join", (conversationId) => socket.join(conversationId));
  socket.on("leave", (conversationId) => socket.leave(conversationId));
  socket.on("typing", ({ conversationId, name }) =>
    socket.to(conversationId).emit("typing", { name })
  );
});

server.listen(PORT, () =>
  console.log(`MatchNest API running on http://localhost:${PORT}`)
);
