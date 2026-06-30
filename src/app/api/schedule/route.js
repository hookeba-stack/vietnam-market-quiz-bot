// API Route to manage quiz delivery schedules (CRUD)
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      schedules: data || []
    });
  } catch (error) {
    console.error('Fetch schedules API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  try {
    const { chat_id, topic, send_time } = await request.json();

    if (!chat_id || !topic) {
      return NextResponse.json({ error: 'Missing chat_id or topic' }, { status: 400 });
    }

    // Default to 9:00 AM if send_time is not specified
    const timeVal = send_time || '09:00';
    const [hourStr, minuteStr] = timeVal.split(':');
    const targetHour = parseInt(hourStr) || 9;
    const targetMinute = parseInt(minuteStr) || 0;

    // Calculate first run time in Vietnam Time (UTC+7)
    const now = new Date();
    // Convert current UTC time to Vietnam Time (add 7 hours)
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    
    // Set target hour & minute on Vietnam time
    const targetVnTime = new Date(vnTime);
    targetVnTime.setUTCHours(targetHour, targetMinute, 0, 0);
    
    // If that time has already passed in Vietnam today, move it to tomorrow
    if (targetVnTime <= vnTime) {
      targetVnTime.setUTCDate(targetVnTime.getUTCDate() + 1);
    }
    
    // Convert back to UTC (subtract 7 hours)
    const nextSendDate = new Date(targetVnTime.getTime() - 7 * 60 * 60 * 1000);
    const cronExpr = `${targetMinute} ${targetHour} * * *`;

    const { data, error } = await supabase
      .from('schedules')
      .insert({
        chat_id,
        topic,
        is_active: true,
        next_send_at: nextSendDate.toISOString(),
        cron_expression: cronExpr
      })
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      schedule: data[0]
    });
  } catch (error) {
    console.error('Create schedule API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  try {
    const { id, is_active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing schedule id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('schedules')
      .update({ is_active })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      schedule: data[0]
    });
  } catch (error) {
    console.error('Update schedule API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing schedule id' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
