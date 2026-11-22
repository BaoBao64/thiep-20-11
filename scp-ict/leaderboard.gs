/* ============================================================
   BẢNG XẾP HẠNG GAME SCP ICT
   Dán toàn bộ file này vào Google Apps Script
   (Google Sheet → Tiện ích mở rộng → Apps Script). Xem README.md.

   Bảng tính có 4 cột: time | name | score | plays
   Mỗi tên chỉ có 1 dòng, giữ điểm CAO NHẤT của tên đó.
   Muốn xoá ai khỏi bảng: xoá thẳng dòng đó trong Google Sheet.
   ============================================================ */

const HEADER = ["time", "name", "score", "plays"];
const MAX_SCORE = 100000;   // điểm lớn vô lý hơn mức này thì bỏ qua
const TOP = 100;            // trả về tối đa bao nhiêu người

function sheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEADER);
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function cleanName_(raw) {
  return String(raw || "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
}

// Nhận điểm sau mỗi ván
function doPost(e) {
  const d = JSON.parse((e.postData && e.postData.contents) || "{}");
  const name = cleanName_(d.name);
  const score = Math.floor(Number(d.score));
  if (d.action !== "score" || !name || !isFinite(score) || score <= 0 || score > MAX_SCORE) {
    return json_({ ok: false });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][1]).toLowerCase() === name.toLowerCase()) {
        const plays = (Number(rows[i][3]) || 0) + 1;
        sh.getRange(i + 1, 4).setValue(plays);
        if (score > Number(rows[i][2])) {
          sh.getRange(i + 1, 1, 1, 3).setValues([[new Date(), name, score]]);
        }
        return json_({ ok: true });
      }
    }
    sh.appendRow([new Date(), name, score, 1]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Trả về bảng xếp hạng: điểm cao trước, bằng điểm thì ai đạt trước đứng trên
function doGet() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const list = rows
    .filter(function (r) { return r[1] && Number(r[2]) > 0; })
    .map(function (r) {
      return { name: String(r[1]), score: Number(r[2]), plays: Number(r[3]) || 1, time: r[0] };
    })
    .sort(function (a, b) {
      return b.score - a.score || new Date(a.time) - new Date(b.time);
    })
    .slice(0, TOP);
  return json_(list);
}
