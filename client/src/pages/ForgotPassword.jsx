import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await requestPasswordReset(email.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not send the reset email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <div className="auth-head">
          <div className="brand">Match<span>Nest</span></div>
          <h2>Reset your password</h2>
          <p>Enter the email address used for your MatchNest account.</p>
        </div>

        {sent ? (
          <div className="success" role="status">
            If an account exists for that address, a secure reset link has been
            sent. Please check your inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@email.com"
            />
            {error && <div className="error">{error}</div>}
            <button className="btn" style={{ marginTop: 18 }} disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="hint"><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}
