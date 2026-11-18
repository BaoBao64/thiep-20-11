/* editor.js — CHẾ ĐỘ CHỈNH SỬA (mở bằng index.html?edit)
   • Bấm vào chữ trên thiệp để sửa trực tiếp.
   • Bảng bên phải: thông tin chung, ảnh, nhạc, code, màn mở đầu, bức tường lời chúc.
   • "Lưu lên web" ghi file content.json vào GitHub bằng token của bạn (token chỉ nằm trên máy bạn). */
(function () {
  "use strict";
  const U = window.Thiep, C = window.CONFIG;
  const { $, esc, store, toast } = U;
  const TOKEN_KEY = "thiep2011_gh_token";
  const SAVE_KEYS = ["teacher", "sender", "occasion", "date", "intro", "cover", "card", "codeWishes", "status", "qr", "wishes", "music", "images"];
  const GH = () => Object.assign({ owner: "BaoBao64", repo: "thiep-20-11", branch: "main" }, C.github || {});

  C.images = C.images || { cover: "", albumTitle: "Album kỷ niệm", album: [] };
  C.images.album = C.images.album || [];
  C.music = C.music || {};

  /* ---------- tiện ích ---------- */
  const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  function setPath(o, p, v) {
    const ks = p.split("."); let a = o;
    ks.slice(0, -1).forEach((k, i) => { if (a[k] == null) a[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[k]; });
    a[ks[ks.length - 1]] = v;
  }
  const snapshot = () => { const o = {}; SAVE_KEYS.forEach((k) => { if (C[k] !== undefined) o[k] = JSON.parse(JSON.stringify(C[k])); }); return o; };
  function b64utf8(str) {
    const bytes = new TextEncoder().encode(str); let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  let rT = 0;
  const rerender = () => { clearTimeout(rT); rT = setTimeout(() => U.render(), 250); };
  function changed(opts = {}) {
    store.set(U.DRAFT_CONTENT_KEY, snapshot());
    setDirty(true);
    if (opts.render !== false) rerender();
  }

  /* ---------- GitHub ---------- */
  async function gh(method, path, body) {
    const t = store.get(TOKEN_KEY, "");
    if (!t) throw new Error("Chưa nhập GitHub token (mục Lưu & kết nối).");
    const g = GH();
    const url = `https://api.github.com/repos/${g.owner}/${g.repo}/contents/${path}` + (method === "GET" ? `?ref=${g.branch}&t=${Date.now()}` : "");
    const r = await fetch(url, {
      method, cache: "no-store",
      headers: Object.assign({ Authorization: `Bearer ${t}`, Accept: "application/vnd.github+json" }, body ? { "Content-Type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (method === "GET" && r.status === 404) return null;
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) throw new Error("Token sai hoặc đã hết hạn.");
      if (r.status === 403 || r.status === 404) throw new Error("Token chưa có quyền ghi (Contents: Read and write) vào repo " + g.repo + ".");
      throw new Error(`GitHub báo lỗi ${r.status}: ${j.message || ""}`);
    }
    return r.json();
  }
  async function putFile(path, b64, message) {
    const cur = await gh("GET", path);
    return gh("PUT", path, Object.assign({ message, content: b64, branch: GH().branch }, cur && cur.sha ? { sha: cur.sha } : {}));
  }
  const hasToken = () => !!store.get(TOKEN_KEY, "");

  /* ---------- ảnh ---------- */
  function resizeImage(file, max = 1600) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        const dataURL = cv.toDataURL("image/jpeg", 0.86);
        res({ dataURL, b64: dataURL.split(",")[1] });
      };
      img.onerror = () => rej(new Error("Không đọc được ảnh này."));
      img.src = url;
    });
  }
  const pickFiles = (accept, multiple) => new Promise((res) => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = accept; inp.multiple = !!multiple;
    inp.onchange = () => res([...inp.files]); inp.click();
  });
  async function uploadImage(file, prefix) {
    if (!hasToken()) throw new Error("Cần nhập GitHub token (mục Lưu & kết nối) để tải ảnh lên.");
    const { dataURL, b64 } = await resizeImage(file);
    const path = `uploads/${prefix}-${U.uid()}.jpg`;
    U.localImages[path] = dataURL;
    await putFile(path, b64, `Tải ảnh ${path}`);
    return path;
  }
  async function addPhotos() {
    const files = await pickFiles("image/*", true);
    if (!files.length) return;
    try {
      busy(`Đang tải ${files.length} ảnh lên...`);
      for (const f of files) {
        const p = await uploadImage(f, "anh");
        C.images.album.push({ src: p, caption: f.name.replace(/\.[^.]+$/, "") });
        changed({ render: false }); U.render();
      }
      busy("");
      toast("Đã thêm ảnh. Nhớ bấm “Lưu lên web”.");
    } catch (e) { busy(""); toast(e.message, 4500); }
  }

  /* ---------- chỉnh chữ trực tiếp ---------- */
  function bindInline() {
    document.querySelectorAll("[data-edit]").forEach((el) => {
      if (el.isContentEditable) return;
      try { el.contentEditable = "plaintext-only"; } catch (e) { el.contentEditable = "true"; }
      if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
      el.spellcheck = false;
    });
  }
  document.addEventListener("input", (e) => {
    const el = e.target.closest && e.target.closest("[data-edit]");
    if (!el) return;
    setPath(C, el.dataset.edit, el.innerText.replace(/\n{3,}/g, "\n\n").trim());
    changed({ render: false });
  });
  document.addEventListener("keydown", (e) => {
    const el = e.target.closest && e.target.closest("[data-edit]");
    if (el && e.key === "Enter" && !el.hasAttribute("data-multiline")) { e.preventDefault(); el.blur(); }
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-edit]")) e.stopPropagation();
  }, true);

  /* ---------- album: xoá / thêm ---------- */
  $("#albumGrid").addEventListener("click", (e) => {
    if (e.target.closest("#addPhoto")) { addPhotos(); return; }
    const d = e.target.closest("[data-del]");
    if (d && confirm("Xoá ảnh này khỏi album?")) { C.images.album.splice(+d.dataset.del, 1); changed(); }
  });

  /* ---------- BẢNG CHỈNH SỬA ---------- */
  const field = (label, path, opts = {}) => {
    const v = getPath(C, path) ?? "";
    const id = "f_" + path.replace(/\W/g, "_");
    const inp = opts.area
      ? `<textarea id="${id}" data-p="${path}" rows="${opts.rows || 4}" ${opts.mono ? 'class="mono"' : ""}>${esc(v)}</textarea>`
      : `<input id="${id}" type="${opts.type || "text"}" data-p="${path}" value="${esc(v)}">`;
    return `<label class="ep-field" for="${id}"><span>${label}</span>${inp}${opts.hint ? `<small>${opts.hint}</small>` : ""}</label>`;
  };
  const LANGS = { js: "JavaScript", py: "Python", cpp: "C++", html: "HTML", sql: "SQL", bash: "Git / Bash" };

  const panel = document.createElement("aside");
  panel.className = "ep"; panel.id = "editPanel";
  document.body.appendChild(panel);
  document.body.classList.add("editing");
  if (innerWidth > 680) document.body.classList.add("ep-open");
  const fab = document.createElement("button");
  fab.className = "ep-fab"; fab.type = "button"; fab.textContent = "✎ Bảng chỉnh sửa";
  fab.addEventListener("click", () => document.body.classList.toggle("ep-open"));
  document.body.appendChild(fab);

  let tabIdx = 0;
  function codeSection() {
    const ws = C.codeWishes || (C.codeWishes = []);
    if (tabIdx >= ws.length) tabIdx = Math.max(0, ws.length - 1);
    const w = ws[tabIdx];
    return `<div class="ep-row">
        <select id="epTab" aria-label="Chọn tab">${ws.map((x, i) => `<option value="${i}" ${i === tabIdx ? "selected" : ""}>${esc(x.file)}</option>`).join("")}</select>
        <button type="button" class="ep-mini" id="epAddTab">+ Tab</button>
        ${w ? `<button type="button" class="ep-mini danger" id="epDelTab">Xoá tab</button>` : ""}
      </div>
      ${w ? `${field("Tên file", `codeWishes.${tabIdx}.file`)}
        <label class="ep-field" for="epLang"><span>Ngôn ngữ</span><select id="epLang">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${w.lang === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        ${field("Code", `codeWishes.${tabIdx}.code`, { area: true, rows: 10, mono: true })}
        ${field("Kết quả khi bấm ▶ Run", `codeWishes.${tabIdx}.output`, { area: true, rows: 3, mono: true })}` : `<p class="ep-note">Chưa có tab nào.</p>`}`;
  }

  function build() {
    const M = C.music, im = C.images;
    panel.innerHTML = `
      <div class="ep-head">
        <div><b>Chế độ chỉnh sửa</b><small id="epDirty">Chưa có thay đổi</small></div>
        <button type="button" class="ep-x" id="epClose" aria-label="Thu gọn">×</button>
      </div>
      <div class="ep-body">
        ${window.__thiepDraft ? `<div class="ep-alert">Đang mở bản nháp chưa lưu trên máy này. <button type="button" class="ep-link" id="epDiscard2">Bỏ nháp</button></div>` : ""}
        <p class="ep-tip">Mẹo: <b>bấm thẳng vào chữ trên thiệp</b> để sửa (chữ có viền nét đứt). Các mục khác sửa ở bảng này.</p>

        <details open><summary>Thông tin chung</summary>
          ${field("Danh xưng", "teacher.honorific")}
          ${field("Tên Thầy", "teacher.name")}
          ${field("Tên của bạn (chữ ký)", "sender.name")}
          ${field("Lớp", "sender.className")}
          ${field("Ngày", "date")}
          ${field("Tiêu đề trong thiệp", "card.title", { hint: "Chữ trong [ ] sẽ viết kiểu chữ tay. Viết {thay} = tên Thầy." })}
          ${field("Chữ trên nút mở bìa", "cover.openText")}
        </details>

        <details open><summary>Hình ảnh</summary>
          <div class="ep-imgrow">
            <div class="ep-thumb">${im.cover ? `<img src="${esc(U.imgSrc(im.cover))}" alt="">` : `<span>Bó hoa</span>`}</div>
            <div class="ep-col">
              <b>Ảnh bìa</b>
              <button type="button" class="ep-mini" id="epCover">Chọn ảnh bìa</button>
              ${im.cover ? `<button type="button" class="ep-mini danger" id="epCoverReset">Dùng lại bó hoa</button>` : ""}
            </div>
          </div>
          <div class="ep-imgrow">
            <div class="ep-thumb">${im.album.length ? `<img src="${esc(U.imgSrc(im.album[im.album.length - 1].src))}" alt="">` : "<span>Trống</span>"}</div>
            <div class="ep-col">
              <b>Album kỷ niệm (${im.album.length} ảnh)</b>
              <button type="button" class="ep-mini" id="epAddPhotos">+ Thêm ảnh</button>
              <small>Sửa chú thích bằng cách bấm vào chữ dưới ảnh, xoá ảnh bằng nút × trên ảnh.</small>
            </div>
          </div>
        </details>

        <details open><summary>Nhạc nền</summary>
          ${field("Tên bài hát", "music.title")}
          ${field("Ca sĩ / nhạc sĩ", "music.artist")}
          ${field("Link YouTube", "music.youtube", { hint: "Mở bài hát trên YouTube, bấm Chia sẻ → Sao chép, rồi dán vào đây." })}
          ${field("Bắt đầu từ giây", "music.start", { type: "number" })}
          <div class="ep-row">
            <button type="button" class="ep-mini" id="epMp3">Hoặc tải file mp3 lên</button>
            ${M.url ? `<button type="button" class="ep-mini danger" id="epMp3Del">Bỏ file mp3</button>` : ""}
          </div>
          ${M.url ? `<small class="ep-note">Đang dùng file: ${esc(M.url)} (file mp3 được ưu tiên hơn YouTube).</small>` : ""}
          <button type="button" class="ep-mini" id="epPlay">▶ Nghe thử</button>
        </details>

        <details><summary>Lời chúc bằng code</summary><div id="epCode">${codeSection()}</div></details>

        <details><summary>Thư gửi Thầy</summary>
          <label class="ep-field" for="epLetter"><span>Nội dung thư</span><textarea id="epLetter" rows="10">${esc((C.card.letter || []).join("\n\n"))}</textarea><small>Mỗi đoạn cách nhau một dòng trống. Cũng có thể bấm thẳng vào thư trên thiệp để sửa.</small></label>
        </details>

        <details><summary>Màn code mở đầu</summary>
          ${field("Tên file", "intro.filename")}
          ${field("Code tự gõ", "intro.code", { area: true, rows: 12, mono: true, hint: "Bấm “↺ Xem lại code” trên thiệp để xem thử." })}
          ${field("Tốc độ gõ (mili-giây mỗi ký tự)", "intro.typingSpeed", { type: "number" })}
          ${field("Chữ trên nút", "intro.buttonText")}
        </details>

        <details><summary>Bức tường lời chúc</summary>
          ${field("Link Google Apps Script", "wishes.endpoint", { hint: "Xem README.md, mục “Nhận lời chúc vào Google Sheet”." })}
          <label class="ep-field" for="epAdmin"><span>Mật khẩu quản trị (để xoá lời chúc)</span><input id="epAdmin" type="password" value="${esc(store.get(U.ADMIN_KEY, ""))}" autocomplete="off"><small>Trùng với ADMIN_KEY trong Apps Script. Chỉ lưu trên máy này. Bấm × trên từng lời chúc để xoá.</small></label>
        </details>

        <details open><summary>Lưu &amp; kết nối GitHub</summary>
          <label class="ep-field" for="epToken"><span>GitHub token</span><input id="epToken" type="password" value="${esc(store.get(TOKEN_KEY, ""))}" autocomplete="off" placeholder="github_pat_..."><small>Chỉ lưu trên máy này, không đưa lên web. <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Tạo token</a>: chọn repo ${esc(GH().repo)}, quyền <i>Contents: Read and write</i>.</small></label>
          <div class="ep-row"><button type="button" class="ep-mini" id="epCheck">Kiểm tra token</button></div>
          <p class="ep-status" id="epStatus" role="status"></p>
        </details>
      </div>
      <div class="ep-foot">
        <button type="button" class="btn" id="epSave">Lưu lên web</button>
        <div class="ep-row">
          <button type="button" class="ep-mini" id="epDownload">Tải content.json</button>
          <button type="button" class="ep-mini danger" id="epDiscard">Bỏ thay đổi</button>
          <a class="ep-mini" href="index.html" target="_blank" rel="noopener">Xem như khách</a>
        </div>
      </div>`;
    bindPanel();
    setDirty(dirty);
  }

  function bindPanel() {
    panel.querySelectorAll("[data-p]").forEach((el) => el.addEventListener("input", () => {
      let v = el.value;
      if (el.type === "number") v = v === "" ? 0 : +v;
      setPath(C, el.dataset.p, v);
      changed();
      if (el.dataset.p.startsWith("music.")) { clearTimeout(bindPanel.mT); bindPanel.mT = setTimeout(() => U.reloadMusic(), 600); }
    }));
    const on = (id, ev, fn) => { const el = panel.querySelector("#" + id); if (el) el.addEventListener(ev, fn); };
    on("epClose", "click", () => document.body.classList.remove("ep-open"));
    on("epLetter", "input", (e) => { C.card.letter = e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean); changed(); });
    on("epAdmin", "input", (e) => store.set(U.ADMIN_KEY, e.target.value));
    on("epToken", "input", (e) => store.set(TOKEN_KEY, e.target.value.trim()));
    on("epCheck", "click", checkToken);
    on("epSave", "click", save);
    on("epDownload", "click", download);
    const discard = () => { if (confirm("Bỏ mọi thay đổi chưa lưu và quay về bản đang có trên web?")) { store.set(U.DRAFT_CONTENT_KEY, null); location.reload(); } };
    on("epDiscard", "click", discard); on("epDiscard2", "click", discard);
    on("epCover", "click", async () => {
      const [f] = await pickFiles("image/*"); if (!f) return;
      try { busy("Đang tải ảnh bìa..."); C.images.cover = await uploadImage(f, "bia"); busy(""); changed({ render: false }); U.render(); build(); toast("Đã đổi ảnh bìa. Nhớ bấm “Lưu lên web”."); }
      catch (e) { busy(""); toast(e.message, 4500); }
    });
    on("epCoverReset", "click", () => { C.images.cover = ""; changed({ render: false }); U.render(); build(); });
    on("epAddPhotos", "click", async () => { await addPhotos(); build(); });
    on("epMp3", "click", async () => {
      const [f] = await pickFiles("audio/mpeg,audio/mp3,audio/*"); if (!f) return;
      if (f.size > 20 * 1024 * 1024) { toast("File nhạc lớn quá (tối đa 20 MB)."); return; }
      if (!hasToken()) { toast("Cần nhập GitHub token để tải nhạc lên.", 4000); return; }
      try {
        busy("Đang tải nhạc lên (có thể mất một lúc)...");
        const dataURL = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
        const path = `uploads/nhac-${U.uid()}.mp3`;
        U.localImages[path] = dataURL;
        await putFile(path, dataURL.split(",")[1], "Tải nhạc nền");
        C.music.url = path; busy(""); changed({ render: false }); U.reloadMusic(); build(); toast("Đã tải nhạc lên. Nhớ bấm “Lưu lên web”.");
      } catch (e) { busy(""); toast(e.message, 4500); }
    });
    on("epMp3Del", "click", () => { C.music.url = ""; changed({ render: false }); U.reloadMusic(); build(); });
    on("epPlay", "click", () => { U.reloadMusic(); setTimeout(() => document.getElementById("soundBtn").click(), 300); });
    bindCode();
  }

  function bindCode() {
    const box = panel.querySelector("#epCode"); if (!box) return;
    box.querySelectorAll("[data-p]").forEach((el) => el.addEventListener("input", () => { setPath(C, el.dataset.p, el.value); changed(); if (el.dataset.p.endsWith(".file")) { const o = box.querySelector(`#epTab option[value="${tabIdx}"]`); if (o) o.textContent = el.value; } }));
    const sel = box.querySelector("#epTab");
    if (sel) sel.addEventListener("change", () => { tabIdx = +sel.value; refreshCode(); document.querySelector(`#wishTabs .ed-tab[data-i="${tabIdx}"]`)?.click(); });
    box.querySelector("#epLang")?.addEventListener("change", (e) => { C.codeWishes[tabIdx].lang = e.target.value; changed(); });
    box.querySelector("#epAddTab")?.addEventListener("click", () => {
      C.codeWishes.push({ file: "loi_chuc_moi.js", lang: "js", code: "// Viết lời chúc bằng code ở đây\nconsole.log(\"Chúc Thầy luôn vui khỏe!\");", output: "Chúc Thầy luôn vui khỏe!" });
      tabIdx = C.codeWishes.length - 1; changed(); refreshCode();
      setTimeout(() => document.querySelector(`#wishTabs .ed-tab[data-i="${tabIdx}"]`)?.click(), 320);
    });
    box.querySelector("#epDelTab")?.addEventListener("click", () => {
      if (!confirm(`Xoá tab “${C.codeWishes[tabIdx].file}”?`)) return;
      C.codeWishes.splice(tabIdx, 1); tabIdx = 0; changed(); refreshCode();
    });
  }
  function refreshCode() { const box = panel.querySelector("#epCode"); box.innerHTML = codeSection(); bindCode(); }
  (U.onTab = U.onTab || []).push((i) => { if (i !== tabIdx && panel.querySelector("#epCode")) { tabIdx = i; refreshCode(); } });

  /* ---------- trạng thái ---------- */
  let dirty = !!window.__thiepDraft;
  function setDirty(v) {
    dirty = v;
    const d = panel.querySelector("#epDirty");
    if (d) { d.textContent = v ? "Có thay đổi chưa lưu lên web" : "Đã đồng bộ với web"; d.classList.toggle("warn", v); }
  }
  function say(msg) { const s = panel.querySelector("#epStatus"); if (s) s.textContent = msg; }
  function busy(msg) { say(msg); document.body.classList.toggle("ep-busy", !!msg); }

  async function checkToken() {
    const t = store.get(TOKEN_KEY, "");
    if (!t) { busy(""); toast("Bạn chưa nhập token."); return; }
    try {
      const g = GH();
      const r = await fetch(`https://api.github.com/repos/${g.owner}/${g.repo}`, { headers: { Authorization: `Bearer ${t}`, Accept: "application/vnd.github+json" } });
      const j = await r.json();
      if (!r.ok) throw new Error(r.status === 401 ? "Token sai hoặc đã hết hạn." : "Token không mở được repo " + g.repo + ".");
      const ok = j.permissions ? j.permissions.push : true;
      panel.querySelector("#epStatus").textContent = ok ? "✔ Token dùng được, có quyền lưu lên web." : "Token đọc được repo nhưng KHÔNG có quyền ghi. Cấp thêm quyền Contents: Read and write.";
    } catch (e) { panel.querySelector("#epStatus").textContent = e.message; }
  }

  async function save() {
    const btn = panel.querySelector("#epSave");
    try {
      btn.disabled = true; busy("Đang lưu lên web...");
      await putFile("content.json", b64utf8(JSON.stringify(snapshot(), null, 2) + "\n"), "Cập nhật nội dung thiệp");
      store.set(U.DRAFT_CONTENT_KEY, null); window.__thiepDraft = false;
      setDirty(false); busy(""); say("✔ Đã lưu. Khoảng 1–2 phút nữa mọi người sẽ thấy bản mới.");
      toast("Đã lưu lên web!");
    } catch (e) { busy(""); say(e.message); toast(e.message, 4500); }
    finally { btn.disabled = false; }
  }
  function download() {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2) + "\n"], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "content.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Đã tải content.json. Tải file này lên repo (thay file cũ) để cập nhật web.", 4500);
  }
  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  (U.afterRender = U.afterRender || []).push(bindInline);
  build();
  bindInline();
  U.renderWall && U.renderWall();
  window.ThiepEditor = { build };
})();
