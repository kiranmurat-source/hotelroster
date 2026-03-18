import ExcelJS from "exceljs";
import { ForecastDay, WeeklyForecast } from "./forecast-types";

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
        (h) => h && h.toLowerCase().replace(/[^a-z0-9]/g, "").includes(pattern)
      );
      if (idx !== -1) return idx;
    }
    return null;
  };

  const dateColIdx = findCol(["date", "day"]);
  const occColIdx = findCol(["occupancy", "occ"]);
  const arrivalColIdx = findCol(["arrival", "checkin", "arriving"]);
  const departureColIdx = findCol(["departure", "checkout", "departing"]);
  const roomColIdx = findCol(["roomnight", "roomsbooked", "booking", "rooms"]);
  const totalColIdx = findCol(["totalroom", "capacity", "total"]);
  const eventColIdx = findCol(["event", "banquet", "function"]);

  const days: ForecastDay[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const getCellValue = (colIdx: number | null): unknown => {
      if (colIdx === null) return null;
      return row.getCell(colIdx + 1).value;
    };

    let dateStr = "";
    let dayLabel = "";

    if (dateColIdx !== null) {
      const val = getCellValue(dateColIdx);
      if (val instanceof Date) {
        dateStr = val.toISOString().split("T")[0];
        dayLabel = SHORT_DAYS[val.getDay()];
      } else if (typeof val === "string") {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
          dateStr = parsed.toISOString().split("T")[0];
          dayLabel = SHORT_DAYS[parsed.getDay()];
        } else {
          dateStr = val;
          dayLabel = `Day ${rowNumber - 1}`;
        }
      } else if (typeof val === "number") {
        // Excel serial date
        const excelEpoch = new Date(1899, 11, 30);
        const d = new Date(excelEpoch.getTime() + val * 86400000);
        dateStr = d.toISOString().split("T")[0];
        dayLabel = SHORT_DAYS[d.getDay()];
      }
    } else {
      dateStr = `Day ${rowNumber - 1}`;
      dayLabel = `Day ${rowNumber - 1}`;
    }

    const occupancyRate = occColIdx !== null ? Number(getCellValue(occColIdx)) || 0 : 0;
    const arrivals = arrivalColIdx !== null ? Number(getCellValue(arrivalColIdx)) || 0 : 0;
    const departures = departureColIdx !== null ? Number(getCellValue(departureColIdx)) || 0 : 0;
    const roomNights = roomColIdx !== null ? Number(getCellValue(roomColIdx)) || 0 : 0;
    const totalRooms = totalColIdx !== null ? Number(getCellValue(totalColIdx)) || 200 : 200;

    let events: string[] = [];
    if (eventColIdx !== null) {
      const ev = String(getCellValue(eventColIdx) || "").trim();
      if (ev) events = ev.split(/[,;]/).map((e) => e.trim()).filter(Boolean);
    }

    days.push({ date: dateStr, dayLabel, occupancyRate, arrivals, departures, roomNights, totalRooms, events });
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

/** Generate a sample Excel file for download */
export async function generateSampleExcel(): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Weekly Forecast");

  ws.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Occupancy %", key: "occ", width: 14 },
    { header: "Arrival", key: "arrival", width: 10 },
    { header: "Departure", key: "departure", width: 12 },
    { header: "Room Nights", key: "rooms", width: 14 },
    { header: "Total Rooms", key: "total", width: 14 },
    { header: "Events", key: "events", width: 30 },
  ];

  const data = [
    { date: "2026-03-09", occ: 72, arrival: 32, departure: 45, rooms: 144, total: 200, events: "" },
    { date: "2026-03-10", occ: 78, arrival: 33, departure: 65, rooms: 156, total: 200, events: "Corporate Seminar" },
    { date: "2026-03-11", occ: 85, arrival: 23, departure: 23, rooms: 170, total: 200, events: "Wedding Reception" },
    { date: "2026-03-12", occ: 90, arrival: 11, departure: 56, rooms: 180, total: 200, events: "Wedding Reception, Board Dinner" },
    { date: "2026-03-13", occ: 95, arrival: 55, departure: 32, rooms: 190, total: 200, events: "Conference Day 1" },
    { date: "2026-03-14", occ: 98, arrival: 22, departure: 55, rooms: 196, total: 200, events: "Conference Day 2, Gala Night" },
    { date: "2026-03-15", occ: 82, arrival: 11, departure: 77, rooms: 164, total: 200, events: "" },
  ];

  data.forEach((row) => ws.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
