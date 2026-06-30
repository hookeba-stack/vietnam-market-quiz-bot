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
    const userId = body.message?.from?.id || body.sender?.id || '';
    const userName = body.message?.from?.display_name || body.sender?.display_name || 'Người dùng Zalo';
    const chatId = body.message?.chat?.id || body.chat_id || userId; // fallback

    if (!messageText || !chatId) {
      return NextResponse.json({ ok: true, status: 'ignored_missing_data' });
    }

    let quizId = null;
    let selectedOption = null;

    // 1. Regex to check if the message is an answer submission (e.g. Q_a8f9c1d2 A)
    const quizAnswerRegex = /^Q_([a-f0-9]{8})\s+([A-D])$/i;
    const match = messageText.trim().match(quizAnswerRegex);

    if (match) {
      const quizShortId = match[1].toLowerCase();
      selectedOption = match[2].toUpperCase();

      console.log(`Processing answer submission. Quiz Short ID: ${quizShortId}, Selected: ${selectedOption}`);

      // a. Find the quiz in Supabase by matching short ID
      const { data: quizList, error: listError } = await supabase
        .from('quizzes')
        .select('id');

      if (listError) throw listError;

      const matchedQuiz = quizList?.find(q => q.id.substring(0, 8) === quizShortId);

      if (!matchedQuiz) {
        await sendZaloMessage(chatId, `⚠️ Không tìm thấy mã câu hỏi Q_${quizShortId} trên hệ thống. Vui lòng kiểm tra lại.`);
        return NextResponse.json({ ok: true });
      }
      quizId = matchedQuiz.id;
    } else {
      // 2. Check if it matches question number based format (e.g. 2B, Câu 2 B, q2 B)
      const numberAnswerRegex = /^\s*(?:câu|cau|q)?\s*(\d+)\s*[:.-]?\s*([A-D])\s*$/i;
      const numMatch = messageText.trim().match(numberAnswerRegex);

      if (numMatch) {
        const questionNum = parseInt(numMatch[1]);
        selectedOption = numMatch[2].toUpperCase();

        console.log(`Processing question-number submission. Question Number: ${questionNum}, Selected: ${selectedOption}`);

        // Fetch all sent quizzes for this chat_id from delivery_logs joined with quizzes, sorted by sent_at desc
        const { data: sentQuizzes, error: sentError } = await supabase
          .from('delivery_logs')
          .select(`
            quiz_id,
            sent_at,
            quizzes (
              id,
              question
            )
          `)
          .eq('chat_id', chatId)
          .eq('status', 'success')
          .order('sent_at', { ascending: false });

        if (sentError) throw sentError;

        // Find the most recently sent quiz that has "[Câu hỏi X]" matching questionNum
        const matchedSent = sentQuizzes?.find(s => {
          const qText = s.quizzes?.question || '';
          const matchNum = qText.match(/(?:Câu hỏi|Câu)\s*(\d+)/i);
          return matchNum && parseInt(matchNum[1]) === questionNum;
        });

        if (matchedSent) {
          quizId = matchedSent.quiz_id;
        } else {
          await sendZaloMessage(chatId, `⚠️ Không tìm thấy câu hỏi số ${questionNum} trong danh sách câu hỏi đã gửi cho bạn.`);
          return NextResponse.json({ ok: true });
        }
      } else {
        // 3. Check if the message is a REPLY (quoting) to a quiz message
        const quoteText = body.message?.quote_message?.text || '';
        const quoteMatch = quoteText.match(/Q_([a-f0-9]{8})/i);
        const quoteNumMatch = quoteText.match(/(?:Câu hỏi|Câu)\s*(\d+)/i);
        
        const optionOnlyRegex = /^\s*([A-D])\.?\s*$/i;
        const optionMatch = messageText.trim().match(optionOnlyRegex);

        if (quoteMatch && optionMatch) {
          const quizShortId = quoteMatch[1].toLowerCase();
          selectedOption = optionMatch[1].toUpperCase();

          console.log(`Processing reply-to-message submission. Quiz Short ID from quote: ${quizShortId}, Selected: ${selectedOption}`);

          // Find the quiz in Supabase by matching short ID
          const { data: quizList, error: listError } = await supabase
            .from('quizzes')
            .select('id');

          if (listError) throw listError;

          const matchedQuiz = quizList?.find(q => q.id.substring(0, 8) === quizShortId);

          if (matchedQuiz) {
            quizId = matchedQuiz.id;
          } else {
            await sendZaloMessage(chatId, `⚠️ Không tìm thấy mã câu hỏi Q_${quizShortId} trên hệ thống từ tin nhắn trích dẫn.`);
            return NextResponse.json({ ok: true });
          }
        } else if (quoteNumMatch && optionMatch) {
          const questionNum = parseInt(quoteNumMatch[1]);
          selectedOption = optionMatch[1].toUpperCase();

          console.log(`Processing reply-to-message question number. Question Number: ${questionNum}, Selected: ${selectedOption}`);

          // Fetch all sent quizzes for this chat_id from delivery_logs joined with quizzes, sorted by sent_at desc
          const { data: sentQuizzes, error: sentError } = await supabase
            .from('delivery_logs')
            .select(`
              quiz_id,
              sent_at,
              quizzes (
                id,
                question
              )
            `)
            .eq('chat_id', chatId)
            .eq('status', 'success')
            .order('sent_at', { ascending: false });

          if (sentError) throw sentError;

          // Find candidate quizzes matching the question number
          const matchedCandidates = sentQuizzes?.filter(s => {
            const qText = s.quizzes?.question || '';
            const matchNum = qText.match(/(?:Câu hỏi|Câu)\s*(\d+)/i);
            return matchNum && parseInt(matchNum[1]) === questionNum;
          }) || [];

          if (matchedCandidates.length === 1) {
            quizId = matchedCandidates[0].quiz_id;
          } else if (matchedCandidates.length > 1) {
            // Find the candidate whose question text matches a substring of the quoted message
            const matched = matchedCandidates.find(c => {
              const qText = c.quizzes?.question || '';
              const cleanQ = qText.replace(/^\[Câu hỏi \d+\]\s*/i, '').trim();
              const sampleText = cleanQ.substring(0, 30);
              return quoteText.includes(sampleText);
            });
            
            if (matched) {
              quizId = matched.quiz_id;
            } else {
              // Fallback to the most recently sent candidate
              quizId = matchedCandidates[0].quiz_id;
            }
          } else {
            await sendZaloMessage(chatId, `⚠️ Không tìm thấy câu hỏi số ${questionNum} trong danh sách câu hỏi đã gửi từ tin nhắn trích dẫn.`);
            return NextResponse.json({ ok: true });
          }
        } else if (optionMatch) {
          // 4. Fallback: If it's just a letter but not a reply, check the last successfully sent quiz to this chat_id
          selectedOption = optionMatch[1].toUpperCase();
          console.log(`Processing fallback single-option submission. Selected: ${selectedOption}`);

          const { data: lastDelivery, error: delError } = await supabase
            .from('delivery_logs')
            .select('quiz_id')
            .eq('chat_id', chatId)
            .eq('status', 'success')
            .order('sent_at', { ascending: false })
            .limit(1);

          if (delError) throw delError;

          if (lastDelivery && lastDelivery.length > 0) {
            quizId = lastDelivery[0].quiz_id;
          } else {
            await sendZaloMessage(chatId, `⚠️ Bạn chưa nhận được câu hỏi nào từ hệ thống để trả lời.`);
            return NextResponse.json({ ok: true });
          }
        }
      }
    }

    if (quizId && selectedOption) {
      const { data: quizzes, error: queryError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId);

      if (queryError) throw queryError;
      if (!quizzes || quizzes.length === 0) {
        await sendZaloMessage(chatId, `⚠️ Không tìm thấy thông tin câu hỏi trên hệ thống.`);
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
