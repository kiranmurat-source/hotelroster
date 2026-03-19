
DROP POLICY "Anyone can read shift_types" ON public.shift_types;
CREATE POLICY "Authenticated users can read shift_types"
  ON public.shift_types
  FOR SELECT
  TO authenticated
  USING (true);
