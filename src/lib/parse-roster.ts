import * as XLSX from "xlsx";
import { ShiftAssignment, ShiftType, Department } from "./types";

const VALID_SHIFTS: ShiftType[] = ["Morning", "Afternoon", "Night", "Day Off"];
const VALID_DEPARTMENTS: Department[] = ["Front Desk", "Housekeeping", "F&B", "Kitchen", "Maintenance", "Security", "Spa", "Management"];

function normalizeShift(val: string): ShiftType | null {
  const lower = val.toLowerCase().trim();
  const match = VALID_SHIFTS.find((s) => s.toLowerCase() === lower);
  return match || null;
}

function normalizeDepartment(val: string): Department | null {
  const lower = val.toLowerCase().trim();
  const match = VALID_DEPARTMENTS.find((d) => d.toLowerCase() === lower);
  if (match) return match;
  // Fuzzy: "f&b" / "fnb" / "food"
  if (lower.includes("f&b") || lower.includes("fnb") || lower.includes("food")) return "F&B";
  if (lower.includes("front")) return "Front Desk";
  if (lower.includes("house")) return "Housekeeping";
  if (lower.includes("kitchen")) return "Kitchen";
  if (lower.includes("maint")) return "Maintenance";
  if (lower.includes("secur")) return "Security";
  if (lower.includes("spa")) return "Spa";
  if (lower.includes("manag")) return "Management";
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

export interface ParsedRoster {
  assignments: ShiftAssignment[];
  staffNames: string[];
  skipped: number;
}

export function parseExcelRoster(data: ArrayBuffer): ParsedRoster {
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) throw new Error("No data found in the spreadsheet");

  const sample = rows[0];
  const nameCol = findCol(sample, ["staffname", "name", "staff", "employee"]);
  const dateCol = findCol(sample, ["date", "day"]);
  const shiftCol = findCol(sample, ["shift", "shifttype", "type"]);
  const deptCol = findCol(sample, ["department", "dept"]);

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
      staffId: name, // use name as ID for uploaded data
      date: dateStr,
      shift,
      department: dept || "Front Desk",
    });
  });

  return {
    assignments,
    staffNames: Array.from(staffSet),
    skipped,
  };
}

export function generateSampleRoster(): ArrayBuffer {
  const data = [
    { "Staff Name": "Maria Santos", Date: "2026-03-09", Shift: "Morning", Department: "Front Desk" },
    { "Staff Name": "Maria Santos", Date: "2026-03-10", Shift: "Afternoon", Department: "Front Desk" },
    { "Staff Name": "James Chen", Date: "2026-03-09", Shift: "Afternoon", Department: "Housekeeping" },
    { "Staff Name": "James Chen", Date: "2026-03-10", Shift: "Morning", Department: "Housekeeping" },
    { "Staff Name": "Sofia Rodriguez", Date: "2026-03-09", Shift: "Night", Department: "F&B" },
    { "Staff Name": "Sofia Rodriguez", Date: "2026-03-10", Shift: "Day Off", Department: "F&B" },
    { "Staff Name": "David Kim", Date: "2026-03-09", Shift: "Day Off", Department: "Kitchen" },
    { "Staff Name": "David Kim", Date: "2026-03-10", Shift: "Night", Department: "Kitchen" },
    { "Staff Name": "Ahmed Hassan", Date: "2026-03-09", Shift: "Night", Department: "Security" },
    { "Staff Name": "Ahmed Hassan", Date: "2026-03-10", Shift: "Morning", Department: "Security" },
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  // Add data validation (dropdown lists) for Shift and Department columns
  const shiftOptions = VALID_SHIFTS.join(",");
  const deptOptions = VALID_DEPARTMENTS.join(",");
  const rowCount = data.length;

  // Column C = Shift (index 2), Column D = Department (index 3)
  // Data validation ranges: C2:C{rowCount+1} and D2:D{rowCount+1}
  if (!ws["!dataValidation"]) ws["!dataValidation"] = [];

  // Shift dropdown (column C, rows 2 to 1001 to cover future entries)
  (ws["!dataValidation"] as any[]).push({
    type: "list",
    operator: "equal",
    allowBlank: true,
    showDropDown: true, // note: in xlsx spec, false=show, but xlsx lib uses true
    formula1: `"${shiftOptions}"`,
    sqref: "C2:C1000",
  });

  // Department dropdown (column D, rows 2 to 1001)
  (ws["!dataValidation"] as any[]).push({
    type: "list",
    operator: "equal",
    allowBlank: true,
    showDropDown: true,
    formula1: `"${deptOptions}"`,
    sqref: "D2:D1000",
  });

  // Set column widths for readability
  ws["!cols"] = [
    { wch: 20 }, // Staff Name
    { wch: 12 }, // Date
    { wch: 14 }, // Shift
    { wch: 16 }, // Department
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Roster");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
