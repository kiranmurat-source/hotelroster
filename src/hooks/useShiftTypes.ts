import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    const fetch = async () => {
      const { data, error } = await supabase
        .from("shift_types")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!error && data) {
        setShiftTypes(data as unknown as ShiftTypeRecord[]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const getById = (id: string) => shiftTypes.find((s) => s.id === id);
  const getByCode = (code: string) => shiftTypes.find((s) => s.code === code.toUpperCase().trim());

  return { shiftTypes, loading, getById, getByCode };
};
