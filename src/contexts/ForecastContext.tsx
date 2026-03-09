import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { WeeklyForecast } from "@/lib/forecast-types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ForecastContextType {
  forecast: WeeklyForecast | null;
  loading: boolean;
  saveForecast: (f: WeeklyForecast) => Promise<void>;
  clearForecast: () => Promise<void>;
}

const ForecastContext = createContext<ForecastContextType>({
  forecast: null,
  loading: true,
  saveForecast: async () => {},
  clearForecast: async () => {},
});

export const useForecast = () => useContext(ForecastContext);

export const ForecastProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [forecast, setForecast] = useState<WeeklyForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Load latest forecast on mount / auth change
  useEffect(() => {
    if (!user) {
      setForecast(null);
      setCurrentId(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("forecasts")
        .select("*")
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to load forecast:", error);
      } else if (data) {
        setForecast({
          weekLabel: data.week_label,
          startDate: data.start_date,
          endDate: data.end_date,
          days: data.days as any,
          uploadedAt: data.uploaded_at,
        });
        setCurrentId(data.id);
      } else {
        setForecast(null);
        setCurrentId(null);
      }
      setLoading(false);
    };

    load();
  }, [user]);

  const saveForecast = useCallback(async (f: WeeklyForecast) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("forecasts")
      .insert({
        user_id: user.id,
        week_label: f.weekLabel,
        start_date: f.startDate,
        end_date: f.endDate,
        days: f.days as any,
        uploaded_at: f.uploadedAt,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save forecast:", error);
      throw error;
    }

    setForecast(f);
    setCurrentId(data.id);
  }, [user]);

  const clearForecast = useCallback(async () => {
    if (!currentId) {
      setForecast(null);
      return;
    }

    const { error } = await supabase
      .from("forecasts")
      .delete()
      .eq("id", currentId);

    if (error) {
      console.error("Failed to delete forecast:", error);
      throw error;
    }

    setForecast(null);
    setCurrentId(null);
  }, [currentId]);

  return (
    <ForecastContext.Provider value={{ forecast, loading, saveForecast, clearForecast }}>
      {children}
    </ForecastContext.Provider>
  );
};
