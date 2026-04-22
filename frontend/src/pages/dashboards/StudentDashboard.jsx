import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

/** Returns 'active' | 'upcoming' | 'ended' based on current local time vs session window */
function getSessionWindowStatus(s) {
  const now = new Date();
  // s.date is a plain "YYYY-MM-DD" string (pg type-parser set to string).
  // s.start_time / s.end_time are plain "HH:MM:SS" strings.
  // Slice to 5 chars ("HH:MM") ensures no microsecond suffix causes Invalid Date.
  const dateStr = (s.date ?? "").split("T")[0];
  const startStr = (s.start_time ?? "").slice(0, 8);
  const endStr   = (s.end_time   ?? "").slice(0, 8);
  if (!dateStr || !startStr || !endStr) return "unknown";
  const start = new Date(`${dateStr}T${startStr}`);
  const end   = new Date(`${dateStr}T${endStr}`);
  // Guard against Invalid Date (bad data) — treat as unknown rather than falsely "active"
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "unknown";
  if (now < start) return "upcoming";
  if (now > end)   return "ended";
  return "active";
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinToken, setJoinToken] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [markMsg, setMarkMsg] = useState({});
  const [marking, setMarking] = useState({}); // { [sessionId]: status } — drives spinner UI
  const markingRef = useRef({});              // synchronous guard — prevents double-fire
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSessions()
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleJoin(e) {
    e.preventDefault();
    setJoinMsg("");
    setJoinLoading(true);
    try {
      const data = await api.joinBatchByToken(joinToken);
      setJoinMsg(data.msg + (data.batch ? ` — ${data.batch.name}` : ""));
      setJoinToken("");
      const updated = await api.getSessions();
      setSessions(updated);
    } catch (err) {
      setJoinMsg(err.message);
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleMark(sessionId, status) {
    // Ref-based guard is synchronous — blocks double-clicks even before re-render
    if (markingRef.current[sessionId]) return;
    markingRef.current[sessionId] = status;
    setMarking((m) => ({ ...m, [sessionId]: status }));
    setMarkMsg((m) => { const n = { ...m }; delete n[sessionId]; return n; });
    try {
      await api.markAttendance({ session_id: sessionId, status });

      // Optimistically update local session state immediately so the badge
      // appears even if the background getSessions() call fails.
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, my_attendance: status } : s
        )
      );

      // Background refresh to sync any other changes
      api.getSessions().then(setSessions).catch(() => {});

      setMarkMsg((m) => ({ ...m, [sessionId]: { text: "Marked: " + status, isError: false } }));
      // Clear success message after 3 s — badge from my_attendance will take over
      setTimeout(() => {
        setMarkMsg((m) => { const n = { ...m }; delete n[sessionId]; return n; });
      }, 3000);
    } catch (err) {
      setMarkMsg((m) => ({ ...m, [sessionId]: { text: err.message, isError: true } }));
    } finally {
      delete markingRef.current[sessionId];
      setMarking((m) => { const n = { ...m }; delete n[sessionId]; return n; });
    }
  }

  function renderActionCell(s) {
    const msg = markMsg[s.id];
    if (msg) {
      return <span className={msg.isError ? "error" : "msg"}>{msg.text}</span>;
    }
    if (s.my_attendance) {
      return (
        <span className={`badge badge-${s.my_attendance}`}>{s.my_attendance}</span>
      );
    }
    const winStatus = getSessionWindowStatus(s);
    if (winStatus === "active") {
      const busy = marking[s.id];
      return (
        <span style={{ display: "flex", gap: 4 }}>
          {["present", "late", "absent"].map((st) => (
            <button
              key={st}
              onClick={() => handleMark(s.id, st)}
              disabled={!!busy}
              style={{ opacity: busy && busy !== st ? 0.5 : 1, minWidth: 64 }}
            >
              {busy === st
                ? <span className="btn-spinner" />
                : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </span>
      );
    }
    if (winStatus === "upcoming") {
      return <span className="session-upcoming">Not started yet</span>;
    }
    return <span className="session-ended">Session ended</span>;
  }

  return (
    <div className="dashboard">
      <h2>Student Dashboard</h2>
      <p>Welcome, {user?.name}</p>

      <section>
        <h3>Join a Batch</h3>
        <form onSubmit={handleJoin} style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Paste invite token"
            value={joinToken}
            onChange={(e) => setJoinToken(e.target.value)}
            disabled={joinLoading}
            required
          />
          <button type="submit" disabled={joinLoading}>
            {joinLoading ? <span className="btn-spinner" /> : "Join"}
          </button>
        </form>
        {joinMsg && <p className="msg">{joinMsg}</p>}
      </section>

      <section>
        <h3>My Sessions</h3>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <div className="loader-wrap"><div className="spinner" /></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Batch</th>
                <th>Date</th>
                <th>Time</th>
                <th>Your Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr className="no-data-row"><td colSpan={6}>No data available</td></tr>
              ) : sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{s.batch_name}</td>
                  <td>{s.date?.split("T")[0]}</td>
                  <td>{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</td>
                  <td>
                    {s.my_attendance
                      ? <span className={`badge badge-${s.my_attendance}`}>{s.my_attendance}</span>
                      : "—"}
                  </td>
                  <td>{renderActionCell(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

