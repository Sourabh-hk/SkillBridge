import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import JoinBatch from "./pages/JoinBatch";
import { PageLoader } from "./components/ui/spinner";
import { Button } from "./components/ui/button";
import { Separator } from "./components/ui/separator";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not set in .env");
}

function PrivateRoute({ children }) {
  const { user, loading, needsOnboarding } = useAuth();
  if (loading) return <PageLoader />;
  if (needsOnboarding) return <Navigate to="/onboarding" />;
  return user ? children : <Navigate to="/login" />;
}

function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <>
      <nav className="flex items-center justify-between px-6 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-primary">SkillBridge</span>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm text-muted-foreground capitalize">
            {user.name} · {user.role.replace("_", " ")}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          Logout
        </Button>
      </nav>
    </>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/login">
      <AuthProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
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

