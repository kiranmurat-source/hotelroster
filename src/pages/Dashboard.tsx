import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, UserPlus, AlertCircle, Inbox } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";

interface DashboardRequest {
  id: string;
  department: string;
  status: string;
  date: string;
}

interface ExtraHoursRow extends DashboardRequest {
  staff_name: string;
  hours: number;
}

interface ExtraStaffRow extends DashboardRequest {
  shift: string;
  number_of_staff: number;
}

const Dashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isManager, isAdmin } = useUserRole();
  const { userDepartment } = useUserProfile();
  const canSeeAll = isManager || isAdmin;

  const [profileCount, setProfileCount] = useState(0);
  const [hoursRequests, setHoursRequests] = useState<ExtraHoursRow[]>([]);
  const [staffRequests, setStaffRequests] = useState<ExtraStaffRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const [profilesRes, hoursRes, staffRes] = await Promise.all([
        supabase.from("profiles").select("id, department"),
        supabase.from("extra_hours_requests").select("id, staff_name, department, hours, date, status").order("submitted_at", { ascending: false }).limit(10),
        supabase.from("extra_staff_requests").select("id, department, shift, number_of_staff, date, status").order("submitted_at", { ascending: false }).limit(10),
      ]);

      if (!profilesRes.error && profilesRes.data) {
        const filtered = canSeeAll ? profilesRes.data : profilesRes.data.filter((p: any) => !userDepartment || p.department === userDepartment);
        setProfileCount(filtered.length);
      }
      if (!hoursRes.error && hoursRes.data) {
        const filtered = canSeeAll ? hoursRes.data : hoursRes.data.filter((r: any) => !userDepartment || r.department === userDepartment);
        setHoursRequests(filtered as ExtraHoursRow[]);
      }
      if (!staffRes.error && staffRes.data) {
        const filtered = canSeeAll ? staffRes.data : staffRes.data.filter((r: any) => !userDepartment || r.department === userDepartment);
        setStaffRequests(filtered as ExtraStaffRow[]);
      }
    };
    load();
  }, [canSeeAll, userDepartment]);

  const pendingHours = hoursRequests.filter((r) => r.status === "pending");
  const pendingStaff = staffRequests.filter((r) => r.status === "pending");

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title={t("dashboard.totalStaff")} value={profileCount} icon={<Users className="h-5 w-5" />} description={t("dashboard.activeEmployees")} trend="up" />
          <StatCard title={t("dashboard.pendingHours")} value={pendingHours.length} icon={<Clock className="h-5 w-5" />} description={t("dashboard.awaitingApproval")} trend={pendingHours.length > 0 ? "up" : "down"} onClick={() => navigate("/extra-hours")} />
          <StatCard title={t("dashboard.pendingStaff")} value={pendingStaff.length} icon={<UserPlus className="h-5 w-5" />} description={t("dashboard.awaitingApproval")} trend={pendingStaff.length > 0 ? "up" : "down"} onClick={() => navigate("/extra-staff")} />
          <StatCard title={t("dashboard.totalPending")} value={pendingHours.length + pendingStaff.length} icon={<AlertCircle className="h-5 w-5" />} description={t("dashboard.actionRequired")} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">{t("dashboard.recentExtraHours")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hoursRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Inbox className="h-8 w-8 mb-2" />
                  <p className="text-sm">{t("dashboard.noRequests")}</p>
                </div>
              )}
              {hoursRequests.slice(0, 4).map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{req.staff_name}</p>
                    <p className="text-xs text-muted-foreground">{req.department} · {req.hours}h · {req.date}</p>
                  </div>
                  <StatusBadge status={req.status as any} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">{t("dashboard.recentExtraStaff")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {staffRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Inbox className="h-8 w-8 mb-2" />
                  <p className="text-sm">{t("dashboard.noRequests")}</p>
                </div>
              )}
              {staffRequests.slice(0, 4).map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{req.department} — {req.shift}</p>
                    <p className="text-xs text-muted-foreground">{req.number_of_staff} {t("common.staff")} · {req.date}</p>
                  </div>
                  <StatusBadge status={req.status as any} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
