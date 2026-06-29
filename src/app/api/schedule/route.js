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
    const { chat_id, topic } = await request.json();

    if (!chat_id || !topic) {
      return NextResponse.json({ error: 'Missing chat_id or topic' }, { status: 400 });
    }

    // Set first run time to tomorrow morning at 9:00 AM (local/UTC standard transition)
    const nextSendDate = new Date();
    nextSendDate.setHours(9, 0, 0, 0); // 9:00 AM today
    if (nextSendDate < new Date()) {
      nextSendDate.setDate(nextSendDate.getDate() + 1); // 9:00 AM tomorrow
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert({
        chat_id,
        topic,
        is_active: true,
        next_send_at: nextSendDate.toISOString(),
        cron_expression: '0 9 * * *' // Visual Cron representation
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
