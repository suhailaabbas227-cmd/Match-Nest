import { useState } from "react";
import { useAuth } from "../AuthContext";
import { reactivateMyAccount } from "../api";

export default function AccountPaused() {
  const { setUser, logout } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reactivate() {
    setError("");
    setBusy(true);
    const result = await reactivateMyAccount();
    if (result.error) setError(result.error);
    else setUser(result.user);
    setBusy(false);
  }

  return (
    <main className="center-screen account-paused-page">
      <section className="card auth-card account-paused-card">
        <div className="brand">The <span>Match Nest</span></div>
        <span className="paused-icon" aria-hidden="true">||</span>
        <h1>Your account is deactivated</h1>
        <p>Your profile is hidden and new matching and messaging are paused. Your data is still safe.</p>
        {error && <div className="error">{error}</div>}
        <button className="btn" onClick={reactivate} disabled={busy}>
          {busy ? "Reactivating..." : "Reactivate my account"}
        </button>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </section>
    </main>
  );
}
