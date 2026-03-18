CREATE OR REPLACE FUNCTION public.process_kudos(
  _from_user_id uuid, _to_user_id uuid,
  _message text, _category text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  _badge RECORD;
  _new_points integer;
BEGIN
  -- Verify caller can only send kudos as themselves
  IF _from_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot send kudos on behalf of another user';
  END IF;

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
$$;