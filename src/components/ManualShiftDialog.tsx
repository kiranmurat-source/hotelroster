import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useShiftTypes, ShiftTypeRecord } from "@/hooks/useShiftTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ShiftPill } from "@/components/ShiftPill";
import { useForecast } from "@/contexts/ForecastContext";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Save, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  department: string | null;
}

interface ManualShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  onSaved: () => void;
}

const DAY_LABELS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function getWeekDates(refDate: string): string[] {
  const d = new Date(refDate + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt.toISOString().slice(0, 10);
  });
}

function formatShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.getDate().toString();
}

function formatMonthLabel(dates: string[]) {
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[6] + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${first.toLocaleDateString("tr-TR", opts)} — ${last.toLocaleDateString("tr-TR", opts)}`;
}

// Cell key: `profileId__date`
type CellKey = string;
function cellKey(profileId: string, date: string): CellKey {
  return `${profileId}__${date}`;
}

const ManualShiftDialog = ({ open, onOpenChange, defaultDate, onSaved }: ManualShiftDialogProps) => {
  const { user } = useAuth();
  const { profile: myProfile } = useUserProfile();
  const { isAdmin } = useUserRole();
  const { shiftTypes } = useShiftTypes();
  const { forecast } = useForecast();

  const forecastByDate = useMemo(() => {
    if (!forecast) return {};
    const map: Record<string, { occupancyRate: number; events: string[] }> = {};
    forecast.days.forEach((d) => {
      const occ = d.totalRooms > 0 ? Math.round((d.roomNights / d.totalRooms) * 100) : 0;
      map[d.date] = { occupancyRate: occ, events: d.events };
    });
    return map;
  }, [forecast]);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Assignments: cellKey -> shift_type_id
  const [assignments, setAssignments] = useState<Record<CellKey, string>>({});
  // Existing DB shift ids to track what needs delete/insert
  const [existingShifts, setExistingShifts] = useState<Record<CellKey, string>>({});

  const refDate = defaultDate || new Date().toISOString().slice(0, 10);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDates = useMemo(() => {
    const base = new Date(refDate + "T00:00:00");
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDates(base.toISOString().slice(0, 10));
  }, [refDate, weekOffset]);

  const myDepartment = myProfile?.department;

  // Set default department when profile loads
  useEffect(() => {
    if (myDepartment && !selectedDepartment) {
      setSelectedDepartment(myDepartment);
    }
  }, [myDepartment, selectedDepartment]);

  // Load all departments for admin
  useEffect(() => {
    if (!open || !isAdmin) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("department")
        .not("department", "is", null);
      if (data) {
        const depts = [...new Set(data.map((d: any) => d.department as string).filter(Boolean))].sort();
        setAllDepartments(depts);
      }
    };
    load();
  }, [open, isAdmin]);

  const activeDepartment = selectedDepartment || myDepartment || "";

  // Load department profiles
  useEffect(() => {
    if (!open || !activeDepartment) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, department")
        .eq("department", activeDepartment)
        .order("display_name");
      if (data) setProfiles(data as Profile[]);
    };
    load();
    setAssignments({});
    setExistingShifts({});
  }, [open, activeDepartment]);

  // Load existing shifts for the week
  useEffect(() => {
    if (!open || profiles.length === 0 || weekDates.length === 0) return;
    const load = async () => {
      const { data } = await supabase
        .from("roster_shifts")
        .select("id, staff_name, date, shift_type_id, department")
        .in("date", weekDates)
        .eq("department", myDepartment || "");

      const asgn: Record<CellKey, string> = {};
      const existing: Record<CellKey, string> = {};

      if (data) {
        data.forEach((row: any) => {
          // Match by staff_name to profile
          const prof = profiles.find(
            (p) => p.display_name === row.staff_name
          );
          if (prof && row.shift_type_id) {
            const key = cellKey(prof.id, row.date);
            asgn[key] = row.shift_type_id;
            existing[key] = row.id;
          }
        });
      }
      setAssignments(asgn);
      setExistingShifts(existing);
    };
    load();
  }, [open, profiles, weekDates, myDepartment]);

  const setCell = useCallback((profileId: string, date: string, shiftTypeId: string) => {
    const key = cellKey(profileId, date);
    const clearVal = shiftTypeId === "__clear__" ? "" : shiftTypeId;
    setAssignments((prev) => {
      if (!clearVal) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: clearVal };
    });
  }, []);

  const handleSave = async () => {
    if (!user || !myDepartment) return;
    setSaving(true);
    try {
      // Collect all existing ids to delete for this week+department
      const existingIds = Object.values(existingShifts);
      if (existingIds.length > 0) {
        const { error: delErr } = await supabase
          .from("roster_shifts")
          .delete()
          .in("id", existingIds);
        if (delErr) throw delErr;
      }

      // Build insert rows
      const rows: any[] = [];
      Object.entries(assignments).forEach(([key, shiftTypeId]) => {
        const [profileId, date] = key.split("__");
        const prof = profiles.find((p) => p.id === profileId);
        const st = shiftTypes.find((s) => s.id === shiftTypeId);
        if (!prof || !st) return;
        rows.push({
          user_id: user.id,
          staff_name: prof.display_name || "Unknown",
          date,
          shift: st.code,
          department: myDepartment,
          shift_type_id: shiftTypeId,
        });
      });

      if (rows.length > 0) {
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabase.from("roster_shifts").insert(rows.slice(i, i + 500));
          if (error) throw error;
        }
      }

      toast.success(`${rows.length} vardiya kaydedildi`);
      onSaved();
    } catch (err: any) {
      toast.error("Kayıt hatası: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const changedCount = useMemo(() => {
    // Count cells that differ from existing
    const allKeys = new Set([...Object.keys(assignments), ...Object.keys(existingShifts)]);
    let count = 0;
    allKeys.forEach((key) => {
      const cur = assignments[key];
      const had = existingShifts[key] ? true : false;
      if (cur && !had) count++;
      if (!cur && had) count++;
    });
    return count;
  }, [assignments, existingShifts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Haftalık Vardiya Atama — {myDepartment || ""}
          </DialogTitle>
        </DialogHeader>

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{formatMonthLabel(weekDates)}</span>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset((o) => o + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 px-2 font-semibold text-muted-foreground min-w-[140px]">Personel</th>
                {weekDates.map((d, i) => {
                  const isWeekend = i >= 5;
                  const fc = forecastByDate[d];
                  const isHighOcc = fc && fc.occupancyRate >= 90;
                  const isMedOcc = fc && fc.occupancyRate >= 75 && fc.occupancyRate < 90;
                  return (
                    <th key={d} className={cn(
                      "text-center py-2 px-1 font-medium min-w-[90px]",
                      isWeekend ? "text-muted-foreground" : "text-foreground"
                    )}>
                      <div className="text-xs">{DAY_LABELS_TR[i]}</div>
                      <div className="text-[10px] text-muted-foreground">{formatShort(d)}</div>
                      {fc && (
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <span className={cn(
                            "text-[9px] font-bold px-1 rounded",
                            isHighOcc ? "bg-destructive/10 text-destructive" : isMedOcc ? "bg-primary/10 text-primary" : "text-muted-foreground"
                          )}>
                            {fc.occupancyRate}%
                          </span>
                          {fc.events.length > 0 && (
                            <Sparkles className="h-2.5 w-2.5 text-accent" />
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {profiles.map((prof) => (
                <tr key={prof.id} className="border-t">
                  <td className="py-1.5 px-2 font-medium whitespace-nowrap">
                    {prof.display_name || "—"}
                  </td>
                  {weekDates.map((date) => {
                    const key = cellKey(prof.id, date);
                    const selectedId = assignments[key] || "";
                    const st = shiftTypes.find((s) => s.id === selectedId);
                    return (
                      <td key={date} className="py-1 px-1">
                        <Select
                          value={selectedId}
                          onValueChange={(val) => setCell(prof.id, date, val)}
                        >
                          <SelectTrigger className="h-8 text-xs px-1.5 w-full">
                            {st ? (
                              <ShiftPill shiftType={st} size="sm" showTime={false} />
                            ) : (
                              <span className="text-muted-foreground text-[10px]">—</span>
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__clear__">
                              <span className="text-muted-foreground">Temizle</span>
                            </SelectItem>
                            {shiftTypes.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center gap-2">
                                  <ShiftPill shiftType={s} size="sm" showTime={false} />
                                  <span className="text-xs text-muted-foreground">{s.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                    {myDepartment ? "Bu departmanda personel bulunamadı" : "Departman bilgisi yükleniyor..."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {shiftTypes.map((st) => (
            <ShiftPill key={st.id} shiftType={st} size="sm" showTime={false} />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualShiftDialog;
