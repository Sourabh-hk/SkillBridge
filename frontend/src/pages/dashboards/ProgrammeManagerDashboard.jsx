import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function ProgrammeManagerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [batchSummaries, setBatchSummaries] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProgrammeSummary().then(setData).catch((e) => setError(e.message));
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

      {data && (
        <>
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

          <section>
            <h3>Institutions</h3>
            <table>
              <thead>
                <tr><th>Name</th><th>Batches</th><th>Sessions</th><th>Students</th></tr>
              </thead>
              <tbody>
                {data.institutions?.map((inst) => (
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
