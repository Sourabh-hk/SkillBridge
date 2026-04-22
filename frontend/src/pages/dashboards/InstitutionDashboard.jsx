import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function InstitutionDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [batchSummaries, setBatchSummaries] = useState({});
  const [batchLoading, setBatchLoading] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) {
      api.getInstitutionSummary(user.id)
        .then(setSummary)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [user]);

  async function viewBatchSummary(batchId) {
    setBatchLoading((prev) => ({ ...prev, [batchId]: true }));
    try {
      const data = await api.getBatchSummary(batchId);
      setBatchSummaries((prev) => ({ ...prev, [batchId]: data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBatchLoading((prev) => ({ ...prev, [batchId]: false }));
    }
  }

  return (
    <div className="dashboard">
      <h2>Institution Dashboard</h2>
      <p>Welcome, {user?.name}</p>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="loader-wrap"><div className="spinner" /></div>
      ) : !summary ? (
        <p className="error">Could not load institution data.</p>
      ) : (
        <>
          <section>
            <h3>Overview</h3>
            <div className="stats-grid">
              <div className="stat-card"><strong>{summary.stats?.total_sessions ?? 0}</strong><span>Sessions</span></div>
              <div className="stat-card"><strong>{summary.stats?.total_students ?? 0}</strong><span>Students</span></div>
              <div className="stat-card"><strong>{summary.stats?.total_present ?? 0}</strong><span>Present</span></div>
              <div className="stat-card"><strong>{summary.stats?.total_absent ?? 0}</strong><span>Absent</span></div>
              <div className="stat-card"><strong>{summary.stats?.total_late ?? 0}</strong><span>Late</span></div>
            </div>
          </section>

          <section>
            <h3>Trainers</h3>
            <table>
              <thead><tr><th>Name</th><th>Email</th></tr></thead>
              <tbody>
                {!summary.trainers?.length ? (
                  <tr className="no-data-row"><td colSpan={2}>No data available</td></tr>
                ) : summary.trainers.map((t) => (
                  <tr key={t.id}><td>{t.name}</td><td>{t.email}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h3>Batches</h3>
            <table>
              <thead><tr><th>Name</th><th>Created</th><th>Summary</th></tr></thead>
              <tbody>
                {!summary.batches?.length ? (
                  <tr className="no-data-row"><td colSpan={3}>No data available</td></tr>
                ) : summary.batches.map((b) => (
                  <>
                    <tr key={b.id}>
                      <td>{b.name}</td>
                      <td>{b.created_at?.split("T")[0]}</td>
                      <td>
                        <button onClick={() => viewBatchSummary(b.id)}>View Summary</button>
                      </td>
                    </tr>
                    {batchLoading[b.id] && (
                      <tr>
                        <td colSpan={3}>
                          <div className="loader-wrap"><div className="spinner" /></div>
                        </td>
                      </tr>
                    )}
                    {batchSummaries[b.id] && (
                      <tr>
                        <td colSpan={3}>
                          <strong>Total sessions: {batchSummaries[b.id].total_sessions}</strong>
                          <table style={{ marginTop: 8 }}>
                            <thead><tr><th>Student</th><th>Present</th><th>Absent</th><th>Late</th></tr></thead>
                            <tbody>
                              {!batchSummaries[b.id].students?.length ? (
                                <tr className="no-data-row"><td colSpan={4}>No data available</td></tr>
                              ) : batchSummaries[b.id].students.map((s) => (
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
          </section>
        </>
      )}
    </div>
  );
}

