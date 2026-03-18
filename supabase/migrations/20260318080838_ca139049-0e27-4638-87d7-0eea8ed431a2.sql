
CREATE TABLE IF NOT EXISTS public.shift_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  start_time time,
  end_time time,
  color text NOT NULL DEFAULT 'gray',
  is_off boolean NOT NULL DEFAULT false,
  is_editable_time boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.shift_types (code, label, start_time, end_time, color, is_off, is_editable_time, sort_order)
VALUES
  ('A',   'Sabah Vardiyası',   '07:00', '15:00', 'blue',   false, false, 1),
  ('B',   'Öğleden Vardiyası', '15:00', '23:00', 'orange', false, false, 2),
  ('C',   'Gece Vardiyası',    '23:00', '07:00', 'purple', false, false, 3),
  ('MID', 'Ara Vardiya',       '09:00', '18:00', 'green',  false, true,  4),
  ('OFF', 'İzin / Kapalı',     null,    null,    'gray',   true,  false, 5)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.roster_shifts
  ADD COLUMN IF NOT EXISTS shift_type_id uuid REFERENCES public.shift_types(id),
  ADD COLUMN IF NOT EXISTS custom_start_time time,
  ADD COLUMN IF NOT EXISTS custom_end_time time;

UPDATE public.roster_shifts rs
SET shift_type_id = st.id
FROM public.shift_types st
WHERE UPPER(TRIM(rs.shift)) = st.code
  AND rs.shift_type_id IS NULL;

ALTER TABLE public.shift_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shift_types" ON public.shift_types
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage shift_types" ON public.shift_types
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
