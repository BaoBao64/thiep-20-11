/* wish.js — trang "Thiệp sáng tạo": mọi người tự viết thiệp gửi Thầy */
window.Thiep.ready.then(function () {
  "use strict";
  const C = window.CONFIG, U = window.Thiep;
  const { $, esc, fill, store, THEMES, STICKERS, toast } = U;
  const T = C.teacher, W = C.wishes || {}, P = C.wishPage || {};
  const DRAFT_KEY = "thiep2011_draft";
  const MAX = W.maxLength || 500;

  $("#scene").innerHTML = U.sceneHTML();
  document.title = fill("Thiệp sáng tạo · Gửi {danh_xung} {thay}");
  $("#wishTitle").innerHTML = esc(fill(P.title)).replace(new RegExp(esc(T.honorific) + "$"), `<span class="script">${esc(T.honorific)} ${esc(T.name)}</span>`);
  $("#wishSub").textContent = fill(P.subtitle);
  $("#fMsg").maxLength = MAX; $("#max").textContent = MAX;

  const LANGS = { js: "JavaScript", py: "Python", cpp: "C++", html: "HTML" };
  const FILES = { js: "gui_thay.js", py: "gui_thay.py", cpp: "gui_thay.cpp", html: "thiep.html" };
  const STK_KEYS = ["heart", "flower", "star", "apple", "book", "laptop", "pencil"];
  const VIEWS = { both: "Lời chúc + code", text: "Chỉ lời chúc", code: "Chỉ code" };

  const state = Object.assign({ name: "", className: "", message: "", lang: "js", theme: "dao", sticker: "heart", view: "both" }, store.get(DRAFT_KEY, {}));

  /* ---------- Biến lời chúc thành code ---------- */
  function wrapText(s, w = 34) {
    const out = [];
    String(s).split(/\n/).forEach((par) => {
      const words = par.trim().split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(""); return; }
      let line = "";
      words.forEach((wd) => {
        if (line && (line + " " + wd).length > w) { out.push(line); line = wd; }
        else line = line ? line + " " + wd : wd;
      });
      if (line) out.push(line);
    });
    while (out.length && out[out.length - 1] === "") out.pop();
    return out;
  }
  const q = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const h = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function genCode(d) {
    const to = `${T.honorific} ${T.name}`;
    const name = d.name || "Tên của bạn";
    const L = wrapText(d.message || "Lời chúc của bạn sẽ hiện ở đây...");
    let lines;
    if (d.lang === "py") {
      lines = [`# gui_thay.py · ${C.date}`, `loi_chuc = LoiChuc(`, `    tu="${q(name)}",`,
        d.className ? `    lop="${q(d.className)}",` : null, `    gui_den="${q(to)}",`, `)`,
        `loi_chuc.noi_dung = [`, ...L.map((l) => `    "${q(l)}",`), `]`, ``, `thay.nhan(loi_chuc)  # 100% chân thành`];
    } else if (d.lang === "cpp") {
      lines = [`#include <long_biet_on>`, `using namespace std;`, ``, `int main() {`, `    string tu = "${q(name)}";`,
        `    cout << "Kính gửi ${q(to)}," << endl;`, ...L.map((l) => `    cout << "${q(l)}" << endl;`),
        `    return 0; // 0 lỗi, 100% yêu thương`, `}`];
    } else if (d.lang === "html") {
      lines = [`<!-- thiep.html · ${C.date} -->`, `<thiep gui-den="${h(to)}">`, ...L.map((l) => `  <p>${h(l)}</p>`),
        `  <ky-ten>${h(name)}${d.className ? " · " + h(d.className) : ""}</ky-ten>`, `</thiep>`];
    } else {
      lines = [`// gui_thay.js · ${C.date}`, `const loiChuc = {`, `  tu: "${q(name)}",`,
        d.className ? `  lop: "${q(d.className)}",` : null, `  guiDen: "${q(to)}",`, `  noiDung: [`,
        ...L.map((l) => `    "${q(l)}",`), `  ],`, `};`, ``, `guiThay(loiChuc); // gửi bằng cả trái tim`];
    }
    return lines.filter((x) => x !== null).join("\n");
  }

  /* ---------- Vẽ thiệp ---------- */
  function renderCard(el, d) {
    const th = THEMES[d.theme] || THEMES.dao;
    Object.entries({ "--a": th.a, "--a2": th.a2, "--b": th.b, "--ink": th.ink }).forEach(([k, v]) => el.style.setProperty(k, v));
    const msg = d.message ? esc(d.message) : "Lời chúc của bạn sẽ hiện ở đây...";
    const showText = d.view !== "code", showCode = d.view !== "text";
    el.innerHTML = `
      <div class="mc-head">
        <div class="mc-sticker">${(STICKERS[d.sticker] || STICKERS.heart)()}</div>
        <div>
          <div class="mc-kicker">${esc(C.occasion)}</div>
          <div class="mc-to">Kính gửi ${esc(T.honorific)}<b>${esc(T.name)}</b></div>
        </div>
        <div class="mc-stamp">20.11</div>
      </div>
      <div class="mc-body">
        ${showText ? `<div class="mc-msg${d.message ? "" : " empty"}">${msg}</div>` : ""}
        ${showCode ? `<div class="editor mc-code"><div class="ed-bar"><span class="dots"><i></i><i></i><i></i></span><span class="ed-title">${esc(FILES[d.lang] || FILES.js)}</span></div><div class="ed-body"><div class="code"></div></div></div>` : ""}
        <div class="mc-sign">— ${esc(d.name || "Tên của bạn")}${d.className ? `<small>Lớp ${esc(d.className)}</small>` : ""}</div>
        <div class="mc-foot"><span>&lt;/&gt; ${esc(LANGS[d.lang] || "JavaScript")}</span><span>${esc(C.date)}</span></div>
      </div>`;
    if (showCode) U.renderCode(el.querySelector(".code"), genCode(d), d.lang);
  }

  /* ---------- CHẾ ĐỘ XEM (link chia sẻ) ---------- */
  function fromShort(o) {
    return { name: o.n || "", className: o.c || "", message: o.m || "", lang: o.l || "js", theme: o.t || "dao", sticker: o.s || "heart", view: o.v || "both" };
  }
  function checkView() {
    const m = /^#w=(.+)$/.exec(location.hash);
    const data = m && U.decodeData(m[1]);
    if (!data) { $("#viewMode").hidden = true; $("#editorView").hidden = false; return false; }
    $("#editorView").hidden = true; $("#viewMode").hidden = false;
    const d = fromShort(data);
    renderCard($("#viewCard"), d);
    document.title = `Thiệp của ${d.name || "học trò"} gửi ${T.honorific}`;
    setTimeout(() => U.confetti(), 400);
    return true;
  }
  window.addEventListener("hashchange", checkView);
  const isView = checkView();

  /* ---------- FORM ---------- */
  const chip = (group, key, label, extra = "") => `<button type="button" class="${extra || "chip"}" data-g="${group}" data-k="${key}" aria-pressed="${state[group] === key}">${label}</button>`;
  $("#langChips").innerHTML = Object.entries(LANGS).map(([k, v]) => chip("lang", k, `<b class="lang-dot" data-lang="${k}"></b>${v}`, "chip mono")).join("");
  $("#themeChips").innerHTML = Object.entries(THEMES).map(([k, t]) =>
    `<button type="button" class="swatch" data-g="theme" data-k="${k}" aria-pressed="${state.theme === k}" title="${t.name}" aria-label="${t.name}" style="--a:${t.a};--a2:${t.a2}"></button>`).join("");
  $("#stkChips").innerHTML = STK_KEYS.map((k) => chip("sticker", k, STICKERS[k](), "stk-chip")).join("");
  $("#viewChips").innerHTML = Object.entries(VIEWS).map(([k, v]) => chip("view", k, v)).join("");

  document.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => {
    const g = b.dataset.g; state[g] = b.dataset.k;
    document.querySelectorAll(`[data-g="${g}"]`).forEach((x) => x.setAttribute("aria-pressed", x === b));
    update();
  }));

  const fName = $("#fName"), fClass = $("#fClass"), fMsg = $("#fMsg");
  fName.value = state.name; fClass.value = state.className; fMsg.value = state.message;
  [fName, fClass, fMsg].forEach((el) => el.addEventListener("input", () => {
    state.name = fName.value.trim(); state.className = fClass.value.trim(); state.message = fMsg.value.trim();
    update();
  }));
  let sIdx = Math.floor(Math.random() * 10);
  $("#suggestBtn").addEventListener("click", () => {
    const s = P.samples || []; if (!s.length) return;
    fMsg.value = s[sIdx++ % s.length]; fMsg.dispatchEvent(new Event("input"));
  });

  function update() {
    $("#count").textContent = fMsg.value.length;
    renderCard($("#preview"), state);
    store.set(DRAFT_KEY, state);
  }
  if (!isView) update();

  $("#sendNote").textContent = W.endpoint
    ? "Lời chúc sẽ được gửi thẳng đến Thầy và hiện trên bức tường lời chúc."
    : "Mẹo: bấm “Tạo link & QR” để gửi tấm thiệp này cho Thầy qua Zalo/Messenger.";

  function validate() {
    if (!state.name) { toast("Bạn nhớ điền tên nhé!"); fName.focus(); return false; }
    if (!state.message) { toast("Bạn chưa viết lời chúc nè!"); fMsg.focus(); return false; }
    return true;
  }

  /* Gửi lời chúc */
  $("#sendBtn").addEventListener("click", async () => {
    if (!validate()) return;
    const payload = { id: U.uid(), token: U.uid() + U.uid(), name: state.name, className: state.className, message: state.message, lang: state.lang, theme: state.theme, sticker: state.sticker, view: state.view, time: new Date().toISOString() };
    const list = store.get(U.WISH_KEY, []); list.push(payload); store.set(U.WISH_KEY, list);
    if (!W.endpoint) { toast("Đã lưu lời chúc trên máy này. Hãy tạo link để gửi Thầy nhé!"); openShare(); return; }
    const btn = $("#sendBtn"); btn.disabled = true; btn.textContent = "Đang gửi...";
    try {
      await fetch(W.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      // đánh dấu đã gửi để không gửi lại
      const saved = store.get(U.WISH_KEY, []); const me = saved.find((x) => x.id === payload.id);
      if (me) { me.syncedTo = W.endpoint; store.set(U.WISH_KEY, saved); }
      toast("Đã gửi lời chúc đến Thầy! Cảm ơn bạn ♥", 3500);
      U.confetti();
    } catch (e) {
      toast("Gửi chưa được, bạn thử lại hoặc dùng “Tạo link & QR” nhé.");
    } finally {
      btn.disabled = false; btn.textContent = "♥ Gửi lời chúc đến Thầy";
    }
  });

  /* Tạo link + QR */
  function shareUrl() {
    const o = { n: state.name, c: state.className, m: state.message, l: state.lang, t: state.theme, s: state.sticker, v: state.view };
    const base = location.href.split("#")[0].split("?")[0];
    return base + "#w=" + U.encodeData(o);
  }
  function openShare() {
    const url = shareUrl();
    $("#shareUrl").value = url; $("#openShare").href = url;
    U.makeQR($("#shareQR"), url, 220, "L");
    $("#shareModal").hidden = false;
  }
  $("#shareBtn").addEventListener("click", () => { if (validate()) openShare(); });
  $("#closeModal").addEventListener("click", () => ($("#shareModal").hidden = true));
  $("#shareModal").addEventListener("click", (e) => { if (e.target.id === "shareModal") e.currentTarget.hidden = true; });
  $("#copyBtn").addEventListener("click", async () => {
    const v = $("#shareUrl").value;
    try { await navigator.clipboard.writeText(v); } catch (e) { $("#shareUrl").select(); document.execCommand("copy"); }
    toast("Đã sao chép link thiệp!");
  });

  /* Tải ảnh thiệp (html2canvas tải khi cần) */
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "assets/vendor/html2canvas.min.js";
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  async function download(el, who) {
    try {
      toast("Đang tạo ảnh...");
      await loadH2C();
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
      const a = document.createElement("a");
      a.download = `thiep-20-11-${(who || "hoc-tro").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      a.href = canvas.toDataURL("image/png"); a.click();
      toast("Đã tải ảnh thiệp!");
    } catch (e) { toast("Chưa tải được ảnh, bạn thử chụp màn hình nhé."); }
  }
  $("#dlBtn").addEventListener("click", () => download($("#preview"), state.name));
  $("#dlBtn2").addEventListener("click", () => { const m = /^#w=(.+)$/.exec(location.hash); const d = m && U.decodeData(m[1]); download($("#viewCard"), d && d.n); });
});
