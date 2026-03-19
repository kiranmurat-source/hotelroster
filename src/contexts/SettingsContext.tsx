import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HotelSettings {
  id: string;
  hotel_name: string;
  total_rooms: number;
  segment: string;
  guest_per_room: number;
  breakfast_capture_rate: number;
  lunch_capture_rate: number;
  dinner_capture_rate: number;
  hk_rooms_per_fte: number;
  hk_supervisor_ratio: number;
  fb_breakfast_covers_per_fte: number;
  fb_lunch_covers_per_fte: number;
  fb_dinner_covers_per_fte: number;
  fo_arrivals_per_fte: number;
  rooms_departments: string[];
  fnb_departments: string[];
  updated_at: string;
  updated_by: string | null;
}

interface SettingsContextValue {
  settings: HotelSettings | null;
  settingsLoading: boolean;
  refetchSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  settingsLoading: true,
  refetchSettings: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<HotelSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    const { data, error } = await supabase
      .from("hotel_settings")
      .select("*")
      .single();

    if (!error && data) {
      setSettings(data as unknown as HotelSettings);
    }
    setSettingsLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, settingsLoading, refetchSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
