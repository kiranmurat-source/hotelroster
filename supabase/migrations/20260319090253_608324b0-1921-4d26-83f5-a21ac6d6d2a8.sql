
CREATE OR REPLACE FUNCTION public.prevent_department_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to change department
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- For non-admins, prevent department changes
  IF NEW.department IS DISTINCT FROM OLD.department THEN
    RAISE EXCEPTION 'Only admins can change department assignments';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_department_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_department_self_update();
