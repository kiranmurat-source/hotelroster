import { useEffect, useState } from "react";
import { api } from "@/integrations/api/client";

export interface ShiftTypeRecord {
  id: string;
  code: string;
  label: string;
  start_time: string | null;
  end_time: string | null;
  color: string;
  is_off: boolean;
  is_editable_time: boolean;
  sort_order: number;
}

export const useShiftTypes = () => {
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ShiftTypeRecord[]>('/roster/shift-types')
      .then((data) => setShiftTypes(data))
      .catch(() => setShiftTypes([]))
      .finally(() => setLoading(false));
  }, []);

  const getById = (id: string) => shiftTypes.find((s) => s.id === id);
  const getByCode = (code: string) => shiftTypes.find((s) => s.code === code.toUpperCase().trim());

  return { shiftTypes, loading, getById, getByCode };
};
