
-- kudos table
CREATE TABLE public.kudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  message text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert kudos"
  ON public.kudos FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Authenticated users can select kudos"
  ON public.kudos FOR SELECT TO authenticated
  USING (true);

-- staff_points table
CREATE TABLE public.staff_points (
  staff_id uuid PRIMARY KEY,
  total_points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select staff_points"
  ON public.staff_points FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert staff_points"
  ON public.staff_points FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update staff_points"
  ON public.staff_points FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- badges table
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  threshold_points integer NOT NULL
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select badges"
  ON public.badges FOR SELECT TO authenticated
  USING (true);

-- staff_badges table
CREATE TABLE public.staff_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id),
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_id, badge_id)
);

ALTER TABLE public.staff_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select staff_badges"
  ON public.staff_badges FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert staff_badges"
  ON public.staff_badges FOR INSERT TO authenticated
  WITH CHECK (true);

-- Seed badges
INSERT INTO public.badges (name, description, threshold_points) VALUES
  ('Rising Star', 'Earned at 10 points', 10),
  ('Team Player', 'Earned at 25 points', 25),
  ('Guest Champion', 'Earned at 50 points', 50),
  ('Department Hero', 'Earned at 100 points', 100),
  ('Legend', 'Earned at 250 points', 250);

-- Enable realtime for kudos
ALTER PUBLICATION supabase_realtime ADD TABLE public.kudos;

-- Function to award points and check badges
CREATE OR REPLACE FUNCTION public.process_kudos(
  _from_user_id uuid,
  _to_user_id uuid,
  _message text,
  _category text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _badge RECORD;
  _new_points integer;
BEGIN
  -- Insert the kudos
  INSERT INTO public.kudos (from_user_id, to_user_id, message, category)
  VALUES (_from_user_id, _to_user_id, _message, _category);

  -- Award 5 points to recipient
  INSERT INTO public.staff_points (staff_id, total_points, updated_at)
  VALUES (_to_user_id, 5, now())
  ON CONFLICT (staff_id) DO UPDATE
  SET total_points = staff_points.total_points + 5, updated_at = now();

  -- Award 1 point to sender
  INSERT INTO public.staff_points (staff_id, total_points, updated_at)
  VALUES (_from_user_id, 1, now())
  ON CONFLICT (staff_id) DO UPDATE
  SET total_points = staff_points.total_points + 1, updated_at = now();

  -- Check badges for recipient
  SELECT total_points INTO _new_points FROM public.staff_points WHERE staff_id = _to_user_id;
  FOR _badge IN SELECT id, threshold_points FROM public.badges WHERE threshold_points <= _new_points LOOP
    INSERT INTO public.staff_badges (staff_id, badge_id) VALUES (_to_user_id, _badge.id)
    ON CONFLICT (staff_id, badge_id) DO NOTHING;
  END LOOP;

  -- Check badges for sender
  SELECT total_points INTO _new_points FROM public.staff_points WHERE staff_id = _from_user_id;
  FOR _badge IN SELECT id, threshold_points FROM public.badges WHERE threshold_points <= _new_points LOOP
    INSERT INTO public.staff_badges (staff_id, badge_id) VALUES (_from_user_id, _badge.id)
    ON CONFLICT (staff_id, badge_id) DO NOTHING;
  END LOOP;
END;
$$;
