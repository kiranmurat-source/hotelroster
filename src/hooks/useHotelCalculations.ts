import { useSettings } from "@/contexts/SettingsContext";

export const useHotelCalculations = () => {
  const { settings, settingsLoading } = useSettings();

  const calcGuests = (roomNights: number): number =>
    Math.round(roomNights * (settings?.guest_per_room ?? 1.8));

  const calcBreakfast = (guests: number): number =>
    Math.ceil(guests * (settings?.breakfast_capture_rate ?? 0.8));

  const calcLunch = (guests: number, excelValue?: number): number =>
    Math.ceil(guests * (settings?.lunch_capture_rate ?? 0)) + (excelValue ?? 0);

  const calcDinner = (guests: number, excelValue?: number): number =>
    Math.ceil(guests * (settings?.dinner_capture_rate ?? 0)) + (excelValue ?? 0);

  const calcOccupancy = (roomNights: number, totalRooms: number): number =>
    totalRooms > 0 ? Math.round((roomNights / totalRooms) * 100) : 0;

  const calcIdealRoomsFTE = (soldRooms: number): number => {
    const hkAttendant = Math.ceil(soldRooms / (settings?.hk_rooms_per_fte ?? 17));
    const hkSupervisor = Math.ceil(soldRooms / (settings?.hk_supervisor_ratio ?? 40));
    return hkAttendant + hkSupervisor;
  };

  const calcIdealFnbFTE = (
    breakfastCovers: number,
    lunchCovers: number,
    dinnerCovers: number
  ): number => {
    const breakfast = Math.ceil(breakfastCovers / (settings?.fb_breakfast_covers_per_fte ?? 45));
    const lunch = lunchCovers > 0
      ? Math.ceil(lunchCovers / (settings?.fb_lunch_covers_per_fte ?? 35))
      : 0;
    const dinner = dinnerCovers > 0
      ? Math.ceil(dinnerCovers / (settings?.fb_dinner_covers_per_fte ?? 35))
      : 0;
    return breakfast + lunch + dinner;
  };

  return {
    settings,
    settingsLoading,
    calcGuests,
    calcBreakfast,
    calcLunch,
    calcDinner,
    calcOccupancy,
    calcIdealRoomsFTE,
    calcIdealFnbFTE,
  };
};
