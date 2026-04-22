import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function JoinBatch() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    // Wait until auth is fully resolved before acting
    if (loading) return;

    if (!user) {
      // Preserve the invite URL so Clerk redirects back after login
      navigate(`/login?redirect=/join/${token}`, { replace: true });
      return;
    }
    if (user.role !== "student") {
      setMsg("Only students can join batches via invite links.");
      return;
    }
    if (joined) return; // prevent double-call on re-renders
    setJoined(true);
    setMsg("Joining batch...");
    api.joinBatchByToken(token)
      .then((data) => {
        setMsg(data.msg + (data.batch ? ` — ${data.batch.name}` : ""));
        setTimeout(() => navigate("/dashboard"), 2000);
      })
      .catch((err) => setMsg(err.message));
  }, [token, user, loading]);

  return (
    <div className="auth-container">
      <h2>Join Batch</h2>
      <p>{loading ? "Checking authentication..." : msg || "Processing..."}</p>
    </div>
  );
}
