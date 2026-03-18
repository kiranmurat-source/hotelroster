
CREATE TABLE IF NOT EXISTS training_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  day_number int NOT NULL,
  code text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  key_info text,
  duration_minutes int DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  UNIQUE(department, day_number)
);

CREATE TABLE IF NOT EXISTS training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES training_topics(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  confirmed_by uuid REFERENCES profiles(id),
  UNIQUE(topic_id, staff_id)
);

ALTER TABLE training_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics_read" ON training_topics FOR SELECT USING (
  department = (SELECT department FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
);

CREATE POLICY "topics_write" ON training_topics FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
);

ALTER TABLE training_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completions_read" ON training_completions FOR SELECT USING (
  department = (SELECT department FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
);

CREATE POLICY "completions_write" ON training_completions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager','admin'))
);
