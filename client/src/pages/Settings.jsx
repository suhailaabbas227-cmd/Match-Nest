import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  deactivateMyAccount,
  permanentlyDeleteMyAccount,
  requestPasswordReset,
} from "../api";
import { useAuth } from "../AuthContext";

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [busyAction, setBusyAction] = useState("");

  async function switchMode() {
    const next = user.mode === "marriage" ? "dating" : "marriage";
    if (!confirm(`Switch to ${next} mode? Your existing details carry over.`)) return;
    const { user: updated } = await api.post("/profile/switch-mode");
    setUser(updated);
    nav(updated.mode === "marriage" ? "/build" : "/");
  }

  async function togglePrivacy(event) {
    const { user: updated } = await api.put("/profile", {
      profile: user.profile,
      photoPrivacy: event.target.checked,
    });
    setUser(updated);
    setMsg("Privacy preference saved.");
    setError("");
  }

  async function sendPasswordReset() {
    setMsg("");
    setError("");
    setBusyAction("reset");
    const result = await requestPasswordReset(user.email);
    if (result.error) setError(result.error);
    else setMsg("Password reset link sent. Check your inbox and spam folder.");
    setBusyAction("");
  }

  async function deactivate() {
    if (!confirm("Deactivate your account? Your profile will be hidden and matching and messaging will pause.")) return;
    setMsg("");
    setError("");
    setBusyAction("deactivate");
    const result = await deactivateMyAccount();
    if (result.error) {
      setError(result.error);
      setBusyAction("");
      return;
    }
    setUser(result.user);
  }

  async function removeAccount() {
    if (deleteConfirmation !== "DELETE") {
      setError("Type DELETE exactly to confirm permanent deletion.");
      return;
    }
    if (!confirm("Permanently delete your account and personal data? This cannot be undone.")) return;
    setMsg("");
    setError("");
    setBusyAction("delete");
    const result = await permanentlyDeleteMyAccount();
    if (result.error) {
      setError(result.error);
      setBusyAction("");
      return;
    }
    await logout();
    nav("/signup", { replace: true });
  }

  return (
    <div className="container settings-page">
      <h1 className="section-title">Settings</h1>
      <p className="section-sub">Manage your membership, profile, security and privacy.</p>

      {error && <div className="error settings-feedback">{error}</div>}
      {msg && <div className="success settings-feedback">{msg}</div>}

      <div className="card settings-card">
        <h3>Membership</h3>
        <p className="section-sub">
          {user.isPremium
            ? `Your ${user.membership?.plan || "Premium"} membership is active.`
            : "You are using The Match Nest Free. You can browse profiles, while requests and full messaging require Premium."}
        </p>
        <button className="btn sm" onClick={() => nav("/plans")}>
          {user.isPremium ? "Manage membership" : "View subscription plans"}
        </button>
      </div>

      <div className="card settings-card">
        <h3>Account and security</h3>
        <div className="list-row"><b>Name</b><div className="spacer" />{user.fullName}</div>
        <div className="list-row"><b>Email</b><div className="spacer" />{user.email}</div>
        <div className="list-row"><b>Verified</b><div className="spacer" />{user.verified ? "Yes" : "No"}</div>
        <div className="list-row"><b>Verification badge</b><div className="spacer" />{user.badge ? "Granted" : "Not yet"}</div>
        <button className="btn ghost sm settings-action" onClick={sendPasswordReset} disabled={!!busyAction}>
          {busyAction === "reset" ? "Sending..." : "Email me a password reset link"}
        </button>
      </div>

      <div className="card settings-card">
        <h3>Mode</h3>
        <p className="section-sub">
          You are in <b style={{ textTransform: "capitalize" }}>{user.mode}</b> mode. Switch any time; your profile data is kept.
        </p>
        <button className="btn sm" onClick={switchMode}>
          Switch to {user.mode === "marriage" ? "Friendship" : "Marriage"} mode
        </button>
      </div>

      <div className="card settings-card">
        <h3>Privacy</h3>
        <label className="settings-checkbox">
          <input type="checkbox" checked={!!user.photoPrivacy} onChange={togglePrivacy} />
          Blur my photos until I accept a match
        </label>
        <p className="section-sub settings-copy">
          The Match Nest does not request GPS or show your exact location. Only the city and country you choose are shared.
        </p>
        <p className="section-sub settings-copy">
          Free members cannot reveal who liked or messaged them from notifications. Private message text is never included in email alerts.
        </p>
        <button className="btn ghost sm" onClick={() => nav("/build")}>Edit my profile</button>
      </div>

      <div className="card settings-card">
        <h3>Take a break</h3>
        <p className="section-sub">Deactivation hides your profile and pauses matching and messaging without deleting your data.</p>
        <button className="btn ghost sm" onClick={deactivate} disabled={!!busyAction}>
          {busyAction === "deactivate" ? "Deactivating..." : "Deactivate account"}
        </button>
      </div>

      <div className="card settings-card settings-danger">
        <h3>Permanently delete account</h3>
        <p className="section-sub">Your profile, photos, matches and account data will be removed. This cannot be undone.</p>
        <label>Type DELETE to confirm</label>
        <input
          value={deleteConfirmation}
          onChange={(event) => setDeleteConfirmation(event.target.value.toUpperCase())}
          placeholder="DELETE"
          autoComplete="off"
        />
        <button
          className="btn sm settings-delete"
          onClick={removeAccount}
          disabled={deleteConfirmation !== "DELETE" || !!busyAction}
        >
          {busyAction === "delete" ? "Deleting..." : "Permanently delete account"}
        </button>
      </div>
    </div>
  );
}
