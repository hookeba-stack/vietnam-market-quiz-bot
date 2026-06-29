// API Route for Zalo Bot webhook to handle user responses interactively
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendZaloMessage } from '@/lib/zalo';

export async function POST(request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    console.log("Zalo Webhook received message data:", JSON.stringify(body));

    // Zalo Bot Platform webhook payload structure:
    // {
    //   "message": { "text": "Q_a8f9c1d2 A" },
    //   "sender": { "id": "123456789", "display_name": "Nguyen Van A" },
    //   "chat_id": "987654321"
    // }
    const messageText = body.message?.text || '';
    const userId = body.sender?.id || '';
    const userName = body.sender?.display_name || 'Người dùng Zalo';
    const chatId = body.chat_id || userId; // fallback to userId if chatId is missing

    if (!messageText || !chatId) {
      return NextResponse.json({ ok: true, status: 'ignored_missing_data' });
    }

    // 1. Regex to check if the message is an answer submission (e.g. Q_a8f9c1d2 A)
    // Accept lowercase/uppercase and potential trailing whitespaces
    const quizAnswerRegex = /^Q_([a-f0-9]{8})\s+([A-D])$/i;
    const match = messageText.trim().match(quizAnswerRegex);

    if (match) {
      const quizShortId = match[1].toLowerCase();
      const selectedOption = match[2].toUpperCase();

      console.log(`Processing answer submission. Quiz Short ID: ${quizShortId}, Selected: ${selectedOption}`);

      // a. Find the quiz in Supabase (look for id starting with quizShortId)
      const { data: quizzes, error: queryError } = await supabase
        .from('quizzes')
        .select('*')
        .like('id', `${quizShortId}%`);

      if (queryError) throw queryError;

      if (quizzes.length === 0) {
        await sendZaloMessage(chatId, `⚠️ Không tìm thấy mã câu hỏi Q_${quizShortId} trên hệ thống. Vui lòng kiểm tra lại.`);
        return NextResponse.json({ ok: true });
      }

      const quiz = quizzes[0];
      const isCorrect = selectedOption === quiz.correct_option.toUpperCase();

      // b. Save user response to Database
      const { error: dbError } = await supabase
        .from('user_responses')
        .insert({
          quiz_id: quiz.id,
          user_id: userId,
          user_name: userName,
          selected_option: selectedOption,
          is_correct: isCorrect,
          answered_at: new Date().toISOString()
        });

      if (dbError) {
        console.error("Failed to save user response to DB:", dbError.message);
      }

      // c. Formulate reply message
      let replyText = '';
      if (isCorrect) {
        replyText = `🎉 CHÚC MỪNG ${userName.toUpperCase()}! 🎉
✅ Bạn đã trả lời CHÍNH XÁC!

👉 Đáp án đúng là: ${quiz.correct_option}
💡 Giải thích: ${quiz.explanation}`;
      } else {
        replyText = `😢 TIẾC QUÁ ${userName.toUpperCase()}! 😢
❌ Câu trả lời của bạn chưa chính xác.

👉 Bạn đã chọn: ${selectedOption}
👉 Đáp án đúng là: ${quiz.correct_option}
💡 Giải thích: ${quiz.explanation}`;
      }

      // d. Send reply back to Zalo
      await sendZaloMessage(chatId, replyText);

    } else {
      // 2. If message does not match answer format, send guidance/welcome instructions
      // Prevent bot from replying in loops if it's reacting to its own messages (usually Webhooks only receive user messages)
      const lowerText = messageText.toLowerCase();
      if (lowerText.includes('hello') || lowerText.includes('chào') || lowerText.includes('hi') || lowerText.includes('help') || lowerText.includes('hướng dẫn')) {
        const welcomeText = `👋 Xin chào ${userName}!
Tôi là Bot Tạo Quiz Thị Trường.

📈 Tôi sẽ gửi các câu hỏi trắc nghiệm về thị trường Việt Nam theo lịch biểu định kỳ.
💡 Để tham gia trả lời, bạn hãy soạn tin nhắn theo cú pháp:
👉 Q_[Mã_Câu_Hỏi] [Đáp_Án]
Ví dụ: Q_a8f9c1d2 A

Chúc bạn học tập và làm việc hiệu quả! 🚀`;
        
        await sendZaloMessage(chatId, welcomeText);
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Zalo Webhook API Error:", error);
    // Always return 200 OK to webhook provider to avoid retry loops, but log error
    return NextResponse.json({ ok: true, error: error.message });
  }
}
