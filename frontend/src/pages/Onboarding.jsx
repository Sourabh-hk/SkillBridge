import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "student", label: "Student", icon: "🎓", desc: "View sessions and mark attendance" },
  { value: "trainer", label: "Trainer", icon: "🧑‍🏫", desc: "Create sessions and manage batches" },
  { value: "institution", label: "Institution", icon: "🏫", desc: "Manage trainers and view summaries" },
  { value: "programme_manager", label: "Programme Manager", icon: "📋", desc: "Oversee institutions and regional data" },
  { value: "monitoring_officer", label: "Monitoring Officer", icon: "👁️", desc: "Read-only access across the programme" },
];

export default function Onboarding() {
  const { isLoaded, isSignedIn } = useUser();
  const { syncUser, needsOnboarding } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Already synced — skip onboarding
  if (isLoaded && isSignedIn && !needsOnboarding) {
    navigate("/dashboard");
    return null;
  }

  // Not signed in via Clerk at all
  if (isLoaded && !isSignedIn) {
    navigate("/signup");
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await syncUser(role);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to set role. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <h2>Welcome to SkillBridge</h2>
        <p className="onboarding-subtitle">
          Choose your role to complete setup. This <strong>cannot be changed</strong> later.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="role-grid">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`role-card${role === r.value ? " role-card--selected" : ""}`}
                onClick={() => setRole(r.value)}
              >
                <span className="role-card__icon">{r.icon}</span>
                <span className="role-card__label">{r.label}</span>
                <span className="role-card__desc">{r.desc}</span>
              </button>
            ))}
          </div>

          {error && <p className="error" style={{ marginTop: "1rem" }}>{error}</p>}

          <button type="submit" className="onboarding-submit" disabled={loading}>
            {loading ? "Setting up…" : `Continue as ${ROLES.find((r) => r.value === role)?.label}`}
          </button>
        </form>
      </div>
    </div>
  );
}
