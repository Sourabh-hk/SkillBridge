import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function MonitoringOfficerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [attendanceView, setAttendanceView] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getProgrammeSummary(), api.getSessions()])
      .then(([summary, sess]) => {
        setData(summary);
        setSessions(sess);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function viewAttendance(sessionId) {
    try {
      const d = await api.getSessionAttendance(sessionId);
      setAttendanceView(sessionId);
      setAttendanceData(d);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="dashboard">
      <h2>Monitoring Officer Dashboard</h2>
      <p>Welcome, {user?.name} — Read-only access</p>
      {error && <p className="error">{error}</p>}

      {data && (
        <section>
          <h3>Programme Overview</h3>
          <div className="stats-grid">
            <div className="stat-card"><strong>{data.stats?.total_batches}</strong><span>Batches</span></div>
            <div className="stat-card"><strong>{data.stats?.total_sessions}</strong><span>Sessions</span></div>
            <div className="stat-card"><strong>{data.stats?.total_students}</strong><span>Students</span></div>
            <div className="stat-card"><strong>{data.stats?.total_trainers}</strong><span>Trainers</span></div>
            <div className="stat-card"><strong>{data.stats?.total_present}</strong><span>Present</span></div>
            <div className="stat-card"><strong>{data.stats?.total_absent}</strong><span>Absent</span></div>
          </div>
        </section>
      )}

      <section>
        <h3>All Sessions</h3>
        {sessions.length === 0 ? <p>No sessions.</p> : (
          <table>
            <thead>
              <tr><th>Title</th><th>Batch</th><th>Date</th><th>View Attendance</th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td>{s.batch_name}</td>
                  <td>{s.date?.split("T")[0]}</td>
                  <td><button onClick={() => viewAttendance(s.id)}>View</button></td>
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
            <thead><tr><th>Student</th><th>Email</th><th>Status</th></tr></thead>
            <tbody>
              {attendanceData.attendance?.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.email}</td>
                  <td>{a.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
