# GPS + Goong Maps + WebSocket

## Hai loại key của Goong

- `GOONG_API_KEY`: REST key của backend, dùng cho tìm địa chỉ, geocoding và các REST API. Không đưa key này vào frontend.
- `NEXT_PUBLIC_GOONG_MAPTILES_KEY`: Maptiles Key để Goong JS tải nền bản đồ trong trình duyệt.

Tạo/chọn **Maptiles Key** tại https://account.goong.io/ và cấu hình quyền website theo tùy chọn tài khoản Goong cho `https://move.bachhoaseeding.com`.
Tài liệu: https://document.goong.io/tutorial-API-key.html

## Cấu hình

Trong `web/beehub_web/.env.local` (VPS: `/var/www/beehub/web/beehub_web/.env.local`):

```dotenv
NEXT_PUBLIC_GOONG_MAPTILES_KEY=<your-maptiles-key>
```

Không cần Google Maps key, Google Cloud Billing hoặc Google map ID cho tích hợp này. Không commit file env.
Build và triển khai lại web sau khi đổi key: Next.js đưa NEXT_PUBLIC vào bản build. Nếu thiếu key hoặc Goong không tải được, UI hiển thị bản đồ dự phòng.

## Theo dõi chuyến đi

Nhà xe chủ động bật GPS. Vị trí tiếp tục được gửi khi chuyển trang trong cùng phiên web. Khách nhận snapshot qua `wss://move.bachhoaseeding.com/api/orders/tracking/ws`, xác thực bằng frame đầu tiên, token không nằm trong URL.

Chỉ khách đặt đơn và nhà xe được phân công được xem. Server kiểm tra lại token/tài khoản/quyền đơn mỗi lần gửi snapshot. Có heartbeat, reconnect và HTTP polling dự phòng.

Goong GL JS dùng tọa độ `[longitude, latitude]`. Xe di chuyển bằng `Marker.setLngLat`, nội suy tối đa 1 giây giữa các điểm đã nhận; không dự đoán tọa độ chưa đo. Vùng sai số là hình tròn địa lý tính theo mét. Người dùng kéo bản đồ để tắt theo xe, bấm “Về vị trí xe” để bật lại.

Kết thúc/hủy đơn thì ngừng hiển thị GPS. Trình duyệt không bảo đảm chạy GPS nền khi khóa màn hình/đóng trình duyệt.

## Vận hành và kiểm thử

Backend hiện chạy một PM2 process; khi scale nhiều worker phải có shared pub/sub. Nginx cần chuyển header Upgrade/Connection cho `/api/`.

- Backend: `node --test backend/test/tracking-websocket.test.js`.
- Địa lý: `node --test web/beehub_web/test/goong-tracking-map.test.cjs`.
- Bản đồ thật cần Maptiles Key hợp lệ; mock SDK chỉ kiểm tra UI/animation, không xác nhận quyền/quota tile của tài khoản.
