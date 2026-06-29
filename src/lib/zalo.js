// Service to interact with Zalo Bot Platform HTTP API
// Reference: https://bot.zaloplatforms.com/docs/build-your-bot/

const BASE_URL = 'https://bot-api.zaloplatforms.com';

function getBotToken() {
  const token = process.env.ZALO_BOT_TOKEN || '573853085825137296:itiJlHBZaklPOEQHlDYRLOgHjcjiCMcsePZHjuldUCcAMtfNhipaINKQuTuCtDLo';
  return token;
}

/**
 * Sends a raw text message to a Zalo chat_id
 * @param {string} chatId - Target chat ID (user or group)
 * @param {string} text - Message text content
 */
export async function sendZaloMessage(chatId, text) {
  const token = getBotToken();
  const url = `${BASE_URL}/bot${token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.description || `HTTP ${response.status} Error`);
    }

    return {
      success: true,
      result: data.result
    };
  } catch (error) {
    console.error(`Failed to send Zalo message to ${chatId}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format and send a Quiz to a Zalo chat_id
 * @param {string} chatId - Target chat ID
 * @param {Object} quiz - Quiz object from DB
 * @param {string} webappUrl - Base URL of our Webapp for links
 */
export async function sendQuizToZalo(chatId, quiz, webappUrl = '') {
  // Convert UUID or ID to a shorter reference if needed, or use first 6 chars
  const shortId = quiz.id ? quiz.id.substring(0, 8) : 'TEMP';
  
  const formattedText = `📝 HỌC TẬP THỊ TRƯỜNG CÙNG BOT 📝
📌 Chủ đề: ${quiz.topic}
${quiz.source_file ? `📖 Nguồn: ${quiz.source_file.replace('.pdf', '')}` : ''}

❓ Câu hỏi: ${quiz.question}

${quiz.options.join('\n')}

💡 Hướng dẫn trả lời:
👉 Soạn cú pháp: Q_${shortId} [Đáp án] (Ví dụ: Q_${shortId} A) gửi trực tiếp cho Bot này.
👉 Hoặc xem bảng thống kê & đáp án tại Webapp: ${webappUrl}/quiz`;

  return sendZaloMessage(chatId, formattedText);
}
