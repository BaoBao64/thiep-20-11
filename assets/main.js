/* main.js — điều khiển trang thiệp chính (index.html) */
(function () {
  "use strict";
  const U = window.Thiep;
  U.ready.then(init);

  function init() {
    const C = window.CONFIG;
    const { $, esc, fill, store } = U;
    const params = new URLSearchParams(location.search);
    const EDIT = U.EDIT;

    $("#scene").innerHTML = U.sceneHTML();

    /* ---------- GAME: trạng thái mở khoá ----------
       Chỉ nhớ "đã thắng" trong lần mở trang này (biến trong bộ nhớ),
       nên MỖI LẦN mở thiệp đều phải thắng game lại.
       Ngoại lệ duy nhất: vừa thắng ở trang game riêng (mode "redirect") thì
       game để lại 1 "vé" dùng một lần trong sessionStorage.                  */
    const game = C.game || {};
    let won = false;
    try {
      if (sessionStorage.getItem(U.WON_ONCE_KEY) === "1") { won = true; sessionStorage.removeItem(U.WON_ONCE_KEY); }
      localStorage.removeItem(U.UNLOCK_KEY);   // xoá kiểu mở khoá vĩnh viễn của bản cũ
    } catch (e) {}
    const justWon = won;
    const unlocked = () => !game.enabled || won;

    /* ================= MÀN 1: CODE ================= */
    let typer = null, termTimers = [];

    function startIntro() {
      const I = C.intro;
      won = false;                      // xem lại code = mở thiệp lại = phải thắng lại
      termTimers.forEach(clearTimeout); termTimers = []; termRun++;
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

    // Tách một dòng terminal thành các đoạn có màu để gõ từng chữ
    const termSegs = (raw) => {
      let m;
      if ((m = /^\$ (.*)$/.exec(raw))) return [{ text: "$", cls: "t-prompt" }, { text: " " + m[1] }];
      if ((m = /^(✔|✓)(.*)$/.exec(raw))) return [{ text: m[1], cls: "t-ok" }, { text: m[2] }];
      if ((m = /^›(.*)$/.exec(raw))) return [{ text: "›", cls: "t-dim" }, { text: m[1] }];
      return raw ? [{ text: raw }] : [];
    };
    let termRun = 0;

    async function runTerminal() {
      $("#skipBtn").hidden = true;
      const run = ++termRun;
      const out = $("#termOut"); out.innerHTML = "";
      const scroll = () => (out.parentElement.scrollTop = out.parentElement.scrollHeight);
      const wait = (ms) => new Promise((r) => termTimers.push(setTimeout(r, U.reduced ? 0 : ms)));
      await wait(350);
      for (const raw of (C.intro.terminal || []).map(fill)) {
        if (run !== termRun) return;
        const div = document.createElement("div"); div.className = "tl"; out.appendChild(div); scroll();
        const [a, b] = raw.split("{bar}");
        await U.typeSegments(div, termSegs(a), 16);
        if (b !== undefined) {
          const bar = document.createElement("span"); bar.className = "tbar"; bar.innerHTML = "<i></i>";
          const pct = document.createElement("span"); pct.className = "tpct"; pct.textContent = "0%";
          div.append(bar, pct);
          await new Promise((res) => {
            const t0 = performance.now(), dur = U.reduced ? 1 : 1500, i = bar.firstChild;
            (function anim(now) {
              const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
              i.style.width = e * 100 + "%"; pct.textContent = Math.round(e * 100) + "%";
              if (p < 1) requestAnimationFrame(anim); else res();
            })(t0);
          });
          if (b) await U.typeSegments(div, [{ text: b }], 16);
        }
        scroll();
        await wait(260);
      }
      if (run === termRun) showCta();
    }

    function showCta() {
      const locked = !unlocked();
      $("#runText").textContent = locked ? game.buttonText || "choiGame()" : C.intro.buttonText || "moThiep()";
      const hint = $("#introHint"); hint.textContent = "";
      $("#introCta").hidden = false;
      $("#runBtn").focus({ preventScroll: true });
      U.typeSegments(hint, [{ text: fill(locked ? game.hint : C.intro.hint) }], 28);
    }

    // DỪNG Ở ĐÂY: chỉ khi bạn tự tay bấm nút mới chuyển sang thiệp
    $("#runBtn").addEventListener("click", () => {
      if (!unlocked()) { openGame(); return; }
      music.play();
      openCard();
    });

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
        won = true; closeGame(); music.play(); openCard();
      }
    });

    /* ================= CHUYỂN CẢNH: MƯA CODE ================= */
    function codeRain(onCovered, onReveal) {
      return new Promise((resolve) => {
        const cv = document.createElement("canvas"); cv.className = "code-rain"; document.body.appendChild(cv);
        const ctx = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
        const W = innerWidth, H = innerHeight;
        cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
        const pool = [C.intro.code, ...(C.codeWishes || []).map((w) => w.code)]
          .map(fill).join("\n").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
          .split("\n").map((s) => s.trim()).filter((s) => s.length > 3);
        if (!pool.length) pool.push("console.log('Cảm ơn Thầy!');");
        const colors = ["#cba6f7", "#a6e3a1", "#89b4fa", "#f9e2af", "#94e2d5", "#fab387", "#f38ba8", "#cdd6f4"];
        const drops = [];
        const spawn = (n) => {
          for (let i = 0; i < n; i++) {
            const size = 11 + Math.random() * 13;
            let txt = pool[(Math.random() * pool.length) | 0];
            if (txt.length > 46) txt = txt.slice(0, 46) + "…";
            drops.push({ x: Math.random() * (W + 80) - 80, y: -size - Math.random() * H * 0.4, vy: 2 + Math.random() * 5 + size * 0.15, txt, size, c: colors[(Math.random() * colors.length) | 0], a: 0.5 + Math.random() * 0.5 });
          }
        };
        const COVER = 1150, HOLD = 1550, REVEAL = 1100;
        const t0 = performance.now(); let covered = false, revealed = false;
        ctx.textBaseline = "top";
        function frame(now) {
          const t = now - t0;
          ctx.globalCompositeOperation = "source-over";
          ctx.clearRect(0, 0, W, H);
          const c = Math.min(1, t / COVER), e = c * c * (3 - 2 * c);
          ctx.fillStyle = `rgba(15,20,36,${e})`; ctx.fillRect(0, 0, W, H);
          if (t < HOLD + REVEAL * 0.5) spawn(t < COVER ? 4 : 2);
          for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.vy += 0.14; d.y += d.vy;
            if (d.y > H + 30) { drops.splice(i, 1); continue; }
            ctx.font = `500 ${d.size}px "JetBrains Mono", ui-monospace, monospace`;
            ctx.globalAlpha = d.a; ctx.fillStyle = d.c; ctx.fillText(d.txt, d.x, d.y);
          }
          ctx.globalAlpha = 1;
          if (!covered && t >= COVER) { covered = true; onCovered && onCovered(); }
          if (t >= HOLD) {
            if (!revealed) { revealed = true; onReveal && onReveal(); }
            const p = Math.min(1, (t - HOLD) / REVEAL), ep = 1 - Math.pow(1 - p, 3);
            const R = Math.hypot(W, H) * 0.55 * ep + 1;
            const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, R);
            g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(Math.max(0, (R - 140) / R), "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            if (p >= 1) { cv.remove(); resolve(); return; }
          }
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    }

    /* ================= MÀN 2: THIỆP ================= */
    function showStage() {
      const intro = $("#intro");
      intro.hidden = true; intro.classList.remove("leave");
      document.body.classList.remove("intro-on");
      $("#cardStage").hidden = false;
      window.scrollTo(0, 0);
    }
    function openCard() {
      if (U.reduced) { showStage(); $("#book").classList.add("show"); return; }
      codeRain(showStage, () => $("#book").classList.add("show"));
    }

    function openBook() {
      if (EDIT) return;
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
    $("#cover").addEventListener("keydown", (e) => {
      if (e.target.isContentEditable) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openBook(); }
    });

    /* ---------- VẼ NỘI DUNG (gọi lại mỗi khi chỉnh sửa) ---------- */
    const wishes = () => C.codeWishes || [];
    let cur = 0, outTimer = 0;

    function render() {
      const T = C.teacher, CV = C.cover, K = C.card;
      document.title = fill(C.pageTitle);

      // Bìa
      const cvImg = C.images && C.images.cover;
      $("#cvArt").innerHTML = cvImg
        ? `<figure class="cv-photo"><span class="cv-tape"></span><img src="${esc(U.imgSrc(cvImg))}" alt="Ảnh bìa"></figure>`
        : U.bouquetSVG();
      $("#cvKicker").textContent = fill(CV.kicker);
      $("#cvDate").textContent = CV.bigDate;
      $("#cvTo").textContent = fill(CV.to);
      $("#cvName").innerHTML = `<span>${esc(T.honorific)}</span> ${esc(T.name)}`;
      $("#cvSub").textContent = fill(T.subject);
      $("#cvTag").textContent = fill(CV.tagline);
      $("#openBtn").innerHTML = `${esc(fill(CV.openText))} <span aria-hidden="true">→</span>`;
      $("#cvStk1").innerHTML = U.STICKERS.star();
      $("#cvStk2").innerHTML = U.STICKERS.pencil();

      // Bên trong
      $("#inStk1").innerHTML = U.STICKERS.apple();
      $("#inStk2").innerHTML = U.STICKERS.laptop();
      $("#ribbon").textContent = fill(K.ribbon);
      $("#inTitle").innerHTML = esc(fill(K.title)).replace(/\[([^\]]+)\]/g, '<span class="script">$1</span>');
      $("#inSub").textContent = fill(K.subtitle);
      $("#greet").textContent = fill(K.greeting);
      $("#letterBody").innerHTML = (K.letter || []).map((p, i) => `<p data-edit="card.letter.${i}" data-multiline>${esc(fill(p))}</p>`).join("");
      $("#closing").textContent = fill(K.closing);
      $("#sign").innerHTML = `<span data-edit="card.signature">${esc(fill(K.signature))}</span>${C.sender.className ? `<small> · ${esc(C.sender.className)}</small>` : ""}`;

      // Tab lời chúc bằng code
      if (cur >= wishes().length) cur = 0;
      $("#wishTabs").innerHTML = wishes().map((w, i) =>
        `<button class="ed-tab${i === cur ? " active" : ""}" role="tab" data-i="${i}" type="button"><b class="lang-dot" data-lang="${esc(w.lang)}"></b>${esc(w.file)}</button>`).join("");
      if (wishes().length) showTab(cur);

      // Bảng trạng thái
      $("#statusList").innerHTML = (C.status || []).map((s) =>
        `<div class="st"><span class="st-l">${esc(s.label)}</span><span class="st-bar"><i style="--w:${Math.min(100, +s.value || 0)}%;--c:${esc(s.color)}"></i></span><span class="st-v" style="color:${esc(s.color)}">${esc(s.text)}</span></div>`).join("");

      renderAlbum();
      renderQR();
      renderCredits();
      $("#foot").innerHTML = `<span class="t-com">// </span>${esc(fill("Made with ♥ bởi {toi} · {occasion} {ngay}"))} · <a href="tong-hop.html">Bảng tổng hợp lời chúc</a>`;
      (U.afterRender || []).forEach((fn) => fn());
    }

    function showTab(i) {
      cur = i; clearTimeout(outTimer);
      document.querySelectorAll("#wishTabs .ed-tab").forEach((b, k) => b.classList.toggle("active", k === i));
      U.renderCode($("#wishCode"), fill(wishes()[i].code), wishes()[i].lang);
      $("#wishOut").innerHTML = `<span class="t-com">// bấm ▶ Run để xem kết quả</span>`;
    }
    $("#wishTabs").addEventListener("click", (e) => {
      const b = e.target.closest(".ed-tab"); if (!b) return;
      showTab(+b.dataset.i);
      (U.onTab || []).forEach((fn) => fn(cur));
    });
    $("#runWish").addEventListener("click", () => {
      const w = wishes()[cur]; if (!w) return;
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

    /* ---------- ALBUM ẢNH ----------
       Mỗi mục: { src: "anh.jpg", caption } hoặc nhiều ảnh: { src: ["a.jpg", "b.jpg"], caption }
       Mục nhiều ảnh hiện thành khung ảnh tự chuyển. */
    const photosOf = (p) => (Array.isArray(p.src) ? p.src : [p.src]).filter(Boolean);
    const FIT = "const f=this.closest('.pol');if(!f)return;f.classList.toggle('portrait',this.naturalHeight>this.naturalWidth);const b=this.closest('.pol-slides');if(b)b.style.setProperty('--ar',this.naturalWidth+'/'+this.naturalHeight)";
    function renderAlbum() {
      const im = C.images || {}, list = im.album || [];
      const sec = $("#album");
      sec.hidden = !list.length && !EDIT;
      $("#albumTitle").textContent = fill(im.albumTitle || "Album kỷ niệm");
      $("#albumGrid").innerHTML = list.map((p, i) => {
        const rot = ((i * 47) % 9) - 4, ph = photosOf(p), alt = esc(p.caption || "Ảnh kỷ niệm");
        const multi = ph.length > 1;
        const body = multi
          ? `<span class="pol-slides">${ph.map((s, k) => `<span class="sl${k ? "" : " on"}"><img class="sl-bg" src="${esc(U.imgSrc(s))}" alt="" aria-hidden="true"${k ? ' loading="lazy"' : ""}><img class="sl-fg" src="${esc(U.imgSrc(s))}" alt="${alt} ${k + 1}"${k ? ' loading="lazy"' : ` onload="${FIT}"`}></span>`).join("")}</span><span class="pol-count">${ph.length} ảnh</span>`
          : `<img src="${esc(U.imgSrc(ph[0] || ""))}" alt="${alt}" loading="lazy" onload="${FIT}">`;
        return `<figure class="pol${multi ? " multi" : ""}" style="--rot:${rot}deg" data-i="${i}">
          <button class="pol-img" type="button" data-view="${i}">${body}</button>
          ${multi ? `<span class="pol-dots">${ph.map((_, k) => `<i class="${k ? "" : "on"}"></i>`).join("")}</span>` : ""}
          <figcaption data-edit="images.album.${i}.caption">${esc(p.caption || "")}</figcaption>
          ${EDIT ? `<button class="pol-del" type="button" data-del="${i}" title="Xoá mục này">×</button>` : ""}
        </figure>`;
      }).join("") + (EDIT ? `<button class="pol-add" type="button" id="addPhoto"><b>+</b>Thêm ảnh</button>` : "");
    }
    // Chuyển ảnh trong các khung nhiều ảnh
    function showSlide(fig, k) {
      const imgs = fig.querySelectorAll(".pol-slides .sl"), dots = fig.querySelectorAll(".pol-dots i");
      if (!imgs.length) return;
      k = (k + imgs.length) % imgs.length; fig.dataset.k = k;
      imgs.forEach((im, j) => im.classList.toggle("on", j === k));
      dots.forEach((d, j) => d.classList.toggle("on", j === k));
    }
    setInterval(() => {
      if (document.hidden) return;
      document.querySelectorAll(".pol.multi").forEach((f, n) => {
        if (f.matches(":hover")) return;
        setTimeout(() => showSlide(f, (+f.dataset.k || 0) + 1), n * 600);
      });
    }, 3800);

    // Xem ảnh lớn, lật qua lại nếu có nhiều ảnh
    let lb = { list: [], k: 0, cap: "" };
    function lbShow() {
      const n = lb.list.length;
      $("#lightImg").src = U.imgSrc(lb.list[lb.k]);
      $("#lightCap").textContent = lb.cap + (n > 1 ? ` · ${lb.k + 1}/${n}` : "");
      $("#lbPrev").hidden = $("#lbNext").hidden = n < 2;
    }
    $("#albumGrid").addEventListener("click", (e) => {
      const v = e.target.closest("[data-view]"); if (!v || EDIT) return;
      const p = C.images.album[+v.dataset.view], fig = v.closest(".pol");
      lb = { list: photosOf(p), k: +fig.dataset.k || 0, cap: p.caption || "" };
      lbShow(); $("#lightbox").hidden = false;
    });
    $("#lightbox").addEventListener("click", (e) => {
      const nav = e.target.closest(".lb-nav");
      if (nav) { lb.k = (lb.k + (nav.id === "lbNext" ? 1 : -1) + lb.list.length) % lb.list.length; lbShow(); return; }
      $("#lightbox").hidden = true;
    });
    document.addEventListener("keydown", (e) => {
      if ($("#lightbox").hidden) return;
      if (e.key === "Escape") $("#lightbox").hidden = true;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") $(e.key === "ArrowRight" ? "#lbNext" : "#lbPrev").click();
    });

    /* ---------- EKIP THỰC HIỆN ---------- */
    function renderCredits() {
      const cr = C.credits;
      $("#credits").hidden = !cr || !(cr.people || []).length;
      if (!cr) return;
      $("#crTitle").textContent = fill(cr.title || "Ekip thực hiện");
      $("#crList").innerHTML = (cr.people || []).map((p, i) => `<div class="cr-item">
          <span class="cr-role" data-edit="credits.people.${i}.role">${esc(p.role)}</span>
          <span class="cr-dots" aria-hidden="true"></span>
          <span class="cr-name" data-edit="credits.people.${i}.name">${esc(p.name)}</span>
        </div>`).join("");
      $("#crNote").textContent = fill(cr.note || "");
    }

    /* ---------- QR ---------- */
    function renderQR() {
      const Q = C.qr || {};
      const wishUrl = Q.url || new URL("wish.html", location.href).href;
      $("#writeLink").href = wishUrl;
      $("#qrStrip").hidden = Q.enabled === false;
      if (Q.enabled === false) return;
      if ($("#qrMain").dataset.url !== wishUrl) { U.makeQR($("#qrMain"), wishUrl, 168); $("#qrMain").dataset.url = wishUrl; }
      $("#qrTitle").textContent = fill(Q.title);
      $("#qrCaption").textContent = fill(Q.caption);
      $("#qrLink").textContent = fill(Q.button);
      $("#qrLink").href = wishUrl;
      const note = $("#qrNote");
      note.hidden = !(location.protocol === "file:" && !Q.url);
      note.textContent = "Lưu ý: bạn đang mở file trên máy nên QR chỉ trỏ tới máy này. Đăng web lên mạng hoặc điền qr.url trong config.js để mọi người quét được.";
    }

    /* ================= BỨC TƯỜNG LỜI CHÚC ================= */
    const wishId = (w) => w.id || `${w.time || ""}|${w.name || ""}|${String(w.message || "").slice(0, 20)}`;
    let wallList = [];

    async function loadWall() {
      const W = C.wishes || {};
      if (W.showWall === false && !EDIT) { $("#wall").hidden = true; return; }
      let list = [];
      if (W.endpoint) {
        try {
          const r = await fetch(W.endpoint);
          const j = await r.json();
          list = Array.isArray(j) ? j : j.data || j.wishes || [];
        } catch (e) { /* không lấy được thì thôi */ }
      }
      const seen = new Set(list.map(wishId));
      store.get(U.WISH_KEY, []).forEach((w) => { if (!seen.has(wishId(w))) list.push(w); });
      const hidden = new Set(store.get(U.HIDDEN_KEY, []));
      wallList = list.filter((w) => w && w.message && !hidden.has(wishId(w)));
      renderWall();
    }

    function renderWall() {
      const W = C.wishes || {};
      $("#wallTitle").textContent = fill(W.wallTitle);
      $("#wallSub").textContent = fill(W.wallSubtitle);
      const mine = new Set(store.get(U.WISH_KEY, []).map(wishId));
      const keys = Object.keys(U.THEMES);
      $("#notes").innerHTML = wallList.slice().reverse().map((w, i) => {
        const th = U.THEMES[w.theme] || U.THEMES[keys[i % keys.length]];
        const rot = ((i * 37) % 7) - 3, id = wishId(w);
        const canDel = EDIT || mine.has(id);
        return `<figure class="note" data-id="${esc(id)}" style="--a:${th.a};--b:${th.b};--ink:${th.ink};--rot:${rot}deg">
          <span class="note-pin"></span>
          ${canDel ? `<button class="note-del" type="button" data-id="${esc(id)}" title="Xoá lời chúc" aria-label="Xoá lời chúc">×</button>` : ""}
          <blockquote>${esc(w.message)}</blockquote>
          <figcaption><b>${esc(w.name || "Một học trò")}</b>${w.className ? ` · ${esc(w.className)}` : ""}<span class="note-lang">${esc(w.lang || "js")}</span></figcaption>
        </figure>`;
      }).join("");
      $("#wallEmpty").hidden = wallList.length > 0;
      $("#wall").hidden = !wallList.length && !EDIT;
    }

    $("#notes").addEventListener("click", async (e) => {
      const b = e.target.closest(".note-del"); if (!b) return;
      const id = b.dataset.id;
      const w = wallList.find((x) => wishId(x) === id); if (!w) return;
      const own = store.get(U.WISH_KEY, []).find((x) => wishId(x) === id);
      if (!window.confirm(EDIT ? `Xoá lời chúc của “${w.name || "Một học trò"}” khỏi bức tường?` : "Xoá lời chúc của bạn khỏi bức tường?")) return;
      // xoá trên máy này
      store.set(U.WISH_KEY, store.get(U.WISH_KEY, []).filter((x) => wishId(x) !== id));
      store.set(U.HIDDEN_KEY, [...new Set([...store.get(U.HIDDEN_KEY, []), id])]);
      const card = b.closest(".note"); card.classList.add("removing");
      setTimeout(() => { wallList = wallList.filter((x) => wishId(x) !== id); renderWall(); }, 350);
      // xoá trên Google Sheet
      const ep = C.wishes && C.wishes.endpoint;
      const key = store.get(U.ADMIN_KEY, "");
      if (ep && w.id && (key || (own && own.token))) {
        try {
          await fetch(ep, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "delete", id: w.id, key, token: own && own.token }) });
          U.toast("Đã xoá lời chúc.");
        } catch (err) { U.toast("Đã ẩn trên máy này, nhưng chưa xoá được trên bảng tính. Bạn thử lại sau nhé."); }
      } else if (ep && EDIT && !key) {
        U.toast("Đã ẩn trên máy này. Nhập mật khẩu quản trị trong bảng chỉnh sửa để xoá hẳn cho mọi người.", 4200);
      } else U.toast("Đã xoá lời chúc.");
    });

    /* ================= NHẠC =================
       Tự phát ngay khi mở trang. Trình duyệt không cho phát CÓ TIẾNG khi người xem
       chưa chạm vào trang, nên nếu bị chặn: phát tắt tiếng trước, rồi bật tiếng ở
       lần chạm / bấm phím đầu tiên. Chỉ có một nút loa nhỏ ở góc để tắt/bật. */
    const music = (function () {
      let audio = null, yt = null, ytReadyP = null, key = "", errored = false;
      let want = !EDIT;        // người xem muốn nghe nhạc (bấm nút loa để đổi)
      let muted = false;       // đang phát tắt tiếng vì trình duyệt chặn
      const btn = $("#soundBtn");
      const ytId = (u) => {
        const m = String(u || "").match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
        return m ? m[1] : /^[\w-]{11}$/.test(u || "") ? u : null;
      };
      const M = () => C.music || {};
      const has = () => !!(M().url || ytId(M().youtube));
      const isPlaying = () => (audio ? !audio.paused : yt && yt.getPlayerState ? yt.getPlayerState() === 1 : false);
      // đang phát CÓ TIẾNG thật sự
      const audible = () => (audio ? !audio.paused && !audio.muted : !!(yt && yt.getPlayerState && yt.getPlayerState() === 1 && !yt.isMuted()));
      const dock = $("#ytDock");
      let askTimer = 0;
      // Điện thoại chặn tiếng -> hiện khung video nhỏ để người xem chạm trực tiếp vào video
      function ask() {
        if (!yt || !want || errored || audible()) return;
        try { yt.pauseVideo(); yt.unMute(); } catch (e) {}
        muted = true; ui();
        dock.classList.add("ask");
      }
      function verify(ms = 1000) {
        clearTimeout(askTimer);
        askTimer = setTimeout(() => { if (want && yt && !audible()) ask(); }, ms);
      }
      $("#ytAskClose").addEventListener("click", (e) => { e.stopPropagation(); dock.classList.remove("ask"); stop(); });
      function ui() {
        const on = want && !muted && !errored;
        btn.classList.toggle("on", on);
        btn.classList.toggle("muted", want && muted);
        btn.setAttribute("aria-label", errored ? "Mở bài hát trên YouTube" : on ? "Tắt nhạc" : "Bật nhạc");
        btn.title = errored ? "Không phát được nhạc ở đây, bấm để mở YouTube" : on ? "Tắt nhạc" : muted ? "Chạm vào trang để bật tiếng" : "Bật nhạc";
      }
      function loadYT() {
        if (ytReadyP) return ytReadyP;
        ytReadyP = new Promise((res) => {
          if (window.YT && YT.Player) return res();
          const prev = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
          const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
        });
        return ytReadyP;
      }
      // Thử phát có tiếng; nếu trình duyệt chặn thì phát tắt tiếng
      function start() {
        if (!want || errored) return;
        if (audio) {
          const a = audio;
          a.muted = false;
          a.play().then(() => { muted = false; ui(); }).catch(() => {
            if (a !== audio || a.error) return;
            a.muted = true; muted = true; a.play().catch(() => {}); ui();
          });
        } else if (yt && yt.playVideo) {
          yt.unMute(); yt.playVideo();
          setTimeout(() => {
            if (!want) return;
            if (yt.getPlayerState() === 1 && !yt.isMuted()) { muted = false; ui(); return; }
            yt.mute(); yt.playVideo(); muted = true; ui();
          }, 1200);
        }
      }
      function setup() {
        const m = M(), k = JSON.stringify([m.url, m.youtube, m.start]);
        btn.hidden = !has();
        if (k === key) return;
        key = k; errored = false;
        if (audio) { audio.pause(); audio = null; }
        if (yt) { try { yt.destroy(); } catch (e) {} yt = null; $("#ytWrap").innerHTML = '<div id="ytBox"></div>'; }
        ui();
        if (!has()) return;
        if (m.url) {
          audio = new Audio(U.imgSrc(m.url)); audio.loop = true; audio.preload = "auto";
          audio.setAttribute("playsinline", "");
          audio.addEventListener("loadedmetadata", () => { if (m.start) audio.currentTime = +m.start; }, { once: true });
          // chưa có file mp3 (hoặc lỗi) -> dùng YouTube nếu có
          audio.addEventListener("error", () => {
            audio = null;
            if (ytId(m.youtube)) setupYT(m); else { btn.hidden = true; }
          }, { once: true });
          start();
        } else setupYT(m);
      }
      function setupYT(m) {
        {
          const id = ytId(m.youtube);
          loadYT().then(() => {
            yt = new YT.Player("ytBox", {
              width: 200, height: 113, videoId: id,
              playerVars: { start: +m.start || 0, playsinline: 1, rel: 0, loop: 1, playlist: id, controls: 1 },
              events: {
                onReady: start,
                onError: () => { errored = true; dock.classList.remove("ask"); ui(); },
                onStateChange: (e) => {
                  // người xem chạm vào video và nhạc đã có tiếng -> thu khung lại
                  if (e.data === 1 && !yt.isMuted()) { want = true; muted = false; dock.classList.remove("ask"); clearTimeout(askTimer); ui(); }
                },
              },
            });
          });
        }
      }
      // Bật nhạc có tiếng (gọi trong lúc người xem chạm/bấm)
      function play() {
        if (!has()) return;
        want = true; muted = false;
        if (audio) {
          const a = audio;
          a.muted = false;
          a.play().then(() => { muted = false; ui(); }).catch(() => { if (a !== audio || a.error) return; a.muted = true; muted = true; a.play().catch(() => {}); ui(); });
        } else if (yt && yt.playVideo) { yt.unMute(); yt.playVideo(); verify(); }
        ui();
      }
      function stop() {
        want = false; clearTimeout(askTimer); dock.classList.remove("ask");
        if (audio) audio.pause();
        if (yt && yt.pauseVideo) yt.pauseVideo();
        ui();
      }
      btn.addEventListener("click", () => {
        if (errored) { window.open("https://youtu.be/" + ytId(M().youtube), "_blank", "noopener"); return; }
        if (want && audible()) stop(); else play();
      });
      // Lần chạm / bấm đầu tiên ở bất kỳ đâu: bật tiếng nếu đang phát tắt tiếng
      const unlock = (e) => {
        if (e.target.closest && e.target.closest("#soundBtn")) return;
        if (e.target.closest && e.target.closest("#ytDock")) return;
        if (want && !audible()) play();
        // giữ lại cho tới khi nhạc thật sự phát có tiếng
        setTimeout(() => {
          if (want && audible()) UNLOCK_EVENTS.forEach((t) => document.removeEventListener(t, unlock, true));
        }, 800);
      };
      // iPhone chỉ cho bật tiếng trong click / touchend / keydown (không phải pointerdown)
      const UNLOCK_EVENTS = ["click", "touchend", "keydown"];
      UNLOCK_EVENTS.forEach((t) => document.addEventListener(t, unlock, true));
      return { setup, play, stop, has, playing: isPlaying };
    })();

    $("#replayBtn").addEventListener("click", () => startIntro());

    // Cho game, trang khác hoặc chế độ chỉnh sửa gọi
    Object.assign(U, { openCard, openBook, render, renderWall, loadWall, reloadMusic: () => music.setup() });

    /* ---------- KHỞI ĐỘNG ---------- */
    render();
    loadWall();
    music.setup();

    if (EDIT) {
      $("#intro").hidden = true; document.body.classList.remove("intro-on");
      $("#cardStage").hidden = false;
      $("#book").classList.add("show");
      $("#inside").hidden = false; $("#status").classList.add("go");
      const s = document.createElement("script"); s.src = "assets/editor.js?v=" + Date.now(); document.body.appendChild(s);
    } else if (justWon || (!game.enabled && (params.has("skip") || C.intro.enabled === false))) {
      // ?skip=1 chỉ có tác dụng khi game đang tắt
      showStage();
      requestAnimationFrame(() => $("#book").classList.add("show"));
    } else startIntro();
  }
})();
