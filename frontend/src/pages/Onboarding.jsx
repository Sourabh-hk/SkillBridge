import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const ROLES = [
  { value: "student", label: "Student", icon: "🎓", desc: "Auto-approved on signup" },
  { value: "trainer", label: "Trainer", icon: "🧑‍🏫", desc: "Requires institution approval" },
  { value: "institution", label: "Institution", icon: "🏫", desc: "Requires programme manager approval" },
  { value: "programme_manager", label: "Programme Manager", icon: "📋", desc: "Requires programme manager approval" },
  { value: "monitoring_officer", label: "Monitoring Officer", icon: "👁️", desc: "Requires programme manager approval" },
];

const INSTITUTION_SCOPED_ROLES = ["trainer"];

export default function Onboarding() {
  const { isLoaded, isSignedIn } = useUser();
  const { user, syncUser, needsOnboarding, logout } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [institutionId, setInstitutionId] = useState("");
  const [institutions, setInstitutions] = useState([]);
  const [institutionsLoading, setInstitutionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!needsOnboarding || !INSTITUTION_SCOPED_ROLES.includes(role)) return;

    let active = true;
    setInstitutionsLoading(true);
    api
      .getInstitutions()
      .then((res) => {
        if (active) setInstitutions(res.data || []);
      })
      .catch(() => {
        toast.error("Could not load institutions");
      })
      .finally(() => {
        if (active) setInstitutionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [needsOnboarding, role]);

  if (isLoaded && isSignedIn && !needsOnboarding && user?.approval_status === "approved") {
    navigate("/dashboard");
    return null;
  }

  if (isLoaded && !isSignedIn) {
    navigate("/signup");
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (INSTITUTION_SCOPED_ROLES.includes(role) && !institutionId) {
      toast.error("Select an institution to continue");
      return;
    }

    setLoading(true);
    try {
      const synced = await syncUser(
        role,
        INSTITUTION_SCOPED_ROLES.includes(role) ? Number(institutionId) : null
      );

      if (synced.approval_status === "approved") {
        navigate("/dashboard");
      } else {
        toast.success("Signup request submitted. Waiting for approval.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to set role. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!needsOnboarding && user) {
    const isPending = user.approval_status === "pending";
    const isRejected = user.approval_status === "rejected";

    return (
      <div className="flex min-h-screen items-start justify-center px-4 pt-16 bg-muted/30">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">
                  {isPending ? "Approval Pending" : "Access Restricted"}
                </CardTitle>
                <CardDescription>
                  {isPending
                    ? "Your account request is waiting for approval from the hierarchy above your role."
                    : "Your access request was rejected. Contact your administrator for next steps."}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Role:</strong> {user.role.replace("_", " ")}</p>
            <p><strong>Status:</strong> {user.approval_status}</p>
            {user.role === "trainer" && user.institution_id && (
              <p><strong>Institution ID:</strong> {user.institution_id}</p>
            )}
            {isRejected && (
              <Button variant="outline" onClick={() => navigate("/login")}>
                Back to Login
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center px-4 pt-16 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Welcome to SkillBridge</CardTitle>
              <CardDescription>
                Choose your role to complete setup. Higher-level roles are assigned through approval, not self-signup.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border-2 p-4 text-center transition-colors hover:border-primary hover:bg-accent",
                    role === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  )}
                >
                  <span className="text-2xl">{r.icon}</span>
                  <span className="font-semibold text-sm">{r.label}</span>
                  <span className="text-xs text-muted-foreground leading-snug">{r.desc}</span>
                </button>
              ))}
            </div>

            {INSTITUTION_SCOPED_ROLES.includes(role) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Affiliated Institution</label>
                <select
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={institutionsLoading || loading}
                >
                  <option value="">Select institution</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Access remains pending until the selected institution approves this request.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Spinner size="sm" className="mr-2 text-white" /> Setting up…</>
              ) : (
                `Submit ${ROLES.find((r) => r.value === role)?.label} Approval Request`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
