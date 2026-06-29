$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibmRzcHFyYXNsY3dlY3pndXllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjcxMjIyNywiZXhwIjoyMDk4Mjg4MjI3fQ.bTF8AKPQaSMBeCcuENRTaVfPRHaFEeFFRGwRpbDrMnE"
$PROJECT_REF = "fbndspqraslcweczguye"

$SQL = @"
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option TEXT NOT NULL,
  explanation TEXT,
  source_file TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS processed_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'processed',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  cron_expression TEXT DEFAULT '0 9 * * *',
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT
);
CREATE TABLE IF NOT EXISTS user_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  selected_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;
DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quizzes' AND policyname='Allow read/write access for all users') THEN CREATE POLICY "Allow read/write access for all users" ON quizzes FOR ALL USING (true) WITH CHECK (true); END IF; END `$`$;
DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='processed_files' AND policyname='Allow read/write access for all users') THEN CREATE POLICY "Allow read/write access for all users" ON processed_files FOR ALL USING (true) WITH CHECK (true); END IF; END `$`$;
DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='schedules' AND policyname='Allow read/write access for all users') THEN CREATE POLICY "Allow read/write access for all users" ON schedules FOR ALL USING (true) WITH CHECK (true); END IF; END `$`$;
DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_logs' AND policyname='Allow read/write access for all users') THEN CREATE POLICY "Allow read/write access for all users" ON delivery_logs FOR ALL USING (true) WITH CHECK (true); END IF; END `$`$;
DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_responses' AND policyname='Allow read/write access for all users') THEN CREATE POLICY "Allow read/write access for all users" ON user_responses FOR ALL USING (true) WITH CHECK (true); END IF; END `$`$;
"@

$headers = @{
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type"  = "application/json"
    "apikey"        = $SERVICE_KEY
}

Write-Host "=== Thu 1: Supabase Management API ===" -ForegroundColor Cyan
$body1 = @{ query = $SQL } | ConvertTo-Json -Depth 5
try {
    $r1 = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" `
        -Method POST -Headers $headers -Body $body1 -ErrorAction Stop
    Write-Host "SUCCESS via Management API!" -ForegroundColor Green
    $r1 | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Management API failed (can cap personal token). Thu cach 2..." -ForegroundColor Yellow
    Write-Host $_.Exception.Message

    Write-Host "`n=== Thu 2: PostgREST SQL endpoint ===" -ForegroundColor Cyan
    try {
        $r2 = Invoke-RestMethod -Uri "https://$PROJECT_REF.supabase.co/rest/v1/rpc/query" `
            -Method POST -Headers $headers -Body $body1 -ErrorAction Stop
        Write-Host "SUCCESS via PostgREST!" -ForegroundColor Green
        $r2 | ConvertTo-Json -Depth 5
    } catch {
        Write-Host "PostgREST RPC failed:" -ForegroundColor Yellow
        Write-Host $_.Exception.Message
        Write-Host "`nKet qua: Can mo SQL Editor thu cong." -ForegroundColor Red
    }
}
