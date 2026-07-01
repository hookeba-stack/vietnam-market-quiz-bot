// Cron API Route for syncing Google Drive files and generating quizzes automatically
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDriveFiles, downloadDriveFile } from '@/lib/gdrive';
import { generateQuizzesFromAI } from '@/lib/gemini';

// Simple heuristic to map file names to one of our 10 proposed topics,
// or fallback to creating a custom topic based on the file name.
function determineTopicFromFileName(fileName) {
  const name = fileName.toLowerCase();
  
  if (name.includes('e-commerce') || name.includes('tmdt') || name.includes('ecommerce') || name.includes('shopper')) {
    return 'Thương Mại Điện Tử Việt Nam 2025 (Vietnam E-Commerce 2025)';
  }
  if (name.includes('consumer trends') || name.includes('xu huong hanh vi') || name.includes('vads2025') || name.includes('vietnam consumer')) {
    return 'Xu Hướng Hành Vi Người Tiêu Dùng Việt Nam 2025 (Vietnam Consumer Trends 2025)';
  }
  if (name.includes('skincare') || name.includes('my pham') || name.includes('hair care') || name.includes('beauty')) {
    return 'Thị Trường Mỹ Phẩm & Chăm Sóc Da Việt Nam (Skincare & Cosmetics Market)';
  }
  if (name.includes('tết') || name.includes('tet') || name.includes('brand growth playbook')) {
    return 'Xu Hướng Mua Sắm & Tăng Trưởng Thương Hiệu Tết 2026 (Vietnam Tet 2026 Insights)';
  }
  if (name.includes('coffee') || name.includes('cà phê') || name.includes('chuỗi cửa hàng')) {
    return 'Thị Trường Chuỗi Coffee Shop Tại Việt Nam (Vietnam Coffee Shop Chains H1/2025)';
  }
  if (name.includes('social commerce') || name.includes('discovery & purchase')) {
    return 'Thương Mại Mạng Xã Hội Tại Việt Nam (Vietnamese Social Commerce Behavior)';
  }
  if (name.includes('street food') || name.includes('am thuc duong pho')) {
    return 'Ẩm Thực Đường Phố Việt Nam (Vietnam Street Food Culture & Business)';
  }
  if (name.includes('dược phẩm') || name.includes('retail pharmacy') || name.includes('pharmaceutical')) {
    return 'Thị Trường Bán Lẻ Dược Phẩm Việt Nam (Vietnam Pharmaceutical Retail)';
  }
  if (name.includes('paytech') || name.includes('thanh toan') || name.includes('payment')) {
    return 'Xu Hướng Thanh Toán Công Nghệ Việt Nam (Vietnam Paytech Trends)';
  }
  if (name.includes('beverage') || name.includes('bia') || name.includes('food-drink') || name.includes('nước giải khát')) {
    return 'Ngành Hàng Nước Giải Khát & Đồ Uống (Vietnam Beverage Market & Beer Industry)';
  }
  
  // Custom topic derived from clean filename
  const cleanName = fileName.replace('Copy of ', '').replace('.pdf', '');
  return `Xu Hướng Ngành: ${cleanName}`;
}

export async function GET(request) {
  // 1. Authorization Check (for Vercel Cron protection)
  const authHeader = request.headers.get('authorization');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  const isCronSecretConfigured = !!process.env.CRON_SECRET;
  
  const isSameOrigin = referer && host && (
    referer.startsWith(`http://${host}`) || 
    referer.startsWith(`https://${host}`)
  );

  if (isCronSecretConfigured && authHeader !== `Bearer ${process.env.CRON_SECRET}` && !isSameOrigin) {
    // If not matching, check if we are in development mode to allow manual testing
    if (process.env.NODE_ENV !== 'development') {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  try {
    console.log("Cron sync-drive: Fetching Google Drive files...");
    const driveFiles = await getDriveFiles();

    // 2. Fetch processed files from Supabase
    const { data: processedFiles, error: dbError } = await supabase
      .from('processed_files')
      .select('file_id');

    if (dbError) throw dbError;

    const processedIds = new Set(processedFiles.map(f => f.file_id));

    // 3. Find files that haven't been processed yet
    const newFiles = driveFiles.filter(file => !processedIds.has(file.id));

    if (newFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new files detected on Google Drive. Database is up to date."
      });
    }

    console.log(`Cron sync-drive: Found ${newFiles.length} new files on Drive. Processing the first file to prevent timeout...`);
    
    // To prevent Vercel Hobby plan timeout (10s limit), we process exactly ONE file per cron execution.
    // The remaining files will be processed in subsequent daily cron runs.
    const fileToProcess = newFiles[0];
    const topic = determineTopicFromFileName(fileToProcess.name);
    
    console.log(`Processing file: ${fileToProcess.name} -> Topic: ${topic}`);

    let fileBuffer = null;
    if (!fileToProcess.id.startsWith('1-')) {
      fileBuffer = await downloadDriveFile(fileToProcess.id);
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

    // Call Gemini API to generate quizzes
    const quizzes = await generateQuizzesFromAI(topic, fileToProcess.name, fileBuffer, existingQuestions);
    
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

    for (const quiz of quizzes) {
      const norm = normalizeQuestion(quiz.question);
      if (!existingNormalized.has(norm) && !seenInBatch.has(norm)) {
        uniqueNewQuizzes.push(quiz);
        seenInBatch.add(norm);
      } else {
        console.warn(`Skipping duplicate question: "${quiz.question}"`);
      }
    }

    if (uniqueNewQuizzes.length === 0) {
      console.warn("All generated quizzes for this file were duplicates. Skipping database insert.");
    } else {
      const quizzesToInsert = uniqueNewQuizzes.map(q => ({
        topic: topic,
        question: q.question,
        options: q.options,
        correct_option: q.correct_option,
        explanation: q.explanation,
        source_file: fileToProcess.name
      }));

      // Save quizzes to DB
      const { error: quizInsertError } = await supabase
        .from('quizzes')
        .insert(quizzesToInsert);

      if (quizInsertError) throw quizInsertError;
    }

    // Log this file as successfully processed
    const { error: processedInsertError } = await supabase
      .from('processed_files')
      .insert({
        file_id: fileToProcess.id,
        file_name: fileToProcess.name,
        status: 'processed',
        processed_at: new Date().toISOString()
      });

    if (processedInsertError) throw processedInsertError;

    return NextResponse.json({
      success: true,
      message: `Successfully sync new file: ${fileToProcess.name}. Generated 20 quizzes.`,
      remaining_new_files: newFiles.length - 1
    });

  } catch (error) {
    console.error("Cron sync-drive error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
