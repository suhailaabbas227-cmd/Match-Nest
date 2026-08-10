import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { confirmDateOfBirth } from "../api";
import { useAuth } from "../AuthContext";

export default function AgeCheck() {
  const navigate = useNavigate();
  const { setUser, logout } = useAuth();
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await confirmDateOfBirth(dateOfBirth);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUser(result.user);
      navigate(result.user.mode
        ? (result.user.profileComplete ? "/" : "/build")
        : "/mode", { replace: true });
    } catch (err) {
      setError(err.message || "Could not confirm your age");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card auth-card">
        <div className="auth-head">
          <div className="brand">Match<span>Nest</span></div>
          <h2>Confirm you are 18+</h2>
          <p>
            MatchNest is only for adults. Your exact date of birth is kept
            private and is not shown on your profile.
          </p>
        </div>

        <form onSubmit={submit}>
          <label htmlFor="age-check-dob">Date of birth</label>
          <input
            id="age-check-dob"
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            required
          />
          {error && <div className="error" role="alert" aria-live="assertive">{error}</div>}
          <button className="btn" style={{ marginTop: 18 }} disabled={busy}>
            {busy ? "Confirming…" : "Confirm age"}
          </button>
        </form>

        <button className="btn ghost" style={{ marginTop: 10 }} onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}
