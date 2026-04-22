import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function InstitutionDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [batchSummaries, setBatchSummaries] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) {
      api.getInstitutionSummary(user.id)
        .then(setSummary)
        .catch((e) => setError(e.message));
    }
  }, [user]);

  async function viewBatchSummary(batchId) {
    try {
      const data = await api.getBatchSummary(batchId);
      setBatchSummaries((prev) => ({ ...prev, [batchId]: data }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="dashboard">
      <h2>Institution Dashboard</h2>
      <p>Welcome, {user?.name}</p>
      {error && <p className="error">{error}</p>}

      {summary && (
        <>
          <section>
            <h3>Overview</h3>
            <div className="stats-grid">
              <div className="stat-card"><strong>{summary.stats?.total_sessions}</strong><span>Sessions</span></div>
              <div className="stat-card"><strong>{summary.stats?.total_students}</strong><span>Students</span></div>
              <div className="stat-card"><strong>{summary.stats?.total_present}</strong><span>Present</span></div>
              <div className="stat-card"><strong>{summary.stats?.total_absent}</strong><span>Absent</span></div>
              <div className="stat-card"><strong>{summary.stats?.total_late}</strong><span>Late</span></div>
            </div>
          </section>

          <section>
            <h3>Trainers</h3>
            {summary.trainers?.length === 0 ? <p>No trainers linked.</p> : (
              <table>
                <thead><tr><th>Name</th><th>Email</th></tr></thead>
                <tbody>
                  {summary.trainers?.map((t) => (
                    <tr key={t.id}><td>{t.name}</td><td>{t.email}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h3>Batches</h3>
            {summary.batches?.length === 0 ? <p>No batches yet.</p> : (
              <table>
                <thead><tr><th>Name</th><th>Created</th><th>Summary</th></tr></thead>
                <tbody>
                  {summary.batches?.map((b) => (
                    <>
                      <tr key={b.id}>
                        <td>{b.name}</td>
                        <td>{b.created_at?.split("T")[0]}</td>
                        <td>
                          <button onClick={() => viewBatchSummary(b.id)}>View Summary</button>
                        </td>
                      </tr>
                      {batchSummaries[b.id] && (
                        <tr>
                          <td colSpan={3}>
                            <strong>Total sessions: {batchSummaries[b.id].total_sessions}</strong>
                            <table style={{ marginTop: 8 }}>
                              <thead><tr><th>Student</th><th>Present</th><th>Absent</th><th>Late</th></tr></thead>
                              <tbody>
                                {batchSummaries[b.id].students?.map((s) => (
                                  <tr key={s.id}>
                                    <td>{s.name}</td>
                                    <td>{s.present}</td>
                                    <td>{s.absent}</td>
                                    <td>{s.late}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
