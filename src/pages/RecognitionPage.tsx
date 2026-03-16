import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Send, Trophy, Award } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["Teamwork", "Guest Service", "Leadership", "Above & Beyond"] as const;

const categoryColors: Record<string, string> = {
  "Teamwork": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Guest Service": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Leadership": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Above & Beyond": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
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

  // Fetch all data
  const fetchData = useCallback(async () => {
    const [profilesRes, kudosRes, badgesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url"),
      supabase.from("kudos").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("badges").select("*").order("threshold_points", { ascending: true }),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (kudosRes.data) setKudosList(kudosRes.data as KudosItem[]);
    if (badgesRes.data) setAllBadges(badgesRes.data as BadgeItem[]);

    // Leaderboard: current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    // Get all kudos this month to calculate points
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

    // My badges
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

  // Real-time subscription for kudos
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500" />
            {t("recognition.title")}
          </h1>
          <p className="text-muted-foreground">{t("recognition.subtitle")}</p>
        </div>

        {/* Top section: Form + Feed */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Send Kudos Form */}
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
                <Button type="submit" className="w-full" disabled={!canSubmit}>
                  {submitting ? "..." : t("recognition.send")}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">{t("recognition.activityFeed")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
              {kudosList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("recognition.noKudos")}</p>
              )}
              {kudosList.map(k => (
                <div key={k.id} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">{getInitials(getName(k.from_user_id))}</AvatarFallback>
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

        {/* Bottom section: Leaderboard + My Badges */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Leaderboard */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                {t("recognition.leaderboard")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("recognition.noPoints")}</p>
              )}
              {leaderboard.map((entry, i) => (
                <div key={entry.staff_id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      i === 0 ? "bg-amber-100 text-amber-700" :
                      i === 1 ? "bg-gray-100 text-gray-600" :
                      i === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{entry.display_name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{entry.total_points} pts</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* My Badges */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                {t("recognition.myBadges")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allBadges.map(badge => {
                  const earned = myEarnedBadges.some(e => e.badge_id === badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-colors ${
                        earned ? "border-primary/30 bg-primary/5" : "opacity-40 grayscale"
                      }`}
                    >
                      <Star className={`h-6 w-6 ${earned ? "text-amber-500" : "text-muted-foreground"}`} />
                      <span className="text-xs font-semibold">{badge.name}</span>
                      <span className="text-[10px] text-muted-foreground">{badge.threshold_points} pts</span>
                    </div>
                  );
                })}
              </div>
              {allBadges.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t("recognition.noBadges")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default RecognitionPage;
