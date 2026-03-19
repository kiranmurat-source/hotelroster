import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useSettings, HotelSettings } from "@/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Save, X, Pencil } from "lucide-react";

interface FieldConfig {
  key: keyof HotelSettings;
  label: string;
  type: "text" | "number" | "percent";
  group: string;
}

const FIELDS: FieldConfig[] = [
  { key: "hotel_name", label: "Otel Adı", type: "text", group: "Genel" },
  { key: "total_rooms", label: "Toplam Oda", type: "number", group: "Genel" },
  { key: "segment", label: "Segment", type: "text", group: "Genel" },
  { key: "guest_per_room", label: "Oda Başı Misafir", type: "number", group: "Genel" },
  { key: "breakfast_capture_rate", label: "Kahvaltı Yakalama Oranı", type: "percent", group: "Kuver Oranları" },
  { key: "lunch_capture_rate", label: "Öğle Yakalama Oranı", type: "percent", group: "Kuver Oranları" },
  { key: "dinner_capture_rate", label: "Akşam Yakalama Oranı", type: "percent", group: "Kuver Oranları" },
  { key: "hk_rooms_per_fte", label: "HK Oda / FTE", type: "number", group: "Housekeeping" },
  { key: "hk_supervisor_ratio", label: "HK Supervisor Oranı", type: "number", group: "Housekeeping" },
  { key: "fb_breakfast_covers_per_fte", label: "F&B Kahvaltı Kuver / FTE", type: "number", group: "F&B" },
  { key: "fb_lunch_covers_per_fte", label: "F&B Öğle Kuver / FTE", type: "number", group: "F&B" },
  { key: "fb_dinner_covers_per_fte", label: "F&B Akşam Kuver / FTE", type: "number", group: "F&B" },
];

const SettingsPage = () => {
  const { settings, settingsLoading, refetchSettings } = useSettings();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string | number>>({});

  useEffect(() => {
    if (settings) {
      const initial: Record<string, string | number> = {};
      FIELDS.forEach((f) => {
        const val = settings[f.key];
        if (f.type === "percent") {
          initial[f.key] = Math.round((val as number) * 100);
        } else {
          initial[f.key] = val as string | number;
        }
      });
      setForm(initial);
    }
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    const field = FIELDS.find((f) => f.key === key);
    if (!field) return;
    if (field.type === "text") {
      setForm((prev) => ({ ...prev, [key]: value }));
    } else {
      const num = value === "" ? 0 : Number(value);
      setForm((prev) => ({ ...prev, [key]: num }));
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    const update: Record<string, unknown> = {};
    FIELDS.forEach((f) => {
      if (f.type === "percent") {
        update[f.key] = (form[f.key] as number) / 100;
      } else {
        update[f.key] = form[f.key];
      }
    });
    update.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("hotel_settings")
      .update(update as any)
      .eq("id", settings.id);

    if (error) {
      toast.error("Ayarlar kaydedilemedi: " + error.message);
    } else {
      toast.success("Ayarlar başarıyla güncellendi");
      setEditing(false);
      refetchSettings();
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setEditing(false);
    if (settings) {
      const initial: Record<string, string | number> = {};
      FIELDS.forEach((f) => {
        const val = settings[f.key];
        if (f.type === "percent") {
          initial[f.key] = Math.round((val as number) * 100);
        } else {
          initial[f.key] = val as string | number;
        }
      });
      setForm(initial);
    }
  };

  if (settingsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!settings) {
    return (
      <AppLayout>
        <p className="text-muted-foreground p-8">Ayar bulunamadı.</p>
      </AppLayout>
    );
  }

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Otel Ayarları
          </h1>
          {!editing ? (
            <Button onClick={() => setEditing(true)} variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Düzenle
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="ghost" size="sm" disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                İptal
              </Button>
              <Button onClick={handleSave} size="sm" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          )}
        </div>

        {groups.map((group) => (
          <Card key={group}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{group}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FIELDS.filter((f) => f.group === group).map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {field.label}
                      {field.type === "percent" && " (%)"}
                    </Label>
                    {editing ? (
                      <Input
                        type={field.type === "text" ? "text" : "number"}
                        value={form[field.key] ?? ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        step={field.key === "guest_per_room" ? "0.1" : "1"}
                        className="h-9"
                      />
                    ) : (
                      <p className="text-sm font-medium py-1.5">
                        {field.type === "percent"
                          ? `${Math.round((settings[field.key] as number) * 100)}%`
                          : String(settings[field.key])}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
