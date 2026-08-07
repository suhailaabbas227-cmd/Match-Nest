import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await api.post("/auth/login", f);
      login(res.token, res.user);
      nav(res.user.mode ? (res.user.profileComplete ? "/" : "/build") : "/mode");
    } catch (e) {
      if (e.needsVerification) {
        nav("/verify", { state: { userId: e.userId, email: f.email, devOtp: e.devOtp } });
        return;
      }
      setErr(e.error || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <div className="auth-head">
          <div className="brand">Heart<span>Step</span></div>
          <p>Welcome back — log in to continue.</p>
        </div>
        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" value={f.email} onChange={set("email")} required placeholder="you@email.com" />
          <label>Password</label>
          <input type="password" value={f.password} onChange={set("password")} required />
          {err && <div className="error">{err}</div>}
          <button className="btn" style={{ marginTop: 18 }} disabled={busy}>
            {busy ? "Logging in…" : "Log In"}
          </button>
        </form>
        <div className="devbox" style={{ marginTop: 16 }}>
          <b>Try the demo:</b><br />
          admin@matchnest.app / admin123<br />
          aisha@example.com / password123
        </div>
        <p className="hint">New here? <Link to="/signup">Create an account</Link></p>
      </div>
    </div>
  );
}
