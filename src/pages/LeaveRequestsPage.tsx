import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Trash2, CalendarCheck } from "lucide-react";

type LeaveType = "annual" | "administrative";
type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveRequest {
  id: string;
  staff_id: string;
  department: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
  notes: string | null;
  status: LeaveStatus;
  created_at: string;
  staff_name?: string;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  department: string | null;
}

const leaveTypeConfig: Record<LeaveType, { label: string; labelEn: string; color: string }> = {
  annual: { label: "Yıllık İzin", labelEn: "Annual Leave", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  administrative: { label: "İdari İzin", labelEn: "Administrative Leave", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

const statusConfig: Record<LeaveStatus, { label: string; labelEn: string; color: string }> = {
  approved: { label: "Onaylandı", labelEn: "Approved", color: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Beklemede", labelEn: "Pending", color: "bg-amber-100 text-amber-700" },
  rejected: { label: "Reddedildi", labelEn: "Rejected", color: "bg-red-100 text-red-700" },
};

const LeaveRequestsPage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { isManager } = useUserRole();

  // Form state
  const [staffId, setStaffId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [daysRequested, setDaysRequested] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  // Load data
  useEffect(() => {
    const load = async () => {
      const [profilesRes, leavesRes] = await Promise.all([
        supabase.from("profiles").select("id, user_id, display_name, department"),
        supabase.from("leave_requests").select("*").order("created_at", { ascending: false }),
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
      if (leavesRes.data) {
        const requests = (leavesRes.data as any[]).map((r) => ({
          ...r,
          staff_name: profilesRes.data?.find((p: Profile) => p.id === r.staff_id)?.display_name || "Unknown",
        }));
        setLeaveRequests(requests);
      }
    };
    load();
  }, []);

  const filteredRequests = useMemo(() => {
    return leaveRequests.filter((r) => {
      if (filterType !== "all" && r.leave_type !== filterType) return false;
      if (filterMonth !== "all") {
        const month = r.start_date.substring(0, 7);
        if (month !== filterMonth) return false;
      }
      return true;
    });
  }, [leaveRequests, filterType, filterMonth]);

  const availableMonths = useMemo(() => {
    const months = new Set(leaveRequests.map((r) => r.start_date.substring(0, 7)));
    return Array.from(months).sort();
  }, [leaveRequests]);

  const handleSubmit = useCallback(async () => {
    if (!staffId || !startDate || !endDate || !daysRequested || !user) {
      toast.error(t("leave.fillAll"));
      return;
    }

    const profile = profiles.find((p) => p.id === staffId);
    if (!profile) return;

    setSubmitting(true);
    try {
      const { data: leaveData, error: leaveError } = await supabase
        .from("leave_requests")
        .insert({
          staff_id: staffId,
          department: profile.department || "",
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          days_requested: daysRequested,
          notes: notes || null,
          status: "approved",
          approved_by: profiles.find((p) => p.user_id === user.id)?.id || null,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (leaveError) throw leaveError;

      // Get OFF shift type
      const { data: offType } = await supabase
        .from("shift_types")
        .select("id")
        .eq("code", "OFF")
        .single();

      // Create roster_shifts for each day
      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T00:00:00");
      const rosterRows: any[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        rosterRows.push({
          user_id: user.id,
          staff_name: profile.display_name || "Unknown",
          date: dateStr,
          shift: "OFF",
          department: profile.department || "",
          shift_type_id: offType?.id || null,
          leave_request_id: leaveData.id,
        });
      }

      if (rosterRows.length > 0) {
        const { error: rosterError } = await supabase.from("roster_shifts").insert(rosterRows);
        if (rosterError) console.error("Roster insert error:", rosterError);
      }

      const newRequest: LeaveRequest = {
        ...leaveData,
        staff_name: profile.display_name || "Unknown",
      } as any;
      setLeaveRequests((prev) => [newRequest, ...prev]);

      setStaffId("");
      setStartDate("");
      setEndDate("");
      setDaysRequested(1);
      setNotes("");
      toast.success(t("leave.saved"));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  }, [staffId, leaveType, startDate, endDate, daysRequested, notes, user, profiles, t]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await supabase.from("roster_shifts").delete().eq("leave_request_id", id);
      const { error } = await supabase.from("leave_requests").delete().eq("id", id);
      if (error) throw error;
      setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("leave.deleted"));
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
  }, [t]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("leave.title")}</h1>
          <p className="text-muted-foreground">{t("leave.subtitle")}</p>
        </div>

        <div className="space-y-6">
          {/* Section A: New Leave Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("leave.addNew")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("leave.staff")}</Label>
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger><SelectValue placeholder={t("leave.selectStaff")} /></SelectTrigger>
                  <SelectContent>
                    {profiles.filter(p => p.display_name).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.display_name} {p.department ? `(${p.department})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t("leave.type")}</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(leaveTypeConfig) as LeaveType[]).map((type) => {
                    const config = leaveTypeConfig[type];
                    const isSelected = leaveType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setLeaveType(type)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border-2",
                          isSelected
                            ? cn(config.color, "border-current ring-2 ring-offset-1 ring-current/20")
                            : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                        )}
                      >
                        {language === "tr" ? config.label : config.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("leave.startDate")}</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("leave.endDate")}</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("leave.days")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={daysRequested}
                  onChange={(e) => setDaysRequested(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("leave.notes")}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("leave.notesPlaceholder")}
                  rows={2}
                />
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                <CalendarCheck className="h-4 w-4 mr-2" />
                {t("leave.save")}
              </Button>
            </CardContent>
          </Card>

          {/* Section B: Leave Requests List */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base">{t("leave.allRequests")}</CardTitle>
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("leave.allTypes")}</SelectItem>
                      {(Object.keys(leaveTypeConfig) as LeaveType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {language === "tr" ? leaveTypeConfig[type].label : leaveTypeConfig[type].labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("leave.allMonths")}</SelectItem>
                      {availableMonths.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("leave.staffCol")}</TableHead>
                      <TableHead>{t("leave.deptCol")}</TableHead>
                      <TableHead>{t("leave.typeCol")}</TableHead>
                      <TableHead>{t("leave.startCol")}</TableHead>
                      <TableHead>{t("leave.endCol")}</TableHead>
                      <TableHead>{t("leave.daysCol")}</TableHead>
                      <TableHead>{t("leave.statusCol")}</TableHead>
                      <TableHead>{t("leave.notesCol")}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          {t("leave.noRequests")}
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredRequests.map((r) => {
                      const typeConf = leaveTypeConfig[r.leave_type];
                      const statusConf = statusConfig[r.status];
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-sm">{r.staff_name}</TableCell>
                          <TableCell className="text-sm">{r.department}</TableCell>
                          <TableCell>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", typeConf.color)}>
                              {language === "tr" ? typeConf.label : typeConf.labelEn}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{r.start_date}</TableCell>
                          <TableCell className="text-sm">{r.end_date}</TableCell>
                          <TableCell className="text-sm text-center">{r.days_requested}</TableCell>
                          <TableCell>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", statusConf.color)}>
                              {language === "tr" ? statusConf.label : statusConf.labelEn}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{r.notes || "—"}</TableCell>
                          <TableCell>
                            {isManager && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default LeaveRequestsPage;
