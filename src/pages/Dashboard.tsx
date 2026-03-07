import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { staffMembers, extraHoursRequests, extraStaffRequests } from "@/lib/mock-data";
import { Users, Clock, UserPlus, AlertCircle } from "lucide-react";

const Dashboard = () => {
  const pendingHours = extraHoursRequests.filter((r) => r.status === "pending");
  const pendingStaff = extraStaffRequests.filter((r) => r.status === "pending");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of staff and pending approvals</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Staff" value={staffMembers.length} icon={<Users className="h-5 w-5" />} description="Active employees" />
          <StatCard title="Pending Extra Hours" value={pendingHours.length} icon={<Clock className="h-5 w-5" />} description="Awaiting approval" />
          <StatCard title="Pending Extra Staff" value={pendingStaff.length} icon={<UserPlus className="h-5 w-5" />} description="Awaiting approval" />
          <StatCard title="Total Pending" value={pendingHours.length + pendingStaff.length} icon={<AlertCircle className="h-5 w-5" />} description="Action required" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Recent Extra Hours Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {extraHoursRequests.slice(0, 4).map((req) => (
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
              <CardTitle className="text-lg">Recent Extra Staff Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {extraStaffRequests.slice(0, 4).map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{req.department} — {req.shift}</p>
                    <p className="text-xs text-muted-foreground">{req.numberOfStaff} staff · {req.date}</p>
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
