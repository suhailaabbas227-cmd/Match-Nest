import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { updatePassword } from "../api";
import { validateNewPassword } from "../passwordPolicy";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setError(result.error);
        return;
      }
      await supabase.auth.signOut();
      navigate("/login?password=updated", { replace: true });
    } catch (err) {
      setError(err.message || "Could not update your password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <div className="auth-head">
          <div className="brand">Match<span>Nest</span></div>
          <h2>Choose a new password</h2>
          <p>Use 8 to 64 characters and do not reuse an old password.</p>
        </div>

        <form onSubmit={submit}>
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            autoComplete="new-password"
          />
          {error && <div className="error">{error}</div>}
          <button className="btn" style={{ marginTop: 18 }} disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
