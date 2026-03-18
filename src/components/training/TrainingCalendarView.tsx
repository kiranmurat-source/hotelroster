import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TrainingTopic {
  id: string;
  department: string;
  day_number: number;
  code: string;
  category: string;
  title: string;
  key_info: string | null;
  duration_minutes: number | null;
}

interface TrainingCompletion {
  id: string;
  topic_id: string;
  staff_id: string;
  department: string;
  completed_at: string;
}

interface Props {
  topics: TrainingTopic[];
  completions: TrainingCompletion[];
  myProfileId?: string;
  isManager: boolean;
}

const DAYS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const CATEGORY_COLORS: Record<string, string> = {
  A: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  B: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  D: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  E: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  F: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  G: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

const getCategoryColor = (category: string) => {
  const key = category.charAt(0).toUpperCase();
  return CATEGORY_COLORS[key] || "bg-muted text-muted-foreground";
};

export default function TrainingCalendarView({ topics, completions, myProfileId, isManager }: Props) {
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const dayNames = language === "tr" ? DAYS_TR : DAYS_EN;
  const monthNames = language === "tr" ? MONTHS_TR : MONTHS_EN;

  const topicsByDay = useMemo(() => {
    const map = new Map<number, TrainingTopic[]>();
    topics.forEach((t) => {
      if (!map.has(t.day_number)) map.set(t.day_number, []);
      map.get(t.day_number)!.push(t);
    });
    return map;
  }, [topics]);

  const myCompletedTopicIds = useMemo(() => {
    if (!myProfileId) return new Set<string>();
    return new Set(completions.filter((c) => c.staff_id === myProfileId).map((c) => c.topic_id));
  }, [completions, myProfileId]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday=0
    const daysInMonth = lastDay.getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date();
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {language === "tr" ? "Eğitim Takvimi" : "Training Calendar"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[140px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {/* Day headers */}
          {dayNames.map((d) => (
            <div key={d} className="bg-muted/50 px-1 py-2 text-center text-[11px] font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
          {/* Day cells */}
          {calendarDays.map((day, i) => {
            const dayTopics = day ? topicsByDay.get(day) || [] : [];
            return (
              <div
                key={i}
                className={cn(
                  "bg-card min-h-[90px] p-1 relative",
                  !day && "bg-muted/20"
                )}
              >
                {day && (
                  <>
                    <span
                      className={cn(
                        "text-[11px] font-medium leading-none",
                        isToday(day) && "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center",
                        !isToday(day) && "text-muted-foreground"
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5 overflow-y-auto max-h-[65px]">
                      {dayTopics.map((topic) => {
                        const done = myCompletedTopicIds.has(topic.id);
                        return (
                          <Tooltip key={topic.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium leading-tight cursor-default truncate",
                                  getCategoryColor(topic.category)
                                )}
                              >
                                {done && <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0" />}
                                <span className="truncate">{topic.code}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-semibold text-xs">{topic.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {language === "tr" ? "Kategori" : "Category"}: {topic.category} · {language === "tr" ? "Gün" : "Day"} {topic.day_number}
                              </p>
                              {topic.key_info && (
                                <p className="text-[10px] text-muted-foreground mt-1">{topic.key_info}</p>
                              )}
                              {done && (
                                <p className="text-[10px] text-green-600 mt-1">
                                  ✅ {language === "tr" ? "Tamamlandı" : "Completed"}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-3 px-1">
          {Object.entries(CATEGORY_COLORS).map(([key, cls]) => (
            <span key={key} className={cn("text-[10px] font-semibold rounded px-1.5 py-0.5", cls)}>
              {key}
            </span>
          ))}
          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> = {language === "tr" ? "Tamamlandı" : "Completed"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
