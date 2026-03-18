import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, AppRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "manager" | "admin";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isManager, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user must change password
  const mustChangePassword = user.user_metadata?.must_change_password === true;
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (requiredRole === "admin" && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole === "manager" && !isManager) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
