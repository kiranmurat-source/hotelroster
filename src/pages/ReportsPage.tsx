import { useState, useMemo } from "react";
import { format } from "date-fns";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { staffMembers, shiftAssignments, extraHoursRequests, extraStaffRequests } from "@/lib/mock-data";
import { Department, ShiftType } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { CalendarIcon, FileDown, Clock, UserPlus, CalendarDays, Filter } from "lucide-react";

const departments: Department[] = ["Front Desk", "Housekeeping", "F&B", "Kitchen", "Maintenance", "Security", "Spa", "Management"];

const ReportsPage = () => {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState<Date | undefined>(new Date("2026-03-09"));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date("2026-03-15"));
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const shiftLabels: Record<ShiftType, string> = {
    Morning: t("roster.morning"),
    Afternoon: t("roster.afternoon"),
    Night: t("roster.night"),
    "Day Off": t("roster.dayOff"),
    Break: t("roster.break"),
  };

  const dateRange = useMemo(() => {
    if (!startDate || !endDate) return { start: "", end: "" };
    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
    };
  }, [startDate, endDate]);

  const filteredRoster = useMemo(() => {
    return shiftAssignments.filter((a) => {
      const inRange = a.date >= dateRange.start && a.date <= dateRange.end;
      const inDept = departmentFilter === "all" || a.department === departmentFilter;
      return inRange && inDept;
    });
  }, [dateRange, departmentFilter]);

  const filteredExtraHours = useMemo(() => {
    return extraHoursRequests.filter((r) => {
      const inRange = r.date >= dateRange.start && r.date <= dateRange.end;
      const inDept = departmentFilter === "all" || r.department === departmentFilter;
      return inRange && inDept;
    });
  }, [dateRange, departmentFilter]);

  const filteredExtraStaff = useMemo(() => {
    return extraStaffRequests.filter((r) => {
      const inRange = r.date >= dateRange.start && r.date <= dateRange.end;
      const inDept = departmentFilter === "all" || r.department === departmentFilter;
      return inRange && inDept;
    });
  }, [dateRange, departmentFilter]);

  // Summary stats
  const totalShifts = filteredRoster.length;
  const totalExtraHours = filteredExtraHours.reduce((sum, r) => sum + r.hours, 0);
  const approvedExtraHours = filteredExtraHours.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.hours, 0);
  const totalExtraStaffRequested = filteredExtraStaff.reduce((sum, r) => sum + r.numberOfStaff, 0);
  const approvedExtraStaff = filteredExtraStaff.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.numberOfStaff, 0);

  const resolveStaffName = (staffId: string) => {
    const staff = staffMembers.find((s) => s.id === staffId);
    return staff?.name ?? staffId;
  };

  const exportCSV = (tab: string) => {
    let csv = "";
    if (tab === "roster") {
      csv = "Date,Staff,Department,Shift\n";
      filteredRoster.forEach((a) => {
        csv += `${a.date},${resolveStaffName(a.staffId)},${a.department},${a.shift}\n`;
      });
    } else if (tab === "extra-hours") {
      csv = "Date,Staff,Department,Hours,Reason,Status\n";
      filteredExtraHours.forEach((r) => {
        csv += `${r.date},${r.staffName},${r.department},${r.hours},"${r.reason}",${r.status}\n`;
      });
    } else {
      csv = "Date,Department,Shift,Staff Needed,Reason,Requested By,Status\n";
      filteredExtraStaff.forEach((r) => {
        csv += `${r.date},${r.department},${r.shift},${r.numberOfStaff},"${r.reason}",${r.requestedBy},${r.status}\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${tab}-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("reports.title")}</h1>
          <p className="text-muted-foreground">{t("reports.subtitle")}</p>
        </div>

        {/* Filters */}
        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("reports.startDate")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {startDate ? format(startDate, "dd MMM yyyy") : t("reports.pickDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("reports.endDate")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {endDate ? format(endDate, "dd MMM yyyy") : t("reports.pickDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("reports.department")}</label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("reports.allDepartments")}</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="animate-fade-in">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalShifts}</p>
                <p className="text-xs text-muted-foreground">{t("reports.totalShifts")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedExtraHours}<span className="text-sm font-normal text-muted-foreground">/{totalExtraHours}h</span></p>
                <p className="text-xs text-muted-foreground">{t("reports.extraHoursApproved")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedExtraStaff}<span className="text-sm font-normal text-muted-foreground">/{totalExtraStaffRequested}</span></p>
                <p className="text-xs text-muted-foreground">{t("reports.extraStaffApproved")}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Filter className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredExtraHours.filter((r) => r.status === "pending").length + filteredExtraStaff.filter((r) => r.status === "pending").length}</p>
                <p className="text-xs text-muted-foreground">{t("reports.pendingRequests")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed data tables */}
        <Card className="animate-fade-in">
          <Tabs defaultValue="roster">
            <CardHeader className="pb-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="roster">{t("reports.rosterTab")}</TabsTrigger>
                  <TabsTrigger value="extra-hours">{t("reports.extraHoursTab")}</TabsTrigger>
                  <TabsTrigger value="extra-staff">{t("reports.extraStaffTab")}</TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>

            <TabsContent value="roster">
              <CardContent>
                <div className="flex justify-end mb-3">
                  <Button variant="outline" size="sm" onClick={() => exportCSV("roster")}>
                    <FileDown className="h-4 w-4 mr-1.5" />{t("reports.exportCSV")}
                  </Button>
                </div>
                {filteredRoster.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("reports.noData")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("reports.date")}</TableHead>
                          <TableHead>{t("reports.staffName")}</TableHead>
                          <TableHead>{t("reports.department")}</TableHead>
                          <TableHead>{t("reports.shift")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRoster.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{a.date}</TableCell>
                            <TableCell className="font-medium">{resolveStaffName(a.staffId)}</TableCell>
                            <TableCell>{a.department}</TableCell>
                            <TableCell>{shiftLabels[a.shift]}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="extra-hours">
              <CardContent>
                <div className="flex justify-end mb-3">
                  <Button variant="outline" size="sm" onClick={() => exportCSV("extra-hours")}>
                    <FileDown className="h-4 w-4 mr-1.5" />{t("reports.exportCSV")}
                  </Button>
                </div>
                {filteredExtraHours.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("reports.noData")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("reports.date")}</TableHead>
                          <TableHead>{t("reports.staffName")}</TableHead>
                          <TableHead>{t("reports.department")}</TableHead>
                          <TableHead className="text-right">{t("reports.hours")}</TableHead>
                          <TableHead>{t("reports.reason")}</TableHead>
                          <TableHead>{t("reports.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExtraHours.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.date}</TableCell>
                            <TableCell className="font-medium">{r.staffName}</TableCell>
                            <TableCell>{r.department}</TableCell>
                            <TableCell className="text-right">{r.hours}h</TableCell>
                            <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                            <TableCell><StatusBadge status={r.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="extra-staff">
              <CardContent>
                <div className="flex justify-end mb-3">
                  <Button variant="outline" size="sm" onClick={() => exportCSV("extra-staff")}>
                    <FileDown className="h-4 w-4 mr-1.5" />{t("reports.exportCSV")}
                  </Button>
                </div>
                {filteredExtraStaff.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("reports.noData")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("reports.date")}</TableHead>
                          <TableHead>{t("reports.department")}</TableHead>
                          <TableHead>{t("reports.shift")}</TableHead>
                          <TableHead className="text-right">{t("reports.staffNeeded")}</TableHead>
                          <TableHead>{t("reports.reason")}</TableHead>
                          <TableHead>{t("reports.requestedBy")}</TableHead>
                          <TableHead>{t("reports.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExtraStaff.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.date}</TableCell>
                            <TableCell>{r.department}</TableCell>
                            <TableCell>{shiftLabels[r.shift]}</TableCell>
                            <TableCell className="text-right">{r.numberOfStaff}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                            <TableCell>{r.requestedBy}</TableCell>
                            <TableCell><StatusBadge status={r.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ReportsPage;
