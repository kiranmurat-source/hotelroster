export interface ForecastDay {
  date: string;
  dayLabel: string;
  occupancyRate: number;
  arrivals: number;
  departures: number;
  roomNights: number;
  totalRooms: number;
  lunchCovers: number;
  dinnerCovers: number;
  events: string[];
}

export interface WeeklyForecast {
  weekLabel: string;
  startDate: string;
  endDate: string;
  days: ForecastDay[];
  uploadedAt: string;
}
