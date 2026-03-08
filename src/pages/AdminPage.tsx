import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserPlus, Shield, Mail, Loader2, Save } from "lucide-react";

const DEPARTMENTS = ["Front Desk", "Housekeeping", "F&B", "Kitchen", "Maintenance", "Security", "Spa", "Management"] as const;
const ROLES = ["staff", "manager", "admin"] as const;

interface UserWithRole {
  user_id: string;
  display_name: string | null;
  department: string | null;
  role: string;
  created_at: string;
}

const AdminPage = () => {
  const { isAdmin } = useUserRole();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<string>("staff");
  const [department, setDepartment] = useState<string>("");
  const [inviting, setInviting] = useState(false);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("user_id, display_name, department, created_at");
    const { data: roles, error: rErr } = await supabase.from("user_roles").select("user_id, role");

    if (!pErr && !rErr && profiles && roles) {
      const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
      setUsers(
        profiles.map((p) => ({
          ...p,
          role: roleMap.get(p.user_id) || "staff",
        }))
      );
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setInviting(true);
    try {
      const res = await supabase.functions.invoke("invite-user", {
        body: { email, role, display_name: displayName || email, department },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: t("admin.inviteSent"), description: t("admin.inviteDesc2").replace("{email}", email).replace("{role}", role) });
      setEmail("");
      setDisplayName("");
      setRole("staff");
      setDepartment("");
      fetchUsers();
    } catch (err: any) {
      toast({ title: t("admin.inviteFailed"), description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateDepartment = async (userId: string, newDept: string) => {
    const { error } = await supabase.from("profiles").update({ department: newDept }).eq("user_id", userId);
    if (error) {
      toast({ title: t("admin.updateFailed") || "Update failed", description: error.message, variant: "destructive" });
    } else {
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, department: newDept } : u)));
      toast({ title: t("admin.updated") || "Updated" });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    // Upsert into user_roles
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) {
      toast({ title: "Error", description: delErr.message, variant: "destructive" });
      return;
    }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    if (insErr) {
      toast({ title: "Error", description: insErr.message, variant: "destructive" });
      return;
    }
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)));
    toast({ title: t("admin.updated") || "Updated" });
  };

  const roleBadgeVariant = (r: string) => {
    if (r === "admin") return "destructive";
    if (r === "manager") return "default";
    return "secondary";
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t("admin.accessRequired")}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
          <p className="text-muted-foreground">{t("admin.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> {t("admin.inviteTitle")}
            </CardTitle>
            <CardDescription>{t("admin.inviteDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t("admin.email")}</Label>
                <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@hotel.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-name">{t("admin.displayName")}</Label>
                <Input id="invite-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.role")}</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.department")}</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={inviting}>
                  {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  {t("admin.sendInvite")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> {t("admin.allUsers")}
            </CardTitle>
            <CardDescription>{t("admin.registeredUsers").replace("{count}", String(users.length))}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.name")}</TableHead>
                      <TableHead>{t("admin.department")}</TableHead>
                      <TableHead>{t("admin.role")}</TableHead>
                      <TableHead>{t("admin.joined")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.display_name || "—"}</TableCell>
                        <TableCell>
                          <Select value={u.department || ""} onValueChange={(v) => handleUpdateDepartment(u.user_id, v)}>
                            <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map((d) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={(v) => handleUpdateRole(u.user_id, v)}>
                            <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminPage;
