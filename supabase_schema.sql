-- SQL Schema Script for Supabase PostgreSQL Database

-- 1. Table for quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Format: ["A. option1", "B. option2", "C. option3", "D. option4"]
  correct_option TEXT NOT NULL, -- "A", "B", "C" or "D"
  explanation TEXT,
  source_file TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table for tracking processed Google Drive files
CREATE TABLE IF NOT EXISTS processed_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'processed', -- 'processed' or 'failed'
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table for quiz delivery schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL, -- Zalo group/user Chat ID
  topic TEXT NOT NULL, -- Topic to send from
  cron_expression TEXT DEFAULT '0 9 * * *', -- Visual reference
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Table for tracking delivery logs
CREATE TABLE IF NOT EXISTS delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT NOT NULL, -- 'success' or 'failed'
  error_message TEXT
);

-- 5. Table for storing user answers from Zalo webhook
CREATE TABLE IF NOT EXISTS user_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  selected_option TEXT NOT NULL, -- "A", "B", "C" or "D"
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) - For simple apps you can disable it,
-- but for production it's good practice. Here we allow anonymous access (API key-based)
-- since the Webapp uses anon client key.
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all actions for service role and anon/authenticated clients
-- since the webapp interacts directly with them via the API key.
CREATE POLICY "Allow read/write access for all users" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write access for all users" ON processed_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write access for all users" ON schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write access for all users" ON delivery_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write access for all users" ON user_responses FOR ALL USING (true) WITH CHECK (true);
