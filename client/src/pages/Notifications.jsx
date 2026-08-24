import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

function timeAgo(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Notifications() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { notifications } = await api.get("/notifications");
      setItems(notifications);
      setError("");
    } catch (e) {
      setError(e.message || "Notifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markAllRead() {
    await api.post("/notifications/read", {});
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
  }

  async function open(item) {
    if (!item.read_at) {
      await api.post("/notifications/read", { ids: [item.id] });
    }
    if (item.identity_locked) nav("/plans");
    else if (item.kind === "message" && item.actor_id) nav(`/chat/${item.actor_id}`);
    else if (item.kind === "strong_match" && item.actor_id) nav(`/profile/${item.actor_id}`);
    else nav("/matches");
  }

  return (
    <div className="container notifications-page">
      <div className="notifications-heading">
        <div>
          <h1 className="section-title">Notifications</h1>
          <p className="section-sub">Connections, messages and strong profile matches.</p>
        </div>
        {items.some((item) => !item.read_at) && (
          <button className="btn ghost sm" onClick={markAllRead}>Mark all as read</button>
        )}
      </div>

      <div className="card notification-list">
        {loading ? (
          <div className="empty">Loading notifications...</div>
        ) : error ? (
          <div className="empty">{error}</div>
        ) : items.length === 0 ? (
          <div className="empty">No notifications yet.</div>
        ) : items.map((item) => (
          <button
            type="button"
            className={`notification-item ${!item.read_at ? "unread" : ""} ${item.identity_locked ? "identity-locked" : ""}`}
            key={item.id}
            onClick={() => open(item)}
          >
            <span className="notification-icon" aria-hidden="true">
              {item.kind === "message" ? "M" : item.kind === "strong_match" ? "%" : "♥"}
            </span>
            <span className="notification-copy">
              <strong>{item.actor_name ? `${item.actor_name}: ` : ""}{item.title}</strong>
              <span>{item.body}</span>
              <small>{timeAgo(item.created_at)}</small>
            </span>
            {item.identity_locked && <span className="notification-lock">Premium</span>}
          </button>
        ))}
      </div>

      <p className="notification-email-note">
        Email alerts will use the same privacy rules after The Match Nest's verified email provider is connected.
      </p>
    </div>
  );
}
