// Script chạy SQL schema trực tiếp lên Supabase qua Management API
// Dùng SUPABASE_SERVICE_KEY nếu có, hoặc dùng database REST endpoint

const https = require('https');

// Thông tin project
const PROJECT_REF = 'fbndspqraslcweczguye';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibmRzcHFyYXNsY3dlY3pndXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTIyMjcsImV4cCI6MjA5ODI4ODIyN30.rzd9LFYEK5qgGnxfQOFRTG7Xr9tuxaLZhS3unVNmHcQ';

// SQL Schema
const SQL = `
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quizzes' AND policyname='Allow read/write access for all users') THEN
    CREATE POLICY "Allow read/write access for all users" ON quizzes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='processed_files' AND policyname='Allow read/write access for all users') THEN
    CREATE POLICY "Allow read/write access for all users" ON processed_files FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='schedules' AND policyname='Allow read/write access for all users') THEN
    CREATE POLICY "Allow read/write access for all users" ON schedules FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_logs' AND policyname='Allow read/write access for all users') THEN
    CREATE POLICY "Allow read/write access for all users" ON delivery_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_responses' AND policyname='Allow read/write access for all users') THEN
    CREATE POLICY "Allow read/write access for all users" ON user_responses FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runSchema() {
  console.log('Đang kết nối Supabase Management API...');
  
  // Try via Supabase REST rpc endpoint (requires service role)
  const payload = JSON.stringify({ query: SQL });
  
  const options = {
    hostname: `${PROJECT_REF}.supabase.co`,
    path: '/rest/v1/rpc/exec_sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  
  const result = await makeRequest(options, payload);
  console.log('Response:', JSON.stringify(result, null, 2));
  
  if (result.status === 200) {
    console.log('✅ Schema đã được tạo thành công!');
  } else {
    console.log(`❌ Status ${result.status} - cần dùng service role key`);
    console.log('Gợi ý: Lấy service_role key từ Supabase Dashboard > Settings > API > service_role');
  }
}

runSchema().catch(console.error);
