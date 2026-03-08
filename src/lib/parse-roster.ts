import * as XLSX from "xlsx";
import { ShiftAssignment, ShiftType, Department } from "./types";

const VALID_SHIFTS: ShiftType[] = ["Morning", "Afternoon", "Night", "Day Off", "Break"];
const VALID_DEPARTMENTS: Department[] = ["Front Desk", "Housekeeping", "F&B", "Kitchen", "Maintenance", "Security", "Spa", "Management"];

// Turkish shift name mapping
const SHIFT_TR_MAP: Record<string, ShiftType> = {
  sabah: "Morning",
  "öğleden sonra": "Afternoon",
  akşam: "Afternoon",
  aksam: "Afternoon",
  gece: "Night",
  off: "Day Off",
  izin: "Day Off",
  izinli: "Day Off",
  ara: "Break",
};

// English shift name mapping
const SHIFT_EN_MAP: Record<string, ShiftType> = {
  morning: "Morning",
  afternoon: "Afternoon",
  night: "Night",
  "day off": "Day Off",
  dayoff: "Day Off",
  off: "Day Off",
  break: "Break",
};

function normalizeShift(val: string): ShiftType | null {
  const lower = val.toLowerCase().trim();
  // Try direct match first
  const directMatch = VALID_SHIFTS.find((s) => s.toLowerCase() === lower);
  if (directMatch) return directMatch;
  // Try Turkish mapping
  if (SHIFT_TR_MAP[lower]) return SHIFT_TR_MAP[lower];
  // Try English mapping
  if (SHIFT_EN_MAP[lower]) return SHIFT_EN_MAP[lower];
  return null;
}

function normalizeDepartment(val: string): Department | null {
  const lower = val.toLowerCase().trim();
  const match = VALID_DEPARTMENTS.find((d) => d.toLowerCase() === lower);
  if (match) return match;
  // Fuzzy matching
  if (lower.includes("f&b") || lower.includes("fnb") || lower.includes("food") || lower.includes("waitress") || lower.includes("waiter") || lower.includes("garson")) return "F&B";
  if (lower.includes("front") || lower.includes("resepsiyon") || lower.includes("reception")) return "Front Desk";
  if (lower.includes("house") || lower.includes("maid") || lower.includes("kat hizmet")) return "Housekeeping";
  if (lower.includes("kitchen") || lower.includes("mutfak") || lower.includes("chef") || lower.includes("cook")) return "Kitchen";
  if (lower.includes("maint") || lower.includes("teknik") || lower.includes("bakım")) return "Maintenance";
  if (lower.includes("secur") || lower.includes("güvenlik")) return "Security";
  if (lower.includes("spa")) return "Spa";
  if (lower.includes("manag") || lower.includes("yönet") || lower.includes("müdür")) return "Management";
  return null;
}

function findCol(row: Record<string, unknown>, patterns: string[]): string | null {
  const keys = Object.keys(row);
  for (const pattern of patterns) {
    const found = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(pattern));
    if (found) return found;
  }
  return null;
}

/** Check if a column header looks like a date */
function isDateColumn(key: string): boolean {
  // Match patterns like "3/8/26", "2026-03-08", "08/03/2026", "Mar 8", etc.
  const trimmed = key.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
  if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(trimmed)) return true;
  // Try parsing as date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) return true;
  return false;
}

/** Parse a column header as a date string (YYYY-MM-DD) */
function parseDateHeader(key: string): string | null {
  const trimmed = key.trim();
  
  // Try direct ISO parse
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime()) && direct.getFullYear() > 2000) {
    return direct.toISOString().split("T")[0];
  }
  
  // Handle M/D/YY or M/D/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    let [, m, d, y] = slashMatch;
    let year = parseInt(y);
    if (year < 100) year += 2000;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Handle D.M.YYYY
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotMatch) {
    let [, d, m, y] = dotMatch;
    let year = parseInt(y);
    if (year < 100) year += 2000;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

export interface ParsedRoster {
  assignments: ShiftAssignment[];
  staffNames: string[];
  skipped: number;
}

/** Detect if the spreadsheet uses horizontal (weekly) format: Staff Name | Dept | date1 | date2 | ... */
function isHorizontalFormat(keys: string[]): boolean {
  const dateColumns = keys.filter((k) => isDateColumn(k));
  return dateColumns.length >= 2;
}

/** Parse horizontal weekly format */
function parseHorizontalRoster(rows: Record<string, unknown>[]): ParsedRoster {
  if (rows.length === 0) throw new Error("No data found in the spreadsheet");

  const keys = Object.keys(rows[0]);
  const nameCol = findCol(rows[0], ["staffname", "name", "staff", "employee", "personel"]);
  const deptCol = findCol(rows[0], ["department", "dept", "departman", "bölüm", "bolum"]);

  if (!nameCol) throw new Error("Missing 'Staff Name' column");

  // Find all date columns
  const dateColumns: { key: string; date: string }[] = [];
  for (const key of keys) {
    if (key === nameCol || key === deptCol) continue;
    const dateStr = parseDateHeader(key);
    if (dateStr) {
      dateColumns.push({ key, date: dateStr });
    }
  }

  if (dateColumns.length === 0) throw new Error("No date columns found in the spreadsheet");

  const assignments: ShiftAssignment[] = [];
  const staffSet = new Set<string>();
  let skipped = 0;
  let rowIdx = 0;

  for (const row of rows) {
    const name = String(row[nameCol] || "").trim();
    if (!name) { skipped++; continue; }

    const dept = deptCol ? normalizeDepartment(String(row[deptCol] || "")) : null;
    staffSet.add(name);

    for (const { key, date } of dateColumns) {
      const cellValue = String(row[key] || "").trim();
      if (!cellValue) continue;

      const shift = normalizeShift(cellValue);
      if (!shift) { skipped++; continue; }

      assignments.push({
        id: `upload-${rowIdx}-${date}`,
        staffId: name,
        date,
        shift,
        department: dept || "Front Desk",
      });
    }
    rowIdx++;
  }

  return { assignments, staffNames: Array.from(staffSet), skipped };
}

/** Parse vertical format: Staff Name | Date | Shift | Department */
function parseVerticalRoster(rows: Record<string, unknown>[]): ParsedRoster {
  if (rows.length === 0) throw new Error("No data found in the spreadsheet");

  const sample = rows[0];
  const nameCol = findCol(sample, ["staffname", "name", "staff", "employee", "personel"]);
  const dateCol = findCol(sample, ["date", "day", "tarih"]);
  const shiftCol = findCol(sample, ["shift", "shifttype", "type", "vardiya"]);
  const deptCol = findCol(sample, ["department", "dept", "departman"]);

  if (!nameCol) throw new Error("Missing 'Staff Name' column");
  if (!dateCol) throw new Error("Missing 'Date' column");
  if (!shiftCol) throw new Error("Missing 'Shift' column");

  const assignments: ShiftAssignment[] = [];
  const staffSet = new Set<string>();
  let skipped = 0;

  rows.forEach((row, i) => {
    const name = String(row[nameCol] || "").trim();
    const shiftRaw = String(row[shiftCol] || "").trim();
    const shift = normalizeShift(shiftRaw);
    const dept = deptCol ? normalizeDepartment(String(row[deptCol] || "")) : null;

    let dateStr = "";
    if (dateCol) {
      const val = row[dateCol];
      if (val instanceof Date) {
        dateStr = val.toISOString().split("T")[0];
      } else if (typeof val === "number") {
        const d = XLSX.SSF.parse_date_code(val);
        dateStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      } else {
        const parsed = new Date(String(val));
        if (!isNaN(parsed.getTime())) {
          dateStr = parsed.toISOString().split("T")[0];
        }
      }
    }

    if (!name || !shift || !dateStr) {
      skipped++;
      return;
    }

    staffSet.add(name);

    assignments.push({
      id: `upload-${i}`,
      staffId: name,
      date: dateStr,
      shift,
      department: dept || "Front Desk",
    });
  });

  return { assignments, staffNames: Array.from(staffSet), skipped };
}

/** Auto-detect format and parse */
export function parseExcelRoster(data: ArrayBuffer): ParsedRoster {
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) throw new Error("No data found in the spreadsheet");

  const keys = Object.keys(rows[0]);

  if (isHorizontalFormat(keys)) {
    return parseHorizontalRoster(rows);
  }
  return parseVerticalRoster(rows);
}

/** Generate a sample horizontal weekly roster template with dropdown validation */
export function generateSampleRoster(): ArrayBuffer {
  // Generate dates for current week (Mon-Sun)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }

  const formatDateHeader = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;

  // Turkish shift names for the template
  const shiftNamesTR = ["Sabah", "Akşam", "Gece", "Off", "Ara"];

  // Build header row
  const headers = ["Staff Name", "Department", ...dates.map(formatDateHeader)];

  // Sample data rows
  const sampleData = [
    { name: "Maria Santos", dept: "Front Desk", shifts: ["Sabah", "Sabah", "Sabah", "Sabah", "Off", "Gece", "Gece"] },
    { name: "James Chen", dept: "Housekeeping", shifts: ["Gece", "Gece", "Gece", "Gece", "Gece", "Off", "Akşam"] },
    { name: "Sofia Rodriguez", dept: "F&B", shifts: ["Off", "Akşam", "Akşam", "Akşam", "Akşam", "Akşam", "Akşam"] },
    { name: "David Kim", dept: "Kitchen", shifts: ["Akşam", "Off", "Ara", "Ara", "Sabah", "Sabah", "Sabah"] },
    { name: "Ahmed Hassan", dept: "Security", shifts: ["Gece", "Gece", "Off", "Sabah", "Sabah", "Sabah", "Off"] },
  ];

  // Build worksheet data
  const wsData: (string | number)[][] = [headers];
  for (const row of sampleData) {
    wsData.push([row.name, row.dept, ...row.shifts]);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Data validation for shift cells (C2:I1000) — columns C through I are date columns
  const lastDateCol = String.fromCharCode(65 + 2 + dates.length - 1); // C + number of dates
  const shiftOptions = shiftNamesTR.join(",");
  const deptOptions = VALID_DEPARTMENTS.join(",");

  if (!ws["!dataValidation"]) ws["!dataValidation"] = [];

  // Shift dropdown for all date cells
  (ws["!dataValidation"] as any[]).push({
    type: "list",
    operator: "equal",
    allowBlank: true,
    showDropDown: true,
    formula1: `"${shiftOptions}"`,
    sqref: `C2:${lastDateCol}1000`,
  });

  // Department dropdown (column B)
  (ws["!dataValidation"] as any[]).push({
    type: "list",
    operator: "equal",
    allowBlank: true,
    showDropDown: true,
    formula1: `"${deptOptions}"`,
    sqref: "B2:B1000",
  });

  // Set column widths
  ws["!cols"] = [
    { wch: 20 }, // Staff Name
    { wch: 16 }, // Department
    ...dates.map(() => ({ wch: 10 })), // Date columns
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Roster");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
