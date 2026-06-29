// API Route to fetch quiz list or quiz topics
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic');

  try {
    if (topic) {
      // 1. Fetch detailed quizzes for a specific topic
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('topic', topic)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        quizzes: data || []
      });
    } else {
      // 2. Fetch list of unique topics with question counts
      const { data, error } = await supabase
        .from('quizzes')
        .select('topic');

      if (error) throw error;

      // Group and count topics
      const topicCounts = {};
      data.forEach(item => {
        topicCounts[item.topic] = (topicCounts[item.topic] || 0) + 1;
      });

      const uniqueTopics = Object.keys(topicCounts).map(name => ({
        name,
        count: topicCounts[name]
      }));

      return NextResponse.json({
        success: true,
        topics: uniqueTopics
      });
    }
  } catch (error) {
    console.error('Quiz list API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
