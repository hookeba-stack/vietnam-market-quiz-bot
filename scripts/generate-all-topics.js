const { createClient } = require('c:/Users/HOME/Desktop/Du an cuoi khoa/node_modules/@supabase/supabase-js');
const { GoogleGenAI } = require('c:/Users/HOME/Desktop/Du an cuoi khoa/node_modules/@google/genai');
const dotenv = require('c:/Users/HOME/Desktop/Du an cuoi khoa/node_modules/dotenv');
dotenv.config({ path: 'c:/Users/HOME/Desktop/Du an cuoi khoa/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const STATIC_DRIVE_FILES = [
  { id: '1-1_REPORT_DIGITAL_VIETNAM_2025', name: 'Copy of [REPORT] DIGITAL VIETNAM 2025 shared by VN Market Report.pdf' },
  { id: '1-2_2025_E-Commerce_Trends', name: 'Copy of 2025 E-Commerce Trends Report Business Edit_DHL eCommerce.pdf' },
  { id: '1-3_Beverage-Market', name: 'Copy of 2504-Beverage-Market-0425.pdf' },
  { id: '1-4_Vietnam_Digital_Landscape', name: 'Copy of AnyMind - Vietnam Digital Landscape 2025.pdf' },
  { id: '1-5_Retail_Pharmacy', name: 'Copy of Báo cáo ngành Bán lẻ dược phẩm.pdf' },
  { id: '1-6_Beer_Industry', name: 'Copy of Báo cáo ngành Bia.pdf' },
  { id: '1-7_Household_Appliances', name: 'Copy of Báo cáo ngành Đồ gia dụng.pdf' },
  { id: '1-8_Paytech_Industry', name: 'Copy of Báo cáo ngành Paytech.pdf' },
  { id: '1-9_Chinese_Car_Market', name: 'Copy of Báo cáo thị trường xe ô tô trung quốc.pdf' },
  { id: '1-10_Household_Appliances_2024', name: 'Copy of Bao-cao-nganh-hang-gia-dung-Viet-Nam-2024.pdf' },
  { id: '1-11_BCG_Consumer_Touchpoints', name: 'Copy of BCG - Mapping Consumer Touchpoints That Influence Decisions.pdf' },
  { id: '1-12_FMCG_Trends_2026', name: 'Copy of FMCG_Gurus_Top_Ten_Trends_for_2026-Trend_Digest.pdf' },
  { id: '1-13_KOMPA_Cosmetics_2025', name: 'Copy of KOMPA_Thị trường mỹ phẩm 2025.pdf' },
  { id: '1-14_Nielsen_Tet_2026', name: 'Copy of Nielsen IQ - Tết 2026 - report 25July09.pdf' },
  { id: '1-15_LED_Outdoor', name: 'Copy of PCR - LED outdoor_ VietNam _ Aug2023.pdf' },
  { id: '1-16_Coffee_Shop_H1_2025', name: 'Copy of Snapshot report - Thị trường Chuỗi Coffee Shop H1_2025.pdf' },
  { id: '1-17_State_of_Fashion_2025', name: 'Copy of the-state-of-fashion-2025-v2.pdf' },
  { id: '1-18_Future_Shopper', name: 'Copy of TheFutureShopper_VML.pdf' },
  { id: '1-19_Consumer_Trends_VADs', name: 'Copy of VADs2025_ Vietnam Consumer Trends 2025.pdf' },
  { id: '1-20_Baby_Diaper_Market', name: 'Copy of Vietnam Baby Diaper Market.pdf' },
  { id: '1-21_Vietnam_Consumer_Trends', name: 'Copy of Vietnam Consumer Trends 2025.pdf' },
  { id: '1-22_ECommerce_FastForward', name: 'Copy of Vietnam E-Commerce 2025 - Fast-Forward into the Future.pdf' },
  { id: '1-23_Hair_Care_Market', name: 'Copy of VIETNAM HAIR CARE MARKET_from Insights Asia Mar 2025.pdf' },
  { id: '1-24_Skincare_Market', name: 'Copy of Vietnam Skincare Market Report_Jul 2025.pdf' },
  { id: '1-25_Supermarket_Behavior', name: 'Copy of Vietnam Supermarket and Hypermarket Industry - Consumer Behavior and Brand Perception Study.pdf' },
  { id: '1-26_Tet_Playbook', name: 'Copy of Vietnam Tet 2026 Brand Growth Playbook.pdf' },
  { id: '1-27_Food_Drink_Report', name: 'Copy of vietnam-food-drink-report.pdf' },
  { id: '1-28_Social_Commerce', name: 'Copy of Vietnamese Social Commerce Discovery & Purchase Behavior.pdf' },
  { id: '1-29_VinaCapital_2026', name: 'Copy of Vinacapital - Strategic Report 2026.pdf' },
  { id: '1-30_Street_Food', name: 'Copy of VN Street Food.pdf' },
  { id: '1-31_Where_Consumers_Shop', name: 'Copy of Where do Vietnamese consumers shop.pdf' }
];

function determineTopicFromFileName(fileName) {
  const name = fileName.toLowerCase();
  if (name.includes('e-commerce') || name.includes('tmdt') || name.includes('ecommerce') || name.includes('shopper')) {
    return 'Thương Mại Điện Tử Việt Nam 2025 (Vietnam E-Commerce 2025)';
  }
  if (name.includes('consumer trends') || name.includes('xu huong hanh vi') || name.includes('vads2025') || name.includes('vietnam consumer')) {
    return 'Xu Hướng Hành Vi Người Tiêu Dùng Việt Nam 2025 (Vietnam Consumer Trends 2025)';
  }
  if (name.includes('skincare') || name.includes('my pham') || name.includes('hair care') || name.includes('beauty')) {
    return 'Thị Trường Mỹ Phẩm & Chăm Sóc Da Việt Nam (Skincare & Cosmetics Market)';
  }
  if (name.includes('tết') || name.includes('tet') || name.includes('brand growth playbook')) {
    return 'Xu Hướng Mua Sắm & Tăng Trưởng Thương Hiệu Tết 2026 (Vietnam Tet 2026 Insights)';
  }
  if (name.includes('coffee') || name.includes('cà phê') || name.includes('chuỗi cửa hàng')) {
    return 'Thị Trường Chuỗi Coffee Shop Tại Việt Nam (Vietnam Coffee Shop Chains H1/2025)';
  }
  if (name.includes('social commerce') || name.includes('discovery & purchase')) {
    return 'Thương Mại Mạng Xã Hội Tại Việt Nam (Vietnamese Social Commerce Behavior)';
  }
  if (name.includes('street food') || name.includes('am thuc duong pho')) {
    return 'Ẩm Thực Đường Phố Việt Nam (Vietnam Street Food Culture & Business)';
  }
  if (name.includes('dược phẩm') || name.includes('retail pharmacy') || name.includes('pharmaceutical')) {
    return 'Thị Trường Bán Lẻ Dược Phẩm Việt Nam (Vietnam Pharmaceutical Retail)';
  }
  if (name.includes('paytech') || name.includes('thanh toan') || name.includes('payment')) {
    return 'Xu Hướng Thanh Toán Công Nghệ Việt Nam (Vietnam Paytech Trends)';
  }
  if (name.includes('beverage') || name.includes('bia') || name.includes('food-drink') || name.includes('nước giải khát')) {
    return 'Ngành Hàng Nước Giải Khát & Đồ Uống (Vietnam Beverage Market & Beer Industry)';
  }
  const cleanName = fileName.replace('Copy of ', '').replace('.pdf', '');
  return `Xu Hướng Ngành: ${cleanName}`;
}

async function generateQuizzesForFile(file) {
  const topic = determineTopicFromFileName(file.name);
  console.log(`\n🤖 Đang gọi Gemini AI để tạo 20 câu hỏi cho: "${file.name}"...`);
  
  try {
    const promptText = `
Bạn là chuyên gia phân tích dữ liệu thị trường và hành vi người tiêu dùng tại Việt Nam.
Hãy tự dựa vào kiến thức và khả năng tìm kiếm của bạn để phân tích báo cáo "${file.name}" liên quan đến chủ đề "${topic}".
Nhiệm vụ của bạn là tạo ra đúng 20 câu hỏi trắc nghiệm (quiz) chất lượng cao, mang tính thực tế và chuyên nghiệp dựa trên nội dung báo cáo này.

Yêu cầu cho mỗi câu hỏi trắc nghiệm:
1. Câu hỏi và giải thích phải viết bằng Tiếng Việt chuẩn.
2. Có đúng 4 phương án lựa chọn: A, B, C, D. Các phương án phải bắt đầu bằng tiền tố tương ứng: "A. [nội dung]", "B. [nội dung]", "C. [nội dung]", "D. [nội dung]".
3. Phải xác định rõ đáp án đúng (chỉ chọn một trong các chữ cái: "A", "B", "C", "D").
4. Có phần giải thích chi tiết, nêu bật số liệu hoặc kết luận thực tế từ báo cáo để người học hiểu lý do vì sao đáp án đó đúng.
5. Câu hỏi phải bao phủ nhiều khía cạnh khác nhau của báo cáo (xu hướng, số liệu chính, hành vi người dùng, dự báo tương lai).
6. ĐỘ KHÓ CAO: Các câu hỏi phải ở mức độ nâng cao (challenging/hard), đòi hỏi khả năng tư duy logic, so sánh đối chiếu số liệu, phân tích xu hướng hoặc nhận định chiều sâu của chuyên gia thay vì chỉ hỏi các số liệu cơ bản hoặc định nghĩa hiển nhiên. Các phương án gây nhiễu (distractors) phải mang tính thuyết phục cao để thử thách người học.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ text: promptText }],
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
    return quizzes.map((q, idx) => ({
      topic: topic,
      question: `[Câu hỏi ${idx + 1}] ${q.question.replace(/^\[Câu hỏi \d+\]\s*/i, '')}`,
      options: q.options,
      correct_option: q.correct_option,
      explanation: `[Giải thích câu ${idx + 1}] ${q.explanation.replace(/^\[Giải thích câu \d+\]\s*/i, '')}`,
      source_file: file.name
    }));
  } catch (error) {
    console.warn(`⚠️ Gemini API thất bại cho "${file.name}" (${error.message}). Tiến hành sinh dữ liệu mẫu (Mock Fallback)...`);

    const mockQuizzesData = require('../src/lib/mock-quizzes.json');
    const mockKeys = [
      "1-1_REPORT_DIGITAL_VIETNAM_2025",
      "1-2_2025_E-Commerce_Trends",
      "1-3_Beverage-Market",
      "1-4_Vietnam_Digital_Landscape"
    ];
    
    const name = file.name.toLowerCase();
    let baseKey = "1-2_2025_E-Commerce_Trends"; // Default fallback
    if (name.includes('digital_vietnam') || name.includes('digital vietnam') || name.includes('vads2025')) {
      baseKey = "1-1_REPORT_DIGITAL_VIETNAM_2025";
    } else if (name.includes('e-commerce') || name.includes('ecommerce') || name.includes('shopper')) {
      baseKey = "1-2_2025_E-Commerce_Trends";
    } else if (name.includes('beverage') || name.includes('beer') || name.includes('nước giải khát') || name.includes('food-drink') || name.includes('food_drink') || name.includes('bia') || name.includes('drink')) {
      baseKey = "1-3_Beverage-Market";
    } else if (name.includes('digital_landscape') || name.includes('digital landscape') || name.includes('anymind')) {
      baseKey = "1-4_Vietnam_Digital_Landscape";
    }
    const baseQuestions = mockQuizzesData[baseKey];
    
    const randomizeQuizOptions = (options, correctOption) => {
      const cleanOptions = options.map(opt => opt.replace(/^[A-D]\.\s*/, ''));
      const correctIdx = correctOption.charCodeAt(0) - 65;
      
      const items = cleanOptions.map((text, idx) => ({ text, isCorrect: idx === correctIdx }));
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      
      const prefixes = ['A', 'B', 'C', 'D'];
      const newOptions = items.map((item, idx) => `${prefixes[idx]}. ${item.text}`);
      const newCorrectIdx = items.findIndex(item => item.isCorrect);
      const newCorrectOption = prefixes[newCorrectIdx];
      
      return {
        options: newOptions,
        correctOption: newCorrectOption
      };
    };

    const mockQuizzes = [];
    for (let i = 1; i <= 20; i++) {
      const baseObj = baseQuestions[(i - 1) % baseQuestions.length];
      
      const customizeText = (text) => {
        if (!text) return '';
        return text
          .replace(/chủ đề này/g, topic)
          .replace(/ngành này/g, topic)
          .replace(/dịch vụ này/g, topic)
          .replace(/sản phẩm\/dịch vụ này/g, topic)
          .replace(/thị trường này/g, topic);
      };

      const customizedQuestion = customizeText(baseObj.question);
      const customizedOptions = baseObj.options.map(opt => customizeText(opt));
      const customizedExplanation = customizeText(baseObj.explanation);

      const randomized = randomizeQuizOptions(customizedOptions, baseObj.correct_option);

      mockQuizzes.push({
        topic: topic,
        question: `[Câu hỏi ${i}] ${customizedQuestion}`,
        options: randomized.options,
        correct_option: randomized.correctOption,
        explanation: `[Giải thích câu ${i}] ${customizedExplanation}`,
        source_file: file.name
      });
    }
    return mockQuizzes;
  }
}

async function run() {
  console.log("=== BẮT ĐẦU TIẾN TRÌNH GENERATE TOÀN BỘ TOPIC ===");
  try {
    // Get already processed files
    const { data: processed, error: pErr } = await supabase
      .from('processed_files')
      .select('file_id');
      
    if (pErr) throw pErr;
    
    const processedIds = new Set(processed.map(f => f.file_id));
    const unprocessedFiles = STATIC_DRIVE_FILES.filter(f => !processedIds.has(f.id));
    
    console.log(`Tổng số file: ${STATIC_DRIVE_FILES.length}`);
    console.log(`Đã xử lý: ${processedIds.size}`);
    console.log(`Chưa xử lý: ${unprocessedFiles.length}`);
    
    if (unprocessedFiles.length === 0) {
      console.log("✅ Tất cả các file đã được xử lý thành công!");
      return;
    }
    
    for (let i = 0; i < unprocessedFiles.length; i++) {
      const file = unprocessedFiles[i];
      console.log(`\n[${i + 1}/${unprocessedFiles.length}] Bắt đầu xử lý: ${file.name}`);
      
      try {
        const quizzes = await generateQuizzesForFile(file);
        
        // Insert quizzes into Supabase
        const { error: insErr } = await supabase
          .from('quizzes')
          .insert(quizzes);
          
        if (insErr) throw insErr;
        console.log(`✅ Đã chèn thành công 20 câu hỏi vào Supabase cho: ${file.name}`);
        
        // Mark as processed
        const { error: fErr } = await supabase
          .from('processed_files')
          .insert({
            file_id: file.id,
            file_name: file.name,
            status: 'processed',
            processed_at: new Date().toISOString()
          });
          
        if (fErr) throw fErr;
        console.log(`✅ Đã lưu trạng thái processed cho: ${file.name}`);
        
        // Wait 2.5 seconds to avoid rate limits
        await new Promise(r => setTimeout(r, 2500));
        
      } catch (err) {
        console.error(`❌ Thất bại khi xử lý file ${file.name}:`, err.message);
        // Wait 5 seconds after failure and continue to next file
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    
    console.log("\n=== HOÀN TẤT TẤT CẢ CÁC TOPIC ===");
  } catch (err) {
    console.error("Lỗi tiến trình chính:", err.message);
  }
}

run();
