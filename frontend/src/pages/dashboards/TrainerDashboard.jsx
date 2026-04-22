import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Spinner, TableLoader, TableEmpty } from "@/components/ui/spinner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [batchPag, setBatchPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [sessionPag, setSessionPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [allBatches, setAllBatches] = useState([]); // for session form select
  const [batchForm, setBatchForm] = useState({ name: "" });
  const [sessionForm, setSessionForm] = useState({ batch_id: "", title: "", date: "", start_time: "", end_time: "" });
  const [inviteLinks, setInviteLinks] = useState({});
  const [inviteLoading, setInviteLoading] = useState({});
  const [copiedBatch, setCopiedBatch] = useState(null);
  const [attendanceView, setAttendanceView] = useState(null); // session id
  const [attendanceData, setAttendanceData] = useState(null); // { session, data, totalPages, ... }
  const [attPag, setAttPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const viewingRef = useRef(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [sessionSubmitting, setSessionSubmitting] = useState(false);

  const loadBatches = useCallback(async (page = 1) => {
    setBatchesLoading(true);
    try {
      const res = await api.getBatches({ page, limit: PAGE_SIZE });
      setBatches(res.data);
      setBatchPag({ page: res.page, totalPages: res.totalPages, total: res.total });
    } catch (e) { toast.error(e.message); }
    finally { setBatchesLoading(false); }
  }, []);

  const loadSessions = useCallback(async (page = 1) => {
    setSessionsLoading(true);
    try {
      const res = await api.getSessions({ page, limit: PAGE_SIZE });
      setSessions(res.data);
      setSessionPag({ page: res.page, totalPages: res.totalPages, total: res.total });
    } catch (e) { toast.error(e.message); }
    finally { setSessionsLoading(false); }
  }, []);

  // Load all batches (unpaginated, small list) for session-form dropdown
  const loadAllBatches = useCallback(async () => {
    try {
      const res = await api.getBatches({ page: 1, limit: 100 });
      setAllBatches(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadBatches(1);
    loadSessions(1);
    loadAllBatches();
  }, [loadBatches, loadSessions, loadAllBatches]);

  async function handleCreateBatch(e) {
    e.preventDefault();
    if (batchSubmitting) return;
    setBatchSubmitting(true);
    try {
      await api.createBatch(batchForm);
      toast.success("Batch created!");
      setBatchForm({ name: "" });
      loadBatches(1);
      loadAllBatches();
    } catch (err) { toast.error(err.message); }
    finally { setBatchSubmitting(false); }
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    if (sessionSubmitting) return;
    setSessionSubmitting(true);
    try {
      await api.createSession(sessionForm);
      toast.success("Session created!");
      setSessionForm({ batch_id: "", title: "", date: "", start_time: "", end_time: "" });
      loadSessions(1);
    } catch (err) { toast.error(err.message); }
    finally { setSessionSubmitting(false); }
  }

  async function handleGenerateInvite(batchId) {
    if (inviteLoading[batchId]) return;
    setInviteLoading((l) => ({ ...l, [batchId]: true }));
    try {
      const data = await api.generateInvite(batchId);
      setInviteLinks((l) => ({ ...l, [batchId]: data.invite_url }));
      toast.success("Invite link generated");
    } catch (err) { toast.error(err.message); }
    finally { setInviteLoading((l) => ({ ...l, [batchId]: false })); }
  }

  async function handleCopyInvite(batchId, url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedBatch(batchId);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopiedBatch(null), 2000);
    } catch { toast.error("Copy failed — please copy the link manually."); }
  }

  async function viewAttendance(sessionId, page = 1) {
    if (viewingRef.current) return;
    viewingRef.current = true;
    setAttendanceLoading(true);
    setAttendanceView(sessionId);
    try {
      const data = await api.getSessionAttendance(sessionId, { page, limit: PAGE_SIZE });
      setAttendanceData(data);
      setAttPag({ page: data.page, totalPages: data.totalPages, total: data.total });
    } catch (err) { toast.error(err.message); }
    finally { setAttendanceLoading(false); viewingRef.current = false; }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trainer Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name}</p>
      </div>

      {/* Create Batch */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Create Batch</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreateBatch} className="flex gap-2">
            <Input
              placeholder="Batch name"
              value={batchForm.name}
              onChange={(e) => setBatchForm({ name: e.target.value })}
              disabled={batchSubmitting}
              required
              className="max-w-sm"
            />
            <Button type="submit" disabled={batchSubmitting}>
              {batchSubmitting ? <><Spinner size="sm" className="mr-2 text-white" />Creating…</> : "Create"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            My Batches
            {!batchesLoading && <span className="text-sm font-normal text-muted-foreground ml-2">({batchPag.total} total)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Invite</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchesLoading ? <TableLoader colSpan={2} /> : batches.length === 0 ? <TableEmpty colSpan={2} /> : batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => handleGenerateInvite(b.id)}
                        disabled={!!inviteLoading[b.id]}
                      >
                        {inviteLoading[b.id] ? <Spinner size="sm" /> : "Generate Invite"}
                      </Button>
                      {inviteLinks[b.id] && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs bg-muted px-2 py-1 rounded break-all max-w-xs">
                            {inviteLinks[b.id]}
                          </code>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleCopyInvite(b.id, inviteLinks[b.id])}
                          >
                            {copiedBatch === b.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={batchPag.page} totalPages={batchPag.totalPages} onPage={loadBatches} />
        </CardContent>
      </Card>

      {/* Create Session */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Create Session</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSession} className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Select
              value={sessionForm.batch_id}
              onValueChange={(v) => setSessionForm({ ...sessionForm, batch_id: v })}
              disabled={sessionSubmitting}
              required
            >
              <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
              <SelectContent>
                {allBatches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Title"
              value={sessionForm.title}
              onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
              disabled={sessionSubmitting} required
            />
            <Input
              type="date"
              value={sessionForm.date}
              onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
              disabled={sessionSubmitting} required
            />
            <Input
              type="time"
              value={sessionForm.start_time}
              onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
              disabled={sessionSubmitting} required
            />
            <Input
              type="time"
              value={sessionForm.end_time}
              onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
              disabled={sessionSubmitting} required
            />
            <Button type="submit" disabled={sessionSubmitting}>
              {sessionSubmitting ? <><Spinner size="sm" className="mr-2 text-white" />Creating…</> : "Create Session"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Sessions
            {!sessionsLoading && <span className="text-sm font-normal text-muted-foreground ml-2">({sessionPag.total} total)</span>}
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionsLoading ? <TableLoader colSpan={5} /> : sessions.length === 0 ? <TableEmpty colSpan={5} /> : sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.batch_name}</TableCell>
                  <TableCell>{s.date?.split("T")[0]}</TableCell>
                  <TableCell className="whitespace-nowrap">{s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => viewAttendance(s.id, 1)}
                      disabled={attendanceLoading && attendanceView === s.id}
                    >
                      {attendanceLoading && attendanceView === s.id ? <Spinner size="sm" /> : "View Attendance"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={sessionPag.page} totalPages={sessionPag.totalPages} onPage={loadSessions} />
        </CardContent>
      </Card>

      {/* Attendance View */}
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
                  <TableHead>Marked At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceLoading ? (
                  <TableLoader colSpan={4} />
                ) : !attendanceData || attendanceData.data.length === 0 ? (
                  <TableEmpty colSpan={4} />
                ) : attendanceData.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>
                      {a.status ? <Badge variant={a.status}>{a.status}</Badge> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{a.marked_at ? new Date(a.marked_at).toLocaleString() : "—"}</TableCell>
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
