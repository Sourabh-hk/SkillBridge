import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function MonitoringOfficerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceView, setAttendanceView] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getProgrammeSummary(), api.getSessions()])
      .then(([summary, sess]) => {
        setData(summary);
        setSessions(sess);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function viewAttendance(sessionId) {
    setAttendanceLoading(true);
    setAttendanceView(sessionId);
    setAttendanceData(null);
    try {
      const d = await api.getSessionAttendance(sessionId);
      setAttendanceData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  }

  return (
    <div className="dashboard">
      <h2>Monitoring Officer Dashboard</h2>
      <p>Welcome, {user?.name} — Read-only access</p>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="loader-wrap"><div className="spinner" /></div>
      ) : (
        <>
          {data && (
            <section>
              <h3>Programme Overview</h3>
              <div className="stats-grid">
                <div className="stat-card"><strong>{data.stats?.total_batches ?? 0}</strong><span>Batches</span></div>
                <div className="stat-card"><strong>{data.stats?.total_sessions ?? 0}</strong><span>Sessions</span></div>
                <div className="stat-card"><strong>{data.stats?.total_students ?? 0}</strong><span>Students</span></div>
                <div className="stat-card"><strong>{data.stats?.total_trainers ?? 0}</strong><span>Trainers</span></div>
                <div className="stat-card"><strong>{data.stats?.total_present ?? 0}</strong><span>Present</span></div>
                <div className="stat-card"><strong>{data.stats?.total_absent ?? 0}</strong><span>Absent</span></div>
              </div>
            </section>
          )}

          <section>
            <h3>All Sessions</h3>
            <table>
              <thead>
                <tr><th>Title</th><th>Batch</th><th>Date</th><th>Time</th><th>View Attendance</th></tr>
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
                    <td><button onClick={() => viewAttendance(s.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {(attendanceView || attendanceLoading) && (
            <section>
              <h3>Attendance{attendanceData ? `: ${attendanceData.session?.title}` : ""}</h3>
              {attendanceLoading ? (
                <div className="loader-wrap"><div className="spinner" /></div>
              ) : attendanceData && (
                <table>
                  <thead><tr><th>Student</th><th>Email</th><th>Status</th></tr></thead>
                  <tbody>
                    {attendanceData.attendance?.length === 0 ? (
                      <tr className="no-data-row"><td colSpan={3}>No data available</td></tr>
                    ) : attendanceData.attendance?.map((a) => (
                      <tr key={a.id}>
                        <td>{a.name}</td>
                        <td>{a.email}</td>
                        <td>
                          {a.status
                            ? <span className={`badge badge-${a.status}`}>{a.status}</span>
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

