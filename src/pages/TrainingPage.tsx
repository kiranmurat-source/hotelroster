import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Upload, GraduationCap, CheckCircle2, Circle, TrendingUp, CalendarDays, Users, AlertTriangle, LayoutGrid } from "lucide-react";
import TrainingCalendarView from "@/components/training/TrainingCalendarView";
import * as XLSX from "@e965/xlsx";

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

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  department: string | null;
}

interface ParsedRow {
  day_number: number;
  code: string;
  category: string;
  title: string;
  key_info: string;
  duration_minutes: number;
}

const TrainingPage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { isManager, isAdmin } = useUserRole();
  const { profile: userProfile } = useUserProfile();

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);

  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([]);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [adminSelectedDept, setAdminSelectedDept] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const userDept = userProfile?.department || "";

  // The active department: for admin can be switched, others use their own
  const activeDept = isAdmin && adminSelectedDept ? adminSelectedDept : userDept;

  // Load departments list for admin
  useEffect(() => {
    if (!isAdmin) return;
    const loadDepts = async () => {
      const { data } = await supabase.from("profiles").select("department");
      if (data) {
        const depts = [...new Set(data.map((p: any) => p.department).filter(Boolean))] as string[];
        setAllDepartments(depts);
      }
    };
    loadDepts();
  }, [isAdmin]);

  // Load data filtered by department
  useEffect(() => {
    if (!activeDept) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      const [topicsRes, completionsRes, staffRes] = await Promise.all([
        supabase.from("training_topics").select("*").eq("department", activeDept).order("day_number"),
        supabase.from("training_completions").select("*").eq("department", activeDept),
        supabase.from("profiles").select("id, user_id, display_name, department").eq("department", activeDept),
      ]);

      if (topicsRes.data) setTopics(topicsRes.data as TrainingTopic[]);
      if (completionsRes.data) setCompletions(completionsRes.data as TrainingCompletion[]);
      if (staffRes.data) setStaffProfiles(staffRes.data as Profile[]);
      setLoading(false);
    };
    load();
  }, [activeDept]);

  const deptTopics = topics;
  const deptStaff = useMemo(() => staffProfiles.filter((p) => p.display_name), [staffProfiles]);
  const deptCompletions = completions;

  // Group topics by category
  const categories = useMemo(() => {
    const cats: { name: string; topics: TrainingTopic[] }[] = [];
    const seen = new Map<string, TrainingTopic[]>();
    deptTopics.forEach((t) => {
      if (!seen.has(t.category)) seen.set(t.category, []);
      seen.get(t.category)!.push(t);
    });
    seen.forEach((topics, name) => cats.push({ name, topics }));
    return cats;
  }, [deptTopics]);

  const isCompleted = useCallback(
    (topicId: string, staffId: string) => deptCompletions.some((c) => c.topic_id === topicId && c.staff_id === staffId),
    [deptCompletions]
  );

  const staffCompletionCount = useCallback(
    (staffId: string) => deptCompletions.filter((c) => c.staff_id === staffId).length,
    [deptCompletions]
  );

  const topicCompletionCount = useCallback(
    (topicId: string) => deptCompletions.filter((c) => c.topic_id === topicId).length,
    [deptCompletions]
  );

  // Stats
  const totalCompletions = deptCompletions.length;
  const totalPossible = deptStaff.length * deptTopics.length;
  const teamPct = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const thisMonthCount = deptCompletions.filter(
    (c) => new Date(c.completed_at) >= thisMonthStart
  ).length;

  // Excel parse
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("konu")) || wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

          const parsed: ParsedRow[] = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row[0] && row[0] !== 0) break;
            parsed.push({
              day_number: parseInt(String(row[0]), 10),
              code: String(row[1] || ""),
              category: String(row[2] || ""),
              title: String(row[3] || ""),
              key_info: String(row[4] || ""),
              duration_minutes: row[5] ? parseInt(String(row[5]), 10) || 10 : 10,
            });
          }
          setParsedRows(parsed);
          toast.success(
            language === "tr" ? `${parsed.length} konu okundu` : `${parsed.length} topics parsed`
          );
        } catch (err) {
          console.error(err);
          toast.error(language === "tr" ? "Dosya okunamadı" : "Failed to read file");
        }
      };
      reader.readAsArrayBuffer(file);
      e.target.value = "";
    },
    [language]
  );

  const handleImport = useCallback(async () => {
    if (!activeDept || parsedRows.length === 0) {
      toast.error(language === "tr" ? "Departman ve dosya gerekli" : "Department and file required");
      return;
    }
    setImporting(true);
    try {
      const rows = parsedRows.map((r) => ({
        department: activeDept,
        day_number: r.day_number,
        code: r.code,
        category: r.category,
        title: r.title,
        key_info: r.key_info || null,
        duration_minutes: r.duration_minutes,
      }));

      const { error } = await supabase
        .from("training_topics")
        .upsert(rows, { onConflict: "department,day_number" });
      if (error) throw error;

      // Refresh topics
      const { data } = await supabase
        .from("training_topics")
        .select("*")
        .eq("department", activeDept)
        .order("day_number");
      if (data) setTopics(data as TrainingTopic[]);

      setParsedRows([]);
      toast.success(
        language === "tr" ? `${rows.length} konu başarıyla yüklendi` : `${rows.length} topics imported successfully`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error");
    } finally {
      setImporting(false);
    }
  }, [activeDept, parsedRows, language]);

  const toggleCompletion = useCallback(
    async (topicId: string, staffId: string) => {
      if (!user) return;
      const existing = deptCompletions.find((c) => c.topic_id === topicId && c.staff_id === staffId);
      const topic = deptTopics.find((t) => t.id === topicId);

      if (existing) {
        const { error } = await supabase.from("training_completions").delete().eq("id", existing.id);
        if (error) {
          toast.error(error.message);
          return;
        }
        setCompletions((prev) => prev.filter((c) => c.id !== existing.id));
      } else {
        const myProfile = staffProfiles.find((p) => p.user_id === user.id);
        const { data, error } = await supabase
          .from("training_completions")
          .insert({
            topic_id: topicId,
            staff_id: staffId,
            department: activeDept,
            confirmed_by: myProfile?.id || null,
          })
          .select()
          .single();

        if (error) {
          toast.error(error.message);
          return;
        }
        setCompletions((prev) => [...prev, data as TrainingCompletion]);

        if (myProfile && topic) {
          try {
            await supabase.rpc("process_kudos", {
              _from_user_id: user.id,
              _to_user_id: user.id,
              _message: topic.title,
              _category: "training",
            });
          } catch {}
        }
      }
    },
    [user, deptCompletions, deptTopics, staffProfiles, activeDept]
  );

  const myProfile = staffProfiles.find((p) => p.user_id === user?.id);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  // No department set
  if (!userDept) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("training.title")}</h1>
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
              <p className="text-muted-foreground font-medium">
                {language === "tr"
                  ? "Departmanınız tanımlanmamış. Lütfen yöneticinizle iletişime geçin."
                  : "Your department is not set. Please contact your manager."}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("training.title")}</h1>
          <p className="text-muted-foreground">{t("training.subtitle")}</p>
        </div>

        {/* Admin department switcher */}
        {isAdmin && allDepartments.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {language === "tr" ? "Departman:" : "Department:"}
            </span>
            <Select value={adminSelectedDept || userDept} onValueChange={setAdminSelectedDept}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allDepartments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Manager: Excel Import */}
        {isManager && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("training.importTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="space-y-1.5 flex-1">
                  <Input
                    placeholder={t("training.departmentPlaceholder")}
                    value={activeDept}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                <label htmlFor="training-upload">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-1.5" />
                      {t("training.uploadBtn")}
                    </span>
                  </Button>
                  <input
                    id="training-upload"
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>

              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("training.day")}</TableHead>
                        <TableHead>{t("training.code")}</TableHead>
                        <TableHead>{t("training.category")}</TableHead>
                        <TableHead>{t("training.topicTitle")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 5).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.day_number}</TableCell>
                          <TableCell className="font-mono text-xs">{r.code}</TableCell>
                          <TableCell>{r.category}</TableCell>
                          <TableCell className="text-sm">{r.title}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsedRows.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      ...{language === "tr" ? `ve ${parsedRows.length - 5} konu daha` : `and ${parsedRows.length - 5} more`}
                    </p>
                  )}
                  <Button onClick={handleImport} disabled={importing || !activeDept}>
                    <GraduationCap className="h-4 w-4 mr-2" />
                    {t("training.importBtn")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats bar */}
        {deptTopics.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{totalCompletions}</p>
                  <p className="text-xs text-muted-foreground">{t("training.totalCompleted")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold">{teamPct}%</p>
                  <p className="text-xs text-muted-foreground">{t("training.teamCompletion")}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold">{thisMonthCount}</p>
                  <p className="text-xs text-muted-foreground">{t("training.thisMonth")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Training Matrix */}
        {deptTopics.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("training.matrix")}
                <span className="text-xs font-normal text-muted-foreground ml-2">— {activeDept}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="sticky left-0 z-10 bg-muted/30 px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[150px]">
                        {t("training.staff")}
                      </th>
                      {categories.map((cat) => (
                        <th
                          key={cat.name}
                          colSpan={cat.topics.length}
                          className="px-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-l"
                        >
                          {cat.name}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground border-l min-w-[60px]">
                        {t("training.progress")}
                      </th>
                    </tr>
                    <tr className="border-b">
                      <th className="sticky left-0 z-10 bg-card px-3 py-1.5" />
                      {deptTopics.map((topic) => (
                        <Tooltip key={topic.id}>
                          <TooltipTrigger asChild>
                            <th className="px-1 py-1.5 text-center text-[10px] font-mono text-muted-foreground border-l cursor-help min-w-[36px]">
                              {topic.code}
                            </th>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-semibold text-xs">{topic.title}</p>
                            {topic.key_info && <p className="text-[10px] text-muted-foreground mt-1">{topic.key_info}</p>}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      <th className="border-l" />
                    </tr>
                  </thead>
                  <tbody>
                    {(isManager ? deptStaff : deptStaff.filter((s) => s.id === myProfile?.id)).map((staff) => {
                      const count = staffCompletionCount(staff.id);
                      return (
                        <tr key={staff.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium text-sm whitespace-nowrap">
                            {staff.display_name}
                          </td>
                          {deptTopics.map((topic) => {
                            const done = isCompleted(topic.id, staff.id);
                            return (
                              <td
                                key={topic.id}
                                className={cn(
                                  "px-1 py-2 text-center border-l",
                                  isManager && "cursor-pointer hover:bg-muted/40"
                                )}
                                onClick={isManager ? () => toggleCompletion(topic.id, staff.id) : undefined}
                              >
                                {done ? (
                                  <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center border-l text-xs font-semibold">
                            <span className={cn(
                              count === deptTopics.length ? "text-success" : "text-muted-foreground"
                            )}>
                              {count} / {deptTopics.length}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {isManager && (
                      <tr className="border-t-2 bg-muted/20">
                        <td className="sticky left-0 z-10 bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground">
                          {t("training.total")}
                        </td>
                        {deptTopics.map((topic) => (
                          <td key={topic.id} className="px-1 py-2 text-center border-l text-xs font-semibold text-muted-foreground">
                            {topicCompletionCount(topic.id)}
                          </td>
                        ))}
                        <td className="border-l" />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          !isManager && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">{t("training.noTopics")}</p>
              </CardContent>
            </Card>
          )
        )}

        {!isManager && myProfile && deptTopics.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            {staffCompletionCount(myProfile.id)} / {deptTopics.length} {t("training.topicsCompleted")}
          </p>
        )}
      </div>
    </AppLayout>
  );
};

export default TrainingPage;
