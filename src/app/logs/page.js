'use client';

import { useState, useEffect } from 'react';

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState('delivery'); // 'delivery' or 'responses'
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [userResponses, setUserResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      const json = await res.json();
      if (json.success) {
        setDeliveryLogs(json.deliveryLogs);
        setUserResponses(json.userResponses);
      }
    } catch (err) {
      console.error("Failed to load logs and interaction history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      {/* Header */}
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Nhật Ký Lịch Sử</h1>
          <p style={{ marginTop: '4px' }}>Theo dõi lịch sử gửi tin và tương tác từ người dùng trên Zalo Bot.</p>
        </div>
        <button onClick={fetchLogs} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          🔄 Tải lại dữ liệu
        </button>
      </header>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('delivery')} 
          className={`btn ${activeTab === 'delivery' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          📜 Nhật ký gửi Zalo Bot
        </button>
        <button 
          onClick={() => setActiveTab('responses')} 
          className={`btn ${activeTab === 'responses' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 20px', fontSize: '0.9rem' }}
        >
          🎯 Lịch sử tương tác người dùng
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu lịch sử...</p>
      ) : (
        <div className="glass-card">
          {activeTab === 'delivery' ? (
            // TAB 1: Delivery Logs
            <div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>📜 Lịch Sử Gửi Quiz Gần Đây</h2>
              {deliveryLogs.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Chưa ghi nhận lịch sử gửi Quiz nào.</p>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Chủ đề</th>
                        <th>Nội dung câu hỏi</th>
                        <th>Chat ID người nhận</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            {new Date(log.sent_at).toLocaleString('vi-VN')}
                          </td>
                          <td style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--primary)' }}>
                            {log.quizzes?.topic}
                          </td>
                          <td style={{ fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.quizzes?.question}
                          </td>
                          <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{log.chat_id}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className={`badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}`} style={{ width: 'fit-content' }}>
                                {log.status === 'success' ? 'Thành công' : 'Lỗi'}
                              </span>
                              {log.error_message && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--danger)', maxWidth: '150px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {log.error_message}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            // TAB 2: User Responses
            <div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>🎯 Câu Trả Lời Trắc Nghiệm Nhận Được</h2>
              {userResponses.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Chưa nhận được câu trả lời nào từ Zalo.</p>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Người dùng (Zalo ID)</th>
                        <th>Nội dung câu hỏi</th>
                        <th style={{ textAlign: 'center' }}>Lựa chọn</th>
                        <th style={{ textAlign: 'center' }}>Đáp án đúng</th>
                        <th style={{ textAlign: 'center' }}>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userResponses.map((resp) => (
                        <tr key={resp.id}>
                          <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                            {new Date(resp.answered_at).toLocaleString('vi-VN')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{resp.user_name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontFamily: 'monospace' }}>ID: {resp.user_id}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {resp.quizzes?.question}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '800' }}>
                            <span style={{ display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', fontSize: '0.85rem' }}>
                              {resp.selected_option}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--success)' }}>
                            <span style={{ display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', fontSize: '0.85rem' }}>
                              {resp.quizzes?.correct_option}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${resp.is_correct ? 'badge-success' : 'badge-danger'}`}>
                              {resp.is_correct ? 'Chính xác' : 'Sai'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
