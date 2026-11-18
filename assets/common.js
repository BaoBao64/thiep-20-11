/* common.js — phần dùng chung cho index.html và wish.html
   (tô màu code, hiệu ứng gõ phím, khung cảnh trường học, QR, pháo giấy...) */
(function () {
  "use strict";
  const C = window.CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // Mặc định LUÔN chạy hiệu ứng. Đặt CONFIG.respectReducedMotion = true nếu muốn tắt hiệu ứng
  // cho máy bật "Giảm chuyển động" (Reduce Motion).
  const reduced = C.respectReducedMotion === true && !!window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function fill(s) {
    const t = C.teacher || {}, me = C.sender || {};
    return String(s ?? "")
      .replace(/\{thay\}/g, t.name || "")
      .replace(/\{danh_xung\}/g, t.honorific || "Thầy")
      .replace(/\{toi\}/g, me.name || "")
      .replace(/\{lop\}/g, me.className || "")
      .replace(/\{ngay\}/g, C.date || "")
      .replace(/\{occasion\}/g, C.occasion || "");
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
  };

  /* ---------- NỘI DUNG ĐÃ CHỈNH SỬA (content.json) ----------
     config.js = nội dung gốc; content.json = phần bạn sửa trong chế độ chỉnh sửa (?edit). */
  const EDIT = /[?&]edit\b/.test(location.search);
  const DRAFT_CONTENT_KEY = "thiep2011_draft_content";
  function deepMerge(t, s) {
    for (const k in s) {
      const v = s[k];
      if (v && typeof v === "object" && !Array.isArray(v) && t[k] && typeof t[k] === "object" && !Array.isArray(t[k])) deepMerge(t[k], v);
      else t[k] = v;
    }
    return t;
  }
  const ready = (async () => {
    try {
      const r = await fetch("content.json?v=" + Date.now(), { cache: "no-store" });
      if (r.ok) deepMerge(C, await r.json());
    } catch (e) { /* chưa có content.json thì dùng config.js */ }
    if (EDIT) {
      const d = store.get(DRAFT_CONTENT_KEY, null);
      if (d) { deepMerge(C, d); window.__thiepDraft = true; }
    }
  })();
  /* Gửi bù lên Google Sheet những lời chúc đã viết trên máy này trước khi web được kết nối
     (hoặc lúc mạng lỗi). Chạy mỗi khi mở trang, mỗi lời chúc chỉ gửi một lần. */
  async function syncLocalWishes() {
    const ep = C.wishes && C.wishes.endpoint;
    if (!ep) return 0;
    const KEY = "thiep2011_wishes";
    const list = store.get(KEY, []);
    let sent = 0;
    for (const w of list) {
      if (w.syncedTo === ep || !w.message) continue;   // đã gửi tới đúng nơi nhận hiện tại
      if (!w.id) w.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try {
        await fetch(ep, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(w) });
        w.syncedTo = ep; sent++;
      } catch (e) { break; }
    }
    if (sent) store.set(KEY, list);
    return sent;
  }
  ready.then(() => setTimeout(syncLocalWishes, 1500));

  /* Lấy danh sách lời chúc từ Google Sheet */
  async function fetchRemoteWishes() {
    const ep = C.wishes && C.wishes.endpoint;
    if (!ep) return null;
    const r = await fetch(ep + (ep.includes("?") ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" });
    const j = await r.json();
    return Array.isArray(j) ? j : j.data || j.wishes || [];
  }

  /* Xoá lời chúc. items: [{ id, token? }]. key: mật khẩu ADMIN_KEY (có thể trống nếu là chủ lời chúc).
     Sau khi gửi lệnh xoá, tải lại danh sách để biết đã xoá được thật chưa. */
  async function deleteWishes(items, key) {
    const KEY = "thiep2011_wishes";
    const ids = new Set(items.map((w) => String(w.id)));
    store.set(KEY, store.get(KEY, []).filter((w) => !ids.has(String(w.id))));
    const ep = C.wishes && C.wishes.endpoint;
    if (!ep) return { ok: true, remaining: [] };
    for (const w of items) {
      if (!w.id) continue;
      await fetch(ep, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "delete", id: w.id, key: key || "", token: w.token || "" }) });
    }
    await new Promise((r) => setTimeout(r, 1500));
    let list;
    try { list = await fetchRemoteWishes(); } catch (e) { return { ok: false, unknown: true, remaining: items }; }
    const still = new Set(list.map((w) => String(w.id)));
    const remaining = items.filter((w) => w.id && still.has(String(w.id)));
    return { ok: remaining.length === 0, remaining };
  }

  const localImages = {};
  const imgSrc = (p) => localImages[p] || p;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ---------------- TÔ MÀU CODE ---------------- */
  const KW = new Set(("const let var function return new class def for in while if else elif try catch except " +
    "finally import from export default as async await of int void using namespace include string auto bool char double " +
    "SELECT FROM WHERE ORDER BY DESC ASC AND OR LIMIT INSERT INTO VALUES").split(/\s+/));
  const LIT = new Set("true false null undefined None True False Infinity NaN".split(" "));
  const SELF = new Set(["this", "self"]);

  function tokenize(src, lang) {
    const out = []; let i = 0; const n = src.length;
    const push = (cls, txt) => {
      if (!txt) return;
      const last = out[out.length - 1];
      if (last && last[0] === cls) last[1] += txt; else out.push([cls, txt]);
    };
    const isIdStart = (c) => /[\p{L}_$]/u.test(c);
    const isId = (c) => /[\p{L}\p{N}_$]/u.test(c);
    const lineCom = { js: "//", cpp: "//", py: "#", bash: "#", sql: "--" }[lang];
    const readStr = (q) => {
      let j = i + q.length;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src.startsWith(q, j)) { j += q.length; break; }
        if (q.length === 1 && q !== "`" && src[j] === "\n") break;
        j++;
      }
      push("str", src.slice(i, j)); i = j;
    };
    const atLineStart = () => { let k = i - 1; while (k >= 0 && (src[k] === " " || src[k] === "\t")) k--; return k < 0 || src[k] === "\n"; };
    const prevSig = () => { let k = i - 1; while (k >= 0 && /\s/.test(src[k])) k--; return src[k]; };

    while (i < n) {
      const ch = src[i];
      if (ch === "\n") { push("", ch); i++; continue; }

      if (lang === "html") {
        if (src.startsWith("<!--", i)) { const e = src.indexOf("-->", i); const j = e < 0 ? n : e + 3; push("com", src.slice(i, j)); i = j; continue; }
        if (ch === "<" && /[A-Za-z\/!]/.test(src[i + 1] || "")) {
          let j = i + 1; if (src[j] === "/" || src[j] === "!") j++;
          while (j < n && /[\w-]/.test(src[j])) j++;
          push("tag", src.slice(i, j)); i = j;
          while (i < n && src[i] !== ">" && src[i] !== "\n") {
            const c = src[i];
            if (c === '"' || c === "'") { readStr(c); continue; }
            if (/[\w-]/.test(c)) { let k = i; while (k < n && /[\w:-]/.test(src[k])) k++; push("attr", src.slice(i, k)); i = k; continue; }
            if (c === "=") { push("op", c); i++; continue; }
            if (c === "/") { push("tag", c); i++; continue; }
            push("", c); i++;
          }
          if (src[i] === ">") { push("tag", ">"); i++; }
          continue;
        }
        if (ch === "&") { const m = /^&[#\w]+;/.exec(src.slice(i, i + 12)); if (m) { push("num", m[0]); i += m[0].length; continue; } }
        push("", ch); i++; continue;
      }

      if ((lang === "js" || lang === "cpp") && src.startsWith("/*", i)) { const e = src.indexOf("*/", i + 2); const j = e < 0 ? n : e + 2; push("com", src.slice(i, j)); i = j; continue; }
      if (lineCom && src.startsWith(lineCom, i)) { const e = src.indexOf("\n", i); const j = e < 0 ? n : e; push("com", src.slice(i, j)); i = j; continue; }
      if (lang === "cpp" && ch === "#") { let j = i + 1; while (j < n && /\w/.test(src[j])) j++; push("kw", src.slice(i, j)); i = j; continue; }
      if (lang === "cpp" && ch === "<" && /#include\s*$/.test(src.slice(Math.max(0, i - 20), i))) {
        const m = /^<[\w.\/]+>/.exec(src.slice(i, i + 60)); if (m) { push("str", m[0]); i += m[0].length; continue; }
      }
      if (lang === "bash" && ch === "$" && atLineStart()) { push("prompt", "$"); i++; continue; }
      if (lang === "py" && (src.startsWith('"""', i) || src.startsWith("'''", i))) { readStr(src.substr(i, 3)); continue; }
      if (ch === '"' || ch === "'" || (ch === "`" && lang === "js")) { readStr(ch); continue; }
      if (/\d/.test(ch) && !isId(src[i - 1] || " ")) { let j = i; while (j < n && /[\d.]/.test(src[j])) j++; if (src[j] === "%") j++; push("num", src.slice(i, j)); i = j; continue; }
      if (isIdStart(ch)) {
        let j = i; while (j < n && isId(src[j])) j++;
        const w = src.slice(i, j);
        let k = j; while (k < n && src[k] === " ") k++;
        const nx = src[k], pv = prevSig();
        let cls = "";
        if (lang === "sql") cls = KW.has(w) ? "kw" : "";
        else if (lang === "bash") cls = ["git", "node", "npm", "echo"].includes(w) ? "fn" : (src[i - 1] === "-" ? "attr" : "");
        else if (KW.has(w)) cls = "kw";
        else if (LIT.has(w)) cls = "num";
        else if (SELF.has(w)) cls = "self";
        else if (pv === ".") cls = nx === "(" ? "fn" : "prop";
        else if (nx === "(") cls = /^[A-Z]/.test(w) ? "cls" : "fn";
        else if (/^[A-Z]/.test(w)) cls = "cls";
        else if (nx === ":" && lang === "js") cls = "prop";
        else if (nx === "=" && src[k + 1] !== "=" && lang === "py" && /[(,]\s*$/.test(src.slice(Math.max(0, i - 60), i))) cls = "attr";
        push(cls, w); i = j; continue;
      }
      if (/[=+\-*\/<>!&|%?:]/.test(ch)) { push("op", ch); i++; continue; }
      if (/[{}()\[\];,.]/.test(ch)) { push("pun", ch); i++; continue; }
      push("", ch); i++;
    }
    return out;
  }

  function splitLines(tokens) {
    const lines = [[]];
    for (const [c, t] of tokens) {
      t.split("\n").forEach((p, idx) => { if (idx > 0) lines.push([]); if (p) lines[lines.length - 1].push([c, p]); });
    }
    return lines;
  }
  const lineHTML = (line) => line.map(([c, t]) => (c ? `<span class="t-${c}">${esc(t)}</span>` : esc(t))).join("");

  function renderCode(el, code, lang) {
    const lines = splitLines(tokenize(code, lang));
    el.innerHTML = lines.map((l, i) => `<div class="ln"><span class="no">${i + 1}</span><span class="lc">${lineHTML(l)}</span></div>`).join("");
  }

  /* Hiệu ứng gõ phím từng ký tự */
  function typeCode(el, code, lang, opt = {}) {
    const speed = opt.speed || 22;
    const scroller = opt.scroller || el;
    const lines = splitLines(tokenize(code, lang));
    el.innerHTML = "";
    let li = 0, ti = 0, ci = 0, lc = null, span = null, done = false, raf = 0;
    const caret = document.createElement("span"); caret.className = "caret";
    let next = performance.now() + 500;

    function newRow() {
      const row = document.createElement("div"); row.className = "ln";
      row.innerHTML = `<span class="no">${li + 1}</span><span class="lc"></span>`;
      lc = row.lastChild; el.appendChild(row); lc.appendChild(caret); span = null;
    }
    function step() {
      if (li >= lines.length) return -1;
      if (!lc) newRow();
      const line = lines[li];
      if (ti >= line.length) { li++; ti = 0; ci = 0; lc = null; return li >= lines.length ? -1 : speed * (line.length ? 6 : 3); }
      const [c, t] = line[ti];
      if (!span) { span = document.createElement("span"); if (c) span.className = "t-" + c; lc.insertBefore(span, caret); }
      let ch = t[ci];
      // khoảng trắng đầu dòng: gõ một lần cho nhanh
      if (ti === 0 && ci === 0 && /^\s+$/.test(t)) ch = t;
      span.textContent += ch; ci += ch.length;
      if (ci >= t.length) { ti++; ci = 0; span = null; }
      return ch === " " ? speed * 0.4 : speed * (0.55 + Math.random() * 0.9);
    }
    function frame(now) {
      let guard = 0;
      while (now >= next && guard++ < 400) { const d = step(); if (d < 0) { finish(); return; } next += d; }
      scroller.scrollTop = scroller.scrollHeight;
      raf = requestAnimationFrame(frame);
    }
    function finish() {
      if (done) return; done = true; cancelAnimationFrame(raf); caret.remove();
      scroller.scrollTop = scroller.scrollHeight;
      opt.onDone && opt.onDone();
    }
    function skip() {
      if (done) return;
      cancelAnimationFrame(raf); renderCode(el, code, lang); finish();
    }
    if (reduced) { renderCode(el, code, lang); setTimeout(finish, 50); }
    else raf = requestAnimationFrame(frame);
    return { skip, get done() { return done; } };
  }

  /* Gõ từng chữ vào một phần tử. segs = [{ text, cls }] */
  function typeSegments(el, segs, speed = 18) {
    return new Promise((resolve) => {
      if (reduced) { segs.forEach((g) => { const sp = document.createElement("span"); if (g.cls) sp.className = g.cls; sp.textContent = g.text; el.appendChild(sp); }); resolve(); return; }
      const caret = document.createElement("span"); caret.className = "caret small"; el.appendChild(caret);
      let si = 0, ci = 0, sp = null;
      (function tick() {
        if (si >= segs.length) { caret.remove(); resolve(); return; }
        const g = segs[si];
        if (!sp) { sp = document.createElement("span"); if (g.cls) sp.className = g.cls; el.insertBefore(sp, caret); }
        sp.textContent += g.text[ci++] || "";
        if (ci >= g.text.length) { si++; ci = 0; sp = null; }
        setTimeout(tick, speed * (0.6 + Math.random() * 0.8));
      })();
    });
  }

  /* ---------------- HÌNH VẼ (SVG) ---------------- */
  function starPts(cx, cy, R, r, n = 5) {
    const p = [];
    for (let k = 0; k < n * 2; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / n, rr = k % 2 ? r : R;
      p.push((cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1));
    }
    return p.join(" ");
  }
  function flower(cx, cy, r, petal, center, n = 6) {
    let s = "";
    for (let k = 0; k < n; k++)
      s += `<ellipse cx="${cx}" cy="${cy - r * 0.6}" rx="${r * 0.42}" ry="${r * 0.62}" fill="${petal}" transform="rotate(${(k * 360) / n} ${cx} ${cy})"/>`;
    return s + `<circle cx="${cx}" cy="${cy}" r="${r * 0.36}" fill="${center}"/>`;
  }
  const face = (x, y, s = 1, col = "#5a3e2b") =>
    `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="-7" cy="0" r="2.6" fill="${col}"/><circle cx="7" cy="0" r="2.6" fill="${col}"/>` +
    `<path d="M-4 5 Q0 9 4 5" stroke="${col}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<circle cx="-12" cy="5" r="3.2" fill="#FF8FAB" opacity=".75"/><circle cx="12" cy="5" r="3.2" fill="#FF8FAB" opacity=".75"/></g>`;

  const STICKERS = {
    heart: () => `<svg viewBox="0 0 100 100"><path d="M50 88 C20 66 5 46 15 28 C25 12 45 15 50 30 C55 15 75 12 85 28 C95 46 80 66 50 88Z" fill="#FF8FAB"/><ellipse cx="30" cy="32" rx="7" ry="4" fill="#fff" opacity=".6" transform="rotate(-35 30 32)"/>${face(50, 50, 1.2)}</svg>`,
    star: () => `<svg viewBox="0 0 100 100"><polygon points="${starPts(50, 54, 40, 19)}" fill="#FFD166" stroke="#FFD166" stroke-width="10" stroke-linejoin="round"/>${face(50, 56, 1.15)}</svg>`,
    apple: () => `<svg viewBox="0 0 100 110"><path d="M50 32 C20 12 0 42 10 72 C18 96 38 106 50 97 C62 106 82 96 90 72 C100 42 80 12 50 32Z" fill="#FF5D73"/><rect x="47" y="12" width="6" height="22" rx="3" fill="#8D5A3B"/><ellipse cx="66" cy="18" rx="14" ry="7" fill="#6CC57C" transform="rotate(-25 66 18)"/><ellipse cx="28" cy="48" rx="6" ry="11" fill="#fff" opacity=".45" transform="rotate(25 28 48)"/>${face(50, 66, 1.2)}</svg>`,
    book: () => `<svg viewBox="0 0 120 100"><rect x="14" y="80" width="94" height="12" rx="4" fill="#fff"/><rect x="10" y="10" width="100" height="76" rx="10" fill="#4CC9F0"/><rect x="10" y="10" width="16" height="76" rx="6" fill="#2FB3DD"/><text x="68" y="34" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="700" font-size="13" fill="#fff">ICT</text>${face(68, 56, 1.25, "#16425B")}</svg>`,
    laptop: () => `<svg viewBox="0 0 140 100"><rect x="22" y="8" width="96" height="66" rx="9" fill="#2B2D42"/><rect x="29" y="15" width="82" height="52" rx="4" fill="#1E1E2E"/><text x="70" y="47" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="700" font-size="20" fill="#A6E3A1">&lt;/&gt;</text><path d="M95 26 c-3-4-9-1-6 3l6 5 6-5c3-4-3-7-6-3z" fill="#FF8FAB"/><path d="M6 78 H134 L124 92 H16Z" fill="#CBD5E1"/><rect x="58" y="78" width="24" height="5" rx="2" fill="#94A3B8"/></svg>`,
    pencil: () => `<svg viewBox="0 0 64 200"><rect x="16" y="6" width="32" height="24" rx="7" fill="#FF8FAB"/><rect x="16" y="26" width="32" height="13" fill="#C0C7D1"/><rect x="16" y="38" width="32" height="118" fill="#FFD166"/><rect x="27" y="38" width="10" height="118" fill="#FFC233"/><polygon points="16,156 48,156 32,194" fill="#F6D7B0"/><polygon points="26.5,181 37.5,181 32,194" fill="#3D3D3D"/>${face(32, 92, 1.05)}</svg>`,
    flower: () => `<svg viewBox="0 0 100 100">${flower(50, 50, 40, "#FFB3C6", "#FFD166", 8)}${flower(50, 50, 22, "#FF8FAB", "#FFD166", 6)}${face(50, 52, 0.75)}</svg>`,
    plane: () => `<svg viewBox="0 0 120 80"><path d="M4 66 Q30 76 50 54" stroke="#fff" stroke-width="3" stroke-dasharray="5 6" fill="none" stroke-linecap="round"/><polygon points="50,40 116,8 74,70" fill="#fff"/><polygon points="74,70 80,44 116,8" fill="#DCEFFC"/><polygon points="50,40 80,44 116,8" fill="#F4FAFF"/></svg>`,
    aplus: () => `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="#9B7BFF"/><circle cx="50" cy="50" r="36" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 5" opacity=".7"/><text x="50" y="61" text-anchor="middle" font-family="Be Vietnam Pro,sans-serif" font-weight="800" font-size="32" fill="#fff">A+</text></svg>`,
  };

  const SUN = `<svg viewBox="0 0 140 140"><g class="rays">${[...Array(12)].map((_, k) => `<rect x="66" y="2" width="8" height="20" rx="4" fill="#FFB703" transform="rotate(${k * 30} 70 70)"/>`).join("")}</g><circle cx="70" cy="70" r="40" fill="#FFD166"/><circle cx="58" cy="58" r="12" fill="#fff" opacity=".25"/>${face(70, 72, 1.7)}</svg>`;

  const cloudSVG = (withFace) =>
    `<svg viewBox="0 0 200 100"><g fill="#fff"><circle cx="60" cy="60" r="30"/><circle cx="100" cy="45" r="40"/><circle cx="145" cy="62" r="28"/><rect x="40" y="60" width="130" height="32" rx="16"/></g>${withFace ? face(101, 66, 1.3, "#5a6b8c") : ""}</svg>`;

  const treeSVG = (c1, c2) =>
    `<svg viewBox="0 0 120 170"><rect x="52" y="100" width="16" height="66" rx="5" fill="#A47148"/><circle cx="60" cy="66" r="44" fill="${c1}"/><circle cx="32" cy="98" r="28" fill="${c2}"/><circle cx="88" cy="98" r="28" fill="${c2}"/><circle cx="44" cy="52" r="5" fill="#FF8FAB"/><circle cx="78" cy="72" r="5" fill="#FFD166"/><circle cx="58" cy="94" r="5" fill="#FF8FAB"/><circle cx="84" cy="44" r="4" fill="#fff" opacity=".6"/></svg>`;

  const smallFlower = (c) =>
    `<svg viewBox="0 0 40 72"><path d="M20 30 V72" stroke="#4FA85C" stroke-width="3"/><ellipse cx="13" cy="54" rx="8" ry="3.6" fill="#5DB866" transform="rotate(-30 13 54)"/>${flower(20, 20, 17, c, "#FFE08A", 5)}</svg>`;

  function schoolSVG() {
    const win = (x, y) => `<rect x="${x}" y="${y}" width="30" height="34" rx="5" fill="#9BD7F5" stroke="#fff" stroke-width="3"/><line x1="${x + 15}" y1="${y}" x2="${x + 15}" y2="${y + 34}" stroke="#fff" stroke-width="2"/>`;
    let w = "";
    [125, 170, 215, 355, 400, 445].forEach((x) => { w += win(x, 186) + win(x, 244); });
    return `<svg viewBox="0 0 600 320">
      <ellipse cx="300" cy="306" rx="260" ry="12" fill="#4FA85C" opacity=".35"/>
      <rect x="110" y="165" width="150" height="138" rx="6" fill="#FFE1C7"/>
      <rect x="340" y="165" width="150" height="138" rx="6" fill="#FFE1C7"/>
      <rect x="100" y="150" width="170" height="20" rx="6" fill="#EF476F"/>
      <rect x="330" y="150" width="170" height="20" rx="6" fill="#EF476F"/>
      ${w}
      <rect x="252" y="100" width="96" height="203" rx="6" fill="#FFF3E6"/>
      <polygon points="238,106 300,58 362,106" fill="#D62957"/>
      <line x1="300" y1="8" x2="300" y2="62" stroke="#6b7280" stroke-width="3" stroke-linecap="round"/>
      <g class="flag"><rect x="301" y="10" width="46" height="30" rx="2" fill="#DA251D"/><polygon points="${starPts(324, 25.5, 8.5, 3.5)}" fill="#FFDE00"/></g>
      <circle cx="300" cy="134" r="18" fill="#fff" stroke="#264653" stroke-width="4"/>
      <line x1="300" y1="134" x2="300" y2="123" stroke="#264653" stroke-width="3" stroke-linecap="round"/>
      <line x1="300" y1="134" x2="308" y2="138" stroke="#264653" stroke-width="3" stroke-linecap="round"/>
      <rect x="260" y="166" width="80" height="24" rx="6" fill="#264653"/>
      <text x="300" y="182.5" text-anchor="middle" font-family="Be Vietnam Pro,sans-serif" font-size="11" font-weight="800" fill="#FFD166" letter-spacing="1">TRƯỜNG EM</text>
      <path d="M274 303 V242 a26 26 0 0 1 52 0 V303Z" fill="#9C6644"/>
      <line x1="300" y1="216" x2="300" y2="303" stroke="#7F5539" stroke-width="2"/>
      <circle cx="293" cy="268" r="2.5" fill="#FFD166"/><circle cx="307" cy="268" r="2.5" fill="#FFD166"/>
      <rect x="262" y="300" width="76" height="8" rx="3" fill="#E5E7EB"/>
    </svg>`;
  }

  function bouquetSVG() {
    const stems = [[120, 70], [75, 102], [165, 102], [95, 146], [148, 146], [120, 118], [58, 140], [184, 138]]
      .map(([x, y]) => `<path d="M${x} ${y} Q${(x + 120) / 2} ${(y + 230) / 2 + 10} 120 232" stroke="#4FA85C" stroke-width="4" fill="none"/>`).join("");
    const dots = [[50, 78], [190, 80], [140, 40], [98, 44], [40, 118], [200, 118], [168, 64], [72, 64]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff"/><circle cx="${x + 7}" cy="${y + 6}" r="3.5" fill="#fff" opacity=".85"/>`).join("");
    return `<svg viewBox="0 0 240 300" class="bouquet">
      <path d="M36 140 L120 292 L204 140 Q120 178 36 140Z" fill="#FFE5EC"/>
      ${stems}
      <ellipse cx="70" cy="170" rx="22" ry="9" fill="#5DB866" transform="rotate(-35 70 170)"/>
      <ellipse cx="172" cy="170" rx="22" ry="9" fill="#5DB866" transform="rotate(35 172 170)"/>
      ${dots}
      ${flower(58, 140, 20, "#FFD166", "#FF9F43", 5)}
      ${flower(184, 138, 20, "#8ECAE6", "#FFF", 5)}
      ${flower(75, 102, 28, "#FFD166", "#FF9F43")}
      ${flower(165, 102, 28, "#B8A1FF", "#FFF3B0")}
      ${flower(95, 146, 24, "#7BDCB5", "#FFF")}
      ${flower(148, 146, 24, "#FF5D73", "#FFD166")}
      ${flower(120, 70, 34, "#FF8FAB", "#FFD166", 8)}
      ${flower(120, 118, 22, "#8ECAE6", "#FFFFFF")}
      <path d="M58 166 L120 292 L182 166 Q120 200 58 166Z" fill="#FFC8DD"/>
      <path d="M58 166 Q120 200 182 166" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>
      <ellipse cx="100" cy="226" rx="20" ry="11" fill="#EF476F" transform="rotate(-22 100 226)"/>
      <ellipse cx="140" cy="226" rx="20" ry="11" fill="#EF476F" transform="rotate(22 140 226)"/>
      <path d="M114 232 L100 268 L110 264 L116 274Z" fill="#D62957"/>
      <path d="M126 232 L140 268 L130 264 L124 274Z" fill="#D62957"/>
      <circle cx="120" cy="230" r="8" fill="#D62957"/>
      <g transform="rotate(-10 176 236)"><rect x="150" y="224" width="52" height="28" rx="6" fill="#fff"/><text x="176" y="243" text-anchor="middle" font-family="Playfair Display,serif" font-weight="700" font-size="13" fill="#1d3557">20.11</text></g>
    </svg>`;
  }

  function sceneHTML(opt = {}) {
    const clouds = [
      { top: "9vh", w: 210, d: 110, delay: -20, face: true },
      { top: "22vh", w: 140, d: 140, delay: -80 },
      { top: "4vh", w: 110, d: 90, delay: -50 },
      { top: "33vh", w: 170, d: 160, delay: -120 },
    ];
    const stickers = [
      { k: "pencil", x: "3%", y: "24%", s: 42, r: -22, d: 7 },
      { k: "book", x: "88%", y: "36%", s: 86, r: 8, d: 8 },
      { k: "apple", x: "5%", y: "60%", s: 60, r: -6, d: 6.5, sm: 1 },
      { k: "star", x: "78%", y: "16%", s: 56, r: 10, d: 5.5 },
      { k: "heart", x: "14%", y: "9%", s: 52, r: -8, d: 6 },
      { k: "laptop", x: "87%", y: "62%", s: 100, r: -4, d: 9, sm: 1 },
      { k: "plane", x: "30%", y: "5%", s: 84, r: 0, d: 10, sm: 1 },
      { k: "aplus", x: "11%", y: "42%", s: 54, r: -10, d: 7.5, sm: 1 },
    ];
    const flowers = [
      ["2%", "#FF8FAB", 34], ["8%", "#FFD166", 28], ["15%", "#B8A1FF", 32], ["24%", "#FF5D73", 26],
      ["72%", "#8ECAE6", 30], ["80%", "#FF8FAB", 34], ["88%", "#FFD166", 28], ["95%", "#B8A1FF", 30],
    ];
    return (
      `<div class="sun">${SUN}</div>` +
      clouds.map((c) => `<div class="cloud" style="top:${c.top};--w:${c.w}px;--d:${c.d}s;--delay:${c.delay}s">${cloudSVG(c.face)}</div>`).join("") +
      `<svg class="hills" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path d="M0 170 C240 90 420 150 720 120 C1020 90 1200 60 1440 130 L1440 320 L0 320Z" fill="#C4EFB6"/>
        <path d="M0 230 C300 170 520 220 760 200 C1000 180 1200 150 1440 210 L1440 320 L0 320Z" fill="#9BDD93"/>
        <path d="M0 280 C360 250 720 290 1080 265 C1260 255 1360 262 1440 270 L1440 320 L0 320Z" fill="#79CD7F"/>
      </svg>` +
      `<div class="tree t1">${treeSVG("#6CC57C", "#58B56B")}</div><div class="tree t2">${treeSVG("#7DD3A0", "#5DBE86")}</div>` +
      `<div class="tree t3">${treeSVG("#6CC57C", "#58B56B")}</div><div class="tree t4">${treeSVG("#8AD48A", "#6CC57C")}</div>` +
      `<div class="school">${schoolSVG()}</div>` +
      flowers.map(([x, c, s], k) => `<div class="flw" style="left:${x};width:${s}px;--dl:${-k * 0.7}s">${smallFlower(c)}</div>`).join("") +
      (opt.noStickers ? "" : stickers.map((t) => `<div class="stk${t.sm ? " hide-sm" : ""}" style="left:${t.x};top:${t.y};--s:${t.s}px;--r:${t.r}deg;--d:${t.d}s">${STICKERS[t.k]()}</div>`).join(""))
    );
  }

  /* ---------------- PHÁO GIẤY ---------------- */
  function confetti(duration = 3200) {
    if (reduced) return;
    const cv = document.createElement("canvas"); cv.className = "confetti"; document.body.appendChild(cv);
    const ctx = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    const colors = ["#FF8FAB", "#FFD166", "#06D6A0", "#4CC9F0", "#9B7BFF", "#EF476F", "#FF9F43"];
    const P = [...Array(170)].map(() => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.4, y: H * 0.42,
      vx: (Math.random() - 0.5) * 15, vy: -Math.random() * 15 - 4,
      s: Math.random() * 8 + 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0], round: Math.random() < 0.3,
    }));
    const t0 = performance.now();
    (function f(now) {
      const t = now - t0; ctx.clearRect(0, 0, W, H);
      for (const p of P) {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / duration); ctx.fillStyle = p.c;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill(); } else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      if (t < duration) requestAnimationFrame(f); else cv.remove();
    })(t0);
  }

  /* ---------------- QR ---------------- */
  function makeQR(el, text, size = 168, level = "M") {
    el.innerHTML = "";
    if (!window.QRCode) { el.innerHTML = `<div class="qr-fallback">Không tải được thư viện QR.<br>Kiểm tra kết nối mạng.</div>`; return false; }
    try {
      new QRCode(el, { text, width: size, height: size, colorDark: "#1d3557", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel[level] });
      return true;
    } catch (e) {
      el.innerHTML = `<div class="qr-fallback">Lời chúc quá dài để tạo QR.<br>Hãy dùng nút sao chép link.</div>`;
      return false;
    }
  }

  /* ---------------- MÃ HOÁ DỮ LIỆU VÀO LINK ---------------- */
  function encodeData(o) {
    const bytes = new TextEncoder().encode(JSON.stringify(o));
    let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeData(s) {
    try {
      s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
      const bin = atob(s);
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    } catch (e) { return null; }
  }

  /* Bộ màu cho thiệp sáng tạo & bức tường lời chúc */
  const THEMES = {
    dao: { name: "Hồng đào", a: "#FF8FAB", a2: "#FFB3C6", b: "#FFF0F4", ink: "#8A2846" },
    troi: { name: "Xanh trời", a: "#4CC9F0", a2: "#90DBF4", b: "#EAF8FD", ink: "#0B5A7A" },
    bacha: { name: "Bạc hà", a: "#06D6A0", a2: "#7BE8C8", b: "#E6FBF4", ink: "#0A6B52" },
    nang: { name: "Nắng vàng", a: "#FFB703", a2: "#FFD166", b: "#FFF8E1", ink: "#7A4F00" },
    mong: { name: "Tím mộng", a: "#9B7BFF", a2: "#C3B1FF", b: "#F3EEFF", ink: "#4B2FA3" },
  };

  function toast(msg, ms = 2800) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms);
  }

  window.Thiep = {
    $, $$, esc, fill, store, reduced, tokenize, renderCode, typeCode, typeSegments,
    STICKERS, bouquetSVG, sceneHTML, confetti, makeQR, encodeData, decodeData, THEMES, toast,
    WISH_KEY: "thiep2011_wishes", UNLOCK_KEY: "thiep2011_unlocked", WON_ONCE_KEY: "thiep2011_won_once", HIDDEN_KEY: "thiep2011_hidden", ADMIN_KEY: "thiep2011_admin_key",
    EDIT, DRAFT_CONTENT_KEY, ready, deepMerge, localImages, imgSrc, uid, syncLocalWishes, fetchRemoteWishes, deleteWishes,
  };
})();
