'use client';

import { useState, useEffect } from 'react';

export default function SchedulePage() {
  const cleanFileName = (name) => {
    if (!name) return '';
    return name
      .replace(/^Copy of\s+/i, '')
      .replace(/\.pdf$/i, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ');
  };
  const [schedules, setSchedules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState('');

  // Form inputs
  const [chatId, setChatId] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('__random__');
  const [sendTime, setSendTime] = useState('09:00');
  const [adding, setAdding] = useState(false);

  // Helper to format cron expression to HH:MM
  const formatCronTime = (cronStr) => {
    if (!cronStr) return '09:00';
    if (cronStr === '0 * * * *') return 'Hàng giờ (1 tiếng/lần)';
    const parts = cronStr.split(' ');
    if (parts.length >= 2) {
      const min = parts[0].padStart(2, '0');
      const hr = parts[1].padStart(2, '0');
      return `${hr}:${min}`;
    }
    return '09:00';
  };

  // Load schedules and topics
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch schedules
      const resSched = await fetch('/api/schedule');
      const jsonSched = await resSched.json();
      if (jsonSched.success) {
        setSchedules(jsonSched.schedules);
      }

      // Fetch topics to populate dropdown
      const resTopics = await fetch('/api/quiz/list');
      const jsonTopics = await resTopics.json();
      if (jsonTopics.success) {
        setTopics(jsonTopics.topics);
        setSelectedTopic('__random__');
      }
    } catch (err) {
      console.error("Failed to load schedules configuration data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Add new schedule
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!chatId || !selectedTopic) return;

    setAdding(true);
    setActionFeedback('');
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          topic: selectedTopic,
          send_time: sendTime
        })
      });
      const json = await res.json();
      if (json.success) {
        setActionFeedback('✅ Thêm lịch gửi mới thành công!');
        setChatId('');
        loadData();
      } else {
        setActionFeedback(`❌ Lỗi: ${json.error}`);
      }
    } catch (err) {
      setActionFeedback(`❌ Lỗi kết nối: ${err.message}`);
    } finally {
      setAdding(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (id, currentStatus) => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          is_active: !currentStatus
        })
      });
      const json = await res.json();
      if (json.success) {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      }
    } catch (err) {
      console.error("Failed to toggle schedule active state:", err);
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch trình gửi này?')) return;

    setActionFeedback('');
    try {
      const res = await fetch(`/api/schedule?id=${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        setActionFeedback('🗑️ Đã xóa lịch trình thành công!');
        loadData();
      } else {
        setActionFeedback(`❌ Lỗi: ${json.error}`);
      }
    } catch (err) {
      setActionFeedback(`❌ Lỗi kết nối: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0 }}>Cấu Hình Lịch Gửi Quiz</h1>
        <p style={{ marginTop: '4px' }}>Setup các địa chỉ nhận câu hỏi trắc nghiệm qua Zalo Bot và thời gian gửi.</p>
      </header>

      {actionFeedback && (
        <div className="glass-card" style={{ marginBottom: '24px', borderLeft: '5px solid var(--primary-light)', background: '#ffffff' }}>
          <p style={{ fontWeight: '600', margin: 0, color: 'var(--text-main)' }}>{actionFeedback}</p>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Đang tải cấu hình...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Top: Add schedule form */}
          <div className="glass-card" style={{ maxWidth: '600px', width: '100%' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>⏰ Thêm Lịch Gửi Mới</h2>
            <form onSubmit={handleAddSchedule}>
              
              <div className="form-group">
                <label className="form-label">Zalo Chat ID người nhận:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Nhập ID Nhóm hoặc ID người dùng Zalo" 
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">File báo cáo trắc nghiệm:</label>
                <select 
                  className="form-select" 
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  required
                >
                  <option value="__random__">🎲 Ngẫu nhiên (Tất cả báo cáo)</option>
                  {topics.map((t, idx) => (
                    <option key={idx} value={t.name}>{cleanFileName(t.name)} ({t.count} câu hỏi)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Thời gian gửi hàng ngày:</label>
                <select 
                  className="form-select"
                  value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                  required
                >
                  <option value="hourly">⏰ Gửi hàng giờ (Cách 1 tiếng/lần)</option>
                  {Array.from({ length: 24 }).map((_, i) => {
                    const hour = String(i).padStart(2, '0');
                    const val = `${hour}:00`;
                    return (
                      <option key={val} value={val}>
                        {val} {val === '09:00' ? '(Mặc định)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '12px' }}
                disabled={adding || topics.length === 0}
              >
                {adding ? '⏳ Đang lưu...' : '⏰ Thiết lập lịch gửi'}
              </button>
            </form>

            <div style={{ marginTop: '20px', background: 'rgba(59, 130, 246, 0.04)', padding: '16px', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '6px' }}>📌 Hướng dẫn lấy Chat ID:</p>
              <ul style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '16px', lineHeight: '1.5' }}>
                <li><b>Cá nhân:</b> Chat ID là chuỗi định danh do Zalo cấp cho Bot (ví dụ: <code>adf8d5c8608589dbd094</code>), <b>không phải</b> số điện thoại hay ID số của tài khoản Zalo cá nhân. Bạn có thể tìm thấy ID này trong phần <b>Nhật ký & Lịch sử</b> &gt; tab <b>Lịch sử tương tác người dùng</b> sau khi bạn nhắn tin cho Bot.</li>
                <li><b>Nhóm:</b> Thêm bot vào nhóm, khi bot nhận được tin nhắn, Chat ID nhóm sẽ hiển thị trong phần <b>Nhật ký</b> của Dashboard. Bạn có thể copy ID đó để dán vào đây.</li>
              </ul>
            </div>
          </div>

          {/* Right side: Schedules list table */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>📋 Danh Sách Lịch Gửi</h2>
            {schedules.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Chưa cấu hình lịch trình gửi nào.</p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Người nhận (Chat ID)</th>
                      <th>Chủ đề</th>
                      <th>Giờ gửi</th>
                      <th>Gửi tiếp theo</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: '600' }}>{schedule.chat_id}</td>
                        <td style={{ fontSize: '0.9rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {schedule.topic === '__random__' ? '🎲 Ngẫu nhiên' : cleanFileName(schedule.topic)}
                        </td>
                        <td style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                          {formatCronTime(schedule.cron_expression)}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {schedule.is_active 
                            ? (schedule.next_send_at ? new Date(schedule.next_send_at).toLocaleString('vi-VN') : 'Sắp diễn ra') 
                            : 'Đang tạm dừng'
                          }
                        </td>
                        <td>
                          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={schedule.is_active} 
                              onChange={() => handleToggleActive(schedule.id, schedule.is_active)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span style={{ marginLeft: '8px', fontSize: '0.85rem', fontWeight: '600', color: schedule.is_active ? 'var(--success)' : 'var(--text-muted)' }}>
                              {schedule.is_active ? 'Bật' : 'Tắt'}
                            </span>
                          </label>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                          >
                            🗑️ Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
