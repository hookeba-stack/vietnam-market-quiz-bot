// Cron API Route to send scheduled quizzes to Zalo groups or users
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendQuizToZalo } from '@/lib/zalo';

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
    if (process.env.NODE_ENV !== 'development') {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  try {
    const webappUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://quiz-market-zalo.vercel.app';
    console.log("Cron send-quiz: Checking for active schedules...");

    // Get force parameter for testing
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // 2. Get active schedules (filter by next_send_at unless force=true)
    let query = supabase.from('schedules').select('*').eq('is_active', true);
    if (!force) {
      const nowStr = new Date().toISOString();
      query = query.lte('next_send_at', nowStr);
    }
    
    const { data: schedules, error: schedError } = await query;

    if (schedError) throw schedError;

    if (schedules.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active quiz schedules due at this time."
      });
    }

    const results = [];

    // 3. Process each schedule
    for (const schedule of schedules) {
      console.log(`Processing schedule for Chat ID: ${schedule.chat_id}, Topic: ${schedule.topic}`);

      // a. Get quizzes for this topic (or all quizzes if random)
      let quizzes = [];
      let quizError = null;

      if (schedule.topic === '__random__') {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*');
        quizzes = data || [];
        quizError = error;
      } else {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('topic', schedule.topic);
        quizzes = data || [];
        quizError = error;
      }

      if (quizError) {
        console.error(`Error fetching quizzes for topic ${schedule.topic}:`, quizError.message);
        continue;
      }

      if (quizzes.length === 0) {
        console.warn(`No quizzes found for topic ${schedule.topic}`);
        continue;
      }

      // b. Get logs of quizzes already sent to this chat_id
      const { data: sentLogs, error: logError } = await supabase
        .from('delivery_logs')
        .select('quiz_id')
        .eq('chat_id', schedule.chat_id)
        .eq('status', 'success');

      if (logError) {
        console.error(`Error fetching delivery logs for ${schedule.chat_id}:`, logError.message);
        continue;
      }

      const sentQuizIds = new Set(sentLogs.map(l => l.quiz_id));

      // c. Find the first quiz that hasn't been sent yet
      let quizToSend = quizzes.find(q => !sentQuizIds.has(q.id));

      // Fallback: If all quizzes have been sent, pick a random one
      if (!quizToSend) {
        console.log(`All quizzes sent for topic ${schedule.topic} to chat ${schedule.chat_id}. Re-sending a random one.`);
        quizToSend = quizzes[Math.floor(Math.random() * quizzes.length)];
      }

      // d. Send Quiz to Zalo Bot
      console.log(`Sending Quiz ID ${quizToSend.id} to Chat ID ${schedule.chat_id}...`);
      const sendResult = await sendQuizToZalo(schedule.chat_id, quizToSend, webappUrl);

      // e. Log delivery status
      const logData = {
        quiz_id: quizToSend.id,
        chat_id: schedule.chat_id,
        sent_at: new Date().toISOString(),
        status: sendResult.success ? 'success' : 'failed',
        error_message: sendResult.success ? null : sendResult.error
      };

      const { error: insertLogError } = await supabase
        .from('delivery_logs')
        .insert(logData);

      if (insertLogError) {
        console.error(`Failed to insert delivery log into Supabase:`, insertLogError.message);
      }

      // f. Update schedule last_sent_at and calculate next_send_at
      // Parse hour and minute from cron_expression (format: "MM HH * * *")
      let targetHour = 9;
      let targetMinute = 0;
      if (schedule.cron_expression) {
        const parts = schedule.cron_expression.split(' ');
        if (parts.length >= 2) {
          targetMinute = parseInt(parts[0]) || 0;
          targetHour = parseInt(parts[1]) || 9;
        }
      }

      // Calculate next run time on the next day in Vietnam Time (UTC+7)
      const now = new Date();
      // Current time in Vietnam (add 7 hours)
      const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      
      // Set target hour & minute on Vietnam time
      const targetVnTime = new Date(vnTime);
      targetVnTime.setUTCHours(targetHour, targetMinute, 0, 0);
      
      // Add exactly 1 day since this send is completed
      targetVnTime.setUTCDate(targetVnTime.getUTCDate() + 1);
      
      // Convert back to UTC (subtract 7 hours)
      const nextSendDate = new Date(targetVnTime.getTime() - 7 * 60 * 60 * 1000);

      await supabase
        .from('schedules')
        .update({
          last_sent_at: new Date().toISOString(),
          next_send_at: nextSendDate.toISOString()
        })
        .eq('id', schedule.id);

      results.push({
        chat_id: schedule.chat_id,
        quiz_id: quizToSend.id,
        topic: schedule.topic,
        status: sendResult.success ? 'success' : 'failed',
        error: sendResult.success ? null : sendResult.error
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} schedules`,
      details: results
    });

  } catch (error) {
    console.error("Cron send-quiz error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
