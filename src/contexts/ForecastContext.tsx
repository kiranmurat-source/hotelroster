import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { WeeklyForecast } from "@/lib/forecast-types";
import { api } from "@/integrations/api/client";
import { toast } from "sonner";

interface ForecastRecord {
  id: string;
  user_id: string;
  week_label: string;
  start_date: string;
  end_date: string;
  days: any;
  uploaded_at: string;
}

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
  const [forecast, setForecast] = useState<WeeklyForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ForecastRecord[]>('/roster/forecast?limit=1');
      if (data && data.length > 0) {
        const rec = data[0];
        setForecast({
          weekLabel: rec.week_label,
          startDate: rec.start_date,
          endDate: rec.end_date,
          days: rec.days,
          uploadedAt: rec.uploaded_at,
        });
        setCurrentId(rec.id);
      } else {
        setForecast(null);
        setCurrentId(null);
      }
    } catch (err) {
      console.error("Failed to load forecast:", err);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // user bağımlılığı yok — direkt mount'ta yükle
  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  const saveForecast = useCallback(async (f: WeeklyForecast) => {
    const data = await api.post<ForecastRecord>('/roster/forecast', {
      week_label: f.weekLabel,
      start_date: f.startDate,
      end_date: f.endDate,
      days: f.days,
      uploaded_at: f.uploadedAt,
    });
    setForecast(f);
    setCurrentId(data.id);
    // Forecast kaydedilince yeniden yükle
    await loadForecast();
  }, [loadForecast]);

  const clearForecast = useCallback(async () => {
    if (!currentId) {
      setForecast(null);
      return;
    }
    await api.delete(`/roster/forecast/${currentId}`);
    setForecast(null);
    setCurrentId(null);
  }, [currentId]);

  return (
    <ForecastContext.Provider value={{ forecast, loading, saveForecast, clearForecast }}>
      {children}
    </ForecastContext.Provider>
  );
};
