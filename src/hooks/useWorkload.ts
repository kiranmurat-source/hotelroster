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
  breakfastCovers: number;
  lunchCovers: number;
  dinnerCovers: number;
}

interface ShiftGroupStats {
  roomsActual: number;
  fnbActual: number;
  roomsWorkload: number | null;
  fnbWorkload: number | null;
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
      if (actual === 0) return null;
      return Math.round((ideal / actual) * 100);
    };

    // SABAH: HK cleans previous night's rooms
    const prevRN = forecast?.prevDayRoomNights ?? 0;
    const hkAttendant = prevRN > 0 ? Math.ceil(prevRN / hkRoomsPerFte) : 0;
    const hkSupervisor = prevRN > 0 ? Math.ceil(prevRN / hkSupervisorRatio) : 0;
    const sabahRoomsIdeal = hkAttendant + hkSupervisor;

    const breakfastCovers = forecast?.breakfastCovers ?? 0;
    const sabahFnbIdeal = breakfastCovers > 0
      ? Math.ceil(breakfastCovers / fbBreakfastPerFte)
      : 0;

    // AKŞAM: FO handles arrivals
    const aksamRoomsIdeal = forecast?.arrivals
      ? Math.ceil(forecast.arrivals / foArrivalsPerFte)
      : 0;

    const lunchCovers = forecast?.lunchCovers ?? 0;
    const dinnerCovers = forecast?.dinnerCovers ?? 0;
    const lunchFte = lunchCovers > 0 ? Math.ceil(lunchCovers / fbLunchPerFte) : 0;
    const dinnerFte = dinnerCovers > 0 ? Math.ceil(dinnerCovers / fbDinnerPerFte) : 0;
    const aksamFnbIdeal = lunchFte + dinnerFte;

    const result: WorkloadResult = {
      sabah: {
        ...groups.sabah,
        roomsWorkload: calcWorkload(sabahRoomsIdeal, groups.sabah.roomsActual),
        fnbWorkload: calcWorkload(sabahFnbIdeal, groups.sabah.fnbActual),
      },
      aksam: {
        ...groups.aksam,
        roomsWorkload: calcWorkload(aksamRoomsIdeal, groups.aksam.roomsActual),
        fnbWorkload: calcWorkload(aksamFnbIdeal, groups.aksam.fnbActual),
      },
      gece: {
        ...groups.gece,
        roomsWorkload: null,
        fnbWorkload: null,
      },
    };

    return result;
  }, [assignments, forecast, getById, roomsDepts, fnbDepts,
      hkRoomsPerFte, hkSupervisorRatio, fbBreakfastPerFte,
      fbLunchPerFte, fbDinnerPerFte, foArrivalsPerFte]);
};
