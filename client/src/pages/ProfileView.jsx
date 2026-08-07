import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { datingSteps, marriageSteps } from "../fields";

export default function ProfileView() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get(`/browse/${id}`).then((r) => setP(r.profile)).catch(() => setP(false));
  }, [id]);

  if (p === false) return <div className="container"><div className="empty">Profile not found.</div></div>;
  if (!p) return <div className="container"><div className="empty">Loading…</div></div>;

  const steps = p.mode === "marriage" ? marriageSteps : datingSteps;
  const name = p.profile?.displayName || p.profile?.fullLegalName || p.fullName;

  async function connect() {
    const r = await api.post(`/browse/connect/${id}`);
    setMsg(r.status === "accepted" ? "It's a match! You can now chat." : "Connection request sent.");
  }
  async function report() {
    const reason = prompt("Why are you reporting this profile?");
    if (!reason) return;
    await api.post(`/safety/report/${id}`, { reason });
    setMsg("Report submitted. Thank you.");
  }
  async function block() {
    if (!confirm("Block this user? You won't see each other again.")) return;
    await api.post(`/safety/block/${id}`);
    nav("/");
  }

  return (
    <div className="container">
      <button className="btn ghost sm" onClick={() => nav(-1)} style={{ marginBottom: 16 }}>← Back</button>
      <div className="card">
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div className="avatar" style={{ width: 96, height: 96 }}>
            {p.profilePhoto ? <img src={p.profilePhoto} alt="" /> : <span style={{ fontSize: 34 }}>👤</span>}
          </div>
          <div>
            <h1 className="section-title" style={{ marginBottom: 2 }}>
              {name} {p.badge && <span className="badge-verified">✔</span>}
            </h1>
            <p className="section-sub" style={{ margin: 0 }}>
              {p.age ? `${p.age} · ` : ""}{p.profile?.city || p.city} · <span style={{ textTransform: "capitalize" }}>{p.mode} mode</span>
            </p>
          </div>
          <div className="spacer" />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn sm" onClick={connect}>Connect</button>
            <button className="btn ghost sm" onClick={report}>Report</button>
            <button className="btn danger sm" onClick={block}>Block</button>
          </div>
        </div>

        {p.photosBlurred && (
          <div className="devbox" style={{ marginTop: 16 }}>
            🔒 This member keeps photos private until a match is accepted.
          </div>
        )}
        {msg && <div className="success">{msg}</div>}

        {p.photos?.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {p.photos.map((ph) => (
              <img key={ph} src={ph} alt="" style={{ width: 110, height: 110, borderRadius: 10, objectFit: "cover" }} />
            ))}
          </div>
        )}

        {steps.map((s) => {
          const filled = s.fields.filter((f) => p.profile?.[f.name]);
          if (!filled.length) return null;
          return (
            <div key={s.title} style={{ marginTop: 22 }}>
              <h3 style={{ borderBottom: "2px solid var(--gold)", paddingBottom: 6 }}>{s.title}</h3>
              <div className="row">
                {filled.map((f) => (
                  <div key={f.name} style={{ gridColumn: f.type === "textarea" ? "1 / -1" : "auto" }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{f.label}</div>
                    <div>{p.profile[f.name]}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
