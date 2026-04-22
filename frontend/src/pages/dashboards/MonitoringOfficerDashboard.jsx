import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Spinner, TableLoader, TableEmpty } from "@/components/ui/spinner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

export default function MonitoringOfficerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionPag, setSessionPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [attendanceView, setAttendanceView] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attPag, setAttPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const viewingRef = useRef(false);

  const loadSessions = useCallback(async (page = 1) => {
    try {
      const res = await api.getSessions({ page, limit: PAGE_SIZE });
      setSessions(res.data);
      setSessionPag({ page: res.page, totalPages: res.totalPages, total: res.total });
    } catch (e) { toast.error(e.message); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [summary] = await Promise.all([
          api.getProgrammeSummary({ page: 1, limit: 1 }),
          loadSessions(1),
        ]);
        setStats(summary.stats);
      } catch (e) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, [loadSessions]);

  async function viewAttendance(sessionId, page = 1) {
    if (viewingRef.current) return;
    viewingRef.current = true;
    setAttendanceLoading(true);
    setAttendanceView(sessionId);
    try {
      const d = await api.getSessionAttendance(sessionId, { page, limit: PAGE_SIZE });
      setAttendanceData(d);
      setAttPag({ page: d.page, totalPages: d.totalPages, total: d.total });
    } catch (err) { toast.error(err.message); }
    finally { setAttendanceLoading(false); viewingRef.current = false; }
  }

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
        <h1 className="text-2xl font-bold">Monitoring Officer Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name} â€” Read-only access</p>
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

      {/* All Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            All Sessions
            {!loading && <span className="text-sm font-normal text-muted-foreground ml-2">({sessionPag.total} total)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableLoader colSpan={5} /> : sessions.length === 0 ? <TableEmpty colSpan={5} /> : sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.batch_name}</TableCell>
                  <TableCell>{s.date?.split("T")[0]}</TableCell>
                  <TableCell className="whitespace-nowrap">{s.start_time?.slice(0, 5)} â€“ {s.end_time?.slice(0, 5)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => viewAttendance(s.id, 1)}
                      disabled={attendanceLoading && attendanceView === s.id}
                    >
                      {attendanceLoading && attendanceView === s.id ? <Spinner size="sm" /> : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={sessionPag.page} totalPages={sessionPag.totalPages} onPage={loadSessions} />
        </CardContent>
      </Card>

      {/* Attendance Panel */}
      {attendanceView && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Attendance{attendanceData?.session ? `: ${attendanceData.session.title}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceLoading ? (
                  <TableLoader colSpan={3} />
                ) : !attendanceData || attendanceData.data.length === 0 ? (
                  <TableEmpty colSpan={3} />
                ) : attendanceData.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>
                      {a.status ? <Badge variant={a.status}>{a.status}</Badge> : <span className="text-muted-foreground">â€”</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={attPag.page}
              totalPages={attPag.totalPages}
              onPage={(p) => viewAttendance(attendanceView, p)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
