import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

type Role = "producteur" | "torrefacteur" | "shop" | "barista" | "admin";

export const RoleGate = ({
  allow,
  children,
}: {
  allow: Role[];
  children: ReactNode;
}) => {
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
  if (!roles.some((r) => allow.includes(r))) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};
