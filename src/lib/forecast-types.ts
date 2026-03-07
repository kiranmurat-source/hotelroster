export interface ForecastDay {
  date: string;
  dayLabel: string;
  occupancyRate: number;
  roomNights: number;
  totalRooms: number;
  events: string[];
}

export interface WeeklyForecast {
  weekLabel: string;
  startDate: string;
  endDate: string;
  days: ForecastDay[];
  uploadedAt: string;
}
