import AppLayout from "@/components/AppLayout";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const SettingsPage = () => {
  const { settings, settingsLoading } = useSettings();

  if (settingsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Otel Ayarları
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settings ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Otel Adı:</span> {settings.hotel_name}</div>
                <div><span className="text-muted-foreground">Toplam Oda:</span> {settings.total_rooms}</div>
                <div><span className="text-muted-foreground">Segment:</span> {settings.segment}</div>
                <div><span className="text-muted-foreground">Oda Başı Misafir:</span> {settings.guest_per_room}</div>
                <div><span className="text-muted-foreground">Kahvaltı Oranı:</span> {(settings.breakfast_capture_rate * 100).toFixed(0)}%</div>
                <div><span className="text-muted-foreground">Öğle Oranı:</span> {(settings.lunch_capture_rate * 100).toFixed(0)}%</div>
                <div><span className="text-muted-foreground">Akşam Oranı:</span> {(settings.dinner_capture_rate * 100).toFixed(0)}%</div>
                <div><span className="text-muted-foreground">HK Oda/FTE:</span> {settings.hk_rooms_per_fte}</div>
                <div><span className="text-muted-foreground">HK Supervisor Oranı:</span> {settings.hk_supervisor_ratio}</div>
                <div><span className="text-muted-foreground">F&B Kahvaltı Kuver/FTE:</span> {settings.fb_breakfast_covers_per_fte}</div>
                <div><span className="text-muted-foreground">F&B Öğle Kuver/FTE:</span> {settings.fb_lunch_covers_per_fte}</div>
                <div><span className="text-muted-foreground">F&B Akşam Kuver/FTE:</span> {settings.fb_dinner_covers_per_fte}</div>
              </div>
            ) : (
              <p className="text-muted-foreground">Ayar bulunamadı.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
