const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const botToken = process.env.ZALO_BOT_TOKEN || '573853085825137296:itiJlHBZaklPOEQHlDYRLOgHjcjiCMcsePZHjuldUCcAMtfNhipaINKQuTuCtDLo';
const webappUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://vietnam-market-quiz-bot.vercel.app';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Thất bại: Thiếu cấu hình Supabase trong .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const chatId = 'adf8d5c8608589dbd094';

function cleanSourceFile(filename) {
  if (!filename) return '';
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/^copy\s+of\s+/i, '')
    .replace(/\s+shared\s+by\s+.*$/i, '')
    .trim();
}

async function sendAllQuizzes() {
  console.log(`=== BẮT ĐẦU GỬI 20 CÂU HỎI CHO ZALO ID: ${chatId} ===`);

  try {
    // 1. Fetch all quizzes in DB
    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: true });

    if (quizError) throw quizError;

    // 1.5. Fetch already sent quizzes for this chat ID
    const { data: sentLogs, error: logError } = await supabase
      .from('delivery_logs')
      .select('quiz_id')
      .eq('chat_id', chatId)
      .eq('status', 'success');

    if (logError) throw logError;

    const sentQuizIds = new Set(sentLogs.map(l => l.quiz_id));
    const unsentQuizzes = quizzes.filter(q => !sentQuizIds.has(q.id));

    console.log(`Tìm thấy ${quizzes.length} câu hỏi tổng cộng. Đã gửi ${sentQuizIds.size} câu. Còn lại ${unsentQuizzes.length} câu chưa gửi.`);

    const quizzesToProcess = unsentQuizzes.length > 0 ? unsentQuizzes : quizzes;
    console.log(`Tiến hành gửi ${Math.min(20, quizzesToProcess.length)} câu mới...`);

    let successCount = 0;
    let failedCount = 0;

    const limit = Math.min(20, quizzesToProcess.length);
    for (let i = 0; i < limit; i++) {
      const quiz = quizzesToProcess[i];
      
      const formattedText = `${quiz.source_file ? `📖 Nguồn: ${cleanSourceFile(quiz.source_file)}\n\n` : ''}❓ Câu hỏi: ${quiz.question}

${quiz.options.join('\n')}`;

      console.log(`\n[${i + 1}/${quizzes.length}] Đang gửi Câu hỏi ID: ${quiz.id}...`);

      // 2. Send via Zalo Bot API
      const url = `https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`;
      let sendSuccess = false;
      let errorMessage = null;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: formattedText
          })
        });

        const resData = await response.json();
        if (response.ok && resData.ok) {
          console.log(`✅ Gửi thành công câu ${i + 1}!`);
          sendSuccess = true;
          successCount++;
        } else {
          throw new Error(resData.description || `HTTP ${response.status} Error`);
        }
      } catch (err) {
        console.error(`❌ Gửi thất bại câu ${i + 1}:`, err.message);
        errorMessage = err.message;
        failedCount++;
      }

      // 3. Log delivery status to Supabase
      const { error: logError } = await supabase
        .from('delivery_logs')
        .insert({
          quiz_id: quiz.id,
          chat_id: chatId,
          sent_at: new Date().toISOString(),
          status: sendSuccess ? 'success' : 'failed',
          error_message: errorMessage
        });

      if (logError) {
        console.error(`❌ Lỗi lưu nhật ký gửi tin vào CSDL:`, logError.message);
      }

      // Small delay between sends to avoid rate limiting
      await new Promise(r => setTimeout(r, 800));
    }

    console.log(`\n=== KẾT QUẢ GỬI TIN ===`);
    console.log(`Tổng số: ${quizzes.length}`);
    console.log(`Gửi thành công: ${successCount}`);
    console.log(`Gửi thất bại: ${failedCount}`);

  } catch (err) {
    console.error("❌ Xảy ra lỗi hệ thống:", err.message);
  }
}

sendAllQuizzes();
