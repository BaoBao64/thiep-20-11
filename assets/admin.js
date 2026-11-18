/* admin.js — CHẾ ĐỘ ADMIN dùng chung cho mọi trang
   • Đăng nhập bằng mật khẩu ADMIN_KEY (giống trong Apps Script).
     Web chỉ lưu MÃ HOÁ một chiều của mật khẩu (CONFIG.admin.keyHash), không lưu mật khẩu thật.
   • Đăng nhập xong: mọi trang hiện thanh admin ở trên cùng
     (bỏ qua game / màn code, chỉnh sửa, quản lý & xoá lời chúc, đăng xuất).
   • Mở nhanh hộp đăng nhập: thêm ?admin vào cuối link, hoặc bấm nút ổ khoá nhỏ ở góc dưới phải. */
(function () {
  "use strict";
  const U = window.Thiep, C = window.CONFIG;
  const { esc, store, toast } = U;
  const SALT = "thiep2011:";
  const MINI_KEY = "thiep2011_admin_bar_mini";
  let admin = false;

  async function sha(s) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SALT + s));
    return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  const wantHash = () => (C.admin && C.admin.keyHash) || "";
  async function check() {
    const k = store.get(U.ADMIN_KEY, "");
    try { admin = !!(k && wantHash() && (await sha(k)) === wantHash()); } catch (e) { admin = false; }
    return admin;
  }
  /* true = đúng, false = sai, null = chưa cài mật khẩu admin trong config */
  async function login(pw) {
    if (!wantHash()) return null;
    if ((await sha(pw)) !== wantHash()) return false;
    store.set(U.ADMIN_KEY, pw); admin = true;
    return true;
  }
  function logout() { store.set(U.ADMIN_KEY, null); admin = false; location.reload(); }

  // Các trang chờ kiểm tra admin xong mới chạy
  U.ready = U.ready.then(check);
  Object.assign(U, { isAdmin: () => admin, adminLogin: login, adminLogout: logout, adminHash: sha });

  /* ---------- giao diện ---------- */
  const page = () => (document.body.classList.contains("page-sum") ? "sum" : document.body.classList.contains("page-wish") ? "wish" : "main");
  const go = (url) => () => { location.href = url; };

  function actions() {
    const p = page(), list = [];
    if (p === "main" && U.EDIT) {
      list.push(["👁 Xem như khách", go("index.html")]);
    } else if (p === "main") {
      list.push(["⏭ Mở thiệp ngay", () => U.adminSkip && U.adminSkip()]);
      list.push(["↺ Xem từ đầu", () => { const b = document.getElementById("replayBtn"); if (b && !document.getElementById("cardStage").hidden) b.click(); else location.href = "index.html"; }]);
      list.push(["✎ Chỉnh sửa", go("index.html?edit")]);
    } else {
      list.push(["♥ Thiệp", go("index.html")]);
      list.push(["✎ Chỉnh sửa", go("index.html?edit")]);
    }
    if (p !== "sum") list.push(["📋 Quản lý lời chúc", go("tong-hop.html")]);
    if (p !== "wish") list.push(["✉ Trang viết thiệp", go("wish.html")]);
    list.push(["Đăng xuất", logout, "out"]);
    return list;
  }

  function buildBar() {
    const bar = document.createElement("div");
    bar.className = "adm-bar" + (store.get(MINI_KEY, false) ? " mini" : "");
    bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Công cụ admin");
    const acts = actions();
    bar.innerHTML = `<button class="adm-badge" type="button" title="Thu gọn / mở rộng thanh admin">👑 <span>Admin</span></button>
      <div class="adm-acts">${acts.map((a, i) => `<button type="button" data-i="${i}" class="${a[2] || ""}">${esc(a[0])}</button>`).join("")}</div>`;
    bar.querySelector(".adm-badge").addEventListener("click", () => { bar.classList.toggle("mini"); store.set(MINI_KEY, bar.classList.contains("mini")); });
    bar.querySelector(".adm-acts").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) acts[+b.dataset.i][1](); });
    document.body.appendChild(bar);
    document.body.classList.add("is-admin");
  }

  function openLogin() {
    let m = document.getElementById("admModal");
    if (!m) {
      m = document.createElement("div");
      m.id = "admModal"; m.className = "modal adm-modal";
      m.innerHTML = `<form class="modal-box" novalidate>
          <h3>Đăng nhập admin</h3>
          <p>Nhập mật khẩu admin (ADMIN_KEY) để mở các công cụ quản lý trên mọi trang.</p>
          <input type="password" id="admPw" autocomplete="current-password" placeholder="Mật khẩu" aria-label="Mật khẩu admin">
          <p class="adm-err" id="admErr" role="alert"></p>
          <div class="actions"><button class="btn ghost" type="button" id="admCancel">Huỷ</button><button class="btn navy" type="submit">Đăng nhập</button></div>
        </form>`;
      document.body.appendChild(m);
      m.querySelector("#admCancel").addEventListener("click", () => (m.hidden = true));
      m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; });
      m.querySelector("form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const pw = m.querySelector("#admPw").value.trim(), err = m.querySelector("#admErr");
        if (!pw) { err.textContent = "Bạn nhập mật khẩu trước nhé."; return; }
        const ok = await login(pw);
        if (ok === null) { err.textContent = "Web chưa được cài mật khẩu admin (admin.keyHash trong config.js)."; return; }
        if (!ok) { err.textContent = "Sai mật khẩu."; m.querySelector("#admPw").select(); return; }
        toast("Đã đăng nhập admin."); setTimeout(() => location.reload(), 500);
      });
    }
    m.hidden = false; m.querySelector("#admErr").textContent = "";
    setTimeout(() => m.querySelector("#admPw").focus(), 50);
  }

  function buildLock() {
    const b = document.createElement("button");
    b.type = "button"; b.className = "adm-lock"; b.title = "Đăng nhập admin"; b.setAttribute("aria-label", "Đăng nhập admin");
    b.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor"/></svg>`;
    b.addEventListener("click", openLogin);
    document.body.appendChild(b);
  }

  U.ready.then(() => {
    if (admin) buildBar();
    else {
      if (!U.EDIT && wantHash()) buildLock();
      if (/[?&]admin\b/.test(location.search)) openLogin();
    }
  });
  U.openAdminLogin = openLogin;
})();
