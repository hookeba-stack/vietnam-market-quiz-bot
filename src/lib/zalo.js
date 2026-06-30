// Service to interact with Zalo Bot Platform HTTP API
// Reference: https://bot.zaloplatforms.com/docs/build-your-bot/

const BASE_URL = 'https://bot-api.zaloplatforms.com';

function getBotToken() {
  const token = process.env.ZALO_BOT_TOKEN || '573853085825137296:itiJlHBZaklPOEQHlDYRLOgHjcjiCMcsePZHjuldUCcAMtfNhipaINKQuTuCtDLo';
  return token;
}

export function cleanSourceFile(filename) {
  if (!filename) return '';
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/^copy\s+of\s+/i, '')
    .replace(/\s+shared\s+by\s+.*$/i, '')
    .trim();
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
  const formattedText = `${quiz.source_file ? `📖 Nguồn: ${cleanSourceFile(quiz.source_file)}\n\n` : ''}❓ Câu hỏi: ${quiz.question}

${quiz.options.join('\n')}`;

  return sendZaloMessage(chatId, formattedText);
}
