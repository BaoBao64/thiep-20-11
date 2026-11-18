/* tonghop.js — Bảng tổng hợp lời chúc (tong-hop.html)
   Lấy lời chúc từ Google Sheet (CONFIG.wishes.endpoint) và lời chúc đã gửi trên máy này. */
window.Thiep.ready.then(function () {
  "use strict";
  const C = window.CONFIG, U = window.Thiep;
  const { $, esc, fill, store, toast } = U;
  const T = C.teacher;
  const LANGS = { js: "JavaScript", py: "Python", cpp: "C++", html: "HTML" };

  document.title = fill("Bảng tổng hợp lời chúc · Gửi {danh_xung} {thay}");
  $("#sumTitle").innerHTML = `Lời chúc gửi <span class="script">${esc(T.honorific)} ${esc(T.name)}</span>`;
  $("#sumSub").textContent = "Tất cả lời chúc mọi người đã gửi từ trang “Viết thiệp”, gom lại trong một bảng.";

  const wishId = (w) => w.id || `${w.time || ""}|${w.name || ""}|${String(w.message || "").slice(0, 20)}`;
  let all = [];

  const fmtTime = (t) => {
    const d = new Date(t);
    return isNaN(d) ? "" : d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  async function load() {
    const ep = C.wishes && C.wishes.endpoint;
    let list = [], remoteOk = false;
    if (ep) {
      try {
        list = await U.fetchRemoteWishes();
        remoteOk = true;
      } catch (e) { /* hiện cảnh báo bên dưới */ }
    }
    const seen = new Set(list.map(wishId));
    store.get(U.WISH_KEY, []).forEach((w) => { if (!seen.has(wishId(w))) list.push(Object.assign({ _local: true }, w)); });
    const hidden = new Set(store.get(U.HIDDEN_KEY, []));
    all = list.filter((w) => w && w.message && !hidden.has(wishId(w)));

    const alert = $("#sumAlert");
    if (!ep) {
      alert.hidden = false;
      alert.innerHTML = "<b>Chưa kết nối Google Sheet</b>, nên bảng chỉ có lời chúc được gửi trên máy này. Kết nối theo hướng dẫn trong README.md (mục “Nhận lời chúc vào Google Sheet”) để gom lời chúc của mọi người về đây.";
    } else if (!remoteOk) {
      alert.hidden = false;
      alert.innerHTML = "<b>Không tải được lời chúc từ Google Sheet.</b> Kiểm tra mạng hoặc link Apps Script, rồi bấm “Tải lại”.";
    } else alert.hidden = true;

    $("#stUpdated").textContent = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    render();
  }

  function view() {
    const q = $("#q").value.trim().toLowerCase();
    let rows = all.filter((w) => !q || [w.name, w.className, w.message].join(" ").toLowerCase().includes(q));
    const by = $("#sort").value;
    const time = (w) => +new Date(w.time) || 0;
    rows.sort((a, b) =>
      by === "old" ? time(a) - time(b)
      : by === "name" ? String(a.name || "").localeCompare(String(b.name || ""), "vi")
      : by === "class" ? String(a.className || "").localeCompare(String(b.className || ""), "vi", { numeric: true }) || time(b) - time(a)
      : time(b) - time(a));
    return rows;
  }

  function render() {
    const rows = view();
    $("#stCount").textContent = all.length;
    $("#stPeople").textContent = new Set(all.map((w) => String(w.name || "").trim().toLowerCase()).filter(Boolean)).size;
    $("#stClasses").textContent = new Set(all.map((w) => String(w.className || "").trim().toUpperCase()).filter(Boolean)).size;
    $("#rows").innerHTML = rows.map((w, i) => `<tr data-id="${esc(wishId(w))}">
        <td class="c-sel"><input type="checkbox" class="row-sel" data-id="${esc(wishId(w))}" aria-label="Chọn lời chúc của ${esc(w.name || "Một học trò")}"${selected.has(wishId(w)) ? " checked" : ""}></td>
        <td class="c-no" data-label="#">${i + 1}</td>
        <td class="c-name" data-label="Người gửi"><b>${esc(w.name || "Một học trò")}</b>${w._local ? '<span class="tag">trên máy này</span>' : ""}</td>
        <td class="c-class" data-label="Lớp">${esc(w.className || "—")}</td>
        <td class="c-msg" data-label="Lời chúc">${esc(w.message)}</td>
        <td class="c-lang" data-label="Ngôn ngữ"><span class="lang"><b class="lang-dot" data-lang="${esc(w.lang || "js")}"></b>${esc(LANGS[w.lang] || w.lang || "")}</span></td>
        <td class="c-time" data-label="Thời gian">${esc(fmtTime(w.time))}</td>
        <td class="c-act"><button class="row-del" type="button" data-id="${esc(wishId(w))}">Xoá</button></td>
      </tr>`).join("");
    updateSel();
    const empty = $("#empty");
    empty.hidden = rows.length > 0;
    empty.textContent = all.length ? "Không có lời chúc nào khớp với từ bạn tìm." : "Chưa có lời chúc nào. Lời chúc mọi người gửi từ trang “Viết lời chúc” sẽ hiện ở đây.";
  }

  $("#q").addEventListener("input", render);
  $("#sort").addEventListener("change", render);
  $("#refresh").addEventListener("click", () => { load(); toast("Đã tải lại."); });
  $("#print").addEventListener("click", () => window.print());

  $("#copyAll").addEventListener("click", async () => {
    const rows = view();
    if (!rows.length) { toast("Chưa có lời chúc để sao chép."); return; }
    const text = rows.map((w, i) => `${i + 1}. ${w.name || "Một học trò"}${w.className ? " (" + w.className + ")" : ""}: ${w.message}`).join("\n\n");
    try { await navigator.clipboard.writeText(text); toast(`Đã sao chép ${rows.length} lời chúc.`); }
    catch (e) { toast("Trình duyệt không cho sao chép, bạn dùng “Tải file Excel” nhé."); }
  });

  $("#csv").addEventListener("click", () => {
    const rows = view();
    if (!rows.length) { toast("Chưa có lời chúc để tải."); return; }
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [["STT", "Người gửi", "Lớp", "Lời chúc", "Ngôn ngữ", "Thời gian"].map(cell).join(",")]
      .concat(rows.map((w, i) => [i + 1, w.name || "", w.className || "", w.message, LANGS[w.lang] || w.lang || "", fmtTime(w.time)].map(cell).join(",")))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "loi-chuc-gui-thay-20-11.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Đã tải file. Mở bằng Excel hoặc Google Sheets.");
  });

  /* ---------- CHẾ ĐỘ QUẢN LÝ / XOÁ ---------- */
  const selected = new Set();
  const table = document.querySelector(".sum-table");
  function setAdmin(on) {
    document.body.classList.toggle("sum-admin-on", on);
    $("#adminLogin").hidden = on; $("#adminTools").hidden = !on;
    if (!on) { selected.clear(); render(); }
  }
  function updateSel() {
    document.querySelectorAll(".row-sel").forEach((c) => { c.checked = selected.has(c.dataset.id); });
    $("#delSel").disabled = !selected.size;
    $("#delSel").textContent = selected.size ? `Xoá ${selected.size} mục đã chọn` : "Xoá mục đã chọn";
    const rows = view();
    $("#selAll").checked = rows.length > 0 && rows.every((w) => selected.has(wishId(w)));
  }
  $("#manage").addEventListener("click", () => {
    const bar = $("#adminBar"); bar.hidden = !bar.hidden;
    if (!bar.hidden) {
      const k = store.get(U.ADMIN_KEY, "");
      $("#adminKey").value = k;
      if (k) setAdmin(true); else $("#adminKey").focus();
    } else setAdmin(false);
  });
  $("#adminGo").addEventListener("click", () => {
    const k = $("#adminKey").value.trim();
    if (!k) { toast("Bạn nhập mật khẩu trước nhé."); return; }
    store.set(U.ADMIN_KEY, k); setAdmin(true);
    toast("Đã vào chế độ quản lý. Mật khẩu sẽ được kiểm tra khi bạn xoá.", 3500);
  });
  $("#adminKey").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#adminGo").click(); });
  $("#adminOut").addEventListener("click", () => { store.set(U.ADMIN_KEY, null); $("#adminBar").hidden = true; setAdmin(false); toast("Đã thoát chế độ quản lý trên máy này."); });
  $("#rows").addEventListener("change", (e) => {
    const c = e.target.closest(".row-sel"); if (!c) return;
    if (c.checked) selected.add(c.dataset.id); else selected.delete(c.dataset.id);
    updateSel();
  });
  $("#selAll").addEventListener("change", (e) => {
    view().forEach((w) => (e.target.checked ? selected.add(wishId(w)) : selected.delete(wishId(w))));
    updateSel();
  });

  async function removeIds(ids) {
    const items = all.filter((w) => ids.includes(wishId(w)));
    if (!items.length) return;
    const own = store.get(U.WISH_KEY, []);
    const payload = items.map((w) => ({ id: w.id || wishId(w), token: (own.find((x) => x.id === w.id) || {}).token }));
    ids.forEach((id) => { const tr = document.querySelector(`#rows tr[data-id="${CSS.escape(id)}"]`); if (tr) tr.classList.add("removing"); });
    toast(`Đang xoá ${items.length} lời chúc...`);
    const res = await U.deleteWishes(payload, store.get(U.ADMIN_KEY, ""));
    ids.forEach((id) => selected.delete(id));
    await load();
    if (res.ok) toast(`Đã xoá ${items.length} lời chúc.`);
    else if (res.unknown) toast("Chưa kiểm tra được kết quả, bạn bấm “Tải lại” để xem nhé.", 4500);
    else toast(`Chưa xoá được ${res.remaining.length} lời chúc: mật khẩu không khớp ADMIN_KEY trong Apps Script.`, 5500);
  }
  $("#rows").addEventListener("click", (e) => {
    const b = e.target.closest(".row-del"); if (!b) return;
    const w = all.find((x) => wishId(x) === b.dataset.id); if (!w) return;
    if (confirm(`Xoá lời chúc của “${w.name || "Một học trò"}”?`)) removeIds([b.dataset.id]);
  });
  $("#delSel").addEventListener("click", () => {
    if (!selected.size) return;
    if (confirm(`Xoá ${selected.size} lời chúc đã chọn? Việc này không hoàn tác được.`)) removeIds([...selected]);
  });

  load();
});
