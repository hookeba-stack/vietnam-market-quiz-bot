'use client';

import { useState, useEffect } from 'react';

const cleanFileName = (name) => {
  if (!name) return '';
  return name
    .replace(/^Copy of\s+/i, '')
    .replace(/\.pdf$/i, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');
};

export default function QuizPage() {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [driveFiles, setDriveFiles] = useState([]);
  
  // Loading and action states
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Form states for manual AI generation
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  // Fetch topics (files) list
  const loadTopics = async () => {
    setLoadingTopics(true);
    try {
      const res = await fetch('/api/quiz/list');
      const json = await res.json();
      if (json.success) {
        setTopics(json.topics || []);
      }
    } catch (err) {
      console.error("Failed to load topics:", err);
    } finally {
      setLoadingTopics(false);
    }
  };

  // Fetch detailed quizzes for a selected topic
  const loadQuizzes = async (topicName) => {
    setLoadingQuizzes(true);
    try {
      const res = await fetch(`/api/quiz/list?topic=${encodeURIComponent(topicName)}`);
      const json = await res.json();
      if (json.success) {
        setQuizzes(json.quizzes);
      }
    } catch (err) {
      console.error("Failed to load quizzes:", err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  // Fetch drive files
  const loadDriveFiles = async () => {
    try {
      const res = await fetch('/api/gdrive/list');
      const json = await res.json();
      if (json.success) {
        setDriveFiles(json.files);
        // Pre-select first pending file if available
        const firstPending = json.files.find(f => f.status === 'pending');
        if (firstPending) {
          setSelectedFileId(firstPending.id);
          setSelectedFileName(firstPending.name);
        }
      }
    } catch (err) {
      console.error("Failed to load Drive files:", err);
    }
  };

  useEffect(() => {
    loadTopics();
    loadDriveFiles();
  }, []);

  // Handle file select change
  const handleFileChange = (e) => {
    const fileId = e.target.value;
    setSelectedFileId(fileId);
    const file = driveFiles.find(f => f.id === fileId);
    if (file) {
      setSelectedFileName(file.name);
    }
  };

  // Handle selecting a topic card
  const handleSelectTopic = (topicName) => {
    setSelectedTopic(topicName);
    loadQuizzes(topicName);
  };

  // Handle back to topic list
  const handleBack = () => {
    setSelectedTopic(null);
    setQuizzes([]);
    setFeedback('');
    loadTopics();
    loadDriveFiles();
  };

  // Handle generating new quizzes via Gemini API
  const handleGenerateQuizzes = async (e, overrideParams = null) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const fileId = overrideParams ? overrideParams.fileId : selectedFileId;
    const fileName = overrideParams ? overrideParams.fileName : selectedFileName;
    const topicName = fileName;

    if (!fileName) return;

    setGenerating(true);
    setFeedback('');
    
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName,
          fileId: fileId
        })
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(`✅ Đã tạo thành công ${json.quizzes.length} câu hỏi mới cho file này!`);
        if (selectedTopic === topicName) {
          loadQuizzes(selectedTopic);
        } else {
          loadTopics();
        }
        loadDriveFiles();
      } else {
        setFeedback(`❌ Lỗi sinh quiz: ${json.error || 'Vui lòng kiểm tra lại cấu hình API'}`);
      }
    } catch (err) {
      setFeedback(`❌ Lỗi kết nối API: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Handle deleting a single quiz question
  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('❓ Bạn có chắc chắn muốn xóa câu hỏi này?')) return;
    
    try {
      const res = await fetch(`/api/quiz/list?id=${quizId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setFeedback('✅ Đã xóa câu hỏi thành công!');
        loadQuizzes(selectedTopic);
        loadTopics();
      } else {
        setFeedback(`❌ Lỗi khi xóa: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`❌ Lỗi kết nối API: ${err.message}`);
    }
  };

  // Handle deleting all quizzes for a topic
  const handleDeleteAllQuizzes = async (topicName) => {
    if (!window.confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ câu hỏi thuộc chủ đề "${topicName}"?\n\nHành động này không thể hoàn tác và sẽ khôi phục trạng thái file báo cáo tương ứng thành "Chưa đọc".`)) return;
    
    try {
      const res = await fetch(`/api/quiz/list?topic=${encodeURIComponent(topicName)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(`✅ ${json.message}`);
        handleBack();
      } else {
        setFeedback(`❌ Lỗi khi xóa: ${json.error}`);
      }
    } catch (err) {
      setFeedback(`❌ Lỗi kết nối API: ${err.message}`);
    }
  };

  return (
    <div>
      {/* 1. Header Area */}
      <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Quản Lý Quiz Thị Trường</h1>
          <p style={{ marginTop: '4px' }}>
            Tạo, quản lý và duyệt câu hỏi trắc nghiệm dựa trên các báo cáo.
          </p>
        </div>
      </header>

      {/* Action feedback banner */}
      {feedback && (
        <div className="glass-card" style={{ marginBottom: '24px', borderLeft: '5px solid var(--success)', background: '#ffffff' }}>
          <p style={{ fontWeight: '600', margin: 0, color: 'var(--text-main)' }}>{feedback}</p>
        </div>
      )}

      {/* 2. Primary Page Content: Form on top, Topic List below */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Top: AI Quiz Generator Form */}
        <div className="glass-card" style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>🤖 Sinh Quiz Mới Bằng AI</h2>
            <form onSubmit={handleGenerateQuizzes}>
              
              {/* File from Google Drive Dropdown */}
              <div className="form-group">
                <label className="form-label">Chọn file báo cáo từ Drive:</label>
                {driveFiles.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Đang tải danh sách file...</p>
                ) : (
                  <select className="form-select" value={selectedFileId} onChange={handleFileChange} required>
                    <option value="" disabled>-- Chọn báo cáo --</option>
                    {driveFiles.map(file => (
                      <option key={file.id} value={file.id}>
                        {file.status === 'processed' ? '✅' : '⏳'} {cleanFileName(file.name)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '12px' }}
                disabled={generating || !selectedFileId}
              >
                {generating ? '⚙️ Đang phân tích & tạo Quiz...' : '✨ Sinh 20 Quiz Bằng Gemini'}
              </button>
            </form>

            <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <p>💡 <b>Gợi ý:</b> Biểu tượng ⏳ hiển thị các báo cáo chưa được đọc. Chọn file chưa đọc để AI tiến hành phân tích sâu và sinh câu hỏi.</p>
            </div>
          </div>

          {/* Bottom: Grid of existing Topics */}
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>📁 Danh Sách File Báo Cáo & Câu Hỏi</h2>
            {loadingTopics ? (
              <p style={{ color: 'var(--text-muted)' }}>Đang tải danh sách file...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {topics.map((topic, index) => {
                  const isSelected = selectedTopic === topic.name;
                  return (
                    <div 
                      key={index} 
                      className="glass-card" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justify: 'space-between', 
                        minHeight: '180px',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: isSelected ? '0 8px 30px rgba(0, 0, 0, 0.12)' : 'none'
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', lineHeight: '1.4', marginBottom: '8px', color: topic.count > 0 ? 'var(--primary)' : 'var(--text-main)' }}>
                          {cleanFileName(topic.name)}
                        </h3>
                        <span className={`badge ${topic.count > 0 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                          {topic.count > 0 ? `${topic.count} câu hỏi` : 'chưa có câu hỏi'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleSelectTopic(topic.name)} 
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`} 
                        style={{ marginTop: '16px', width: '100%', fontSize: '0.85rem', padding: '8px' }}
                      >
                        {topic.count > 0 ? (isSelected ? '👀 Đang xem chi tiết' : '🔍 Xem danh sách Quiz') : '⚙️ Sinh câu hỏi trước'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

      </div>

      {/* 3. Quiz Questions Detail Section Below */}
      {selectedTopic && (
        <div style={{ marginTop: '48px', borderTop: '2px dashed rgba(0,0,0,0.1)', paddingTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-main)' }}>📋 Chi tiết câu hỏi: {cleanFileName(selectedTopic)}</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>Danh sách câu hỏi trắc nghiệm của file báo cáo được tải chi tiết bên dưới.</p>
            </div>
            <button onClick={handleBack} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              ❌ Đóng / Ẩn danh sách
            </button>
          </div>

          {loadingQuizzes ? (
            <p style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu câu hỏi...</p>
          ) : (
            <div>
              {/* Actions panel */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--success)' }}>🟢</span>
                  <span style={{ fontWeight: '700' }}>Tổng số: {quizzes.length} câu hỏi đang hoạt động</span>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => handleDeleteAllQuizzes(selectedTopic)} 
                    disabled={generating || quizzes.length === 0}
                    className="btn"
                    style={{ 
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: 'var(--danger)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--danger)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                      e.currentTarget.style.color = 'var(--danger)';
                    }}
                  >
                    🗑️ Xóa toàn bộ câu hỏi
                  </button>

                  <button 
                    onClick={() => {
                      // Find file for this topic
                      const matchedFile = driveFiles.find(f => f.name === selectedTopic) || driveFiles[0];

                      if (matchedFile) {
                        setSelectedFileId(matchedFile.id);
                        setSelectedFileName(matchedFile.name);
                        
                        // Pass explicitly to bypass React state latency
                        handleGenerateQuizzes(null, {
                          fileId: matchedFile.id,
                          fileName: matchedFile.name,
                          topic: selectedTopic
                        });
                      }
                    }} 
                    disabled={generating}
                    className="btn btn-primary"
                  >
                    {generating ? '🔄 Đang sinh...' : '✨ Sinh thêm 20 câu hỏi bằng AI'}
                  </button>
                </div>
              </div>

              {/* Quizzes List rendering */}
              {quizzes.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Chưa có câu hỏi trắc nghiệm nào cho chủ đề này.</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginTop: '8px' }}>Bạn hãy chọn một file báo cáo liên quan ở trang danh sách và bấm sinh Quiz.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {quizzes.map((quiz, index) => {
                    const shortId = quiz.id ? quiz.id.substring(0, 8) : 'TEMP';
                    return (
                      <div key={quiz.id || index} className="glass-card" style={{ background: '#ffffff', borderLeft: '5px solid var(--primary-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: '800', color: 'var(--primary-light)', fontSize: '0.9rem' }}>CÂU HỎI {index + 1} (Mã: Q_{shortId})</span>
                            <button 
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--danger)', 
                                cursor: 'pointer', 
                                fontSize: '0.85rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Xóa câu hỏi này"
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                          {quiz.source_file && (
                            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                              📄 {quiz.source_file.replace('Copy of ', '')}
                            </span>
                          )}
                        </div>
                        
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px', lineHeight: '1.5' }}>
                          {quiz.question}
                        </h3>

                        {/* Options list */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                          {quiz.options.map((opt, optIdx) => {
                            const optionChar = opt.trim().charAt(0);
                            const isCorrect = optionChar === quiz.correct_option;
                            return (
                              <div 
                                key={optIdx} 
                                style={{ 
                                  padding: '12px 16px', 
                                  borderRadius: 'var(--border-radius-sm)', 
                                  border: isCorrect ? '1px solid var(--success)' : '1px solid rgba(0,0,0,0.08)',
                                  background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 0, 0, 0.02)',
                                  fontWeight: isCorrect ? '700' : '500',
                                  color: isCorrect ? 'var(--success)' : 'var(--text-main)',
                                  fontSize: '0.95rem'
                                }}
                              >
                                {opt}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation block */}
                        {quiz.explanation && (
                          <div style={{ padding: '12px 16px', background: 'var(--bg-app)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', borderLeft: '3px solid var(--secondary)' }}>
                            <span style={{ fontWeight: '700', color: 'var(--secondary)' }}>💡 Giải thích đáp án đúng ({quiz.correct_option}):</span>
                            <p style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{quiz.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
