// Script to verify integration of Supabase, Gemini, and Zalo Bot
// Run with: node scripts/test-services.js

const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

// Load env variables
dotenv.config();

console.log("=== BẮT ĐẦU KIỂM TRA TÍCH HỢP HỆ THỐNG ===");

// 1. Check Supabase
async function testSupabase() {
  console.log("\n1. Đang kiểm tra kết nối Supabase...");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn("⚠️ Bỏ qua test Supabase: Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_ANON_KEY");
    return false;
  }

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('quizzes').select('id').limit(1);
    
    if (error) throw error;
    console.log("✅ Kết nối Supabase thành công! Dữ liệu phản hồi tốt.");
    return true;
  } catch (error) {
    console.error("❌ Kết nối Supabase thất bại:", error.message);
    return false;
  }
}

// 2. Check Gemini API
async function testGemini() {
  console.log("\n2. Đang kiểm tra kết nối Google Gemini API...");
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️ Bỏ qua test Gemini: Thiếu biến môi trường GEMINI_API_KEY");
    return false;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Hãy viết một câu xin chào ngắn gọn.'
    });
    
    console.log(`✅ Kết nối Gemini API thành công!`);
    console.log(`💬 Gemini phản hồi: "${response.text?.trim()}"`);
    return true;
  } catch (error) {
    console.error("❌ Kết nối Gemini API thất bại:", error.message);
    return false;
  }
}

// 3. Check Zalo Bot
async function testZaloBot() {
  console.log("\n3. Đang kiểm tra kết nối Zalo Bot Platform HTTP API...");
  const token = process.env.ZALO_BOT_TOKEN || '573853085825137296:itiJlHBZaklPOEQHlDYRLOgHjcjiCMcsePZHjuldUCcAMtfNhipaINKQuTuCtDLo';
  const testChatId = process.env.TEST_CHAT_ID;

  if (!testChatId) {
    console.warn("⚠️ Bỏ qua test Zalo Bot gửi tin nhắn: Vui lòng cấu hình TEST_CHAT_ID trong file .env để thực hiện test gửi.");
    
    // Test getMe instead
    try {
      const res = await fetch(`https://bot-api.zaloplatforms.com/bot${token}/getMe`);
      const json = await res.json();
      if (res.ok && json.ok) {
        console.log(`✅ Token Zalo Bot hoạt động chính xác!`);
        console.log(`🤖 Tên bot: ${json.result.display_name} (ID: ${json.result.id})`);
        return true;
      } else {
        throw new Error(json.description || 'API Error');
      }
    } catch (e) {
      console.error("❌ Token Zalo Bot không hợp lệ hoặc bị lỗi:", e.message);
      return false;
    }
  }

  try {
    const url = `https://bot-api.zaloplatforms.com/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: testChatId,
        text: "🔔 Tin nhắn kiểm thử kết nối tự động từ hệ thống Quiz Generator Zalo Bot."
      })
    });
    
    const json = await res.json();
    if (res.ok && json.ok) {
      console.log(`✅ Gửi tin nhắn kiểm thử qua Zalo Bot thành công đến Chat ID: ${testChatId}!`);
      return true;
    } else {
      throw new Error(json.description || 'Send Error');
    }
  } catch (error) {
    console.error("❌ Gửi tin nhắn qua Zalo Bot thất bại:", error.message);
    return false;
  }
}

async function run() {
  const sbOk = await testSupabase();
  const geminiOk = await testGemini();
  const zaloOk = await testZaloBot();
  
  console.log("\n=== TỔNG KẾT KIỂM TRA ===");
  console.log(`Supabase: ${sbOk ? '✅' : '❌'}`);
  console.log(`Gemini API: ${geminiOk ? '✅' : '❌'}`);
  console.log(`Zalo Bot: ${zaloOk ? '✅' : '❌'}`);
}

run();
