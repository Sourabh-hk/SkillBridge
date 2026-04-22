import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchForm, setBatchForm] = useState({ name: "" });
  const [sessionForm, setSessionForm] = useState({
    batch_id: "", title: "", date: "", start_time: "", end_time: "",
  });
  const [inviteLinks, setInviteLinks] = useState({});
  const [inviteLoading, setInviteLoading] = useState({}); // { [batchId]: bool }
  const [attendanceView, setAttendanceView] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const viewingRef = useRef(false); // prevents concurrent "View Attendance" clicks
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([api.getBatches(), api.getSessions()]);
      setBatches(b);
      setSessions(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBatch(e) {
    e.preventDefault();
    if (batchSubmitting) return;
    setMsg("");
    setBatchSubmitting(true);
    try {
      await api.createBatch(batchForm);
      setMsg("Batch created!");
      setBatchForm({ name: "" });
      loadData();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBatchSubmitting(false);
    }
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    if (sessionSubmitting) return;
    setMsg("");
    setSessionSubmitting(true);
    try {
      await api.createSession(sessionForm);
      setMsg("Session created!");
      setSessionForm({ batch_id: "", title: "", date: "", start_time: "", end_time: "" });
      loadData();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSessionSubmitting(false);
    }
  }

  async function handleGenerateInvite(batchId) {
    if (inviteLoading[batchId]) return;
    setInviteLoading((l) => ({ ...l, [batchId]: true }));
    try {
      const data = await api.generateInvite(batchId);
      setInviteLinks((l) => ({ ...l, [batchId]: data.invite_url }));
    } catch (err) {
      setMsg(err.message);
    } finally {
      setInviteLoading((l) => ({ ...l, [batchId]: false }));
    }
  }

  async function viewAttendance(sessionId) {
    if (viewingRef.current) return;
    viewingRef.current = true;
    setAttendanceLoading(true);
    setAttendanceView(sessionId);
    setAttendanceData(null);
    try {
      const data = await api.getSessionAttendance(sessionId);
      setAttendanceData(data);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setAttendanceLoading(false);
      viewingRef.current = false;
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
            onChange={(e) => setBatchForm({ name: e.target.value })}
            disabled={batchSubmitting} required />
          <button type="submit" disabled={batchSubmitting}>
            {batchSubmitting ? <span className="btn-spinner" /> : "Create"}
          </button>
        </form>
      </section>

      <section>
        <h3>My Batches</h3>
        {loading ? (
          <div className="loader-wrap"><div className="spinner" /></div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Invite</th></tr></thead>
            <tbody>
              {batches.length === 0 ? (
                <tr className="no-data-row"><td colSpan={2}>No data available</td></tr>
              ) : batches.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>
                    <button
                      onClick={() => handleGenerateInvite(b.id)}
                      disabled={!!inviteLoading[b.id]}
                    >
                      {inviteLoading[b.id] ? <span className="btn-spinner" /> : "Generate Invite"}
                    </button>
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
            onChange={(e) => setSessionForm({ ...sessionForm, batch_id: e.target.value })}
            disabled={sessionSubmitting} required>
            <option value="">Select batch</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input placeholder="Title" value={sessionForm.title}
            onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
            disabled={sessionSubmitting} required />
          <input type="date" value={sessionForm.date}
            onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
            disabled={sessionSubmitting} required />
          <input type="time" value={sessionForm.start_time}
            onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
            disabled={sessionSubmitting} required />
          <input type="time" value={sessionForm.end_time}
            onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
            disabled={sessionSubmitting} required />
          <button type="submit" disabled={sessionSubmitting}>
            {sessionSubmitting ? <span className="btn-spinner" /> : "Create Session"}
          </button>
        </form>
      </section>

      <section>
        <h3>Sessions & Attendance</h3>
        {loading ? (
          <div className="loader-wrap"><div className="spinner" /></div>
        ) : (
          <table>
            <thead>
              <tr><th>Title</th><th>Batch</th><th>Date</th><th>Time</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr className="no-data-row"><td colSpan={5}>No data available</td></tr>
              ) : sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{s.batch_name}</td>
                  <td>{s.date?.split("T")[0]}</td>
                  <td>{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</td>
                  <td>
                    <button
                      onClick={() => viewAttendance(s.id)}
                      disabled={attendanceLoading && attendanceView === s.id}
                    >
                      {attendanceLoading && attendanceView === s.id
                        ? <span className="btn-spinner" />
                        : "View Attendance"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {(attendanceView || attendanceLoading) && (
        <section>
          <h3>Attendance{attendanceData ? `: ${attendanceData.session?.title}` : ""}</h3>
          {attendanceLoading ? (
            <div className="loader-wrap"><div className="spinner" /></div>
          ) : attendanceData && (
            <table>
              <thead><tr><th>Student</th><th>Email</th><th>Status</th><th>Marked At</th></tr></thead>
              <tbody>
                {attendanceData.attendance?.length === 0 ? (
                  <tr className="no-data-row"><td colSpan={4}>No data available</td></tr>
                ) : attendanceData.attendance?.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.email}</td>
                    <td>
                      {a.status
                        ? <span className={`badge badge-${a.status}`}>{a.status}</span>
                        : "—"}
                    </td>
                    <td>{a.marked_at ? new Date(a.marked_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}

