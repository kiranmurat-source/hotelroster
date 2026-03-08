import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { staffMembers, shiftAssignments as mockAssignments } from "@/lib/mock-data";
import { ShiftAssignment, ShiftType } from "@/lib/types";
import { parseExcelRoster, generateSampleRoster, ParsedRoster } from "@/lib/parse-roster";
import { useForecast } from "@/contexts/ForecastContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Sun, Sunset, Moon, Coffee, Upload, Download, FileSpreadsheet, X, Flame, Sparkles, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const shiftConfig: Record<ShiftType, { bg: string; text: string; icon: typeof Sun }> = {
  Morning: { bg: "bg-success/15", text: "text-success", icon: Sun },
  Afternoon: { bg: "bg-accent/15", text: "text-accent", icon: Sunset },
  Night: { bg: "bg-primary/20", text: "text-primary", icon: Moon },
  "Day Off": { bg: "bg-muted", text: "text-muted-foreground", icon: Coffee },
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
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(2);
  const [selectedDate, setSelectedDate] = useState<string | null>("2026-03-09");
  const [uploadedRoster, setUploadedRoster] = useState<ParsedRoster | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);

  // Navigate to date from query param (e.g. from forecast page)
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

  // Use uploaded data if available, otherwise mock
  const activeAssignments: ShiftAssignment[] = uploadedRoster?.assignments ?? mockAssignments;

  // Build a date→forecast lookup
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

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload an Excel file (.xlsx, .xls) or CSV");
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelRoster(buffer);
      setUploadedRoster(result);
      // Auto-navigate to first date in upload
      if (result.assignments.length > 0) {
        const firstDate = result.assignments[0].date;
        const d = new Date(firstDate + "T00:00:00");
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setSelectedDate(firstDate);
      }
      toast.success(`Roster loaded — ${result.assignments.length} shifts, ${result.staffNames.length} staff${result.skipped > 0 ? `, ${result.skipped} rows skipped` : ""}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse file. Check the format and try again.");
      console.error(err);
    }
  }, []);

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
        counts[dateStr] = { Morning: 0, Afternoon: 0, Night: 0, "Day Off": 0 };
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
      Morning: [], Afternoon: [], Night: [], "Day Off": [],
    };
    selectedAssignments.forEach((a) => { groups[a.shift].push(a); });
    return groups;
  }, [selectedAssignments]);

  // Modal data
  const modalAssignments = modalDate
    ? activeAssignments.filter((a) => a.date === modalDate)
    : [];

  const modalGroupedByShift = useMemo(() => {
    const groups: Record<ShiftType, ShiftAssignment[]> = {
      Morning: [], Afternoon: [], Night: [], "Day Off": [],
    };
    modalAssignments.forEach((a) => { groups[a.shift].push(a); });
    return groups;
  }, [modalAssignments]);

  const resolveStaffFull = (assignment: ShiftAssignment) => {
    if (uploadedRoster) return { name: assignment.staffId, role: assignment.department, email: "", phone: "" };
    const staff = staffMembers.find((s) => s.id === assignment.staffId);
    return staff ? { name: staff.name, role: staff.role, email: staff.email, phone: staff.phone } : { name: "Unknown", role: "", email: "", phone: "" };
  };

  const isToday = (day: number) => {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const resolveStaffName = (assignment: ShiftAssignment) => {
    if (uploadedRoster) return assignment.staffId; // staffId is the name for uploads
    const staff = staffMembers.find((s) => s.id === assignment.staffId);
    return staff?.name ?? "Unknown";
  };

  const resolveStaffRole = (assignment: ShiftAssignment) => {
    if (uploadedRoster) return assignment.department;
    const staff = staffMembers.find((s) => s.id === assignment.staffId);
    return staff?.role ?? "";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roster Calendar</h1>
            <p className="text-muted-foreground">
              {uploadedRoster
                ? `Uploaded roster — ${uploadedRoster.staffNames.length} staff, ${uploadedRoster.assignments.length} shifts`
                : "View and manage staff schedules"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1.5" />
              Template
            </Button>
            <label htmlFor="roster-upload">
              <Button variant="outline" size="sm" asChild>
                <span><Upload className="h-4 w-4 mr-1.5" />Upload Roster</span>
              </Button>
              <input id="roster-upload" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileInput} />
            </label>
            {uploadedRoster && (
              <Button variant="ghost" size="sm" onClick={() => { setUploadedRoster(null); toast.info("Switched back to default roster"); }}>
                <X className="h-4 w-4 mr-1.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Drop zone — shown when no data or as a compact banner */}
        {!uploadedRoster && (
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
                  <span className="font-medium text-foreground">Drop a roster Excel file</span> or click to upload — showing demo data below
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
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary ring-offset-2 ring-offset-background",
                        isToday(day) && !isSelected && "font-bold ring-1 ring-accent",
                        isWeekend && !isSelected && "text-muted-foreground",
                        !isSelected && isHighOcc && "bg-destructive/10 ring-1 ring-destructive/40",
                        !isSelected && isMedOcc && !isHighOcc && "bg-warning/10 ring-1 ring-warning/40",
                      )}
                    >
                      {/* Occupancy indicator */}
                      {fc && !isSelected && (
                        <span className={cn(
                          "absolute top-0.5 right-0.5 text-[9px] font-bold",
                          isHighOcc ? "text-destructive" : isMedOcc ? "text-warning" : "text-muted-foreground"
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
                    <span className="text-muted-foreground">{shift}</span>
                  </div>
                ))}
                {forecast && (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 rounded-sm bg-destructive/30 ring-1 ring-destructive/40" />
                      <span className="text-muted-foreground">High occ. (90%+)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Sparkles className="h-2.5 w-2.5 text-accent" />
                      <span className="text-muted-foreground">Event</span>
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
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">{selectedAssignments.length} staff assigned</p>

                  {/* Forecast banner */}
                  {selectedDate && forecastByDate[selectedDate] && (() => {
                    const fc = forecastByDate[selectedDate];
                    const isHigh = fc.occupancyRate >= 90;
                    const isMed = fc.occupancyRate >= 75;
                    return (
                      <div className={cn(
                        "rounded-md px-3 py-2 mb-4 flex items-start gap-2 text-xs",
                        isHigh ? "bg-destructive/10 text-destructive" : isMed ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                      )}>
                        <Flame className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold">{fc.occupancyRate}% occupancy forecasted</p>
                          {fc.events.length > 0 && (
                            <p className="opacity-80 mt-0.5">{fc.events.join(" · ")}</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {selectedAssignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No shifts scheduled for this date</p>
                  ) : (
                    <div className="space-y-4">
                      {(Object.keys(groupedByShift) as ShiftType[]).map((shift) => {
                        const assignments = groupedByShift[shift];
                        if (assignments.length === 0) return null;
                        const config = shiftConfig[shift];
                        const Icon = config.icon;

                        return (
                          <div key={shift}>
                            <div className={cn("flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md", config.bg)}>
                              <Icon className={cn("h-4 w-4", config.text)} />
                              <span className={cn("text-sm font-semibold", config.text)}>{shift}</span>
                              <span className={cn("text-xs ml-auto", config.text)}>{assignments.length} staff</span>
                            </div>
                            <div className="space-y-1 pl-1">
                              {assignments.map((a) => {
                                const name = resolveStaffName(a);
                                const role = resolveStaffRole(a);
                                return (
                                  <div key={a.id} className="flex items-center gap-2 py-1.5">
                                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                      {name.split(" ").map((n) => n[0]).join("")}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium leading-tight">{name}</p>
                                      <p className="text-xs text-muted-foreground">{role}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">Select a date to view shift details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Staff detail modal */}
      <Dialog open={!!modalDate} onOpenChange={(open) => { if (!open) setModalDate(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalDate && new Date(modalDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{modalAssignments.length} staff assigned</p>
          </DialogHeader>

          {/* Forecast banner in modal */}
          {modalDate && forecastByDate[modalDate] && (() => {
            const fc = forecastByDate[modalDate];
            const isHigh = fc.occupancyRate >= 90;
            const isMed = fc.occupancyRate >= 75;
            return (
              <div className={cn(
                "rounded-md px-3 py-2 flex items-start gap-2 text-xs",
                isHigh ? "bg-destructive/10 text-destructive" : isMed ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
              )}>
                <Flame className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{fc.occupancyRate}% occupancy forecasted</p>
                  {fc.events.length > 0 && <p className="opacity-80 mt-0.5">{fc.events.join(" · ")}</p>}
                </div>
              </div>
            );
          })()}

          {modalAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No shifts scheduled for this date</p>
          ) : (
            <div className="space-y-5">
              {(Object.keys(modalGroupedByShift) as ShiftType[]).map((shift) => {
                const assignments = modalGroupedByShift[shift];
                if (assignments.length === 0) return null;
                const config = shiftConfig[shift];
                const Icon = config.icon;

                return (
                  <div key={shift}>
                    <div className={cn("flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md", config.bg)}>
                      <Icon className={cn("h-4 w-4", config.text)} />
                      <span className={cn("text-sm font-semibold", config.text)}>{shift}</span>
                      <span className={cn("text-xs ml-auto", config.text)}>{assignments.length} staff</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {assignments.map((a) => {
                        const staff = resolveStaffFull(a);
                        return (
                          <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {staff.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-tight">{staff.name}</p>
                              <p className="text-xs text-muted-foreground">{staff.role}</p>
                              {staff.email && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Mail className="h-3 w-3 shrink-0" />{staff.email}
                                </p>
                              )}
                              {staff.phone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3 shrink-0" />{staff.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default RosterPage;
