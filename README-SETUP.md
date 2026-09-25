# Setup — Cuộc thi ảnh Before & After (Suleco)

Đã tạo sẵn:
- Google Sheet: https://docs.google.com/spreadsheets/d/1XKBCWbh_MwSP2JsLH_imexKLxPxDL0MfN1IT7T40EP4/edit
- [Code.gs](Code.gs) — backend Apps Script
- [index.html](index.html) — trang web (đăng ký + bảng xếp hạng + quản trị)

## Các bước còn lại (làm 1 lần)

1. **Mở Google Sheet** ở link trên.
2. Vào menu **Extensions (Tiện ích mở rộng) → Apps Script**.
3. Xóa code mẫu trong `Code.gs`, dán toàn bộ nội dung file [Code.gs](Code.gs) ở repo này vào.
4. Sửa mật khẩu admin: trong hàm `setAdminPassword()`, thay `'DoiMatKhauNay123'` bằng mật khẩu bạn muốn.
5. Chọn hàm `setAdminPassword` ở thanh công cụ (dropdown chọn hàm) → bấm **Run (▶)** để lưu mật khẩu. Lần đầu chạy, Google sẽ hỏi cấp quyền — bấm **Advanced → Go to (unsafe)** rồi **Allow** (đây là script của chính bạn nên an toàn).
6. Bấm **Deploy → New deployment**.
   - Chọn loại: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Bấm **Deploy**, cấp quyền nếu được hỏi.
7. Copy URL kết thúc bằng `/exec`.
8. Mở file [index.html](index.html), tìm dòng:
   ```js
   WEBAPP_URL: 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE',
   ```
   thay bằng URL vừa copy.
9. Mở `index.html` trực tiếp trong trình duyệt để test, hoặc host lên GitHub Pages / Google Sites / bất kỳ hosting tĩnh nào.

## Lưu ý

- Ảnh học viên gửi lên sẽ tự động lưu vào Drive theo cấu trúc:
  `Suleco BA Contest - Anh / <Hạng mục> / <Tên người dự thi> / <Tên> - <Hạng mục> - Truoc.ext` (và `- Sau.ext`), chia sẻ dạng "Anyone with link". Trang web chỉ hiển thị bản thu nhỏ (qua Google thumbnail) để load nhanh — file gốc trên Drive vẫn giữ nguyên dung lượng/chất lượng.
- Bài mới đăng ký sẽ có trạng thái **"Chờ duyệt"**; BTC vào khu vực **Quản trị** trên trang web (nút góc trên bên phải) để duyệt (`Đã duyệt`) và nhập số Like/Share/Điểm. Có thể **tick chọn nhiều bài rồi xóa hàng loạt** bằng nút "Xóa các bài đã chọn".
- Giới hạn Apps Script Web App: mỗi request tối đa **~50MB** — ảnh JPG/PNG thường (vài đến ~30MB) không vấn đề gì; nếu học viên gửi RAW quá nặng có thể lỗi, trang web sẽ cảnh báo khi ảnh quá lớn.
- **Mỗi khi sửa `Code.gs`** (như thao tác xóa hàng loạt vừa thêm) — cần dán lại nội dung mới vào Apps Script editor rồi **Deploy → Manage deployments → Edit (biểu tượng bút) → New version → Deploy** để thay đổi có hiệu lực trên URL `/exec` hiện tại (không cần đổi URL trong `index.html`).
