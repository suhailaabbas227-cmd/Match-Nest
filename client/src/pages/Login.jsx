import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInUser, getMe } from "../api";


export default function Login() {
  const nav = useNavigate();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });


  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await signInUser(f.email, f.password);
      if (res.error) { setErr(res.error); return; }
      const me = await getMe();
      nav(me?.mode ? (me.profileComplete ? "/" : "/build") : "/mode");
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="center-screen">
      <div className="card auth-card">
        <div className="auth-head">
          <div className="brand">Duo<span>Match</span></div>
          <p>Log in to your account.</p>
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
        <p className="hint"><Link to="/forgot">Forgot password?</Link></p>
        <p className="hint">New here? <Link to="/signup">Create an account</Link></p>
      </div>
    </div>
  );
}


