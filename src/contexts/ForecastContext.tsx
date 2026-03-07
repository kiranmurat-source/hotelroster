import { createContext, useContext, useState, ReactNode } from "react";
import { WeeklyForecast } from "@/lib/forecast-types";

interface ForecastContextType {
  forecast: WeeklyForecast | null;
  setForecast: (f: WeeklyForecast | null) => void;
}

const ForecastContext = createContext<ForecastContextType>({
  forecast: null,
  setForecast: () => {},
});

export const useForecast = () => useContext(ForecastContext);

export const ForecastProvider = ({ children }: { children: ReactNode }) => {
  const [forecast, setForecast] = useState<WeeklyForecast | null>(null);
  return (
    <ForecastContext.Provider value={{ forecast, setForecast }}>
      {children}
    </ForecastContext.Provider>
  );
};
