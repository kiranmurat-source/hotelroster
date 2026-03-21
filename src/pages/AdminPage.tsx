import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { api } from "@/integrations/api/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserPlus, Shield, Loader2, Trash2 } from "lucide-react";

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

  // Yeni kullanıcı formu
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("staff");
  const [department, setDepartment] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const [profiles, allRoles] = await Promise.all([
        api.get<any[]>("/roster/profiles"),
        api.get<any[]>("/roster/users/roles"),
      ]);
      const roleMap = new Map((allRoles || []).map((r: any) => [r.user_id, r.role]));
      setUsers(
        (profiles || []).map((p: any) => ({
          ...p,
          role: roleMap.get(p.user_id) || "staff",
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !email) return;
    setCreating(true);
    try {
      await api.post("/roster/users", {
        username,
        password,
        display_name: displayName || username,
        email,
        role,
        department: department || undefined,
      });
      toast({ title: "Kullanıcı oluşturuldu", description: `${username} başarıyla eklendi` });
      setUsername(""); setDisplayName(""); setEmail(""); setPassword(""); setRole("staff"); setDepartment("");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm(`${userId} kullanıcısını silmek istediğinize emin misiniz?`)) return;
    setDeletingId(userId);
    try {
      await api.delete(`/roster/users/${userId}`);
      toast({ title: "Kullanıcı silindi" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateDepartment = async (userId: string, newDept: string) => {
    try {
      await api.put(`/roster/profiles/${userId}`, { department: newDept });
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, department: newDept } : u)));
      toast({ title: "Güncellendi" });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.post(`/roster/profiles/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)));
      toast({ title: "Rol güncellendi" });
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
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
              <UserPlus className="h-5 w-5" /> Kullanıcı Oluştur
            </CardTitle>
            <CardDescription>Yeni personel hesabı ekle</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Kullanıcı Adı</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ahmet.yilmaz" required />
              </div>
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ahmet Yılmaz" />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ahmet@hotel.com" required />
              </div>
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 karakter" required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Departman</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger><SelectValue placeholder="Seç..." /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Kullanıcı Oluştur
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
            <CardDescription>{users.length} kullanıcı</CardDescription>
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
                      <TableHead>Ad Soyad</TableHead>
                      <TableHead>Kullanıcı Adı</TableHead>
                      <TableHead>Departman</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Kayıt Tarihi</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.display_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.user_id}</TableCell>
                        <TableCell>
                          <Select value={u.department || ""} onValueChange={(v) => handleUpdateDepartment(u.user_id, v)}>
                            <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Seç..." /></SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={(v) => handleUpdateRole(u.user_id, v)}>
                            <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(u.created_at).toLocaleDateString("tr-TR")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(u.user_id)}
                            disabled={deletingId === u.user_id}
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingId === u.user_id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />
                            }
                          </Button>
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
