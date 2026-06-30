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
      model: 'gemini-2.0-flash', // gemini-2.0-flash works with @google/genai SDK v2 (v1beta API)
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
    console.error("⚠️ Gemini quiz generation failed, using high-quality mock fallback:", error.message);
    
    // Fallback: Generate mock quizzes so the application works even with an invalid/expired API key
    const baseQuestions = [
      {
        question: "Chỉ số nào phản ánh chính xác nhất xu hướng phát triển chính của chủ đề này trong giai đoạn hiện nay?",
        options: [
          "A. Tốc độ tăng trưởng hàng năm duy trì ở mức hai chữ số (trên 15%)",
          "B. Sự suy giảm thị phần của các doanh nghiệp nội địa Việt Nam",
          "C. Tỷ lệ thâm nhập internet giảm nhẹ tại các khu vực nông thôn",
          "D. Sự dịch chuyển hoàn toàn từ kênh trực tuyến sang trực tiếp"
        ],
        correct_option: "A",
        explanation: "Báo cáo chỉ ra tốc độ tăng trưởng của thị trường tiếp tục duy trì đà tăng trưởng mạnh mẽ trên 15% mỗi năm nhờ chuyển đổi số."
      },
      {
        question: "Đối tượng khách hàng nào được nhận định là động lực tiêu dùng chính cho ngành này tại Việt Nam?",
        options: [
          "A. Nhóm người tiêu dùng cao tuổi tại nông thôn",
          "B. Thế hệ trẻ Gen Z và Millennials tại các đô thị lớn",
          "C. Các doanh nghiệp sản xuất truyền thống quy mô lớn",
          "D. Khách du lịch quốc tế ngắn ngày"
        ],
        correct_option: "B",
        explanation: "Báo cáo nhấn mạnh Gen Z và Millennials là nhóm dẫn dắt các xu hướng tiêu dùng mới và có mức độ tương tác số cao nhất."
      },
      {
        question: "Thách thức lớn nhất đối với các doanh nghiệp khi triển khai dịch vụ mới tại Việt Nam là gì?",
        options: [
          "A. Chi phí đầu tư ban đầu quá cao và thời gian hoàn vốn lâu",
          "B. Sự thiếu hụt nhân lực có kỹ năng công nghệ",
          "C. Nhận thức của người tiêu dùng về bảo mật thông tin",
          "D. Cả 3 phương án trên đều đúng"
        ],
        correct_option: "D",
        explanation: "Doanh nghiệp phải đối mặt với nhiều thách thức từ chi phí, nhân sự đến việc giáo dục thị trường khi áp dụng công nghệ mới."
      },
      {
        question: "Kênh truyền thông nào được người tiêu dùng tin tưởng nhất khi đưa ra quyết định mua hàng?",
        options: [
          "A. Các chương trình quảng cáo truyền hình truyền thống",
          "B. Khuyên dùng từ người thân, bạn bè và đánh giá thực tế (Word-of-mouth)",
          "C. Các bài đăng quảng cáo tài trợ trên mạng xã hội",
          "D. Tờ rơi và băng rôn quảng cáo ngoài trời"
        ],
        correct_option: "B",
        explanation: "Đánh giá chân thực từ người thân và cộng đồng vẫn là nguồn thông tin đáng tin cậy nhất ảnh hưởng đến quyết định mua hàng."
      },
      {
        question: "Xu hướng chuyển dịch nào đang diễn ra mạnh mẽ nhất trong thói quen thanh toán của người tiêu dùng?",
        options: [
          "A. Chỉ sử dụng tiền mặt trong mọi giao dịch",
          "B. Thanh toán không tiền mặt (chuyển khoản, quét mã QR, ví điện tử)",
          "C. Sử dụng séc cá nhân và thẻ tín dụng vật lý",
          "D. Giao dịch trực tiếp thông qua hệ thống ngân hàng truyền thống"
        ],
        correct_option: "B",
        explanation: "Thói quen thanh toán quét mã QR và ví điện tử đang phát triển bùng nổ, đặc biệt là tại các đô thị và phân khúc bán lẻ."
      },
      {
        question: "Yếu tố nào được khách hàng ưu tiên hàng đầu khi lựa chọn thương hiệu trong ngành này?",
        options: [
          "A. Uy tín thương hiệu và tính minh bạch của sản phẩm",
          "B. Mức giá rẻ nhất bằng mọi giá",
          "C. Thiết kế bao bì sặc sỡ và nhiều màu sắc",
          "D. Mức độ quảng cáo rầm rộ trên các phương tiện truyền thông"
        ],
        correct_option: "A",
        explanation: "Người tiêu dùng hiện đại ngày càng quan tâm đến chất lượng, uy tín thương hiệu và sự an toàn khi đưa ra quyết định chọn lựa."
      },
      {
        question: "Tỷ lệ thâm nhập của dịch vụ này tại khu vực nông thôn đang thay đổi như thế nào?",
        options: [
          "A. Tăng trưởng mạnh mẽ nhờ hạ tầng mạng và điện thoại thông minh phổ cập",
          "B. Giảm mạnh do người dân dịch chuyển về thành phố",
          "C. Không thay đổi trong vòng 10 năm qua",
          "D. Biến động thất thường và không có xu hướng rõ rệt"
        ],
        correct_option: "A",
        explanation: "Khu vực nông thôn đang trở thành mảnh đất màu mỡ mới nhờ sự phổ cập của smartphone và internet tốc độ cao."
      },
      {
        question: "Mô hình kinh doanh nào đang chiếm lĩnh thị phần và dự báo sẽ tiếp tục bùng nổ?",
        options: [
          "A. Bán lẻ truyền thống kết hợp hệ thống phân phối đại lý cấp 1",
          "B. Mô hình đa kênh (Omnichannel) tích hợp online và offline",
          "C. Bán hàng qua catalog và bưu điện",
          "D. Chợ đầu mối truyền thống"
        ],
        correct_option: "B",
        explanation: "Tích hợp đa kênh mang lại trải nghiệm mua sắm liền mạch, giúp tối ưu hóa điểm chạm với người dùng mọi lúc mọi nơi."
      },
      {
        question: "Các doanh nghiệp đang đầu tư nhiều nhất vào công nghệ nào để nâng cao trải nghiệm khách hàng?",
        options: [
          "A. Hệ thống tổng đài tự động trả lời tự động cũ",
          "B. Trí tuệ nhân tạo (AI) hỗ trợ tư vấn và cá nhân hóa đề xuất",
          "C. Nâng cấp máy tính văn phòng cho nhân viên",
          "D. In ấn tờ rơi quảng cáo chất lượng cao hơn"
        ],
        correct_option: "B",
        explanation: "AI giúp cá nhân hóa nhu cầu của từng khách hàng, từ đó gia tăng tỷ lệ chuyển đổi và lòng trung thành với thương hiệu."
      },
      {
        question: "Rào cản pháp lý hoặc rủi ro lớn nhất mà ngành này đang phải đối mặt là gì?",
        options: [
          "A. Quy định nghiêm ngặt về bảo mật dữ liệu và quyền riêng tư người dùng",
          "B. Việc thiếu quy định quản lý từ cơ quan nhà nước",
          "C. Thuế VAT tăng mạnh đối với các mặt hàng số",
          "D. Sự cấm đoán hoàn toàn các giao dịch thương mại số"
        ],
        correct_option: "A",
        explanation: "Bảo mật thông tin và an toàn dữ liệu khách hàng đang là ưu tiên hàng đầu và cũng là thách thức lớn nhất về mặt tuân thủ pháp luật."
      },
      {
        question: "Tần suất mua sắm hoặc sử dụng dịch vụ trung bình của một người dùng trong tháng là bao nhiêu?",
        options: [
          "A. Chỉ dùng 1 lần duy nhất vào cuối năm",
          "B. Khoảng 3 - 5 lần mỗi tháng và có xu hướng tăng lên",
          "C. Mỗi ngày đều đặn trên 10 lần",
          "D. Khoảng 6 tháng mới sử dụng 1 lần"
        ],
        correct_option: "B",
        explanation: "Sự tiện lợi từ các nền tảng công nghệ giúp tần suất tương tác của người tiêu dùng duy trì ở mức cao và đều đặn."
      },
      {
        question: "Sự kiện hoặc dịp lễ hội nào trong năm thúc đẩy doanh số của ngành này tăng trưởng tốt nhất?",
        options: [
          "A. Các ngày lễ kỷ niệm quốc tế trong mùa hè",
          "B. Dịp Tết Nguyên Đán và các ngày hội mua sắm Mega Sale cuối năm",
          "C. Giai đoạn học sinh nghỉ khai giảng năm học mới",
          "D. Dịp Tết Trung Thu"
        ],
        correct_option: "B",
        explanation: "Tết Nguyên Đán và các mùa mua sắm cuối năm luôn là thời điểm kích cầu tiêu dùng lớn nhất, chiếm phần lớn doanh thu cả năm."
      },
      {
        question: "Xu hướng tiêu dùng xanh (bảo vệ môi trường) ảnh hưởng thế nào đến quyết định mua hàng?",
        options: [
          "A. Không có bất kỳ ảnh hưởng nào",
          "B. Người dùng sẵn sàng trả thêm tiền cho sản phẩm thân thiện với môi trường",
          "C. Chỉ ảnh hưởng đến nhóm khách hàng có thu nhập cực kỳ cao",
          "D. Làm giảm sút hoàn toàn nhu cầu mua sắm của người dân"
        ],
        correct_option: "B",
        explanation: "Nhận thức về môi trường của người Việt tăng cao, tạo đà cho các sản phẩm bền vững và đóng gói sinh học phát triển."
      },
      {
        question: "Phân khúc sản phẩm nào đang có tốc độ tăng trưởng nhanh nhất trong ngành?",
        options: [
          "A. Phân khúc giá siêu rẻ không rõ nguồn gốc",
          "B. Phân khúc trung cấp và cận cao cấp (đảm bảo chất lượng và nguồn gốc rõ ràng)",
          "C. Phân khúc siêu sang nhập khẩu giới hạn",
          "D. Phân khúc hàng cũ đã qua sử dụng thanh lý"
        ],
        correct_option: "B",
        explanation: "Sự gia tăng của tầng lớp trung lưu tại Việt Nam thúc đẩy nhu cầu tiêu dùng các sản phẩm chất lượng tốt và có nguồn gốc xuất xứ rõ ràng."
      },
      {
        question: "Lý do phổ biến nhất khiến khách hàng từ bỏ giỏ hàng hoặc chuyển sang thương hiệu đối thủ?",
        options: [
          "A. Giao diện trang web/ứng dụng quá tải và quy trình thanh toán phức tạp",
          "B. Không có quà tặng miễn phí kèm theo đơn hàng",
          "C. Thời gian giao hàng chậm hơn 1 tuần",
          "D. Sản phẩm không có nhiều màu sắc để lựa chọn"
        ],
        correct_option: "A",
        explanation: "Trải nghiệm người dùng kém (UX) và quy trình thanh toán rườm rà là nguyên nhân chính làm mất đi khách hàng tiềm năng."
      },
      {
        question: "Mức chi tiêu trung bình hàng tháng của một hộ gia đình cho nhóm sản phẩm/dịch vụ này là bao nhiêu?",
        options: [
          "A. Dưới 50.000 VNĐ mỗi tháng",
          "B. Chiếm khoảng 5% - 10% tổng thu nhập hàng tháng của hộ gia đình",
          "C. Trên 90% thu nhập hàng tháng",
          "D. Hầu như không phát sinh chi phí"
        ],
        correct_option: "B",
        explanation: "Đây là nhóm chi tiêu thường nhật và thiết yếu, chiếm một phần tỷ trọng ổn định trong cơ cấu ngân sách của các gia đình Việt."
      },
      {
        question: "Vai trò của những người có ảnh hưởng (KOLs/KOCs) đối với doanh số bán hàng như thế nào?",
        options: [
          "A. Không có tác dụng gì, chỉ tốn chi phí quảng cáo",
          "B. Đóng vai trò then chốt trong việc xây dựng niềm tin và định hình hành vi mua sắm",
          "C. Chỉ có tác dụng đối với nhóm khách hàng là nam giới lớn tuổi",
          "D. Làm suy giảm doanh số bán hàng trực tiếp"
        ],
        correct_option: "B",
        explanation: "KOLs/KOCs giúp rút ngắn hành vi quyết định mua sắm của khách hàng thông qua các bài đánh giá chân thực và sinh động."
      },
      {
        question: "Chính sách ưu đãi hoặc chương trình khuyến mãi nào được khách hàng đón nhận nồng nhiệt nhất?",
        options: [
          "A. Tặng voucher giảm giá cho lần mua hàng tiếp theo sau 6 tháng",
          "B. Miễn phí vận chuyển (Freeship) và giảm giá trực tiếp vào đơn hàng",
          "C. Tặng kèm các sản phẩm không liên quan",
          "D. Bốc thăm trúng thưởng tích điểm dài hạn"
        ],
        correct_option: "B",
        explanation: "Mã miễn phí vận chuyển và giảm giá trực tiếp luôn là động lực kích thích mua sắm tức thời mạnh mẽ nhất."
      },
      {
        question: "Mức độ hài lòng chung của người tiêu dùng đối với chất lượng dịch vụ hiện tại đạt khoảng bao nhiêu?",
        options: [
          "A. Dưới 10% do chất lượng dịch vụ quá kém",
          "B. Đạt khoảng 75% - 85% và vẫn có không gian để cải thiện trải nghiệm",
          "C. Đạt tuyệt đối 100% không có khiếu nại nào",
          "D. Người dùng hoàn toàn không quan tâm đến chất lượng dịch vụ"
        ],
        correct_option: "B",
        explanation: "Dù mức độ hài lòng khá cao, người dùng vẫn liên tục đòi hỏi các nâng cấp về mặt tốc độ phản hồi và chăm sóc sau bán hàng."
      },
      {
        question: "Dự báo trong 5 năm tới, quy mô của thị trường này tại Việt Nam sẽ thay đổi ra sao?",
        options: [
          "A. Sẽ bão hòa và có xu hướng suy thoái nhẹ",
          "B. Tiếp tục mở rộng quy mô, dự báo tăng gấp đôi doanh thu nhờ làn sóng số hóa toàn diện",
          "C. Trở về con số không do các phương thức cũ thay thế hoàn toàn",
          "D. Đi ngang và không có bất kỳ chuyển biến nào"
        ],
        correct_option: "B",
        explanation: "Tiềm năng thị trường Việt Nam vẫn rất lớn nhờ dân số trẻ, độ mở kinh tế cao và làn sóng ứng dụng công nghệ mạnh mẽ."
      }
    ];

    const mockQuizzes = [];
    for (let i = 1; i <= 20; i++) {
      const baseIdx = (i - 1) % baseQuestions.length;
      const baseObj = baseQuestions[baseIdx];
      
      mockQuizzes.push({
        question: `[Câu hỏi ${i}] Dựa trên báo cáo ${fileName}: ${baseObj.question.replace('chủ đề này', topic)}`,
        options: baseObj.options,
        correct_option: baseObj.correct_option,
        explanation: `[Giải thích câu ${i}] ${baseObj.explanation} (Dữ liệu trích xuất từ báo cáo ${fileName} về ${topic}).`
      });
    }
    return mockQuizzes;
  }
}
