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

interface ShiftGroupStats {
  roomsActual: number;
  fnbActual: number;
  roomsWorkload: number | null;
  fnbWorkload: number | null;
  roomsDetail: string | null;
  fnbDetail: string | null;
}

export interface WorkloadResult {
  sabah: ShiftGroupStats;
  aksam: ShiftGroupStats;
  gece: ShiftGroupStats;
}

type ShiftGroup = "sabah" | "aksam" | "gece" | null;

export const useWorkload = (
  assignments: RosterShiftInput[],
  forecast: ForecastDayInput | null
) => {
  const { settings } = useSettings();
  const { getById } = useShiftTypes();

  const roomsDepts = settings?.rooms_departments ?? ["Housekeeping", "Front Office", "Front Desk"];
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

    const groups: Record<"sabah" | "aksam" | "gece", { roomsActual: number; fnbActual: number }> = {
      sabah: { roomsActual: 0, fnbActual: 0 },
      aksam: { roomsActual: 0, fnbActual: 0 },
      gece: { roomsActual: 0, fnbActual: 0 },
    };

    for (const a of assignments) {
      const group = classifyShift(a);
      if (!group) continue;

      const deptLower = a.department.toLowerCase();
      const isRooms = roomsDepts.some((d) => d.toLowerCase() === deptLower);
      const isFnb = fnbDepts.some((d) => d.toLowerCase() === deptLower);

      if (isRooms) groups[group].roomsActual++;
      if (isFnb) groups[group].fnbActual++;
    }

    const calcWorkload = (ideal: number, actual: number): number | null => {
      if (actual === 0 && ideal === 0) return null;
      if (actual === 0) return null;
      return Math.round((ideal / actual) * 100);
    };

    const prevRN = forecast?.prevDayRoomNights ?? 0;
    const departures = forecast?.departures ?? 0;
    const arrivals = forecast?.arrivals ?? 0;

    // SABAH ideal = (önceki gece satılan oda / HK oda kapasitesi)
    //             + (çıkış / supervisor oranı)
    //             + (çıkış / resepsiyon kapasitesi)
    const hkAttendant = prevRN > 0 ? Math.ceil(prevRN / hkRoomsPerFte) : 0;
    const hkSupervisor = departures > 0 ? Math.ceil(departures / hkSupervisorRatio) : 0;
    const foCheckout = departures > 0 ? Math.ceil(departures / foArrivalsPerFte) : 0;
    const sabahRoomsIdeal = hkAttendant + hkSupervisor + foCheckout;

    const sabahDetailParts: string[] = [];
    if (prevRN > 0) sabahDetailParts.push(`${prevRN} oda ÷ ${hkRoomsPerFte} = ${hkAttendant} HK`);
    if (departures > 0) sabahDetailParts.push(`${departures} çıkış ÷ ${hkSupervisorRatio} = ${hkSupervisor} Sup`);
    if (departures > 0) sabahDetailParts.push(`${departures} çıkış ÷ ${foArrivalsPerFte} = ${foCheckout} FO`);
    const sabahRoomsDetail = sabahDetailParts.length > 0
      ? `${sabahDetailParts.join(" + ")} = ${sabahRoomsIdeal} ideal | Mevcut: ${groups.sabah.roomsActual}`
      : null;

    const breakfastCovers = forecast?.breakfastCovers ?? 0;
    const sabahFnbIdeal = breakfastCovers > 0
      ? Math.ceil(breakfastCovers / fbBreakfastPerFte)
      : 0;
    const sabahFnbDetail = breakfastCovers > 0
      ? `${breakfastCovers} kahvaltı ÷ ${fbBreakfastPerFte} = ${sabahFnbIdeal} ideal | Mevcut: ${groups.sabah.fnbActual}`
      : null;

    // AKŞAM ideal = (giriş / resepsiyon kapasitesi)
    const aksamRoomsIdeal = arrivals > 0
      ? Math.ceil(arrivals / foArrivalsPerFte)
      : 0;

    const aksamRoomsDetail = arrivals > 0
      ? `${arrivals} giriş ÷ ${foArrivalsPerFte} = ${aksamRoomsIdeal} ideal | Mevcut: ${groups.aksam.roomsActual}`
      : groups.aksam.roomsActual > 0
      ? `Giriş verisi yok | Mevcut: ${groups.aksam.roomsActual}`
      : null;

    const aksamRoomsWorkload = groups.aksam.roomsActual > 0
      ? (aksamRoomsIdeal > 0 ? Math.round((aksamRoomsIdeal / groups.aksam.roomsActual) * 100) : 0)
      : null;

    const lunchCovers = forecast?.lunchCovers ?? 0;
    const dinnerCovers = forecast?.dinnerCovers ?? 0;
    const lunchFte = lunchCovers > 0 ? Math.ceil(lunchCovers / fbLunchPerFte) : 0;
    const dinnerFte = dinnerCovers > 0 ? Math.ceil(dinnerCovers / fbDinnerPerFte) : 0;
    const aksamFnbIdeal = lunchFte + dinnerFte;

    const aksamFnbParts: string[] = [];
    if (lunchCovers > 0) aksamFnbParts.push(`${lunchCovers} öğle ÷ ${fbLunchPerFte} = ${lunchFte}`);
    if (dinnerCovers > 0) aksamFnbParts.push(`${dinnerCovers} akşam ÷ ${fbDinnerPerFte} = ${dinnerFte}`);
    const aksamFnbDetail = aksamFnbParts.length > 0
      ? `${aksamFnbParts.join(" + ")} = ${aksamFnbIdeal} ideal | Mevcut: ${groups.aksam.fnbActual}`
      : null;

    const result: WorkloadResult = {
      sabah: {
        ...groups.sabah,
        roomsWorkload: calcWorkload(sabahRoomsIdeal, groups.sabah.roomsActual),
        fnbWorkload: calcWorkload(sabahFnbIdeal, groups.sabah.fnbActual),
        roomsDetail: sabahRoomsDetail,
        fnbDetail: sabahFnbDetail,
      },
      aksam: {
        ...groups.aksam,
        roomsWorkload: aksamRoomsWorkload,
        fnbWorkload: calcWorkload(aksamFnbIdeal, groups.aksam.fnbActual),
        roomsDetail: aksamRoomsDetail,
        fnbDetail: aksamFnbDetail,
      },
      gece: {
        ...groups.gece,
        roomsWorkload: null,
        fnbWorkload: null,
        roomsDetail: null,
        fnbDetail: null,
      },
    };

    return result;
  }, [assignments, forecast, getById, roomsDepts, fnbDepts,
      hkRoomsPerFte, hkSupervisorRatio, fbBreakfastPerFte,
      fbLunchPerFte, fbDinnerPerFte, foArrivalsPerFte]);
};
