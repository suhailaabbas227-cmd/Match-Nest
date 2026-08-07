import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Verify() {
  const { state } = useLocation();
  const nav = useNavigate();
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [devOtp, setDevOtp] = useState(state?.devOtp);
  const [busy, setBusy] = useState(false);

  if (!state?.userId) return <Navigate to="/signup" replace />;

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await api.post("/auth/verify", { userId: state.userId, code });
      login(res.token, res.user);
      // If a path was chosen at signup, skip the mode picker.
      nav(res.user.mode ? "/build" : "/mode");
    } catch (e) {
      setErr(e.error || "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    const res = await api.post("/auth/resend", { userId: state.userId });
    setDevOtp(res.devOtp);
  }

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <div className="auth-head">
          <div className="brand">Verify your account</div>
          <p>We sent a 6-digit code to <b>{state.email}</b>.</p>
        </div>
        <form onSubmit={submit}>
          <label>Verification Code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="123456" maxLength={6} style={{ letterSpacing: 6, textAlign: "center", fontSize: 22 }} />
          {devOtp && (
            <div className="devbox">
              Demo mode — your code is <b>{devOtp}</b> (in production this is emailed/SMS’d).
            </div>
          )}
          {err && <div className="error">{err}</div>}
          <button className="btn" style={{ marginTop: 18 }} disabled={busy}>
            {busy ? "Verifying…" : "Verify & Continue"}
          </button>
        </form>
        <p className="hint"><a onClick={resend} style={{ cursor: "pointer" }}>Resend code</a></p>
      </div>
    </div>
  );
}
