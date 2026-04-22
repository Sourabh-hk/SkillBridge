import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const ROLES = [
  { value: "student", label: "Student", icon: "🎓", desc: "View sessions and mark attendance" },
  { value: "trainer", label: "Trainer", icon: "🧑‍🏫", desc: "Create sessions and manage batches" },
  { value: "institution", label: "Institution", icon: "🏫", desc: "Manage trainers and view summaries" },
  { value: "programme_manager", label: "Programme Manager", icon: "📋", desc: "Oversee institutions and regional data" },
  { value: "monitoring_officer", label: "Monitoring Officer", icon: "👁️", desc: "Read-only access across the programme" },
];

export default function Onboarding() {
  const { isLoaded, isSignedIn } = useUser();
  const { syncUser, needsOnboarding } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);

  if (isLoaded && isSignedIn && !needsOnboarding) {
    navigate("/dashboard");
    return null;
  }

  if (isLoaded && !isSignedIn) {
    navigate("/signup");
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await syncUser(role);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Failed to set role. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center px-4 pt-16 bg-muted/30">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to SkillBridge</CardTitle>
          <CardDescription>
            Choose your role to complete setup. This <strong>cannot be changed</strong> later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Spinner size="sm" className="mr-2 text-white" /> Setting up…</>
              ) : (
                `Continue as ${ROLES.find((r) => r.value === role)?.label}`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
