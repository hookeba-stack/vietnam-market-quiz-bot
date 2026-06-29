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

    // Call Gemini to generate 20 quizzes
    const generatedQuizzes = await generateQuizzesFromAI(topic, fileName, fileBuffer);

    // Save quizzes to Database
    const quizzesToInsert = generatedQuizzes.map(q => ({
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
