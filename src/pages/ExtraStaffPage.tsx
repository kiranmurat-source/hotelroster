import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { extraStaffRequests as initialRequests } from "@/lib/mock-data";
import { ExtraStaffRequest, Department, ShiftType, ApprovalStatus } from "@/lib/types";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const departments: Department[] = ["Front Desk", "Housekeeping", "F&B", "Kitchen", "Maintenance", "Security", "Spa", "Management"];
const shifts: ShiftType[] = ["Morning", "Afternoon", "Night"];

const ExtraStaffPage = () => {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<ExtraStaffRequest[]>(initialRequests);
  const [department, setDepartment] = useState<Department | "">("");
  const [date, setDate] = useState("");
  const [shift, setShift] = useState<ShiftType | "">("");
  const [numberOfStaff, setNumberOfStaff] = useState("");
  const [reason, setReason] = useState("");
  const [requestedBy, setRequestedBy] = useState("");

  const shiftLabels: Record<ShiftType, string> = {
    Morning: t("roster.morning"),
    Afternoon: t("roster.afternoon"),
    Night: t("roster.night"),
    "Day Off": t("roster.dayOff"),
    Break: t("roster.break"),
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!department || !date || !shift || !numberOfStaff || !reason || !requestedBy) {
      toast.error(t("extraStaff.fillAll"));
      return;
    }
    const newRequest: ExtraStaffRequest = {
      id: `es-${Date.now()}`,
      department: department as Department,
      date,
      shift: shift as ShiftType,
      numberOfStaff: Number(numberOfStaff),
      reason,
      requestedBy,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    setRequests((prev) => [newRequest, ...prev]);
    setDepartment(""); setDate(""); setShift(""); setNumberOfStaff(""); setReason(""); setRequestedBy("");
    toast.success(t("extraStaff.submitted"));
  };

  const updateStatus = (id: string, status: ApprovalStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`${t("common." + status)}`);
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("extraStaff.department")}</Label>
                  <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
                    <SelectTrigger><SelectValue placeholder={t("extraStaff.selectDept")} /></SelectTrigger>
                    <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("extraStaff.date")}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("extraStaff.shift")}</Label>
                  <Select value={shift} onValueChange={(v) => setShift(v as ShiftType)}>
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
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 animate-fade-in">
            <CardHeader><CardTitle className="text-lg">{t("extraStaff.allRequests")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{req.department} — {shiftLabels[req.shift]}</p>
                    <p className="text-xs text-muted-foreground">{req.numberOfStaff} {t("common.staff")} · {req.date} · {req.requestedBy}</p>
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

export default ExtraStaffPage;
