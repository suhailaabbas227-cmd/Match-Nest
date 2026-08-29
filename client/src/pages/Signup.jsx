import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe, signInUser, signUpUser } from "../api";
import { validateNewPassword } from "../passwordPolicy";
import "./Signup.css";

function getLatestAdultBirthDate() {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  const year = cutoff.getFullYear();
  const month = String(cutoff.getMonth() + 1).padStart(2, "0");
  const day = String(cutoff.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const LATEST_ADULT_BIRTH_DATE = getLatestAdultBirthDate();
const SITE_COMING_SOON = true;

function Logo() {
  return (
    <div className="hs-logo">
      <span className="mark">
        <img src="/assets/matchnest-logo.png" alt="The Match Nest logo" />
      </span>
      <span className="name">
        <span className="pink">Match</span><b> Nest</b>
        <div className="tag">Friendship &amp; Marriage, Your Way</div>
      </span>
    </div>
  );
}

function WelcomeSplash() {
  return (
    <div className={`hs-welcome${SITE_COMING_SOON ? " is-coming-soon" : ""}`} role="status" aria-live="polite">
      <div className="hs-welcome-inner">
        <p>WELCOME TO</p>
        <div className="hs-welcome-logo">
          <img src="/assets/matchnest-logo.png" alt="The Match Nest" />
        </div>
        {SITE_COMING_SOON && <p className="hs-welcome-coming">COMING SOON</p>}
      </div>
    </div>
  );
}

export default function Signup() {
  const nav = useNavigate();
  const formRef = useRef(null);

  const [showWelcome, setShowWelcome] = useState(true);

  const [tab, setTab] = useState("signup"); // 'signup' | 'login'
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const [f, setF] = useState({
    firstName: "", lastName: "", email: "", password: "",
    dateOfBirth: "",
  });
  const [lf, setLf] = useState({ email: "", password: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setL = (k) => (e) => setLf({ ...lf, [k]: e.target.value });

  useEffect(() => {
    [
      "/assets/friendship-meeting.jpg",
      "/assets/marriage-couple.jpg",
      "/assets/friendship-silhouette.png",
      "/assets/marriage-silhouette.png",
    ].forEach((src) => {
      const image = new Image();
      image.src = src;
    });

    if (SITE_COMING_SOON) return undefined;
    const timer = window.setTimeout(() => setShowWelcome(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  async function submitSignup(e) {
    e.preventDefault();
    setErr("");
    const passwordError = validateNewPassword(f.password);
    if (passwordError) {
      setErr(passwordError);
      return;
    }
    setBusy(true);
    try {
      const res = await signUpUser({
        fullName: `${f.firstName} ${f.lastName}`.trim(),
        email: f.email,
        password: f.password,
        dateOfBirth: f.dateOfBirth,
        mode: null,
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
      if (res.needsEmailConfirmation) {
        setConfirmationEmail(f.email);
        return;
      }
      nav("/mode");
    } catch (e) {
      setErr(e.message || "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await signInUser(lf.email, lf.password);
      if (res.error) {
        setErr(res.error);
        return;
      }
      const me = await getMe();
      nav(me?.mode ? (me.profileComplete ? "/" : "/build") : "/mode");
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (SITE_COMING_SOON || showWelcome) return <WelcomeSplash />;

  return (
    <div className="hs">
      {/* ---- top bar ---- */}
      <header className="hs-nav">
        <Logo />
        <div className="hs-actions">
          <button className="hs-lang">English</button>
          <button className="hs-login-btn" onClick={() => { setTab("login"); formRef.current?.scrollIntoView({ behavior: "smooth" }); }}>Login</button>
        </div>
      </header>

      {/* ---- main ---- */}
      <div className="hs-main">
        {/* hero */}
        <section className="hs-hero">
          <span className="hs-badge">Friendship and marriage, in one place</span>
          <h1>
            <span className="l1">One place.</span><br />
            <span className="l2">Two meaningful paths.</span>
          </h1>
          <p className="lead">
            Meet verified people for genuine friendship or find a life partner
            for marriage. Create your account and choose your path.
          </p>
          <div className="hs-path-preview" aria-label="Ways to use The Match Nest">
            <div className="dating">
              <span className="hs-path-icon" aria-hidden="true">
                <img src="/assets/friendship-silhouette.png" alt="" />
              </span>
              <div>
                <strong>Friendship</strong>
                <small>Build a genuine connection</small>
              </div>
            </div>
            <div className="marriage">
              <span className="hs-path-icon" aria-hidden="true">
                <img src="/assets/marriage-silhouette.png" alt="" />
              </span>
              <div>
                <strong>Marriage</strong>
                <small>Find your life partner</small>
              </div>
            </div>
          </div>
          <div className="hs-trust-points" aria-label="The Match Nest benefits">
            <span>Verified profiles</span>
            <span>Privacy first</span>
            <span>Connections with intent</span>
          </div>
        </section>

        {/* Friendship and marriage paths */}
        <section className="hs-photo" aria-label="Friendship and marriage paths">
          <figure className="hs-photo-panel friendship">
            <img
              className="hs-photo-image"
              src="/assets/friendship-meeting.jpg"
              alt="A woman and man getting to know each other over coffee"
            />
            <figcaption><strong>Friendship</strong></figcaption>
          </figure>
          <figure className="hs-photo-panel marriage">
            <img
              className="hs-photo-image"
              src="/assets/marriage-couple.jpg"
              alt="A bride and groom celebrating their marriage"
            />
            <figcaption><strong>Marriage</strong></figcaption>
          </figure>
        </section>

        {/* signup / login card */}
        <section className="hs-card" ref={formRef}>
          <div className="hs-card-head">
            <div>
              <h2>{tab === "signup" ? "Create your account" : "Welcome back"}</h2>
              {tab === "login" && <p className="sub">Log in to continue.</p>}
            </div>
            <div className="have">
              {tab === "signup" ? "Already have an account?" : "New here?"}{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setTab(tab === "signup" ? "login" : "signup"); setErr(""); }}>
                {tab === "signup" ? "Login" : "Sign Up"}
              </a>
            </div>
          </div>

          <div className="hs-tabs">
            <button className={tab === "signup" ? "on" : ""} onClick={() => { setTab("signup"); setErr(""); }}>Sign Up</button>
            <button className={tab === "login" ? "on" : ""} onClick={() => { setTab("login"); setErr(""); }}>Login</button>
          </div>

          {err && <div className="hs-err" role="alert" aria-live="assertive">{err}</div>}
          {confirmationEmail && (
            <div className="success" role="status">
              <b>Check your email.</b><br />
              We sent a secure verification link to {confirmationEmail}. Open it to activate your profile on The Match Nest.
            </div>
          )}

          {tab === "signup" && !confirmationEmail ? (
            <form className="hs-form" onSubmit={submitSignup}>
              <div className="grid2">
                <div className="hs-field">
                  <input value={f.firstName} onChange={set("firstName")} required placeholder="First Name" />
                </div>
                <div className="hs-field">
                  <input value={f.lastName} onChange={set("lastName")} placeholder="Last Name" />
                </div>
              </div>
              <div className="hs-field">
                <input id="su-email" type="email" value={f.email} onChange={set("email")} required placeholder="Email Address" />
              </div>
              <div className="hs-field">
                <input type={showPw ? "text" : "password"} value={f.password} onChange={set("password")} required autoComplete="new-password" placeholder="Password (8-64 characters)" aria-label="Password, 8 to 64 characters" />
                <button type="button" className="eye" onClick={() => setShowPw(!showPw)} aria-label="Toggle password">{showPw ? "Hide" : "Show"}</button>
              </div>
              <div className="hs-field hs-date-field">
                <label className="hs-date-label" htmlFor="su-dob">Date of birth</label>
                <input
                  id="su-dob"
                  type="date"
                  value={f.dateOfBirth}
                  onChange={set("dateOfBirth")}
                  max={LATEST_ADULT_BIRTH_DATE}
                  required
                  aria-label="Date of birth"
                  aria-describedby="su-dob-help"
                />
              </div>
              <p className="hs-age-note" id="su-dob-help">
                Choose your date of birth. The Match Nest is for adults aged 18 and over only.
              </p>
              <button className="hs-submit" disabled={busy}>{busy ? "Creating…" : "Create Account"}</button>
            </form>
          ) : tab === "login" ? (
            <form className="hs-form" onSubmit={submitLogin}>
              <div className="hs-field">
                <input type="email" value={lf.email} onChange={setL("email")} required placeholder="Email Address" />
              </div>
              <div className="hs-field">
                <input type={showPw ? "text" : "password"} value={lf.password} onChange={setL("password")} required placeholder="Password" />
                <button type="button" className="eye" onClick={() => setShowPw(!showPw)} aria-label="Toggle password">{showPw ? "Hide" : "Show"}</button>
              </div>
              <button className="hs-submit" disabled={busy}>{busy ? "Logging in…" : "Log In"}</button>
            </form>
          ) : null}

          <div className="hs-or-div">or continue with</div>
          <div className="hs-social">
            <button type="button" aria-label="Continue with Google">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"/>
                <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3 0-5.6-2-6.6-4.8h-4v3.1A12 12 0 0 0 12 24Z"/>
                <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8v-3H1.4a12 12 0 0 0 0 10.8l4-3Z"/>
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.4 6.8 9 4.8 12 4.8Z"/>
              </svg>
              Google
            </button>
            <button type="button" aria-label="Continue with Email"
              onClick={() => { setTab("signup"); document.getElementById("su-email")?.focus(); }}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <rect x="2" y="4.5" width="20" height="15" rx="2.5" fill="none" stroke="#ec1e79" strokeWidth="1.8"/>
                <path d="M3.5 6.5 12 12.5l8.5-6" fill="none" stroke="#ec1e79" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Email
            </button>
            <button type="button" aria-label="Continue with Apple">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#000" d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.7 2.3-1.6 2.8-.4 6.9 1.1 9.2.8 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7s2-1.1 2.7-2.1c.9-1.3 1.2-2.5 1.2-2.6 0 0-2.3-.9-2.3-3.5Zm-2.3-6.4c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.6-1.2Z"/>
              </svg>
              Apple
            </button>
          </div>

          <p className="hs-terms">
            By signing up, you agree to our <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a>
            {" "}and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
          </p>
        </section>
      </div>
    </div>
  );
}

