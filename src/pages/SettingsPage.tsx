import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useSettings, HotelSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings2, Save, Info } from "lucide-react";

const SEGMENTS = [
  { value: "economy", label: "Economy" },
  { value: "midscale", label: "Midscale" },
  { value: "premium", label: "Premium" },
  { value: "luxury", label: "Luxury" },
];

const SettingsPage = () => {
  const { settings, settingsLoading, refetchSettings } = useSettings();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [hotelName, setHotelName] = useState("");
  const [totalRooms, setTotalRooms] = useState(144);
  const [segment, setSegment] = useState("midscale");
  const [guestPerRoom, setGuestPerRoom] = useState(1.8);
  const [breakfastRate, setBreakfastRate] = useState(0.8);
  const [lunchRate, setLunchRate] = useState(0);
  const [dinnerRate, setDinnerRate] = useState(0);
  const [hkRoomsPerFte, setHkRoomsPerFte] = useState(17);
  const [hkSupervisorRatio, setHkSupervisorRatio] = useState(40);
  const [fbBreakfast, setFbBreakfast] = useState(45);
  const [fbLunch, setFbLunch] = useState(35);
  const [fbDinner, setFbDinner] = useState(35);
  const [foArrivalsPerFte, setFoArrivalsPerFte] = useState(20);
  const [roomsDepts, setRoomsDepts] = useState("");
  const [fnbDepts, setFnbDepts] = useState("");

  useEffect(() => {
    if (settings) {
      setHotelName(settings.hotel_name);
      setTotalRooms(settings.total_rooms);
      setSegment(settings.segment);
      setGuestPerRoom(settings.guest_per_room);
      setBreakfastRate(settings.breakfast_capture_rate);
      setLunchRate(settings.lunch_capture_rate);
      setDinnerRate(settings.dinner_capture_rate);
      setHkRoomsPerFte(settings.hk_rooms_per_fte);
      setHkSupervisorRatio(settings.hk_supervisor_ratio);
      setFbBreakfast(settings.fb_breakfast_covers_per_fte);
      setFbLunch(settings.fb_lunch_covers_per_fte);
      setFbDinner(settings.fb_dinner_covers_per_fte);
      setRoomsDepts((settings.rooms_departments || []).join(", "));
      setFnbDepts((settings.fnb_departments || []).join(", "));
      setFoArrivalsPerFte(settings.fo_arrivals_per_fte ?? 20);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    const roomsArr = roomsDepts.split(",").map(s => s.trim()).filter(Boolean);
    const fnbArr = fnbDepts.split(",").map(s => s.trim()).filter(Boolean);

    const { error } = await supabase
      .from("hotel_settings")
      .update({
        hotel_name: hotelName,
        total_rooms: totalRooms,
        segment,
        guest_per_room: guestPerRoom,
        breakfast_capture_rate: breakfastRate,
        lunch_capture_rate: lunchRate,
        dinner_capture_rate: dinnerRate,
        hk_rooms_per_fte: hkRoomsPerFte,
        hk_supervisor_ratio: hkSupervisorRatio,
        fb_breakfast_covers_per_fte: fbBreakfast,
        fb_lunch_covers_per_fte: fbLunch,
        fb_dinner_covers_per_fte: fbDinner,
        rooms_departments: roomsArr,
        fnb_departments: fnbArr,
        fo_arrivals_per_fte: foArrivalsPerFte,
        updated_at: new Date().toISOString(),
        updated_by: null,
      } as any)
      .eq("id", settings.id);

    if (error) {
      toast.error("Ayarlar kaydedilemedi: " + error.message);
    } else {
      toast.success("Ayarlar başarıyla kaydedildi");
      refetchSettings();
    }
    setSaving(false);
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

  const Field = ({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );

  const InfoBanner = ({ color, text }: { color: "amber" | "blue"; text: string }) => (
    <div className={`flex items-start gap-2 p-3 rounded-lg text-xs mb-4 ${
      color === "amber"
        ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
        : "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
    }`}>
      <Info className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          Otel Ayarları
        </h1>

        {/* Card 1 — Otel Bilgileri */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Otel Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Otel Adı">
                <Input value={hotelName} onChange={(e) => setHotelName(e.target.value)} className="h-9" />
              </Field>
              <Field label="Toplam Oda Sayısı">
                <Input type="number" min={1} value={totalRooms} onChange={(e) => setTotalRooms(Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Kategori">
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Card 2 — Misafir & Cover Parametreleri */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Misafir & Cover Parametreleri</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoBanner color="amber" text="Bu parametreler tüm Forecast hesaplamalarını etkiler. Yalnızca admin değiştirebilir." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Misafir/Oda Çarpanı" helper="Satılan Oda × ? = Misafir">
                <Input type="number" step={0.1} min={1} max={5} value={guestPerRoom} onChange={(e) => setGuestPerRoom(Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Kahvaltı Capture Rate" helper="Misafir × ? = Kahvaltı Cover">
                <Input type="number" step={0.01} min={0} max={1} value={breakfastRate} onChange={(e) => setBreakfastRate(Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Öğle Capture Rate" helper="0 = Forecast'ta Excel'den gelir">
                <Input type="number" step={0.01} min={0} max={1} value={lunchRate} onChange={(e) => setLunchRate(Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Akşam Capture Rate" helper="0 = Forecast'ta Excel'den gelir">
                <Input type="number" step={0.01} min={0} max={1} value={dinnerRate} onChange={(e) => setDinnerRate(Number(e.target.value))} className="h-9" />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Card 3 — Rooms Division FTE Parametreleri */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rooms Division FTE Parametreleri</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoBanner color="blue" text="Staffing Calculator C-MID standartlarına göre ayarlanmıştır." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="HK Oda Görevlisi" helper="Dolu Oda / FTE">
                <Input type="number" min={1} value={hkRoomsPerFte} onChange={(e) => setHkRoomsPerFte(Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="HK Supervisor Oranı" helper="Oda / Supervisor">
                <Input type="number" min={1} value={hkSupervisorRatio} onChange={(e) => setHkSupervisorRatio(Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Resepsiyonist Kapasite" helper="Bir resepsiyonistin karşılayabileceği arrival sayısı / vardiya">
                <Input type="number" min={1} step={1} value={foArrivalsPerFte} onChange={(e) => setFoArrivalsPerFte(Number(e.target.value))} className="h-9" />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Card 4 — F&B FTE Parametreleri */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">F&B FTE Parametreleri</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoBanner color="blue" text="Staffing Calculator C-MID Venue Service standartlarına göre ayarlanmıştır." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Kahvaltı Servis" helper="Cover / FTE">
                <Input type="number" min={1} value={fbBreakfast} onChange={(e) => setFbBreakfast(Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Öğle Servis" helper="Cover / FTE">
                <Input type="number" min={1} value={fbLunch} onChange={(e) => setFbLunch(Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Akşam Servis" helper="Cover / FTE">
                <Input type="number" min={1} value={fbDinner} onChange={(e) => setFbDinner(Number(e.target.value))} className="h-9" />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Card 5 — Departman Grupları */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Departman Grupları</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoBanner color="blue" text="İş yükü hesaplamalarında hangi departmanların Rooms, hangilerinin F&B sayılacağını belirler." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Rooms Departmanları" helper="Virgülle ayırın">
                <Input value={roomsDepts} onChange={(e) => setRoomsDepts(e.target.value)} placeholder="Housekeeping, Front Office" className="h-9" />
              </Field>
              <Field label="F&B Departmanları" helper="Virgülle ayırın">
                <Input value={fnbDepts} onChange={(e) => setFnbDepts(e.target.value)} placeholder="F&B, Kitchen" className="h-9" />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </Button>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
