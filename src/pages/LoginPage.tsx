import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { LogIn, Hotel } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";

const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: t("login.failed"), description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast({ title: t("login.failed"), description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-end">
          <LanguageToggle variant="login" />
        </div>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <Hotel className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Hotel<span className="text-accent">Roster</span>
            </h1>
          </div>
          <p className="text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("login.cardTitle")}</CardTitle>
            <CardDescription>{t("login.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">{t("login.email")}</Label>
                <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@hotel.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">{t("login.password")}</Label>
                <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="h-4 w-4 mr-2" /> {t("login.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
