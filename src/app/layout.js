import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "Quản Lý Quiz Thị Trường - Zalo Bot Hub",
  description: "Hệ thống tự động hóa phân tích báo cáo thị trường qua Google Gemini AI, tạo câu hỏi trắc nghiệm và lập lịch gửi tự động qua Zalo Bot.",
  robots: "index, follow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <div className="layout-container">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
