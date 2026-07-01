// API Route to manually trigger quiz generation for a specific topic/file
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateQuizzesFromAI } from '@/lib/gemini';
import { downloadDriveFile } from '@/lib/gdrive';

export async function POST(request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  try {
    const { topic, fileName, fileId } = await request.json();

    if (!topic || !fileName) {
      return NextResponse.json({ error: 'Missing topic or fileName' }, { status: 400 });
    }

    console.log(`Manually generating quizzes for topic: ${topic}, file: ${fileName}`);

    // Try downloading the file if fileId is a real Drive ID
    let fileBuffer = null;
    if (fileId && !fileId.startsWith('1-')) {
      fileBuffer = await downloadDriveFile(fileId);
    }

    // Fetch all existing quizzes to do duplicate checking
    let existingQuestions = [];
    try {
      const { data: existingData, error: fetchErr } = await supabase
        .from('quizzes')
        .select('question');
      if (!fetchErr && existingData) {
        existingQuestions = existingData.map(q => q.question);
      }
    } catch (e) {
      console.error('Failed to fetch existing questions for duplicate checking:', e);
    }

    // Call Gemini to generate 20 quizzes (passing existingQuestions)
    const generatedQuizzes = await generateQuizzesFromAI(topic, fileName, fileBuffer, existingQuestions);

    // Helper to normalize questions for comparison (ignoring case, spaces, punctuation, and prefix)
    const normalizeQuestion = (qText) => {
      if (!qText) return '';
      return qText
        .replace(/^\[Câu hỏi \d+\]\s*(Dựa trên báo cáo [^:]+:\s*)?/i, '') // Remove prefix
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\s]/g, ''); // Remove punctuation and spaces
    };

    const existingNormalized = new Set(existingQuestions.map(q => normalizeQuestion(q)));
    const uniqueNewQuizzes = [];
    const seenInBatch = new Set();

    for (const quiz of generatedQuizzes) {
      const norm = normalizeQuestion(quiz.question);
      if (!existingNormalized.has(norm) && !seenInBatch.has(norm)) {
        uniqueNewQuizzes.push(quiz);
        seenInBatch.add(norm);
      } else {
        console.warn(`Skipping duplicate question: "${quiz.question}"`);
      }
    }

    if (uniqueNewQuizzes.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Tất cả các câu hỏi được tạo ra đều bị trùng lặp với các bài trắc nghiệm đã có. Vui lòng kiểm tra lại cấu hình hoặc API Key.`
      }, { status: 400 });
    }

    // Save quizzes to Database
    const quizzesToInsert = uniqueNewQuizzes.map(q => ({
      topic: topic,
      question: q.question,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation,
      source_file: fileName
    }));

    const { data, error } = await supabase
      .from('quizzes')
      .insert(quizzesToInsert)
      .select();

    if (error) {
      throw error;
    }

    // Mark the file as processed in Database if fileId was provided
    if (fileId) {
      await supabase
        .from('processed_files')
        .upsert(
          { file_id: fileId, file_name: fileName, status: 'processed', processed_at: new Date().toISOString() },
          { onConflict: 'file_id' }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${data.length} quizzes for topic: ${topic}`,
      quizzes: data
    });

  } catch (error) {
    console.error('Manual quiz generation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
