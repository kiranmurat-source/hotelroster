
DROP POLICY IF EXISTS "topics_read" ON training_topics;
DROP POLICY IF EXISTS "topics_write" ON training_topics;
DROP POLICY IF EXISTS "completions_read" ON training_completions;
DROP POLICY IF EXISTS "completions_write" ON training_completions;

CREATE POLICY "topics_own_dept" ON training_topics FOR SELECT USING (
  department = (SELECT department FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "topics_manager_write" ON training_topics FOR ALL USING (
  (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
  AND department = (SELECT department FROM profiles WHERE user_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "completions_own_dept" ON training_completions FOR SELECT USING (
  department = (SELECT department FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "completions_manager_write" ON training_completions FOR ALL USING (
  (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
  AND department = (SELECT department FROM profiles WHERE user_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
