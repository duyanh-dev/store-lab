/* =====================================================================
   edit-dial.js – gom 3 nút (Mặt bằng · Sửa vị trí cửa · Sửa bảng hiệu) vào nút "Chỉnh sửa"
   Nạp SAU script.js / floorplan.js / front-yard.js (và shelf-ui.js, store-link.js).
   - Bấm "Chỉnh sửa": nút thành mũi tên ↑, 3 nút xổ ra lần lượt ngay bên cạnh (trên nút; hết chỗ thì xuống dưới).
   - Bấm mũi tên (hoặc Esc): thu về, nút trở lại "Chỉnh sửa".
   - Nút "Chỉnh sửa" KHÔNG còn bật chế độ chỉnh sửa bố cục (mode = "edit") nữa.
   - Sửa vị trí cửa / Sửa bảng hiệu không còn phụ thuộc mode: bật khi bấm vào mục tương ứng.
   Cần 3 chỗ vá nhỏ ở script.js + front-yard.js (xem edit-dial-patch.md).
   ===================================================================== */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const SV = (d) => `<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ARROW = SV('<path d="M6 15l6-6 6 6"/>').replace('stroke-width="1.8"', 'stroke-width="2.2"');
  const ITEMS = [
    { k: "store", label: "Sửa cửa hàng", ic: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>' },
    { k: "plan", label: "Mặt bằng", ic: '<path d="M4 4h16v16H4zM4 13h9V4M13 13v7M13 17h7"/>' },
    { k: "door", label: "Sửa vị trí cửa", ic: '<path d="M6 21V4.5A1.5 1.5 0 017.5 3h9A1.5 1.5 0 0118 4.5V21M3.5 21h17M14.5 12v.01"/>' },
    { k: "sign", label: "Sửa bảng hiệu", ic: '<rect x="4" y="4.5" width="16" height="9" rx="2"/><path d="M12 13.5V21M8.5 21h7"/>' },
  ];

  /* ---------- CSS ---------- */
  const css = document.createElement("style");
  css.textContent = `
#fpBtn{display:none!important} /* nút Mặt bằng rời rạc cũ: nay nằm trong menu */
#edDial{position:fixed;z-index:8;display:flex;flex-direction:column-reverse;gap:8px;pointer-events:none}
#edDial.down{flex-direction:column}
#edDial[hidden]{display:none}
.ed-it{--i:0;pointer-events:none;display:flex;align-items:center;gap:9px;height:42px;margin:0;padding:0 16px 0 13px;border:0;border-radius:21px;white-space:nowrap;cursor:pointer;
 font:600 14px/1 -apple-system,"SF Pro Text","Segoe UI",system-ui,sans-serif;letter-spacing:-.005em;color:var(--ink,#1d1d1f);touch-action:manipulation;-webkit-tap-highlight-color:transparent;
 background:linear-gradient(160deg,var(--glass2,rgba(255,255,255,.8)),var(--glass,rgba(255,255,255,.5)));
 -webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);
 box-shadow:var(--sh,0 10px 26px rgba(10,14,40,.2)),inset 0 1px 0 var(--edge,rgba(255,255,255,.85)),inset 0 0 0 1px rgba(255,255,255,.3);
 opacity:0;transform:translateY(14px) scale(.9);
 transition:opacity .2s ease,transform .3s cubic-bezier(.2,.9,.25,1.1);transition-delay:calc((3 - var(--i)) * 35ms)}
#edDial.down .ed-it{transform:translateY(-14px) scale(.9)}
#edDial.on .ed-it{opacity:1;transform:none;pointer-events:auto;transition-delay:calc(var(--i) * 70ms)}
.ed-it.on{color:var(--acc,#0a84ff);box-shadow:var(--sh,0 10px 26px rgba(10,14,40,.2)),inset 0 1px 0 var(--edge,rgba(255,255,255,.85)),inset 0 0 0 1.5px var(--acc,#0a84ff)}
.ed-it:active{transform:scale(.96)!important}
.ed-it:focus-visible{outline:2px solid var(--acc,#0a84ff);outline-offset:2px}
.ed-it svg{flex:none;color:var(--acc,#0a84ff)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .ed-it{color:var(--ink,#f5f5f7)}}
:root[data-theme="dark"] .ed-it{color:var(--ink,#f5f5f7)}
@supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){.ed-it{background:var(--field,#f4f4f7)}}
#tools [data-m="edit"].ed-open{display:inline-flex;align-items:center;justify-content:center;color:var(--acc,#0a84ff)}
#tools [data-m="edit"].ed-open svg{pointer-events:none;animation:edPop .28s cubic-bezier(.2,.9,.25,1.2)}
@keyframes edPop{from{transform:translateY(5px) scale(.7);opacity:0}}
@media (prefers-reduced-motion:reduce){.ed-it,#tools [data-m="edit"].ed-open svg{transition:none!important;animation:none!important}}`;
  document.head.appendChild(css);

  /* ---------- DOM ---------- */
  const dd = document.createElement("div");
  dd.id = "edDial";
  dd.hidden = true;
  dd.setAttribute("role", "menu");
  dd.innerHTML = ITEMS.map((it, i) => `<button type="button" class="ed-it" role="menuitem" data-ed="${it.k}" style="--i:${i}">${SV(it.ic)}<span>${it.label}</span></button>`).join("");
  document.body.appendChild(dd);

  /* ---------- trạng thái ---------- */
  let isOpen = false, panel = null, btn = null, hideT = 0, reentry = false;

  function arrow(on) {
    if (!btn) return;
    if (on) {
      if (!btn._ed) {
        btn._ed = { html: btn.innerHTML, title: btn.title, label: btn.getAttribute("aria-label"), minW: btn.style.minWidth };
        btn.style.minWidth = btn.offsetWidth + "px"; /* giữ kích thước nút, không nhảy bố cục */
      }
      btn.innerHTML = ARROW;
      btn.classList.add("ed-open");
      btn.title = "Thu gọn";
      btn.setAttribute("aria-label", "Thu gọn menu chỉnh sửa");
      btn.setAttribute("aria-expanded", "true");
    } else if (btn._ed) {
      const o = btn._ed;
      btn.innerHTML = o.html;
      btn.title = o.title;
      o.label == null ? btn.removeAttribute("aria-label") : btn.setAttribute("aria-label", o.label);
      btn.style.minWidth = o.minW;
      btn.classList.remove("ed-open");
      btn.removeAttribute("aria-expanded");
      btn._ed = null;
    }
  }
  /* đặt menu ngay trên nút (hết chỗ phía trên thì xuống dưới); canh giữa theo nút, không tràn màn hình */
  function place() {
    if (!btn) return;
    const r = btn.getBoundingClientRect(), w = dd.offsetWidth, h = dd.offsetHeight || 160,
      above = r.top > h + 16 || r.top > innerHeight - r.bottom;
    dd.classList.toggle("down", !above);
    dd.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), Math.max(8, innerWidth - w - 8)) + "px";
    if (above) { dd.style.top = "auto"; dd.style.bottom = innerHeight - r.top + 10 + "px"; }
    else { dd.style.bottom = "auto"; dd.style.top = r.bottom + 10 + "px"; }
  }
  function paint() {
    arrow(isOpen);
    const showItems = isOpen && !panel;
    clearTimeout(hideT);
    if (showItems) {
      dd.hidden = false;
      const hasPlan = !!$("#fpBtn button");
      dd.querySelector('[data-ed="plan"]').style.display = hasPlan ? "" : "none";
      dd.querySelector('[data-ed="store"]').classList.toggle("on", editing());
      place();
      requestAnimationFrame(() => dd.classList.add("on")); /* các mục hiện lần lượt nhờ transition-delay */
    } else {
      dd.classList.remove("on");
      hideT = setTimeout(() => { if (!(isOpen && !panel)) dd.hidden = true; }, 450);
    }
  }
  function setOpen(v) {
    if (v === isOpen) return;
    isOpen = v;
    if (!v) panel = null;
    paint();
  }
  const editing = () => typeof mode !== "undefined" && mode === "edit";
  /* bật/tắt chế độ sửa bố cục (kéo thả quầy, thanh #add) bằng chính nút Xem / Chỉnh sửa gốc */
  function toggleStoreEdit() {
    const t = $('#tools [data-m="' + (editing() ? "view" : "edit") + '"]');
    if (!t) return;
    reentry = true;
    t.click();
    reentry = false;
  }
  function setPanel(p) { panel = p; paint(); }

  /* ---------- sự kiện ---------- */
  /* chặn nút "Chỉnh sửa" gốc (nó bật mode = "edit") ở pha capture, thay bằng menu */
  document.addEventListener("click", (e) => {
    if (reentry) return;
    const b = e.target.closest && e.target.closest('#tools [data-m="edit"]');
    if (!b) return;
    e.stopImmediatePropagation(); /* nút này chỉ mở menu; chế độ sửa bố cục bật bằng mục "Sửa cửa hàng" */
    e.preventDefault();
    btn = b;
    setOpen(!isOpen);
  }, true);

  dd.addEventListener("click", (e) => {
    const it = e.target.closest("[data-ed]");
    if (!it) return;
    const k = it.dataset.ed;
    if (k === "store") { toggleStoreEdit(); setOpen(false); } /* vào/thoát sửa bố cục, rồi thu menu */
    else if (k === "plan") { const b = $("#fpBtn button"); if (b) b.click(); } /* mở hộp chọn mặt bằng, menu giữ nguyên */
    else setPanel(k); /* door / sign: bung bảng tương ứng, menu tạm thu để khỏi chồng lên bảng */
  });

  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !isOpen) return;
    if ($("#fmodal.on,#modal.on,#npModal.on,#dmodal.on,#amodal.on")) return;
    panel ? setPanel(null) : setOpen(false); /* Esc: bảng → menu → nút Chỉnh sửa */
  });
  const tabs = $("#tabs");
  if (tabs) tabs.addEventListener("click", () => setOpen(false)); /* đổi tab thì thu menu */
  addEventListener("resize", () => { if (isOpen && !panel) place(); });
  if (window.visualViewport) visualViewport.addEventListener("resize", () => { if (isOpen && !panel) place(); });

  /* API cho 2 bảng (cửa / bảng hiệu) */
  window.EditDial = {
    get open() { return isOpen; },
    get panel() { return panel; },
    closePanel() { setPanel(null); }, /* nút "Thu gọn" trong bảng: về lại 3 nút */
    close() { setOpen(false); },
  };
})();