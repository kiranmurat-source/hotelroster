import ExcelJS from "exceljs";
import { ForecastDay, WeeklyForecast } from "./forecast-types";

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FIXED_TOTAL_ROOMS = 144;

/** Format a Date to yyyy-MM-dd using local timezone (avoids UTC shift from toISOString) */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parses an Excel file into a WeeklyForecast.
 */
export async function parseExcelForecast(data: ArrayBuffer): Promise<WeeklyForecast> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount === 0) throw new Error("No data found in the spreadsheet");

  // Extract header row
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "");
  });

  // Flexible column matching
  const findCol = (patterns: string[]): number | null => {
    for (const pattern of patterns) {
      const idx = headers.findIndex(
        (h) => h && h.toLowerCase().replace(/[^a-z0-9çşğıöü]/g, "").includes(pattern)
      );
      if (idx !== -1) return idx;
    }
    return null;
  };

  const dateColIdx = findCol(["date", "day", "tarih"]);
  const occColIdx = findCol(["occupancy", "occ", "doluluk"]);
  const roomNightsColIdx = findCol(["roomnights", "soldrooms", "satılanoda", "rooms", "oda"]);
  const arrivalColIdx = findCol(["arrival", "checkin", "arriving", "giriş", "geliş"]);
  const departureColIdx = findCol(["departure", "checkout", "departing", "çıkış"]);
  const lunchColIdx = findCol(["öğlen", "lunch", "öğlenkuver"]);
  const dinnerColIdx = findCol(["akşam", "dinner", "akşamkuver"]);
  const eventColIdx = findCol(["event", "banquet", "function", "etkinlik"]);

  const days: ForecastDay[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const getCellValue = (colIdx: number | null): unknown => {
      if (colIdx === null) return null;
      return row.getCell(colIdx).value;
    };

    let dateStr = "";
    let dayLabel = "";

    if (dateColIdx !== null) {
      const val = getCellValue(dateColIdx);
      if (val instanceof Date) {
        dateStr = toLocalISODate(val);
        dayLabel = SHORT_DAYS[val.getDay()];
      } else if (typeof val === "string") {
        // Try dd.mm.yyyy format first
        const ddmmMatch = val.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (ddmmMatch) {
          const [, dd, mm, yyyy] = ddmmMatch;
          const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
          dateStr = toLocalISODate(d);
          dayLabel = SHORT_DAYS[d.getDay()];
        } else {
          const parsed = new Date(val);
          if (!isNaN(parsed.getTime())) {
            dateStr = toLocalISODate(parsed);
            dayLabel = SHORT_DAYS[parsed.getDay()];
          } else {
            dateStr = val;
            dayLabel = `Day ${rowNumber - 1}`;
          }
        }
      } else if (typeof val === "number") {
        // Excel serial date
        const excelEpoch = new Date(1899, 11, 30);
        const d = new Date(excelEpoch.getTime() + val * 86400000);
        dateStr = toLocalISODate(d);
        dayLabel = SHORT_DAYS[d.getDay()];
      }
    } else {
      dateStr = `Day ${rowNumber - 1}`;
      dayLabel = `Day ${rowNumber - 1}`;
    }

    const rawOcc = occColIdx !== null ? Number(getCellValue(occColIdx)) || 0 : 0;
    // Handle Excel percentage cells (0.72 means 72%)
    const occupancyRate = rawOcc > 0 && rawOcc < 1 ? Math.round(rawOcc * 100) : rawOcc;
    const rawRoomNights = roomNightsColIdx !== null ? Number(getCellValue(roomNightsColIdx)) || 0 : 0;
    const arrivals = arrivalColIdx !== null ? Number(getCellValue(arrivalColIdx)) || 0 : 0;
    const departures = departureColIdx !== null ? Number(getCellValue(departureColIdx)) || 0 : 0;
    const totalRooms = FIXED_TOTAL_ROOMS;
    // Prefer explicit room nights column; fall back to deriving from occupancy
    const roomNights = rawRoomNights > 0 ? rawRoomNights : Math.round((occupancyRate / 100) * totalRooms);
    const lunchCovers = lunchColIdx !== null ? Number(getCellValue(lunchColIdx)) || 0 : 0;
    const dinnerCovers = dinnerColIdx !== null ? Number(getCellValue(dinnerColIdx)) || 0 : 0;

    let events: string[] = [];
    if (eventColIdx !== null) {
      const ev = String(getCellValue(eventColIdx) || "").trim();
      if (ev) events = ev.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
    }

    days.push({ date: dateStr, dayLabel, occupancyRate, arrivals, departures, roomNights, totalRooms, lunchCovers, dinnerCovers, events });
  });

  if (days.length === 0) throw new Error("No data found in the spreadsheet");

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

/** Format date as dd.mm.yyyy */
function formatDateDDMMYYYY(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

/** Generate a sample Excel file for download */
export async function generateSampleExcel(): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Weekly Forecast");

  ws.columns = [
    { header: "Tarih", key: "date", width: 14 },
    { header: "Satılan Oda", key: "roomNights", width: 14 },
    { header: "Doluluk %", key: "occ", width: 14 },
    { header: "Giriş", key: "arrival", width: 10 },
    { header: "Çıkış", key: "departure", width: 12 },
    { header: "Öğlen Kuver", key: "lunch", width: 14 },
    { header: "Akşam Kuver", key: "dinner", width: 14 },
    { header: "Etkinlik", key: "events", width: 30 },
  ];

  const data = [
    { date: "09.03.2026", roomNights: 104, occ: 72, arrival: 32, departure: 45, lunch: 85, dinner: 120, events: "" },
    { date: "10.03.2026", roomNights: 112, occ: 78, arrival: 33, departure: 65, lunch: 95, dinner: 140, events: "Corporate Seminar" },
    { date: "11.03.2026", roomNights: 122, occ: 85, arrival: 23, departure: 23, lunch: 110, dinner: 160, events: "Wedding Reception" },
    { date: "12.03.2026", roomNights: 130, occ: 90, arrival: 11, departure: 56, lunch: 130, dinner: 180, events: "Wedding Reception, Board Dinner" },
    { date: "13.03.2026", roomNights: 137, occ: 95, arrival: 55, departure: 32, lunch: 140, dinner: 200, events: "Conference Day 1" },
    { date: "14.03.2026", roomNights: 141, occ: 98, arrival: 22, departure: 55, lunch: 150, dinner: 210, events: "Conference Day 2, Gala Night" },
    { date: "15.03.2026", roomNights: 118, occ: 82, arrival: 11, departure: 77, lunch: 90, dinner: 130, events: "" },
  ];

  data.forEach((row) => ws.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export { formatDateDDMMYYYY };
