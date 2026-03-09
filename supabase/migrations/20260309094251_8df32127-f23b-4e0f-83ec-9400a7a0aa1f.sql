
-- Create extra_hours_requests table
CREATE TABLE public.extra_hours_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  department TEXT NOT NULL,
  date TEXT NOT NULL,
  hours INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.extra_hours_requests ENABLE ROW LEVEL SECURITY;

-- All authenticated can view
CREATE POLICY "Authenticated users can view extra hours requests"
ON public.extra_hours_requests FOR SELECT TO authenticated USING (true);

-- All authenticated can insert
CREATE POLICY "Authenticated users can insert extra hours requests"
ON public.extra_hours_requests FOR INSERT TO authenticated WITH CHECK (true);

-- Only managers/admins can update (approve/reject)
CREATE POLICY "Managers can update extra hours requests"
ON public.extra_hours_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- Create extra_staff_requests table
CREATE TABLE public.extra_staff_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department TEXT NOT NULL,
  date TEXT NOT NULL,
  shift TEXT NOT NULL,
  number_of_staff INTEGER NOT NULL,
  reason TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.extra_staff_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view extra staff requests"
ON public.extra_staff_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert extra staff requests"
ON public.extra_staff_requests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Managers can update extra staff requests"
ON public.extra_staff_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));
