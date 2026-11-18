/* ==========================================================================
   CẤU HÌNH THIỆP 20/11 — BẠN CHỈ CẦN SỬA FILE NÀY LÀ ĐỦ
   --------------------------------------------------------------------------
   • Mẹo: viết {thay} ở bất cứ đâu -> tự thay bằng tên thầy bên dưới.
          {danh_xung} -> "Thầy", {toi} -> tên bạn, {lop} -> lớp, {ngay} -> ngày.
   • Các đoạn code nằm giữa hai dấu ` (backtick). Bên trong đoạn code
     KHÔNG dùng dấu ` và không viết ${ ... } để tránh lỗi.
   • Sửa xong chỉ cần lưu file rồi tải lại trang (F5).
   • Mở nhanh thiệp (bỏ qua màn code) khi đang chỉnh: index.html?skip=1
   • CHỈNH SỬA NGAY TRÊN WEB: mở index.html?edit (xem README.md)
   ========================================================================== */

window.CONFIG = {
  /* ---------- THÔNG TIN CHUNG ---------- */
  teacher: {
    honorific: "Thầy",
    name: "Nguyễn Trường Phú",
    subject: "Giáo viên Tin học · ICT",
  },
  sender: {
    name: "Học trò của Thầy",   // <- tên bạn (hiện ở chữ ký)
    className: "",              // <- lớp của bạn, ví dụ "12A1"
  },
  occasion: "Ngày Nhà giáo Việt Nam",
  date: "20/11/2026",
  pageTitle: "Thiệp 20/11 · Kính tặng {danh_xung} {thay}",

  /* ---------- MÀN 1: NHỮNG DÒNG CODE XUẤT HIỆN ---------- */
  intro: {
    enabled: true,
    filename: "tri_an_thay.js",
    language: "js",            // js | py | cpp | html | sql | bash
    typingSpeed: 20,           // mili-giây cho mỗi ký tự (nhỏ = gõ nhanh)
    code: `// tri_an_thay.js — {occasion} {ngay}
import { LongBietOn } from "trai-tim-hoc-tro";

const thay = new NguoiThay({
  ten: "{thay}",
  mon: "Tin học - ICT",
  kienNhan: Infinity,
  tamHuyet: Number.MAX_SAFE_INTEGER,
});

const hocTro = new HocTro({ tinhNghich: true, hamHoc: true });

// Mỗi ngày Thầy đứng lớp là một vòng lặp yêu thương
while (thay.dangDay()) {
  hocTro.kienThuc++;
  hocTro.uocMo.push("một tương lai tươi sáng");
}

try {
  hocTro.guiLoiCamOn(thay, new LongBietOn());
} catch (loi) {
  // không bao giờ xảy ra: lòng biết ơn không có bug
}

export default moThiep; // Món quà đang chờ Thầy...`,
    terminal: [
      "$ node tri_an_thay.js",
      "› Đang biên dịch lòng biết ơn {bar}",
      "› Tìm thấy 1 người thầy tuyệt vời: {danh_xung} {thay}",
      "› 0 errors · 0 warnings · ∞ yêu thương",
      "✔ Build thành công! Món quà đã sẵn sàng.",
    ],
    buttonText: "moThiep()",
    hint: "Nhấn để mở món quà dành tặng {danh_xung}",
  },

  /* ---------- MÀN 2: BÌA THIỆP ---------- */
  cover: {
    kicker: "Ngày Nhà giáo Việt Nam",
    bigDate: "20.11",
    to: "Kính tặng",
    tagline: "</> made with love",
    openText: "Mở thiệp",
  },

  /* ---------- MÀN 3: BÊN TRONG THIỆP ---------- */
  card: {
    ribbon: "Happy Teachers' Day",
    title: "[Tri ân] {danh_xung} {thay}",   // chữ trong [ ] sẽ viết kiểu chữ viết tay
    subtitle: "{ngay} · Một chương trình nhỏ, chạy bằng cả trái tim",
    greeting: "Kính gửi {danh_xung} {thay},",
    letter: [
      "Nhân ngày 20.11, em xin thay mặt lớp gửi đến thầy lời chúc và lời cảm ơn sâu sắc nhất.",
      "Cảm ơn thầy đã luôn là người đồng hành, sẻ chia, truyền tải kiến thức cho chúng em theo cách thoải mái, gần gũi nhất. Cảm ơn thầy vì đã ủng hộ, đồng hành cùng lớp trong những hoạt động tập thể. Em biết rằng có đôi lần lớp làm thầy thất vọng, nhưng chính những khoảnh khắc ấy cũng là lúc chúng em nhận ra mình phải cố gắng nhiều hơn cho tập thể lớp cũng như để cho xứng đáng với thời gian, công sức và tâm tư thầy đã bỏ ra.",
      "Em tin chắc rằng trên chặng đường trưởng thành của mình, đâu đó vẫn có hình bóng của thầy luôn dõi theo, nối dài con đường dẫn đến thành công. Những kỷ niệm mà 10A7 đã có cùng với thầy chính là những mảnh ký ức khó quên nhất trong thước phim thanh xuân mà mỗi chúng em đều luôn muốn nhắc lại.",
      "Kính chúc thầy luôn có nhiều sức khoẻ, tiền vô như nước tiền ra nhỏ giọt như cà phê phin, bình an và luôn luôn yêu quý 10A7 như từ đầu năm đến giờ. Việc được gặp thầy chính là \"may mắn\" của cả lớp khi có một người thầy vừa đẹp trai vừa trẻ trung, năng động và quan tâm lớp như vậy. Không biết nói gì hơn, 10A7 tụi em chỉ muốn nói tụi em quý thầy nhất trường và CẢM ƠN THẦY PHÚ RẤT NHIỀU!!!",
    ],
    closing: "Kính thư,",
    signature: "{toi}",
  },

  /* Các "tab" lời chúc bằng code. Thêm / bớt thoải mái.
     lang: js | py | cpp | html | sql | bash
     output: chữ hiện ra khi bấm nút ▶ Run                                 */
  codeWishes: [
    {
      file: "loi_chuc.py",
      lang: "py",
      code: `# loi_chuc.py — chạy một lần, hiệu lực trọn đời
class LoiChuc:
    def __init__(self, nguoi_nhan):
        self.nguoi_nhan = nguoi_nhan
        self.suc_khoe = "100%"        # luôn đầy pin
        self.niem_vui = float("inf")  # không giới hạn
        self.so_bug = 0               # mọi việc trơn tru

    def gui(self):
        for dieu in ["bình an", "hạnh phúc", "thành công"]:
            print(f"Chúc Thầy {dieu} mãi mãi!")

LoiChuc("{danh_xung} {thay}").gui()`,
      output: "Chúc Thầy bình an mãi mãi!\nChúc Thầy hạnh phúc mãi mãi!\nChúc Thầy thành công mãi mãi!",
    },
    {
      file: "tri_an.js",
      lang: "js",
      code: `// tri_an.js
const camOn = (thay) => ({
  vi: ["kiến thức", "sự kiên nhẫn", "những lời động viên"],
  thoiHan: "mãi mãi",
});

function chucThay(nam = 2026) {
  return {
    sucKhoe: "uptime 99.999%",
    congViec: "0 bug · 0 warning",
    giaDinh: "luôn đồng bộ yêu thương",
    hocTro: "ngày càng giỏi hơn :)",
  };
}

console.log("Chúc mừng ngày 20/11, thưa Thầy!");`,
      output: "Chúc mừng ngày 20/11, thưa Thầy!",
    },
    {
      file: "thay.html",
      lang: "html",
      code: `<!-- Trang web đẹp nhất là trang có Thầy -->
<section class="nguoi-lai-do">
  <h1>Cảm ơn {danh_xung} {thay}</h1>
  <p>Thầy là &lt;header&gt; dẫn lối cho mọi bài học,</p>
  <p>là &lt;main&gt; chứa những điều quý giá nhất,</p>
  <p>và là &lt;footer&gt; vững chãi phía sau chúng em.</p>
  <footer>Made with &lt;3 by học trò của Thầy</footer>
</section>`,
      output: "Trình duyệt hiển thị: Cảm ơn {danh_xung} {thay} ♥",
    },
    {
      file: "ky_niem.sql",
      lang: "sql",
      code: `-- Truy vấn lòng biết ơn
SELECT loi_chuc
FROM trai_tim_hoc_tro
WHERE nguoi_nhan = '{danh_xung} {thay}'
ORDER BY tinh_cam DESC
LIMIT 1;`,
      output: "1 row: \"Chúc Thầy mạnh khỏe, hạnh phúc và mãi yêu nghề!\"",
    },
    {
      file: "commit.sh",
      lang: "bash",
      code: `$ git checkout -b hanh-trang-vao-doi
$ git add kien-thuc/ ky-niem/ uoc-mo/
$ git commit -m "Cảm ơn Thầy vì tất cả - 20/11"
$ git push origin tuong-lai`,
      output: "✔ Đã đẩy lòng biết ơn lên mọi nhánh của cuộc đời.",
    },
  ],

  /* "Bảng trạng thái" vui nhộn */
  status: [
    { label: "Sức khỏe", value: 100, text: "100%", color: "#06D6A0" },
    { label: "Hạnh phúc", value: 100, text: "100%", color: "#FF8FAB" },
    { label: "Niềm vui", value: 100, text: "100%", color: "#FFB703" },
    { label: "Lòng biết ơn", value: 100, text: "∞", color: "#9B7BFF" },
  ],

  /* ---------- MÃ QR: mọi người quét để viết thiệp gửi Thầy ---------- */
  qr: {
    enabled: true,
    // Để trống "" = tự trỏ tới trang wish.html cùng thư mục.
    // Nếu muốn chắc chắn, dán link web đã đăng, ví dụ:
    // "https://ten-ban.github.io/thiep-20-11/wish.html"
    url: "https://baobao64.github.io/thiep-20-11/wish.html",
    title: "Gửi lời chúc đến Thầy",
    caption: "Quét mã để tự tay viết một tấm thiệp bằng code gửi {danh_xung} {thay}.",
    button: "Viết thiệp ngay",
  },

  /* ---------- NƠI NHẬN LỜI CHÚC (tuỳ chọn) ----------
     Dán link Google Apps Script (xem README.md) để lời chúc của mọi người
     được lưu vào Google Sheet và hiện lên "Bức tường lời chúc".            */
  wishes: {
    endpoint: "",
    showWall: true,
    wallTitle: "Bức tường lời chúc",
    wallSubtitle: "Những dòng code yêu thương từ học trò gửi {danh_xung}",
    maxLength: 500,
  },

  /* ---------- TRANG THIỆP SÁNG TẠO (wish.html) ---------- */
  wishPage: {
    title: "Viết thiệp gửi {danh_xung}",
    subtitle: "Chọn ngôn ngữ, chọn màu, viết vài dòng — hệ thống sẽ “biên dịch” lời chúc của bạn thành một tấm thiệp code xinh xắn.",
    samples: [
      "Chúc Thầy luôn mạnh khỏe, vui vẻ và mãi giữ ngọn lửa đam mê với nghề. Cảm ơn Thầy vì những giờ Tin học thật thú vị!",
      "Cảm ơn Thầy đã kiên nhẫn “debug” cho chúng em từng dòng code. Chúc Thầy một ngày 20/11 thật nhiều niềm vui!",
      "Nếu cuộc sống là một chương trình, chúc Thầy luôn chạy mượt, không lỗi và tràn đầy hạnh phúc.",
      "Chúc Thầy 20/11 thật ấm áp. Chúng em hứa sẽ học thật chăm để không phụ công Thầy!",
    ],
  },

  /* ---------- GAME SCP ICT ----------
     enabled: true  -> phải thắng game mới mở được thiệp (thiệp là phần quà).
     mode: "embed"    -> game mở ngay trong trang (iframe), thắng là hiện thiệp.
           "redirect" -> chuyển sang trang game; thắng thì quay về thiệp.
     MỖI LẦN mở thiệp (kể cả bấm "Xem lại code") đều phải thắng game lại.
     Game gọi moQua() khi người chơi thắng (xem game/main.js).              */
  game: {
    enabled: true,
    url: "game/index.html",
    mode: "embed",
    buttonText: "choiGame()",
    hint: "Thắng 10 điểm game SCP ICT để mở món quà",
  },

  /* ---------- NHẠC NỀN ----------
     Cách 1 (nên dùng): dán link YouTube của bài hát vào "youtube".
     Cách 2: tải file mp3 của bạn lên (trong chế độ chỉnh sửa) hoặc ghi đường dẫn vào "url".
     Nhạc bắt đầu phát khi bấm nút mở thiệp.                                  */
  music: {
    title: "Người Gieo Mầm Xanh",
    artist: "Hoàng Dũng · Hứa Kim Tuyền",
    youtube: "https://youtu.be/J3IRYx3PzzM",   // dự phòng khi chưa có file mp3
    url: "assets/nhac.mp3",                    // tải file nhạc lên GitHub với đúng tên này
    start: 0,          // bắt đầu phát từ giây thứ mấy
  },

  /* ---------- HÌNH ẢNH ----------
     cover: ảnh thay cho bó hoa trên bìa (để trống = dùng bó hoa).
     album: các ảnh kỷ niệm trong thiệp: [{ src: "uploads/anh.jpg", caption: "Lớp mình" }]
     Dễ nhất là thêm ảnh trong chế độ chỉnh sửa (index.html?edit).           */
  images: {
    cover: "",
    albumTitle: "Album kỷ niệm",
    album: [
      { src: "uploads/album-lop-chup-chung.jpg", caption: "Thầy Phú và đàn con" },
      { src: "uploads/album-hoat-dong-ngoai-troi.jpg", caption: "Flashmob" },
      { src: "uploads/album-sinh-nhat-thay.jpg", caption: "Sinh nhật Thầy" },
    ],
  },

  /* Repository GitHub chứa web — chế độ chỉnh sửa dùng để lưu thay đổi */
  github: { owner: "BaoBao64", repo: "thiep-20-11", branch: "main" },

  /* true = tắt hiệu ứng trên máy bật "Giảm chuyển động". Mặc định luôn chạy hiệu ứng. */
  respectReducedMotion: false,
};
