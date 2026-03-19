
-- Insert MID-NA
INSERT INTO public.shift_types (code, label, color, is_off, is_editable_time, sort_order)
VALUES ('MID-NA', 'Gece Ara', '#a855f7', false, true, 7);

-- Update MID-AM label
UPDATE public.shift_types SET label = 'Sabah Ara' WHERE code = 'MID-AM';

-- Update MID-PM color
UPDATE public.shift_types SET color = '#f97316', label = 'Akşam Ara' WHERE code = 'MID-PM';

-- Create hotel_settings table
CREATE TABLE public.hotel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_name text NOT NULL DEFAULT 'Ramada Encore Bayrampaşa',
  total_rooms integer NOT NULL DEFAULT 144,
  segment text NOT NULL DEFAULT 'midscale',
  guest_per_room numeric NOT NULL DEFAULT 1.8,
  breakfast_capture_rate numeric NOT NULL DEFAULT 0.8,
  lunch_capture_rate numeric NOT NULL DEFAULT 0.0,
  dinner_capture_rate numeric NOT NULL DEFAULT 0.0,
  hk_rooms_per_fte integer NOT NULL DEFAULT 17,
  hk_supervisor_ratio integer NOT NULL DEFAULT 40,
  fb_breakfast_covers_per_fte integer NOT NULL DEFAULT 45,
  fb_lunch_covers_per_fte integer NOT NULL DEFAULT 35,
  fb_dinner_covers_per_fte integer NOT NULL DEFAULT 35,
  rooms_departments text[] NOT NULL DEFAULT ARRAY['Housekeeping','Front Office'],
  fnb_departments text[] NOT NULL DEFAULT ARRAY['F&B','Kitchen'],
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hotel_settings"
ON public.hotel_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert hotel_settings"
ON public.hotel_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update hotel_settings"
ON public.hotel_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete hotel_settings"
ON public.hotel_settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.hotel_settings (hotel_name) VALUES ('Ramada Encore Bayrampaşa');
