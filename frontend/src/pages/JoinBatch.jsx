import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function JoinBatch() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Joining batch...");

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/join/${token}`);
      return;
    }
    if (user.role !== "student") {
      setMsg("Only students can join batches via invite links.");
      return;
    }
    api.joinBatchByToken(token)
      .then((data) => {
        setMsg(data.msg + (data.batch ? ` — ${data.batch.name}` : ""));
        setTimeout(() => navigate("/dashboard"), 2000);
      })
      .catch((err) => setMsg(err.message));
  }, [token, user]);

  return (
    <div className="auth-container">
      <h2>Joining Batch...</h2>
      <p>{msg}</p>
    </div>
  );
}
