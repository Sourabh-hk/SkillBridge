import { useAuth } from "../context/AuthContext";
import StudentDashboard from "./dashboards/StudentDashboard";
import TrainerDashboard from "./dashboards/TrainerDashboard";
import InstitutionDashboard from "./dashboards/InstitutionDashboard";
import ProgrammeManagerDashboard from "./dashboards/ProgrammeManagerDashboard";
import MonitoringOfficerDashboard from "./dashboards/MonitoringOfficerDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "student":
      return <StudentDashboard />;
    case "trainer":
      return <TrainerDashboard />;
    case "institution":
      return <InstitutionDashboard />;
    case "programme_manager":
      return <ProgrammeManagerDashboard />;
    case "monitoring_officer":
      return <MonitoringOfficerDashboard />;
    default:
      return <p>Unknown role: {user.role}</p>;
  }
}
