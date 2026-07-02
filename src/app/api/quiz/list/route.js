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

export async function DELETE(request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const topic = searchParams.get('topic');

  try {
    if (id) {
      // 1. Delete a single quiz question
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Đã xóa câu hỏi thành công!'
      });
    } else if (topic) {
      // 2. Fetch source files of the quizzes in this topic
      const { data: quizzesToDelete, error: fetchErr } = await supabase
        .from('quizzes')
        .select('source_file')
        .eq('topic', topic);

      if (!fetchErr && quizzesToDelete) {
        // Reset Drive file status in processed_files so they can be re-analyzed
        const sourceFiles = [...new Set(quizzesToDelete.map(q => q.source_file).filter(Boolean))];
        if (sourceFiles.length > 0) {
          await supabase
            .from('processed_files')
            .delete()
            .in('file_name', sourceFiles);
        }
      }

      // 3. Delete all quizzes of the topic
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('topic', topic);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Đã xóa toàn bộ câu hỏi thuộc chủ đề '${topic}'!`
      });
    } else {
      return NextResponse.json({ error: 'Thiếu tham số id hoặc topic' }, { status: 400 });
    }
  } catch (error) {
    console.error('Quiz delete API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
