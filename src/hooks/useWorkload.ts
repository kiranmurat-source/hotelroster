import { useMemo } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useShiftTypes } from "@/hooks/useShiftTypes";
import { useHotelCalculations } from "@/hooks/useHotelCalculations";

interface RosterShiftInput {
  shift_type_id?: string | null;
  custom_start_time?: string | null;
  department: string;
  shift: string;
}

interface ForecastDayInput {
  roomNights: number;
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
  const { calcIdealRoomsFTE, calcIdealFnbFTE, calcBreakfast, calcGuests } = useHotelCalculations();

  const roomsDepts = settings?.rooms_departments ?? ["Housekeeping", "Front Office"];
  const fnbDepts = settings?.fnb_departments ?? ["F&B", "Kitchen"];

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

      if (code === "A") return "sabah";
      if (code === "B") return "aksam";
      if (code === "C") return "gece";
      if (code === "OFF") return null;

      if (code.startsWith("MID")) {
        const start = a.custom_start_time;
        if (!start) return "sabah"; // default MID to morning
        const hour = parseInt(start.split(":")[0], 10);
        if (hour < 14) return "sabah";
        if (hour < 20) return "aksam";
        return "gece";
      }

      return "sabah"; // fallback
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
      return Math.min(Math.round((ideal / actual) * 100), 150);
    };

    const roomNights = forecast?.roomNights ?? 0;
    const breakfastCovers = forecast?.breakfastCovers ?? 0;
    const lunchCovers = forecast?.lunchCovers ?? 0;
    const dinnerCovers = forecast?.dinnerCovers ?? 0;

    // SABAH: HK + breakfast
    const sabahRoomsIdeal = calcIdealRoomsFTE(roomNights);
    const sabahFnbIdeal = calcIdealFnbFTE(breakfastCovers, 0, 0);

    // AKŞAM: no HK, lunch + dinner
    const aksamFnbIdeal = calcIdealFnbFTE(0, lunchCovers, dinnerCovers);

    // GECE: no workload calc
    const result: WorkloadResult = {
      sabah: {
        ...groups.sabah,
        roomsWorkload: calcWorkload(sabahRoomsIdeal, groups.sabah.roomsActual),
        fnbWorkload: calcWorkload(sabahFnbIdeal, groups.sabah.fnbActual),
      },
      aksam: {
        ...groups.aksam,
        roomsWorkload: null, // HK doesn't work afternoon
        fnbWorkload: calcWorkload(aksamFnbIdeal, groups.aksam.fnbActual),
      },
      gece: {
        ...groups.gece,
        roomsWorkload: null, // night is FO only
        fnbWorkload: null, // no F&B at night
      },
    };

    return result;
  }, [assignments, forecast, getById, roomsDepts, fnbDepts, calcIdealRoomsFTE, calcIdealFnbFTE, calcBreakfast, calcGuests]);
};
