import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";
import muninnLogo from "@/assets/muninn-logo.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({ title: "Hata", description: "Şifre en az 6 karakter olmalıdır", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Update password
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    if (pwError) {
      toast({ title: "Hata", description: pwError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Clear the must_change_password flag
    const { error: metaError } = await supabase.auth.updateUser({
      data: { must_change_password: false },
    });

    if (metaError) {
      console.error("Failed to clear must_change_password flag:", metaError);
    }

    toast({ title: "Başarılı", description: "Şifreniz güncellendi" });
    setLoading(false);
    navigate("/");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-2">
            <img src={muninnLogo} alt="Muninn" style={{ height: 120 }} />
          </div>
          <p className="text-muted-foreground">Devam etmek için şifrenizi değiştirmeniz gerekiyor</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Şifre Değiştir
            </CardTitle>
            <CardDescription>Lütfen yeni bir şifre belirleyin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Yeni Şifre</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min 6 karakter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Şifre Tekrar</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Şifrenizi tekrar girin"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <KeyRound className="h-4 w-4 mr-2" /> Şifreyi Güncelle
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default ChangePasswordPage;
