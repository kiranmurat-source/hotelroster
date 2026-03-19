import ExcelJS from "exceljs";
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
  const directMatch = VALID_SHIFTS.find((s) => s.toLowerCase() === lower);
  if (directMatch) return directMatch;
  if (SHIFT_TR_MAP[lower]) return SHIFT_TR_MAP[lower];
  if (SHIFT_EN_MAP[lower]) return SHIFT_EN_MAP[lower];
  return null;
}

function normalizeDepartment(val: string): Department | null {
  const lower = val.toLowerCase().trim();
  const match = VALID_DEPARTMENTS.find((d) => d.toLowerCase() === lower);
  if (match) return match;

  if (lower.includes("f&b") || lower.includes("fnb") || lower.includes("food") || lower.includes("waitress") || lower.includes("waiter") || lower.includes("garson") || lower.includes("servis") || lower.includes("restoran") || lower.includes("restaurant") || lower.includes("bar") || lower.includes("banket") || lower.includes("banquet") || lower.includes("yiyecek") || lower.includes("içecek") || lower.includes("icecek")) return "F&B";
  if (lower.includes("front") || lower.includes("resepsiyon") || lower.includes("reception") || lower.includes("önbüro") || lower.includes("on buro") || lower.includes("ön büro") || lower.includes("concierge") || lower.includes("konsiyerj") || lower.includes("bellboy") || lower.includes("bell")) return "Front Desk";
  if (lower.includes("house") || lower.includes("maid") || lower.includes("kat hizmet") || lower.includes("oda temizlik") || lower.includes("temizlik") || lower.includes("housekeeper") || lower.includes("laundry") || lower.includes("çamaşır") || lower.includes("camasir") || lower.includes("kat") || lower.includes("gobernes") || lower.includes("linen")) return "Housekeeping";
  if (lower.includes("kitchen") || lower.includes("mutfak") || lower.includes("chef") || lower.includes("cook") || lower.includes("aşçı") || lower.includes("asci") || lower.includes("pastane") || lower.includes("pastry") || lower.includes("bulaşık") || lower.includes("bulasik") || lower.includes("steward")) return "Kitchen";
  if (lower.includes("maint") || lower.includes("teknik") || lower.includes("bakım") || lower.includes("bakim") || lower.includes("tesisa") || lower.includes("tesisat") || lower.includes("elektrik") || lower.includes("engineer") || lower.includes("boyacı") || lower.includes("boyaci")) return "Maintenance";
  if (lower.includes("secur") || lower.includes("güvenlik") || lower.includes("guvenlik")) return "Security";
  if (lower.includes("spa") || lower.includes("hamam") || lower.includes("sauna") || lower.includes("masaj") || lower.includes("massage") || lower.includes("wellness") || lower.includes("fitness") || lower.includes("havuz") || lower.includes("pool")) return "Spa";
  if (lower.includes("manag") || lower.includes("yönet") || lower.includes("yonet") || lower.includes("müdür") || lower.includes("mudur") || lower.includes("director") || lower.includes("genel") || lower.includes("idari") || lower.includes("insan kaynakları") || lower.includes("ik") || lower.includes("muhasebe") || lower.includes("accounting") || lower.includes("satış") || lower.includes("sales") || lower.includes("pazarlama") || lower.includes("marketing")) return "Management";

  return null;
}

/** Check if a column header looks like a date */
function isDateColumn(key: string): boolean {
  const trimmed = key.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
  if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(trimmed)) return true;
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) return true;
  return false;
}

/** Parse a column header as a date string (YYYY-MM-DD) */
function parseDateHeader(key: string): string | null {
  const trimmed = key.trim();

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    let year = parseInt(y);
    if (year < 100) year += 2000;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    let year = parseInt(y);
    if (year < 100) year += 2000;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  const direct = new Date(trimmed + "T00:00:00");
  if (!isNaN(direct.getTime()) && direct.getFullYear() > 2000) {
    const y = direct.getFullYear();
    const m = String(direct.getMonth() + 1).padStart(2, "0");
    const d = String(direct.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

export interface ParsedRoster {
  assignments: ShiftAssignment[];
  staffNames: string[];
  skipped: number;
}

/** Convert ExcelJS worksheet to array of row objects (like sheet_to_json) */
function sheetToJson(sheet: ExcelJS.Worksheet): Record<string, unknown>[] {
  const headers: string[] = [];
  const headerRow = sheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const val = cell.value;
    if (val instanceof Date) {
      // Format date headers the same way xlsx did
      const m = val.getMonth() + 1;
      const d = val.getDate();
      const y = String(val.getFullYear()).slice(2);
      headers[colNumber] = `${m}/${d}/${y}`;
    } else {
      headers[colNumber] = String(val ?? "");
    }
  });

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    let hasValue = false;
    headerRow.eachCell({ includeEmpty: true }, (_cell, colNumber) => {
      const key = headers[colNumber];
      if (!key) return;
      const cellVal = row.getCell(colNumber).value;
      obj[key] = cellVal ?? "";
      if (cellVal !== null && cellVal !== undefined && cellVal !== "") hasValue = true;
    });
    if (hasValue) rows.push(obj);
  });

  return rows;
}

function findCol(row: Record<string, unknown>, patterns: string[]): string | null {
  const keys = Object.keys(row);
  for (const pattern of patterns) {
    const found = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(pattern));
    if (found) return found;
  }
  return null;
}

/** Detect if the spreadsheet uses horizontal (weekly) format */
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
  const posCol = findCol(rows[0], ["position", "görev", "gorev", "role", "unvan", "pozisyon"]);

  if (!nameCol) throw new Error("Missing 'Staff Name' column");

  const dateColumns: { key: string; date: string }[] = [];
  for (const key of keys) {
    if (key === nameCol || key === deptCol || key === posCol) continue;
    const dateStr = parseDateHeader(key);
    if (dateStr) dateColumns.push({ key, date: dateStr });
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
    const position = posCol ? String(row[posCol] || "").trim() : undefined;
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
        position: position || undefined,
      });
    }
    rowIdx++;
  }

  return { assignments, staffNames: Array.from(staffSet), skipped };
}

/** Parse vertical format */
function parseVerticalRoster(rows: Record<string, unknown>[]): ParsedRoster {
  if (rows.length === 0) throw new Error("No data found in the spreadsheet");

  const sample = rows[0];
  const nameCol = findCol(sample, ["staffname", "name", "staff", "employee", "personel"]);
  const dateCol = findCol(sample, ["date", "day", "tarih"]);
  const shiftCol = findCol(sample, ["shift", "shifttype", "type", "vardiya"]);
  const deptCol = findCol(sample, ["department", "dept", "departman"]);
  const posCol = findCol(sample, ["position", "görev", "gorev", "role", "unvan", "pozisyon"]);

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
    const position = posCol ? String(row[posCol] || "").trim() : undefined;

    let dateStr = "";
    if (dateCol) {
      const val = row[dateCol];
      if (val instanceof Date) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, "0");
        const dd = String(val.getDate()).padStart(2, "0");
        dateStr = `${y}-${m}-${dd}`;
      } else if (typeof val === "number") {
        const excelEpoch = new Date(1899, 11, 30);
        const d = new Date(excelEpoch.getTime() + val * 86400000);
        dateStr = d.toISOString().split("T")[0];
      } else {
        const parsed = new Date(String(val) + "T00:00:00");
        if (!isNaN(parsed.getTime())) {
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, "0");
          const dd = String(parsed.getDate()).padStart(2, "0");
          dateStr = `${y}-${m}-${dd}`;
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
      position: position || undefined,
    });
  });

  return { assignments, staffNames: Array.from(staffSet), skipped };
}

/** Auto-detect format and parse */
export async function parseExcelRoster(data: ArrayBuffer): Promise<ParsedRoster> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount === 0) throw new Error("No data found in the spreadsheet");

  const rows = sheetToJson(sheet);
  if (rows.length === 0) throw new Error("No data found in the spreadsheet");

  const keys = Object.keys(rows[0]);

  if (isHorizontalFormat(keys)) {
    return parseHorizontalRoster(rows);
  }
  return parseVerticalRoster(rows);
}

/** Generate a sample horizontal weekly roster template */
export async function generateSampleRoster(): Promise<ArrayBuffer> {
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

  const shiftNamesTR = ["Sabah", "Akşam", "Gece", "Off", "Ara"];

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Roster");

  // Set columns
  ws.columns = [
    { header: "Staff Name", key: "name", width: 20 },
    { header: "Department", key: "dept", width: 16 },
    { header: "Görev", key: "position", width: 16 },
    ...dates.map((d) => ({ header: formatDateHeader(d), key: formatDateHeader(d), width: 10 })),
  ];

  const sampleData = [
    { name: "Maria Santos", dept: "Front Desk", shifts: ["Sabah", "Sabah", "Sabah", "Sabah", "Off", "Gece", "Gece"] },
    { name: "James Chen", dept: "Housekeeping", shifts: ["Gece", "Gece", "Gece", "Gece", "Gece", "Off", "Akşam"] },
    { name: "Sofia Rodriguez", dept: "F&B", shifts: ["Off", "Akşam", "Akşam", "Akşam", "Akşam", "Akşam", "Akşam"] },
    { name: "David Kim", dept: "Kitchen", shifts: ["Akşam", "Off", "Ara", "Ara", "Sabah", "Sabah", "Sabah"] },
    { name: "Ahmed Hassan", dept: "Security", shifts: ["Gece", "Gece", "Off", "Sabah", "Sabah", "Sabah", "Off"] },
  ];

  for (const row of sampleData) {
    const rowData: Record<string, string> = { name: row.name, dept: row.dept };
    dates.forEach((d, i) => {
      rowData[formatDateHeader(d)] = row.shifts[i];
    });
    ws.addRow(rowData);
  }

  // Add data validation for shift cells
  const shiftOptions = `"${shiftNamesTR.join(",")}"`;
  const deptOptions = `"${VALID_DEPARTMENTS.join(",")}"`;

  for (let r = 2; r <= 1000; r++) {
    // Department validation (column B)
    ws.getCell(r, 2).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [deptOptions],
    };
    // Shift validation for each date column (columns C onwards)
    for (let c = 3; c <= 2 + dates.length; c++) {
      ws.getCell(r, c).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [shiftOptions],
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
