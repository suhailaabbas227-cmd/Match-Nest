import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import "./Onboarding.css";

function Brand() {
  return (
    <div className="ob-logo">
      <svg viewBox="0 0 46 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 7.5C9.5 7.5 6 11 6 15.3c0 6.4 8.8 12 12 14.4 3.2-2.1 12-8 12-14.4C30 11 26.5 7.5 22 7.5c-2.6 0-4.7 1.3-6 3.3-1.3-2-3.4-3.3-2-3.3Z" fill="#ec1e79"/>
        <path d="M24 11.5c-2.6 0-4.7 1.3-6 3.3 1.3 2 6 6.2 8 8.4 2.2-2.1 8-6.4 8-11.4 0-4.3-3.5-7.8-8-7.8-1 0-1.9.2-2.7.5 1.7 1.2 2.9 3.1 3.4 5.3" stroke="#8b3df0" strokeWidth="2.2" fill="none" strokeLinejoin="round"/>
      </svg>
      <span><span className="pink">Match</span>Nest</span>
    </div>
  );
}

export default function ModeSelect() {
  const nav = useNavigate();
  const { setUser, logout } = useAuth();
  const [busy, setBusy] = useState("");

  async function pick(mode) {
    setBusy(mode);
    const { user } = await api.post("/profile/mode", { mode });
    setUser(user);
    nav("/build");
  }

  return (
    <div className="ob">
      <header className="ob-top">
        <Brand />
        <button className="ob-logout" onClick={logout}>Log out</button>
      </header>

      <div className="ob-wrap">
        <div className="ob-head">
          <h1>What are you here for?</h1>
          <p>Choose your path. You can switch any time — your details carry over.</p>
        </div>

        <div className="ob-modes">
          <div className="ob-mode dating" onClick={() => !busy && pick("dating")}>
            <div className="ic">
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
                <path fill="#fff" d="M12 21.3l-1.5-1.4C5 14.9 2 12.2 2 8.8 2 6.1 4.1 4 6.8 4c1.5 0 3 .7 3.9 1.9l1.3 1.6 1.3-1.6C16.2 4.7 17.7 4 19.2 4 21.9 4 24 6.1 24 8.8c0 3.4-3 6.1-8.5 11.1L12 21.3z"/>
              </svg>
            </div>
            <h3>Dating</h3>
            <p>Get to know someone before anything serious. A short, personality-focused
              profile and genuine connection.</p>
            <span className="pick">{busy === "dating" ? "Setting up…" : "Choose Dating"}</span>
          </div>

          <div className="ob-mode marriage" onClick={() => !busy && pick("marriage")}>
            <div className="ic">
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
                <circle cx="9" cy="15" r="4.5" stroke="#fff" strokeWidth="2" fill="none"/>
                <circle cx="15" cy="15" r="4.5" stroke="#fff" strokeWidth="2" fill="none"/>
                <path fill="#fff" d="M15 4l2 3h-4z"/>
              </svg>
            </div>
            <h3>Marriage</h3>
            <p>Ready to find a life partner. A complete profile with family background,
              education, and your expectations.</p>
            <span className="pick">{busy === "marriage" ? "Setting up…" : "Choose Marriage"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
