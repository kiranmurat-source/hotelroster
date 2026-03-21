import { useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "manager" | "staff";

interface UserRole {
  role: AppRole;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    api.get<UserRole[]>('/roster/profiles/me/roles')
      .then((data) => {
        setRoles(data.map(r => r.role));
      })
      .catch(() => {
        setRoles(['staff']); // fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isManager = hasRole("manager") || isAdmin;
  const isStaff = hasRole("staff");

  return { roles, loading, hasRole, isAdmin, isManager, isStaff };
};
