# Hướng dẫn cấu hình BeeHub Assistant (AI Chatbot & Tóm tắt Đánh giá)

## 1. Tổng quan
Hệ thống trợ lý AI của BeeHub bao gồm 2 thành phần chính trên Next.js Web (`web/beehub_web`):
1. **BeeHub Assistant (`components/chatbot/chat-widget.tsx` & `app/api/chat/ai/route.ts`):**
   - Widget chat nổi ở góc phải màn hình (có thể kéo thả vị trí, tự động ẩn tại `/login`, `/dang-nhap` và tuân thủ nút bật/tắt `beehub_support_enabled` trong `/admin/settings`).
   - Hỗ trợ hiển thị Markdown (`**in đậm**`, `*in nghiêng*`, `` `code` ``, danh sách đánh số, danh sách gạch đầu dòng, tiêu đề).
   - Tự động nhận diện các câu hỏi tư vấn, so sánh nhà xe, giá cước, gói combo, đánh giá (`isProviderQuestion`) và truy xuất dữ liệu thực tế từ Backend (`/api/providers/browse` & `/api/providers/:id`) để đưa vào ngữ cảnh AI.
2. **Tóm tắt đánh giá bằng AI (`components/providers/AiReviewSummary.tsx` & `app/api/ai/review-summary/route.ts`):**
   - Phân tích tới 30 đánh giá gần nhất của nhà xe để tổng hợp `summary`, `highlights`, `concerns`, và `verdict`.

---

## 2. Biến môi trường hỗ trợ
Thêm một trong các biến môi trường sau vào file `web/beehub_web/.env.local` (hoặc `.env` ở thư mục gốc):

```env
# Ưu tiên chọn provider: auto | gemini | groq | openai
AI_PROVIDER=auto

# 1. Google Gemini (Khuyên dùng - hỗ trợ cả Chatbot và Review Summary)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# 2. Groq (Tốc độ phản hồi cực nhanh cho Chatbot)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# 3. OpenAI (Tuỳ chọn)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

> **Lưu ý:** Ngay cả khi chưa cấu hình API key ngoài, cả 2 route `/api/chat/ai` và `/api/ai/review-summary` đều có cơ chế **Smart Data-Driven Fallback** tự động tổng hợp bảng so sánh nhà xe, giá khởi điểm, giá/km, gói combo và điểm đánh giá trực tiếp từ cơ sở dữ liệu thực tế.

