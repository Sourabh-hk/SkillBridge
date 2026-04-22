import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function ProgrammeManagerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [batchSummaries, setBatchSummaries] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProgrammeSummary()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function viewBatchSummary(batchId) {
    try {
      const s = await api.getBatchSummary(batchId);
      setBatchSummaries((prev) => ({ ...prev, [batchId]: s }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="dashboard">
      <h2>Programme Manager Dashboard</h2>
      <p>Welcome, {user?.name}</p>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="loader-wrap"><div className="spinner" /></div>
      ) : !data ? (
        <p className="error">Could not load programme data.</p>
      ) : (
        <>
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

          <section>
            <h3>Institutions</h3>
            <table>
              <thead>
                <tr><th>Name</th><th>Batches</th><th>Sessions</th><th>Students</th></tr>
              </thead>
              <tbody>
                {!data.institutions?.length ? (
                  <tr className="no-data-row"><td colSpan={4}>No data available</td></tr>
                ) : data.institutions.map((inst) => (
                  <tr key={inst.id}>
                    <td>{inst.name}</td>
                    <td>{inst.batches}</td>
                    <td>{inst.sessions}</td>
                    <td>{inst.students}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

