const body = {
  "event_name": "message.text.received",
  "message": {
    "date": 1782737171420,
    "chat": {
      "chat_type": "PRIVATE",
      "id": "adf8d5c8608589dbd094"
    },
    "message_id": "0bba9ad1878f2ad67399",
    "from": {
      "id": "adf8d5c8608589dbd094",
      "is_bot": false,
      "display_name": "Anh Khoa"
    },
    "text": "a",
    "quote_message": {
      "message_id": "1b4a0ad1878f2ad67399",
      "text": "📖 Nguồn: Copy of 2504-Beverage-Market-0425\n\n❓ Câu hỏi: [Câu hỏi 2] Dựa trên báo cáo Copy of 2504-Beverage-Market-0425.pdf: Đối tượng khách hàng nào được nhận định là động lực tiêu dùng chính cho ngành này tại Việt Nam?\n\nA. Nhóm người tiêu dùng cao tuổi tại nông thôn\nB. Thế hệ trẻ Gen Z và Millennials tại các đô thị lớn\nC. Các doanh nghiệp sản xuất truyền thống quy mô lớn\nD. Khách du lịch quốc tế ngắn ngày\n\n💡 Hướng dẫn trả lời:\n👉 Soạn cú pháp: Q_c6cf5fdb [Đáp án] (Ví dụ: Q_c6cf5fdb A) gửi trực tiếp cho Bot này.\n👉 Hoặc xem bảng thống kê & đáp án tại Webapp: https://vietnam-market-quiz-bot.vercel.app/quiz",
      "sender": {
        "id": 573853085825137296,
        "is_bot": true
      }
    }
  }
};

const messageText = body.message?.text || '';
const quoteText = body.message?.quote_message?.text || '';
console.log("quoteText exists:", !!quoteText);
const quoteMatch = quoteText.match(/Q_([a-f0-9]{8})/i);
console.log("quoteMatch:", quoteMatch);

const optionOnlyRegex = /^\s*([A-D])\.?\s*$/i;
const optionMatch = messageText.trim().match(optionOnlyRegex);
console.log("optionMatch:", optionMatch);

if (quoteMatch && optionMatch) {
  console.log("SUCCESS: Entered reply-to-message block!");
} else if (optionMatch) {
  console.log("FALLBACK: Entered fallback single-option block!");
} else {
  console.log("OTHER: Entered other block");
}
