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