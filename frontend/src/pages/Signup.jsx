import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "trainer", label: "Trainer" },
  { value: "institution", label: "Institution" },
  { value: "programme_manager", label: "Programme Manager" },
  { value: "monitoring_officer", label: "Monitoring Officer" },
];

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.signup(form);
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h2>Sign Up — SkillBridge</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <select name="role" value={form.role} onChange={handleChange}>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? "Creating..." : "Sign Up"}</button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
