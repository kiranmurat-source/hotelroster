import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseExcelForecast, generateSampleExcel } from "@/lib/parse-forecast";
import { useForecast } from "@/contexts/ForecastContext";
import { cn } from "@/lib/utils";
import { Upload, Download, FileSpreadsheet, CalendarDays, BedDouble, Sparkles, X, LogIn, LogOut, LayoutGrid, Table as TableIcon } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

const ForecastPage = () => {
  const navigate = useNavigate();
  const { forecast, setForecast } = useForecast();
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const handleDayDoubleClick = useCallback((dateStr: string) => {
    navigate(`/roster?date=${dateStr}`);
  }, [navigate]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload an Excel file (.xlsx, .xls) or CSV");
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelForecast(buffer);
      setForecast(result);
      toast.success(`Forecast loaded — ${result.days.length} days`);
    } catch (err) {
      toast.error("Failed to parse file. Check the format and try again.");
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

  const downloadTemplate = () => {
    const buffer = generateSampleExcel();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weekly-forecast-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return "hsl(0, 72%, 51%)";
    if (rate >= 75) return "hsl(38, 92%, 50%)";
    return "hsl(152, 60%, 40%)";
  };

  const getOccupancyBadge = (rate: number) => {
    if (rate >= 90) return { label: "Critical", className: "bg-destructive/15 text-destructive" };
    if (rate >= 75) return { label: "High", className: "bg-warning/15 text-warning" };
    return { label: "Normal", className: "bg-success/15 text-success" };
  };

  const avgOccupancy = forecast
    ? Math.round(forecast.days.reduce((sum, d) => sum + d.occupancyRate, 0) / forecast.days.length)
    : 0;
  const totalBookings = forecast ? forecast.days.reduce((sum, d) => sum + d.roomNights, 0) : 0;
  const totalEvents = forecast ? forecast.days.reduce((sum, d) => sum + d.events.length, 0) : 0;
  const peakDay = forecast
    ? forecast.days.reduce((max, d) => (d.occupancyRate > max.occupancyRate ? d : max), forecast.days[0])
    : null;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hotel Activity Forecast</h1>
            <p className="text-muted-foreground">Upload your weekly forecast to view projected activity</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1.5" />
              Download Template
            </Button>
            {forecast && (
              <Button variant="ghost" size="sm" onClick={() => setForecast(null)}>
                <X className="h-4 w-4 mr-1.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {!forecast ? (
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
                <p className="font-semibold text-sm mb-1">Drop your forecast file here</p>
                <p className="text-xs text-muted-foreground mb-4">or click to browse — .xlsx, .xls, .csv</p>
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="h-4 w-4 mr-1.5" />Choose File</span>
                </Button>
                <input id="file-upload" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileInput} />
              </label>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="animate-fade-in">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgOccupancy}%</p>
                    <p className="text-xs text-muted-foreground">Avg. Occupancy</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BedDouble className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalBookings.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Room Nights</p>
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
                    <p className="text-xs text-muted-foreground">Events Scheduled</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{peakDay?.dayLabel}</p>
                    <p className="text-xs text-muted-foreground">Peak Day ({peakDay?.occupancyRate}%)</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Occupancy chart */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Occupancy Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast.days} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="dayLabel" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis yAxisId="left" domain={[0, 100]} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} />
                      <YAxis yAxisId="right" orientation="right" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === "occupancyRate") return [`${value}%`, "Occupancy"];
                          if (name === "arrivals") return [value, "Arrivals"];
                          if (name === "departures") return [value, "Departures"];
                          return [value, name];
                        }}
                      />
                      <Legend
                        formatter={(value: string) => {
                          if (value === "occupancyRate") return "Occupancy";
                          if (value === "arrivals") return "Arrivals";
                          if (value === "departures") return "Departures";
                          return value;
                        }}
                      />
                      <Bar yAxisId="left" dataKey="occupancyRate" radius={[6, 6, 0, 0]}>
                        {forecast.days.map((day, i) => (
                          <Cell key={i} fill={getOccupancyColor(day.occupancyRate)} />
                        ))}
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="arrivals" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="right" type="monotone" dataKey="departures" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Daily breakdown */}
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Daily Breakdown</CardTitle>
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
                      const badge = getOccupancyBadge(day.occupancyRate);
                      return (
                        <div
                          key={day.date}
                          className="border rounded-lg p-4 space-y-2 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm">{day.dayLabel}</p>
                              <p className="text-xs text-muted-foreground">{day.date}</p>
                            </div>
                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", badge.className)}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Occupancy</span>
                              <span className="font-semibold">{day.occupancyRate}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${day.occupancyRate}%`,
                                  backgroundColor: getOccupancyColor(day.occupancyRate),
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Arrivals</span>
                            <span className="font-medium">{day.arrivals}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Departures</span>
                            <span className="font-medium">{day.departures}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Room Nights</span>
                            <span className="font-medium">{day.roomNights} / {day.totalRooms}</span>
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
                        <TableHead>Day</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Occupancy</TableHead>
                        <TableHead className="text-right">Arrivals</TableHead>
                        <TableHead className="text-right">Departures</TableHead>
                        <TableHead className="text-right">Room Nights</TableHead>
                        <TableHead className="text-right">Total Rooms</TableHead>
                        <TableHead>Events</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecast.days.map((day) => {
                        const badge = getOccupancyBadge(day.occupancyRate);
                        return (
                          <TableRow key={day.date}>
                            <TableCell className="font-medium">{day.dayLabel}</TableCell>
                            <TableCell className="text-muted-foreground">{day.date}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", badge.className)}>
                                {day.occupancyRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{day.arrivals}</TableCell>
                            <TableCell className="text-right">{day.departures}</TableCell>
                            <TableCell className="text-right">{day.roomNights}</TableCell>
                            <TableCell className="text-right">{day.totalRooms}</TableCell>
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
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ForecastPage;
