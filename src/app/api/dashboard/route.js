// API Route to fetch aggregate dashboard metrics
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDriveFiles } from '@/lib/gdrive';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({
      success: false,
      error: 'Database connection not configured'
    }, { status: 500 });
  }

  try {
    // 1. Fetch counts
    const { count: totalQuizzes, error: quizErr } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true });

    const { count: totalProcessedFiles, error: fileErr } = await supabase
      .from('processed_files')
      .select('*', { count: 'exact', head: true });

    const { count: totalSchedules, error: schedErr } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true });

    const { count: totalResponses, error: respErr } = await supabase
      .from('user_responses')
      .select('*', { count: 'exact', head: true });

    // 2. Fetch correctness count
    const { data: correctData, error: corrErr } = await supabase
      .from('user_responses')
      .select('is_correct');

    if (quizErr || fileErr || schedErr || respErr || corrErr) {
      throw new Error("Failed to query database statistics");
    }

    const correctCount = correctData.filter(r => r.is_correct).length;
    const incorrectCount = correctData.length - correctCount;

    // 3. Fetch recent delivery logs
    const { data: recentLogs, error: logErr } = await supabase
      .from('delivery_logs')
      .select('*, quizzes(topic, question)')
      .order('sent_at', { ascending: false })
      .limit(5);

    // 4. Fetch recent user responses
    const { data: recentResponses, error: rRespErr } = await supabase
      .from('user_responses')
      .select('*, quizzes(topic, question)')
      .order('answered_at', { ascending: false })
      .limit(5);

    // 5. Get current Drive file count (to compare with processed count)
    let totalDriveFiles = 31; // fallback
    try {
      const driveFiles = await getDriveFiles();
      totalDriveFiles = driveFiles.length;
    } catch (e) {
      console.warn("Could not list Google Drive files for dashboard count:", e.message);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalQuizzes: totalQuizzes || 0,
        totalProcessedFiles: totalProcessedFiles || 0,
        totalDriveFiles: totalDriveFiles,
        totalSchedules: totalSchedules || 0,
        totalResponses: totalResponses || 0,
        correctCount,
        incorrectCount,
        accuracyRate: totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0
      },
      recentLogs: recentLogs || [],
      recentResponses: recentResponses || []
    });

  } catch (error) {
    console.error('Dashboard metrics API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
