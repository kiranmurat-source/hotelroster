import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/integrations/api/client";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  department: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Supabase uyumluluğu için — kademeli geçişte kullanılır
  session: { user: UserProfile } | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Authelia session varsa backend'den profil al
    api.get<UserProfile>('/roster/profiles/me')
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        // 401 → api client zaten auth.khotelpartners.com'a yönlendirir
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const signOut = async () => {
    // Authelia logout
    window.location.href = 'https://auth.khotelpartners.com/logout';
  };

  return (
    <AuthContext.Provider value={{
      user,
      session: user ? { user } : null,
      loading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
