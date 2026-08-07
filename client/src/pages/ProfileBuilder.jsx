import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { datingSteps, marriageSteps } from "../fields";
import "./Onboarding.css";

function Brand() {
  return (
    <div className="ob-logo">
      <svg viewBox="0 0 46 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 7.5C9.5 7.5 6 11 6 15.3c0 6.4 8.8 12 12 14.4 3.2-2.1 12-8 12-14.4C30 11 26.5 7.5 22 7.5c-2.6 0-4.7 1.3-6 3.3-1.3-2-3.4-3.3-2-3.3Z" fill="#ec1e79"/>
        <path d="M24 11.5c-2.6 0-4.7 1.3-6 3.3 1.3 2 6 6.2 8 8.4 2.2-2.1 8-6.4 8-11.4 0-4.3-3.5-7.8-8-7.8-1 0-1.9.2-2.7.5 1.7 1.2 2.9 3.1 3.4 5.3" stroke="#8b3df0" strokeWidth="2.2" fill="none" strokeLinejoin="round"/>
      </svg>
      <span><span className="pink">Heart</span>Step</span>
    </div>
  );
}

export default function ProfileBuilder() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const marriage = user.mode === "marriage";
  const steps = marriage ? marriageSteps : datingSteps;
  const PHOTO_STEP = steps.length;       // photos come last
  const TOTAL = steps.length + 1;

  const [step, setStep] = useState(0);
  const [data, setData] = useState(user.profile || {});
  const [photoPrivacy, setPhotoPrivacy] = useState(user.photoPrivacy ?? marriage);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (name) => (e) => setData({ ...data, [name]: e.target.value });

  // multi-select tag chips
  const toggleTag = (name, value) => {
    const cur = Array.isArray(data[name]) ? data[name] : [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    setData({ ...data, [name]: next });
  };

  // icebreaker prompts: array of { q, a }
  const setPrompt = (name, i, key, value) => {
    const cur = Array.isArray(data[name]) ? [...data[name]] : [];
    cur[i] = { ...(cur[i] || { q: "", a: "" }), [key]: value };
    setData({ ...data, [name]: cur });
  };

  const onPhotoStep = step === PHOTO_STEP;
  const current = steps[step];

  function nextStep() {
    // light validation: required fields in this section must be filled
    if (!onPhotoStep) {
      const missing = current.fields.filter(
        (f) => f.required && !String(data[f.name] ?? "").trim()
      );
      if (missing.length) {
        setErr(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
        return;
      }
    }
    setErr("");
    setStep(step + 1);
  }

  async function uploadPhoto(e, main) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("photo", file);
    try {
      const { user: u } = await api.upload(`/profile/photo?main=${main}`, fd);
      setUser(u);
    } catch (e) {
      setErr(e.error || "Could not upload photo");
    }
  }

  async function finish() {
    setBusy(true); setErr("");
    try {
      const { user: u } = await api.put("/profile", { profile: data, photoPrivacy });
      setUser(u);
      nav("/");
    } catch (e) {
      setErr(e.error || "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ob">
      <header className="ob-top">
        <Brand />
        <button className="ob-logout" onClick={logout}>Log out</button>
      </header>

      <div className="ob-wrap">
        <div className="ob-head">
          <h1>{marriage ? "Build your marriage profile" : "Set up your dating profile"}</h1>
          <p>
            {marriage
              ? "A complete profile helps families and matches get to know you properly."
              : "Keep it short and real — just enough to make a genuine connection."}
          </p>
        </div>

        {/* progress */}
        <div className="ob-steps">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className={`seg ${i < step ? "done" : i === step ? "active" : ""}`} />
          ))}
        </div>
        <div className="ob-stepmeta">
          Step {step + 1} of {TOTAL} — {onPhotoStep ? "Photos" : current.title}
        </div>

        <div className="ob-card">
          {!onPhotoStep ? (
            <>
              <h2>{current.title}</h2>
              <p className="hint">All fields are optional — fill in what you're comfortable sharing.</p>
              <div className="ob-grid">
                {current.fields.map((fld) => {
                  const wide = ["textarea", "tags", "prompts"].includes(fld.type);
                  return (
                    <div key={fld.name} className={`ob-field ${wide ? "full" : ""}`}>
                      <label>{fld.label}{fld.required && <span className="req"> *</span>}</label>

                      {fld.type === "select" ? (
                        <select value={data[fld.name] || ""} onChange={set(fld.name)}>
                          <option value="">Select…</option>
                          {fld.options.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      ) : fld.type === "textarea" ? (
                        <textarea value={data[fld.name] || ""} onChange={set(fld.name)} placeholder={fld.placeholder || "Write a few lines…"} />
                      ) : fld.type === "tags" ? (
                        <div className="ob-tags">
                          {fld.options.map((o) => {
                            const on = (data[fld.name] || []).includes(o);
                            return (
                              <button type="button" key={o} className={`ob-tag ${on ? "on" : ""}`}
                                onClick={() => toggleTag(fld.name, o)}>{o}</button>
                            );
                          })}
                        </div>
                      ) : fld.type === "prompts" ? (
                        <div className="ob-prompts">
                          {Array.from({ length: fld.count }).map((_, i) => {
                            const chosen = (data[fld.name] || [])[i] || { q: "", a: "" };
                            const usedElsewhere = (data[fld.name] || [])
                              .map((p, idx) => (idx !== i ? p?.q : null)).filter(Boolean);
                            return (
                              <div className="ob-prompt" key={i}>
                                <select value={chosen.q} onChange={(e) => setPrompt(fld.name, i, "q", e.target.value)}>
                                  <option value="">Choose a prompt…</option>
                                  {fld.bank.filter((q) => q === chosen.q || !usedElsewhere.includes(q))
                                    .map((q) => <option key={q}>{q}</option>)}
                                </select>
                                {chosen.q && (
                                  <input placeholder="Your answer…" value={chosen.a}
                                    onChange={(e) => setPrompt(fld.name, i, "a", e.target.value)} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <input type={fld.type} value={data[fld.name] || ""} onChange={set(fld.name)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <h2>Add your photos</h2>
              <p className="hint">A clear main photo makes a strong first impression.</p>
              <div className="ob-photo-main">
                {user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : <span>＋</span>}
              </div>
              <div className="ob-field">
                <label>Main profile photo</label>
                <input className="ob-file" type="file" accept="image/*" onChange={(e) => uploadPhoto(e, "true")} />
              </div>
              <div className="ob-field" style={{ marginTop: 14 }}>
                <label>More photos (up to 5)</label>
                <input className="ob-file" type="file" accept="image/*" onChange={(e) => uploadPhoto(e, "false")} />
              </div>
              <div className="ob-gallery">
                {(user.photos || []).map((p) => <img key={p} src={p} alt="" />)}
              </div>
              {marriage && (
                <label className="ob-check">
                  <input type="checkbox" checked={photoPrivacy} onChange={(e) => setPhotoPrivacy(e.target.checked)} />
                  <span>Blur my photos until I accept a match — recommended for privacy in marriage mode.</span>
                </label>
              )}
            </>
          )}

          {err && <div className="ob-err">{err}</div>}

          <div className="ob-actions">
            {step > 0 && (
              <button className="ob-btn ghost" onClick={() => setStep(step - 1)}>Back</button>
            )}
            <div className="ob-spacer" />
            {!onPhotoStep ? (
              <button className="ob-btn" onClick={nextStep}>Continue</button>
            ) : (
              <button className="ob-btn" onClick={finish} disabled={busy}>
                {busy ? "Saving…" : "Finish & Start Browsing"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
