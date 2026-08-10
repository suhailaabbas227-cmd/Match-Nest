import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Matches() {
  const nav = useNavigate();
  const [requests, setRequests] = useState([]);
  const [matches, setMatches] = useState([]);

  async function load() {
    const [{ requests }, { matches }] = await Promise.all([
      api.get("/browse/me/requests"),
      api.get("/browse/me/matches"),
    ]);
    setRequests(requests);
    setMatches(matches);
  }
  useEffect(() => { load(); }, []);

  async function respond(connId, action) {
    await api.post(`/browse/respond/${connId}`, { action });
    load();
  }

  const Name = (u) => u.profile?.displayName || u.profile?.fullLegalName || u.fullName;

  return (
    <div className="container">
      <h1 className="section-title">Matches & Requests</h1>
      <p className="section-sub">Accept a request to match — then you can start chatting.</p>

      <div className="card" style={{ marginBottom: 22 }}>
        <h3 style={{ marginTop: 0 }}>Incoming requests {requests.length > 0 && `(${requests.length})`}</h3>
        {requests.length === 0 ? (
          <p className="section-sub" style={{ margin: 0 }}>No pending requests.</p>
        ) : requests.map((r, index) => r.locked ? (
          <div className="list-row locked-request" key={`locked-${index}`}>
            <div className="avatar locked-identity">?</div>
            <div>
              <div className="locked-name">Someone likes your profile</div>
              <div className="section-sub" style={{ margin: 0 }}>Upgrade to reveal their identity and respond.</div>
            </div>
            <div className="spacer" />
            <button className="btn sm" onClick={() => nav("/plans")}>Reveal with Premium</button>
          </div>
        ) : (
          <div className="list-row" key={r.connId}>
            <div className="avatar">
              {r.user.profilePhoto ? <img src={r.user.profilePhoto} alt="" /> : Name(r.user)[0]}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{Name(r.user)}</div>
              <div className="section-sub" style={{ margin: 0 }}>{r.user.profile?.city || r.user.city}</div>
            </div>
            <div className="spacer" />
            <button className="btn sm" onClick={() => respond(r.connId, "accept")}>Accept</button>
            <button className="btn ghost sm" onClick={() => respond(r.connId, "decline")}>Decline</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Your matches</h3>
        {matches.length === 0 ? (
          <p className="section-sub" style={{ margin: 0 }}>No matches yet — keep browsing!</p>
        ) : matches.map((m) => (
          <div className="list-row" key={m.connId}>
            <div className="avatar">
              {m.user.profilePhoto ? <img src={m.user.profilePhoto} alt="" /> : Name(m.user)[0]}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{Name(m.user)}</div>
              <div className="section-sub" style={{ margin: 0 }}>{m.user.profile?.city || m.user.city}</div>
            </div>
            <div className="spacer" />
            <button className="btn secondary sm" onClick={() => nav(`/profile/${m.user.id}`)}>View</button>
            <button className="btn sm" onClick={() => nav(`/chat/${m.user.id}`)}>Message</button>
          </div>
        ))}
      </div>
    </div>
  );
}
