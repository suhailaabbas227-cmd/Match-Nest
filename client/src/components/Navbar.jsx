import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => api.get("/notifications").then(({ notifications }) => {
      if (active) setUnread(notifications.filter((item) => !item.read_at).length);
    }).catch(() => {});
    load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <nav className="nav">
      <div className="brand matchnest-brand">
        <img src="/assets/matchnest-logo.png" alt="" aria-hidden="true" />
        <span>Match<strong>Nest</strong></span>
      </div>
      {user?.mode && <span className="mode-pill">{user.mode} mode</span>}
      <div className="links">
        <NavLink to="/" end>Browse</NavLink>
        <NavLink to="/matches">Matches</NavLink>
        <NavLink to="/chat">Chat</NavLink>
        <NavLink to="/notifications" className="notification-nav-link">
          Alerts {unread > 0 && <span className="notification-count">{unread > 9 ? "9+" : unread}</span>}
        </NavLink>
        <NavLink to="/plans">Membership</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        {user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
        <button className="btn ghost sm" onClick={() => { logout(); nav("/login"); }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
