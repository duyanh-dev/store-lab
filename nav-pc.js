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

/* ===== PC Liquid Lens v4: một lớp tab bị khúc xạ liên tục + nhận dạng ý định kéo ===== */
(() => {
  "use strict";
  const tabs = document.getElementById("tabs");
  if (!tabs) return;
  const btns = [...tabs.querySelectorAll("button[data-t]")];
  if (!btns.length) return;

  const MQ = matchMedia("(min-width:721px)");
  const REFR = window.PC_REFRACT !== false; /* window.PC_REFRACT=false để tắt khúc xạ */
  const F = 0.12, BEND = 1, HALO = 26, CA = 0.1;
  const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let G = null;

  /* ---------- CSS ---------- */
  const st = document.createElement("style");
  st.textContent = `
.pc-lens,.pc-rim,.pc-lc{display:none}
@media (min-width:721px){
 #tabs.pc-lq{position:relative;overflow:visible!important;touch-action:none;-webkit-user-select:none;user-select:none}
 #tabs.pc-lq button[data-t]{color:transparent!important;text-shadow:none!important}
 #tabs.pc-lq button[data-t] *{opacity:0!important}
 #tabs.pc-lq button[data-t].on{background:transparent!important;box-shadow:none!important;border-color:transparent!important}
 .pc-lens,.pc-rim{--s:0;position:absolute;left:0;top:0;display:block;pointer-events:none;border-radius:999px;will-change:transform,width,height}
 .pc-lens{--pc-bg:rgba(255,255,255,.2);--pc-rim:rgba(255,255,255,.9);--pc-rim2:rgba(255,255,255,.4);z-index:1;background:var(--pc-bg);
  box-shadow:0 calc(2px + 14px*var(--s)) calc(8px + 24px*var(--s)) rgba(10,14,40,calc(.12 + .14*var(--s))),0 1px 2px rgba(10,14,40,.14)}
 .pc-rim{--pc-rim:rgba(255,255,255,.9);--pc-rim2:rgba(255,255,255,.4);z-index:3;overflow:hidden}
 .pc-rim::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  box-shadow:inset 2px 2px 1.5px var(--pc-rim),inset -1.5px -1.5px 2px var(--pc-rim2),inset 0 0 0 1px var(--pc-rim2),
   inset 0 0 calc(10px + 14px*var(--s)) rgba(255,255,255,.45)}
 .pc-rim::before{content:"";position:absolute;z-index:1;left:14%;top:8%;width:32%;height:26%;border-radius:50%;
  background:rgba(255,255,255,.8);-webkit-filter:blur(3px);filter:blur(3px);opacity:calc(.2 + .6*var(--s))}
 .pc-lc{display:block;position:absolute;left:0;top:0;z-index:2;pointer-events:none}
 .pc-gh{--t:0;position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;white-space:nowrap;
  color:var(--pc-base,currentColor)}
}
@supports (color:color-mix(in srgb,red 50%,blue)){
 .pc-gh{color:color-mix(in srgb,var(--acc,#0a84ff) calc(var(--t)*100%),var(--pc-base,currentColor))}
}
@supports not (color:color-mix(in srgb,red 50%,blue)){.pc-gh.hot{color:var(--acc,#0a84ff)}}
@media (min-width:721px) and (prefers-color-scheme:dark){
 :root:not([data-theme="light"]) .pc-lens{--pc-bg:rgba(255,255,255,.07);--pc-rim:rgba(255,255,255,.32);--pc-rim2:rgba(255,255,255,.12)}
 :root:not([data-theme="light"]) .pc-rim{--pc-rim:rgba(255,255,255,.32);--pc-rim2:rgba(255,255,255,.12)}
}
:root[data-theme="dark"] .pc-lens{--pc-bg:rgba(255,255,255,.07);--pc-rim:rgba(255,255,255,.32);--pc-rim2:rgba(255,255,255,.12)}
:root[data-theme="dark"] .pc-rim{--pc-rim:rgba(255,255,255,.32);--pc-rim2:rgba(255,255,255,.12)}`;
  document.head.appendChild(st);

  /* ---------- DOM: thân kính · lớp tab khúc xạ · viền kính ---------- */
  if (getComputedStyle(tabs).position === "static") tabs.style.position = "relative";
  const lens = document.createElement("div"); lens.className = "pc-lens"; lens.setAttribute("aria-hidden", "true");
  const rim = document.createElement("div"); rim.className = "pc-rim"; rim.setAttribute("aria-hidden", "true");
  const lc = document.createElement("div"); lc.className = "pc-lc"; lc.setAttribute("aria-hidden", "true");
  const ghosts = btns.map((b) => {
    const g = document.createElement("div");
    g.className = "pc-gh";
    g.innerHTML = b.innerHTML;
    lc.appendChild(g);
    return g;
  });
  tabs.append(lens, lc, rim);
  /* màu chữ gốc của tab (đọc trước khi ẩn nội dung thật) */
  function refreshBase() {
    tabs.classList.remove("pc-lq");
    const ref = btns.find((b) => !b.classList.contains("on")) || btns[0];
    tabs.style.setProperty("--pc-base", getComputedStyle(ref).color);
    tabs.classList.add("pc-lq");
  }
  refreshBase();

  /* ---------- SVG filter ---------- */
  const XL = "http://www.w3.org/1999/xlink";
  let flt = null, fe = null, dms = null, mapCur = -1, mpCur = null;
  const mapCache = new Map();
  function initFilter() {
    if (flt) return;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    const dmap = (r) => `<feDisplacementMap in="SourceGraphic" in2="m" scale="0" xChannelSelector="R" yChannelSelector="G" result="${r}"/>`;
    const ch = (v) => `<feColorMatrix type="matrix" values="${v}"`;
    svg.innerHTML =
      '<filter id="pcRefr" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">' +
      '<feFlood flood-color="rgb(128,128,128)" flood-opacity="1" result="n"/>' +
      '<feImage result="im" preserveAspectRatio="none"/>' +
      '<feMerge result="m"><feMergeNode in="n"/><feMergeNode in="im"/></feMerge>' +
      dmap("dr") + ch("1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0") + ' in="dr" result="r"/>' +
      dmap("dg") + ch("0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0") + ' in="dg" result="g"/>' +
      dmap("db") + ch("0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0") + ' in="db" result="b"/>' +
      '<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter>';
    document.body.appendChild(svg);
    flt = svg.querySelector("filter"); fe = svg.querySelector("feImage");
    dms = [...svg.querySelectorAll("feDisplacementMap")];
  }
  function buildMap(w, h) {
    const cw = Math.round(w + 2 * HALO), ch = Math.round(h + 2 * HALO);
    const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const img = ctx.createImageData(cw, ch), px = img.data;
    const hw = w / 2, hh = h / 2, r = Math.min(hh, hw);
    const edgeIn = Math.min(h * 0.45, 22), amp = Math.min(h * 0.42, 20) * BEND, rc = edgeIn * 0.35, rw = edgeIn * 0.6;
    const sdf = (x, y) => {
      const qx = Math.abs(x) - (hw - r), qy = Math.abs(y) - (hh - r);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    };
    const vx = new Float32Array(cw * ch), vy = new Float32Array(cw * ch);
    let mx = 1e-6;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const rx = x + 0.5 - cw / 2, ry = y + 0.5 - ch / 2, sd = sdf(rx, ry);
      const E = sd <= 0 ? 1 : 1 - sstep(0, HALO, sd);
      let ex = -rx * F * E, ey = -ry * F * E;
      const q = (sd + rc) / rw, b = Math.exp(-q * q) * (sd > 0 ? E : 1);
      if (b > 0.001) {
        const nx = sdf(rx + 0.5, ry) - sdf(rx - 0.5, ry), ny = sdf(rx, ry + 0.5) - sdf(rx, ry - 0.5), nl = Math.hypot(nx, ny) || 1;
        ex += (nx / nl) * amp * b; ey += (ny / nl) * amp * b;
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
    return { url: cv.toDataURL("image/png"), mx, cw, ch, bw: w, bh: h };
  }
  function mapFor(i) {
    const c = G.cells[i], key = Math.round(c.w) + "x" + Math.round(c.h);
    if (!mapCache.has(key)) mapCache.set(key, buildMap(c.w, c.h));
    return mapCache.get(key);
  }
  function useMap(i) { /* dùng map của tab gần nhất rồi co giãn theo kích thước kính hiện tại */
    if (!REFR || !G || mapCur === i) return;
    const m = mapFor(i);
    if (!m) return;
    initFilter();
    mapCur = i; mpCur = m;
    fe.setAttribute("href", m.url);
    fe.setAttributeNS(XL, "xlink:href", m.url);
  }

  /* ---------- hình học ---------- */
  function measure() {
    const tr0 = tabs.getBoundingClientRect();
    if (!tr0.width || !MQ.matches) return (G = null);
    refreshBase();
    const tr = tabs.getBoundingClientRect();
    const ox = tr.left + tabs.clientLeft - tabs.scrollLeft, oy = tr.top + tabs.clientTop - tabs.scrollTop;
    const cells = btns.map((b) => {
      const r = b.getBoundingClientRect(), x = r.left - ox, y = r.top - oy;
      return { x, y, w: r.width, h: r.height, cx: x + r.width / 2, cy: y + r.height / 2 };
    });
    const W = Math.max(tr.width, tabs.scrollWidth), H = Math.max(tr.height, tabs.scrollHeight);
    lc.style.width = W + "px"; lc.style.height = H + "px";
    btns.forEach((b, i) => {
      const c = cells[i], g = ghosts[i], cs = getComputedStyle(b);
      g.style.cssText =
        `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;font-family:${cs.fontFamily};font-size:${cs.fontSize};` +
        `font-weight:${cs.fontWeight};letter-spacing:${cs.letterSpacing};line-height:${cs.lineHeight};text-transform:${cs.textTransform};gap:${cs.columnGap === "normal" ? "6px" : cs.columnGap}`;
    });
    const xs = cells.map((c) => c.cx);
    G = { cells, ox, oy, tr, W, H, minX: Math.min(...xs), maxX: Math.max(...xs), avgW: cells.reduce((a, c) => a + c.w, 0) / cells.length };
    mapCur = -1;
    if (REFR) {
      cells.forEach((_, i) => mapFor(i));
      initFilter();
      flt.setAttribute("x", 0); flt.setAttribute("y", 0); flt.setAttribute("width", W); flt.setAttribute("height", H);
    }
    return G;
  }

  /* ---------- vật lý lò xo ---------- */
  const S = { x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, vw: 0, vh: 0, tx: 0, ty: 0, tw: 0, th: 0, s: 0, vs: 0, ts: 0, raf: 0, last: 0 };
  const K = 340, C = 2 * Math.sqrt(K) * 0.64;
  const KS = 300, CS = 2 * Math.sqrt(KS) * 0.5;
  const tc = [];

  function tint(kx, ky) {
    const hw = (S.w * kx) / 2, hh = (S.h * ky) / 2;
    G.cells.forEach((c, i) => {
      const ox = clamp((Math.min(S.x + hw, c.x + c.w) - Math.max(S.x - hw, c.x)) / c.w, 0, 1);
      const oy = clamp((Math.min(S.y + hh, c.y + c.h) - Math.max(S.y - hh, c.y)) / c.h, 0, 1);
      const t = sstep(0.12, 0.7, ox * oy).toFixed(2);
      if (tc[i] !== t) { tc[i] = t; ghosts[i].style.setProperty("--t", t); }
    });
  }
  function draw() {
    if (!G || !S.w) return;
    const se = clamp(S.s, 0, 1.4), sx = 1 + 0.16 * se, sy = 1 + 0.3 * se;
    const sp = Math.hypot(S.vx, S.vy), stt = Math.min(sp / 2600, 0.3), ang = Math.atan2(S.vy, S.vx);
    const L = S.x - S.w / 2, T = S.y - S.h / 2;
    const defo = stt > 0.004 ? `rotate(${(ang * 180) / Math.PI}deg) scale(${1 + stt},${1 - stt * 0.6}) rotate(${(-ang * 180) / Math.PI}deg) ` : "";
    const tf = `translate3d(${L}px,${T}px,0) ${defo}scale(${sx},${sy})`;
    [lens, rim].forEach((e) => { e.style.width = S.w + "px"; e.style.height = S.h + "px"; e.style.transform = tf; });
    const sv = clamp(S.s, 0, 1).toFixed(3);
    lens.style.setProperty("--s", sv); rim.style.setProperty("--s", sv);
    const c = Math.cos(ang), s_ = Math.sin(ang);
    const ex = stt > 0.004 ? Math.hypot((1 + stt) * c, (1 - stt * 0.6) * s_) : 1;
    const ey = stt > 0.004 ? Math.hypot((1 + stt) * s_, (1 - stt * 0.6) * c) : 1;
    if (REFR) {
      let ni = 0, nd = Infinity;
      G.cells.forEach((cc, i) => { const d = Math.abs(cc.cx - S.x); if (d < nd) { nd = d; ni = i; } });
      useMap(ni);
      if (mpCur && dms) {
        const on = se > 0.03;
        lc.style.filter = on ? "url(#pcRefr)" : "none";
        if (on) {
          const fw = mpCur.cw * (S.w / mpCur.bw) * sx * ex, fh = mpCur.ch * (S.h / mpCur.bh) * sy * ey;
          fe.setAttribute("x", (S.x - fw / 2).toFixed(1)); fe.setAttribute("y", (S.y - fh / 2).toFixed(1));
          fe.setAttribute("width", fw.toFixed(1)); fe.setAttribute("height", fh.toFixed(1));
          const b = 2 * mpCur.mx * se;
          dms[0].setAttribute("scale", (b * (1 + CA)).toFixed(2));
          dms[1].setAttribute("scale", b.toFixed(2));
          dms[2].setAttribute("scale", (b * (1 - CA)).toFixed(2));
        }
      }
    }
    tint(sx * ex, sy * ey);
  }
  function snap() {
    S.x = S.tx; S.y = S.ty; S.w = S.tw; S.h = S.th; S.s = S.ts;
    S.vx = S.vy = S.vw = S.vh = S.vs = 0;
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
    ghosts.forEach((g, j) => g.classList.toggle("hot", j === i));
  }
  function rest(animate) {
    if (!G) return;
    aim(G.cells[active], 0);
    setHot(active);
    if (animate) kick(); else { snap(); draw(); }
  }

  /* ---------- nhận dạng ý định (1 chiều ngang) ---------- */
  function pick(qx, cur) {
    let b = 0, bd = Infinity, cd = Infinity;
    G.cells.forEach((c, i) => {
      const d = Math.abs(c.cx - qx) / c.w;
      if (i === cur) cd = d;
      if (d < bd) { bd = d; b = i; }
    });
    return cur >= 0 && b !== cur && cd - bd < 0.12 ? cur : b;
  }
  function velX(d) {
    const s = d.smp;
    if (s.length < 2) return 0;
    const a = s[0], b = s[s.length - 1], dt = b.t - a.t;
    if (dt < 12 || performance.now() - b.t > 90) return 0;
    return ((b.x - a.x) / dt) * 1000;
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
    const now = performance.now(), r = G.tr, px = e.clientX - G.ox, py = e.clientY - G.oy;
    drag.smp.push({ t: now, x: px });
    while (drag.smp.length > 2 && now - drag.smp[0].t > 120) drag.smp.shift();
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 4) return;
    drag.moved = true;
    const dx = Math.max(0, r.left - e.clientX, e.clientX - r.right), dy = Math.max(0, r.top - e.clientY, e.clientY - r.bottom);
    if (Math.hypot(dx, dy) > 90) {
      if (!drag.out) { drag.out = true; setHot(-1); aim(G.cells[active], 0); kick(); }
      return;
    }
    drag.out = false;
    /* kính bám theo ngón tay/chuột, giữ nguyên chỗ nắm – không hít vào tab nào */
    const rowY = G.cells[0].cy;
    S.tx = clamp(px + drag.ox, G.minX, G.maxX);
    S.ty = rowY + clamp(py + drag.oy - rowY, -8, 8);
    S.ts = 1;
    const b = pick(S.tx + velX(drag) * 0.07, hot);
    setHot(b);
    S.tw = G.cells[b].w; S.th = G.cells[b].h; /* kích thước kính biến hình theo tab đang nhắm */
    kick();
  }
  function up(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    listen(false); drag = null;
    swallow = true; clearTimeout(swT); swT = setTimeout(() => (swallow = false), 500);
    if (d.out || d.hot < 0) return rest(true);
    let idx = d.idx;
    if (d.moved) { /* dừng tay → tab dưới kính; vuốt nhanh → chiếu quán tính */
      const vx = velX(d);
      let q = S.tx;
      if (Math.abs(vx) > 250) q += clamp(vx * 0.14, -G.avgW * 1.6, G.avgW * 1.6);
      idx = pick(q, d.hot);
    }
    aim(G.cells[idx], 0);
    setHot(idx);
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
    const c = G.cells[idx], px = e.clientX - G.ox;
    drag = {
      id: e.pointerId, x0: e.clientX, y0: e.clientY, idx, hot: idx,
      ox: c.cx - px, oy: c.cy - (e.clientY - G.oy), smp: [{ t: performance.now(), x: px }],
      moved: false, out: false, t0: performance.now(),
    };
    aim(c, 1);
    setHot(idx);
    kick();
    listen(true);
  });
  tabs.addEventListener("click", (e) => {
    if (pass || !swallow) return;
    swallow = false;
    e.stopImmediatePropagation();
    e.preventDefault();
  }, true);
  tabs.addEventListener("contextmenu", (e) => { if (e.target.closest("button[data-t]")) e.preventDefault(); });

  /* ---------- đồng bộ ---------- */
  const mo = new MutationObserver(() => {
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
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  requestAnimationFrame(relayout);
  setTimeout(relayout, 600);
})();