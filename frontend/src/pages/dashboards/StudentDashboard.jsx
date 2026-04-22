import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Spinner, TableLoader, TableEmpty } from "@/components/ui/spinner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

/** Returns 'active' | 'upcoming' | 'ended' based on current local time vs session window */
function getSessionWindowStatus(s) {
  const now = new Date();
  const dateStr = (s.date ?? "").split("T")[0];
  const startStr = (s.start_time ?? "").slice(0, 8);
  const endStr   = (s.end_time   ?? "").slice(0, 8);
  if (!dateStr || !startStr || !endStr) return "unknown";
  const start = new Date(`${dateStr}T${startStr}`);
  const end   = new Date(`${dateStr}T${endStr}`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "unknown";
  if (now < start) return "upcoming";
  if (now > end)   return "ended";
  return "active";
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [joinToken, setJoinToken] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [marking, setMarking] = useState({});
  const markingRef = useRef({});

  const loadSessions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.getSessions({ page, limit: PAGE_SIZE });
      setSessions(res.data);
      setPagination({ page: res.page, totalPages: res.totalPages, total: res.total });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(1); }, [loadSessions]);

  async function handleJoin(e) {
    e.preventDefault();
    setJoinLoading(true);
    try {
      const data = await api.joinBatchByToken(joinToken);
      toast.success(data.msg + (data.batch ? ` — ${data.batch.name}` : ""));
      setJoinToken("");
      loadSessions(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleMark(sessionId, status) {
    if (markingRef.current[sessionId]) return;
    markingRef.current[sessionId] = status;
    setMarking((m) => ({ ...m, [sessionId]: status }));
    try {
      await api.markAttendance({ session_id: sessionId, status });
      setSessions((prev) =>
        prev.map((s) => s.id === sessionId ? { ...s, my_attendance: status } : s)
      );
      toast.success(`Marked as ${status}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      delete markingRef.current[sessionId];
      setMarking((m) => { const n = { ...m }; delete n[sessionId]; return n; });
    }
  }

  function renderActionCell(s) {
    if (s.my_attendance) {
      return <Badge variant={s.my_attendance}>{s.my_attendance}</Badge>;
    }
    const winStatus = getSessionWindowStatus(s);
    if (winStatus === "active") {
      const busy = marking[s.id];
      return (
        <div className="flex gap-1.5">
          {["present", "late", "absent"].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={st === "absent" ? "destructive" : st === "late" ? "secondary" : "default"}
              onClick={() => handleMark(s.id, st)}
              disabled={!!busy}
              className="min-w-16"
            >
              {busy === st ? <Spinner size="sm" className="text-white" /> : st.charAt(0).toUpperCase() + st.slice(1)}
            </Button>
          ))}
        </div>
      );
    }
    if (winStatus === "upcoming") return <Badge variant="upcoming">Not started yet</Badge>;
    return <Badge variant="ended">Session ended</Badge>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name}</p>
      </div>

      {/* Join Batch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Join a Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="flex gap-2">
            <Input
              placeholder="Paste invite token"
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              disabled={joinLoading}
              required
              className="max-w-sm"
            />
            <Button type="submit" disabled={joinLoading}>
              {joinLoading ? <><Spinner size="sm" className="mr-2 text-white" />Joining…</> : "Join"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            My Sessions
            {!loading && <span className="text-sm font-normal text-muted-foreground ml-2">({pagination.total} total)</span>}
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
                <TableHead>Your Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoader colSpan={6} />
              ) : sessions.length === 0 ? (
                <TableEmpty colSpan={6} />
              ) : sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.batch_name}</TableCell>
                  <TableCell>{s.date?.split("T")[0]}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                  </TableCell>
                  <TableCell>
                    {s.my_attendance
                      ? <Badge variant={s.my_attendance}>{s.my_attendance}</Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{renderActionCell(s)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPage={(p) => loadSessions(p)}
          />
        </CardContent>
      </Card>
    </div>
  );
}


