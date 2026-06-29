# 📈 Hệ Thống Tạo Quiz Thị Trường & Quản Lý Gửi Zalo Bot tự động

Dự án này là một giải pháp tự động hóa hoàn toàn giúp:
1. Đọc và phân tích các báo cáo thị trường từ thư mục Google Drive được chỉ định.
2. Tự động sinh câu hỏi trắc nghiệm (Quiz) chất lượng cao bằng **Google Gemini AI**.
3. Tích hợp Zalo Bot (HTTP API) và tự động hóa việc lập lịch gửi câu hỏi định kỳ hàng ngày bằng **Vercel Cron Jobs**.
4. Hỗ trợ **Chatbot tương tác (Webhook)**: Người dùng trả lời trực tiếp trên Zalo, hệ thống sẽ tự động chấm điểm và phản hồi giải thích ngay lập tức.
5. Cung cấp Webapp quản trị hiện đại, giao diện sáng (Light Mode) thanh lịch với hiệu ứng kính mờ (Glassmorphism).

---

## 🛠️ Hướng dẫn cài đặt & Cấu hình từ A - Z

### Bước 1: Thiết lập cơ sở dữ liệu trên Supabase
1. Đăng nhập hoặc đăng ký tài khoản miễn phí tại [Supabase](https://supabase.com/).
2. Tạo một dự án mới (ví dụ: `quiz-zalo-bot`).
3. Truy cập vào phần **SQL Editor** trong dashboard của Supabase.
4. Mở file [supabase_schema.sql](file:///c:/Users/HOME/Desktop/Du%20an%20cuoi%20khoa/supabase_schema.sql) trong dự án này, copy toàn bộ nội dung SQL và paste vào SQL Editor của Supabase rồi bấm **Run**.
5. Vào mục **Project Settings** > **API** để lấy:
   * **Project URL** (Sử dụng làm `SUPABASE_URL`)
   * **API Key** (Sử dụng làm `SUPABASE_ANON_KEY`)

### Bước 2: Thiết lập Zalo Bot & Webhook
1. Đăng ký Zalo Bot tại [Zalo Bot Platform](https://bot.zaloplatforms.com/).
2. Sao chép **Bot Token** được cấp. Định dạng token có dạng `<BOT_ID>:<BOT_TOKEN>` (Ví dụ: `573853085825137296:itiJlHBZaklPOEQ...`).
3. Sau khi Deploy ứng dụng lên Vercel thành công (Bước 4), bạn quay lại console của Zalo Bot và cấu hình URL Webhook trỏ về:
   ```text
   https://<your-vercel-domain>.vercel.app/api/zalo/webhook
   ```
   *Bot sẽ tự động bắt câu trả lời trắc nghiệm của người dùng dạng `Q_xxxx A` để chấm điểm trực tiếp.*

### Bước 3: Cấu hình biến môi trường (Environment Variables)
Khi deploy lên Vercel hoặc chạy local, bạn cần cấu hình các biến môi trường sau (xem file [.env.example](file:///c:/Users/HOME/Desktop/Du%20an%20cuoi%20khoa/.env.example)):

| Tên biến | Mô tả |
| :--- | :--- |
| `GEMINI_API_KEY` | API Key tạo tại [Google AI Studio](https://aistudio.google.com/) dùng để sinh câu hỏi trắc nghiệm |
| `SUPABASE_URL` | Đường dẫn kết nối dự án Supabase của bạn |
| `SUPABASE_ANON_KEY` | Khóa API Anon của Supabase |
| `ZALO_BOT_TOKEN` | Token của Zalo Bot (mặc định đã được cấu hình tự động trong code) |
| `CRON_SECRET` | Khóa bảo vệ API Cron (Vercel tự sinh hoặc bạn tự đặt chuỗi bí mật) |
| `NEXT_PUBLIC_WEBAPP_URL` | URL công khai của Webapp sau khi deploy (Dùng để chèn link vào tin nhắn Zalo) |

### Bước 4: Triển khai lên Vercel & Kết nối GitHub
1. Tạo một repository mới trên GitHub cá nhân của bạn.
2. Chạy các lệnh sau trong terminal máy tính của bạn để liên kết và đẩy code lên:
   ```bash
   git remote add origin <LINK_REPO_GITHUB_CUA_BAN>
   git branch -M main
   git push -u origin main
   ```
3. Đăng nhập [Vercel](https://vercel.com/) và liên kết với tài khoản GitHub của bạn.
4. Bấm **Add New** > **Project**, chọn Repo vừa đẩy lên và bấm **Import**.
5. Nhập các Biến môi trường ở phần **Environment Variables** (Xem Bước 3).
6. Bấm **Deploy**.

---

## ⏰ Lịch trình tự động hóa (Vercel Cron Jobs)

Toàn bộ hệ thống tự động hóa được quản lý qua cấu hình [vercel.json](file:///c:/Users/HOME/Desktop/Du%20an%20cuoi%20khoa/vercel.json) và hoạt động hoàn toàn độc lập trên Cloud (không cần mở laptop hay bật IDE):

1. **Đồng bộ Google Drive (`/api/cron/sync-drive`):** Chạy định kỳ vào **8:00 AM hàng ngày** (giờ Việt Nam). Tự động quét Drive, phát hiện các file PDF báo cáo mới, gọi AI sinh 20 quiz và lưu vào database.
2. **Gửi tin nhắn Quiz (`/api/cron/send-quiz`):** Chạy định kỳ vào **9:00 AM hàng ngày** (giờ Việt Nam). Tự động lấy câu hỏi tiếp theo trong chủ đề đã setup và gửi tới các Chat ID Zalo đang active.

---

## 🧪 Chạy thử nghiệm cục bộ (Local Testing)
1. Cài đặt các thư viện:
   ```bash
   npm install
   ```
2. Tạo file `.env.local` ở thư mục gốc và điền các biến môi trường.
3. Chạy thử nghiệm kiểm tra tích hợp các service:
   ```bash
   node scripts/test-services.js
   ```
4. Khởi động môi trường dev:
   ```bash
   npm run dev
   ```
   *Mở trình duyệt truy cập `http://localhost:3000` để sử dụng Webapp quản trị.*
