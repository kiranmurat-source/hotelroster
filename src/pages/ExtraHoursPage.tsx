import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Department, ApprovalStatus } from "@/lib/types";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const departments: Department[] = ["Front Desk", "Housekeeping", "F&B", "Kitchen", "Maintenance", "Security", "Spa", "Management"];

interface DbExtraHoursRequest {
  id: string;
  staff_id: string;
  staff_name: string;
  department: string;
  date: string;
  hours: number;
  reason: string;
  status: string;
  submitted_at: string;
  submitted_by: string;
}

interface StaffProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  department: string | null;
}

const ExtraHoursPage = () => {
  const { t } = useLanguage();
  const { isManager, isAdmin } = useUserRole();
  const { userDepartment } = useUserProfile();
  const { user } = useAuth();
  const canApprove = isManager || isAdmin;

  const [requests, setRequests] = useState<DbExtraHoursRequest[]>([]);
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState<string | undefined>(undefined);
  const [department, setDepartment] = useState<string | undefined>(undefined);
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("extra_hours_requests")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) {
      console.error("Error fetching extra hours requests:", error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    const loadProfiles = async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, display_name, department");
      if (data) setProfiles(data);
    };
    loadProfiles();
  }, []);

  const filteredRequests = canApprove
    ? requests
    : requests.filter((r) => !userDepartment || r.department === userDepartment);

  const filteredStaff = canApprove
    ? profiles
    : profiles.filter((s) => !userDepartment || s.department === userDepartment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const staff = profiles.find((s) => s.user_id === staffId);
    if (!staff || !department || !date || !hours || !reason || !user) {
      toast.error(t("extraHours.fillAll"));
      return;
    }
    const { error } = await supabase.from("extra_hours_requests").insert({
      staff_id: staffId,
      staff_name: staff.display_name || "Unknown",
      department: department as string,
      date,
      hours: Number(hours),
      reason,
      status: "pending",
      submitted_by: user.id,
    });
    if (error) {
      toast.error("Failed to submit request");
      console.error(error);
      return;
    }
    setStaffId(""); setDepartment(undefined); setDate(""); setHours(""); setReason("");
    toast.success(t("extraHours.submitted"));
    fetchRequests();
  };

  const updateStatus = async (id: string, status: ApprovalStatus) => {
    if (!canApprove) {
      toast.error(t("permissions.cannotApprove"));
      return;
    }
    const { error } = await supabase
      .from("extra_hours_requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status");
      console.error(error);
      return;
    }
    toast.success(`${t("common." + status)}`);
    fetchRequests();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("extraHours.title")}</h1>
          <p className="text-muted-foreground">{t("extraHours.subtitle")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 animate-fade-in">
            <CardHeader><CardTitle className="text-lg">{t("extraHours.newRequest")}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("extraHours.staffMember")}</Label>
                  <Select value={staffId} onValueChange={setStaffId}>
                    <SelectTrigger><SelectValue placeholder={t("extraHours.selectStaff")} /></SelectTrigger>
                    <SelectContent>{filteredStaff.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name || "Unnamed"}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("extraHours.department")}</Label>
                   <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
                    <SelectTrigger><SelectValue placeholder={t("extraHours.selectDept")} /></SelectTrigger>
                    <SelectContent>
                      {(canApprove ? departments : departments.filter((d) => !userDepartment || d === userDepartment)).map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("extraHours.date")}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("extraHours.hours")}</Label>
                  <Input type="number" min="1" max="12" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 3" />
                </div>
                <div className="space-y-2">
                  <Label>{t("extraHours.reason")}</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("extraHours.reasonPlaceholder")} rows={3} />
                </div>
                <Button type="submit" className="w-full">{t("extraHours.submit")}</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 animate-fade-in">
            <CardHeader><CardTitle className="text-lg">{t("extraHours.allRequests")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loading && <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}
              {!loading && filteredRequests.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("permissions.noRequests")}</p>
              )}
              {filteredRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{req.staff_name}</p>
                    <p className="text-xs text-muted-foreground">{req.department} · {req.hours}h · {req.date}</p>
                    <p className="text-xs text-muted-foreground">{req.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <StatusBadge status={req.status as ApprovalStatus} />
                    {req.status === "pending" && canApprove && (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success" onClick={() => updateStatus(req.id, "approved")}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => updateStatus(req.id, "rejected")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default ExtraHoursPage;
