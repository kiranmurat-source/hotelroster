
-- Fix INSERT policies to require submitted_by = auth.uid()
DROP POLICY "Authenticated users can insert extra hours requests" ON public.extra_hours_requests;
CREATE POLICY "Authenticated users can insert extra hours requests"
ON public.extra_hours_requests FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid());

DROP POLICY "Authenticated users can insert extra staff requests" ON public.extra_staff_requests;
CREATE POLICY "Authenticated users can insert extra staff requests"
ON public.extra_staff_requests FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid());
