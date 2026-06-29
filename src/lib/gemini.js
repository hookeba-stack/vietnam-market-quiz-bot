// Service to interact with Google Gemini API using @google/genai SDK
import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client.
// Note: Next.js reads process.env.GEMINI_API_KEY, but we pass it explicitly to ensure compatibility.
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generates 20 quizzes based on a report title and optional PDF file buffer.
 * If fileBuffer is provided, it uploads the document context.
 * Otherwise, it leverages the model's market knowledge and search capability.
 * 
 * @param {string} topic - The topic name (e.g. "Vietnam E-Commerce 2025")
 * @param {string} fileName - Name of the report file
 * @param {Buffer} [fileBuffer] - Optional PDF file content
 */
export async function generateQuizzesFromAI(topic, fileName, fileBuffer = null) {
  const ai = getGeminiClient();
  
  const promptText = `
Bạn là chuyên gia phân tích dữ liệu thị trường và hành vi người tiêu dùng tại Việt Nam.
Hãy đọc báo cáo "${fileName}" liên quan đến chủ đề "${topic}".
Nhiệm vụ của bạn là tạo ra đúng 20 câu hỏi trắc nghiệm (quiz) chất lượng cao, mang tính thực tế và chuyên nghiệp dựa trên báo cáo này.

Yêu cầu cho mỗi câu hỏi trắc nghiệm:
1. Câu hỏi và giải thích phải viết bằng Tiếng Việt chuẩn.
2. Có đúng 4 phương án lựa chọn: A, B, C, D. Các phương án phải bắt đầu bằng tiền tố tương ứng: "A. [nội dung]", "B. [nội dung]", "C. [nội dung]", "D. [nội dung]".
3. Phải xác định rõ đáp án đúng (chỉ chọn một trong các chữ cái: "A", "B", "C", "D").
4. Có phần giải thích chi tiết, nêu bật số liệu hoặc kết luận thực tế từ báo cáo để người học hiểu lý do vì sao đáp án đó đúng.
5. Câu hỏi phải bao phủ nhiều khía cạnh khác nhau của báo cáo (xu hướng, số liệu chính, hành vi người dùng, dự báo tương lai).
`;

  const contents = [];
  
  // If PDF file buffer is provided, append it as inlineData
  if (fileBuffer) {
    contents.push({
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: 'application/pdf'
      }
    });
  }
  
  contents.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // gemini-1.5-flash is perfect for cost-efficiency and fast structured output
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          description: 'Danh sách 20 câu hỏi trắc nghiệm',
          items: {
            type: 'OBJECT',
            properties: {
              question: { type: 'STRING', description: 'Câu hỏi trắc nghiệm tiếng Việt' },
              options: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description: 'Danh sách đúng 4 lựa chọn, bắt đầu bằng "A. ", "B. ", "C. ", "D. "'
              },
              correct_option: { type: 'STRING', description: 'Lựa chọn đúng: "A", "B", "C", hoặc "D"' },
              explanation: { type: 'STRING', description: 'Giải thích chi tiết kết quả dựa trên số liệu hoặc nội dung báo cáo' }
            },
            required: ['question', 'options', 'correct_option', 'explanation']
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const quizzes = JSON.parse(responseText);
    
    // Quick validation to ensure format safety
    if (!Array.isArray(quizzes)) {
      throw new Error("Generated response is not a JSON Array");
    }

    return quizzes.map(q => ({
      question: q.question,
      options: q.options || [],
      correct_option: q.correct_option,
      explanation: q.explanation
    }));
  } catch (error) {
    console.error("Gemini quiz generation failed:", error);
    throw error;
  }
}
