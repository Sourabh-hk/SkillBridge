import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import JoinBatch from "./pages/JoinBatch";
import "./App.css";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;
  return user ? children : <Navigate to="/login" />;
}

function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <nav className="navbar">
      <span>
        <strong>SkillBridge</strong> {user.name} ({user.role})
      </span>
      <button onClick={logout}>Logout</button>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/join/:token" element={<JoinBatch />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
