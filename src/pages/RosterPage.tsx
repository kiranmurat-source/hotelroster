import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { ShiftAssignment, ShiftType, Department } from "@/lib/types";
import { parseExcelRoster, generateSampleRoster, ParsedRoster } from "@/lib/parse-roster";
import { useForecast } from "@/contexts/ForecastContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useShiftTypes, ShiftTypeRecord } from "@/hooks/useShiftTypes";
import { ShiftPill, ShiftDot } from "@/components/ShiftPill";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { maskPhone } from "@/lib/privacy";
import { ChevronLeft, ChevronRight, Sun, Sunset, Moon, Coffee, Upload, Download, FileSpreadsheet, X, Sparkles, Mail, Phone, Timer, Plus, Activity, AlertTriangle, Info } from "lucide-react";
import ManualShiftDialog from "@/components/ManualShiftDialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkload, WorkloadResult } from "@/hooks/useWorkload";
import { useHotelCalculations } from "@/hooks/useHotelCalculations";
import { Progress } from "@/components/ui/progress";

// Extended assignment type to hold shift_type_id
interface RosterShift extends ShiftAssignment {
  shift_type_id?: string | null;
  custom_start_time?: string | null;
  custom_end_time?: string | null;
  leave_request_id?: string | null;
  leave_type?: string | null;
}

const shiftConfig: Partial<Record<ShiftType, { bg: string; text: string; icon: typeof Sun }>> = {
  Morning: { bg: "bg-blue-100/50 dark:bg-blue-900/20", text: "text-blue-600", icon: Sun },
  Afternoon: { bg: "bg-orange-100/50 dark:bg-orange-900/20", text: "text-orange-600", icon: Sunset },
  Night: { bg: "bg-purple-100/50 dark:bg-purple-900/20", text: "text-purple-600", icon: Moon },
  "Day Off": { bg: "bg-muted", text: "text-muted-foreground", icon: Coffee },
  Break: { bg: "bg-emerald-100/50 dark:bg-emerald-900/20", text: "text-emerald-600", icon: Timer },
  "MID-PM": { bg: "bg-orange-100/50 dark:bg-orange-900/20", text: "text-orange-600", icon: Timer },
  "MID-NA": { bg: "bg-purple-100/50 dark:bg-purple-900/20", text: "text-purple-600", icon: Timer },
};

const LEAVE_BADGE: Record<string, { code: string; color: string; label: string }> = {
  annual: { code: "YIL", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", label: "Yıllık İzin" },
  administrative: { code: "IDAR", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300", label: "İdari İzin" },
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Map old ShiftType to new shift_type code */
const SHIFT_TO_CODE: Record<ShiftType, string> = {
  Morning: "A",
  Afternoon: "B",
  Night: "C",
  "Day Off": "OFF",
  Break: "MID-AM",
  "MID-PM": "MID-PM",
  "MID-NA": "MID-NA",
};

const RosterPage = () => {
  const [searchParams] = useSearchParams();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [uploadedRoster, setUploadedRoster] = useState<ParsedRoster | null>(null);
  const [dbShifts, setDbShifts] = useState<RosterShift[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [manualShiftOpen, setManualShiftOpen] = useState(false);

  const { isManager } = useUserRole();
  const { user } = useAuth();
  const { shiftTypes, getById, getByCode } = useShiftTypes();
  const { calcGuests, calcBreakfast, settings } = useHotelCalculations();

  // Load saved roster shifts from database
  useEffect(() => {
    const loadShifts = async () => {
      const shiftsRes = await supabase.from("roster_shifts").select("*, leave_requests(leave_type)");

      if (!shiftsRes.error && shiftsRes.data && shiftsRes.data.length > 0) {
        const assignments: RosterShift[] = shiftsRes.data.map((row: any) => ({
          id: row.id,
          staffId: row.staff_name,
          date: row.date,
          shift: row.shift as ShiftType,
          department: row.department as Department,
          shift_type_id: row.shift_type_id,
          custom_start_time: row.custom_start_time,
          custom_end_time: row.custom_end_time,
          leave_request_id: row.leave_request_id,
          leave_type: row.leave_requests?.leave_type || null,
        }));
        setDbShifts(assignments);
      }
    };
    loadShifts();
  }, []);


  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const d = new Date(dateParam + "T00:00:00");
      if (!isNaN(d.getTime())) {
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setSelectedDate(dateParam);
      }
    }
  }, [searchParams]);

  const { forecast } = useForecast();
  const { t, language } = useLanguage();

  const shiftLabels: Partial<Record<ShiftType, string>> = {
    Morning: t("roster.morning"),
    Afternoon: t("roster.afternoon"),
    Night: t("roster.night"),
    "Day Off": t("roster.dayOff"),
    Break: t("roster.break"),
    "MID-PM": "Akşam Ara",
    "MID-NA": "Gece Ara",
  };

  const dateLocale = language === "tr" ? "tr-TR" : "en-US";

  const activeAssignments: RosterShift[] = uploadedRoster?.assignments ?? dbShifts;

  const forecastByDate = useMemo(() => {
    if (!forecast) return {};
    const totalRooms = settings?.total_rooms ?? 144;
    const map: Record<string, { occupancyRate: number; events: string[] }> = {};
    forecast.days.forEach((d) => {
      const occ = totalRooms > 0 ? Math.round((d.roomNights / totalRooms) * 100) : 0;
      map[d.date] = { occupancyRate: occ, events: d.events };
    });
    return map;
  }, [forecast, settings]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1);
    setSelectedDate(null);
  };

  /** Resolve a shift_type_id for a given ShiftType code */
  const resolveShiftTypeId = useCallback((shift: ShiftType): string | undefined => {
    const code = SHIFT_TO_CODE[shift];
    return getByCode(code)?.id;
  }, [getByCode]);

  const saveRosterToDb = useCallback(async (result: ParsedRoster) => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("roster_shifts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const rows = result.assignments.map((a) => ({
        user_id: user.id,
        staff_name: a.staffId,
        date: a.date,
        shift: a.shift,
        department: a.department,
        shift_type_id: resolveShiftTypeId(a.shift) || null,
      }));

      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("roster_shifts").insert(batch);
        if (error) throw error;
      }

      const { data } = await supabase.from("roster_shifts").select("*");
      if (data) {
        setDbShifts(data.map((row: any) => ({
          id: row.id,
          staffId: row.staff_name,
          date: row.date,
          shift: row.shift as ShiftType,
          department: row.department as Department,
          shift_type_id: row.shift_type_id,
          custom_start_time: row.custom_start_time,
          custom_end_time: row.custom_end_time,
        })));
      }
      setUploadedRoster(null);
      toast.success(t("roster.saved") || "Roster saved successfully");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save roster: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }, [user, t, resolveShiftTypeId]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error(t("forecast.invalidFile"));
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseExcelRoster(buffer);
      setUploadedRoster(result);
      if (result.assignments.length > 0) {
        const firstDate = result.assignments[0].date;
        const d = new Date(firstDate + "T00:00:00");
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setSelectedDate(firstDate);
      }
      toast.success(`Roster loaded — ${result.assignments.length} shifts, ${result.staffNames.length} staff${result.skipped > 0 ? `, ${result.skipped} rows skipped` : ""}`);
      await saveRosterToDb(result);
    } catch (err: any) {
      toast.error(err?.message || t("forecast.parseFailed"));
      console.error(err);
    }
  }, [saveRosterToDb, t]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = async () => {
    const buffer = await generateSampleRoster();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roster-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  /** Resolve shift type for display */
  const resolveShiftType = useCallback((a: RosterShift): ShiftTypeRecord | null => {
    if (a.shift_type_id) return getById(a.shift_type_id) || null;
    // Fallback: try to map old text shift to a shift type
    const code = SHIFT_TO_CODE[a.shift];
    if (code) return getByCode(code) || null;
    return null;
  }, [getById, getByCode]);

  // Calendar day counts by shift type color
  const dayCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, month, d);
      const dayAssignments = activeAssignments.filter((a) => a.date === dateStr);
      if (dayAssignments.length > 0) {
        const colorCounts: Record<string, number> = {};
        dayAssignments.forEach((a) => {
          const st = resolveShiftType(a as RosterShift);
          const color = st?.color || "gray";
          colorCounts[color] = (colorCounts[color] || 0) + 1;
        });
        counts[dateStr] = colorCounts;
      }
    }
    return counts;
  }, [year, month, daysInMonth, activeAssignments, resolveShiftType]);


  const selectedAssignments = selectedDate
    ? activeAssignments.filter((a) => a.date === selectedDate)
    : [];

  // Group by shift type
  const groupedByShiftType = useMemo(() => {
    const groups: Map<string, { shiftType: ShiftTypeRecord | null; items: RosterShift[] }> = new Map();
    
    (selectedAssignments as RosterShift[]).forEach((a) => {
      const st = resolveShiftType(a);
      const key = st?.id || a.shift;
      if (!groups.has(key)) {
        groups.set(key, { shiftType: st, items: [] });
      }
      groups.get(key)!.items.push(a);
    });

    // Sort by shift type sort_order
    return Array.from(groups.values()).sort((a, b) => {
      const orderA = a.shiftType?.sort_order ?? 99;
      const orderB = b.shiftType?.sort_order ?? 99;
      return orderA - orderB;
    });
  }, [selectedAssignments, resolveShiftType]);

  // Group selected day assignments by department
  const groupedByDepartment = useMemo(() => {
    const groups: Map<string, RosterShift[]> = new Map();
    (selectedAssignments as RosterShift[]).forEach((a) => {
      const dept = a.department || "Other";
      if (!groups.has(dept)) groups.set(dept, []);
      groups.get(dept)!.push(a);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [selectedAssignments]);

  // Workload calculation
  const { calcLunch, calcDinner } = useHotelCalculations();

  const forecastDayInput = useMemo(() => {
    if (!selectedDate || !forecast) return null;
    const dayIndex = forecast.days.findIndex((d) => d.date === selectedDate);
    if (dayIndex < 0) return null;
    const day = forecast.days[dayIndex];
    const prevDay = dayIndex > 0 ? forecast.days[dayIndex - 1] : day;
    return {
      roomNights: day.roomNights,
      prevDayRoomNights: prevDay.roomNights,
      arrivals: day.arrivals,
      departures: day.departures,
      breakfastCovers: calcBreakfast(calcGuests(prevDay.roomNights)),
      lunchCovers: calcLunch(calcGuests(day.roomNights), day.lunchCovers || 0),
      dinnerCovers: calcDinner(calcGuests(day.roomNights), day.dinnerCovers || 0),
    };
  }, [selectedDate, forecast, calcBreakfast, calcGuests, calcLunch, calcDinner]);

  const workload = useWorkload(
    selectedAssignments as { shift_type_id?: string | null; custom_start_time?: string | null; department: string; shift: string }[],
    forecastDayInput
  );
  const modalAssignments = modalDate
    ? (activeAssignments as RosterShift[]).filter((a) => a.date === modalDate)
    : [];

  const modalGrouped = useMemo(() => {
    const groups: Map<string, { shiftType: ShiftTypeRecord | null; items: RosterShift[] }> = new Map();
    modalAssignments.forEach((a) => {
      const st = resolveShiftType(a);
      const key = st?.id || a.shift;
      if (!groups.has(key)) groups.set(key, { shiftType: st, items: [] });
      groups.get(key)!.items.push(a);
    });
    return Array.from(groups.values()).sort((a, b) => (a.shiftType?.sort_order ?? 99) - (b.shiftType?.sort_order ?? 99));
  }, [modalAssignments, resolveShiftType]);

  const isFromDb = dbShifts.length > 0 && !uploadedRoster;

  const resolveStaffFull = (assignment: ShiftAssignment) => {
    return { name: assignment.staffId, role: assignment.department, email: "", phone: "" };
  };

  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const resolveStaffName = (assignment: ShiftAssignment) => {
    return assignment.staffId;
  };

  const resolveStaffRole = (assignment: ShiftAssignment) => {
    return assignment.department;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("roster.title")}</h1>
            <p className="text-muted-foreground">
              {uploadedRoster
                ? t("roster.uploadedInfo").replace("{staff}", String(uploadedRoster.staffNames.length)).replace("{shifts}", String(uploadedRoster.assignments.length))
                : t("roster.subtitle")}
            </p>
          </div>
          {isManager && (
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={() => setManualShiftOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Vardiya Ata
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1.5" />
                {t("roster.template")}
              </Button>
              <label htmlFor="roster-upload">
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="h-4 w-4 mr-1.5" />{t("roster.uploadRoster")}</span>
                </Button>
                <input id="roster-upload" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileInput} />
              </label>
              {(uploadedRoster || dbShifts.length > 0) && (
                <Button variant="ghost" size="sm" onClick={async () => {
                  setUploadedRoster(null);
                  setDbShifts([]);
                  await supabase.from("roster_shifts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                  toast.info(t("roster.switchedBack"));
                }}>
                  <X className="h-4 w-4 mr-1.5" />
                  {t("roster.clear")}
                </Button>
              )}
            </div>
          )}
        </div>

        {!uploadedRoster && dbShifts.length === 0 && isManager && (
          <Card className="animate-fade-in">
            <CardContent className="p-0">
              <label
                htmlFor="roster-upload-drop"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex items-center justify-center gap-3 py-4 px-6 cursor-pointer rounded-lg border-2 border-dashed transition-colors",
                  isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                )}
              >
                <FileSpreadsheet className="h-5 w-5 text-accent shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{t("roster.dropFile")}</span> {t("roster.orClick")}
                </p>
                <input id="roster-upload-drop" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileInput} />
              </label>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Calendar */}
          <Card className="lg:col-span-3 animate-fade-in">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-5">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = formatDate(year, month, day);
                  const hasData = dayCounts[dateStr];
                  const isSelected = selectedDate === dateStr;
                  const isSunday = (firstDay + i) % 7 === 6;
                  const isSaturday = (firstDay + i) % 7 === 5;
                  const isWeekend = isSunday || isSaturday;
                  const fc = forecastByDate[dateStr];
                  const isHighOcc = fc && fc.occupancyRate >= 90;
                  const isMedOcc = fc && fc.occupancyRate >= 75 && fc.occupancyRate < 90;
                  const hasEvents = fc && fc.events.length > 0;
                  
                  const calButton = (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      onDoubleClick={() => setModalDate(dateStr)}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative",
                        "hover:bg-secondary",
                        isSelected && "bg-accent text-accent-foreground hover:bg-accent/90 ring-2 ring-accent ring-offset-2 ring-offset-background",
                        isToday(day) && !isSelected && "font-bold ring-1 ring-accent",
                        isWeekend && !isSelected && "text-muted-foreground",
                      )}
                    >
                      {fc && !isSelected && (
                        <span className={cn(
                          "absolute top-0.5 right-0.5 text-[9px] font-bold",
                          isHighOcc ? "text-orange-500" : isMedOcc ? "text-blue-500" : "text-muted-foreground"
                        )}>
                          {fc.occupancyRate}%
                        </span>
                      )}
                      {hasEvents && !isSelected && (
                        <Sparkles className="absolute top-0.5 left-0.5 h-2.5 w-2.5 text-accent" />
                      )}
                      <span className={cn("text-sm", isSelected ? "font-bold" : "font-medium")}>{day}</span>
                      {hasData && !isSelected && (
                        <div className="flex gap-0.5 mt-0.5">
                          {Object.keys(hasData).filter(c => c !== "gray").map((color) => (
                            <ShiftDot key={color} color={color} />
                          ))}
                        </div>
                      )}
                    </button>
                  );

                  if (fc) {
                    return (
                      <Tooltip key={day}>
                        <TooltipTrigger asChild>{calButton}</TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-semibold">{fc.occupancyRate}% occupancy</p>
                          {fc.events.length > 0 && <p className="text-muted-foreground">{fc.events.join(", ")}</p>}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return calButton;
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t">
                {shiftTypes.map((st) => (
                  <div key={st.id} className="flex items-center gap-1.5 text-xs">
                    <ShiftDot color={st.color} />
                    <span className="text-muted-foreground">{st.code} — {st.label}</span>
                  </div>
                ))}
                {forecast && (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-sm bg-orange-200 ring-1 ring-orange-300" />
                      <span className="text-muted-foreground">{t("roster.highOcc")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Sparkles className="h-2.5 w-2.5 text-accent" />
                      <span className="text-muted-foreground">{t("roster.event")}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Day detail panel */}
          <Card className="lg:col-span-2 animate-fade-in">
            <CardContent className="p-5">
              {selectedDate ? (
                <>
                  <h3 className="font-semibold text-lg mb-1">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString(dateLocale, { weekday: "long", month: "long", day: "numeric" })}
                  </h3>
                  {forecastByDate[selectedDate] && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        forecastByDate[selectedDate].occupancyRate >= 90
                          ? "bg-orange-100 text-orange-700"
                          : forecastByDate[selectedDate].occupancyRate >= 75
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                      )}>
                        {forecastByDate[selectedDate].occupancyRate}% occ.
                      </span>
                      {forecastByDate[selectedDate].events.map((ev, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] text-accent">
                          <Sparkles className="h-2.5 w-2.5" />{ev}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Workload Panel */}
                  {selectedDate && workload && (() => {
                    const groups = [
                      { key: "sabah", label: "Sabah", data: workload.sabah },
                      { key: "aksam", label: "Akşam", data: workload.aksam },
                      { key: "gece", label: "Gece", data: workload.gece },
                    ].filter(g => g.data.roomsWorkload !== null || g.data.fnbWorkload !== null);

                    if (groups.length === 0) return null;

                    const allValues = groups.flatMap(g => [g.data.roomsWorkload, g.data.fnbWorkload]).filter((v): v is number => v !== null);
                    const hasOverload = allValues.some(v => v > 100);
                    const allLow = allValues.length > 0 && allValues.every(v => v < 70);

                    const getBarColor = (v: number) => v > 100 ? "bg-red-500" : v >= 80 ? "bg-yellow-500" : "bg-emerald-500";

                    return (
                      <div className="mb-5 p-3 rounded-lg border bg-card space-y-2">
                        <div className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                          <Activity className="h-4 w-4" />
                          İş Yükü
                        </div>
                        {hasOverload && (
                          <div className="flex items-center gap-1.5 text-xs p-2 rounded bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Aşırı yüklü vardiya tespit edildi
                          </div>
                        )}
                        {allLow && !hasOverload && (
                          <div className="flex items-center gap-1.5 text-xs p-2 rounded bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                            <Info className="h-3.5 w-3.5" />
                            Düşük personel kullanımı
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {groups.map(({ key, label, data }) => (
                            <div key={key}>
                              {data.roomsWorkload !== null && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 text-xs py-1 cursor-help">
                                      <span className="w-12 font-medium">{label}</span>
                                      <span className="w-12 text-muted-foreground">Rooms</span>
                                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full transition-all", getBarColor(data.roomsWorkload))} style={{ width: `${Math.min(data.roomsWorkload, 100)}%` }} />
                                      </div>
                                      <span className="w-10 text-right font-medium">{data.roomsWorkload}%</span>
                                      {data.roomsWorkload > 100 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                    </div>
                                  </TooltipTrigger>
                                  {data.roomsDetail && (
                                    <TooltipContent side="top" className="text-xs max-w-xs">
                                      {data.roomsDetail}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              )}
                              {data.fnbWorkload !== null && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 text-xs py-1 cursor-help">
                                      <span className="w-12 font-medium">{data.roomsWorkload !== null ? "" : label}</span>
                                      <span className="w-12 text-muted-foreground">F&B</span>
                                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div className={cn("h-full rounded-full transition-all", getBarColor(data.fnbWorkload))} style={{ width: `${Math.min(data.fnbWorkload, 100)}%` }} />
                                      </div>
                                      <span className="w-10 text-right font-medium">{data.fnbWorkload}%</span>
                                      {data.fnbWorkload > 100 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                                    </div>
                                  </TooltipTrigger>
                                  {data.fnbDetail && (
                                    <TooltipContent side="top" className="text-xs max-w-xs">
                                      {data.fnbDetail}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="space-y-5">
                    {groupedByDepartment.map(([dept, deptItems]) => (
                      <div key={dept}>
                        <div className="flex items-center gap-2 mb-3 pb-1 border-b">
                          <span className="text-sm font-bold text-foreground">{dept}</span>
                          <span className="text-xs text-muted-foreground">({deptItems.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {deptItems.map((a) => {
                            const st = resolveShiftType(a);
                            const leaveBadge = a.leave_request_id && a.leave_type ? LEAVE_BADGE[a.leave_type] : null;
                            const bgClass = leaveBadge
                              ? leaveBadge.color
                              : st
                                ? shiftConfig[a.shift]?.bg || "bg-muted"
                                : "bg-muted";
                            return (
                              <Tooltip key={a.id}>
                                <TooltipTrigger asChild>
                                  <div className={cn("flex items-center justify-between py-1.5 px-3 rounded-md text-sm", bgClass)}>
                                    <div className="flex items-center gap-2">
                                      {leaveBadge && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-background/50">{leaveBadge.code}</span>
                                      )}
                                      <span className="font-medium">{resolveStaffName(a)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {st && <ShiftPill shiftType={st} size="sm" />}
                                      {a.custom_start_time && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {a.custom_start_time?.slice(0,5)}-{a.custom_end_time?.slice(0,5)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                {leaveBadge && (
                                  <TooltipContent side="top" className="text-xs">
                                    <p className="font-semibold">{leaveBadge.label}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {selectedAssignments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">{t("roster.noShifts")}</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("roster.selectDate")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail modal */}
      <Dialog open={!!modalDate} onOpenChange={() => setModalDate(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalDate && new Date(modalDate + "T00:00:00").toLocaleDateString(dateLocale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {modalGrouped.map(({ shiftType, items }) => {
              if (items.length === 0) return null;
              return (
                <div key={shiftType?.id || "unknown"}>
                  <div className="flex items-center gap-2 mb-2">
                    {shiftType ? (
                      <ShiftPill shiftType={shiftType} size="md" />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">{items[0]?.shift}</span>
                    )}
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((a) => {
                      const staff = resolveStaffFull(a);
                      const bgClass = shiftType
                        ? shiftConfig[a.shift]?.bg || "bg-muted"
                        : "bg-muted";
                      return (
                        <div key={a.id} className={cn("py-2 px-3 rounded-md", bgClass)}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{staff.name}</span>
                            <div className="flex items-center gap-2">
                              {shiftType && a.custom_start_time && (
                                <span className="text-[10px] text-muted-foreground">
                                  {a.custom_start_time?.slice(0,5)} - {a.custom_end_time?.slice(0,5)}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{staff.role}</span>
                            </div>
                          </div>
                          {(staff.email || staff.phone) && (
                            <div className="flex gap-4 mt-1">
                              {staff.email && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />{staff.email}
                                </span>
                              )}
                              {staff.phone && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />{isManager ? staff.phone : maskPhone(staff.phone)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {modalAssignments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("roster.noShifts")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Manual shift dialog */}
      <ManualShiftDialog
        open={manualShiftOpen}
        onOpenChange={setManualShiftOpen}
        defaultDate={selectedDate || formatDate(year, month, today.getDate() <= daysInMonth ? today.getDate() : 1)}
        onSaved={async () => {
          const { data } = await supabase.from("roster_shifts").select("*, leave_requests(leave_type)");
          if (data) {
            setDbShifts(data.map((row: any) => ({
              id: row.id,
              staffId: row.staff_name,
              date: row.date,
              shift: row.shift,
              department: row.department,
              shift_type_id: row.shift_type_id,
              custom_start_time: row.custom_start_time,
              custom_end_time: row.custom_end_time,
              leave_request_id: row.leave_request_id,
              leave_type: row.leave_requests?.leave_type || null,
            })));
          }
        }}
      />
    </AppLayout>
  );
};

export default RosterPage;
