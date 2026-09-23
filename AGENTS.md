# Nàng Han — Project Memory

## Bảng màu chuẩn

Toàn bộ giao diện trong dự án phải dùng chung bảng màu Nàng Han dưới đây. Các mã màu này là nguồn chuẩn và không được tự ý thay đổi hoặc bổ sung màu gần giống khi chưa có yêu cầu của chủ dự án.

| Vai trò | CSS token hiện tại | Mã màu |
| --- | --- | --- |
| Vàng | `var(--yellow)` | `#FFD401` |
| Xanh lá | `var(--green)` | `#4DAA35` |
| Đỏ | `var(--red)` | `#9F0B07` |
| Xanh navy | `var(--navy)` | `#020031` |
| Cam | `var(--orange)` | `#FFBB40` |
| Xanh teal | `var(--teal)` | `#39A373` |
| Hồng magenta | `var(--magenta)` | `#A00A6B` |
| Trắng | màu trắng thuần | `#FFFFFF` |
| Nền kem của dự án | `var(--beige)` | `#FFF1E2` |

Các token dùng chung được khai báo tại đầu `styles.css`. Khi viết hoặc sửa CSS:

- Luôn dùng `var(--yellow)`, `var(--green)`, `var(--red)`, `var(--navy)`, `var(--orange)`, `var(--teal)`, `var(--magenta)` và `var(--beige)` thay vì lặp lại mã hex.
- Không tạo thêm biến màu mới nếu màu đó đã có trong bảng trên.
- Không dùng một sắc độ gần giống để thay thế màu thương hiệu.
- Màu đỏ tương tác của nút là `var(--red)` (`#9F0B07`).
- Với nền, viền hoặc chữ cần độ trong suốt, ưu tiên dùng `rgba()` dựa trên đúng màu gốc trong bảng.
- Giữ độ tương phản dễ đọc; trên nền đỏ hoặc navy ưu tiên chữ trắng/kem, trên nền vàng ưu tiên chữ navy.

## Nguồn tham chiếu

Bảng màu được xác nhận từ `nang-han-web-palette.css` do chủ dự án cung cấp. `styles.css` là nguồn token thực thi cho website.

## Typography

- Font mặc định toàn website là `Phudu`, dùng qua `var(--font-primary)` trong `styles.css`.
- Nội dung đọc dài dùng `Roboto`, thông qua `var(--font-reading)`; không dùng display font cho đoạn văn dài.
- Các font viết tay đã được tải sẵn để dùng làm điểm nhấn: `var(--font-birthstone)`, `var(--font-puppies)` và `var(--font-square-peg)`.
- Không khai báo trực tiếp tên font trong từng component; luôn dùng token font chung.
- Phải giữ font fallback trong token để nội dung vẫn đọc được khi Google Fonts chưa tải xong.
