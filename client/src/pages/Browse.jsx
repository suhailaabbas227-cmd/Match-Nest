import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import ProfileCard from "../components/ProfileCard";

const empty = { city: "", sect: "", religiosity: "", minAge: "", maxAge: "", q: "" };

export default function Browse() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(empty);
  const [profiles, setProfiles] = useState([]);
  const [statuses, setStatuses] = useState({}); // userId -> connection status
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v)
    ).toString();
    const [{ profiles }, { matches }, { outgoing }] = await Promise.all([
      api.get(`/browse?${qs}`),
      api.get("/browse/me/matches"),
      api.get("/browse/me/outgoing"),
    ]);
    const map = {};
    matches.forEach((m) => (map[m.user.id] = "accepted"));
    outgoing.forEach((item) => (map[item.userId] = "pending"));
    setProfiles(profiles);
    setStatuses((s) => ({ ...s, ...map }));
    const strongest = profiles[0];
    if (strongest?.matchScore >= 70) {
      api.post("/notifications/strong-match", {
        candidateId: strongest.id,
        score: strongest.matchScore,
      }).catch(() => {});
    }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function connect(id) {
    const res = await api.post(`/browse/connect/${id}`);
    setStatuses((s) => ({ ...s, [id]: res.status }));
  }

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div className="container">
      <h1 className="section-title">Browse profiles</h1>
      <p className="section-sub">
        People in <b>{user.mode}</b> mode who match your filters. Send a request — chat unlocks when they accept.
      </p>

      <div className="filters">
        <div>
          <label>Search</label>
          <input value={filters.q} onChange={set("q")} placeholder="name, job…" />
        </div>
        <div>
          <label>City</label>
          <input value={filters.city} onChange={set("city")} placeholder="Any" />
        </div>
        <div>
          <label>Sect</label>
          <select value={filters.sect} onChange={set("sect")}>
            <option value="">Any</option><option>Sunni</option><option>Shia</option><option>Other</option>
          </select>
        </div>
        <div>
          <label>Religiosity</label>
          <select value={filters.religiosity} onChange={set("religiosity")}>
            <option value="">Any</option>
            <option>Moderately Practicing</option><option>Practicing</option><option>Very Practicing</option>
          </select>
        </div>
        <div style={{ minWidth: 80 }}>
          <label>Min age</label>
          <input type="number" value={filters.minAge} onChange={set("minAge")} />
        </div>
        <div style={{ minWidth: 80 }}>
          <label>Max age</label>
          <input type="number" value={filters.maxAge} onChange={set("maxAge")} />
        </div>
        <button className="btn sm" onClick={load}>Apply</button>
        <button className="btn ghost sm" onClick={() => { setFilters(empty); setTimeout(load, 0); }}>Reset</button>
      </div>

      {loading ? (
        <div className="empty">Loading profiles…</div>
      ) : profiles.length === 0 ? (
        <div className="empty">No profiles match your filters yet. Try widening them.</div>
      ) : (
        <div className="grid">
          {profiles.map((p) => (
            <ProfileCard key={p.id} p={p} status={statuses[p.id]} onConnect={connect} />
          ))}
        </div>
      )}
    </div>
  );
}
