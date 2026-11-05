/* =====================================================================
   nav-mobile.js (v2) – Thanh trên cùng smartphone: [Tên cửa hàng] ........ [☰]
   Nạp SAU nav-pages.js và store-link.js (cần: ShopCore, StoreLink, esc, toast).
   - Tên + nút ☰ được chèn thẳng vào <header> sẵn có (cùng một thanh với nav).
   - Bấm ☰ mở bảng kính; bấm một mục = "bấm hộ" nút tương ứng trong #tabs
     → cơ chế chuyển tab gốc giữ nguyên, không có logic điều hướng riêng.
   - Tên đọc từ ShopCore.list theo StoreLink.activeId; đổi tên qua StoreLink.rename().
   ===================================================================== */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const tabs = $("#tabs");
  if (!tabs || !window.ShopCore || !window.StoreLink) return console.warn("nav-mobile: thiếu #tabs / ShopCore / StoreLink – bỏ qua.");
  const SC = window.ShopCore, SLK = window.StoreLink;
  const real = [...tabs.querySelectorAll("button[data-t]")];
  if (!real.length) return;

  /* ---------- icon + nhãn ---------- */
  const SV = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const P = {
    store: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    staff: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5M16 5.6a3.2 3.2 0 010 5.8M18 14.8c1.7.6 2.8 2.2 3.2 4.7"/>',
    shops: '<path d="M4 9l1.5-5h13L20 9M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9M10 20v-5h4v5"/>',
    sched: '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    newstaff: '<circle cx="10" cy="8.5" r="3.6"/><path d="M3.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M18.5 8v6M15.5 11h6"/>',
    procard: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M7.5 10h9M7.5 14h5"/>',
  };
  const LB = { store: "Cửa hàng", staff: "Nhân viên", shops: "Danh sách", sched: "Lịch làm việc", newstaff: "Nhân viên mới", procard: "Process Card" };

  /* ---------- thanh: chèn vào <header> (hoặc tự tạo #mnbar nếu trang không có header) ---------- */
  let bar = $("header");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "mnbar";
    document.body.prepend(bar);
  }
  bar.classList.add("mn-host");
  if (/^(fixed|absolute|sticky)$/.test(getComputedStyle(bar).position) && bar.id !== "mnbar") bar.classList.add("mn-pos");

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "mn-name mn-keep none";
  chip.setAttribute("aria-haspopup", "dialog");
  chip.innerHTML = '<span class="mn-nm"></span><i class="mn-u" aria-hidden="true"></i>';
  const nm = $(".mn-nm", chip);

  const menu = document.createElement("button");
  menu.type = "button";
  menu.className = "mn-menu mn-keep";
  menu.setAttribute("aria-label", "Mở menu điều hướng");
  menu.setAttribute("aria-haspopup", "true");
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-controls", "mnPanel");
  menu.innerHTML = "<i></i><i></i><i></i>";
  bar.prepend(chip);
  bar.append(menu);

  /* ---------- bảng điều hướng ---------- */
  const scrim = document.createElement("div");
  scrim.id = "mnScrim";
  const panel = document.createElement("nav");
  panel.id = "mnPanel";
  panel.setAttribute("aria-label", "Điều hướng chính");
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = real
    .map((b) => {
      const t = b.dataset.t, full = (b.textContent || "").trim() || LB[t] || t;
      return `<button type="button" class="mn-it" data-mn="${esc(t)}" tabindex="-1" aria-label="${esc(full)}"><span class="mn-ic">${SV(P[t] || P.store)}</span><span class="mn-lb">${esc(LB[t] || full)}</span></button>`;
    })
    .join("");
  document.body.append(scrim, panel);
  const items = [...panel.querySelectorAll(".mn-it")];

  let isOpen = false;
  function setMenu(v, refocus) {
    if (v === isOpen) return;
    isOpen = v;
    if (v) {
      panel.style.setProperty("--mn-top", Math.round(bar.getBoundingClientRect().bottom + 6) + "px");
      syncActive();
    }
    panel.classList.toggle("on", v);
    scrim.classList.toggle("on", v);
    menu.classList.toggle("open", v);
    menu.setAttribute("aria-expanded", String(v));
    menu.setAttribute("aria-label", v ? "Đóng menu điều hướng" : "Mở menu điều hướng");
    panel.setAttribute("aria-hidden", String(!v));
    items.forEach((it) => (it.tabIndex = v ? 0 : -1));
    if (v) (panel.querySelector(".mn-it.on") || items[0]).focus({ preventScroll: true });
    else if (refocus) menu.focus({ preventScroll: true });
  }
  menu.addEventListener("click", () => setMenu(!isOpen, false));
  scrim.addEventListener("click", () => setMenu(false, false));
  panel.addEventListener("click", (e) => {
    const b = e.target.closest(".mn-it");
    if (!b) return;
    const r = real[items.indexOf(b)];
    if (r) r.click(); /* bấm hộ nút gốc */
    syncActive();
    setMenu(false, false);
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      e.stopPropagation();
      setMenu(false, true);
    }
  }, true);
  addEventListener("resize", () => {
    if (isOpen) panel.style.setProperty("--mn-top", Math.round(bar.getBoundingClientRect().bottom + 6) + "px");
  });
  matchMedia("(max-width:720px)").addEventListener("change", (e) => {
    if (!e.matches) {
      setMenu(false, false);
      if (!saving) closeEdit();
    }
  });

  function syncActive() {
    const on = real.findIndex((b) => b.classList.contains("on"));
    items.forEach((it, i) => {
      it.classList.toggle("on", i === on);
      if (i === on) it.setAttribute("aria-current", "page");
      else it.removeAttribute("aria-current");
    });
  }
  new MutationObserver(syncActive).observe(tabs, { subtree: true, attributes: true, attributeFilter: ["class"] });
  syncActive();

  /* ---------- tên cửa hàng (dữ liệu thật) ---------- */
  const current = () => {
    const id = SLK.activeId;
    return (id && SC.list.find((x) => x.id === id)) || null;
  };
  function paint() {
    const s = current();
    nm.textContent = s ? s.name : "Chưa chọn cửa hàng";
    chip.classList.toggle("none", !s);
    chip.classList.toggle("dirty", !!(s && SLK.dirty));
    chip.title = s ? s.name : "";
    chip.setAttribute("aria-label", s ? "Cửa hàng đang mở: " + s.name + (SLK.dirty ? " (chưa lưu)" : "") + ". Chạm để đổi tên." : "Chưa chọn cửa hàng. Chạm để mở danh sách cửa hàng.");
  }
  /* #slName3d do updUI() của store-link cập nhật; #shBody do render() của nav-pages dựng lại */
  const mo = new MutationObserver(paint);
  ["#slName3d", "#shBody"].forEach((q) => {
    const el = $(q);
    if (el) mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
  });
  document.addEventListener("storelink:change", paint);
  paint();
  setTimeout(paint, 600); /* boot() của store-link chạy bất đồng bộ */

  chip.addEventListener("click", () => {
    setMenu(false, false);
    if (current()) return openEdit();
    const r = real.find((b) => b.dataset.t === "shops");
    if (r) r.click();
  });

  /* ---------- cửa sổ sửa tên nhanh ---------- */
  const ed = document.createElement("div");
  ed.id = "mnEdit";
  ed.innerHTML = `<div class="mn-sheet" role="dialog" aria-modal="true" aria-labelledby="mnEt"><span class="mn-grab"></span>
<h2 id="mnEt">Đổi tên cửa hàng</h2><p class="mn-sub"></p>
<input class="mn-in" type="text" maxlength="80" autocomplete="off" autocapitalize="sentences" spellcheck="false" enterkeyhint="done" aria-label="Tên cửa hàng" aria-describedby="mnEr">
<div class="mn-err" id="mnEr" role="alert"></div>
<div class="mn-row"><button type="button" class="mn-b" data-a="cancel">Hủy</button><button type="button" class="mn-b pri" data-a="save">Lưu</button></div></div>`;
  document.body.appendChild(ed);
  const inp = $(".mn-in", ed), err = $(".mn-err", ed), sub = $(".mn-sub", ed), bSave = $('[data-a="save"]', ed), bCancel = $('[data-a="cancel"]', ed);
  let editId = null, saving = false;

  const fail = (m) => {
    err.textContent = m;
    inp.setAttribute("aria-invalid", "true");
    inp.focus({ preventScroll: true });
    return false;
  };
  function openEdit() {
    const s = current();
    if (!s || saving) return;
    editId = s.id;
    inp.value = s.name;
    inp.removeAttribute("aria-invalid");
    err.textContent = "";
    sub.textContent = "Chỉ đổi tên hiển thị. ID " + s.id + ", mô hình và dữ liệu giữ nguyên.";
    ed.classList.add("on");
    kb();
    inp.focus({ preventScroll: true }); /* gọi ngay trong cú chạm để bàn phím ảo mở được trên iOS */
    inp.setSelectionRange(0, inp.value.length);
  }
  function closeEdit() {
    if (saving) return;
    ed.classList.remove("on");
    inp.blur();
    editId = null;
    chip.focus({ preventScroll: true });
  }
  function setSaving(v) {
    saving = v;
    inp.disabled = v;
    bCancel.disabled = v;
    bSave.disabled = v;
    bSave.textContent = v ? "Đang lưu…" : "Lưu";
    ed.setAttribute("aria-busy", v ? "true" : "false");
  }
  async function save() {
    if (saving) return;
    const v = inp.value.replace(/\s+/g, " ").trim(), s = SC.list.find((x) => x.id === editId);
    inp.removeAttribute("aria-invalid");
    err.textContent = "";
    if (!v) return fail("Vui lòng nhập tên cửa hàng.");
    if (v.length > 80) return fail("Tên tối đa 80 ký tự.");
    if (!s) return fail("Cửa hàng này không còn trong danh sách.");
    if (v === s.name) {
      closeEdit();
      return toast("Tên không thay đổi");
    }
    if (typeof SLK.rename !== "function") return fail("Chưa tích hợp StoreLink.rename – xem HUONG-DAN-TICH-HOP.md.");
    setSaving(true);
    try {
      const u = await SLK.rename(editId, v); /* chỉ resolve khi dữ liệu đã được ghi bền vững */
      setSaving(false);
      closeEdit();
      paint();
      toast("Đã đổi tên thành “" + u.name + "”");
    } catch (e) {
      setSaving(false);
      fail("Không lưu được: " + ((e && e.message) || "lỗi không rõ") + ". Tên cũ vẫn giữ nguyên.");
    }
  }
  ed.addEventListener("click", (e) => {
    if (e.target === ed) return closeEdit();
    const a = e.target.closest("[data-a]");
    if (!a) return;
    if (a.dataset.a === "save") save();
    else closeEdit();
  });
  ed.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target === inp && !e.isComposing) {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      closeEdit();
    } else if (e.key === "Tab") { /* giữ focus trong hộp thoại */
      const f = [inp, bCancel, bSave].filter((x) => !x.disabled);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) (e.preventDefault(), f[f.length - 1].focus());
      else if (!e.shiftKey && i === f.length - 1) (e.preventDefault(), f[0].focus());
    }
  });
  inp.addEventListener("input", () => {
    if (inp.getAttribute("aria-invalid")) {
      inp.removeAttribute("aria-invalid");
      err.textContent = "";
    }
  });

  /* ---------- bàn phím ảo: nâng hộp thoại lên trên bàn phím ---------- */
  const vv = window.visualViewport;
  function kb() {
    const k = vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0;
    ed.style.setProperty("--mn-kb", k + "px");
  }
  if (vv) {
    vv.addEventListener("resize", kb);
    vv.addEventListener("scroll", kb);
  }
})();


/* ===== Liquid Lens v2: khúc xạ thật ở mép kính ===== */
(() => {
  "use strict";
  const panel = document.getElementById("mnPanel");
  if (!panel) return console.warn("nav-mobile-liquid: thiếu #mnPanel – bỏ qua.");
  const items = [...panel.querySelectorAll(":scope > .mn-it")];
  if (!items.length) return;

  const REFR = window.MN_REFRACT !== false; /* đặt window.MN_REFRACT=false để tắt khúc xạ */
  const FM = 0.22;  /* mức phóng đại tối đa (khớp với scale của lớp icon) */
  const PAD = 26;   /* vùng đệm của filter quanh viên kính (px) */
  const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- dựng viên kính: lens > win (filter khúc xạ) > lc (bản sao icon) ---------- */
  const lens = document.createElement("div");
  lens.className = "mn-lens";
  lens.setAttribute("aria-hidden", "true");
  const win = document.createElement("div");
  win.className = "mn-win";
  const lc = document.createElement("div");
  lc.className = "mn-lc";
  const ghosts = items.map((it) => {
    const g = document.createElement("div");
    g.className = "mn-gh";
    g.innerHTML = it.innerHTML;
    lc.appendChild(g);
    return g;
  });
  win.appendChild(lc);
  lens.appendChild(win);
  panel.appendChild(lens);
  panel.classList.add("mn-lq");

  /* ---------- SVG filter: displacement map sinh bằng canvas ---------- */
  let flt = null, fe = null, dm = null, MX = 1, mapKey = "";
  function initFilter() {
    if (flt) return;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    svg.innerHTML =
      '<filter id="mnRefr" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feImage result="m" preserveAspectRatio="none"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="m" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
    document.body.appendChild(svg);
    flt = svg.querySelector("filter");
    fe = svg.querySelector("feImage");
    dm = svg.querySelector("feDisplacementMap");
  }
  function buildMap(w, h) {
    const cw = Math.round(w + 2 * PAD), ch = Math.round(h + 2 * PAD);
    const cv = document.createElement("canvas");
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const img = ctx.createImageData(cw, ch), px = img.data;
    const hw = w / 2, hh = h / 2, r = Math.min(27, hh, hw), edgeW = Math.min(18, h * 0.3);
    const ax = new Float32Array(cw * ch), ay = new Float32Array(cw * ch);
    let mx = 1e-6;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const rx = x + 0.5 - cw / 2, ry = y + 0.5 - ch / 2;
        /* khoảng cách có dấu tới hình chữ nhật bo góc (âm = bên trong) */
        const qx = Math.abs(rx) - (hw - r), qy = Math.abs(ry) - (hh - r);
        const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
        const t = clamp(-sd / edgeW, 0, 1);       /* 0 ở mép → 1 ở sâu bên trong */
        const wgt = Math.pow(1 - t, 2.2) * 1.5;   /* mạnh nhất ở mép, vượt 1 để bẻ cong rõ */
        const i = y * cw + x, dx = rx * FM * wgt, dy = ry * FM * wgt;
        ax[i] = dx; ay[i] = dy;
        mx = Math.max(mx, Math.abs(dx), Math.abs(dy));
      }
    }
    for (let i = 0; i < cw * ch; i++) {
      const j = i * 4;
      px[j] = Math.round(127.5 + (127.5 * ax[i]) / mx);
      px[j + 1] = Math.round(127.5 + (127.5 * ay[i]) / mx);
      px[j + 2] = 128;
      px[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return { url: cv.toDataURL("image/png"), mx, cw, ch };
  }
  function setupMap() {
    if (!REFR || !G) return;
    const key = G.w + "x" + G.h;
    if (key === mapKey) return;
    const m = buildMap(G.w, G.h);
    if (!m) return;
    mapKey = key;
    initFilter();
    MX = m.mx;
    const set = (el) => {
      el.setAttribute("x", -PAD); el.setAttribute("y", -PAD);
      el.setAttribute("width", m.cw); el.setAttribute("height", m.ch);
    };
    set(flt); set(fe);
    fe.setAttribute("href", m.url);
    fe.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", m.url);
  }

  /* ---------- hình học ---------- */
  let G = null;
  function measure() {
    const W = panel.offsetWidth, H = panel.offsetHeight;
    if (!W || !H) return (G = null);
    const cells = items.map((it) => ({
      x: it.offsetLeft, y: it.offsetTop, w: it.offsetWidth, h: it.offsetHeight,
      cx: it.offsetLeft + it.offsetWidth / 2, cy: it.offsetTop + it.offsetHeight / 2,
    }));
    const w = cells[0].w, h = cells[0].h;
    lens.style.width = w + "px";
    lens.style.height = h + "px";
    lc.style.width = W + "px";
    lc.style.height = H + "px";
    ghosts.forEach((g, i) => {
      const c = cells[i];
      g.style.left = c.x + "px"; g.style.top = c.y + "px";
      g.style.width = c.w + "px"; g.style.height = c.h + "px";
    });
    const xs = cells.map((c) => c.cx), ys = cells.map((c) => c.cy);
    G = {
      cells, w, h,
      minX: Math.min(...xs) - w * 0.3, maxX: Math.max(...xs) + w * 0.3,
      minY: Math.min(...ys) - h * 0.3, maxY: Math.max(...ys) + h * 0.3,
    };
    setupMap();
    return G;
  }

  /* ---------- vật lý lò xo ---------- */
  const S = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, s: 0, vs: 0, ts: 0, raf: 0, last: 0 };
  const K = 320, C = 2 * Math.sqrt(K) * 0.62;
  const KS = 300, CS = 2 * Math.sqrt(KS) * 0.5;
  const pv = []; /* cache transform đẩy nước của từng tab */

  /* nước bị đẩy: các tab quanh viên kính trượt nhẹ ra xa khi kính phồng */
  function push() {
    const s = clamp(S.s, 0, 1);
    G.cells.forEach((c, i) => {
      const dx = c.cx - S.x, dy = c.cy - S.y, d = Math.hypot(dx, dy);
      let tx = 0, ty = 0;
      if (s > 0.01 && d > 1) {
        const inf = Math.pow(clamp(1 - d / (G.w * 1.15), 0, 1), 2) * s;
        tx = (dx / d) * 7 * inf; ty = (dy / d) * 7 * inf;
      }
      const v = tx || ty ? `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px)` : "";
      if (pv[i] !== v) { pv[i] = v; items[i].style.transform = v; ghosts[i].style.transform = v; }
    });
  }

  const po = [];
  /* tab thật mờ dần khi viên kính phủ lên (tan vào kính, không chồng chéo) */
  function fade(se) {
    const sw = 1 + 0.2 * se, hw = (G.w * sw) / 2, hh = (G.h * sw) / 2;
    G.cells.forEach((c, i) => {
      const ox = clamp((Math.min(S.x + hw, c.x + c.w) - Math.max(S.x - hw, c.x)) / c.w, 0, 1);
      const oy = clamp((Math.min(S.y + hh, c.y + c.h) - Math.max(S.y - hh, c.y)) / c.h, 0, 1);
      const t = clamp((ox * oy - 0.08) / 0.6, 0, 1);
      const op = (1 - t * t * (3 - 2 * t)).toFixed(2); /* smoothstep */
      if (po[i] !== op) { po[i] = op; items[i].style.opacity = op; }
    });
  }

  function draw() {
    if (!G) return;
    const L = S.x - G.w / 2, T = S.y - G.h / 2;
    const sp = Math.hypot(S.vx, S.vy);
    const st = Math.min(sp / 2400, 0.32);
    const a = (Math.atan2(S.vy, S.vx) * 180) / Math.PI;
    const se = clamp(S.s, 0, 1.4);
    const defo = st > 0.004 ? `rotate(${a}deg) scale(${1 + st},${1 - st * 0.6}) rotate(${-a}deg) ` : "";
    lens.style.transform = `translate3d(${L}px,${T}px,0) ${defo}scale(${1 + 0.2 * se})`;
    lens.style.setProperty("--s", clamp(S.s, 0, 1).toFixed(3));
    lc.style.transformOrigin = `${S.x}px ${S.y}px`;
    lc.style.transform = `translate(${-L}px,${-T}px) scale(${1 + FM * se})`;
    if (REFR && dm) { /* khúc xạ tăng theo độ phồng; nằm yên thì tắt filter cho nhẹ */
      const on = se > 0.03;
      win.style.filter = on ? "url(#mnRefr)" : "none";
      if (on) dm.setAttribute("scale", (2 * MX * se).toFixed(2));
    }
        fade(se);
    push();
  }
  function frame(t) {
    const dt = Math.min(0.032, (t - S.last) / 1000 || 0.016);
    S.last = t;
    const n = 2, h = dt / n;
    for (let i = 0; i < n; i++) {
      S.vx += (K * (S.tx - S.x) - C * S.vx) * h; S.x += S.vx * h;
      S.vy += (K * (S.ty - S.y) - C * S.vy) * h; S.y += S.vy * h;
      S.vs += (KS * (S.ts - S.s) - CS * S.vs) * h; S.s += S.vs * h;
    }
    draw();
    const still = Math.abs(S.tx - S.x) < 0.2 && Math.abs(S.ty - S.y) < 0.2 && Math.hypot(S.vx, S.vy) < 4 &&
      Math.abs(S.ts - S.s) < 0.003 && Math.abs(S.vs) < 0.02;
    if (still) {
      S.x = S.tx; S.y = S.ty; S.s = S.ts; S.vx = S.vy = S.vs = 0;
      draw();
      S.raf = 0;
      return;
    }
    S.raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (RM()) {
      S.x = S.tx; S.y = S.ty; S.s = S.ts; S.vx = S.vy = S.vs = 0;
      return draw();
    }
    if (!S.raf) { S.last = performance.now(); S.raf = requestAnimationFrame(frame); }
  }

  /* ---------- trạng thái tab ---------- */
  const readActive = () => Math.max(0, items.findIndex((b) => b.classList.contains("on")));
  let active = readActive(), hot = -1, drag = null, swallow = false, pass = false, swT = 0, isOpen = false;

  function setHot(i) {
    if (drag) drag.hot = i;
    if (i === hot) return;
    hot = i;
    ghosts.forEach((g, j) => g.classList.toggle("hot", j === i));
    if (i >= 0 && drag && drag.moved && navigator.vibrate) navigator.vibrate(6);
  }
  function rest(animate) {
    if (!G) return;
    const c = G.cells[active];
    S.tx = c.cx; S.ty = c.cy; S.ts = 0;
    setHot(active);
    if (animate) kick();
    else { S.x = S.tx; S.y = S.ty; S.vx = S.vy = S.s = S.vs = 0; draw(); }
  }

  /* ---------- kéo thả ---------- */
  function listen(on) {
    const f = on ? addEventListener : removeEventListener;
    f("pointermove", mv, { passive: false });
    f("pointerup", up);
    f("pointercancel", cancel);
  }
  function mv(e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
    drag.moved = true;
    const { r, k } = drag;
    const px = (e.clientX - r.left) / k, py = (e.clientY - r.top) / k;
    const dx = Math.max(0, r.left - e.clientX, e.clientX - r.right);
    const dy = Math.max(0, r.top - e.clientY, e.clientY - r.bottom);
    if (Math.hypot(dx, dy) > 90) {
      if (!drag.out) { drag.out = true; setHot(-1); const c = G.cells[active]; S.tx = c.cx; S.ty = c.cy; S.ts = 0; kick(); }
      return;
    }
    drag.out = false;
    let b = 0, bd = Infinity;
    G.cells.forEach((c, i) => { const d = (c.cx - px) ** 2 + (c.cy - py) ** 2; if (d < bd) { bd = d; b = i; } });
    setHot(b);
    const c = G.cells[b], mag = 0.28;
    S.tx = clamp(px + (c.cx - px) * mag, G.minX, G.maxX);
    S.ty = clamp(py + (c.cy - py) * mag, G.minY, G.maxY);
    S.ts = 1;
    kick();
  }
  function up(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    listen(false);
    drag = null;
    swallow = true;
    clearTimeout(swT);
    swT = setTimeout(() => (swallow = false), 500);
    if (d.out || d.hot < 0) return rest(true);
    const idx = d.hot, c = G.cells[idx];
    S.tx = c.cx; S.ty = c.cy; S.ts = 0;
    kick();
    const wait = RM() ? 0 : d.moved ? 260 : performance.now() - d.t0 > 250 ? 200 : 120;
    setTimeout(() => {
      pass = true;
      try { items[idx].click(); } finally { pass = false; }
    }, wait);
  }
  function cancel(e) {
    if (!drag || e.pointerId !== drag.id) return;
    listen(false);
    drag = null;
    rest(true);
  }

  panel.addEventListener("pointerdown", (e) => {
    if (drag || e.button > 0) return;
    const it = e.target.closest(".mn-it");
    if (!it || it.parentNode !== panel || !measure()) return;
    const r = panel.getBoundingClientRect();
    const idx = items.indexOf(it);
    drag = {
      id: e.pointerId, r, k: r.width / panel.offsetWidth || 1,
      x0: e.clientX, y0: e.clientY, idx, hot: idx,
      moved: false, out: false, t0: performance.now(),
    };
    const c = G.cells[idx];
    S.tx = c.cx; S.ty = c.cy; S.ts = 1;
    setHot(idx);
    kick();
    listen(true);
  });
  panel.addEventListener("click", (e) => {
    if (pass || !swallow) return;
    swallow = false;
    e.stopImmediatePropagation();
    e.preventDefault();
  }, true);
  panel.addEventListener("contextmenu", (e) => e.preventDefault());

  /* ---------- đồng bộ với nav-mobile.js ---------- */
  new MutationObserver(() => {
    const o = panel.classList.contains("on");
    if (o === isOpen) return;
    isOpen = o;
    if (o) {
      if (!measure()) return;
      active = readActive();
      rest(false);
      if (!RM()) { S.s = 0.8; S.ts = 0; S.vs = 0; kick(); }
    } else if (drag) {
      listen(false);
      drag = null;
    }
  }).observe(panel, { attributes: true, attributeFilter: ["class"] });

  const mo = new MutationObserver(() => {
    const a = readActive();
    if (a === active) return;
    active = a;
    if (isOpen && !drag) rest(true);
  });
  items.forEach((it) => mo.observe(it, { attributes: true, attributeFilter: ["class"] }));

  addEventListener("resize", () => { if (isOpen && measure()) rest(false); });
  if (panel.classList.contains("on")) { isOpen = true; if (measure()) rest(false); }
})();