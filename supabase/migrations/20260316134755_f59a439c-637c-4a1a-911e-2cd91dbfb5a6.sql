
-- Add unique constraint on staff_badges if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'staff_badges_staff_id_badge_id_key'
  ) THEN
    ALTER TABLE public.staff_badges ADD CONSTRAINT staff_badges_staff_id_badge_id_key UNIQUE (staff_id, badge_id);
  END IF;
END $$;

-- Recreate process_kudos with RETURNING to get new totals
CREATE OR REPLACE FUNCTION public.process_kudos(_from_user_id uuid, _to_user_id uuid, _message text, _category text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _badge RECORD;
  _new_points integer;
BEGIN
  INSERT INTO public.kudos (from_user_id, to_user_id, message, category)
  VALUES (_from_user_id, _to_user_id, _message, _category);

  INSERT INTO public.staff_points (staff_id, total_points, updated_at)
  VALUES (_to_user_id, 5, now())
  ON CONFLICT (staff_id) DO UPDATE
  SET total_points = staff_points.total_points + 5, updated_at = now()
  RETURNING total_points INTO _new_points;

  FOR _badge IN SELECT id FROM public.badges WHERE threshold_points <= _new_points LOOP
    INSERT INTO public.staff_badges (staff_id, badge_id, earned_at)
    VALUES (_to_user_id, _badge.id, now())
    ON CONFLICT (staff_id, badge_id) DO NOTHING;
  END LOOP;

  INSERT INTO public.staff_points (staff_id, total_points, updated_at)
  VALUES (_from_user_id, 1, now())
  ON CONFLICT (staff_id) DO UPDATE
  SET total_points = staff_points.total_points + 1, updated_at = now()
  RETURNING total_points INTO _new_points;

  FOR _badge IN SELECT id FROM public.badges WHERE threshold_points <= _new_points LOOP
    INSERT INTO public.staff_badges (staff_id, badge_id, earned_at)
    VALUES (_from_user_id, _badge.id, now())
    ON CONFLICT (staff_id, badge_id) DO NOTHING;
  END LOOP;
END;
$function$;

-- Backfill missing badges for all existing staff
INSERT INTO public.staff_badges (staff_id, badge_id, earned_at)
SELECT sp.staff_id, b.id, now()
FROM public.staff_points sp
CROSS JOIN public.badges b
WHERE b.threshold_points <= sp.total_points
ON CONFLICT (staff_id, badge_id) DO NOTHING;
