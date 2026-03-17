import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { staffMembers, shiftAssignments as mockAssignments } from "@/lib/mock-data";
import { ShiftAssignment, ShiftType, Department } from "@/lib/types";
import { parseExcelRoster, generateSampleRoster, ParsedRoster } from "@/lib/parse-roster";
import { useForecast } from "@/contexts/ForecastContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { maskPhone } from "@/lib/privacy";
import { ChevronLeft, ChevronRight, Sun, Sunset, Moon, Coffee, Upload, Download, FileSpreadsheet, X, Flame, Sparkles, Mail, Phone, Timer } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const shiftConfig: Record<ShiftType, { bg: string; text: string; icon: typeof Sun }> = {
  Morning: { bg: "bg-success/15", text: "text-success", icon: Sun },
  Afternoon: { bg: "bg-accent/15", text: "text-accent", icon: Sunset },
  Night: { bg: "bg-primary/20", text: "text-primary-foreground", icon: Moon },
  "Day Off": { bg: "bg-muted", text: "text-muted-foreground", icon: Coffee },
  Break: { bg: "bg-warning/15", text: "text-warning", icon: Timer },
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

const RosterPage = () => {
  const [searchParams] = useSearchParams();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [uploadedRoster, setUploadedRoster] = useState<ParsedRoster | null>(null);
  const [dbShifts, setDbShifts] = useState<ShiftAssignment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { isManager } = useUserRole();
  const { user } = useAuth();

  // Load saved roster shifts from database
  useEffect(() => {
    const loadShifts = async () => {
      const { data, error } = await supabase
        .from("roster_shifts")
        .select("*");
      if (!error && data && data.length > 0) {
        const assignments: ShiftAssignment[] = data.map((row: any) => ({
          id: row.id,
          staffId: row.staff_name,
          date: row.date,
          shift: row.shift as ShiftType,
          department: row.department as Department,
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

  const shiftLabels: Record<ShiftType, string> = {
    Morning: t("roster.morning"),
    Afternoon: t("roster.afternoon"),
    Night: t("roster.night"),
    "Day Off": t("roster.dayOff"),
    Break: t("roster.break"),
  };

  const dateLocale = language === "tr" ? "tr-TR" : "en-US";

  // Priority: uploaded (unsaved) > saved DB shifts > mock data
  const activeAssignments: ShiftAssignment[] = uploadedRoster?.assignments ?? (dbShifts.length > 0 ? dbShifts : mockAssignments);

  const forecastByDate = useMemo(() => {
    if (!forecast) return {};
    const map: Record<string, { occupancyRate: number; events: string[] }> = {};
    forecast.days.forEach((d) => { map[d.date] = { occupancyRate: d.occupancyRate, events: d.events }; });
    return map;
  }, [forecast]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDate(null);
  };

  const saveRosterToDb = useCallback(async (result: ParsedRoster) => {
    if (!user) return;
    setSaving(true);
    try {
      // Delete existing shifts first
      await supabase.from("roster_shifts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Insert new shifts in batches of 500
      const rows = result.assignments.map((a) => ({
        user_id: user.id,
        staff_name: a.staffId,
        date: a.date,
        shift: a.shift,
        department: a.department,
      }));

      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("roster_shifts").insert(batch);
        if (error) throw error;
      }

      // Update local state
      const { data } = await supabase.from("roster_shifts").select("*");
      if (data) {
        setDbShifts(data.map((row: any) => ({
          id: row.id,
          staffId: row.staff_name,
          date: row.date,
          shift: row.shift as ShiftType,
          department: row.department as Department,
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
  }, [user, t]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error(t("forecast.invalidFile"));
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelRoster(buffer);
      setUploadedRoster(result);
      if (result.assignments.length > 0) {
        const firstDate = result.assignments[0].date;
        const d = new Date(firstDate + "T00:00:00");
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setSelectedDate(firstDate);
      }
      toast.success(`Roster loaded — ${result.assignments.length} shifts, ${result.staffNames.length} staff${result.skipped > 0 ? `, ${result.skipped} rows skipped` : ""}`);
      // Auto-save to database
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

  const downloadTemplate = () => {
    const buffer = generateSampleRoster();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roster-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const dayCounts = useMemo(() => {
    const counts: Record<string, Record<ShiftType, number>> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, month, d);
      const dayAssignments = activeAssignments.filter((a) => a.date === dateStr);
      if (dayAssignments.length > 0) {
        counts[dateStr] = { Morning: 0, Afternoon: 0, Night: 0, "Day Off": 0, Break: 0 };
        dayAssignments.forEach((a) => { counts[dateStr][a.shift]++; });
      }
    }
    return counts;
  }, [year, month, daysInMonth, activeAssignments]);

  const selectedAssignments = selectedDate
    ? activeAssignments.filter((a) => a.date === selectedDate)
    : [];

  const groupedByShift = useMemo(() => {
    const groups: Record<ShiftType, typeof selectedAssignments> = {
      Morning: [], Afternoon: [], Night: [], "Day Off": [], Break: [],
    };
    selectedAssignments.forEach((a) => { groups[a.shift].push(a); });
    return groups;
  }, [selectedAssignments]);

  const modalAssignments = modalDate
    ? activeAssignments.filter((a) => a.date === modalDate)
    : [];

  const modalGroupedByShift = useMemo(() => {
    const groups: Record<ShiftType, ShiftAssignment[]> = {
      Morning: [], Afternoon: [], Night: [], "Day Off": [], Break: [],
    };
    modalAssignments.forEach((a) => { groups[a.shift].push(a); });
    return groups;
  }, [modalAssignments]);

  const isFromDb = dbShifts.length > 0 && !uploadedRoster;

  const resolveStaffFull = (assignment: ShiftAssignment) => {
    if (uploadedRoster || isFromDb) return { name: assignment.staffId, role: assignment.department, email: "", phone: "" };
    const staff = staffMembers.find((s) => s.id === assignment.staffId);
    return staff ? { name: staff.name, role: staff.role, email: staff.email, phone: staff.phone } : { name: "Unknown", role: "", email: "", phone: "" };
  };

  const isToday = (day: number) => {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const resolveStaffName = (assignment: ShiftAssignment) => {
    if (uploadedRoster || isFromDb) return assignment.staffId;
    const staff = staffMembers.find((s) => s.id === assignment.staffId);
    return staff?.name ?? "Unknown";
  };

  const resolveStaffRole = (assignment: ShiftAssignment) => {
    if (uploadedRoster || isFromDb) return assignment.department;
    const staff = staffMembers.find((s) => s.id === assignment.staffId);
    return staff?.role ?? "";
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
                      {/* Occupancy indicator */}
                      {fc && !isSelected && (
                        <span className={cn(
                          "absolute top-0.5 right-0.5 text-[9px] font-bold",
                          isHighOcc ? "text-warning" : isMedOcc ? "text-accent" : "text-muted-foreground"
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
                          {hasData.Morning > 0 && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                          {hasData.Afternoon > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                          {hasData.Night > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          {hasData.Break > 0 && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
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

              <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t">
                {(Object.keys(shiftConfig) as ShiftType[]).map((shift) => (
                  <div key={shift} className="flex items-center gap-1.5 text-xs">
                    <span className={cn("h-2.5 w-2.5 rounded-full", shift === "Morning" ? "bg-success" : shift === "Afternoon" ? "bg-accent" : shift === "Night" ? "bg-primary" : "bg-muted-foreground/40")} />
                    <span className="text-muted-foreground">{shiftLabels[shift]}</span>
                  </div>
                ))}
                {forecast && (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-sm bg-warning/30 ring-1 ring-warning/40" />
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
                          ? "bg-warning/15 text-warning"
                          : forecastByDate[selectedDate].occupancyRate >= 75
                          ? "bg-accent/15 text-accent"
                          : "bg-success/15 text-success"
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
                  <div className="space-y-4">
                    {(Object.keys(groupedByShift) as ShiftType[]).map((shift) => {
                      const items = groupedByShift[shift];
                      if (items.length === 0) return null;
                      const config = shiftConfig[shift];
                      const Icon = config.icon;
                      return (
                        <div key={shift}>
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={cn("h-4 w-4", config.text)} />
                            <span className="text-sm font-semibold">{shiftLabels[shift]}</span>
                            <span className="text-xs text-muted-foreground">({items.length})</span>
                          </div>
                          <div className="space-y-1.5">
                            {items.map((a) => (
                              <div key={a.id} className={cn("flex items-center justify-between py-1.5 px-3 rounded-md text-sm", config.bg)}>
                                <span className="font-medium">{resolveStaffName(a)}</span>
                                <span className="text-xs text-muted-foreground">{resolveStaffRole(a)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {selectedAssignments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">{t("roster.noShifts")}</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("roster.selectDay")}</p>
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
            {(Object.keys(modalGroupedByShift) as ShiftType[]).map((shift) => {
              const items = modalGroupedByShift[shift];
              if (items.length === 0) return null;
              const config = shiftConfig[shift];
              const Icon = config.icon;
              return (
                <div key={shift}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn("h-4 w-4", config.text)} />
                    <span className="text-sm font-semibold">{shiftLabels[shift]}</span>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((a) => {
                      const staff = resolveStaffFull(a);
                      return (
                        <div key={a.id} className={cn("py-2 px-3 rounded-md", config.bg)}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{staff.name}</span>
                            <span className="text-xs text-muted-foreground">{staff.role}</span>
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
    </AppLayout>
  );
};

export default RosterPage;
