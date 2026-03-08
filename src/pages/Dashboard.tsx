import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { staffMembers, extraHoursRequests, extraStaffRequests } from "@/lib/mock-data";
import { Users, Clock, UserPlus, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";

const Dashboard = () => {
  const { t } = useLanguage();
  const { isManager, isAdmin } = useUserRole();
  const { userDepartment } = useUserProfile();
  const canSeeAll = isManager || isAdmin;

  // Filter data by department for staff users
  const visibleStaff = canSeeAll
    ? staffMembers
    : staffMembers.filter((s) => !userDepartment || s.department === userDepartment);

  const visibleHoursRequests = canSeeAll
    ? extraHoursRequests
    : extraHoursRequests.filter((r) => !userDepartment || r.department === userDepartment);

  const visibleStaffRequests = canSeeAll
    ? extraStaffRequests
    : extraStaffRequests.filter((r) => !userDepartment || r.department === userDepartment);

  const pendingHours = visibleHoursRequests.filter((r) => r.status === "pending");
  const pendingStaff = visibleStaffRequests.filter((r) => r.status === "pending");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title={t("dashboard.totalStaff")} value={visibleStaff.length} icon={<Users className="h-5 w-5" />} description={t("dashboard.activeEmployees")} />
          <StatCard title={t("dashboard.pendingHours")} value={pendingHours.length} icon={<Clock className="h-5 w-5" />} description={t("dashboard.awaitingApproval")} />
          <StatCard title={t("dashboard.pendingStaff")} value={pendingStaff.length} icon={<UserPlus className="h-5 w-5" />} description={t("dashboard.awaitingApproval")} />
          <StatCard title={t("dashboard.totalPending")} value={pendingHours.length + pendingStaff.length} icon={<AlertCircle className="h-5 w-5" />} description={t("dashboard.actionRequired")} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">{t("dashboard.recentExtraHours")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleHoursRequests.slice(0, 4).map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{req.staffName}</p>
                    <p className="text-xs text-muted-foreground">{req.department} · {req.hours}h · {req.date}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">{t("dashboard.recentExtraStaff")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleStaffRequests.slice(0, 4).map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{req.department} — {req.shift}</p>
                    <p className="text-xs text-muted-foreground">{req.numberOfStaff} {t("common.staff")} · {req.date}</p>
                  </div>
                  <StatusBadge status={req.status} />
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
