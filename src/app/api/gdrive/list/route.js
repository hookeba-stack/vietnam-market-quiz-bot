// API Route to list Google Drive files with their processing status
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDriveFiles } from '@/lib/gdrive';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
  }

  try {
    // 1. Fetch files from Drive
    const driveFiles = await getDriveFiles();

    // 2. Fetch processed files status from DB
    const { data: processed, error } = await supabase
      .from('processed_files')
      .select('*');

    if (error) throw error;

    const processedMap = {};
    processed.forEach(item => {
      processedMap[item.file_id] = item.status;
    });

    // 3. Merge status
    const filesWithStatus = driveFiles.map(file => ({
      id: file.id,
      name: file.name,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      status: processedMap[file.id] || 'pending' // 'processed', 'failed', or 'pending'
    }));

    return NextResponse.json({
      success: true,
      files: filesWithStatus
    });

  } catch (error) {
    console.error('Drive listing API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
