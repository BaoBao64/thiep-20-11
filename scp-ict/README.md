# SCP ICT 🥚

Game bay qua những **cột mã lệnh**. Ghi tên, chơi không giới hạn điểm, phá kỷ lục và leo top **bảng xếp hạng**.

👉 Chơi tại: **https://baobao64.github.io/thiep-20-11/scp-ict/**

- **Nhân vật:** quả trứng đeo kính
- **Bối cảnh:** ảnh trường
- **Chướng ngại vật:** mỗi cặp cột là một lệnh máy x86 (`MOV`, `CALL`, `JMP`, `LEA`, `SYSCALL`...). Đầu cột ghi tên lệnh và mã hex, thân cột chạy các con số hex và nhị phân của chính lệnh đó.
- **Bảng xếp hạng:** mỗi tên giữ điểm cao nhất của mình, bằng điểm thì ai đạt trước đứng trên.

## Cách chơi
1. Nhập tên (lần sau máy tự nhớ, muốn đổi thì bấm **Đổi tên**).
2. Nhấn `Space`, `↑` hoặc chạm màn hình để bay.
3. Mỗi cặp cột bay qua được +1 điểm. Đâm cột hoặc rơi xuống đất là thua, điểm tự lưu lên bảng xếp hạng.

## Bảng xếp hạng chung (Google Sheet)

Khi `leaderboardUrl` trong `config.js` còn trống, bảng chỉ lưu trên từng máy. Muốn cả lớp dùng chung một bảng, làm một lần như sau:

1. Tạo một **Google Sheet** mới, đặt tên ví dụ `SCP ICT - Bảng xếp hạng`.
2. Vào **Tiện ích mở rộng → Apps Script**. Xoá hết code có sẵn, dán toàn bộ nội dung file `leaderboard.gs` vào, bấm 💾 Lưu.
3. Bấm **Triển khai → Tùy chọn triển khai mới**. Ở biểu tượng ⚙ chọn **Ứng dụng web**:
   - *Thực thi dưới danh nghĩa*: **Tôi**
   - *Người có quyền truy cập*: **Bất kỳ ai**
4. Bấm **Triển khai**, cấp quyền cho tài khoản Google của bạn (nếu hiện "Google chưa xác minh ứng dụng này" thì bấm *Nâng cao → Đi tới ... (không an toàn)*, vì đây là script của chính bạn).
5. Copy link **Ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`), dán vào `config.js`:

   ```js
   leaderboardUrl: "https://script.google.com/macros/s/.../exec"
   ```

6. Lưu `config.js` lên GitHub. Khoảng 1–2 phút sau là xong.

**Quản lý bảng:** mở Google Sheet, xoá dòng của ai thì người đó biến khỏi bảng xếp hạng. Sửa `leaderboard.gs` xong thì phải **Triển khai → Quản lý các bản triển khai → ✏ → Phiên bản mới** thì code mới có hiệu lực.

**Lưu ý:** ai biết cách cũng có thể tự gửi điểm giả lên bảng (vì game chạy hoàn toàn trên trình duyệt). Script đã chặn tên rỗng và điểm quá 100000; điểm nào vô lý thì bạn xoá trong Google Sheet. Hai người trùng tên sẽ dùng chung một dòng, nên mỗi người nên ghi thêm lớp, ví dụ `Bảo 11A1`.

## Chạy thử trên máy

```bash
python3 -m http.server 8000
```

Rồi mở http://localhost:8000

## Cấu trúc
| File | Vai trò |
|---|---|
| `index.html` | Khung trang: tiêu đề, màn chơi, ô nhập tên, bảng xếp hạng |
| `style.css` | Giao diện, co giãn cho điện thoại |
| `config.js` | Link bảng xếp hạng chung |
| `leaderboard.js` | Tên người chơi + tải/gửi/vẽ bảng xếp hạng |
| `main.js` | Toàn bộ logic game (chú thích tiếng Việt) |
| `leaderboard.gs` | Code Google Apps Script nhận và trả bảng xếp hạng |
| `img/` | Hình nhân vật và hình nền |

## Chỉnh độ khó
Trong object `pipes` ở `main.js`:
- `gap`: khe giữa 2 cột (nhỏ hơn → khó hơn)
- `dx`: tốc độ cột trôi (lớn hơn → khó hơn)
- `spawnEvery`: bao nhiêu frame sinh 1 cặp cột (nhỏ hơn → cột dày hơn)

## Kiến thức dùng trong code
- **Canvas 2D:** vẽ hình, chữ, xoay nhân vật
- **Game loop bước cố định 60 lần/giây** bằng `requestAnimationFrame`
- **Va chạm elip và hình chữ nhật** (`ellipseHitsRect`)
- **Web Audio API:** tự tạo hiệu ứng âm thanh, không cần file `.wav`
- **fetch + Google Apps Script:** gửi điểm lên Google Sheet, tải bảng xếp hạng về
- **localStorage:** nhớ tên người chơi, lưu bảng khi chưa có Google Sheet

Dựa trên dự án Flappy Bird mã nguồn mở của [noanonoa](https://github.com/noanonoa/flappy-bird). Hình ảnh, âm thanh và giao diện đã được làm lại toàn bộ.
