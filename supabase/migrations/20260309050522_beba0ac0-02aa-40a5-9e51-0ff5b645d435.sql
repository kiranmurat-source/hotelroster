
-- Create table to store weekly forecasts
CREATE TABLE public.forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_label TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days JSONB NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view forecasts (it's shared operational data)
CREATE POLICY "Authenticated users can view forecasts"
ON public.forecasts
FOR SELECT
TO authenticated
USING (true);

-- Only managers and admins can insert forecasts
CREATE POLICY "Managers can insert forecasts"
ON public.forecasts
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')
);

-- Only managers and admins can delete forecasts
CREATE POLICY "Managers can delete forecasts"
ON public.forecasts
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')
);

-- Index for quick lookup of latest forecast
CREATE INDEX idx_forecasts_uploaded_at ON public.forecasts (uploaded_at DESC);
