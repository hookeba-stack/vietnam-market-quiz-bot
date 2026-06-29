// API Route to fetch delivery logs and user responses history
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  try {
    // 1. Fetch delivery logs (joined with quizzes to display question preview)
    const { data: deliveryLogs, error: deliveryErr } = await supabase
      .from('delivery_logs')
      .select('*, quizzes(topic, question)')
      .order('sent_at', { ascending: false })
      .limit(100); // limit to last 100 entries

    // 2. Fetch user responses (joined with quizzes to display question preview)
    const { data: userResponses, error: responseErr } = await supabase
      .from('user_responses')
      .select('*, quizzes(topic, question, correct_option)')
      .order('answered_at', { ascending: false })
      .limit(100); // limit to last 100 entries

    if (deliveryErr || responseErr) {
      throw new Error(deliveryErr?.message || responseErr?.message || "Failed to query logs");
    }

    return NextResponse.json({
      success: true,
      deliveryLogs: deliveryLogs || [],
      userResponses: userResponses || []
    });

  } catch (error) {
    console.error('Fetch logs API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
