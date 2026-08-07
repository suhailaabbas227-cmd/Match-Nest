import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Settings() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [msg, setMsg] = useState("");

  async function switchMode() {
    const next = user.mode === "marriage" ? "dating" : "marriage";
    if (!confirm(`Switch to ${next} mode? Your existing details carry over.`)) return;
    const { user: u } = await api.post("/profile/switch-mode");
    setUser(u);
    // Marriage mode needs extra fields — send them to the builder if missing.
    nav(u.mode === "marriage" ? "/build" : "/");
  }

  async function togglePrivacy(e) {
    const { user: u } = await api.put("/profile", {
      profile: user.profile, photoPrivacy: e.target.checked,
    });
    setUser(u);
    setMsg("Saved.");
  }

  return (
    <div className="container">
      <h1 className="section-title">Settings</h1>
      <p className="section-sub">Manage your account, mode and privacy.</p>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Account</h3>
        <div className="list-row"><b>Name</b><div className="spacer" />{user.fullName}</div>
        <div className="list-row"><b>Email</b><div className="spacer" />{user.email}</div>
        <div className="list-row"><b>Verified</b><div className="spacer" />{user.verified ? "✔ Yes" : "No"}</div>
        <div className="list-row" style={{ borderBottom: "none" }}>
          <b>Verification badge</b><div className="spacer" />{user.badge ? "✔ Granted" : "Not yet"}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Mode</h3>
        <p className="section-sub">
          You're in <b style={{ textTransform: "capitalize" }}>{user.mode}</b> mode.
          Switch any time — your profile data is kept.
        </p>
        <button className="btn sm" onClick={switchMode}>
          Switch to {user.mode === "marriage" ? "Halal Dating" : "Nikah / Marriage"} mode
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Privacy</h3>
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" style={{ width: 18 }}
            checked={!!user.photoPrivacy} onChange={togglePrivacy} />
          Blur my photos until I accept a match
        </label>
        {msg && <div className="success">{msg}</div>}
        <div style={{ marginTop: 16 }}>
          <button className="btn ghost sm" onClick={() => nav("/build")}>Edit my profile</button>
        </div>
      </div>
    </div>
  );
}
