import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Spinner, TableLoader, TableEmpty } from "@/components/ui/spinner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;

export default function ProgrammeManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [instPag, setInstPag] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [reassigning, setReassigning] = useState({});
  const [approving, setApproving] = useState({});
  const [provisionForm, setProvisionForm] = useState({
    clerk_user_id: "",
    name: "",
    email: "",
    role: "institution",
    institution_id: "",
  });
  const [reassignForm, setReassignForm] = useState({
    user_id: "",
    role: "student",
    institution_id: "",
  });

  const loadData = useCallback(async (page = 1) => {
    try {
      const res = await api.getProgrammeSummary({ page, limit: PAGE_SIZE });
      setStats(res.stats);
      setInstitutions(res.institutions.data);
      setInstPag({ page: res.institutions.page, totalPages: res.institutions.totalPages, total: res.institutions.total });
    } catch (e) { toast.error(e.message); }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.getApprovalRequests();
      setPendingRequests(res.data || []);
    } catch (e) {
      toast.error(e.message);
    }
  }, []);

  const loadInstitutions = useCallback(async () => {
    try {
      const res = await api.getInstitutions();
      setAllInstitutions(res.data || []);
    } catch (e) {
      toast.error(e.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadData(1), loadUsers(), loadInstitutions(), loadRequests()]);
      setLoading(false);
    })();
  }, [loadData, loadUsers, loadInstitutions, loadRequests]);

  async function handleApprove(requestId) {
    if (approving[requestId]) return;
    setApproving((prev) => ({ ...prev, [requestId]: true }));
    try {
      await api.approveRequest(requestId);
      toast.success("Request approved");
      await Promise.all([loadRequests(), loadUsers(), loadData(1), loadInstitutions()]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApproving((prev) => ({ ...prev, [requestId]: false }));
    }
  }

  async function handleProvision(e) {
    e.preventDefault();
    if (provisioning) return;

    if (provisionForm.role === "trainer" && !provisionForm.institution_id) {
      toast.error("Trainer provisioning needs an institution");
      return;
    }

    setProvisioning(true);
    try {
      await api.provisionUser({
        ...provisionForm,
        institution_id:
          provisionForm.role === "trainer"
            ? Number(provisionForm.institution_id)
            : null,
        approval_status: "approved",
      });
      toast.success("User provisioned");
      setProvisionForm({
        clerk_user_id: "",
        name: "",
        email: "",
        role: "institution",
        institution_id: "",
      });
      await Promise.all([loadUsers(), loadData(1), loadInstitutions()]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProvisioning(false);
    }
  }

  async function handleReassign(e) {
    e.preventDefault();
    const userId = Number(reassignForm.user_id);
    if (!userId) {
      toast.error("Select a user to reassign role");
      return;
    }

    if (reassignForm.role === "trainer" && !reassignForm.institution_id) {
      toast.error("Trainer role assignment needs an institution");
      return;
    }

    if (reassigning[userId]) return;
    setReassigning((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.assignUserRole(userId, {
        role: reassignForm.role,
        institution_id: reassignForm.role === "trainer" ? Number(reassignForm.institution_id) : null,
      });
      toast.success("Role updated");
      await Promise.all([loadUsers(), loadData(1), loadInstitutions()]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReassigning((prev) => ({ ...prev, [userId]: false }));
    }
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Provision User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProvision} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Clerk User ID"
              value={provisionForm.clerk_user_id}
              onChange={(e) => setProvisionForm((prev) => ({ ...prev, clerk_user_id: e.target.value }))}
              required
              disabled={provisioning}
            />
            <Input
              placeholder="Full Name"
              value={provisionForm.name}
              onChange={(e) => setProvisionForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              disabled={provisioning}
            />
            <Input
              placeholder="Email"
              type="email"
              value={provisionForm.email}
              onChange={(e) => setProvisionForm((prev) => ({ ...prev, email: e.target.value }))}
              required
              disabled={provisioning}
            />
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={provisionForm.role}
              onChange={(e) => setProvisionForm((prev) => ({ ...prev, role: e.target.value, institution_id: "" }))}
              disabled={provisioning}
            >
              <option value="institution">Institution</option>
              <option value="programme_manager">Programme Manager</option>
              <option value="monitoring_officer">Monitoring Officer</option>
              <option value="trainer">Trainer</option>
              <option value="student">Student</option>
            </select>

            {provisionForm.role === "trainer" && (
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={provisionForm.institution_id}
                onChange={(e) => setProvisionForm((prev) => ({ ...prev, institution_id: e.target.value }))}
                disabled={provisioning}
                required
              >
                <option value="">Select institution</option>
                {allInstitutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            )}

            <Button type="submit" disabled={provisioning}>
              {provisioning ? <><Spinner size="sm" className="mr-2 text-white" />Provisioning...</> : "Provision User"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Pending Approval Requests
              <span className="text-sm font-normal text-muted-foreground ml-2">({pendingRequests.length} pending)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>{u.created_at?.split("T")[0]}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => handleApprove(u.id)} disabled={!!approving[u.id]}>
                        {approving[u.id] ? <><Spinner size="sm" className="mr-2 text-white" />Approving...</> : "Approve"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reassign Existing User Role</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReassign} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={reassignForm.user_id}
              onChange={(e) => setReassignForm((prev) => ({ ...prev, user_id: e.target.value }))}
              required
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>

            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={reassignForm.role}
              onChange={(e) => setReassignForm((prev) => ({ ...prev, role: e.target.value, institution_id: "" }))}
              required
            >
              <option value="student">Student</option>
              <option value="trainer">Trainer</option>
              <option value="institution">Institution</option>
              <option value="programme_manager">Programme Manager</option>
              <option value="monitoring_officer">Monitoring Officer</option>
            </select>

            {reassignForm.role === "trainer" && (
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={reassignForm.institution_id}
                onChange={(e) => setReassignForm((prev) => ({ ...prev, institution_id: e.target.value }))}
                required
              >
                <option value="">Select institution</option>
                {allInstitutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            )}

            <Button type="submit" disabled={!reassignForm.user_id || !!reassigning[Number(reassignForm.user_id)]}>
              {reassigning[Number(reassignForm.user_id)] ? <><Spinner size="sm" className="mr-2 text-white" />Updating...</> : "Update Role"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Provisioned Users
            {!usersLoading && <span className="text-sm font-normal text-muted-foreground ml-2">({users.length} shown)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? <TableLoader colSpan={5} /> : users.length === 0 ? <TableEmpty colSpan={5} /> : users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.institution_name || "-"}</TableCell>
                  <TableCell>{u.approval_status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
