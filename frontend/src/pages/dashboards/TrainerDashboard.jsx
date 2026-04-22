import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [batchForm, setBatchForm] = useState({ name: "" });
  const [sessionForm, setSessionForm] = useState({
    batch_id: "", title: "", date: "", start_time: "", end_time: "",
  });
  const [inviteLinks, setInviteLinks] = useState({});
  const [attendanceView, setAttendanceView] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [b, s] = await Promise.all([api.getBatches(), api.getSessions()]);
      setBatches(b);
      setSessions(s);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCreateBatch(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api.createBatch(batchForm);
      setMsg("Batch created!");
      setBatchForm({ name: "" });
      loadData();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api.createSession(sessionForm);
      setMsg("Session created!");
      setSessionForm({ batch_id: "", title: "", date: "", start_time: "", end_time: "" });
      loadData();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function handleGenerateInvite(batchId) {
    try {
      const data = await api.generateInvite(batchId);
      setInviteLinks((l) => ({ ...l, [batchId]: data.invite_url }));
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function viewAttendance(sessionId) {
    try {
      const data = await api.getSessionAttendance(sessionId);
      setAttendanceView(sessionId);
      setAttendanceData(data);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="dashboard">
      <h2>Trainer Dashboard</h2>
      <p>Welcome, {user?.name}</p>
      {msg && <p className="msg">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <section>
        <h3>Create Batch</h3>
        <form onSubmit={handleCreateBatch} style={{ display: "flex", gap: 8 }}>
          <input placeholder="Batch name" value={batchForm.name}
            onChange={(e) => setBatchForm({ name: e.target.value })} required />
          <button type="submit">Create</button>
        </form>
      </section>

      <section>
        <h3>My Batches</h3>
        {batches.length === 0 ? <p>No batches yet.</p> : (
          <table>
            <thead><tr><th>Name</th><th>Invite</th></tr></thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>
                    <button onClick={() => handleGenerateInvite(b.id)}>Generate Invite</button>
                    {inviteLinks[b.id] && (
                      <div style={{ marginTop: 4 }}>
                        <code style={{ fontSize: 12 }}>{inviteLinks[b.id]}</code>
                        <br />
                        <small>Token: <strong>{inviteLinks[b.id].split("/").pop()}</strong></small>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Create Session</h3>
        <form onSubmit={handleCreateSession} className="form-grid">
          <select value={sessionForm.batch_id}
            onChange={(e) => setSessionForm({ ...sessionForm, batch_id: e.target.value })} required>
            <option value="">Select batch</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input placeholder="Title" value={sessionForm.title}
            onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} required />
          <input type="date" value={sessionForm.date}
            onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })} required />
          <input type="time" value={sessionForm.start_time}
            onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })} required />
          <input type="time" value={sessionForm.end_time}
            onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })} required />
          <button type="submit">Create Session</button>
        </form>
      </section>

      <section>
        <h3>Sessions & Attendance</h3>
        {sessions.length === 0 ? <p>No sessions yet.</p> : (
          <table>
            <thead>
              <tr><th>Title</th><th>Batch</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{s.batch_name}</td>
                  <td>{s.date?.split("T")[0]}</td>
                  <td>
                    <button onClick={() => viewAttendance(s.id)}>View Attendance</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {attendanceData && (
        <section>
          <h3>Attendance: {attendanceData.session?.title}</h3>
          <table>
            <thead><tr><th>Student</th><th>Email</th><th>Status</th><th>Marked At</th></tr></thead>
            <tbody>
              {attendanceData.attendance?.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.email}</td>
                  <td>{a.status || "—"}</td>
                  <td>{a.marked_at ? new Date(a.marked_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
