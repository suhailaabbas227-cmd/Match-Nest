import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Admin() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [photoReviews, setPhotoReviews] = useState([]);

  async function load() {
    const [{ reports }, { users }, { reviews }] = await Promise.all([
      api.get("/safety/admin/reports"),
      api.get("/safety/admin/users"),
      api.get("/safety/admin/photo-reviews"),
    ]);
    setReports(reports);
    setUsers(users);
    setPhotoReviews(reviews);
  }
  useEffect(() => { if (user?.role === "admin") load(); }, [user]);

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  const name = (u) => u?.profile?.displayName || u?.fullName || "—";

  async function grant(id, value) { await api.post(`/safety/admin/badge/${id}`, { value }); load(); }
  async function suspend(id) { await api.post(`/safety/admin/suspend/${id}`); load(); }
  async function resolve(id) { await api.post(`/safety/admin/resolve/${id}`); load(); }
  async function reviewPhoto(path, status) {
    await api.post("/safety/admin/photo-review", { path, status });
    load();
  }

  return (
    <div className="container">
      <h1 className="section-title">Admin panel</h1>
      <p className="section-sub">Manage flagged accounts and verification badges.</p>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Reports {reports.length > 0 && `(${reports.length})`}</h3>
        {reports.length === 0 ? <p className="section-sub">No reports.</p> : (
          <table>
            <thead><tr><th>Reported</th><th>By</th><th>Reason</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{name(r.reportedUser)}</td>
                  <td>{name(r.reportedBy)}</td>
                  <td>{r.reason}</td>
                  <td>{r.status}</td>
                  <td>
                    <button className="btn ghost sm" onClick={() => suspend(r.reportedUser?.id)}>Suspend</button>{" "}
                    {r.status === "open" && <button className="btn sm" onClick={() => resolve(r.id)}>Resolve</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Photo safety review {photoReviews.length > 0 && `(${photoReviews.length})`}</h3>
        {photoReviews.length === 0 ? <p className="section-sub">No photos waiting for review.</p> : (
          <div className="photo-review-grid">
            {photoReviews.map((review) => (
              <div className="photo-review-card" key={review.path}>
                {review.photoUrl
                  ? <img src={review.photoUrl} alt="Profile photo awaiting safety review" />
                  : <div className="photo-review-missing">Preview unavailable</div>}
                <strong>{review.is_main ? "Main photo" : "Gallery photo"} — {review.status === "review" ? "needs a decision" : "pending review"}</strong>
                <small>{review.reason}</small>
                <div className="btn-row">
                  <button className="btn sm" onClick={() => reviewPhoto(review.path, "approved")}>Approve</button>
                  <button className="btn danger sm" onClick={() => reviewPhoto(review.path, "rejected")}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Members ({users.length})</h3>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Mode</th><th>Badge</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{name(u)}{u.suspended && " 🚫"}</td>
                <td>{u.email}</td>
                <td>{u.mode || "—"}</td>
                <td>{u.badge ? "✔" : "—"}</td>
                <td>
                  {u.badge
                    ? <button className="btn ghost sm" onClick={() => grant(u.id, false)}>Revoke</button>
                    : <button className="btn sm" onClick={() => grant(u.id, true)}>Verify ✔</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
