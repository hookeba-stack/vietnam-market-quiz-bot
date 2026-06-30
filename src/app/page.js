'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch dashboard stats on load
  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Action: Manually sync Drive
  const handleSyncDrive = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const res = await fetch('/api/cron/sync-drive');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setMessage(`✅ Đồng bộ Drive thành công! ${json.message}`);
        fetchDashboardStats();
      } else {
        setMessage(`❌ Lỗi đồng bộ: ${json.error || 'Vui lòng kiểm tra API Key'}`);
      }
    } catch (err) {
      setMessage(`❌ Lỗi kết nối API: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Action: Manually trigger quiz delivery
  const handleSendQuiz = async () => {
    setSending(true);
    setMessage('');
    try {
      const res = await fetch('/api/cron/send-quiz');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setMessage(`✅ Gửi Quiz thành công! ${json.message}`);
        fetchDashboardStats();
      } else {
        setMessage(`❌ Lỗi gửi: ${json.error || 'Chưa cấu hình Schedules'}`);
      }
    } catch (err) {
      setMessage(`❌ Lỗi kết nối API: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid rgba(59,130,246,0.1)', borderTop: '4px solid var(--primary-light)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Đang tải dữ liệu thống kê...</p>
        <style jsx>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const stats = data?.stats || {
    totalQuizzes: 0,
    totalProcessedFiles: 0,
    totalDriveFiles: 31,
    totalSchedules: 0,
    totalResponses: 0,
    correctCount: 0,
    incorrectCount: 0,
    accuracyRate: 0
  };

  return (
    <div>
      {/* 1. Header Section */}
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Dashboard Quản Trị</h1>
          <p style={{ marginTop: '4px' }}>Tổng quan hoạt động tự động hóa tạo Quiz và gửi Zalo Bot.</p>
        </div>
        
        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleSyncDrive} 
            disabled={syncing}
            className="btn btn-secondary"
          >
            {syncing ? '🔄 Đang quét...' : '🔍 Đồng bộ Google Drive'}
          </button>
          <button 
            onClick={handleSendQuiz} 
            disabled={sending}
            className="btn btn-primary"
          >
            {sending ? '📤 Đang gửi...' : '🚀 Kích hoạt Gửi Quiz'}
          </button>
        </div>
      </header>

      {/* 2. Toast feedback message */}
      {message && (
        <div className="glass-card" style={{ marginBottom: '24px', padding: '16px', borderLeft: '5px solid var(--primary-light)', background: 'rgba(255, 255, 255, 0.95)' }}>
          <p style={{ fontWeight: '600', margin: 0, color: 'var(--text-main)' }}>{message}</p>
        </div>
      )}

      {/* 3. Main Stats Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '2.5rem', background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: 'var(--border-radius-sm)' }}>📝</div>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tổng số Quiz</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)', margin: '4px 0 0' }}>{stats.totalQuizzes}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '2.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: 'var(--border-radius-sm)' }}>📂</div>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Báo cáo đã đọc</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--success)', margin: '4px 0 0' }}>
              {stats.totalProcessedFiles} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>/ {stats.totalDriveFiles} file</span>
            </h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '2.5rem', background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: 'var(--border-radius-sm)' }}>⏰</div>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Lịch gửi chạy</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--warning)', margin: '4px 0 0' }}>{stats.totalSchedules}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '2.5rem', background: 'rgba(13, 148, 136, 0.1)', padding: '16px', borderRadius: 'var(--border-radius-sm)' }}>🎯</div>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Độ chính xác Zalo</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--secondary)', margin: '4px 0 0' }}>{stats.accuracyRate}%</h3>
          </div>
        </div>

      </section>

      {/* 4. Accuracy & Logs Section */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px', marginBottom: '32px' }}>
        
        {/* Left side: Delivery History */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>📜 Nhật Ký Gửi Quiz Zalo</h2>
          {data?.recentLogs.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Chưa có quiz nào được gửi đi.</p>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Chủ đề</th>
                    <th>Chat ID</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }}>
                        {log.quizzes?.topic || 'Không xác định'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{log.chat_id}</td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(log.sent_at).toLocaleString('vi-VN')}</td>
                      <td>
                        <span className={`badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                          {log.status === 'success' ? 'Thành công' : 'Lỗi'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right side: Interactive accuracy statistics & Recent Answers */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>🎯 Tương Tác Của Người Dùng Zalo</h2>
          
          {/* Pie chart progress */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px', background: 'rgba(255,255,255,0.3)', padding: '16px', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(255,255,255,0.4)' }}>
            <div style={{ minWidth: '80px', height: '80px', borderRadius: '50%', background: `conic-gradient(var(--success) ${stats.accuracyRate}%, var(--danger) ${stats.accuracyRate}% 100%)`, display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {stats.accuracyRate}%
              </div>
            </div>
            <div style={{ flexGrow: 1 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px' }}>Tổng số câu trả lời: {stats.totalResponses}</p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: '600' }}>🟢 Đúng: {stats.correctCount}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: '600' }}>🔴 Sai: {stats.incorrectCount}</span>
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '0.95rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '700' }}>Câu trả lời mới nhận</h3>
          
          {data?.recentResponses.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>Chưa nhận được phản hồi từ Zalo.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data?.recentResponses.map((resp) => (
                <div key={resp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.4)', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(0,0,0,0.03)' }}>
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{resp.user_name}</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Đã chọn [{resp.selected_option}] cho: {resp.quizzes?.question}
                    </p>
                  </div>
                  <span className={`badge ${resp.is_correct ? 'badge-success' : 'badge-danger'}`} style={{ padding: '2px 8px', fontSize: '0.65rem' }}>
                    {resp.is_correct ? 'Đúng' : 'Sai'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </section>
    </div>
  );
}
