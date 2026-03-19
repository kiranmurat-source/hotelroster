import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Department, ShiftType, ApprovalStatus } from "@/lib/types";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const departments: Department[] = ["Front Desk", "Housekeeping", "F&B", "Kitchen", "Maintenance", "Security", "Spa", "Management"];
const shifts: ShiftType[] = ["Morning", "Afternoon", "Night"];

interface DbExtraStaffRequest {
  id: string;
  department: string;
  date: string;
  shift: string;
  number_of_staff: number;
  reason: string;
  requested_by: string;
  status: string;
  submitted_at: string;
  submitted_by: string;
}

const ExtraStaffPage = () => {
  const { t } = useLanguage();
  const { isManager, isAdmin } = useUserRole();
  const { userDepartment } = useUserProfile();
  const { user } = useAuth();
  const canApprove = isManager || isAdmin;

  const [requests, setRequests] = useState<DbExtraStaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState("");
  const [shift, setShift] = useState("");
  const [numberOfStaff, setNumberOfStaff] = useState("");
  const [reason, setReason] = useState("");
  const [requestedBy, setRequestedBy] = useState("");

  const shiftLabels: Partial<Record<ShiftType, string>> = {
    Morning: t("roster.morning"),
    Afternoon: t("roster.afternoon"),
    Night: t("roster.night"),
    "Day Off": t("roster.dayOff"),
    Break: t("roster.break"),
    "MID-PM": "Akşam Ara",
    "MID-NA": "Gece Ara",
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("extra_staff_requests")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) {
      console.error("Error fetching extra staff requests:", error);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = canApprove
    ? requests
    : requests.filter((r) => !userDepartment || r.department === userDepartment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department || !date || !shift || !numberOfStaff || !reason || !requestedBy || !user) {
      toast.error(t("extraStaff.fillAll"));
      return;
    }
    const { error } = await supabase.from("extra_staff_requests").insert({
      department: department as string,
      date,
      shift: shift as string,
      number_of_staff: Number(numberOfStaff),
      reason,
      requested_by: requestedBy,
      status: "pending",
      submitted_by: user.id,
    });
    if (error) {
      toast.error("Failed to submit request");
      console.error(error);
      return;
    }
    setDepartment(""); setDate(""); setShift(""); setNumberOfStaff(""); setReason(""); setRequestedBy("");
    toast.success(t("extraStaff.submitted"));
    fetchRequests();
  };

  const updateStatus = async (id: string, status: ApprovalStatus) => {
    if (!canApprove) {
      toast.error(t("permissions.cannotApprove"));
      return;
    }
    const { error } = await supabase
      .from("extra_staff_requests")
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
          <h1 className="text-2xl font-bold tracking-tight">{t("extraStaff.title")}</h1>
          <p className="text-muted-foreground">{t("extraStaff.subtitle")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 animate-fade-in">
            <CardHeader><CardTitle className="text-lg">{t("extraStaff.newRequest")}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("extraStaff.department")}</Label>
                  <Select key="dept-select" onValueChange={(v) => setDepartment(v as Department)}>
                    <SelectTrigger><SelectValue placeholder={t("extraStaff.selectDept")} /></SelectTrigger>
                    <SelectContent>
                      {(canApprove ? departments : departments.filter((d) => !userDepartment || d === userDepartment)).map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("extraStaff.date")}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("extraStaff.shift")}</Label>
                  <Select key="shift-select" onValueChange={(v) => setShift(v as ShiftType)}>
                    <SelectTrigger><SelectValue placeholder={t("extraStaff.selectShift")} /></SelectTrigger>
                    <SelectContent>{shifts.map((s) => <SelectItem key={s} value={s}>{shiftLabels[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("extraStaff.numberOfStaff")}</Label>
                  <Input type="number" min="1" max="20" value={numberOfStaff} onChange={(e) => setNumberOfStaff(e.target.value)} placeholder="e.g. 2" />
                </div>
                <div className="space-y-2">
                  <Label>{t("extraStaff.requestedBy")}</Label>
                  <Input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} placeholder={t("extraStaff.yourName")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("extraStaff.reason")}</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("extraStaff.reasonPlaceholder")} rows={3} />
                </div>
                <Button type="submit" className="w-full">{t("extraStaff.submit")}</Button>
              </form>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 animate-fade-in">
            <CardHeader><CardTitle className="text-lg">{t("extraStaff.allRequests")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loading && <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}
              {!loading && filteredRequests.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("permissions.noRequests")}</p>
              )}
              {filteredRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{req.department} — {shiftLabels[req.shift as ShiftType] || req.shift}</p>
                    <p className="text-xs text-muted-foreground">{req.number_of_staff} {t("common.staff")} · {req.date} · {req.requested_by}</p>
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

export default ExtraStaffPage;
