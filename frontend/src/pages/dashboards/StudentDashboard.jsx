import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [joinToken, setJoinToken] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [markMsg, setMarkMsg] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSessions().then(setSessions).catch((e) => setError(e.message));
  }, []);

  async function handleJoin(e) {
    e.preventDefault();
    setJoinMsg("");
    try {
      const data = await api.joinBatchByToken(joinToken);
      setJoinMsg(data.msg + (data.batch ? ` — ${data.batch.name}` : ""));
      setJoinToken("");
      const updated = await api.getSessions();
      setSessions(updated);
    } catch (err) {
      setJoinMsg(err.message);
    }
  }

  async function handleMark(sessionId, status) {
    try {
      await api.markAttendance({ session_id: sessionId, status });
      setMarkMsg((m) => ({ ...m, [sessionId]: "Marked: " + status }));
      const updated = await api.getSessions();
      setSessions(updated);
    } catch (err) {
      setMarkMsg((m) => ({ ...m, [sessionId]: err.message }));
    }
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
            required
          />
          <button type="submit">Join</button>
        </form>
        {joinMsg && <p className="msg">{joinMsg}</p>}
      </section>

      <section>
        <h3>My Sessions</h3>
        {error && <p className="error">{error}</p>}
        {sessions.length === 0 ? (
          <p>No sessions found. Join a batch first.</p>
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
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{s.batch_name}</td>
                  <td>{s.date?.split("T")[0]}</td>
                  <td>{s.start_time} – {s.end_time}</td>
                  <td>{s.my_attendance || "—"}</td>
                  <td>
                    {markMsg[s.id] ? (
                      <span className="msg">{markMsg[s.id]}</span>
                    ) : (
                      <span style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => handleMark(s.id, "present")}>Present</button>
                        <button onClick={() => handleMark(s.id, "late")}>Late</button>
                        <button onClick={() => handleMark(s.id, "absent")}>Absent</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
