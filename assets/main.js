/* main.js — điều khiển trang thiệp chính (index.html) */
(function () {
  "use strict";
  const C = window.CONFIG, U = window.Thiep;
  const { $, esc, fill, store } = U;
  const params = new URLSearchParams(location.search);
  const T = C.teacher;

  document.title = fill(C.pageTitle);
  $("#scene").innerHTML = U.sceneHTML();

  /* ---------- GAME: trạng thái mở khoá ---------- */
  const game = C.game || {};
  if (params.get("gift") === "unlocked") store.set(U.UNLOCK_KEY, true);
  const unlocked = () => !game.enabled || store.get(U.UNLOCK_KEY, false) === true;

  /* ================= MÀN 1: CODE ================= */
  const I = C.intro;
  let typer = null, termTimers = [];

  function startIntro() {
    termTimers.forEach(clearTimeout); termTimers = [];
    document.body.classList.add("intro-on");
    const intro = $("#intro");
    intro.hidden = false; intro.classList.remove("leave");
    $("#edTitle").textContent = I.filename; $("#edTab").textContent = I.filename;
    $(".intro-editor .lang-dot").dataset.lang = I.language || "js";
    $("#termOut").innerHTML = `<span class="t-com">// đang chờ chương trình...</span>`;
    $("#introCta").hidden = true; $("#skipBtn").hidden = false;
    typer = U.typeCode($("#introCode"), fill(I.code), I.language || "js", {
      speed: I.typingSpeed || 22, scroller: $("#edBody"), onDone: runTerminal,
    });
  }
  $("#skipBtn").addEventListener("click", () => typer && typer.skip());

  const termFmt = (s) => esc(s)
    .replace(/^\$ /, '<span class="t-prompt">$</span> ')
    .replace(/^(✔|✓)/, '<span class="t-ok">$1</span>')
    .replace(/^›/, '<span class="t-dim">›</span>');

  function runTerminal() {
    $("#skipBtn").hidden = true;
    const out = $("#termOut"); out.innerHTML = "";
    const lines = (I.terminal || []).map(fill);
    let i = 0;
    const later = (fn, ms) => termTimers.push(setTimeout(fn, U.reduced ? 0 : ms));
    const next = () => {
      if (i >= lines.length) { showCta(); return; }
      const raw = lines[i++], div = document.createElement("div"); div.className = "tl";
      if (raw.includes("{bar}")) {
        const [a, b] = raw.split("{bar}");
        div.innerHTML = `${termFmt(a)}<span class="tbar"><i></i></span><span class="tpct">0%</span>${termFmt(b)}`;
        out.appendChild(div);
        const bar = div.querySelector(".tbar i"), pct = div.querySelector(".tpct"), t0 = performance.now(), dur = U.reduced ? 1 : 1500;
        (function anim(now) {
          const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          bar.style.width = e * 100 + "%"; pct.textContent = Math.round(e * 100) + "%";
          if (p < 1) requestAnimationFrame(anim); else later(next, 250);
        })(t0);
      } else { div.innerHTML = termFmt(raw); out.appendChild(div); later(next, 450); }
      out.parentElement.scrollTop = out.parentElement.scrollHeight;
    };
    later(next, 350);
  }

  function showCta() {
    const locked = !unlocked();
    $("#runText").textContent = locked ? game.buttonText || "choiGame()" : I.buttonText || "moThiep()";
    $("#introHint").textContent = fill(locked ? game.hint : I.hint);
    $("#introCta").hidden = false;
    $("#runBtn").focus({ preventScroll: true });
  }

  // DỪNG Ở ĐÂY: chỉ khi bạn tự tay bấm nút mới chuyển sang thiệp
  $("#runBtn").addEventListener("click", () => (unlocked() ? openCard() : openGame()));

  /* ================= GAME ================= */
  function openGame() {
    if (game.mode === "redirect") { location.href = game.url; return; }
    $("#gameFrame").src = game.url;
    $("#gameLayer").hidden = false;
  }
  function closeGame() { $("#gameLayer").hidden = true; $("#gameFrame").src = "about:blank"; }
  $("#gameClose").addEventListener("click", closeGame);
  // Game gọi: parent.postMessage({ type: "GAME_WON" }, "*")
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (d === "GAME_WON" || (d && d.type === "GAME_WON")) {
      store.set(U.UNLOCK_KEY, true); closeGame(); openCard();
    }
  });

  /* ================= MÀN 2: THIỆP ================= */
  function openCard() {
    const intro = $("#intro");
    intro.classList.add("leave");
    setTimeout(() => { intro.hidden = true; document.body.classList.remove("intro-on"); }, U.reduced ? 0 : 750);
    $("#cardStage").hidden = false;
    window.scrollTo(0, 0);
    requestAnimationFrame(() => requestAnimationFrame(() => $("#book").classList.add("show")));
  }

  // Bìa
  const CV = C.cover;
  $("#cvArt").innerHTML = U.bouquetSVG();
  $("#cvKicker").textContent = fill(CV.kicker);
  $("#cvDate").textContent = CV.bigDate;
  $("#cvTo").textContent = fill(CV.to);
  $("#cvName").innerHTML = `<span>${esc(T.honorific)}</span> ${esc(T.name)}`;
  $("#cvSub").textContent = fill(T.subject);
  $("#cvTag").textContent = fill(CV.tagline);
  $("#openBtn").innerHTML = `${esc(fill(CV.openText))} <span aria-hidden="true">→</span>`;
  $("#cvStk1").innerHTML = U.STICKERS.star();
  $("#cvStk2").innerHTML = U.STICKERS.pencil();

  function openBook() {
    const book = $("#book");
    if (book.classList.contains("opening")) return;
    book.classList.add("opening");
    setTimeout(() => {
      book.hidden = true;
      const ins = $("#inside"); ins.hidden = false; ins.classList.add("rise");
      U.confetti();
      setTimeout(() => $("#status").classList.add("go"), 300);
      ins.scrollIntoView({ behavior: U.reduced ? "auto" : "smooth", block: "start" });
    }, U.reduced ? 30 : 1150);
  }
  $("#cover").addEventListener("click", openBook);
  $("#cover").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openBook(); } });

  // Bên trong
  const K = C.card;
  $("#inStk1").innerHTML = U.STICKERS.apple();
  $("#inStk2").innerHTML = U.STICKERS.laptop();
  $("#ribbon").textContent = fill(K.ribbon);
  $("#inTitle").innerHTML = esc(fill(K.title)).replace(/\[([^\]]+)\]/g, '<span class="script">$1</span>');
  $("#inSub").textContent = fill(K.subtitle);
  $("#greet").textContent = fill(K.greeting);
  $("#letterBody").innerHTML = (K.letter || []).map((p) => `<p>${esc(fill(p))}</p>`).join("");
  $("#closing").textContent = fill(K.closing);
  $("#sign").textContent = fill(K.signature) + (C.sender.className ? ` · ${C.sender.className}` : "");

  // Tab lời chúc bằng code
  const wishes = C.codeWishes || [];
  let cur = 0, outTimer = 0;
  $("#wishTabs").innerHTML = wishes.map((w, i) =>
    `<button class="ed-tab${i ? "" : " active"}" role="tab" data-i="${i}" type="button"><b class="lang-dot" data-lang="${esc(w.lang)}"></b>${esc(w.file)}</button>`).join("");
  function showTab(i) {
    cur = i; clearTimeout(outTimer);
    document.querySelectorAll("#wishTabs .ed-tab").forEach((b, k) => b.classList.toggle("active", k === i));
    U.renderCode($("#wishCode"), fill(wishes[i].code), wishes[i].lang);
    $("#wishOut").innerHTML = `<span class="t-com">// bấm ▶ Run để xem kết quả</span>`;
  }
  $("#wishTabs").addEventListener("click", (e) => { const b = e.target.closest(".ed-tab"); if (b) showTab(+b.dataset.i); });
  $("#runWish").addEventListener("click", () => {
    const w = wishes[cur]; if (!w) return;
    const out = $("#wishOut"), lines = fill(w.output || "").split("\n");
    out.innerHTML = `<div class="t-dim">$ run ${esc(w.file)}</div>`;
    let k = 0;
    const tick = () => {
      if (k >= lines.length) return;
      const d = document.createElement("div"); d.className = "out-line"; d.textContent = lines[k++]; out.appendChild(d);
      outTimer = setTimeout(tick, 380);
    };
    outTimer = setTimeout(tick, 300);
  });
  if (wishes.length) showTab(0);

  // Bảng trạng thái
  $("#statusList").innerHTML = (C.status || []).map((s) =>
    `<div class="st"><span class="st-l">${esc(s.label)}</span><span class="st-bar"><i style="--w:${Math.min(100, +s.value || 0)}%;--c:${esc(s.color)}"></i></span><span class="st-v" style="color:${esc(s.color)}">${esc(s.text)}</span></div>`).join("");

  // QR
  const Q = C.qr || {};
  const wishUrl = Q.url || new URL("wish.html", location.href).href;
  $("#writeLink").href = wishUrl;
  if (Q.enabled === false) $("#qrStrip").hidden = true;
  else {
    U.makeQR($("#qrMain"), wishUrl, 168);
    $("#qrTitle").textContent = fill(Q.title);
    $("#qrCaption").textContent = fill(Q.caption);
    $("#qrLink").textContent = fill(Q.button);
    $("#qrLink").href = wishUrl;
    if (location.protocol === "file:" && !Q.url) {
      const note = $("#qrNote"); note.hidden = false;
      note.textContent = "Lưu ý: bạn đang mở file trên máy nên QR chỉ trỏ tới máy này. Đăng web lên mạng (GitHub Pages, Netlify...) hoặc điền qr.url trong config.js để mọi người quét được.";
    }
  }

  // Bức tường lời chúc
  async function loadWall() {
    const W = C.wishes || {};
    if (W.showWall === false) return;
    let list = [];
    if (W.endpoint) {
      try {
        const r = await fetch(W.endpoint);
        const j = await r.json();
        list = Array.isArray(j) ? j : j.data || j.wishes || [];
      } catch (e) { /* không lấy được thì thôi */ }
    }
    const local = store.get(U.WISH_KEY, []);
    const seen = new Set(list.map((w) => (w.name || "") + "|" + (w.message || "")));
    local.forEach((w) => { if (!seen.has(w.name + "|" + w.message)) list.push(w); });
    list = list.filter((w) => w && w.message);
    if (!list.length) return;
    $("#wallTitle").textContent = fill(W.wallTitle);
    $("#wallSub").textContent = fill(W.wallSubtitle);
    const keys = Object.keys(U.THEMES);
    $("#notes").innerHTML = list.slice().reverse().map((w, i) => {
      const th = U.THEMES[w.theme] || U.THEMES[keys[i % keys.length]];
      const rot = ((i * 37) % 7) - 3;
      return `<figure class="note" style="--a:${th.a};--b:${th.b};--ink:${th.ink};--rot:${rot}deg">
        <span class="note-pin"></span>
        <blockquote>${esc(w.message)}</blockquote>
        <figcaption><b>${esc(w.name || "Một học trò")}</b>${w.className ? ` · ${esc(w.className)}` : ""}<span class="note-lang">${esc(w.lang || "js")}</span></figcaption>
      </figure>`;
    }).join("");
    $("#wall").hidden = false;
  }
  loadWall();

  // Chân trang
  $("#foot").innerHTML = `<span class="t-com">// </span>${esc(fill("Made with ♥ bởi {toi} · {occasion} {ngay}"))}`;

  // Nhạc nền
  if (C.music && C.music.url) {
    const audio = new Audio(C.music.url); audio.loop = true;
    const btn = $("#musicBtn"); btn.hidden = false;
    btn.addEventListener("click", () => {
      if (audio.paused) { audio.play().catch(() => {}); btn.classList.add("on"); }
      else { audio.pause(); btn.classList.remove("on"); }
    });
    $("#runBtn").addEventListener("click", () => { if (unlocked()) audio.play().then(() => btn.classList.add("on")).catch(() => {}); });
  }

  $("#replayBtn").addEventListener("click", startIntro);

  // Cho game hoặc trang khác gọi trực tiếp nếu cần
  window.Thiep.openCard = openCard;
  window.Thiep.openBook = openBook;

  /* ---------- KHỞI ĐỘNG ---------- */
  if (params.has("skip") || I.enabled === false) {
    $("#intro").hidden = true; document.body.classList.remove("intro-on");
    $("#cardStage").hidden = false;
    requestAnimationFrame(() => $("#book").classList.add("show"));
  } else startIntro();
})();
