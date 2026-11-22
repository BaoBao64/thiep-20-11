# Thiệp 20/11 — Kính tặng Thầy Nguyễn Trường Phú

Web thiệp tri ân Thầy dạy Tin học, viết theo phong cách lập trình viên.

## Các trang

| File | Nội dung |
|---|---|
| `index.html` | **Thiệp chính**: màn code tự gõ → bấm nút → bìa thiệp → mở thiệp (thư tay + lời chúc bằng code + QR) |
| `wish.html` | **Thiệp sáng tạo**: mọi người tự viết thiệp gửi Thầy, chọn ngôn ngữ / màu / sticker, tạo link + QR, tải ảnh |
| `game/` | Game **SCP ICT**: bay qua những cột mã lệnh, thắng 10 điểm thì thiệp (phần quà) mở ra |
| `scp-ict/` | **Web game SCP ICT riêng**: nhập tên, không giới hạn điểm, có bảng xếp hạng. Link: https://baobao64.github.io/thiep-20-11/scp-ict/ (QR: `qr/qr-scp-ict.png`). Hướng dẫn trong `scp-ict/README.md` |
| `config.js` | **Toàn bộ chữ, lời chúc, đoạn code, QR, game... đều sửa ở đây** |
| `content.json` | Nội dung bạn sửa ngay trên web (`?edit`), đè lên `config.js` |
| `google-apps-script.gs` | Code để nhận lời chúc vào Google Sheet |
| `assets/` | Giao diện (`style.css`) và code chạy web (`common.js`, `main.js`, `wish.js`, `editor.js`) |

## Chỉnh sửa ngay trên web (chữ, ảnh, nhạc)

Mở **https://baobao64.github.io/thiep-20-11/?edit** (thêm `?edit` vào cuối link thiệp).

- **Sửa chữ:** bấm thẳng vào chữ trên thiệp (chữ có viền nét đứt màu hồng) rồi gõ.
- **Bảng chỉnh sửa** bên phải (trên điện thoại thì nằm ở dưới):
  - tên Thầy, tên bạn, lớp
  - ảnh bìa, album ảnh kỷ niệm
  - nhạc nền, các tab lời chúc bằng code, màn code mở đầu
  - nơi nhận lời chúc
- **Lưu lên web:** bấm nút này để ghi thay đổi lên GitHub. Khoảng 1–2 phút sau, mọi người sẽ thấy bản mới.

Muốn bấm **Lưu lên web** hay tải ảnh, tải nhạc lên thì cần một **GitHub token** (chỉ cần làm một lần):

1. Vào https://github.com/settings/personal-access-tokens/new
2. Đặt tên tuỳ ý, chọn *Expiration* (ví dụ 90 ngày).
3. Ở *Repository access*, chọn **Only select repositories**, rồi chọn `thiep-20-11`.
4. Ở *Permissions → Repository permissions → Contents*, chọn **Read and write**.
5. Bấm **Generate token**, copy mã `github_pat_...` rồi dán vào ô **GitHub token** trong bảng chỉnh sửa.

Token chỉ được lưu trên trình duyệt của máy bạn, không đưa lên web. Đừng gửi token cho ai.
Nếu chưa có token, những gì bạn sửa vẫn được giữ làm bản nháp trên máy. Bạn có thể bấm **Tải content.json** rồi tự tải file đó lên repo.

Phần bạn sửa trên web được lưu vào `content.json` và đè lên nội dung gốc trong `config.js`.

### Sửa bằng file (cách cũ)

Mở `config.js`, sửa, lưu và tải lại trang. Viết `{thay}` ở đâu cũng được, web sẽ tự thay bằng tên Thầy.
Mở `index.html?skip=1` để vào thẳng thiệp, khỏi chờ màn code.

Màn code **luôn dừng lại** sau khi chạy xong và chỉ sang thiệp khi bạn tự bấm nút `▶ moThiep()`.

## Đăng web lên mạng (để mã QR quét được)

Mã QR chỉ hoạt động khi web đã có địa chỉ trên Internet. Có 2 cách miễn phí:

1. **Netlify Drop**: vào https://app.netlify.com/drop rồi kéo cả thư mục `thiep-20-11` vào. Làm xong là có link ngay.
2. **GitHub Pages**: tạo repository, tải các file lên, vào *Settings → Pages* và chọn nhánh `main`.

Sau khi có link, bạn có thể dán link `wish.html` vào `qr.url` trong `config.js` cho chắc. Nếu để trống, web tự trỏ QR về `wish.html`.

## Nhận lời chúc của mọi người vào Google Sheet (bức tường lời chúc)

Nếu chưa cài phần này, người viết thiệp vẫn gửi được bằng nút **Tạo link & QR**. Lúc đó, bức tường chỉ hiện những lời chúc đã viết trên cùng máy.
Muốn lời chúc của mọi người tự đổ về một chỗ và hiện lên bức tường cho tất cả cùng xem, làm như sau:

1. Tạo một Google Sheet mới, vào **Tiện ích mở rộng → Apps Script**.
2. Xoá hết code có sẵn, dán toàn bộ nội dung file `google-apps-script.gs` vào. **Đổi dòng `ADMIN_KEY`** thành mật khẩu của riêng bạn.
3. Bấm **Triển khai → Tùy chọn triển khai mới → Ứng dụng web**. Mục "Thực thi dưới danh nghĩa" chọn **Tôi**, mục "Người có quyền truy cập" chọn **Bất kỳ ai**. Bấm **Triển khai** và cấp quyền.
4. Copy link `https://script.google.com/macros/s/.../exec`. Mở thiệp ở chế độ chỉnh sửa (`?edit`), vào mục **Bức tường lời chúc**, dán link vào. Nhập luôn mật khẩu `ADMIN_KEY` ở ô bên dưới, rồi bấm **Lưu lên web**.

### Xoá lời chúc

- **Bạn (chủ thiệp):** mở `?edit`, bấm nút **×** trên lời chúc muốn xoá. Lời chúc sẽ mất khỏi bức tường của mọi người.
- **Người viết:** trên chính máy đã gửi, họ thấy nút × trên lời chúc của mình và tự xoá được.
- Bạn cũng có thể xoá thẳng dòng đó trong Google Sheet.

## Game SCP ICT

Game nằm trong thư mục `game/` (`index.html`, `style.css`, `main.js`, `img/`) và **đang được bật**.
Sau màn code, người xem phải chơi game và đạt **10 điểm** thì thiệp mới mở.

- Chơi riêng game: https://baobao64.github.io/thiep-20-11/game/
- Đổi mốc điểm: sửa `WIN_SCORE` ở đầu `game/main.js`.
- Game dễ hơn: tăng `gap` (khe giữa 2 cột) hoặc giảm `dx` (tốc độ) trong object `pipes` ở `game/main.js`.
- Tắt game (mở thiệp ngay, không cần chơi): trong `config.js` đổi `enabled: true` thành `enabled: false`.
- **Mỗi lần mở thiệp đều phải thắng lại**, kể cả khi bấm "Xem lại code". Thiệp không lưu trạng thái "đã thắng" lên máy, và `?skip=1` chỉ có tác dụng khi game đang tắt.
- Game không có nhạc nền riêng, chỉ có tiếng hiệu ứng (nút 🔊 trong game để tắt).

Cấu hình trong `config.js`:

```js
game: { enabled: true, url: "game/index.html", mode: "embed" }
```

- `enabled: true`: sau màn code, nút đổi thành `▶ choiGame()`. Phải thắng game thì thiệp (phần quà) mới mở.
- `mode: "embed"`: game chạy ngay trong trang thiệp. Thắng là thiệp hiện ra luôn.
- `mode: "redirect"`: chuyển sang trang game. Thắng thì quay về `index.html` và thiệp mở ra.

Khi người chơi thắng, game gọi hàm `moQua()` (trong `game/main.js`).


## Nhạc nền

Mặc định là bài *Người Gieo Mầm Xanh* (Hoàng Dũng · Hứa Kim Tuyền). Nhạc tự phát từ màn code. Góc dưới bên trái có nút loa nhỏ để tắt hoặc bật.

**Nên dùng file mp3**, vì điện thoại (nhất là iPhone) thường không phát được tiếng của YouTube khi bị ẩn:

1. Đổi tên file nhạc thành đúng `nhac.mp3`.
2. Trên GitHub, mở thư mục `assets`, bấm **Add file → Upload files**, chọn file, rồi bấm **Commit changes**.

Xong là web tự dùng file đó, không cần sửa gì thêm. Khi chưa có file `assets/nhac.mp3`, web tạm dùng link YouTube trong `config.js`.

Lưu ý: file nằm công khai trong repo, nên chỉ dùng file bạn có quyền chia sẻ.
Trình duyệt chỉ cho phát có tiếng sau khi người xem chạm vào trang. Trước đó nhạc chạy tắt tiếng, nút loa nhấp nháy.
