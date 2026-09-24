CREATE TABLE IF NOT EXISTS live_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code varchar(6) NOT NULL REFERENCES shared_quizzes(share_code),
  session_code varchar(8) NOT NULL UNIQUE,
  status varchar(20) NOT NULL DEFAULT 'waiting',  -- 'waiting', 'active', 'finished'
  started_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by text
);

CREATE TABLE IF NOT EXISTS live_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code varchar(8) NOT NULL REFERENCES live_sessions(session_code),
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_avatar text,
  score integer DEFAULT 0,
  total integer DEFAULT 0,
  finished boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(session_code, user_id)
);

-- RLS policies
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read live_sessions" ON live_sessions FOR SELECT USING (true);
CREATE POLICY "Public insert live_sessions" ON live_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update live_sessions" ON live_sessions FOR UPDATE USING (true);

CREATE POLICY "Public read live_participants" ON live_participants FOR SELECT USING (true);
CREATE POLICY "Public insert live_participants" ON live_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update live_participants" ON live_participants FOR UPDATE USING (true);
