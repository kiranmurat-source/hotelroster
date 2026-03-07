import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { staffMembers, shiftAssignments } from "@/lib/mock-data";
import { ShiftType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Sun, Sunset, Moon, Coffee } from "lucide-react";

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
  return day === 0 ? 6 : day - 1; // Monday = 0
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const RosterPage = () => {
  const today = new Date();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(2); // March 2026 to match mock data
  const [selectedDate, setSelectedDate] = useState<string | null>("2026-03-09");

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

  // Get shift counts per day for the heatmap dots
  const dayCounts = useMemo(() => {
    const counts: Record<string, Record<ShiftType, number>> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, month, d);
      const dayAssignments = shiftAssignments.filter((a) => a.date === dateStr);
      if (dayAssignments.length > 0) {
        counts[dateStr] = { Morning: 0, Afternoon: 0, Night: 0, "Day Off": 0 };
        dayAssignments.forEach((a) => { counts[dateStr][a.shift]++; });
      }
    }
    return counts;
  }, [year, month, daysInMonth]);

  const selectedAssignments = selectedDate
    ? shiftAssignments.filter((a) => a.date === selectedDate)
    : [];

  const groupedByShift = useMemo(() => {
    const groups: Record<ShiftType, typeof selectedAssignments> = {
      Morning: [], Afternoon: [], Night: [], "Day Off": [],
    };
    selectedAssignments.forEach((a) => {
      groups[a.shift].push(a);
    });
    return groups;
  }, [selectedAssignments]);

  const isToday = (day: number) => {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roster Calendar</h1>
          <p className="text-muted-foreground">View and manage staff schedules</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Calendar */}
          <Card className="lg:col-span-3 animate-fade-in">
            <CardContent className="p-5">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {/* Empty cells for offset */}
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

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative",
                        "hover:bg-secondary",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary ring-offset-2 ring-offset-background",
                        isToday(day) && !isSelected && "font-bold ring-1 ring-accent",
                        isWeekend && !isSelected && "text-muted-foreground",
                      )}
                    >
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
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t">
                {(Object.keys(shiftConfig) as ShiftType[]).map((shift) => {
                  const config = shiftConfig[shift];
                  return (
                    <div key={shift} className="flex items-center gap-1.5 text-xs">
                      <span className={cn("h-2.5 w-2.5 rounded-full", shift === "Morning" ? "bg-success" : shift === "Afternoon" ? "bg-accent" : shift === "Night" ? "bg-primary" : "bg-muted-foreground/40")} />
                      <span className="text-muted-foreground">{shift}</span>
                    </div>
                  );
                })}
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
                                const staff = staffMembers.find((s) => s.id === a.staffId);
                                if (!staff) return null;
                                return (
                                  <div key={a.id} className="flex items-center gap-2 py-1.5">
                                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                      {staff.name.split(" ").map((n) => n[0]).join("")}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium leading-tight">{staff.name}</p>
                                      <p className="text-xs text-muted-foreground">{staff.role}</p>
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
    </AppLayout>
  );
};

export default RosterPage;
