/* ============================================================
   NƠI NHẬN LỜI CHÚC — dán toàn bộ file này vào Google Apps Script
   (Google Sheet → Tiện ích mở rộng → Apps Script). Xem README.md.
   ============================================================ */

// ĐỔI mật khẩu này. Nhập đúng mật khẩu này trong chế độ chỉnh sửa
// (index.html?edit → Bức tường lời chúc) để xoá được mọi lời chúc.
const ADMIN_KEY = "doi-mat-khau-nay";

const HEADER = ["time", "id", "name", "className", "message", "lang", "theme", "sticker", "view", "token"];

function sheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEADER);
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse((e.postData && e.postData.contents) || "{}");
    const sh = sheet_();

    // Xoá lời chúc: cần mật khẩu quản trị, hoặc mã riêng của người đã viết lời chúc đó
    if (d.action === "delete") {
      const rows = sh.getDataRange().getValues();
      let removed = 0;
      for (let i = rows.length - 1; i >= 1; i--) {
        const sameId = String(rows[i][1]) === String(d.id);
        const allowed = (d.key && d.key === ADMIN_KEY) || (d.token && String(rows[i][9]) === String(d.token));
        if (sameId && allowed) { sh.deleteRow(i + 1); removed++; }
      }
      return json_({ ok: true, removed: removed });
    }

    // Thêm lời chúc mới (bỏ qua nếu lời chúc này đã có, tránh gửi trùng)
    if (!d.message) return json_({ ok: false });
    if (d.id) {
      const ids = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues() : [];
      if (ids.some(function (r) { return String(r[0]) === String(d.id); })) return json_({ ok: true, duplicate: true });
    }
    sh.appendRow([
      new Date(), String(d.id || Utilities.getUuid()), String(d.name || "").slice(0, 40), String(d.className || "").slice(0, 20),
      String(d.message).slice(0, 600), d.lang || "js", d.theme || "dao", d.sticker || "heart", d.view || "both", String(d.token || ""),
    ]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const data = rows.filter(function (r) { return r[4]; }).map(function (r) {
    return { time: r[0], id: String(r[1]), name: r[2], className: r[3], message: r[4], lang: r[5], theme: r[6], sticker: r[7] };
  });
  return json_(data);
}
