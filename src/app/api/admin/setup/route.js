import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  // Bảo vệ endpoint bằng secret key
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Strip BOM character (\uFEFF) that PowerShell may add to env vars
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^\uFEFF/, '');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    serviceRoleKey
  );

  const results = [];

  // Tạo từng table bằng cách insert dummy data và kiểm tra lỗi
  // Với service_role, chúng ta có thể dùng upsert để "tạo" rows
  // Nhưng tables chưa tồn tại -> dùng cách khác: gọi supabase.from().select() để test

  // Thử query tables để biết cái nào đã tồn tại
  const tables = ['quizzes', 'processed_files', 'schedules', 'delivery_logs', 'user_responses'];
  const missing = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && error.code === '42P01') { // relation does not exist
      missing.push(table);
      results.push({ table, status: 'MISSING - cần tạo' });
    } else if (error) {
      results.push({ table, status: 'ERROR: ' + error.message });
    } else {
      results.push({ table, status: 'EXISTS ✅' });
    }
  }

  const hasErrors = results.some(r => r.status.startsWith('ERROR'));
  if (missing.length === 0 && !hasErrors) {
    return NextResponse.json({
      success: true,
      message: 'Tất cả 5 tables đã tồn tại và hoạt động bình thường! ✅',
      results
    });
  }

  // Nếu có tables bị thiếu, trả về hướng dẫn SQL
  const sqlScript = `
-- Chạy script này trong Supabase SQL Editor:
-- https://supabase.com/dashboard/project/${process.env.SUPABASE_URL?.split('//')[1]?.split('.')[0]}/sql/new

CREATE TABLE IF NOT EXISTS quizzes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), topic TEXT NOT NULL, question TEXT NOT NULL, options JSONB NOT NULL, correct_option TEXT NOT NULL, explanation TEXT, source_file TEXT, created_at TIMESTAMPTZ DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS processed_files (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), file_name TEXT NOT NULL, file_id TEXT NOT NULL UNIQUE, status TEXT DEFAULT 'processed', processed_at TIMESTAMPTZ DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS schedules (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), chat_id TEXT NOT NULL, topic TEXT NOT NULL, cron_expression TEXT DEFAULT '0 9 * * *', is_active BOOLEAN DEFAULT true NOT NULL, last_sent_at TIMESTAMPTZ, next_send_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now() NOT NULL);
CREATE TABLE IF NOT EXISTS delivery_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE, chat_id TEXT NOT NULL, sent_at TIMESTAMPTZ DEFAULT now() NOT NULL, status TEXT NOT NULL, error_message TEXT);
CREATE TABLE IF NOT EXISTS user_responses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE, user_id TEXT NOT NULL, user_name TEXT, selected_option TEXT NOT NULL, is_correct BOOLEAN NOT NULL, answered_at TIMESTAMPTZ DEFAULT now() NOT NULL);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON processed_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON delivery_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON user_responses FOR ALL USING (true) WITH CHECK (true);
`.trim();

  return NextResponse.json({
    success: false,
    message: `${missing.length} tables bị thiếu. Service role không thể chạy DDL qua REST API. Vui lòng chạy SQL script bên dưới trong Supabase SQL Editor.`,
    missing_tables: missing,
    results,
    sql_to_run: sqlScript,
    sql_editor_url: `https://supabase.com/dashboard/project/fbndspqraslcweczguye/sql/new`
  });
}
