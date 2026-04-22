import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import JoinBatch from "./pages/JoinBatch";
import "./App.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not set in .env");
}

function PrivateRoute({ children }) {
  const { user, loading, needsOnboarding } = useAuth();
  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;
  if (needsOnboarding) return <Navigate to="/onboarding" />;
  return user ? children : <Navigate to="/login" />;
}

function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <nav className="navbar">
      <span>
        <strong>SkillBridge</strong> — {user.name} ({user.role.replace("_", " ")})
      </span>
      <button onClick={logout}>Logout</button>
    </nav>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/login">
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/login/*" element={<Login />} />
            <Route path="/signup/*" element={<Signup />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/join/:token" element={<JoinBatch />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ClerkProvider>
  );
}

export default App;

