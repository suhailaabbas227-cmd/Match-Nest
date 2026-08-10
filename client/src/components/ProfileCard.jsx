import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function ProfileCard({ p, onConnect, status }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const name = p.profile?.displayName || p.profile?.fullLegalName || p.fullName;
  const photo = p.profilePhoto;
  const blurred = p.photosBlurred;

  return (
    <div className="profile-card">
      <div className={`photo ${blurred ? "blur" : ""}`} onClick={() => nav(`/profile/${p.id}`)} style={{ cursor: "pointer" }}>
        {photo ? <img src={photo} alt={name} /> : <span className="placeholder">👤</span>}
        {blurred && <span className="lock">🔒 Photos shown after match</span>}
      </div>
      <div className="body">
        <h4>
          {name}
          {p.badge && <span className="badge-verified" title="Verified">✔</span>}
        </h4>
        <div className="meta">
          {p.age ? `${p.age} · ` : ""}{p.profile?.city || p.city || "—"}
        </div>
        <div>
          {p.profile?.sect && <span className="tag">{p.profile.sect}</span>}
          {p.profile?.religiosity && <span className="tag">{p.profile.religiosity}</span>}
          {p.profile?.occupation && <span className="tag">{p.profile.occupation}</span>}
        </div>
        <div className="btn-row">
          {status === "accepted" ? (
            <button className="btn secondary sm" onClick={() => nav(`/chat/${p.id}`)}>Message</button>
          ) : status === "pending" ? (
            <button className="btn ghost sm" disabled>Request sent</button>
          ) : !user?.isPremium ? (
            <button className="btn sm" onClick={() => nav("/plans")}>Upgrade to connect</button>
          ) : (
            <button className="btn sm" onClick={() => onConnect(p.id)}>Connect</button>
          )}
          <button className="btn ghost sm" onClick={() => nav(`/profile/${p.id}`)}>View</button>
        </div>
      </div>
    </div>
  );
}
