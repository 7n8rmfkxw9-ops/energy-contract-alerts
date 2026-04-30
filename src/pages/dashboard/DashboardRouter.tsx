import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

const DashboardRouter = () => {
  const { session, loading } = useAuth();
  const { roles, loading: rolesLoading } = useUserRoles();

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;

  if (roles.includes("admin")) return <Navigate to="/admin" replace />;
  if (roles.includes("producteur")) return <Navigate to="/dashboard/producer" replace />;
  if (roles.includes("shop") || roles.includes("torrefacteur"))
    return <Navigate to="/dashboard/buyer" replace />;
  if (roles.includes("barista")) return <Navigate to="/dashboard/barista" replace />;

  // No role yet — go to verification/profile
  return <Navigate to="/verification" replace />;
};

export default DashboardRouter;
