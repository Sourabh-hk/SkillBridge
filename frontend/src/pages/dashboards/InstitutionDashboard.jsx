import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Spinner, TableLoader, TableEmpty } from "@/components/ui/spinner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

export default function InstitutionDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approving, setApproving] = useState({});
  const [trainers, setTrainers] = useState([]);
  const [trainerPag, setTrainerPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [batches, setBatches] = useState([]);
  const [batchPag, setBatchPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [batchSummaries, setBatchSummaries] = useState({});
  const [batchLoading, setBatchLoading] = useState({});

  const loadSummary = useCallback(async (page = 1) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await api.getInstitutionSummary(user.id, { page, limit: PAGE_SIZE });
      setStats(res.stats);
      setTrainers(res.trainers.data);
      setTrainerPag({ page: res.trainers.page, totalPages: res.trainers.totalPages, total: res.trainers.total });
      setBatches(res.batches.data);
      setBatchPag({ page: res.batches.page, totalPages: res.batches.totalPages, total: res.batches.total });
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [user]);

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.getApprovalRequests();
      setPendingRequests(res.data || []);
    } catch (e) {
      toast.error(e.message);
    }
  }, []);

  useEffect(() => {
    loadSummary(1);
    loadRequests();
  }, [loadSummary, loadRequests]);

  async function handleApprove(requestId) {
    if (approving[requestId]) return;
    setApproving((prev) => ({ ...prev, [requestId]: true }));
    try {
      await api.approveRequest(requestId);
      toast.success("Trainer approved");
      await Promise.all([loadRequests(), loadSummary(1)]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApproving((prev) => ({ ...prev, [requestId]: false }));
    }
  }

  async function viewBatchSummary(batchId) {
    setBatchLoading((prev) => ({ ...prev, [batchId]: true }));
    try {
      const data = await api.getBatchSummary(batchId);
      setBatchSummaries((prev) => ({ ...prev, [batchId]: data }));
    } catch (err) { toast.error(err.message); }
    finally { setBatchLoading((prev) => ({ ...prev, [batchId]: false })); }
  }

  const statCards = [
    { label: "Sessions", value: stats?.total_sessions ?? 0 },
    { label: "Students", value: stats?.total_students ?? 0 },
    { label: "Present", value: stats?.total_present ?? 0, color: "text-green-600" },
    { label: "Absent", value: stats?.total_absent ?? 0, color: "text-red-600" },
    { label: "Late", value: stats?.total_late ?? 0, color: "text-yellow-600" },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Institution Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <p className={`text-3xl font-bold ${s.color ?? "text-primary"}`}>{loading ? "â€”" : s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trainers */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Pending Trainer Approvals
              {!loading && <span className="text-sm font-normal text-muted-foreground ml-2">({pendingRequests.length} pending)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.created_at?.split("T")[0]}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(r.id)}
                        disabled={!!approving[r.id]}
                      >
                        {approving[r.id] ? <Spinner size="sm" className="text-white" /> : "Approve"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Trainers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Trainers
            {!loading && <span className="text-sm font-normal text-muted-foreground ml-2">({trainerPag.total} total)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableLoader colSpan={2} /> : trainers.length === 0 ? <TableEmpty colSpan={2} /> : trainers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={trainerPag.page} totalPages={trainerPag.totalPages} onPage={loadSummary} />
        </CardContent>
      </Card>

      {/* Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Batches
            {!loading && <span className="text-sm font-normal text-muted-foreground ml-2">({batchPag.total} total)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableLoader colSpan={3} /> : batches.length === 0 ? <TableEmpty colSpan={3} /> : batches.map((b) => (
                <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.created_at?.split("T")[0]}</TableCell>
                    <TableCell>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => viewBatchSummary(b.id)}
                        disabled={!!batchLoading[b.id]}
                      >
                        {batchLoading[b.id] ? <Spinner size="sm" /> : "View Summary"}
                      </Button>
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {batches.map((b) => (
            batchSummaries[b.id] ? (
              <div key={`${b.id}-summary`} className="mt-3 rounded-md border bg-muted/30 p-4">
                <p className="text-sm font-semibold mb-2">
                  {b.name} - Total sessions: {batchSummaries[b.id].total_sessions}
                </p>
                {batchSummaries[b.id].students?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead>Late</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchSummaries[b.id].students.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell className="text-green-600">{s.present}</TableCell>
                          <TableCell className="text-red-600">{s.absent}</TableCell>
                          <TableCell className="text-yellow-600">{s.late}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No students enrolled.</p>
                )}
              </div>
            ) : null
          ))}
          <Pagination page={batchPag.page} totalPages={batchPag.totalPages} onPage={loadSummary} />
        </CardContent>
      </Card>
    </div>
  );
}
