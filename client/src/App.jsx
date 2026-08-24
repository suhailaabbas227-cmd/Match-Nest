import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Navbar from "./components/Navbar";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AgeCheck from "./pages/AgeCheck";
import ModeSelect from "./pages/ModeSelect";
import ProfileBuilder from "./pages/ProfileBuilder";
import Browse from "./pages/Browse";
import ProfileView from "./pages/ProfileView";
import Matches from "./pages/Matches";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import Notifications from "./pages/Notifications";
import AccountPaused from "./pages/AccountPaused";
import { DeleteAccountPage, PrivacyPolicy, TermsOfService } from "./pages/Legal";

// Gate that also routes the user to the correct onboarding step.
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Navigate to="/signup" replace />;
  if (user.suspended) return <Navigate to="/account-unavailable" replace />;
  if (user.deactivatedAt) return <Navigate to="/account-paused" replace />;
  if (!user.dateOfBirth) return <Navigate to="/age-check" replace />;
  if (!user.mode) return <Navigate to="/mode" replace />;
  if (!user.profileComplete) return <Navigate to="/build" replace />;
  return children;
}

export default function App() {
  const { user, loading, logout } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;

  return (
    <>
      {user && !user.suspended && !user.deactivatedAt && user.mode && user.profileComplete && <Navbar />}
      <Routes>
        <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
        <Route
          path="/age-check"
          element={
            !user ? <Navigate to="/login" replace />
              : user.suspended ? <Navigate to="/account-unavailable" replace />
              : user.dateOfBirth ? <Navigate to="/" replace />
                : <AgeCheck />
          }
        />
        <Route
          path="/account-unavailable"
          element={
            user?.suspended ? (
              <div className="center-screen">
                <div className="card auth-card">
                  <div className="auth-head">
                    <div className="brand">The <span>Match Nest</span></div>
                    <h2>Account unavailable</h2>
                    <p>
                      This account has been suspended for a safety review.
                      Contact The Match Nest support if you believe this is a mistake.
                    </p>
                  </div>
                  <button className="btn" onClick={logout}>Log out</button>
                </div>
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/account-paused"
          element={user?.deactivatedAt ? <AccountPaused /> : <Navigate to={user ? "/" : "/login"} replace />}
        />

        {/* Onboarding (logged in but not finished) */}
        <Route
          path="/mode"
          element={
            !user ? <Navigate to="/login" />
              : user.suspended ? <Navigate to="/account-unavailable" />
              : !user.dateOfBirth ? <Navigate to="/age-check" />
                : <ModeSelect />
          }
        />
        <Route
          path="/build"
          element={
            !user ? <Navigate to="/login" />
              : user.suspended ? <Navigate to="/account-unavailable" />
              : !user.dateOfBirth ? <Navigate to="/age-check" />
                : <ProfileBuilder />
          }
        />

        {/* Main app */}
        <Route path="/" element={<Protected><Browse /></Protected>} />
        <Route path="/profile/:id" element={<Protected><ProfileView /></Protected>} />
        <Route path="/matches" element={<Protected><Matches /></Protected>} />
        <Route path="/chat" element={<Protected><Chat /></Protected>} />
        <Route path="/chat/:userId" element={<Protected><Chat /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/plans" element={<Protected><SubscriptionPlans /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="/admin" element={<Protected><Admin /></Protected>} />

        <Route path="*" element={<Navigate to={user ? "/" : "/signup"} replace />} />
      </Routes>
    </>
  );
}
