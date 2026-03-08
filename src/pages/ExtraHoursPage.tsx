import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { extraHoursRequests as initialRequests, staffMembers } from "@/lib/mock-data";
import { ExtraHoursRequest, Department, ApprovalStatus } from "@/lib/types";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const departments: Department[] = ["Front Desk", "Housekeeping", "F&B", "Kitchen", "Maintenance", "Security", "Spa", "Management"];

const ExtraHoursPage = () => {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<ExtraHoursRequest[]>(initialRequests);
  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState<Department | "">("");
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffMembers.find((s) => s.id === staffId);
    if (!staff || !department || !date || !hours || !reason) {
      toast.error(t("extraHours.fillAll"));
      return;
    }
    const newRequest: ExtraHoursRequest = {
      id: `eh-${Date.now()}`,
      staffId,
      staffName: staff.name,
      department: department as Department,
      date,
      hours: Number(hours),
      reason,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    setRequests((prev) => [newRequest, ...prev]);
    setStaffId(""); setDepartment(""); setDate(""); setHours(""); setReason("");
    toast.success(t("extraHours.submitted"));
  };

  const updateStatus = (id: string, status: ApprovalStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`${t("common." + status)}`);
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
                    <SelectContent>{staffMembers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("extraHours.department")}</Label>
                  <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
                    <SelectTrigger><SelectValue placeholder={t("extraHours.selectDept")} /></SelectTrigger>
                    <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
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
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{req.staffName}</p>
                    <p className="text-xs text-muted-foreground">{req.department} · {req.hours}h · {req.date}</p>
                    <p className="text-xs text-muted-foreground">{req.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <StatusBadge status={req.status} />
                    {req.status === "pending" && (
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
