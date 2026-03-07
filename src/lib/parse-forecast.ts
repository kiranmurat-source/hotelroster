import * as XLSX from "xlsx";
import { ForecastDay, WeeklyForecast } from "./forecast-types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Parses an Excel file into a WeeklyForecast.
 * 
 * Expected columns (flexible matching):
 *  - Date (date or string)
 *  - Occupancy / Occupancy Rate / Occ% (number 0-100)
 *  - Room Nights / Rooms Booked / Bookings (number)
 *  - Total Rooms / Capacity (number, optional — defaults to 200)
 *  - Events / Event / Banquet (string, optional)
 */
export function parseExcelForecast(data: ArrayBuffer): WeeklyForecast {
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) throw new Error("No data found in the spreadsheet");

  // Flexible column matching
  const findCol = (row: Record<string, unknown>, patterns: string[]): string | null => {
    const keys = Object.keys(row);
    for (const pattern of patterns) {
      const found = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(pattern));
      if (found) return found;
    }
    return null;
  };

  const sample = rows[0];
  const dateCol = findCol(sample, ["date", "day"]);
  const occCol = findCol(sample, ["occupancy", "occ"]);
  const roomCol = findCol(sample, ["roomnight", "roomsbooked", "booking", "rooms"]);
  const totalCol = findCol(sample, ["totalroom", "capacity", "total"]);
  const eventCol = findCol(sample, ["event", "banquet", "function"]);

  const days: ForecastDay[] = rows.map((row, i) => {
    let dateStr = "";
    let dayLabel = "";

    if (dateCol) {
      const val = row[dateCol];
      if (val instanceof Date) {
        dateStr = val.toISOString().split("T")[0];
        dayLabel = SHORT_DAYS[val.getDay()];
      } else if (typeof val === "string") {
        // Try parsing
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
          dateStr = parsed.toISOString().split("T")[0];
          dayLabel = SHORT_DAYS[parsed.getDay()];
        } else {
          dateStr = val;
          dayLabel = `Day ${i + 1}`;
        }
      } else if (typeof val === "number") {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(val);
        dateStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
        const parsed = new Date(dateStr);
        dayLabel = SHORT_DAYS[parsed.getDay()];
      }
    } else {
      dateStr = `Day ${i + 1}`;
      dayLabel = `Day ${i + 1}`;
    }

    const occupancyRate = occCol ? Number(row[occCol]) || 0 : 0;
    const roomNights = roomCol ? Number(row[roomCol]) || 0 : 0;
    const totalRooms = totalCol ? Number(row[totalCol]) || 200 : 200;

    let events: string[] = [];
    if (eventCol) {
      const ev = String(row[eventCol] || "").trim();
      if (ev) events = ev.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
    }

    return { date: dateStr, dayLabel, occupancyRate, roomNights, totalRooms, events };
  });

  const startDate = days[0]?.date || "";
  const endDate = days[days.length - 1]?.date || "";

  return {
    weekLabel: `${startDate} – ${endDate}`,
    startDate,
    endDate,
    days,
    uploadedAt: new Date().toISOString(),
  };
}

/** Generate a sample Excel file for download */
export function generateSampleExcel(): ArrayBuffer {
  const data = [
    { Date: "2026-03-09", "Occupancy %": 72, "Room Nights": 144, "Total Rooms": 200, Events: "" },
    { Date: "2026-03-10", "Occupancy %": 78, "Room Nights": 156, "Total Rooms": 200, Events: "Corporate Seminar" },
    { Date: "2026-03-11", "Occupancy %": 85, "Room Nights": 170, "Total Rooms": 200, Events: "Wedding Reception" },
    { Date: "2026-03-12", "Occupancy %": 90, "Room Nights": 180, "Total Rooms": 200, Events: "Wedding Reception, Board Dinner" },
    { Date: "2026-03-13", "Occupancy %": 95, "Room Nights": 190, "Total Rooms": 200, Events: "Conference Day 1" },
    { Date: "2026-03-14", "Occupancy %": 98, "Room Nights": 196, "Total Rooms": 200, Events: "Conference Day 2, Gala Night" },
    { Date: "2026-03-15", "Occupancy %": 82, "Room Nights": 164, "Total Rooms": 200, Events: "" },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Weekly Forecast");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
