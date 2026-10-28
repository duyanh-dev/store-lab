/* =====================================================================
   nav-pages.js – nạp SAU script.js (cần: $, esc, clone, toast, IC, ICONS)
   Thêm 4 mục NAV: Danh sách cửa hàng · Lịch làm việc · Nhân viên mới · Process Card
   - Danh sách cửa hàng: thêm / sửa / xóa (có xác nhận) / xuất JSON / nhập JSON (có kiểm tra)
   - 3 mục còn lại: chỉ có khung giao diện, chưa có logic nghiệp vụ
   Không đụng tới logic core: dùng chính cơ chế #tabs + data-t của script.js.
   ===================================================================== */
(() => {
  "use strict";

  /* ============ 1. LOGIC THUẦN (không phụ thuộc giao diện) ============ */
  const LS_KEY = "store-shops-v1",
    LS_BK = "store-shops-backup-v1",
    FMT = "shop-list",
    VER = 1,
    MAX = 2000,
    STATUS = {
      active: "Đang hoạt động",
      opening: "Sắp khai trương",
      closed: "Tạm đóng",
    },
    TXT = ["name", "address", "phone", "manager", "note"];
  const cl = (o) => JSON.parse(JSON.stringify(o));
  const str = (v) => (v == null ? "" : String(v).trim());
  const sig = (s) => str(s.name).toLowerCase() + "|" + str(s.address).toLowerCase();

  /* chuẩn hóa một bản ghi, GIỮ NGUYÊN mọi trường lạ (ext, v.v.) */
  function norm(s) {
    const o = { ...s };
    o.id = str(s.id);
    TXT.forEach((k) => (o[k] = str(s[k])));
    o.status = STATUS[s.status] ? s.status : "active";
    o.createdAt = str(s.createdAt) || new Date().toISOString();
    o.updatedAt = str(s.updatedAt) || o.createdAt;
    return o;
  }
  function nextId(list) {
    let n = 1,
      c;
    do c = "SHOP_" + String(n++).padStart(3, "0");
    while (list.some((x) => x.id === c));
    return c;
  }
  function pack(list, name) {
    return {
      format: FMT,
      version: VER,
      kind: "shops",
      id: "PKG_" + Date.now().toString(36).toUpperCase(),
      name: name || "Danh sách cửa hàng",
      createdAt: new Date().toISOString(),
      app: "store-manager-v2",
      shops: cl(list),
    };
  }
  /* kiểm tra cấu trúc file nhập – trả {E: lỗi[], W: cảnh báo[], list} ; có lỗi thì không dùng list */
  function validate(p) {
    const E = [],
      W = [];
    if (!p || typeof p !== "object" || Array.isArray(p))
      return { E: ["File không phải đối tượng JSON hợp lệ."], W, list: [] };
    if (p.format !== FMT)
      return {
        E: ['Không phải file danh sách cửa hàng (thiếu format "' + FMT + '").'],
        W,
        list: [],
      };
    if (typeof p.version !== "number" || !isFinite(p.version))
      E.push("Thiếu phiên bản định dạng.");
    else if (p.version > VER)
      E.push("Phiên bản " + p.version + " mới hơn bản này hỗ trợ (tối đa " + VER + ").");
    if (!Array.isArray(p.shops)) {
      E.push("Trường shops phải là một danh sách.");
      return { E, W, list: [] };
    }
    if (p.shops.length > MAX) E.push("Quá nhiều cửa hàng (tối đa " + MAX + ").");
    const seen = new Set(),
      list = [];
    p.shops.forEach((s, i) => {
      const n = "Cửa hàng #" + (i + 1);
      if (!s || typeof s !== "object" || Array.isArray(s))
        return E.push(n + ": không phải đối tượng.");
      if (typeof s.id !== "string" || !s.id.trim()) return E.push(n + ": thiếu ID.");
      if (typeof s.name !== "string" || !s.name.trim())
        return E.push(n + " (" + s.id + "): thiếu tên.");
      for (const k of TXT) {
        const v = s[k];
        if (v != null && typeof v !== "string" && typeof v !== "number")
          return E.push(n + " (" + s.id + '): trường "' + k + '" không hợp lệ.');
      }
      if (s.status != null && !STATUS[s.status])
        W.push(n + " (" + s.id + '): trạng thái "' + s.status + '" lạ, đặt về "Đang hoạt động".');
      const id = s.id.trim();
      if (seen.has(id)) return E.push("ID trùng ngay trong file: " + id);
      seen.add(id);
      list.push(norm(s));
    });
    if (!E.length && !list.length) E.push("File không chứa cửa hàng nào.");
    return { E, W, list };
  }
  /* đếm xung đột giữa danh sách nhập và danh sách hiện có */
  function conflicts(cur, inc) {
    let byId = 0,
      bySame = 0;
    inc.forEach((s) => {
      if (cur.some((x) => x.id === s.id)) byId++;
      else if (cur.some((x) => sig(x) === sig(s))) bySame++;
    });
    return { byId, bySame };
  }
  /* trả danh sách MỚI (không sửa danh sách cũ) + thống kê. dup: newid | skip | overwrite */
  function merge(cur, inc, mode, dup) {
    const st = { added: 0, over: 0, skip: 0, renamed: 0 };
    if (mode === "replace") {
      st.added = inc.length;
      return { out: cl(inc), st };
    }
    const out = cl(cur);
    inc.forEach((raw) => {
      const s = cl(raw);
      let hit = out.findIndex((x) => x.id === s.id);
      if (hit < 0) hit = out.findIndex((x) => sig(x) === sig(s));
      if (hit < 0) {
        out.push(s);
        st.added++;
      } else if (dup === "skip") st.skip++;
      else if (dup === "overwrite") {
        s.updatedAt = new Date().toISOString();
        out[hit] = s;
        st.over++;
      } else {
        s.id = nextId(out);
        out.push(s);
        st.renamed++;
      }
    });
    return { out, st };
  }

  const API = { norm, nextId, pack, validate, conflicts, merge, sig, STATUS };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof document === "undefined") return;
  window.ShopList = API;

  /* ============ 2. DỮ LIỆU + LƯU TRỮ ============ */
  let shops = [];
  try {
    const d = JSON.parse(localStorage.getItem(LS_KEY));
    if (Array.isArray(d)) shops = d.filter((x) => x && x.id && x.name).map(norm);
  } catch (e) {}
  let backup = null;
  try {
    backup = localStorage.getItem(LS_BK);
  } catch (e) {}

  /* ghi thật sự trước, chỉ khi ghi được mới đổi dữ liệu đang dùng → thất bại không làm hỏng gì */
  function commit(list) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(list));
    } catch (e) {
      toast("Không lưu được dữ liệu (bộ nhớ trình duyệt đầy hoặc bị chặn).");
      return false;
    }
    shops = list;
    render();
    return true;
  }

  /* ============ 3. ICON + NAV ============ */
  Object.assign(ICONS, {
    shops:
      '<path d="M4 9l1.5-5h13L20 9M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9M10 20v-5h4v5"/>',
    calendar:
      '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    userplus:
      '<circle cx="10" cy="8.5" r="3.6"/><path d="M3.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M18.5 8v6M15.5 11h6"/>',
    pcard: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M7.5 10h9M7.5 14h5"/>',
    upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 20h14"/>',
    pin: '<path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 10-13 0c0 5.4 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    phone:
      '<path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 005.7 5.7L16 13l4 1.5v3a2 2 0 01-2 2A14 14 0 014.5 6a2 2 0 012-2z"/>',
    user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.7-3.6 3.3-5.5 7-5.5s6.3 1.9 7 5.5"/>',
    warn: '<path d="M12 4l9 16H3zM12 10v4.5M12 17.5v.01"/>',
  });
  /* thứ tự: Cửa hàng, Nhân viên (có sẵn) → 4 mục mới */
  const NAV = [
    ["shops", "Danh sách cửa hàng", "shops"],
    ["sched", "Lịch làm việc", "calendar"],
    ["newstaff", "Nhân viên mới", "userplus"],
    ["procard", "Process Card", "pcard"],
  ];
  const tabs = $("#tabs");
  tabs.insertAdjacentHTML(
    "beforeend",
    NAV.map(
      (n) => `<button data-t="${n[0]}">${IC(n[2], 15)}<span class="nl">${n[1]}</span></button>`,
    ).join(""),
  );

  const PH = {
    sched: ["calendar", "Lịch làm việc", "Khung trang lịch làm việc. Nội dung chi tiết sẽ được bổ sung sau."],
    newstaff: ["userplus", "Nhân viên mới", "Khung trang nhân viên mới. Nội dung chi tiết sẽ được bổ sung sau."],
    procard: ["pcard", "Process Card", "Khung trang Process Card. Nội dung chi tiết sẽ được bổ sung sau."],
  };
  const ph = ([k, t, d]) =>
    `<div class="np-head"><div class="np-ttl"><h2>${t}</h2><p>${d}</p></div></div>
     <div class="ph"><div class="ph-hero"><span class="np-ico">${IC(k, 34)}</span><span class="ph-tag">Đang xây dựng</span><h3>${t}</h3><p>Cấu trúc trang và điều hướng đã sẵn sàng.</p></div>
     <div class="ph-card"><div class="ph-sk"></div><div class="ph-sk"></div><div class="ph-sk"></div></div></div>`;
  const wrapSec = (id, inner) =>
    `<section id="${id}" class="np"><div class="np-scroll"><div class="np-wrap">${inner}</div></div></section>`;
  $("main").insertAdjacentHTML(
    "beforeend",
    wrapSec(
      "shops",
      `<div class="np-head"><div class="np-ttl"><h2>Danh sách cửa hàng<span class="np-cnt" id="shCnt">0</span></h2><p>Quản lý các cửa hàng của bạn.</p></div>
        <div class="np-actions"><button class="btn" data-np="import">${IC("upload", 15)}<span>Nhập JSON</span></button><button class="btn" data-np="export">${IC("download", 15)}<span>Xuất JSON</span></button><button class="btn pri" data-np="add">${IC("plus", 15)}<span>Thêm cửa hàng</span></button></div></div>
       <div id="shBody"></div>`,
    ) + Object.keys(PH).map((k) => wrapSec(k, ph(PH[k]))).join(""),
  );
  document.body.insertAdjacentHTML("beforeend", '<div id="npModal"></div>');

  /* cơ chế điều hướng gốc (onclick của #tabs) lo biến `tab` + tắt 2 trang cũ; ở đây chỉ bật/tắt trang mới */
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-t]");
    if (!b) return;
    const t = b.dataset.t;
    NAV.forEach((n) => $("#" + n[0]).classList.toggle("on", n[0] === t));
    tabs.scrollTo({
      left: b.offsetLeft - (tabs.clientWidth - b.offsetWidth) / 2,
      behavior: "smooth",
    });
  });

  /* ============ 4. HIỂN THỊ DANH SÁCH ============ */
  const fmtD = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("vi-VN");
  };
  const row = (ic, v) =>
    `<li>${IC(ic, 15)}${v ? `<span>${esc(v)}</span>` : '<span class="nil">Chưa cập nhật</span>'}</li>`;
  function render() {
    $("#shCnt").textContent = shops.length;
    $("#shBody").innerHTML = shops.length
      ? `<div class="np-grid">${shops
          .map(
            (s, i) => `<article class="sc st-${s.status}" data-id="${esc(s.id)}" style="--i:${Math.min(i, 12)}">
  <div class="sc-top"><span class="sc-av">${esc((s.name.charAt(0) || "?").toUpperCase())}</span>
    <div class="sc-nm"><b title="${esc(s.name)}">${esc(s.name)}</b><span class="code">${esc(s.id)}</span></div>
    <span class="sc-st"><i></i>${STATUS[s.status]}</span></div>
  <ul class="sc-info">${row("pin", s.address)}${row("phone", s.phone)}${row("user", s.manager)}</ul>
  ${s.note ? `<p class="sc-note">${esc(s.note)}</p>` : ""}
  <div class="sc-meta">Cập nhật ${esc(fmtD(s.updatedAt))}</div>
  <div class="sc-acts"><button class="btn sm" data-np="edit">${IC("edit", 13)}<span>Sửa</span></button><button class="btn sm" data-np="exp1">${IC("download", 13)}<span>Xuất</span></button><button class="btn sm red" data-np="del">${IC("trash", 13)}<span>Xóa</span></button></div>
</article>`,
          )
          .join("")}</div>`
      : `<div class="np-empty"><span class="np-ico">${IC("shops", 36)}</span><h3>Chưa có cửa hàng nào</h3><p>Thêm cửa hàng đầu tiên hoặc nhập danh sách từ file JSON đã xuất trước đó.</p><div class="row"><button class="btn pri" data-np="add">${IC("plus", 15)}<span>Thêm cửa hàng</span></button><button class="btn" data-np="import">${IC("upload", 15)}<span>Nhập JSON</span></button></div></div>`;
  }

  /* ============ 5. CỬA SỔ ============ */
  const M = $("#npModal");
  let pending = null,
    fStatus = "active";
  const openM = (html, cls) => {
    M.innerHTML = `<div class="box np-w ${cls || ""}">${html}</div>`;
    M.classList.add("on");
  };
  const closeM = () => {
    M.classList.remove("on");
    M.innerHTML = "";
    pending = null;
  };
  const X = `<button class="x" data-np="close" aria-label="Đóng">${IC("x", 14)}</button>`;
  const hover = () => matchMedia("(hover:hover)").matches;

  /* ---- Thêm / sửa ---- */
  function openForm(id) {
    const s = id ? shops.find((x) => x.id === id) : null;
    fStatus = s ? s.status : "active";
    const f = (k, l, ph2, ta) =>
      `<label>${l}${ta ? `<textarea class="ctl" data-f="${k}" rows="3" placeholder="${ph2 || ""}">${esc(s ? s[k] : "")}</textarea>` : `<input class="ctl" data-f="${k}" value="${esc(s ? s[k] : "")}" placeholder="${ph2 || ""}">`}</label>`;
    openM(
      `${X}<h2>${s ? "Sửa cửa hàng" : "Thêm cửa hàng"}</h2>${s ? `<p class="sub"><span class="code">${esc(s.id)}</span></p>` : ""}
<div class="nf" data-edit="${s ? esc(s.id) : ""}">
  ${f("name", "Tên cửa hàng *", "VD: Cửa hàng Quận 1")}
  ${f("address", "Địa chỉ", "Số nhà, đường, quận…")}
  <div class="g2">${f("phone", "Điện thoại", "09xx xxx xxx")}${f("manager", "Người quản lý", "Tên người phụ trách")}</div>
  <div><label>Trạng thái</label><div class="seg" id="fSt">${Object.entries(STATUS).map(([k, n]) => `<button type="button" class="${k === fStatus ? "on" : ""}" data-st="${k}">${n}</button>`).join("")}</div></div>
  ${f("note", "Ghi chú", "", 1)}
  <div class="nf-err" id="fErr"></div>
</div>
<div class="np-foot"><button class="btn" data-np="close">Hủy</button><button class="btn pri" data-np="save">${IC("check", 15)}<span>${s ? "Lưu thay đổi" : "Thêm cửa hàng"}</span></button></div>`,
    );
    if (hover()) M.querySelector('[data-f="name"]').focus();
  }
  function saveForm() {
    const box = M.querySelector(".nf"),
      id = box.dataset.edit,
      v = {};
    box.querySelectorAll("[data-f]").forEach((e) => (v[e.dataset.f] = e.value.trim()));
    const err = (m) => ((M.querySelector("#fErr").textContent = m), false);
    if (!v.name) return err("Vui lòng nhập tên cửa hàng.");
    if (shops.some((x) => x.id !== id && sig(x) === sig(v)))
      return err("Đã có cửa hàng cùng tên và địa chỉ này.");
    const now = new Date().toISOString();
    let list;
    if (id) {
      list = shops.map((x) => (x.id === id ? { ...x, ...v, status: fStatus, updatedAt: now } : x));
    } else {
      list = [...shops, norm({ id: nextId(shops), ...v, status: fStatus, createdAt: now, updatedAt: now })];
    }
    if (commit(list)) {
      closeM();
      toast(id ? "Đã lưu thay đổi" : "Đã thêm cửa hàng");
    }
  }

  /* ---- Xóa (có xác nhận) ---- */
  function openDel(id) {
    const s = shops.find((x) => x.id === id);
    if (!s) return;
    openM(
      `<div class="np-confirm"><span class="np-ico">${IC("trash", 28)}</span><h2>Xóa cửa hàng?</h2>
<p>“${esc(s.name)}” (${esc(s.id)}) sẽ bị xóa khỏi danh sách. Bạn nên xuất JSON trước nếu muốn giữ bản sao.</p></div>
<div class="np-foot"><button class="btn" data-np="close">Hủy</button><button class="btn pri" style="background:#ff453a;box-shadow:0 6px 16px rgba(255,69,58,.35)" data-np="delok" data-id="${esc(id)}">${IC("trash", 15)}<span>Xóa</span></button></div>`,
      "np-s",
    );
  }

  /* ---- Xuất ---- */
  function download(name, obj) {
    try {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return true;
    } catch (e) {
      toast("Không tải được file trên thiết bị này.");
      return false;
    }
  }
  const exportAll = () =>
    shops.length
      ? download("danh-sach-cua-hang.json", pack(shops)) && toast("Đã xuất " + shops.length + " cửa hàng")
      : toast("Chưa có cửa hàng để xuất.");
  const exportOne = (id) => {
    const s = shops.find((x) => x.id === id);
    if (s && download(s.id + ".json", pack([s], s.name))) toast("Đã xuất " + s.id);
  };

  /* ---- Nhập ---- */
  function openImport() {
    openM(
      `${X}<h2>Nhập danh sách cửa hàng</h2><p class="sub">Chọn file .json đã xuất từ ứng dụng hoặc dán nội dung JSON.</p>
<label class="np-drop" id="npDrop" for="npFile">${IC("upload", 26)}<b>Chọn file JSON</b><span>hoặc kéo thả vào đây</span></label>
<input type="file" id="npFile" accept=".json,application/json" hidden>
<textarea id="npText" rows="4" placeholder="…hoặc dán nội dung JSON vào đây"></textarea>
<div class="np-row"><button class="btn" data-np="check">Kiểm tra</button><button class="btn" data-np="undo">Hoàn tác lần nhập gần nhất</button></div>
<div class="np-res" id="npRes"></div>`,
    );
  }
  const res = (h) => (M.querySelector("#npRes").innerHTML = h);
  function readFile(f) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return res('<div class="err">File quá lớn (tối đa 5 MB). Dữ liệu hiện tại không bị thay đổi.</div>'), (pending = null);
    const r = new FileReader();
    r.onload = () => {
      M.querySelector("#npText").value = String(r.result || "");
      checkImport();
    };
    r.onerror = () => res('<div class="err">Không đọc được file. Dữ liệu hiện tại không bị thay đổi.</div>');
    r.readAsText(f);
  }
  function checkImport() {
    pending = null;
    let p;
    try {
      p = JSON.parse(M.querySelector("#npText").value.trim());
    } catch (e) {
      return res(`<div class="err">Không đọc được JSON: ${esc(e.message)}<br>Dữ liệu hiện tại không bị thay đổi.</div>`);
    }
    const V = validate(p);
    if (V.E.length)
      return res(`<div class="err"><b>File không hợp lệ – không có gì bị thay đổi:</b><br>${V.E.slice(0, 10).map(esc).join("<br>")}${V.E.length > 10 ? "<br>…" : ""}</div>`);
    pending = V.list;
    const c = conflicts(shops, V.list);
    res(`<div class="ok"><b>${esc(p.name || "Danh sách cửa hàng")}</b> · v${p.version} · ${V.list.length} cửa hàng<br>Trùng ID với dữ liệu hiện có: ${c.byId} · trùng tên + địa chỉ: ${c.bySame}</div>
${V.W.length ? `<div class="sub" style="margin:6px 0">Lưu ý: ${V.W.slice(0, 5).map(esc).join("<br>")}</div>` : ""}
<label class="np-opt"><input type="radio" name="npMode" value="merge" checked><span><b>Gộp</b> – thêm vào danh sách hiện có<small>Giữ nguyên các cửa hàng đang có.</small></span></label>
<label class="np-opt"><input type="radio" name="npMode" value="replace"><span><b>Thay thế</b> – dùng danh sách trong file thay toàn bộ<small>Có thể hoàn tác bằng “Hoàn tác lần nhập gần nhất”.</small></span></label>
<label>Khi trùng ID hoặc trùng cửa hàng (chế độ Gộp)<select id="npDup"><option value="newid">Giữ cả hai – cấp ID mới cho bản nhập</option><option value="skip">Bỏ qua bản nhập</option><option value="overwrite">Ghi đè bản hiện có</option></select></label>
<div class="np-foot" style="margin-top:10px"><button class="btn pri" data-np="apply">${IC("check", 15)}<span>Xác nhận và áp dụng</span></button></div>`);
  }
  function applyImport() {
    if (!pending) return;
    const mode = (M.querySelector("input[name=npMode]:checked") || {}).value,
      dup = M.querySelector("#npDup") ? M.querySelector("#npDup").value : "newid";
    if (!mode) return toast("Hãy chọn chế độ nhập.");
    const snap = JSON.stringify(shops),
      { out, st } = merge(shops, pending, mode, dup);
    if (!commit(out)) return res('<div class="err">Nhập thất bại do không lưu được. Dữ liệu cũ vẫn nguyên vẹn.</div>');
    backup = snap;
    try {
      localStorage.setItem(LS_BK, snap);
    } catch (e) {}
    pending = null;
    res(`<div class="ok">Đã nhập xong: thêm ${st.added}, ghi đè ${st.over}, bỏ qua ${st.skip}, cấp ID mới ${st.renamed}.<br>Có thể bấm “Hoàn tác lần nhập gần nhất”.</div>`);
    toast("Đã nhập danh sách cửa hàng");
  }
  function undoImport() {
    if (!backup) return toast("Chưa có bản sao lưu để hoàn tác.");
    try {
      const old = JSON.parse(backup);
      if (!Array.isArray(old)) throw 0;
      const cur = JSON.stringify(shops);
      if (commit(old.map(norm))) {
        backup = cur; /* bấm lần nữa sẽ làm lại */
        try { localStorage.setItem(LS_BK, cur); } catch (e) {}
        pending = null;
        res('<div class="ok">Đã hoàn tác. Bấm lần nữa để làm lại lần nhập.</div>');
        toast("Đã hoàn tác");
      }
    } catch (e) {
      toast("Bản sao lưu không dùng được.");
    }
  }

  /* ============ 6. SỰ KIỆN ============ */
  const act = {
    add: () => openForm(null),
    import: openImport,
    export: exportAll,
    close: closeM,
    save: saveForm,
    check: checkImport,
    apply: applyImport,
    undo: undoImport,
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-np]");
    if (!b || !(b.closest("#shops") || b.closest("#npModal"))) return;
    const a = b.dataset.np,
      id = (b.closest(".sc") || {}).dataset ? b.closest(".sc").dataset.id : null;
    if (act[a]) return act[a]();
    if (a === "edit") openForm(id);
    if (a === "del") openDel(id);
    if (a === "exp1") exportOne(id);
    if (a === "delok") {
      const rid = b.dataset.id;
      if (commit(shops.filter((x) => x.id !== rid))) {
        closeM();
        toast("Đã xóa cửa hàng");
      }
    }
  });
  M.addEventListener("click", (e) => {
    if (e.target === M) return closeM();
    const s = e.target.closest("[data-st]");
    if (s) {
      fStatus = s.dataset.st;
      M.querySelectorAll("#fSt button").forEach((x) => x.classList.toggle("on", x === s));
    }
  });
  M.addEventListener("change", (e) => {
    if (e.target.id === "npFile") readFile(e.target.files[0]);
  });
  M.addEventListener("dragover", (e) => {
    if (e.target.closest("#npDrop")) {
      e.preventDefault();
      $("#npDrop").classList.add("over");
    }
  });
  M.addEventListener("dragleave", () => {
    const d = $("#npDrop");
    if (d) d.classList.remove("over");
  });
  M.addEventListener("drop", (e) => {
    if (!e.target.closest("#npDrop")) return;
    e.preventDefault();
    $("#npDrop").classList.remove("over");
    readFile(e.dataTransfer.files[0]);
  });
  M.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches(".nf input")) {
      e.preventDefault();
      saveForm();
    }
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && M.classList.contains("on")) closeM();
  });

  render();
})();