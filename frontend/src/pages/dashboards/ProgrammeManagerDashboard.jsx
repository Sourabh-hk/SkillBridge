import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { TableLoader, TableEmpty } from "@/components/ui/spinner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

export default function ProgrammeManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [instPag, setInstPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (page = 1) => {
    try {
      const res = await api.getProgrammeSummary({ page, limit: PAGE_SIZE });
      setStats(res.stats);
      setInstitutions(res.institutions.data);
      setInstPag({ page: res.institutions.page, totalPages: res.institutions.totalPages, total: res.institutions.total });
    } catch (e) { toast.error(e.message); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData(1);
      setLoading(false);
    })();
  }, [loadData]);

  const statCards = [
    { label: "Batches", value: stats?.total_batches ?? 0 },
    { label: "Sessions", value: stats?.total_sessions ?? 0 },
    { label: "Students", value: stats?.total_students ?? 0 },
    { label: "Trainers", value: stats?.total_trainers ?? 0 },
    { label: "Present", value: stats?.total_present ?? 0, color: "text-green-600" },
    { label: "Absent", value: stats?.total_absent ?? 0, color: "text-red-600" },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programme Manager Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <p className={`text-2xl font-bold ${s.color ?? "text-primary"}`}>{loading ? "â€”" : s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Institutions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Institutions
            {!loading && <span className="text-sm font-normal text-muted-foreground ml-2">({instPag.total} total)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Batches</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableLoader colSpan={4} /> : institutions.length === 0 ? <TableEmpty colSpan={4} /> : institutions.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.name}</TableCell>
                  <TableCell>{inst.batches}</TableCell>
                  <TableCell>{inst.sessions}</TableCell>
                  <TableCell>{inst.students}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={instPag.page} totalPages={instPag.totalPages} onPage={loadData} />
        </CardContent>
      </Card>
    </div>
  );
}
