import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Inbox } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { maskPhone } from "@/lib/privacy";
import { api } from "@/integrations/api/client";

interface StaffProfile {
  id: string;
  display_name: string | null;
  department: string | null;
  avatar_url: string | null;
  user_id: string;
}

const StaffPage = () => {
  const { t } = useLanguage();
  const { isManager } = useUserRole();
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await api.get<any[]>("/roster/profiles");
      const error = null;
      if (!error && data) setProfiles(data);
    };
    load();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("staff.title")}</h1>
          <p className="text-muted-foreground">{t("staff.subtitle").replace("{count}", String(profiles.length))}</p>
        </div>

        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="h-8 w-8 mb-2" />
            <p className="text-sm">No staff members found</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((staff) => (
              <Card key={staff.id} className="animate-fade-in hover:border-accent/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold shrink-0">
                      {(staff.display_name || "?").split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{staff.display_name || "Unnamed"}</p>
                      {staff.department && (
                        <span className="inline-block mt-1 text-xs bg-secondary px-2 py-0.5 rounded-full">{staff.department}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StaffPage;
