import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

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
