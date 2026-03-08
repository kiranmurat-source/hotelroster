import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "manager" | "staff";

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

    const fetchRoles = async () => {
      // Use server-side SECURITY DEFINER function to verify roles
      // This prevents client-side state manipulation attacks
      const roleChecks = await Promise.all(
        (["admin", "manager", "staff"] as AppRole[]).map(async (role) => {
          const { data, error } = await supabase.rpc("has_role", {
            _user_id: user.id,
            _role: role,
          });
          return !error && data === true ? role : null;
        })
      );

      setRoles(roleChecks.filter((r): r is AppRole => r !== null));
      setLoading(false);
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isManager = hasRole("manager") || isAdmin;
  const isStaff = hasRole("staff");

  return { roles, loading, hasRole, isAdmin, isManager, isStaff };
};
