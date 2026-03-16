import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Send, Trophy, Award, Medal, Inbox } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["Teamwork", "Guest Service", "Leadership", "Above & Beyond"] as const;

const categoryColors: Record<string, string> = {
  "Teamwork": "bg-primary/20 text-primary-foreground",
  "Guest Service": "bg-success/20 text-success",
  "Leadership": "bg-accent/20 text-accent",
  "Above & Beyond": "bg-warning/20 text-warning",
};

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface KudosItem {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  category: string;
  created_at: string;
}

interface LeaderboardEntry {
  staff_id: string;
  total_points: number;
  display_name: string;
}

interface BadgeItem {
  id: string;
  name: string;
  description: string | null;
  threshold_points: number;
}

interface EarnedBadge {
  badge_id: string;
  earned_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const medalStyles = [
  "bg-warning/20 text-warning ring-2 ring-warning/40",     // gold
  "bg-muted text-muted-foreground ring-2 ring-border",     // silver
  "bg-accent/20 text-accent ring-2 ring-accent/40",        // bronze
];

const RecognitionPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [toUserId, setToUserId] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [kudosList, setKudosList] = useState<KudosItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeItem[]>([]);
  const [myEarnedBadges, setMyEarnedBadges] = useState<EarnedBadge[]>([]);

  const profileMap = new Map(profiles.map(p => [p.user_id, p]));

  const getName = useCallback((userId: string) => {
    return profileMap.get(userId)?.display_name || "Unknown";
  }, [profileMap]);

  const fetchData = useCallback(async () => {
    const [profilesRes, kudosRes, badgesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url"),
      supabase.from("kudos").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("badges").select("*").order("threshold_points", { ascending: true }),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (kudosRes.data) setKudosList(kudosRes.data as KudosItem[]);
    if (badgesRes.data) setAllBadges(badgesRes.data as BadgeItem[]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { data: monthKudos } = await supabase
      .from("kudos")
      .select("from_user_id, to_user_id")
      .gte("created_at", monthStart);

    if (monthKudos && profilesRes.data) {
      const pointsMap = new Map<string, number>();
      monthKudos.forEach(k => {
        pointsMap.set(k.to_user_id, (pointsMap.get(k.to_user_id) || 0) + 5);
        pointsMap.set(k.from_user_id, (pointsMap.get(k.from_user_id) || 0) + 1);
      });
      const entries: LeaderboardEntry[] = Array.from(pointsMap.entries())
        .map(([staff_id, total_points]) => ({
          staff_id,
          total_points,
          display_name: profilesRes.data.find(p => p.user_id === staff_id)?.display_name || "Unknown",
        }))
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 5);
      setLeaderboard(entries);
    }

    if (user) {
      const { data: earned } = await supabase
        .from("staff_badges")
        .select("badge_id, earned_at")
        .eq("staff_id", user.id);
      if (earned) setMyEarnedBadges(earned);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("kudos-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kudos" }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const canSubmit = toUserId && category && message.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;
    if (toUserId === user.id) {
      toast.error(t("recognition.cantSelfKudos"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("process_kudos", {
      _from_user_id: user.id,
      _to_user_id: toUserId,
      _message: message.trim(),
      _category: category,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to send kudos");
      console.error(error);
      return;
    }
    toast.success(t("recognition.sent"));
    setToUserId("");
    setCategory("");
    setMessage("");
    fetchData();
  };

  const recipientOptions = profiles.filter(p => p.user_id !== user?.id);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-accent" />
            {t("recognition.title")}
          </h1>
          <p className="text-muted-foreground">{t("recognition.subtitle")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-4 w-4" />
                {t("recognition.sendKudos")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("recognition.recipient")}</Label>
                  <Select value={toUserId} onValueChange={setToUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("recognition.selectRecipient")} />
                    </SelectTrigger>
                    <SelectContent>
                      {recipientOptions.map(p => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.display_name || p.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("recognition.category")}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("recognition.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("recognition.message")}</Label>
                  <Textarea
                    value={message}
                    onChange={e => setMessage(e.target.value.slice(0, 150))}
                    placeholder={t("recognition.messagePlaceholder")}
                    rows={3}
                    maxLength={150}
                  />
                  <p className="text-xs text-muted-foreground text-right">{message.length}/150</p>
                </div>
                <Button type="submit" className="w-full font-semibold" disabled={!canSubmit}>
                  {submitting ? "..." : t("recognition.send")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">{t("recognition.activityFeed")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 max-h-[420px] overflow-y-auto">
              {kudosList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Inbox className="h-8 w-8 mb-2" />
                  <p className="text-sm">{t("recognition.noKudos")}</p>
                </div>
              )}
              {kudosList.map(k => (
                <div key={k.id} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-secondary">{getInitials(getName(k.from_user_id))}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{getName(k.from_user_id)}</span>
                      {" → "}
                      <span className="font-medium">{getName(k.to_user_id)}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${categoryColors[k.category] || ""}`}>
                        {k.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(k.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{k.message}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                {t("recognition.leaderboard")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Medal className="h-8 w-8 mb-2" />
                  <p className="text-sm">{t("recognition.noPoints")}</p>
                </div>
              )}
              {leaderboard.map((entry, i) => (
                <div key={entry.staff_id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                      i < 3 ? medalStyles[i] : "bg-muted text-muted-foreground"
                    }`}>
                      {i < 3 ? (
                        <Medal className="h-4 w-4" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className={`text-sm ${i < 3 ? "font-semibold" : "font-medium"}`}>{entry.display_name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">{entry.total_points} pts</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-4 w-4 text-accent" />
                {t("recognition.myBadges")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {allBadges.map(badge => {
                  const earned = myEarnedBadges.some(e => e.badge_id === badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                        earned ? "border-accent/30 bg-accent/5" : "opacity-40 grayscale"
                      }`}
                    >
                      <Star className={`h-8 w-8 ${earned ? "text-accent" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold">{badge.name}</span>
                      <span className="text-[10px] text-muted-foreground">{badge.threshold_points} pts</span>
                    </div>
                  );
                })}
              </div>
              {allBadges.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Award className="h-8 w-8 mb-2" />
                  <p className="text-sm">{t("recognition.noBadges")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default RecognitionPage;
