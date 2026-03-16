
-- Remove overly permissive policies - the SECURITY DEFINER function handles writes
DROP POLICY "System can insert staff_points" ON public.staff_points;
DROP POLICY "System can update staff_points" ON public.staff_points;
DROP POLICY "System can insert staff_badges" ON public.staff_badges;
