
DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM ('annual', 'compensatory', 'public_holiday', 'sick');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  name text NOT NULL,
  year int NOT NULL,
  UNIQUE(date, name)
);

INSERT INTO public_holidays (date, name, year) VALUES
  ('2026-01-01', 'Yilbasi', 2026),
  ('2026-04-02', 'Ramazan Bayrami 1. Gun', 2026),
  ('2026-04-03', 'Ramazan Bayrami 2. Gun', 2026),
  ('2026-04-04', 'Ramazan Bayrami 3. Gun', 2026),
  ('2026-04-23', 'Ulusal Egemenlik ve Cocuk Bayrami', 2026),
  ('2026-05-01', 'Emek ve Dayanisma Gunu', 2026),
  ('2026-05-19', 'Ataturku Anma Genclik Bayrami', 2026),
  ('2026-06-09', 'Kurban Bayrami 1. Gun', 2026),
  ('2026-06-10', 'Kurban Bayrami 2. Gun', 2026),
  ('2026-06-11', 'Kurban Bayrami 3. Gun', 2026),
  ('2026-06-12', 'Kurban Bayrami 4. Gun', 2026),
  ('2026-07-15', 'Demokrasi ve Milli Birlik Gunu', 2026),
  ('2026-08-30', 'Zafer Bayrami', 2026),
  ('2026-10-29', 'Cumhuriyet Bayrami', 2026)
ON CONFLICT (date, name) DO NOTHING;

CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department text NOT NULL,
  leave_type leave_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_requested int NOT NULL,
  notes text,
  status leave_status NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roster_shifts
  ADD COLUMN IF NOT EXISTS leave_request_id uuid REFERENCES leave_requests(id);

ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holidays_read" ON public_holidays FOR SELECT USING (true);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_read" ON leave_requests FOR SELECT USING (
  department = (SELECT department FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
);
CREATE POLICY "leave_insert" ON leave_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
);
CREATE POLICY "leave_update" ON leave_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
);
CREATE POLICY "leave_delete" ON leave_requests FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
);
