'use client';

import { useState, useEffect } from 'react';

// Default 10 topics proposed in the plan to display as initial blocks if database is clean
const DEFAULT_TOPICS = [
  'Thương Mại Điện Tử Việt Nam 2025 (Vietnam E-Commerce 2025)',
  'Xu Hướng Hành Vi Người Tiêu Dùng Việt Nam 2025 (Vietnam Consumer Trends 2025)',
  'Thị Trường Mỹ Phẩm & Chăm Sóc Da Việt Nam (Skincare & Cosmetics Market)',
  'Xu Hướng Mua Sắm & Tăng Trưởng Thương Hiệu Tết 2026 (Vietnam Tet 2026 Insights)',
  'Thị Trường Chuỗi Coffee Shop Tại Việt Nam (Vietnam Coffee Shop Chains H1/2025)',
  'Thương Mại Mạng Xã Hội Tại Việt Nam (Vietnamese Social Commerce Behavior)',
  'Ẩm Thực Đường Phố Việt Nam (Vietnam Street Food Culture & Business)',
  'Thị Trường Bán Lẻ Dược Phẩm Việt Nam (Vietnam Pharmaceutical Retail)',
  'Xu Hướng Thanh Toán Công Nghệ Việt Nam (Vietnam Paytech Trends)',
  'Ngành Hàng Nước Giải Khát & Đồ Uống (Vietnam Beverage Market & Beer Industry)'
];

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
  const [customTopicName, setCustomTopicName] = useState(DEFAULT_TOPICS[0]);

  // Fetch topics list
  const loadTopics = async () => {
    setLoadingTopics(true);
    try {
      const res = await fetch('/api/quiz/list');
      const json = await res.json();
      if (json.success) {
        // Merge fetched topics with defaults to ensure all 10 are visible
        const dbTopicsMap = {};
        json.topics.forEach(t => { dbTopicsMap[t.name] = t.count; });
        
        const merged = DEFAULT_TOPICS.map(name => ({
          name,
          count: dbTopicsMap[name] || 0
        }));

        // Append any other topics from DB that aren't in default list
        json.topics.forEach(t => {
          if (!DEFAULT_TOPICS.includes(t.name)) {
            merged.push({ name: t.name, count: t.count });
          }
        });

        setTopics(merged);
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
  const handleGenerateQuizzes = async (e) => {
    if (e) e.preventDefault();
    if (!selectedFileName) return;

    setGenerating(true);
    setFeedback('');
    
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: customTopicName,
          fileName: selectedFileName,
          fileId: selectedFileId
        })
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(`✅ Đã tạo thành công ${json.quizzes.length} câu hỏi mới cho chủ đề!`);
        if (selectedTopic === customTopicName) {
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

  return (
    <div>
      {/* 1. Header Area */}
      <header style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {selectedTopic && (
          <button onClick={handleBack} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            ⬅️ Quay lại
          </button>
        )}
        <div>
          <h1 style={{ margin: 0 }}>{selectedTopic ? 'Chi Tiết Câu Hỏi' : 'Quản Lý Quiz Thị Trường'}</h1>
          <p style={{ marginTop: '4px' }}>
            {selectedTopic ? `Danh sách câu hỏi của chủ đề: ${selectedTopic}` : 'Tạo, quản lý và duyệt câu hỏi trắc nghiệm dựa trên các báo cáo.'}
          </p>
        </div>
      </header>

      {/* Action feedback banner */}
      {feedback && (
        <div className="glass-card" style={{ marginBottom: '24px', borderLeft: '5px solid var(--success)', background: '#ffffff' }}>
          <p style={{ fontWeight: '600', margin: 0, color: 'var(--text-main)' }}>{feedback}</p>
        </div>
      )}

      {/* 2. Primary Page Content */}
      {!selectedTopic ? (
        // STATE 1: List of Topics & Generator Form
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'flex-start' }}>
            
            {/* Left side: AI Quiz Generator Form */}
            <div className="glass-card">
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
                          {file.status === 'processed' ? '✅' : '⏳'} {file.name.replace('Copy of ', '')}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Topic selection mapping */}
                <div className="form-group">
                  <label className="form-label">Chủ đề gán cho Quiz:</label>
                  <select 
                    className="form-select" 
                    value={customTopicName} 
                    onChange={(e) => setCustomTopicName(e.target.value)}
                    required
                  >
                    {DEFAULT_TOPICS.map((t, idx) => (
                      <option key={idx} value={t}>{t}</option>
                    ))}
                    <option value="Khác">-- Tạo chủ đề mới (dựa theo tên file) --</option>
                  </select>
                </div>

                {customTopicName === 'Khác' && (
                  <div className="form-group">
                    <label className="form-label">Nhập tên chủ đề mới:</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ví dụ: Xu hướng Thời trang 2026" 
                      value={customTopicName === 'Khác' ? '' : customTopicName}
                      onChange={(e) => setCustomTopicName(e.target.value)}
                      required
                    />
                  </div>
                )}

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

            {/* Right side: Grid of existing Topics */}
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>📁 Danh Sách Chủ Đề Hiện Tại</h2>
              {loadingTopics ? (
                <p style={{ color: 'var(--text-muted)' }}>Đang tải danh sách chủ đề...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {topics.map((topic, index) => (
                    <div key={index} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', lineHeight: '1.4', marginBottom: '8px', color: topic.count > 0 ? 'var(--primary)' : 'var(--text-main)' }}>
                          {topic.name}
                        </h3>
                        <span className={`badge ${topic.count > 0 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                          {topic.count > 0 ? `${topic.count} câu hỏi` : 'chưa có câu hỏi'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleSelectTopic(topic.name)} 
                        className="btn btn-secondary" 
                        style={{ marginTop: '16px', width: '100%', fontSize: '0.85rem', padding: '8px' }}
                      >
                        {topic.count > 0 ? '🔍 Xem danh sách Quiz' : '⚙️ Sinh câu hỏi trước'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        // STATE 2: List of Quiz questions for selected topic
        <div>
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

                <button 
                  onClick={() => {
                    const matchedFile = driveFiles.find(f => f.status === 'processed') || driveFiles[0];
                    if (matchedFile) {
                      setSelectedFileId(matchedFile.id);
                      setSelectedFileName(matchedFile.name);
                      setCustomTopicName(selectedTopic);
                      handleGenerateQuizzes();
                    }
                  }} 
                  disabled={generating}
                  className="btn btn-primary"
                >
                  {generating ? '🔄 Đang sinh...' : '✨ Sinh thêm 20 câu hỏi bằng AI'}
                </button>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <span style={{ fontWeight: '800', color: 'var(--primary-light)', fontSize: '0.9rem' }}>CÂU HỎI {index + 1} (Mã: Q_{shortId})</span>
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
