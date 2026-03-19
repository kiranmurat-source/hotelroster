import { useMemo } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useShiftTypes } from "@/hooks/useShiftTypes";

interface RosterShiftInput {
  shift_type_id?: string | null;
  custom_start_time?: string | null;
  department: string;
  shift: string;
  position?: string | null;
}

interface ForecastDayInput {
  roomNights: number;
  prevDayRoomNights: number;
  arrivals: number;
  departures: number;
  breakfastCovers: number;
  lunchCovers: number;
  dinnerCovers: number;
}

interface DeptLine {
  label: string;
  actual: number;
  ideal: number;
  workload: number | null;
  detail: string | null;
}

export interface ShiftGroupStats {
  lines: DeptLine[];
}

export interface WorkloadResult {
  sabah: ShiftGroupStats;
  aksam: ShiftGroupStats;
  gece: ShiftGroupStats;
}

type ShiftGroup = "sabah" | "aksam" | "gece" | null;

/** Classify a staff member into HK attendant, HK supervisor, FO, or F&B based on position + department */
type StaffRole = "hk_attendant" | "hk_supervisor" | "fo" | "fnb" | "other";

function classifyRole(dept: string, position: string | null | undefined, fnbDepts: string[]): StaffRole {
  const pos = (position || "").toLowerCase().trim();
  const deptLower = dept.toLowerCase();

  // Position-based classification (highest priority)
  if (pos) {
    // HK Supervisor keywords
    if (pos.includes("supervisor") || pos.includes("amiri") || pos.includes("amir") ||
        pos.includes("gözetmen") || pos.includes("gozetmen") || pos.includes("gobernes") ||
        pos.includes("kat şefi") || pos.includes("kat sefi")) {
      if (isHkDept(deptLower)) return "hk_supervisor";
    }
    // HK Attendant keywords  
    if (pos.includes("oda görevli") || pos.includes("oda gorevli") || pos.includes("maid") ||
        pos.includes("housekeeper") || pos.includes("temizlik") || pos.includes("attendant") ||
        pos.includes("kat hizmet")) {
      return "hk_attendant";
    }
    // FO keywords
    if (pos.includes("resepsiyon") || pos.includes("reception") || pos.includes("concierge") ||
        pos.includes("konsiyerj") || pos.includes("bellboy") || pos.includes("bell") ||
        pos.includes("front") || pos.includes("guest relation")) {
      return "fo";
    }
    // F&B keywords
    if (pos.includes("garson") || pos.includes("waiter") || pos.includes("waitress") ||
        pos.includes("barmen") || pos.includes("bartender") || pos.includes("servis") ||
        pos.includes("host") || pos.includes("sommelier") || pos.includes("captain") ||
        pos.includes("f&b") || pos.includes("steward")) {
      return "fnb";
    }
  }

  // Department-based fallback
  if (isHkDept(deptLower)) return "hk_attendant";
  if (isFoDept(deptLower)) return "fo";
  if (fnbDepts.some((fd) => fd.toLowerCase() === deptLower)) return "fnb";

  return "other";
}

function isHkDept(d: string) {
  return d.includes("housekeeping") || d === "hk" || d.includes("kat hizmet");
}

function isFoDept(d: string) {
  return d.includes("front") || d === "fo" || d.includes("reception") || d.includes("resepsiyon");
}

export const useWorkload = (
  assignments: RosterShiftInput[],
  forecast: ForecastDayInput | null
) => {
  const { settings } = useSettings();
  const { getById } = useShiftTypes();

  const fnbDepts = settings?.fnb_departments ?? ["F&B", "Kitchen"];

  const hkRoomsPerFte = settings?.hk_rooms_per_fte ?? 17;
  const hkSupervisorRatio = settings?.hk_supervisor_ratio ?? 40;
  const fbBreakfastPerFte = settings?.fb_breakfast_covers_per_fte ?? 45;
  const fbLunchPerFte = settings?.fb_lunch_covers_per_fte ?? 35;
  const fbDinnerPerFte = settings?.fb_dinner_covers_per_fte ?? 35;
  const foArrivalsPerFte = settings?.fo_arrivals_per_fte ?? 20;

  return useMemo(() => {
    const classifyShift = (a: RosterShiftInput): ShiftGroup => {
      let code = "";
      if (a.shift_type_id) {
        const st = getById(a.shift_type_id);
        if (st) {
          if (st.is_off) return null;
          code = st.code;
        }
      }
      if (!code) code = a.shift;

      const upper = code.toUpperCase();
      if (upper === "A" || upper === "MORNING") return "sabah";
      if (upper === "B" || upper === "AFTERNOON") return "aksam";
      if (upper === "C" || upper === "NIGHT") return "gece";
      if (upper === "OFF" || upper === "DAY OFF") return null;

      if (code.startsWith("MID")) {
        const start = a.custom_start_time;
        if (!start) return "sabah";
        const hour = parseInt(start.split(":")[0], 10);
        if (hour < 14) return "sabah";
        if (hour < 20) return "aksam";
        return "gece";
      }

      return "sabah";
    };

    const counts: Record<"sabah" | "aksam" | "gece", { hk_attendant: number; hk_supervisor: number; fo: number; fnb: number }> = {
      sabah: { hk_attendant: 0, hk_supervisor: 0, fo: 0, fnb: 0 },
      aksam: { hk_attendant: 0, hk_supervisor: 0, fo: 0, fnb: 0 },
      gece: { hk_attendant: 0, hk_supervisor: 0, fo: 0, fnb: 0 },
    };

    for (const a of assignments) {
      const group = classifyShift(a);
      if (!group) continue;

      const role = classifyRole(a.department, a.position, fnbDepts);
      if (role === "hk_attendant") counts[group].hk_attendant++;
      else if (role === "hk_supervisor") counts[group].hk_supervisor++;
      else if (role === "fo") counts[group].fo++;
      else if (role === "fnb") counts[group].fnb++;
    }

    const calcWl = (ideal: number, actual: number): number | null => {
      if (actual === 0 && ideal === 0) return null;
      if (actual === 0) return null;
      return Math.round((ideal / actual) * 100);
    };

    const prevRN = forecast?.prevDayRoomNights ?? 0;
    const departures = forecast?.departures ?? 0;
    const arrivals = forecast?.arrivals ?? 0;

    // ── SABAH ──
    // HK: önceki gece satılan oda / HK oda kapasitesi (attendant)
    const hkAttIdeal = prevRN > 0 ? Math.ceil(prevRN / hkRoomsPerFte) : 0;
    const hkAttActual = counts.sabah.hk_attendant;
    const hkAttDetail = prevRN > 0
      ? `${prevRN} oda ÷ ${hkRoomsPerFte} = ${hkAttIdeal} ideal | Mevcut: ${hkAttActual}`
      : null;

    // HK Supervisor: çıkış / supervisor oranı
    const hkSupIdeal = departures > 0 ? Math.ceil(departures / hkSupervisorRatio) : 0;
    const hkSupActual = counts.sabah.hk_supervisor;
    const hkSupDetail = departures > 0
      ? `${departures} çıkış ÷ ${hkSupervisorRatio} = ${hkSupIdeal} ideal | Mevcut: ${hkSupActual}`
      : null;

    // FO Sabah: çıkış / resepsiyon kapasitesi
    const foSabahIdeal = departures > 0 ? Math.ceil(departures / foArrivalsPerFte) : 0;
    const foSabahActual = counts.sabah.fo;
    const foSabahDetail = departures > 0
      ? `${departures} çıkış ÷ ${foArrivalsPerFte} = ${foSabahIdeal} ideal | Mevcut: ${foSabahActual}`
      : null;

    // F&B Sabah: kahvaltı
    const breakfastCovers = forecast?.breakfastCovers ?? 0;
    const fnbSabahIdeal = breakfastCovers > 0 ? Math.ceil(breakfastCovers / fbBreakfastPerFte) : 0;
    const fnbSabahActual = counts.sabah.fnb;
    const fnbSabahDetail = breakfastCovers > 0
      ? `${breakfastCovers} kahvaltı ÷ ${fbBreakfastPerFte} = ${fnbSabahIdeal} ideal | Mevcut: ${fnbSabahActual}`
      : null;

    const sabahLines: DeptLine[] = [];
    if (hkAttIdeal > 0 || hkAttActual > 0) {
      sabahLines.push({ label: "HK", actual: hkAttActual, ideal: hkAttIdeal, workload: calcWl(hkAttIdeal, hkAttActual), detail: hkAttDetail });
    }
    if (hkSupIdeal > 0 || hkSupActual > 0) {
      sabahLines.push({ label: "HK Sup", actual: hkSupActual, ideal: hkSupIdeal, workload: calcWl(hkSupIdeal, hkSupActual), detail: hkSupDetail });
    }
    if (foSabahIdeal > 0 || foSabahActual > 0) {
      sabahLines.push({ label: "FO", actual: foSabahActual, ideal: foSabahIdeal, workload: calcWl(foSabahIdeal, foSabahActual), detail: foSabahDetail });
    }
    if (fnbSabahIdeal > 0 || fnbSabahActual > 0) {
      sabahLines.push({ label: "F&B", actual: fnbSabahActual, ideal: fnbSabahIdeal, workload: calcWl(fnbSabahIdeal, fnbSabahActual), detail: fnbSabahDetail });
    }

    // ── AKŞAM ──
    // FO Akşam: giriş / resepsiyon kapasitesi
    const foAksamIdeal = arrivals > 0 ? Math.ceil(arrivals / foArrivalsPerFte) : 0;
    const foAksamActual = counts.aksam.fo;
    const foAksamDetail = arrivals > 0
      ? `${arrivals} giriş ÷ ${foArrivalsPerFte} = ${foAksamIdeal} ideal | Mevcut: ${foAksamActual}`
      : foAksamActual > 0
      ? `Giriş verisi yok | Mevcut: ${foAksamActual}`
      : null;

    const lunchCovers = forecast?.lunchCovers ?? 0;
    const dinnerCovers = forecast?.dinnerCovers ?? 0;
    const lunchFte = lunchCovers > 0 ? Math.ceil(lunchCovers / fbLunchPerFte) : 0;
    const dinnerFte = dinnerCovers > 0 ? Math.ceil(dinnerCovers / fbDinnerPerFte) : 0;
    const fnbAksamIdeal = lunchFte + dinnerFte;
    const fnbAksamActual = counts.aksam.fnb;

    const aksamFnbParts: string[] = [];
    if (lunchCovers > 0) aksamFnbParts.push(`${lunchCovers} öğle ÷ ${fbLunchPerFte} = ${lunchFte}`);
    if (dinnerCovers > 0) aksamFnbParts.push(`${dinnerCovers} akşam ÷ ${fbDinnerPerFte} = ${dinnerFte}`);
    const fnbAksamDetail = aksamFnbParts.length > 0
      ? `${aksamFnbParts.join(" + ")} = ${fnbAksamIdeal} ideal | Mevcut: ${fnbAksamActual}`
      : null;

    const aksamLines: DeptLine[] = [];
    if (foAksamIdeal > 0 || foAksamActual > 0) {
      aksamLines.push({ label: "FO", actual: foAksamActual, ideal: foAksamIdeal, workload: calcWl(foAksamIdeal, foAksamActual), detail: foAksamDetail });
    }
    if (fnbAksamIdeal > 0 || fnbAksamActual > 0) {
      aksamLines.push({ label: "F&B", actual: fnbAksamActual, ideal: fnbAksamIdeal, workload: calcWl(fnbAksamIdeal, fnbAksamActual), detail: fnbAksamDetail });
    }

    const result: WorkloadResult = {
      sabah: { lines: sabahLines },
      aksam: { lines: aksamLines },
      gece: { lines: [] },
    };

    return result;
  }, [assignments, forecast, getById, fnbDepts,
      hkRoomsPerFte, hkSupervisorRatio, fbBreakfastPerFte,
      fbLunchPerFte, fbDinnerPerFte, foArrivalsPerFte]);
};
