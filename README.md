# Thiệp 20/11 — Kính tặng Thầy Nguyễn Trường Phú

Web thiệp tri ân Thầy dạy Tin học, viết theo phong cách lập trình viên.

## Các trang

| File | Nội dung |
|---|---|
| `index.html` | **Thiệp chính**: màn code tự gõ → bấm nút → bìa thiệp → mở thiệp (thư tay + lời chúc bằng code + QR) |
| `wish.html` | **Thiệp sáng tạo**: mọi người tự viết thiệp gửi Thầy, chọn ngôn ngữ / màu / sticker, tạo link + QR, tải ảnh |
| `game/index.html` | Trang **giữ chỗ cho game**. Thay bằng game của bạn sau |
| `config.js` | **Toàn bộ chữ, lời chúc, đoạn code, QR, game... đều sửa ở đây** |
| `assets/` | Giao diện (`style.css`) và code chạy web (`common.js`, `main.js`, `wish.js`) |

## Chỉnh sửa

Mở `config.js` bằng bất kỳ trình soạn thảo nào (VS Code, Notepad...), sửa rồi lưu và tải lại trang.

- `sender.name`, `sender.className`: tên và lớp của bạn (hiện ở chữ ký).
- `intro.code`: những dòng code tự gõ ở màn đầu. `intro.typingSpeed` chỉnh tốc độ gõ.
- `card.letter`: các đoạn thư gửi Thầy.
- `codeWishes`: các tab lời chúc bằng code (Python, JS, HTML, SQL, Git...). Thêm hay bớt tuỳ ý.
- Viết `{thay}` ở đâu cũng được, web sẽ tự thay bằng tên Thầy.
- Khi đang chỉnh, mở `index.html?skip=1` để vào thẳng thiệp, khỏi chờ màn code.

Màn code **luôn dừng lại** sau khi chạy xong và chỉ sang thiệp khi bạn tự bấm nút `▶ moThiep()`.

## Đăng web lên mạng (để mã QR quét được)

Mã QR chỉ hoạt động khi web đã có địa chỉ trên Internet. Có 2 cách miễn phí:

1. **Netlify Drop**: vào https://app.netlify.com/drop rồi kéo cả thư mục `thiep-20-11` vào. Làm xong là có link ngay.
2. **GitHub Pages**: tạo repository, tải các file lên, vào *Settings → Pages* và chọn nhánh `main`.

Sau khi có link, bạn có thể dán link `wish.html` vào `qr.url` trong `config.js` cho chắc. Nếu để trống, web tự trỏ QR về `wish.html`.

## Nhận lời chúc của mọi người vào Google Sheet (tuỳ chọn)

Nếu chưa cài phần này, người viết thiệp vẫn gửi được bằng nút **Tạo link & QR** (link chứa sẵn cả tấm thiệp).
Muốn lời chúc của mọi người tự đổ về một chỗ và hiện lên **Bức tường lời chúc** trong thiệp chính, làm như sau:

1. Tạo một Google Sheet mới, vào **Tiện ích mở rộng → Apps Script**, dán đoạn code này vào:

```js
function doPost(e) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const d = JSON.parse(e.postData.contents);
  sh.appendRow([new Date(), d.name, d.className, d.message, d.lang, d.theme, d.sticker]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  const rows = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getDataRange().getValues();
  const data = rows.filter(r => r[3]).map(r => ({
    time: r[0], name: r[1], className: r[2], message: r[3], lang: r[4], theme: r[5], sticker: r[6]
  }));
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

2. Bấm **Triển khai → Tùy chọn triển khai mới → Ứng dụng web**. Ở mục "Người có quyền truy cập", chọn **Bất kỳ ai**.
3. Copy link `https://script.google.com/macros/s/.../exec` rồi dán vào `wishes.endpoint` trong `config.js`.

Bạn xem toàn bộ lời chúc trong Google Sheet và có thể xoá những dòng không phù hợp. Dòng nào bị xoá sẽ biến mất khỏi bức tường.

## Gắn game (làm sau)

Trong `config.js`:

```js
game: { enabled: true, url: "game/index.html", mode: "embed" }
```

- `enabled: true`: sau màn code, nút đổi thành `▶ choiGame()`. Phải thắng game thì thiệp (phần quà) mới mở.
- `mode: "embed"`: game chạy ngay trong trang thiệp. Thắng là thiệp hiện ra luôn.
- `mode: "redirect"`: chuyển sang trang game. Thắng thì quay về `index.html?gift=unlocked`.

Khi người chơi thắng, game chỉ cần gọi hàm `moQua()`. Mẫu hàm có sẵn trong `game/index.html`.

Muốn chơi lại từ đầu (khoá quà lại), mở Console của trình duyệt và chạy `localStorage.removeItem("thiep2011_unlocked")`.

## Nhạc nền (tuỳ chọn)

Chép file nhạc vào `assets/`, ví dụ `assets/nhac.mp3`, rồi đặt `music: { url: "assets/nhac.mp3" }`. Nhạc bắt đầu phát khi bấm mở thiệp, và có nút ♪ để bật/tắt.
