import { useMemo } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useShiftTypes } from "@/hooks/useShiftTypes";

interface RosterShiftInput {
  shift_type_id?: string | null;
  custom_start_time?: string | null;
  department: string;
  shift: string;
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

const isHkDept = (d: string) => {
  const l = d.toLowerCase();
  return l.includes("housekeeping") || l === "hk";
};

const isFoDept = (d: string) => {
  const l = d.toLowerCase();
  return l.includes("front") || l === "fo" || l.includes("reception") || l.includes("resepsiyon");
};

const isFnbDept = (d: string, fnbDepts: string[]) =>
  fnbDepts.some((fd) => fd.toLowerCase() === d.toLowerCase());

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

    const counts: Record<"sabah" | "aksam" | "gece", { hk: number; fo: number; fnb: number }> = {
      sabah: { hk: 0, fo: 0, fnb: 0 },
      aksam: { hk: 0, fo: 0, fnb: 0 },
      gece: { hk: 0, fo: 0, fnb: 0 },
    };

    for (const a of assignments) {
      const group = classifyShift(a);
      if (!group) continue;

      if (isHkDept(a.department)) counts[group].hk++;
      else if (isFoDept(a.department)) counts[group].fo++;

      if (isFnbDept(a.department, fnbDepts)) counts[group].fnb++;
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
    // HK: önceki gece satılan oda / HK oda kapasitesi
    const hkIdeal = prevRN > 0 ? Math.ceil(prevRN / hkRoomsPerFte) : 0;
    const hkDetail = prevRN > 0
      ? `${prevRN} oda ÷ ${hkRoomsPerFte} = ${hkIdeal} ideal | Mevcut: ${counts.sabah.hk}`
      : null;

    // HK Supervisor: çıkış / supervisor oranı (Housekeeping departmanı)
    const hkSupIdeal = departures > 0 ? Math.ceil(departures / hkSupervisorRatio) : 0;
    const totalHkIdeal = hkIdeal + hkSupIdeal;
    const hkFullDetail = prevRN > 0 || departures > 0
      ? `${prevRN > 0 ? `${prevRN} oda ÷ ${hkRoomsPerFte} = ${hkIdeal} HK` : ""}${departures > 0 ? `${prevRN > 0 ? " + " : ""}${departures} çıkış ÷ ${hkSupervisorRatio} = ${hkSupIdeal} Sup` : ""} = ${totalHkIdeal} ideal | Mevcut: ${counts.sabah.hk}`
      : null;

    // FO Sabah: çıkış / resepsiyon kapasitesi
    const foSabahIdeal = departures > 0 ? Math.ceil(departures / foArrivalsPerFte) : 0;
    const foSabahDetail = departures > 0
      ? `${departures} çıkış ÷ ${foArrivalsPerFte} = ${foSabahIdeal} ideal | Mevcut: ${counts.sabah.fo}`
      : null;

    // F&B Sabah: kahvaltı
    const breakfastCovers = forecast?.breakfastCovers ?? 0;
    const fnbSabahIdeal = breakfastCovers > 0 ? Math.ceil(breakfastCovers / fbBreakfastPerFte) : 0;
    const fnbSabahDetail = breakfastCovers > 0
      ? `${breakfastCovers} kahvaltı ÷ ${fbBreakfastPerFte} = ${fnbSabahIdeal} ideal | Mevcut: ${counts.sabah.fnb}`
      : null;

    const sabahLines: DeptLine[] = [];
    if (totalHkIdeal > 0 || counts.sabah.hk > 0) {
      sabahLines.push({ label: "HK", actual: counts.sabah.hk, ideal: totalHkIdeal, workload: calcWl(totalHkIdeal, counts.sabah.hk), detail: hkFullDetail });
    }
    if (foSabahIdeal > 0 || counts.sabah.fo > 0) {
      sabahLines.push({ label: "FO", actual: counts.sabah.fo, ideal: foSabahIdeal, workload: calcWl(foSabahIdeal, counts.sabah.fo), detail: foSabahDetail });
    }
    if (fnbSabahIdeal > 0 || counts.sabah.fnb > 0) {
      sabahLines.push({ label: "F&B", actual: counts.sabah.fnb, ideal: fnbSabahIdeal, workload: calcWl(fnbSabahIdeal, counts.sabah.fnb), detail: fnbSabahDetail });
    }

    // ── AKŞAM ──
    // FO Akşam: giriş / resepsiyon kapasitesi
    const foAksamIdeal = arrivals > 0 ? Math.ceil(arrivals / foArrivalsPerFte) : 0;
    const foAksamDetail = arrivals > 0
      ? `${arrivals} giriş ÷ ${foArrivalsPerFte} = ${foAksamIdeal} ideal | Mevcut: ${counts.aksam.fo}`
      : counts.aksam.fo > 0
      ? `Giriş verisi yok | Mevcut: ${counts.aksam.fo}`
      : null;

    const lunchCovers = forecast?.lunchCovers ?? 0;
    const dinnerCovers = forecast?.dinnerCovers ?? 0;
    const lunchFte = lunchCovers > 0 ? Math.ceil(lunchCovers / fbLunchPerFte) : 0;
    const dinnerFte = dinnerCovers > 0 ? Math.ceil(dinnerCovers / fbDinnerPerFte) : 0;
    const fnbAksamIdeal = lunchFte + dinnerFte;

    const aksamFnbParts: string[] = [];
    if (lunchCovers > 0) aksamFnbParts.push(`${lunchCovers} öğle ÷ ${fbLunchPerFte} = ${lunchFte}`);
    if (dinnerCovers > 0) aksamFnbParts.push(`${dinnerCovers} akşam ÷ ${fbDinnerPerFte} = ${dinnerFte}`);
    const fnbAksamDetail = aksamFnbParts.length > 0
      ? `${aksamFnbParts.join(" + ")} = ${fnbAksamIdeal} ideal | Mevcut: ${counts.aksam.fnb}`
      : null;

    const aksamLines: DeptLine[] = [];
    if (foAksamIdeal > 0 || counts.aksam.fo > 0) {
      aksamLines.push({ label: "FO", actual: counts.aksam.fo, ideal: foAksamIdeal, workload: calcWl(foAksamIdeal, counts.aksam.fo), detail: foAksamDetail });
    }
    if (fnbAksamIdeal > 0 || counts.aksam.fnb > 0) {
      aksamLines.push({ label: "F&B", actual: counts.aksam.fnb, ideal: fnbAksamIdeal, workload: calcWl(fnbAksamIdeal, counts.aksam.fnb), detail: fnbAksamDetail });
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
