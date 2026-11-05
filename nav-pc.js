/* =====================================================================
   nav-pc.js (v1) – PC (>720px): chip [Tên cửa hàng] trên header, bấm để đổi tên.
   Nạp SAU nav-pages.js và store-link.js (cần: ShopCore, StoreLink, esc, toast).
   - Chỉ có chức năng đổi tên; KHÔNG có nút ☰ (PC dùng thanh #tabs gốc).
   - Đổi tên qua StoreLink.rename() → không có logic lưu riêng, không đụng core.
   - Dùng id/class riêng (pc-*) nên chạy song song với nav-mobile.js không xung đột.
   - Dưới 720px: chip và hộp thoại bị ẩn bằng CSS, việc đổi tên do nav-mobile.js lo.
   ===================================================================== */
(() => {
  "use strict";

  /* ---------- 0. Tiện ích + kiểm tra phụ thuộc ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  if (!window.ShopCore || !window.StoreLink)
    return console.warn("nav-pc: thiếu ShopCore / StoreLink – bỏ qua.");
  const SC = window.ShopCore, SLK = window.StoreLink;
  const MQ_PC = matchMedia("(min-width:721px)");

  /* ---------- 1. CSS (chỉ áp dụng khi màn hình > 720px) ---------- */
  const css = document.createElement("style");
  css.textContent = `
/* Mọi thứ của nav-pc chỉ hiện trên PC */
#pcName, #pcEdit { display: none; }

@media (min-width: 721px) {

  /* Trên PC: ẩn chip tên + nút ☰ + bảng menu + hộp thoại của nav-mobile.js
     để chỉ còn chip #pcName của nav-pc.js (tránh hiện 2 chỗ tên) */
  header .mn-name,
  header .mn-menu,
  #mnPanel,
  #mnScrim,
  #mnEdit {
    display: none !important;
  }

  /* Chip tên cửa hàng nằm trong header */
  #pcName {
    display: inline-flex; align-items: center; gap: 8px;
    max-width: 280px; margin-right: 12px; padding: 6px 14px;
    border: 1px solid rgba(255,255,255,.18); border-radius: 999px;
    background: rgba(255,255,255,.08); color: inherit;
    font: inherit; font-weight: 600; cursor: pointer; flex: 0 0 auto;
    transition: background .15s, border-color .15s;
  }
  #pcName:hover { background: rgba(255,255,255,.16); border-color: rgba(255,255,255,.32); }
  #pcName:focus-visible { outline: 2px solid #0a84ff; outline-offset: 2px; }

  /* Chưa chọn cửa hàng: chữ mờ hơn */
  #pcName.none { opacity: .65; font-weight: 500; }

  /* Tên dài thì cắt bằng dấu ba chấm */
  #pcName .pc-nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Chấm cam báo "chưa lưu" khi dữ liệu cửa hàng đang thay đổi */
  #pcName .pc-dot { display: none; width: 8px; height: 8px; border-radius: 50%; background: #ff9f0a; flex: 0 0 auto; }
  #pcName.dirty .pc-dot { display: inline-block; }

  /* Icon bút nhỏ gợi ý có thể bấm để sửa */
  #pcName .pc-pen { width: 14px; height: 14px; opacity: .6; flex: 0 0 auto; }

  /* Lớp nền mờ + căn giữa hộp thoại */
  #pcEdit {
    position: fixed; inset: 0; z-index: 9999;
    align-items: center; justify-content: center;
    background: rgba(0,0,0,.45); backdrop-filter: blur(4px);
  }
  #pcEdit.on { display: flex; }

  /* Khung hộp thoại */
  #pcEdit .pc-box {
    width: min(420px, 92vw); padding: 22px; border-radius: 16px;
    background: rgba(30,30,34,.96); color: #fff;
    border: 1px solid rgba(255,255,255,.14); box-shadow: 0 24px 60px rgba(0,0,0,.5);
  }
  #pcEdit h2 { margin: 0 0 6px; font-size: 18px; }
  #pcEdit .pc-sub { margin: 0 0 14px; font-size: 12.5px; opacity: .65; line-height: 1.45; }

  /* Ô nhập tên */
  #pcEdit .pc-in {
    width: 100%; box-sizing: border-box; padding: 10px 12px; font: inherit;
    color: inherit; background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.2); border-radius: 10px; outline: none;
  }
  #pcEdit .pc-in:focus { border-color: #0a84ff; }
  #pcEdit .pc-in[aria-invalid="true"] { border-color: #ff453a; }

  /* Dòng báo lỗi */
  #pcEdit .pc-err { min-height: 18px; margin-top: 6px; font-size: 12.5px; color: #ff6961; }

  /* Hàng nút Hủy / Lưu */
  #pcEdit .pc-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }
  #pcEdit .pc-b {
    padding: 8px 18px; border: 0; border-radius: 10px; font: inherit; cursor: pointer;
    color: inherit; background: rgba(255,255,255,.12);
  }
  #pcEdit .pc-b:hover:not(:disabled) { background: rgba(255,255,255,.2); }
  #pcEdit .pc-b.pri { background: #0a84ff; color: #fff; font-weight: 600; }
  #pcEdit .pc-b.pri:hover:not(:disabled) { background: #3396ff; }
  #pcEdit .pc-b:disabled { opacity: .55; cursor: default; }
}`;
  document.head.appendChild(css);

  /* ---------- 2. Chip tên cửa hàng (chèn vào <header>) ---------- */
  const host = $("header") || $("#tabs")?.parentNode;
  if (!host) return console.warn("nav-pc: không tìm thấy <header> – bỏ qua.");

  const chip = document.createElement("button");
  chip.type = "button";
  chip.id = "pcName";
  chip.className = "none";
  chip.setAttribute("aria-haspopup", "dialog");
  chip.innerHTML =
    '<span class="pc-nm"></span><i class="pc-dot" aria-hidden="true"></i>' +
    '<svg class="pc-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
  host.prepend(chip);
  const nm = $(".pc-nm", chip);

  /* Lấy cửa hàng đang mở (theo StoreLink.activeId) từ ShopCore.list */
  const current = () => {
    const id = SLK.activeId;
    return (id && SC.list.find((x) => x.id === id)) || null;
  };

  /* Vẽ lại chip: tên, trạng thái "chưa chọn" / "chưa lưu", tooltip, aria-label */
  function paint() {
    const s = current();
    nm.textContent = s ? s.name : "Chưa chọn cửa hàng";
    chip.classList.toggle("none", !s);
    chip.classList.toggle("dirty", !!(s && SLK.dirty));
    chip.title = s ? "Bấm để đổi tên: " + s.name : "Chọn cửa hàng";
    chip.setAttribute(
      "aria-label",
      s ? "Cửa hàng đang mở: " + s.name + (SLK.dirty ? " (chưa lưu)" : "") + ". Bấm để đổi tên."
        : "Chưa chọn cửa hàng. Bấm để mở danh sách cửa hàng."
    );
  }

  /* Tự cập nhật chip khi dữ liệu đổi (#slName3d do store-link, #shBody do nav-pages) */
  const mo = new MutationObserver(paint);
  ["#slName3d", "#shBody"].forEach((q) => {
    const el = $(q);
    if (el) mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
  });
  document.addEventListener("storelink:change", paint);
  paint();
  setTimeout(paint, 600); /* boot() của store-link chạy bất đồng bộ */

  /* Bấm chip: có cửa hàng → mở hộp thoại đổi tên; chưa có → nhảy sang tab "Danh sách" */
  chip.addEventListener("click", () => {
    if (!MQ_PC.matches) return;
    if (current()) return openEdit();
    const r = $('#tabs button[data-t="shops"]');
    if (r) r.click();
  });

  /* ---------- 3. Hộp thoại đổi tên ---------- */
  const ed = document.createElement("div");
  ed.id = "pcEdit";
  ed.innerHTML = `<div class="pc-box" role="dialog" aria-modal="true" aria-labelledby="pcEt">
<h2 id="pcEt">Đổi tên cửa hàng</h2><p class="pc-sub"></p>
<input class="pc-in" type="text" maxlength="80" autocomplete="off" spellcheck="false" aria-label="Tên cửa hàng" aria-describedby="pcEr">
<div class="pc-err" id="pcEr" role="alert"></div>
<div class="pc-row"><button type="button" class="pc-b" data-a="cancel">Hủy</button><button type="button" class="pc-b pri" data-a="save">Lưu</button></div></div>`;
  document.body.appendChild(ed);
  const inp = $(".pc-in", ed), err = $(".pc-err", ed), sub = $(".pc-sub", ed),
    bSave = $('[data-a="save"]', ed), bCancel = $('[data-a="cancel"]', ed);
  let editId = null, saving = false;

  /* Hiện lỗi dưới ô nhập, đánh dấu ô sai và trả về false */
  const fail = (m) => {
    err.textContent = m;
    inp.setAttribute("aria-invalid", "true");
    inp.focus({ preventScroll: true });
    return false;
  };

  /* Mở hộp thoại: điền sẵn tên hiện tại và bôi đen để gõ đè */
  function openEdit() {
    const s = current();
    if (!s || saving) return;
    editId = s.id;
    inp.value = s.name;
    inp.removeAttribute("aria-invalid");
    err.textContent = "";
    sub.textContent = "Chỉ đổi tên hiển thị. ID " + s.id + ", mô hình và dữ liệu giữ nguyên.";
    ed.classList.add("on");
    inp.focus({ preventScroll: true });
    inp.select();
  }

  /* Đóng hộp thoại (không đóng khi đang lưu) và trả focus về chip */
  function closeEdit() {
    if (saving) return;
    ed.classList.remove("on");
    editId = null;
    chip.focus({ preventScroll: true });
  }

  /* Bật/tắt trạng thái "đang lưu": khóa ô nhập và các nút */
  function setSaving(v) {
    saving = v;
    inp.disabled = v;
    bCancel.disabled = v;
    bSave.disabled = v;
    bSave.textContent = v ? "Đang lưu…" : "Lưu";
    ed.setAttribute("aria-busy", v ? "true" : "false");
  }

  /* Kiểm tra tên rồi gọi StoreLink.rename (chỉ resolve khi dữ liệu đã ghi bền vững) */
  async function save() {
    if (saving) return;
    const v = inp.value.replace(/\s+/g, " ").trim(),
      s = SC.list.find((x) => x.id === editId);
    inp.removeAttribute("aria-invalid");
    err.textContent = "";
    if (!v) return fail("Vui lòng nhập tên cửa hàng.");
    if (v.length > 80) return fail("Tên tối đa 80 ký tự.");
    if (!s) return fail("Cửa hàng này không còn trong danh sách.");
    if (v === s.name) {
      closeEdit();
      return toast("Tên không thay đổi");
    }
    if (typeof SLK.rename !== "function")
      return fail("Chưa tích hợp StoreLink.rename – xem HUONG-DAN-TICH-HOP.md.");
    setSaving(true);
    try {
      const u = await SLK.rename(editId, v);
      setSaving(false);
      closeEdit();
      paint();
      toast("Đã đổi tên thành “" + u.name + "”");
    } catch (e) {
      setSaving(false);
      fail("Không lưu được: " + ((e && e.message) || "lỗi không rõ") + ". Tên cũ vẫn giữ nguyên.");
    }
  }

  /* Click: bấm nền mờ = hủy; bấm nút Lưu/Hủy */
  ed.addEventListener("click", (e) => {
    if (e.target === ed) return closeEdit();
    const a = e.target.closest("[data-a]");
    if (!a) return;
    if (a.dataset.a === "save") save();
    else closeEdit();
  });

  /* Bàn phím: Enter = lưu (bỏ qua khi đang gõ IME tiếng Việt), Esc = hủy, Tab giữ trong hộp thoại */
  ed.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target === inp && !e.isComposing) {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      closeEdit();
    } else if (e.key === "Tab") {
      const f = [inp, bCancel, bSave].filter((x) => !x.disabled);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) (e.preventDefault(), f[f.length - 1].focus());
      else if (!e.shiftKey && i === f.length - 1) (e.preventDefault(), f[0].focus());
    }
  });

  /* Gõ lại thì xóa trạng thái lỗi */
  inp.addEventListener("input", () => {
    if (inp.getAttribute("aria-invalid")) {
      inp.removeAttribute("aria-invalid");
      err.textContent = "";
    }
  });

  /* Thu nhỏ cửa sổ xuống mobile: đóng hộp thoại PC (nav-mobile.js sẽ lo phần của nó) */
  MQ_PC.addEventListener("change", (e) => {
    if (!e.matches && !saving) closeEdit();
  });
})();

/* ===== PC Liquid Lens: giữ & kéo giữa các tab trên thanh #tabs (>720px) ===== */
(() => {
  "use strict";
  const tabs = document.getElementById("tabs");
  if (!tabs) return;
  const btns = [...tabs.querySelectorAll("button[data-t]")];
  if (!btns.length) return;

  const MQ = matchMedia("(min-width:721px)");
  const REFR = window.PC_REFRACT !== false; /* window.PC_REFRACT=false để tắt khúc xạ */
  const FM = 0.2;   /* mức phóng đại icon trong kính */
  const PAD = 24;   /* vùng đệm của filter */
  const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- CSS ---------- */
  const st = document.createElement("style");
  st.textContent = `
.pc-lens{display:none}
@media (min-width:721px){
 #tabs.pc-lq{position:relative;overflow:visible!important;touch-action:none;-webkit-user-select:none;user-select:none}
 #tabs.pc-lq button[data-t].on{background:transparent!important;box-shadow:none!important;border-color:transparent!important}
 .pc-lens{
  --s:0;--pc-bg:rgba(255,255,255,.28);--pc-rim:rgba(255,255,255,.9);--pc-rim2:rgba(255,255,255,.4);
  position:absolute;left:0;top:0;z-index:3;display:block;overflow:hidden;pointer-events:none;border-radius:999px;
  background:var(--pc-bg);
  -webkit-backdrop-filter:blur(calc(8px + 6px*var(--s))) saturate(200%) brightness(1.1);
  backdrop-filter:blur(calc(8px + 6px*var(--s))) saturate(200%) brightness(1.1);
  box-shadow:0 calc(2px + 14px*var(--s)) calc(8px + 24px*var(--s)) rgba(10,14,40,calc(.12 + .14*var(--s))),0 1px 2px rgba(10,14,40,.14);
  will-change:transform,width,height}
 .pc-lens::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  box-shadow:inset 1.5px 1.5px 1px var(--pc-rim),inset -1px -1px 1.5px var(--pc-rim2),inset 0 -2px 4px rgba(10,14,40,.07),
   inset 0 0 0 1px var(--pc-rim2),inset 0 0 calc(8px + 12px*var(--s)) rgba(255,255,255,.4)}
 .pc-lens::before{content:"";position:absolute;z-index:1;left:14%;top:8%;width:32%;height:26%;border-radius:50%;
  background:rgba(255,255,255,.8);-webkit-filter:blur(3px);filter:blur(3px);opacity:calc(.2 + .6*var(--s));pointer-events:none}
 .pc-win{position:absolute;inset:0;overflow:visible}
 .pc-lc{position:absolute;left:0;top:0;pointer-events:none}
 .pc-gh{position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;white-space:nowrap;
  color:var(--ink,currentColor);transition:color .15s}
 .pc-gh[data-hot]{color:var(--acc,#0a84ff)}
}
@media (min-width:721px) and (prefers-color-scheme:dark){
 :root:not([data-theme="light"]) .pc-lens{--pc-bg:rgba(255,255,255,.1);--pc-rim:rgba(255,255,255,.32);--pc-rim2:rgba(255,255,255,.12)}
}
:root[data-theme="dark"] .pc-lens{--pc-bg:rgba(255,255,255,.1);--pc-rim:rgba(255,255,255,.32);--pc-rim2:rgba(255,255,255,.12)}
@media (prefers-reduced-transparency:reduce){.pc-lens{-webkit-backdrop-filter:none;backdrop-filter:none;background:var(--pc-bg)}}`;
  document.head.appendChild(st);

  /* ---------- dựng viên kính: lens > win (filter khúc xạ) > lc (bản sao tab phóng đại) ---------- */
  if (getComputedStyle(tabs).position === "static") tabs.style.position = "relative";
  const lens = document.createElement("div"); lens.className = "pc-lens"; lens.setAttribute("aria-hidden", "true");
  const win = document.createElement("div"); win.className = "pc-win";
  const lc = document.createElement("div"); lc.className = "pc-lc";
  const ghosts = btns.map((b) => {
    const g = document.createElement("div");
    g.className = "pc-gh";
    g.innerHTML = b.innerHTML;
    lc.appendChild(g);
    return g;
  });
  win.appendChild(lc); lens.appendChild(win); tabs.appendChild(lens);
  tabs.classList.add("pc-lq");

  /* ---------- SVG filter khúc xạ (displacement map theo từng kích thước tab) ---------- */
  const XL = "http://www.w3.org/1999/xlink";
  let flt = null, fe = null, dm = null, mapCur = -1, MXc = 1, lastFW = 0, lastFH = 0;
  const mapCache = new Map();
  function initFilter() {
    if (flt) return;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    svg.innerHTML =
      '<filter id="pcRefr" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feImage result="m" preserveAspectRatio="none"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="m" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
    document.body.appendChild(svg);
    flt = svg.querySelector("filter"); fe = svg.querySelector("feImage"); dm = svg.querySelector("feDisplacementMap");
    [flt, fe].forEach((el) => { el.setAttribute("x", -PAD); el.setAttribute("y", -PAD); });
  }
  function buildMap(w, h) {
    const cw = Math.round(w + 2 * PAD), ch = Math.round(h + 2 * PAD);
    const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const img = ctx.createImageData(cw, ch), px = img.data;
    const hw = w / 2, hh = h / 2, r = Math.min(hh, hw), edgeW = Math.min(16, h * 0.38);
    const ax = new Float32Array(cw * ch), ay = new Float32Array(cw * ch);
    let mx = 1e-6;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const rx = x + 0.5 - cw / 2, ry = y + 0.5 - ch / 2;
      const qx = Math.abs(rx) - (hw - r), qy = Math.abs(ry) - (hh - r);
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
      const t = clamp(-sd / edgeW, 0, 1);
      const wgt = Math.pow(1 - t, 2.2) * 1.5;
      const i = y * cw + x, dx = rx * FM * wgt, dy = ry * FM * wgt;
      ax[i] = dx; ay[i] = dy; mx = Math.max(mx, Math.abs(dx), Math.abs(dy));
    }
    for (let i = 0; i < cw * ch; i++) {
      const j = i * 4;
      px[j] = Math.round(127.5 + (127.5 * ax[i]) / mx);
      px[j + 1] = Math.round(127.5 + (127.5 * ay[i]) / mx);
      px[j + 2] = 128; px[j + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return { url: cv.toDataURL("image/png"), mx };
  }
  function mapFor(i) {
    const c = G.cells[i], key = Math.round(c.w) + "x" + Math.round(c.h);
    if (!mapCache.has(key)) mapCache.set(key, buildMap(c.w, c.h));
    return mapCache.get(key);
  }
  function useMap(i) {
    if (!REFR || !G || mapCur === i) return;
    const m = mapFor(i);
    if (!m) return;
    initFilter();
    mapCur = i; MXc = m.mx;
    fe.setAttribute("href", m.url);
    fe.setAttributeNS(XL, "xlink:href", m.url);
  }

  /* ---------- hình học: đo theo vị trí thật của các nút ---------- */
  let G = null;
  function measure() {
    const tr = tabs.getBoundingClientRect();
    if (!tr.width || !MQ.matches) return (G = null);
    const ox = tr.left + tabs.clientLeft - tabs.scrollLeft, oy = tr.top + tabs.clientTop - tabs.scrollTop;
    const cells = btns.map((b) => {
      const r = b.getBoundingClientRect(), x = r.left - ox, y = r.top - oy;
      return { x, y, w: r.width, h: r.height, cx: x + r.width / 2, cy: y + r.height / 2 };
    });
    lc.style.width = Math.max(tr.width, tabs.scrollWidth) + "px";
    lc.style.height = Math.max(tr.height, tabs.scrollHeight) + "px";
    btns.forEach((b, i) => { /* bản sao copy đúng font của nút thật */
      const c = cells[i], g = ghosts[i], cs = getComputedStyle(b);
      g.style.cssText =
        `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;font-family:${cs.fontFamily};font-size:${cs.fontSize};` +
        `font-weight:${cs.fontWeight};letter-spacing:${cs.letterSpacing};line-height:${cs.lineHeight};text-transform:${cs.textTransform};gap:${cs.columnGap === "normal" ? "6px" : cs.columnGap}`;
    });
    const xs = cells.map((c) => c.cx);
    G = { cells, ox, oy, tr, minX: Math.min(...xs), maxX: Math.max(...xs) };
    mapCur = -1;
    if (REFR) cells.forEach((_, i) => mapFor(i));
    return G;
  }

  /* ---------- vật lý lò xo: vị trí, kích thước, độ phồng ---------- */
  const S = { x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, vw: 0, vh: 0, tx: 0, ty: 0, tw: 0, th: 0, s: 0, vs: 0, ts: 0, raf: 0, last: 0 };
  const K = 340, C = 2 * Math.sqrt(K) * 0.64;
  const KS = 300, CS = 2 * Math.sqrt(KS) * 0.5;
  const pv = [];

  function push() { /* nước bị đẩy: tab bên cạnh trượt ra xa khi kính phồng */
    const s = clamp(S.s, 0, 1);
    G.cells.forEach((c, i) => {
      const dx = c.cx - S.x, d = Math.abs(dx);
      let tx = 0;
      if (s > 0.01 && d > 1) tx = Math.sign(dx) * 6 * Math.pow(clamp(1 - d / (S.w * 1.7), 0, 1), 2) * s;
      const v = tx ? tx.toFixed(2) + "px 0px" : "";
      if (pv[i] !== v) { pv[i] = v; btns[i].style.translate = v; ghosts[i].style.translate = v; }
    });
  }

  const po = [];
  function fade(se) {
    const hw = (S.w * (1 + 0.16 * se)) / 2, hh = (S.h * (1 + 0.3 * se)) / 2;
    G.cells.forEach((c, i) => {
      const ox = clamp((Math.min(S.x + hw, c.x + c.w) - Math.max(S.x - hw, c.x)) / c.w, 0, 1);
      const oy = clamp((Math.min(S.y + hh, c.y + c.h) - Math.max(S.y - hh, c.y)) / c.h, 0, 1);
      const t = clamp((ox * oy - 0.08) / 0.6, 0, 1);
      const op = (1 - t * t * (3 - 2 * t)).toFixed(2);
      if (po[i] !== op) { po[i] = op; btns[i].style.opacity = op; }
    });
  }

  function draw() {
    if (!G || !S.w) return;
    const L = S.x - S.w / 2, T = S.y - S.h / 2;
    const sp = Math.hypot(S.vx, S.vy), stt = Math.min(sp / 2600, 0.3), a = (Math.atan2(S.vy, S.vx) * 180) / Math.PI;
    const se = clamp(S.s, 0, 1.4);
    const defo = stt > 0.004 ? `rotate(${a}deg) scale(${1 + stt},${1 - stt * 0.6}) rotate(${-a}deg) ` : "";
    lens.style.width = S.w + "px"; lens.style.height = S.h + "px";
    lens.style.transform = `translate3d(${L}px,${T}px,0) ${defo}scale(${1 + 0.16 * se},${1 + 0.3 * se})`;
    lens.style.setProperty("--s", clamp(S.s, 0, 1).toFixed(3));
    lc.style.transformOrigin = `${S.x}px ${S.y}px`;
    lc.style.transform = `translate(${-L}px,${-T}px) scale(${1 + FM * se})`;
    if (REFR) {
      let ni = 0, nd = Infinity;
      G.cells.forEach((c, i) => { const d = Math.abs(c.cx - S.x); if (d < nd) { nd = d; ni = i; } });
      useMap(ni);
      if (dm) {
        const on = se > 0.03;
        win.style.filter = on ? "url(#pcRefr)" : "none";
        if (on) {
          const fw = S.w + 2 * PAD, fh = S.h + 2 * PAD;
          if (Math.abs(fw - lastFW) > 0.5 || Math.abs(fh - lastFH) > 0.5) {
            lastFW = fw; lastFH = fh;
            [flt, fe].forEach((el) => { el.setAttribute("width", fw); el.setAttribute("height", fh); });
          }
          dm.setAttribute("scale", (2 * MXc * se).toFixed(2));
        }
      }
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
      S.vw += (K * (S.tw - S.w) - C * S.vw) * h; S.w += S.vw * h;
      S.vh += (K * (S.th - S.h) - C * S.vh) * h; S.h += S.vh * h;
      S.vs += (KS * (S.ts - S.s) - CS * S.vs) * h; S.s += S.vs * h;
    }
    draw();
    const still = Math.abs(S.tx - S.x) < 0.2 && Math.abs(S.ty - S.y) < 0.2 && Math.abs(S.tw - S.w) < 0.2 && Math.abs(S.th - S.h) < 0.2 &&
      Math.hypot(S.vx, S.vy, S.vw, S.vh) < 4 && Math.abs(S.ts - S.s) < 0.003 && Math.abs(S.vs) < 0.02;
    if (still) { snap(); draw(); S.raf = 0; return; }
    S.raf = requestAnimationFrame(frame);
  }
  function snap() {
    S.x = S.tx; S.y = S.ty; S.w = S.tw; S.h = S.th; S.s = S.ts;
    S.vx = S.vy = S.vw = S.vh = S.vs = 0;
  }
  function kick() {
    if (RM()) { snap(); return draw(); }
    if (!S.raf) { S.last = performance.now(); S.raf = requestAnimationFrame(frame); }
  }
  function aim(c, ts) { S.tx = c.cx; S.ty = c.cy; S.tw = c.w; S.th = c.h; S.ts = ts; }

  /* ---------- trạng thái tab ---------- */
  const readActive = () => Math.max(0, btns.findIndex((b) => b.classList.contains("on")));
  let active = readActive(), hot = -1, drag = null, swallow = false, pass = false, swT = 0;

  function setHot(i) {
    if (drag) drag.hot = i;
    if (i === hot) return;
    hot = i;
    ghosts.forEach((g, j) => (j === i ? g.setAttribute("data-hot", "") : g.removeAttribute("data-hot")));
  }
  function rest(animate) {
    if (!G) return;
    aim(G.cells[active], 0);
    setHot(active);
    if (animate) kick(); else { snap(); draw(); }
  }

  /* ---------- kéo thả ---------- */
  function listen(on) {
    const f = on ? addEventListener : removeEventListener;
    f("pointermove", mv, { passive: false });
    f("pointerup", up);
    f("pointercancel", cancel);
  }
  function near(px) { /* tab chứa con trỏ, hoặc tab gần nhất */
    let b = 0, bd = Infinity;
    G.cells.forEach((c, i) => {
      const d = (px < c.x ? c.x - px : px > c.x + c.w ? px - c.x - c.w : 0) + Math.abs(px - c.cx) * 0.001;
      if (d < bd) { bd = d; b = i; }
    });
    return b;
  }
  function mv(e) {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 4) return;
    drag.moved = true;
    const r = G.tr, px = e.clientX - G.ox, py = e.clientY - G.oy;
    const dx = Math.max(0, r.left - e.clientX, e.clientX - r.right), dy = Math.max(0, r.top - e.clientY, e.clientY - r.bottom);
    if (Math.hypot(dx, dy) > 90) { /* kéo ra xa: hủy */
      if (!drag.out) { drag.out = true; setHot(-1); aim(G.cells[active], 0); kick(); }
      return;
    }
    drag.out = false;
    const b = near(px), c = G.cells[b];
    setHot(b);
    aim(c, 1);
    S.tx = clamp(px + (c.cx - px) * 0.28, G.minX, G.maxX); /* hít nhẹ về tâm tab */
    S.ty = c.cy + clamp((py - c.cy) * 0.25, -8, 8);        /* hơi theo tay theo chiều dọc */
    kick();
  }
  function up(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    listen(false); drag = null;
    swallow = true; clearTimeout(swT); swT = setTimeout(() => (swallow = false), 500);
    if (d.out || d.hot < 0) return rest(true);
    const idx = d.hot;
    aim(G.cells[idx], 0);
    kick();
    const wait = RM() ? 0 : d.moved ? 260 : performance.now() - d.t0 > 250 ? 180 : 90;
    setTimeout(() => { pass = true; try { btns[idx].click(); } finally { pass = false; } }, wait);
  }
  function cancel(e) {
    if (!drag || e.pointerId !== drag.id) return;
    listen(false); drag = null; rest(true);
  }

  tabs.addEventListener("pointerdown", (e) => {
    if (drag || e.button > 0 || !MQ.matches) return;
    const b = e.target.closest("button[data-t]");
    if (!b || !measure()) return;
    const idx = btns.indexOf(b);
    if (idx < 0) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, idx, hot: idx, moved: false, out: false, t0: performance.now() };
    aim(G.cells[idx], 1); /* chạm là phồng ngay */
    setHot(idx);
    kick();
    listen(true);
  });
  tabs.addEventListener("click", (e) => { /* nuốt click gốc, tự bấm sau khi kính rơi vào ô */
    if (pass || !swallow) return;
    swallow = false;
    e.stopImmediatePropagation();
    e.preventDefault();
  }, true);
  tabs.addEventListener("contextmenu", (e) => { if (e.target.closest("button[data-t]")) e.preventDefault(); });

  /* ---------- đồng bộ ---------- */
  const mo = new MutationObserver(() => { /* đổi tab từ nơi khác (phím tắt, nút "Xem cửa hàng"...) */
    const a = readActive();
    if (a === active) return;
    active = a;
    if (!drag && measure()) rest(true);
  });
  btns.forEach((b) => mo.observe(b, { attributes: true, attributeFilter: ["class"] }));

  const relayout = () => { if (!drag && measure()) rest(false); };
  if (window.ResizeObserver) new ResizeObserver(relayout).observe(tabs);
  addEventListener("resize", relayout);
  MQ.addEventListener("change", (e) => {
    if (e.matches) relayout();
    else if (drag) { listen(false); drag = null; }
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  requestAnimationFrame(relayout);
  setTimeout(relayout, 600); /* boot() của store-link chạy bất đồng bộ */
})();