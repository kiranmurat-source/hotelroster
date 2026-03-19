import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useShiftTypes, ShiftTypeRecord } from "@/hooks/useShiftTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShiftPill } from "@/components/ShiftPill";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  department: string | null;
}

interface ManualShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  onSaved: () => void;
}

const ManualShiftDialog = ({ open, onOpenChange, defaultDate, onSaved }: ManualShiftDialogProps) => {
  const { user } = useAuth();
  const { shiftTypes } = useShiftTypes();
  const { t } = useLanguage();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedShiftTypeId, setSelectedShiftTypeId] = useState("");
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, department")
        .order("display_name");
      if (data) setProfiles(data as Profile[]);
      setLoading(false);
    };
    load();
  }, [open]);

  const selectedShiftType = useMemo(
    () => shiftTypes.find((s) => s.id === selectedShiftTypeId),
    [shiftTypes, selectedShiftTypeId]
  );

  const profilesByDept = useMemo(() => {
    const groups: Map<string, Profile[]> = new Map();
    profiles.forEach((p) => {
      const dept = p.department || "Other";
      if (!groups.has(dept)) groups.set(dept, []);
      groups.get(dept)!.push(p);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [profiles]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const handleSave = async () => {
    if (!selectedProfile || !selectedShiftType || !user || !date) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("roster_shifts").insert({
        user_id: user.id,
        staff_name: selectedProfile.display_name || "Unknown",
        date,
        shift: selectedShiftType.code,
        department: selectedProfile.department || "Other",
        shift_type_id: selectedShiftType.id,
        custom_start_time: selectedShiftType.is_editable_time && customStart ? customStart : null,
        custom_end_time: selectedShiftType.is_editable_time && customEnd ? customEnd : null,
      });

      if (error) throw error;

      toast.success("Vardiya kaydedildi");
      setSelectedProfileId("");
      setSelectedShiftTypeId("");
      setCustomStart("");
      setCustomEnd("");
      onSaved();
    } catch (err: any) {
      toast.error("Kayıt hatası: " + (err?.message || "Unknown"));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSelectedProfileId("");
    setSelectedShiftTypeId("");
    setCustomStart("");
    setCustomEnd("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Vardiya Ata
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date */}
          <div className="space-y-1.5">
            <Label>Tarih</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Staff select */}
          <div className="space-y-1.5">
            <Label>Personel</Label>
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger>
                <SelectValue placeholder="Personel seçin..." />
              </SelectTrigger>
              <SelectContent>
                {profilesByDept.map(([dept, members]) => (
                  <div key={dept}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{dept}</div>
                    {members.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.display_name || p.user_id}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shift type select */}
          <div className="space-y-1.5">
            <Label>Vardiya Tipi</Label>
            <Select value={selectedShiftTypeId} onValueChange={setSelectedShiftTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Vardiya seçin..." />
              </SelectTrigger>
              <SelectContent>
                {shiftTypes.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    <div className="flex items-center gap-2">
                      <ShiftPill shiftType={st} size="sm" showTime={false} />
                      <span className="text-xs text-muted-foreground">{st.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom time for editable shifts */}
          {selectedShiftType?.is_editable_time && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Başlangıç</Label>
                <Input
                  type="time"
                  value={customStart || selectedShiftType.start_time?.slice(0, 5) || ""}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bitiş</Label>
                <Input
                  type="time"
                  value={customEnd || selectedShiftType.end_time?.slice(0, 5) || ""}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedProfile && selectedShiftType && (
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <span className="font-medium">{selectedProfile.display_name}</span>
              <span className="text-muted-foreground"> — {selectedProfile.department || "?"}</span>
              <div className="mt-1">
                <ShiftPill shiftType={selectedShiftType} size="md" customStart={customStart || null} customEnd={customEnd || null} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button
            onClick={handleSave}
            disabled={!selectedProfileId || !selectedShiftTypeId || !date || saving}
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualShiftDialog;
