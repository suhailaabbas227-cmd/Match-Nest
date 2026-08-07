import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Navbar from "./components/Navbar";

import Signup from "./pages/Signup";
import Verify from "./pages/Verify";
import Login from "./pages/Login";
import ModeSelect from "./pages/ModeSelect";
import ProfileBuilder from "./pages/ProfileBuilder";
import Browse from "./pages/Browse";
import ProfileView from "./pages/ProfileView";
import Matches from "./pages/Matches";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";

// Gate that also routes the user to the correct onboarding step.
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Navigate to="/signup" replace />;
  if (!user.mode) return <Navigate to="/mode" replace />;
  if (!user.profileComplete) return <Navigate to="/build" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;

  return (
    <>
      {user && user.mode && user.profileComplete && <Navbar />}
      <Routes>
        <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

        {/* Onboarding (logged in but not finished) */}
        <Route path="/mode" element={user ? <ModeSelect /> : <Navigate to="/login" />} />
        <Route path="/build" element={user ? <ProfileBuilder /> : <Navigate to="/login" />} />

        {/* Main app */}
        <Route path="/" element={<Protected><Browse /></Protected>} />
        <Route path="/profile/:id" element={<Protected><ProfileView /></Protected>} />
        <Route path="/matches" element={<Protected><Matches /></Protected>} />
        <Route path="/chat" element={<Protected><Chat /></Protected>} />
        <Route path="/chat/:userId" element={<Protected><Chat /></Protected>} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/admin" element={<Protected><Admin /></Protected>} />

        <Route path="*" element={<Navigate to={user ? "/" : "/signup"} replace />} />
      </Routes>
    </>
  );
}
