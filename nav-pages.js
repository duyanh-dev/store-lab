/* =====================================================================
   nav-pages.js – nạp SAU script.js / floorplan.js (cần: $, esc, clone, toast, IC, ICONS)
   Thêm 4 mục NAV: Danh sách cửa hàng · Lịch làm việc · Nhân viên mới · Process Card
   - Danh sách cửa hàng: thêm / sửa / xóa (có xác nhận) / xuất JSON / nhập JSON (có kiểm tra)
   - NÂNG CẤP: "Lưu cửa hàng" chụp toàn bộ trạng thái cửa hàng 3D đang chạy (mặt bằng, tường, cửa,
     quầy, nhân viên, tag, cấu hình vận hành…) vào trường `snapshot` của cửa hàng rồi xuất JSON.
     "Khôi phục" áp snapshot ngược lại vào cửa hàng đang chạy (có hoàn tác).
   - Cùng MỘT định dạng "shop-list" (version 2). File version 1 cũ vẫn nhập được.
   - 3 mục còn lại: chỉ có khung giao diện, chưa có logic nghiệp vụ
   Không đụng tới logic core: dùng chính cơ chế #tabs + data-t của script.js.
   ===================================================================== */
(() => {
  "use strict";

  /* ============ 1. LOGIC THUẦN (không phụ thuộc giao diện) ============ */
  const LS_KEY = "store-shops-v1",
    LS_BK = "store-shops-backup-v1",
    LS_SB = "store-snapshot-backup-v1",
    LS_SIGN = "store-sign-v1",
    FMT = "shop-list",
    VER = 2,
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

  /* chuẩn hóa một bản ghi, GIỮ NGUYÊN mọi trường lạ (ext, snapshot, v.v.) */
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

  /* ---------- 1b. SNAPSHOT: trạng thái cửa hàng 3D đi kèm cửa hàng ----------
     Cấu trúc (schema "store-snapshot" v1):
       meta · store · floorplan{id,name,custom,geometry} · layout.items · goods · staff.items · tags
       operations · simulation.npcs · settings.sign · integrity{algo,hash}                          */
  const SNAP_FMT = "store-snapshot",
    SNAP_VER = 1;
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const p2 = (a) => Array.isArray(a) && a.length === 2 && a.every(isNum);
  const isObj = (o) => o && typeof o === "object" && !Array.isArray(o);
  const gTYPES = () => (typeof TYPES !== "undefined" ? TYPES : null);
  const gBUILD = () => (typeof BUILD !== "undefined" ? BUILD : null);
  const gROLES = () => (typeof ROLES !== "undefined" ? ROLES : null);
  const gFP = () => (typeof window !== "undefined" && window.FloorPlan) || null;
  const DEF_ROUTINE = () => ({ type: "patrol", points: [[3.4, 8], [3.4, -3.8]] });
  const SIGN_DEF = { m: 1, s: 1, pos: "yard" };

  /* mã kiểm tra toàn vẹn (FNV-1a 32 bit) – phát hiện file bị sửa/hỏng, không phải chữ ký bảo mật */
  function fnv(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }
  function inPolyN(p, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i],
        [xj, zj] = poly[j];
      if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  }
  /* sơ đồ mặt bằng tùy biến kèm trong file: kiểm tra nghiêm rồi DỰNG LẠI object (không giữ trường lạ) */
  function cleanPlan(g) {
    const bad = (m) => ({ err: m });
    if (!isObj(g)) return bad("sơ đồ không phải đối tượng.");
    if (typeof g.id !== "string" || !g.id.trim()) return bad("sơ đồ thiếu id.");
    if (!Array.isArray(g.zones) || !g.zones.length || !Array.isArray(g.walls) || !g.walls.length)
      return bad("sơ đồ thiếu zones hoặc walls.");
    const lim = (a) => a.every((v) => Math.abs(v) <= 80);
    const zones = [];
    for (const z of g.zones) {
      if (!isObj(z) || !["shop", "kho", "cold"].includes(z.k) || !Array.isArray(z.poly) || z.poly.length < 3 || !z.poly.every(p2) || !z.poly.every(lim))
        return bad("khu vực không hợp lệ.");
      zones.push({ n: str(z.n) || z.k, k: z.k, lp: p2(z.lp) ? [z.lp[0], z.lp[1]] : [z.poly[0][0], z.poly[0][1]], poly: z.poly.map((p) => [p[0], p[1]]) });
    }
    if (zones[0].k !== "shop") return bad("khu vực đầu tiên phải là khu trưng bày.");
    const walls = [];
    for (const w of g.walls) {
      if (!isObj(w) || !p2(w.a) || !p2(w.b) || !lim(w.a) || !lim(w.b)) return bad("tường không hợp lệ.");
      if (Math.abs(w.a[1] - w.b[1]) > 1e-6 && Math.abs(w.a[0] - w.b[0]) > 1e-6) return bad("tường phải song song trục x hoặc z.");
      if (typeof w.key !== "string" || !w.key || w.key.length > 6) return bad("tường thiếu key.");
      const o = { a: [w.a[0], w.a[1]], b: [w.b[0], w.b[1]], key: w.key };
      if (w.glass) o.glass = true;
      if (w.open != null) {
        if (!Array.isArray(w.open)) return bad("open của tường phải là danh sách.");
        o.open = [];
        for (const d of w.open) {
          if (!isObj(d) || !isNum(d.c) || !isNum(d.w) || d.w < 0.3 || d.w > 12 || !["door", "shutter"].includes(d.kind))
            return bad("ô cửa không hợp lệ.");
          o.open.push({ c: d.c, w: d.w, kind: d.kind });
        }
      }
      walls.push(o);
    }
    const fw = walls.find((w) => w.key === "f");
    if (!fw || !fw.open || !fw.open.length) return bad('thiếu tường mặt tiền (key "f") có cửa vào.');
    const plan = { id: g.id.trim(), name: str(g.name) || g.id, desc: str(g.desc), zones, walls, custom: true };
    if (isNum(g.W) && g.W >= 6 && g.W <= 40) plan.W = g.W;
    return { plan };
  }

  /* kiểm tra + chuẩn hóa một snapshot. Trả {E, W, D}: E = lỗi (không dùng được), W = cảnh báo, D = dữ liệu đã sạch */
  function prepareSnap(sn) {
    const E = [],
      W = [],
      D = {},
      TY = gTYPES(),
      BU = gBUILD(),
      RO = gROLES(),
      FP = gFP();
    if (!isObj(sn)) return { E: ["Dữ liệu cửa hàng không phải đối tượng."], W, D };
    if (sn.schema !== SNAP_FMT) E.push('Thiếu schema "' + SNAP_FMT + '".');
    if (!isNum(sn.schemaVersion)) E.push("Thiếu phiên bản schema cửa hàng.");
    else if (sn.schemaVersion > SNAP_VER)
      E.push("Schema cửa hàng v" + sn.schemaVersion + " mới hơn bản này hỗ trợ (tối đa v" + SNAP_VER + ").");
    if (E.length) return { E, W, D };

    if (isObj(sn.integrity) && sn.integrity.hash) {
      const c = { ...sn };
      delete c.integrity;
      if (fnv(JSON.stringify(c)) !== sn.integrity.hash)
        W.push("Mã kiểm tra toàn vẹn không khớp: file có thể đã bị chỉnh sửa hoặc hỏng.");
    }

    /* kích thước + vị trí cửa */
    const st = sn.store;
    if (!isObj(st) || !isNum(st.width) || !isNum(st.depth) || st.width < 4 || st.width > 60 || st.depth < 4 || st.depth > 80)
      E.push("store: thiếu hoặc sai kích thước cửa hàng.");
    else D.store = { width: st.width, depth: st.depth, doorX: isNum(st.doorX) ? st.doorX : null };

    /* mặt bằng */
    if (sn.floorplan != null) {
      const f = sn.floorplan;
      if (!isObj(f) || typeof f.id !== "string" || !f.id) E.push("floorplan: thiếu id mặt bằng.");
      else {
        const local = FP && FP.plans.find((p) => p.id === f.id);
        if (local && (!local.custom || !f.geometry)) D.plan = { id: f.id, geometry: null };
        else if (f.geometry) {
          const r = cleanPlan(f.geometry);
          if (r.err) W.push('Sơ đồ mặt bằng "' + f.id + '": ' + r.err + " Sẽ giữ mặt bằng hiện tại.");
          else if (r.plan.id !== f.id) W.push("Sơ đồ mặt bằng có id không khớp, sẽ giữ mặt bằng hiện tại.");
          else D.plan = { id: f.id, geometry: r.plan };
        } else W.push('Mặt bằng "' + f.id + '" không có trong bản này và file không kèm sơ đồ – giữ mặt bằng hiện tại.');
      }
    }

    /* quầy / vật thể */
    const codes = new Set();
    if (!isObj(sn.layout) || !Array.isArray(sn.layout.items)) E.push("layout.items phải là danh sách.");
    else if (sn.layout.items.length > MAX) E.push("Quá nhiều quầy (tối đa " + MAX + ").");
    else {
      D.items = [];
      const hw = D.store ? D.store.width / 2 - 0.7 : 99,
        hd = D.store ? D.store.depth / 2 - 0.7 : 99;
      let clamped = 0;
      sn.layout.items.forEach((it, i) => {
        const n = "Quầy #" + (i + 1) + (it && it.code ? " (" + it.code + ")" : "");
        if (!isObj(it) || typeof it.code !== "string" || !it.code.trim()) return E.push(n + ": thiếu mã.");
        if (codes.has(it.code)) return E.push("Mã quầy trùng trong file: " + it.code);
        codes.add(it.code);
        if (!TY || !TY[it.type] || !BU || typeof BU[it.type] !== "function")
          return E.push(n + ': loại quầy không hỗ trợ "' + it.type + '".');
        if (!p2(it.pos) || !p2(it.size) || !it.size.every((x) => x > 0 && x <= 12))
          return E.push(n + ": vị trí/kích thước không hợp lệ.");
        if (it.rot != null && !isNum(it.rot)) return E.push(n + ": góc xoay không hợp lệ.");
        const x = Math.max(-hw, Math.min(hw, it.pos[0])),
          z = Math.max(-hd, Math.min(hd, it.pos[1]));
        if (x !== it.pos[0] || z !== it.pos[1]) clamped++;
        D.items.push({
          ...it,
          code: it.code,
          name: str(it.name) || TY[it.type][0],
          type: it.type,
          sides: it.sides === 2 ? 2 : 1,
          pos: [x, z],
          rot: isNum(it.rot) ? it.rot : 0,
          size: [it.size[0], it.size[1]],
          details: isObj(it.details) ? it.details : {},
        });
      });
      if (clamped) W.push(clamped + " quầy nằm ngoài cửa hàng, sẽ được kéo vào trong.");
      /* quầy nằm ngoài mọi khu vực của mặt bằng */
      const zs = D.plan && D.plan.geometry ? D.plan.geometry.zones : FP && D.plan ? (FP.plans.find((p) => p.id === D.plan.id) || {}).zones : null;
      if (zs) {
        const out = D.items.filter((it) => !zs.some((z) => inPolyN(it.pos, z.poly))).length;
        if (out) W.push(out + " quầy nằm ngoài các khu vực của mặt bằng, hãy dời lại sau khi khôi phục.");
      }
    }

    /* hàng hóa: tham chiếu về quầy */
    if (isObj(sn.goods) && Array.isArray(sn.goods.byShelf)) {
      const miss = sn.goods.byShelf.filter((g) => g && !codes.has(g.shelf)).length;
      if (miss) W.push("goods tham chiếu " + miss + " quầy không có trong layout (bỏ qua).");
    }

    /* tag + nhân viên */
    if (!Array.isArray(sn.tags)) E.push("tags phải là danh sách.");
    else {
      const seen = new Set();
      D.tags = [];
      sn.tags.forEach((t, i) => {
        if (!isObj(t) || typeof t.code !== "string" || !t.code) return E.push("Tag #" + (i + 1) + ": thiếu mã.");
        if (seen.has(t.code)) return E.push("Mã tag trùng trong file: " + t.code);
        seen.add(t.code);
        D.tags.push({
          code: t.code,
          icon: str(t.icon) || "tag",
          name: str(t.name) || "Tag",
          color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : "#0a84ff",
          desc: str(t.desc),
        });
      });
    }
    if (!isObj(sn.staff) || !Array.isArray(sn.staff.items)) E.push("staff.items phải là danh sách.");
    else if (sn.staff.items.length > 500) E.push("Quá nhiều nhân viên (tối đa 500).");
    else {
      const seen = new Set(),
        tagSet = new Set((D.tags || []).map((t) => t.code));
      let dropT = 0,
        fixR = 0;
      D.staff = [];
      sn.staff.items.forEach((s, i) => {
        const n = "Nhân viên #" + (i + 1) + (s && s.code ? " (" + s.code + ")" : "");
        if (!isObj(s) || typeof s.code !== "string" || !s.code) return E.push(n + ": thiếu mã.");
        if (seen.has(s.code)) return E.push("Mã nhân viên trùng trong file: " + s.code);
        seen.add(s.code);
        if (!RO || !RO[s.role]) return E.push(n + ': chức vụ không hợp lệ "' + s.role + '".');
        const tags = (Array.isArray(s.tags) ? s.tags.map(String) : []).filter((c) => {
          if (tagSet.has(c)) return true;
          dropT++;
          return false;
        });
        let r = isObj(s.routine) && typeof s.routine.type === "string" ? cl(s.routine) : DEF_ROUTINE();
        if (r.type === "station" && !codes.has(r.code)) (r = DEF_ROUTINE()), fixR++;
        if (r.type === "patrol" && !(Array.isArray(r.points) && r.points.length && r.points.every(p2))) (r = DEF_ROUTINE()), fixR++;
        D.staff.push({
          ...s,
          name: str(s.name) || "(chưa đặt tên)",
          tags,
          look: isObj(s.look) ? s.look : {},
          ext: isObj(s.ext) ? s.ext : {},
          routine: r,
        });
      });
      if (dropT) W.push(dropT + " tham chiếu tag không tồn tại, đã bỏ.");
      if (fixR) W.push(fixR + " nhân viên có lộ trình tham chiếu quầy/điểm không hợp lệ, đặt về lộ trình tuần tra mặc định.");
    }

    /* vận hành + mô phỏng + cài đặt hiển thị */
    const op = sn.operations;
    D.lock = isObj(op) && ["open", "closed"].includes(op.khoDoorLock) ? op.khoDoorLock : null;
    D.npcs = [];
    if (isObj(sn.simulation) && Array.isArray(sn.simulation.npcs))
      sn.simulation.npcs.forEach((q) => {
        if (isObj(q) && typeof q.code === "string" && isNum(q.x) && isNum(q.z))
          D.npcs.push({ code: q.code, x: q.x, z: q.z, ry: isNum(q.ry) ? q.ry : 0, i: Number.isInteger(q.i) ? q.i : null });
      });
    if (isObj(sn.settings)) {
      const g = sn.settings.sign;
      D.sign =
        isObj(g) && isNum(g.m) && isNum(g.s) && ["yard", "roof", "top"].includes(g.pos)
          ? { m: Math.min(2.2, Math.max(0.5, g.m)), s: Math.min(2.2, Math.max(0.5, g.s)), pos: g.pos }
          : { ...SIGN_DEF };
    }
    return { E, W, D };
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
      if (s.snapshot != null) {
        const r = prepareSnap(s.snapshot);
        r.E.forEach((m) => E.push(n + " (" + s.id + ") – dữ liệu cửa hàng 3D: " + m));
        r.W.forEach((m) => W.push(n + " (" + s.id + "): " + m));
        if (r.E.length) return;
      }
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

  const API = { norm, nextId, pack, validate, conflicts, merge, sig, STATUS, prepareSnap, fnv };
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
  if (window.ShopSync) { shops = list; render(); window.ShopSync(list); return true; }
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); }
  catch (e) { toast("Không lưu được dữ liệu (bộ nhớ trình trình duyệt đầy hoặc bị chặn)."); return false; }
  shops = list; render(); return true;
}

  /* ============ 2b. CHỤP / KHÔI PHỤC TRẠNG THÁI CỬA HÀNG 3D ============ */
  const lsJSON = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch (e) {
      return null;
    }
  };
  let liveBackup = null;

  /* chụp toàn bộ trạng thái đang chạy; mọi thứ lấy từ registry/biến thật của hệ thống, không bịa trường */
  function captureSnapshot(shop) {
    if (typeof ShelfRegistry === "undefined" || typeof StaffRegistry === "undefined" || typeof STORE === "undefined")
      throw new Error("Chưa tải xong cửa hàng 3D.");
    const FP = gFP(),
      plan = FP ? FP.plans.find((p) => p.id === FP.id) : null,
      items = ShelfRegistry.all(),
      TY = gTYPES() || {};
    const sn = cl({
      schema: SNAP_FMT,
      schemaVersion: SNAP_VER,
      meta: {
        capturedAt: new Date().toISOString(),
        app: "store-manager-v2",
        source: { shopId: shop ? shop.id : "", shopName: shop ? shop.name : "" },
      },
      store: {
        width: STORE.W,
        depth: STORE.D,
        doorRange: STORE.door,
        doorX: (STORE.door[0] + STORE.door[1]) / 2,
        doorWidth: typeof DOOR_W !== "undefined" ? DOOR_W : STORE.door[1] - STORE.door[0],
        khoRange: STORE.kho,
      },
      floorplan: plan ? { id: plan.id, name: plan.name, custom: !!plan.custom, geometry: plan } : null,
      layout: { items },
      goods: {
        mode: "procedural",
        seedSource: "shelf.code",
        note: "Hàng hóa được dựng theo mã quầy và loại quầy; hệ thống chưa có dữ liệu tồn kho riêng.",
        byShelf: items.map((it) => ({
          shelf: it.code,
          type: it.type,
          category: (TY[it.type] || [])[0] || it.type,
          tiers: (it.details && it.details.soTang) || null,
          sides: it.sides,
        })),
      },
      staff: { items: StaffRegistry.all() },
      tags: typeof TagRegistry !== "undefined" ? TagRegistry.all() : [],
      operations: FP ? FP.ops() : null,
      simulation: {
        note: "Khách hàng và xe trên sân sinh ngẫu nhiên nên không lưu; chỉ lưu vị trí nhân viên.",
        npcs:
          typeof npcs !== "undefined"
            ? npcs.map((n) => ({ code: n.s.code, x: n.g.position.x, z: n.g.position.z, ry: n.g.rotation.y, i: n.i == null ? null : n.i }))
            : [],
      },
      settings: { sign: lsJSON(LS_SIGN) },
    });
    sn.integrity = { algo: "fnv1a-32", hash: fnv(JSON.stringify(sn)) };
    return sn;
  }

  /* bảng hiệu: dùng chính các nút của bảng "Sửa bảng hiệu" (patch bảng hiệu không có API) */
  function setSign(sg) {
    const p = document.querySelector("#signp");
    if (!p || !sg) return;
    ["m", "s"].forEach((k) => {
      const want = Math.round(sg[k] * 100);
      for (let g = 0; g < 30; g++) {
        const bt = p.querySelector('[data-k="' + k + '"]');
        if (!bt) return;
        const cur = parseInt(bt.parentNode.querySelector("b").textContent, 10);
        if (!isFinite(cur) || cur === want) return;
        const step = p.querySelector('[data-k="' + k + '"][data-d="' + (want > cur ? 1 : -1) + '"]');
        if (!step) return;
        step.click();
      }
    });
    const pb = p.querySelector('[data-p="' + sg.pos + '"]');
    if (pb) pb.click();
  }

  /* áp snapshot vào cửa hàng đang chạy. backup=true: lưu bản hiện tại trước để hoàn tác */
  function restoreStore(sn, makeBackup) {
    const V = prepareSnap(sn);
    if (V.E.length) return { ok: false, E: V.E, W: V.W };
    const D = V.D,
      FP = gFP();
    if (typeof window.commit !== "function") return { ok: false, E: ["Không tìm thấy hàm nạp dữ liệu của cửa hàng 3D."], W: [] };
    let before = null;
    if (makeBackup) {
      try {
        before = captureSnapshot(null);
        liveBackup = before;
        try {
          localStorage.setItem(LS_SB, JSON.stringify(before));
        } catch (e) {}
      } catch (e) {}
    }
    const prevPlan = FP ? FP.id : null;
    try {
      if (typeof pushHist === "function") pushHist(); /* Ctrl+Z trong chế độ chỉnh sửa vẫn hoàn tác được bố cục */
      if (FP && D.plan) {
        if (D.plan.geometry) {
          const i = FP.plans.findIndex((p) => p.id === D.plan.id);
          if (i >= 0) FP.plans[i] = D.plan.geometry;
          else FP.plans.push(D.plan.geometry);
        }
        FP.apply(D.plan.id);
      }
      if (D.store && D.store.doorX != null && typeof window.moveDoor === "function") window.moveDoor(D.store.doorX);
      window.commit(D.items, D.staff, D.tags);
      /* mô phỏng: đặt lại vị trí nhân viên ngay trong cùng nhịp, trước khung hình kế tiếp */
      if (typeof npcs !== "undefined")
        D.npcs.forEach((q) => {
          const n = npcs.find((x) => x.s.code === q.code);
          if (!n) return;
          n.g.position.x = q.x;
          n.g.position.z = q.z;
          n.g.rotation.y = q.ry;
          if (q.i != null) n.i = q.i;
          delete n.mi;
        });
      if (typeof window.khoDoor === "function") window.khoDoor(D.lock);
      if (D.sign) setSign(D.sign);
    } catch (err) {
      try { /* hoàn lại bản trước khi lỗi */
        if (before) {
          if (FP && prevPlan) FP.apply(prevPlan);
          window.commit(before.layout.items, before.staff.items, before.tags);
        }
      } catch (e) {}
      return { ok: false, E: ["Lỗi khi khôi phục, đã hoàn lại dữ liệu cũ: " + (err && err.message)], W: [] };
    }
    return { ok: true, W: V.W, D };
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
    save: '<path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/>',
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
      `<div class="np-sheet">
  <div class="np-bar">
    <div class="np-ttl"><h2>Danh sách cửa hàng<span class="np-cnt" id="shCnt">0</span></h2>
      <p>Quản lý các cửa hàng của bạn. Bấm “Lưu cửa hàng” để lưu toàn bộ cửa hàng 3D đang chạy và xuất file JSON.</p></div>
    <div class="np-actions">
      <div class="np-pair">
        <button class="btn" data-np="import">${IC("upload", 15)}<span>Nhập JSON</span></button>
        <button class="btn" data-np="export">${IC("download", 15)}<span>Xuất JSON</span></button>
      </div>
      <button class="btn pri" data-np="add">${IC("plus", 15)}<span>Thêm cửa hàng</span></button>
    </div>
  </div>
  <div id="shBody"></div>
</div>`,
    ) + Object.keys(PH).map((k) => wrapSec(k, ph(PH[k]))).join(""),
  );
  document.body.insertAdjacentHTML("beforeend", '<div id="npModal"></div>');
  {
    const css = document.createElement("style");
    css.textContent =
      ".sc-acts{flex-wrap:wrap}.sc-snap{display:inline-flex;align-items:center;gap:4px;margin-left:6px;padding:1px 8px;border-radius:999px;background:var(--btn);font-size:11px;white-space:nowrap}" +
      ".np-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:10px 0;font-size:13px;text-align:left}.np-kv em{font-style:normal;color:var(--mute)}";
    document.head.appendChild(css);
  }

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
  const snAt = (s) => (s.snapshot && s.snapshot.meta && s.snapshot.meta.capturedAt) || "";
 function render() {
  $("#shCnt").textContent = shops.length;
  $("#shBody").innerHTML = shops.length
    ? `<div class="np-grid">${shops
        .map(
          (s, i) => `<article class="sc st-${s.status}" data-id="${esc(s.id)}" style="--i:${Math.min(i, 12)}">
  <div class="sc-top">
    <span class="sc-av">${esc((s.name.charAt(0) || "?").toUpperCase())}</span>
    <div class="sc-nm"><b title="${esc(s.name)}">${esc(s.name)}</b><span class="code">${esc(s.id)}</span></div>
    <span class="sc-st">${STATUS[s.status]}</span>
  </div>
  <ul class="sc-info">${row("pin", s.address)}${row("phone", s.phone)}${row("user", s.manager)}</ul>
  ${s.note ? `<p class="sc-note">${esc(s.note)}</p>` : ""}
  <div class="sc-meta"><span>Cập nhật ${esc(fmtD(s.updatedAt))}</span>${s.snapshot ? `<span class="sc-snap" title="Đã lưu cửa hàng 3D">${IC("save", 12)}${esc(fmtD(snAt(s)))}</span>` : ""}${window.StoreLink && StoreLink.isActive(s.id) ? '<span class="sc-snap">Đang mở</span>' : ""}</div>
  <div class="sc-acts">
    <button class="btn pri" data-np="view">${IC("pin", 15)}<span>Xem cửa hàng</span></button>
    <div class="sc-seg">
      <button class="btn sm" data-np="edit">${IC("edit", 14)}<span>Sửa</span></button>
      <button class="btn sm" data-np="exp1">${IC("download", 14)}<span>Xuất</span></button>
      <button class="btn sm red" data-np="del">${IC("trash", 14)}<span>Xóa</span></button>
    </div>
  </div>
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
  <div class="nf-grp">
    ${f("name", "Tên cửa hàng *", "VD: Cửa hàng Quận 1")}
    ${f("address", "Địa chỉ", "Số nhà, đường, quận…")}
    <div class="g2">${f("phone", "Điện thoại", "09xx xxx xxx")}${f("manager", "Người quản lý", "Tên người phụ trách")}</div>
  </div>
  <div><label>Trạng thái</label><div class="seg" id="fSt">${Object.entries(STATUS).map(([k, n]) => `<button type="button" class="${k === fStatus ? "on" : ""}" data-st="${k}">${n}</button>`).join("")}</div></div>
  <div class="nf-grp">${f("note", "Ghi chú", "", 1)}</div>
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
<p>“${esc(s.name)}” (${esc(s.id)}) sẽ bị xóa khỏi danh sách${s.snapshot ? ", kể cả dữ liệu cửa hàng 3D đã lưu" : ""}. Bạn nên xuất JSON trước nếu muốn giữ bản sao.</p></div>
<div class="np-foot"><button class="btn" data-np="close">Hủy</button><button class="btn pri red" data-np="delok" data-id="${esc(id)}">${IC("trash", 15)}<span>Xóa</span></button></div>`,
      "np-s",
    );
  }

  /* ---- Xuất ---- */
  const slug = (t) =>
    String(t || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  const fileName = (s) => (slug(s.name) ? slug(s.name) + "-" : "") + s.id + ".json";
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
    if (s && download(fileName(s), pack([s], s.name))) toast("Đã xuất " + s.id);
  };

  /* ---- LƯU CỬA HÀNG: chụp trạng thái → lưu nội bộ → tải file JSON (cùng luồng pack/download) ---- */
  function saveShop(id) {
    const s = shops.find((x) => x.id === id);
    if (!s) return;
    let snap;
    try {
      snap = captureSnapshot(s);
    } catch (e) {
      return toast("Không chụp được cửa hàng 3D: " + (e && e.message));
    }
    const chk = prepareSnap(snap); /* tự kiểm tra bản vừa chụp, đảm bảo nhập lại được */
    if (chk.E.length) return toast("Bản chụp không hợp lệ: " + chk.E[0]);
    const upd = { ...s, snapshot: snap, updatedAt: new Date().toISOString() };
    if (!commit(shops.map((x) => (x.id === id ? upd : x)))) return;
    if (download(fileName(upd), pack([upd], upd.name)))
      toast("Đã lưu cửa hàng: " + snap.layout.items.length + " quầy, " + snap.staff.items.length + " nhân viên");
  }

  /* ---- KHÔI PHỤC từ snapshot đã lưu ---- */
  function summary(s) {
    const sn = s.snapshot,
      fp = sn.floorplan;
    return `<div class="np-kv"><em>Mặt bằng</em><span>${esc((fp && fp.name) || "—")}</span><em>Kích thước</em><span>${esc(sn.store ? sn.store.width + " × " + sn.store.depth + " m" : "—")}</span><em>Quầy / vật thể</em><span>${sn.layout ? sn.layout.items.length : 0}</span><em>Nhân viên / tag</em><span>${sn.staff ? sn.staff.items.length : 0} / ${(sn.tags || []).length}</span><em>Lưu lúc</em><span>${esc(snAt(s) ? new Date(snAt(s)).toLocaleString("vi-VN") : "—")}</span></div>`;
  }
  function openRestore(id) {
    const s = shops.find((x) => x.id === id);
    if (!s || !s.snapshot) return toast("Cửa hàng này chưa có dữ liệu 3D đã lưu.");
    const V = prepareSnap(s.snapshot);
    openM(
      `${X}<div class="np-confirm"><span class="np-ico">${IC("rotL", 28)}</span><h2>Khôi phục cửa hàng?</h2>
<p>“${esc(s.name)}” (${esc(s.id)}). Cửa hàng 3D đang chạy (mặt bằng, quầy, nhân viên, tag) sẽ được thay bằng bản đã lưu. Bản hiện tại được giữ lại để hoàn tác.</p></div>
${V.E.length ? "" : summary(s)}
<div class="np-res" id="npRes">${V.E.length ? `<div class="err"><b>Không khôi phục được:</b><br>${V.E.slice(0, 8).map(esc).join("<br>")}</div>` : V.W.length ? `<div class="sub">Lưu ý:<br>${V.W.slice(0, 5).map(esc).join("<br>")}</div>` : ""}</div>
<div class="np-foot" id="rsFoot"><button class="btn" data-np="close">Hủy</button>${V.E.length ? "" : `<button class="btn pri" data-np="restok" data-id="${esc(id)}">${IC("check", 15)}<span>Khôi phục</span></button>`}</div>`,
      "np-s",
    );
  }
  function doRestore(id) {
    const s = shops.find((x) => x.id === id);
    if (!s || !s.snapshot) return;
    const r = restoreStore(cl(s.snapshot), true);
    if (!r.ok) return res(`<div class="err"><b>Khôi phục thất bại:</b><br>${r.E.slice(0, 8).map(esc).join("<br>")}</div>`);
    res(`<div class="ok">Đã khôi phục cửa hàng.${r.W.length ? "<br>Lưu ý: " + r.W.slice(0, 4).map(esc).join("<br>") : ""}</div>`);
    const f = M.querySelector("#rsFoot");
    if (f) f.innerHTML = `<button class="btn" data-np="unrestore">${IC("undo", 15)}<span>Hoàn tác khôi phục</span></button><button class="btn pri" data-np="close">Xong</button>`;
    toast("Đã khôi phục cửa hàng");
  }
  function undoRestore() {
    let b = liveBackup;
    if (!b) b = lsJSON(LS_SB);
    if (!b) return toast("Chưa có bản sao lưu để hoàn tác.");
    const r = restoreStore(b, false);
    if (!r.ok) return res(`<div class="err">Không hoàn tác được: ${r.E.map(esc).join("<br>")}</div>`);
    res('<div class="ok">Đã hoàn tác về cửa hàng trước khi khôi phục.</div>');
    const f = M.querySelector("#rsFoot");
    if (f) f.innerHTML = '<button class="btn pri" data-np="close">Xong</button>';
    toast("Đã hoàn tác");
  }

  /* ---- Nhập ---- */
  function openImport() {
    openM(
      `${X}<h2>Nhập danh sách cửa hàng</h2><p class="sub">Chọn file .json đã xuất từ ứng dụng hoặc dán nội dung JSON. File có dữ liệu cửa hàng 3D sẽ có nút “Khôi phục” sau khi nhập.</p>
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
    const c = conflicts(shops, V.list),
      nSnap = V.list.filter((s) => s.snapshot).length;
    res(`<div class="ok"><b>${esc(p.name || "Danh sách cửa hàng")}</b> · v${p.version} · ${V.list.length} cửa hàng${nSnap ? " · " + nSnap + " có dữ liệu cửa hàng 3D" : ""}<br>Trùng ID với dữ liệu hiện có: ${c.byId} · trùng tên + địa chỉ: ${c.bySame}</div>
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
    res(`<div class="ok">Đã nhập xong: thêm ${st.added}, ghi đè ${st.over}, bỏ qua ${st.skip}, cấp ID mới ${st.renamed}.<br>Cửa hàng có dữ liệu 3D sẽ có nút “Khôi phục” trên thẻ. Có thể bấm “Hoàn tác lần nhập gần nhất”.</div>`);
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
    unrestore: undoRestore,
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
    if (a === "save1") saveShop(id);
    if (a === "rest") openRestore(id);
    if (a === "restok") doRestore(b.dataset.id);
    if (a === "delok") {
      const rid = b.dataset.id;
      if (commit(shops.filter((x) => x.id !== rid))) {
        closeM();
        toast("Đã xóa cửa hàng");
      }
    }
    if (a === "view") window.StoreLink && StoreLink.view(id);
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

  window.ShopCore = { get list() { return shops; }, set(l) { shops = l; render(); }, render,
  capture: captureSnapshot, restore: restoreStore, norm, nextId, sig, exportOne };

  render();
})();