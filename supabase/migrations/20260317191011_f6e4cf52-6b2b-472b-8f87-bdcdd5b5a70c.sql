
-- Create roster_shifts table for persisting uploaded roster data
CREATE TABLE public.roster_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  staff_name text NOT NULL,
  date text NOT NULL,
  shift text NOT NULL,
  department text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups by user and date range
CREATE INDEX idx_roster_shifts_user_date ON public.roster_shifts (user_id, date);

-- Enable RLS
ALTER TABLE public.roster_shifts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view roster shifts
CREATE POLICY "Authenticated users can view roster shifts"
ON public.roster_shifts FOR SELECT
TO authenticated
USING (true);

-- Managers/admins can insert roster shifts
CREATE POLICY "Managers can insert roster shifts"
ON public.roster_shifts FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Managers/admins can delete roster shifts (for re-uploading)
CREATE POLICY "Managers can delete roster shifts"
ON public.roster_shifts FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);
