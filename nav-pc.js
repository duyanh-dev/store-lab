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