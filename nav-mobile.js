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


/* ===== Liquid Lens v4 (mobile): một lớp icon bị khúc xạ liên tục + nhận dạng ý định kéo ===== */
(() => {
  "use strict";
  const panel = document.getElementById("mnPanel");
  if (!panel) return console.warn("nav-mobile-liquid: thiếu #mnPanel – bỏ qua.");
  const items = [...panel.querySelectorAll(":scope > .mn-it")];
  if (!items.length) return;

  const REFR = window.MN_REFRACT !== false; /* window.MN_REFRACT=false để tắt khúc xạ */
  const F = 0.14;    /* phóng đại quanh tâm kính */
  const BEND = 1;    /* độ bẻ cong ở mép (nhân với biên độ gốc) */
  const HALO = 6;   /* vùng khúc xạ giảm dần ra ngoài mép (px) */
  const CA = 0.1;    /* tách màu cầu vồng ở mép (0 = tắt) */
  const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let G = null;

  /* ---------- DOM: thân kính (dưới) · lớp icon khúc xạ · viền kính (trên) ---------- */
  const lens = document.createElement("div"); lens.className = "mn-lens"; lens.setAttribute("aria-hidden", "true");
  const rim = document.createElement("div"); rim.className = "mn-rim"; rim.setAttribute("aria-hidden", "true");
  const lc = document.createElement("div"); lc.className = "mn-lc"; lc.setAttribute("aria-hidden", "true");
  const ghosts = items.map((it) => {
    const g = document.createElement("div");
    g.className = "mn-gh";
    g.innerHTML = it.innerHTML;
    lc.appendChild(g);
    return g;
  });
  panel.append(lens, lc, rim);
  panel.classList.add("mn-lq");

  /* ---------- SVG filter: trường khúc xạ liên tục + tách màu R/G/B ---------- */
  const XL = "http://www.w3.org/1999/xlink";
  let flt = null, fe = null, dms = null, mp = null, mapKey = "";
  function initFilter() {
    if (flt) return;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    const dmap = (r) => `<feDisplacementMap in="SourceGraphic" in2="m" scale="0" xChannelSelector="R" yChannelSelector="G" result="${r}"/>`;
    const ch = (v) => `<feColorMatrix type="matrix" values="${v}"`;
    svg.innerHTML =
      '<filter id="mnRefr" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feFlood flood-color="rgb(128,128,128)" flood-opacity="1" result="n"/>' +  /* nền trung tính = không lệch */
      '<feImage result="im" preserveAspectRatio="none"/>' +
      '<feMerge result="m"><feMergeNode in="n"/><feMergeNode in="im"/></feMerge>' +
      dmap("dr") + ch("1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0") + ' in="dr" result="r"/>' +
      dmap("dg") + ch("0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0") + ' in="dg" result="g"/>' +
      dmap("db") + ch("0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0") + ' in="db" result="b"/>' +
      '<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter>';
    document.body.appendChild(svg);
    flt = svg.querySelector("filter");
    fe = svg.querySelector("feImage");
    dms = [...svg.querySelectorAll("feDisplacementMap")];
  }
  /* trường: phóng đại (kéo mẫu về tâm) + bẻ cong theo pháp tuyến ở mép trong,
     nhân với đường bao E: =1 trong kính, giảm mượt về 0 trong vùng HALO bên ngoài → liên tục, không có ranh giới cứng */
    function buildMap(w, h) {
    const cw = Math.round(w + 2 * HALO), ch = Math.round(h + 2 * HALO);
    const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const img = ctx.createImageData(cw, ch), px = img.data;
    const hw = w / 2, hh = h / 2, r = Math.min(hh, 28);
    const edgeIn = Math.min(h * 0.45, 26), amp = Math.min(h * 0.42, 24) * BEND, rc = edgeIn * 0.4, rw = edgeIn * 0.55;
    const sdf = (x, y) => {
      const qx = Math.abs(x) - (hw - r), qy = Math.abs(y) - (hh - r);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    };
    const vx = new Float32Array(cw * ch), vy = new Float32Array(cw * ch);
    let mx = 1e-6;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const rx = x + 0.5 - cw / 2, ry = y + 0.5 - ch / 2, sd = sdf(rx, ry);
      let ex = 0, ey = 0;
      if (sd < 0) { /* chỉ bên trong kính: 0 ở mép → tăng mượt vào trong */
        const dp = -sd, m = sstep(0, edgeIn, dp);
        ex = -rx * F * m; ey = -ry * F * m;                      /* phóng đại về tâm */
        const q = (dp - rc) / rw, b = Math.exp(-q * q) * sstep(0, rc * 0.7, dp);
        if (b > 0.001) {                                         /* bẻ cong ngay sau mép */
          const nx = sdf(rx + 0.5, ry) - sdf(rx - 0.5, ry), ny = sdf(rx, ry + 0.5) - sdf(rx, ry - 0.5), nl = Math.hypot(nx, ny) || 1;
          ex += (nx / nl) * amp * b; ey += (ny / nl) * amp * b;
        }
      }
      const i = y * cw + x;
      vx[i] = ex; vy[i] = ey; mx = Math.max(mx, Math.abs(ex), Math.abs(ey));
    }
    for (let i = 0; i < cw * ch; i++) {
      const j = i * 4;
      px[j] = Math.round(128 + (127 * vx[i]) / mx);
      px[j + 1] = Math.round(128 + (127 * vy[i]) / mx);
      px[j + 2] = 128; px[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return { url: cv.toDataURL("image/png"), mx, cw, ch };
  }
  function setupMap() {
    if (!REFR || !G) return;
    const key = G.w + "x" + G.h;
    if (key !== mapKey) {
      const m = buildMap(G.w, G.h);
      if (!m) return;
      mapKey = key; mp = m;
      initFilter();
      fe.setAttribute("href", m.url);
      fe.setAttributeNS(XL, "xlink:href", m.url);
    }
    if (flt) {
      flt.setAttribute("x", 0); flt.setAttribute("y", 0);
      flt.setAttribute("width", panel.offsetWidth); flt.setAttribute("height", panel.offsetHeight);
    }
  }

  /* ---------- hình học ---------- */
  function measure() {
    const W = panel.offsetWidth, H = panel.offsetHeight;
    if (!W || !H) return (G = null);
    const cells = items.map((it) => ({
      x: it.offsetLeft, y: it.offsetTop, w: it.offsetWidth, h: it.offsetHeight,
      cx: it.offsetLeft + it.offsetWidth / 2, cy: it.offsetTop + it.offsetHeight / 2,
    }));
    const w = cells[0].w, h = cells[0].h;
    [lens, rim].forEach((e) => { e.style.width = w + "px"; e.style.height = h + "px"; });
    lc.style.width = W + "px"; lc.style.height = H + "px";
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
  const tc = [];

  /* màu nhấn chuyển dần theo mức kính phủ lên từng icon */
  function tint(kx, ky) {
    const hw = (G.w * kx) / 2, hh = (G.h * ky) / 2;
    G.cells.forEach((c, i) => {
      const ox = clamp((Math.min(S.x + hw, c.x + c.w) - Math.max(S.x - hw, c.x)) / c.w, 0, 1);
      const oy = clamp((Math.min(S.y + hh, c.y + c.h) - Math.max(S.y - hh, c.y)) / c.h, 0, 1);
      const t = sstep(0.12, 0.7, ox * oy).toFixed(2);
      if (tc[i] !== t) { tc[i] = t; ghosts[i].style.setProperty("--t", t); }
    });
  }
  function draw() {
    if (!G) return;
    const se = clamp(S.s, 0, 1.4), sw = 1 + 0.2 * se;
    const sp = Math.hypot(S.vx, S.vy), st = Math.min(sp / 2400, 0.32);
    const ang = Math.atan2(S.vy, S.vx), L = S.x - G.w / 2, T = S.y - G.h / 2;
    const defo = st > 0.004 ? `rotate(${(ang * 180) / Math.PI}deg) scale(${1 + st},${1 - st * 0.6}) rotate(${(-ang * 180) / Math.PI}deg) ` : "";
    const tf = `translate3d(${L}px,${T}px,0) ${defo}scale(${sw})`;
    lens.style.transform = tf; rim.style.transform = tf;
    const sv = clamp(S.s, 0, 1).toFixed(3);
    lens.style.setProperty("--s", sv); rim.style.setProperty("--s", sv);
    /* kích thước hiệu dụng của kính sau phồng + giãn (để trường khúc xạ bám đúng hình kính) */
    const c = Math.cos(ang), s_ = Math.sin(ang);
    const ex = st > 0.004 ? Math.hypot((1 + st) * c, (1 - st * 0.6) * s_) : 1;
    const ey = st > 0.004 ? Math.hypot((1 + st) * s_, (1 - st * 0.6) * c) : 1;
    if (REFR && mp && dms) {
      const on = se > 0.03;
      lc.style.filter = on ? "url(#mnRefr)" : "none";
      if (on) {
        const fw = mp.cw * sw * ex, fh = mp.ch * sw * ey;
        fe.setAttribute("x", (S.x - fw / 2).toFixed(1)); fe.setAttribute("y", (S.y - fh / 2).toFixed(1));
        fe.setAttribute("width", fw.toFixed(1)); fe.setAttribute("height", fh.toFixed(1));
        const b = 2 * mp.mx * se;
        dms[0].setAttribute("scale", (b * (1 + CA)).toFixed(2));
        dms[1].setAttribute("scale", b.toFixed(2));
        dms[2].setAttribute("scale", (b * (1 - CA)).toFixed(2));
      }
    }
    tint(sw * ex, sw * ey);
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
      draw(); S.raf = 0; return;
    }
    S.raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (RM()) { S.x = S.tx; S.y = S.ty; S.s = S.ts; S.vx = S.vy = S.vs = 0; return draw(); }
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

  /* ---------- nhận dạng ý định ---------- */
  /* ô gần điểm (qx,qy) nhất; hysteresis để không nhấp nháy ở biên giữa 2 ô */
  function pick(qx, qy, cur) {
    let b = 0, bd = Infinity, cd = Infinity;
    G.cells.forEach((c, i) => {
      const d = Math.hypot((c.cx - qx) / c.w, (c.cy - qy) / c.h);
      if (i === cur) cd = d;
      if (d < bd) { bd = d; b = i; }
    });
    return cur >= 0 && b !== cur && cd - bd < 0.12 ? cur : b;
  }
  /* vận tốc ngón tay (px/s) trong cửa sổ ~120ms gần nhất */
  function vel(d) {
    const s = d.smp;
    if (s.length < 2) return [0, 0];
    const a = s[0], b = s[s.length - 1], dt = b.t - a.t;
    if (dt < 12 || performance.now() - b.t > 90) return [0, 0]; /* dừng tay → vận tốc 0 */
    return [((b.x - a.x) / dt) * 1000, ((b.y - a.y) / dt) * 1000];
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
    const { r, k } = drag, now = performance.now();
    const px = (e.clientX - r.left) / k, py = (e.clientY - r.top) / k;
    drag.smp.push({ t: now, x: px, y: py });
    while (drag.smp.length > 2 && now - drag.smp[0].t > 120) drag.smp.shift();
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
    drag.moved = true;
    const dx = Math.max(0, r.left - e.clientX, e.clientX - r.right);
    const dy = Math.max(0, r.top - e.clientY, e.clientY - r.bottom);
    if (Math.hypot(dx, dy) > 90) { /* kéo ra xa: hủy */
      if (!drag.out) { drag.out = true; setHot(-1); const c = G.cells[active]; S.tx = c.cx; S.ty = c.cy; S.ts = 0; kick(); }
      return;
    }
    drag.out = false;
    /* kính bám theo ngón tay, giữ nguyên chỗ nắm – không hít vào ô nào */
    S.tx = clamp(px + drag.ox, G.minX, G.maxX);
    S.ty = clamp(py + drag.oy, G.minY, G.maxY);
    S.ts = 1;
    const [vx, vy] = vel(drag);
    setHot(pick(S.tx + vx * 0.07, S.ty + vy * 0.07, hot)); /* ô đang "nhắm tới" */
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
    let idx = d.idx;
    if (d.moved) { /* dừng tay → ô dưới kính; vuốt nhanh → chiếu quán tính */
      const [vx, vy] = vel(d);
      let qx = S.tx, qy = S.ty;
      if (Math.hypot(vx, vy) > 250) {
        qx += clamp(vx * 0.14, -G.w * 1.6, G.w * 1.6);
        qy += clamp(vy * 0.14, -G.h * 1.6, G.h * 1.6);
      }
      idx = pick(qx, qy, d.hot);
    }
    const c = G.cells[idx];
    S.tx = c.cx; S.ty = c.cy; S.ts = 0;
    setHot(idx);
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
    const r = panel.getBoundingClientRect(), k = r.width / panel.offsetWidth || 1;
    const idx = items.indexOf(it), c = G.cells[idx];
    const px = (e.clientX - r.left) / k, py = (e.clientY - r.top) / k;
    drag = {
      id: e.pointerId, r, k, x0: e.clientX, y0: e.clientY, idx, hot: idx,
      ox: c.cx - px, oy: c.cy - py, smp: [{ t: performance.now(), x: px, y: py }],
      moved: false, out: false, t0: performance.now(),
    };
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