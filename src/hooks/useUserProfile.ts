import { useEffect, useState } from "react";
import { api } from "@/integrations/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { Department } from "@/lib/types";

interface UserProfile {
  display_name: string | null;
  department: string | null;
  avatar_url: string | null;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile({
      display_name: user.display_name,
      department: user.department,
      avatar_url: user.avatar_url,
    });
    setLoading(false);
  }, [user]);

  const userDepartment = profile?.department as Department | null;
  return { profile, loading, userDepartment };
};
