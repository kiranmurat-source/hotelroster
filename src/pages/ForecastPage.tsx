import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseExcelForecast, generateSampleExcel, formatDateDDMMYYYY } from "@/lib/parse-forecast";
import { useForecast } from "@/contexts/ForecastContext";
import { cn } from "@/lib/utils";
import { Upload, Download, FileSpreadsheet, CalendarDays, BedDouble, Sparkles, X, LogIn, LogOut, LayoutGrid, Table as TableIcon, Users, Coffee, UtensilsCrossed, ChevronDown } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

interface PublicHolidayAPI {
  date: string;
  localName: string;
}


const ForecastPage = () => {
  const navigate = useNavigate();
  const { forecast, loading: forecastLoading, saveForecast, clearForecast } = useForecast();
  const { t } = useLanguage();
  const { isManager } = useUserRole();
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [holidays, setHolidays] = useState<PublicHolidayAPI[]>([]);
  const [holidaysOpen, setHolidaysOpen] = useState(false);

  // Fetch Turkish public holidays
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://date.nager.at/api/v3/PublicHolidays/2026/TR", { signal: controller.signal })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data: PublicHolidayAPI[]) => setHolidays(data))
      .catch(() => { /* silently ignore */ });
    return () => controller.abort();
  }, []);

  const holidayMap = holidays.reduce<Record<string, string>>((acc, h) => {
    acc[h.date] = h.localName;
    return acc;
  }, {});

  const handleDayDoubleClick = useCallback((dateStr: string) => {
    navigate(`/roster?date=${dateStr}`);
  }, [navigate]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error(t("forecast.invalidFile"));
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseExcelForecast(buffer);
      await saveForecast(result);
      toast.success(t("forecast.loaded").replace("{count}", String(result.days.length)));
    } catch (err) {
      toast.error(t("forecast.parseFailed"));
      console.error(err);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = async () => {
    const buffer = await generateSampleExcel();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weekly-forecast-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("forecast.templateDownloaded"));
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 85) return "hsl(var(--danger))";
    return "hsl(var(--success))";
  };

  const getOccupancyBadge = (rate: number) => {
    if (rate >= 85) return { label: t("forecast.critical"), className: "bg-[hsl(0,80%,75%)]/15 text-[hsl(0,80%,75%)]" };
    return { label: t("forecast.normal"), className: "bg-success/15 text-success" };
  };

  const calcOccupancy = (roomNights: number, totalRooms: number) => totalRooms > 0 ? Math.round((roomNights / totalRooms) * 100) : 0;
  const calcGuests = (roomNights: number) => Math.round(roomNights * 1.8);
  const calcBreakfast = (guests: number) => Math.ceil(guests * 0.8);

  const avgOccupancy = forecast
    ? Math.round(forecast.days.reduce((sum, d) => sum + calcOccupancy(d.roomNights, d.totalRooms), 0) / forecast.days.length)
    : 0;
  const totalBookings = forecast ? forecast.days.reduce((sum, d) => sum + d.roomNights, 0) : 0;
  const totalEvents = forecast ? forecast.days.reduce((sum, d) => sum + d.events.length, 0) : 0;
  const totalGuests = forecast ? forecast.days.reduce((sum, d) => sum + calcGuests(d.roomNights), 0) : 0;
  const totalBreakfast = forecast ? forecast.days.reduce((sum, d) => sum + calcBreakfast(calcGuests(d.roomNights)), 0) : 0;
  const peakDay = forecast
    ? forecast.days.reduce((max, d) => (calcOccupancy(d.roomNights, d.totalRooms) > calcOccupancy(max.roomNights, max.totalRooms) ? d : max), forecast.days[0])
    : null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("forecast.title")}</h1>
            <p className="text-muted-foreground">{t("forecast.subtitle")}</p>
          </div>
          {isManager && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1.5" />
                {t("forecast.downloadTemplate")}
              </Button>
              {forecast && (
                <Button variant="ghost" size="sm" onClick={() => clearForecast()}>
                  <X className="h-4 w-4 mr-1.5" />
                  {t("forecast.clear")}
                </Button>
              )}
            </div>
          )}
        </div>

        {forecastLoading ? (
          <Card className="animate-fade-in">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">{t("forecast.loading") || "Loading forecast data..."}</p>
            </CardContent>
          </Card>
        ) : !forecast ? (
          isManager ? (
            <Card className="animate-fade-in">
              <CardContent className="p-0">
                <label
                  htmlFor="file-upload"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    "flex flex-col items-center justify-center py-16 px-6 cursor-pointer rounded-lg border-2 border-dashed transition-colors",
                    isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                  )}
                >
                  <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                    <FileSpreadsheet className="h-7 w-7 text-accent" />
                  </div>
                  <p className="font-semibold text-sm mb-1">{t("forecast.dropFile")}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t("forecast.orBrowse")}</p>
                  <Button variant="outline" size="sm" asChild>
                    <span><Upload className="h-4 w-4 mr-1.5" />{t("forecast.chooseFile")}</span>
                  </Button>
                  <input id="file-upload" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileInput} />
                </label>
              </CardContent>
            </Card>
          ) : (
            <Card className="animate-fade-in">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">{t("forecast.noDataYet") || "No forecast data available yet."}</p>
              </CardContent>
            </Card>
          )
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Card className="animate-fade-in">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgOccupancy}%</p>
                    <p className="text-xs text-muted-foreground">{t("forecast.avgOccupancy")}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BedDouble className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalBookings.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{t("forecast.totalRoomNights")}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalGuests.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{t("forecast.totalGuests")}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Coffee className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalBreakfast.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{t("forecast.totalBreakfast")}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalEvents}</p>
                    <p className="text-xs text-muted-foreground">{t("forecast.eventsScheduled")}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{peakDay?.dayLabel}</p>
                    <p className="text-xs text-muted-foreground">{t("forecast.peakDay")} ({peakDay ? calcOccupancy(peakDay.roomNights, peakDay.totalRooms) : 0}%)</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Occupancy chart */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">{t("forecast.occupancyForecast")}</CardTitle>
                <p className="text-xs text-muted-foreground">{t("forecast.chartHint")}</p>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast.days.map(d => ({ ...d, calcOcc: calcOccupancy(d.roomNights, d.totalRooms) }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dayLabel" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === "calcOcc") return [`${value}%`, t("forecast.occupancy")];
                          if (name === "arrivals") return [value, t("forecast.arrivals")];
                          if (name === "departures") return [value, t("forecast.departures")];
                          return [value, name];
                        }}
                      />
                      <Legend
                        formatter={(value: string) => {
                          if (value === "calcOcc") return t("forecast.occupancy");
                          if (value === "arrivals") return t("forecast.arrivals");
                          if (value === "departures") return t("forecast.departures");
                          return value;
                        }}
                      />
                      <Bar yAxisId="left" dataKey="calcOcc" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(data: any) => { if (data?.date) handleDayDoubleClick(data.date); }}>
                        {forecast.days.map((day, i) => (
                          <Cell key={i} fill={getOccupancyColor(calcOccupancy(day.roomNights, day.totalRooms))} />
                        ))}
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="arrivals" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                      <Line yAxisId="right" type="monotone" dataKey="departures" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--accent))" }} strokeDasharray="5 5" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Daily breakdown */}
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">{t("forecast.dailyBreakdown")}</CardTitle>
                <div className="flex gap-1 border rounded-lg p-0.5">
                  <Button
                    variant={viewMode === "cards" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode("cards")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode("table")}
                  >
                    <TableIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === "cards" ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {forecast.days.map((day) => {
                      const occ = calcOccupancy(day.roomNights, day.totalRooms);
                      const badge = getOccupancyBadge(occ);
                      return (
                        <div
                          key={day.date}
                          onDoubleClick={() => handleDayDoubleClick(day.date)}
                          className="border rounded-lg p-4 space-y-2 hover:border-accent/50 transition-colors cursor-pointer"
                          title={t("forecast.doubleClickHint")}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm">{day.dayLabel}</p>
                              <p className="text-xs text-muted-foreground">{day.date}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", badge.className)}>
                                {badge.label}
                              </span>
                              {holidayMap[day.date] && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                  {holidayMap[day.date]}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{t("forecast.occupancy")}</span>
                              <span className="font-semibold">{occ}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${occ}%`,
                                  backgroundColor: getOccupancyColor(occ),
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t("forecast.arrivals")}</span>
                            <span className="font-medium">{day.arrivals}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t("forecast.departures")}</span>
                            <span className="font-medium">{day.departures}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t("forecast.guests")}</span>
                            <span className="font-medium">{calcGuests(day.roomNights)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t("forecast.breakfast")}</span>
                            <span className="font-medium">{calcBreakfast(calcGuests(day.roomNights))}</span>
                          </div>
                          {day.events.length > 0 && (
                            <div className="pt-1 border-t space-y-1">
                              {day.events.map((ev, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs">
                                  <Sparkles className="h-3 w-3 text-accent shrink-0" />
                                  <span>{ev}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("forecast.day")}</TableHead>
                        <TableHead>{t("forecast.date")}</TableHead>
                        <TableHead className="text-right">{t("forecast.occupancy")}</TableHead>
                        <TableHead className="text-right">{t("forecast.arrivals")}</TableHead>
                        <TableHead className="text-right">{t("forecast.departures")}</TableHead>
                        <TableHead className="text-right">{t("forecast.totalRooms")}</TableHead>
                        <TableHead className="text-right">{t("forecast.guests")}</TableHead>
                        <TableHead className="text-right">{t("forecast.breakfast")}</TableHead>
                        <TableHead>{t("forecast.events")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecast.days.map((day) => {
                        const occ = calcOccupancy(day.roomNights, day.totalRooms);
                        const badge = getOccupancyBadge(occ);
                        return (
                          <TableRow key={day.date} onDoubleClick={() => handleDayDoubleClick(day.date)} className="cursor-pointer" title={t("forecast.doubleClickHint")}>
                            <TableCell className="font-medium">{day.dayLabel}</TableCell>
                            <TableCell className="text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                {day.date}
                                {holidayMap[day.date] && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                    {holidayMap[day.date]}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", badge.className)}>
                                {occ}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{day.arrivals}</TableCell>
                            <TableCell className="text-right">{day.departures}</TableCell>
                            <TableCell className="text-right">{day.totalRooms}</TableCell>
                            <TableCell className="text-right">{calcGuests(day.roomNights)}</TableCell>
                            <TableCell className="text-right">{calcBreakfast(calcGuests(day.roomNights))}</TableCell>
                            <TableCell>
                              {day.events.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {day.events.map((ev, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                                      <Sparkles className="h-3 w-3" />
                                      {ev}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            {/* Public Holidays */}
            {holidays.length > 0 && (
              <Collapsible open={holidaysOpen} onOpenChange={setHolidaysOpen}>
                <Card className="animate-fade-in">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-amber-600" />
                          {t("forecast.publicHolidays")}
                        </CardTitle>
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", holidaysOpen && "rotate-180")} />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {holidays.map((h) => {
                          const isPast = h.date < new Date().toISOString().split("T")[0];
                          return (
                            <div
                              key={h.date}
                              className={cn(
                                "flex items-center justify-between py-2 px-3 rounded-lg text-sm",
                                isPast ? "bg-muted/50 text-muted-foreground" : "bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50"
                              )}
                            >
                              <span className={cn("font-medium", !isPast && "text-amber-800 dark:text-amber-300")}>{h.localName}</span>
                              <span className="text-xs text-muted-foreground">{h.date}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ForecastPage;
