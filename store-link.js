/* =====================================================================
   store-link.js – nạp SAU nav-pages.js (đã vá, xem hướng dẫn) và SAU script.js / floorplan.js / shelf-ui.js
   Lớp quản lý nhiều cửa hàng độc lập, KHÔNG sửa logic core:
   - Cửa hàng đang hoạt động (activeId) = khóa ID, không dựa vào tên
   - "Xem cửa hàng": nạp đúng snapshot (hoặc bản nháp chưa lưu) vào cảnh 3D, chuyển sang tab Cửa hàng
   - Nút "Lưu" + modal: lưu vào cửa hàng hiện tại / cửa hàng khác (xác nhận ghi đè) / tạo cửa hàng mới
   - Lưu bền vững bằng IndexedDB (shops · drafts · meta), tự lưu bản nháp, cảnh báo khi rời với thay đổi chưa lưu
   - Nhãn tên cửa hàng kiểu Liquid Glass trong khung 3D (pointer-events:none, không ảnh hưởng camera)
   ===================================================================== */
(() => {
  "use strict";
  if (!window.ShopCore || !window.ShopList) return console.error("store-link: thiếu ShopCore – hãy vá nav-pages.js trước.");
  const SC = window.ShopCore,
    SL = window.ShopList,
    $$ = (s) => document.querySelector(s),
    cl = (o) => JSON.parse(JSON.stringify(o)),
    list = () => SC.list,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    errMsg = (e) => (e && e.name === "QuotaExceededError" ? "Bộ nhớ thiết bị đã đầy." : (e && e.message) || "lỗi không rõ");

  /* ============ 1. INDEXEDDB ============
     shops : toàn bộ bản ghi cửa hàng (kèm snapshot)   key = id
     drafts: bản nháp chưa lưu của từng cửa hàng        key = id
     meta  : {k:"active"|"migrated", v}
     Nâng phiên bản: tăng DBV và thêm khối `if (ev.oldVersion < n)` trong onupgradeneeded – không xóa kho cũ. */
  const DBN = "store-manager-db",
    DBV = 1;
  let dbp = null,
    idbOK = true,
    chain = Promise.resolve();
  function open() {
    if (dbp) return dbp;
    const p = (dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error("Trình duyệt không hỗ trợ IndexedDB."));
      const r = indexedDB.open(DBN, DBV);
      r.onupgradeneeded = (ev) => {
        const d = r.result;
        if (ev.oldVersion < 1) {
          d.createObjectStore("shops", { keyPath: "id" });
          d.createObjectStore("drafts", { keyPath: "id" });
          d.createObjectStore("meta", { keyPath: "k" });
        }
      };
      r.onsuccess = () => {
        r.result.onversionchange = () => r.result.close();
        res(r.result);
      };
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error("Cơ sở dữ liệu đang bị tab khác chặn."));
    }));
    p.catch(() => (dbp = null));
    return p;
  }
  const enqueue = (fn) => (chain = chain.catch(() => {}).then(fn)); /* ghi tuần tự → không ghi chồng nhau */
  async function tx(ops) {
    const d = await open(),
      put = ops.put || [],
      del = ops.del || [],
      names = [...new Set([...put, ...del].map((x) => x[0]))];
    if (!names.length) return;
    return new Promise((res, rej) => {
      const t = d.transaction(names, "readwrite"); /* một giao dịch = ghi trọn vẹn hoặc không ghi gì */
      put.forEach(([s, v]) => t.objectStore(s).put(v));
      del.forEach(([s, k]) => t.objectStore(s).delete(k));
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error("Giao dịch bị hủy."));
    });
  }
  async function rd(store, key) {
    const d = await open();
    return new Promise((res, rej) => {
      const os = d.transaction(store).objectStore(store),
        q = key === undefined ? os.getAll() : os.get(key);
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  }

  /* ============ 2. TRẠNG THÁI ============ */
  let activeId = null,
    baseFp = "",
    dirty = false,
    busy = false,
    ready = false,
    hasDraft = false,
    draftFp = "",
    syncFail = false,
    draftWarned = false,
    timer = 0;
  const written = new Map(); /* id → đối tượng đã ghi xuống IDB (so sánh tham chiếu để chỉ ghi phần đổi) */
  const act = () => list().find((s) => s.id === activeId) || null;
  const lsRaw = (k) => {
    try {
      return localStorage.getItem(k) || "";
    } catch (e) {
      return "";
    }
  };
  /* dấu vân tay của cửa hàng đang chạy: chỉ gồm dữ liệu CẤU HÌNH (không gồm vị trí NPC / khách) */
  function fp() {
    const F = window.FloorPlan,
      plan = F && F.plans.find((p) => p.id === F.id),
      ops = F && F.ops ? F.ops() : null;
    return SL.fnv(
      JSON.stringify([STORE.W, STORE.D, STORE.door, plan ? [plan.id, plan.custom ? plan : 0] : 0, ShelfRegistry.all(), StaffRegistry.all(), TagRegistry.all(), ops && ops.khoDoorLock, lsRaw("store-sign-v1")]),
    );
  }

  /* cửa hàng mới chưa có mô hình → mặc định của hệ thống (DEFAULT_LAYOUT; DEFAULT_STAFF nếu đã thêm 1 dòng vào script.js) */
  function defaultSnap() {
    const F = window.FloorPlan,
      dp = F && F.plans.find((p) => !p.custom),
      ds = typeof DEFAULT_STAFF !== "undefined" ? JSON.parse(DEFAULT_STAFF) : { staff: [], tags: [] };
    return {
      schema: "store-snapshot",
      schemaVersion: 1,
      meta: { capturedAt: new Date().toISOString(), app: "store-manager-v2", source: {} },
      store: { width: 14, depth: 30, doorX: -3.5 },
      floorplan: dp ? { id: dp.id, name: dp.name, custom: false, geometry: null } : null,
      layout: { items: JSON.parse(DEFAULT_LAYOUT) },
      staff: { items: ds.staff },
      tags: ds.tags,
      operations: null,
      simulation: { npcs: [] },
      settings: { sign: { m: 1, s: 1, pos: "yard" } },
    };
  }

  /* nạp một cửa hàng vào cảnh 3D: ưu tiên bản nháp, hỏng thì quay về bản đã lưu, rồi tới mặc định */
  async function applyShop(s, bk) {
    let dr = await rd("drafts", s.id).catch(() => null),
      r = dr ? SC.restore(cl(dr.snapshot), bk) : { ok: false };
    if (!r.ok) {
      dr = null;
      r = SC.restore(cl(s.snapshot || defaultSnap()), bk);
    }
    if (!r.ok) throw new Error(r.E.join(" · "));
    await sleep(120); /* chờ patch bảng hiệu / cửa áp xong rồi mới lấy dấu vân tay */
    hist.length = 0; /* lịch sử hoàn tác của cửa hàng cũ không được áp sang cửa hàng mới */
    fut.length = 0;
    if (typeof updHist === "function") updHist();
    return dr;
  }

  /* ============ 3. GHI DANH SÁCH (nav-pages gọi mỗi khi thêm / sửa / xóa / nhập) ============ */
  window.ShopSync = (l) =>
    enqueue(async () => {
      if (!idbOK) {
        try {
          localStorage.setItem("store-shops-v1", JSON.stringify(l));
        } catch (e) {
          toast("Không lưu được danh sách cửa hàng: " + errMsg(e));
        }
        return;
      }
      const ids = new Set(l.map((s) => s.id)),
        put = [],
        del = [];
      l.forEach((s) => written.get(s.id) !== s && put.push(["shops", s]));
      written.forEach((_, id) => {
        if (!ids.has(id)) del.push(["shops", id], ["drafts", id]);
      });
      try {
        await tx({ put, del });
        syncFail = false;
        put.forEach(([, s]) => written.set(s.id, s));
        del.forEach(([st, id]) => st === "shops" && written.delete(id));
      } catch (e) {
        syncFail = true;
        toast("Không ghi được dữ liệu: " + errMsg(e) + " Dữ liệu vẫn còn trong phiên này – hãy thử lại hoặc xuất JSON.");
      }
      if (activeId && !ids.has(activeId)) {
        activeId = null;
        hasDraft = false;
        draftFp = "";
        tx({ put: [["meta", { k: "active", v: null }]] }).catch(() => {});
      }
      refresh();
    });

  /* ============ 4. BẢN NHÁP + THEO DÕI THAY ĐỔI ============ */
  async function writeDraft(force) {
    if (!ready || (busy && !force) || !activeId || !dirty) return true;
    const f = fp(),
      id = activeId;
    if (f === draftFp) return true;
    try {
      const snap = SC.capture(act());
      await enqueue(() => tx({ put: [["drafts", { id, snapshot: snap, base: baseFp, at: Date.now() }]] }));
      if (id === activeId) {
        draftFp = f;
        hasDraft = true;
      }
      return true;
    } catch (e) {
      if (!draftWarned) {
        draftWarned = true;
        toast("Không tự lưu được bản nháp: " + errMsg(e));
      }
      return false;
    }
  }
  function tick() {
    if (!ready || busy) return;
    let f;
    try {
      f = fp();
    } catch (e) {
      return;
    }
    const d = f !== baseFp;
    if (d !== dirty) {
      dirty = d;
      updUI();
    }
    if (dirty) {
      if (f !== draftFp) {
        clearTimeout(timer);
        timer = setTimeout(() => writeDraft(), 1200);
      }
    } else if (hasDraft && activeId) {
      const id = activeId;
      hasDraft = false;
      draftFp = "";
      enqueue(() => tx({ del: [["drafts", id]] })).catch(() => {});
    }
  }
  setInterval(tick, 1000);
  const flush = () => {
    tick();
    clearTimeout(timer);
    writeDraft();
  };
  document.addEventListener("visibilitychange", () => document.hidden && flush());
  addEventListener("pagehide", flush);
  addEventListener("beforeunload", (e) => {
    if ((ready && dirty && fp() !== draftFp) || syncFail) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  /* ============ 5. GIAO DIỆN: nhãn tên 3D + nút Lưu ============ */
  const css = document.createElement("style");
  css.textContent = `
#slName3d{position:absolute;left:50%;top:calc(var(--sl-top,14px) + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:3;pointer-events:none;
 max-width:min(78vw,520px);display:flex;flex-direction:column;align-items:center;gap:1px;padding:9px 26px 10px;border-radius:26px;color:#1d1d1f;overflow:hidden;
 background:linear-gradient(160deg,rgba(255,255,255,.64),rgba(255,255,255,.26));
 -webkit-backdrop-filter:blur(24px) saturate(1.9);backdrop-filter:blur(24px) saturate(1.9);
 border:1px solid rgba(255,255,255,.7);
 box-shadow:0 10px 30px rgba(20,24,40,.16),inset 0 1px 0 rgba(255,255,255,.9),inset 0 -1px 0 rgba(255,255,255,.25);transition:box-shadow .3s}
#slName3d::before{content:"";position:absolute;inset:0 0 52% 0;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0));pointer-events:none}
#slName3d .sl-eye{position:relative;font:600 9.5px/1.3 -apple-system,"SF Pro Text","Segoe UI",sans-serif;letter-spacing:.16em;opacity:.55}
#slName3d b{position:relative;max-width:100%;font:650 clamp(16px,2.4vw,22px)/1.25 -apple-system,"SF Pro Display","Segoe UI",sans-serif;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#slName3d .sl-u{position:relative;display:none;margin-top:2px;font:600 10.5px/1.3 -apple-system,"Segoe UI",sans-serif;color:#b86e00}
#slName3d.dirty .sl-u{display:block}
@media (prefers-color-scheme:dark){#slName3d{color:#f5f5f7;background:linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,.07));border-color:rgba(255,255,255,.24);box-shadow:0 10px 30px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.3)}#slName3d::before{background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,0))}#slName3d .sl-u{color:#ffb340}}
@media (max-width:720px){#slName3d{padding:7px 18px 8px;max-width:64vw}}
#slSave.dirty::after{content:"";width:7px;height:7px;margin-left:6px;border-radius:50%;background:#ff9f0a;display:inline-block}`;
  document.head.appendChild(css);

  /* ===== Modal Lưu / xác nhận: Liquid Glass, bottom-sheet trên điện thoại (chỉ áp cho .sl-m) ===== */
  const mcss = document.createElement("style");
  mcss.textContent = `
#npModal .sl-m{--sl-bg:rgba(248,248,251,.74);--sl-card:rgba(255,255,255,.6);--sl-fill:rgba(120,120,128,.12);--sl-fill2:rgba(120,120,128,.2);--sl-sub:#6c6c72;--sl-acc:var(--acc,#0a84ff);
 position:relative;box-sizing:border-box;display:flex;flex-direction:column;width:min(460px,calc(100vw - 24px));max-height:min(88dvh,740px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:24px 18px 0;text-align:left;color:var(--ink,#1d1d1f);border:0;border-radius:30px;
 background:linear-gradient(180deg,rgba(255,255,255,.6),rgba(255,255,255,0) 110px),var(--sl-bg);
 -webkit-backdrop-filter:blur(30px) saturate(1.9);backdrop-filter:blur(30px) saturate(1.9);
 box-shadow:0 30px 80px rgba(10,12,30,.3),0 2px 8px rgba(10,12,30,.08),inset 0 0 0 1px rgba(255,255,255,.6),inset 0 1px 0 rgba(255,255,255,.95)}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) #npModal .sl-m{--sl-bg:rgba(36,36,40,.74);--sl-card:rgba(255,255,255,.07);--sl-fill:rgba(255,255,255,.1);--sl-fill2:rgba(255,255,255,.18);--sl-sub:#a1a1a8;
 background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 110px),var(--sl-bg);box-shadow:0 30px 80px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.14),inset 0 1px 0 rgba(255,255,255,.25)}}
#npModal.on:has(.sl-m){display:flex;align-items:center;justify-content:center;background:rgba(10,12,24,.3);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#npModal.on .sl-m{animation:slPop .3s cubic-bezier(.2,.9,.2,1)}
@keyframes slPop{from{opacity:0;transform:translateY(12px) scale(.97)}}
@keyframes slSheet{from{transform:translateY(100%)}}
@keyframes slFade{from{opacity:0;transform:translateY(-4px)}}
.sl-m [hidden]{display:none!important}
.sl-m h2{margin:0 42px 4px 0;font:700 21px/1.25 -apple-system,"SF Pro Display","Segoe UI",sans-serif;letter-spacing:-.02em}
.sl-m .sub{margin:0 0 14px;font-size:13px;line-height:1.45;color:var(--sl-sub)}
.sl-m .x{position:absolute;top:14px;right:14px;display:grid;place-items:center;width:32px;height:32px;padding:0;border:0;border-radius:50%;background:var(--sl-fill);color:var(--sl-sub);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.sl-m .x:active{transform:scale(.92);background:var(--sl-fill2)}

/* lựa chọn dạng thẻ */
.sl-m .np-opt{display:flex;align-items:flex-start;gap:12px;margin:0 0 8px;padding:13px 14px;border-radius:18px;background:var(--sl-card);box-shadow:inset 0 0 0 1px rgba(120,120,128,.16);cursor:pointer;transition:background .2s,box-shadow .2s;-webkit-tap-highlight-color:transparent}
.sl-m .np-opt:has(input:checked){background:rgba(10,132,255,.12);box-shadow:inset 0 0 0 1.5px var(--sl-acc)}
.sl-m .np-opt:has(input:disabled){opacity:.45;cursor:not-allowed}
.sl-m .np-opt>span{flex:1;min-width:0}
.sl-m .np-opt b{display:block;font-size:14px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}
.sl-m .np-opt small{display:block;margin-top:2px;font-size:12px;font-weight:400;line-height:1.4;color:var(--sl-sub)}
.sl-m .np-opt input{-webkit-appearance:none;appearance:none;flex:none;display:grid;place-items:center;width:22px;height:22px;margin:1px 0 0;border-radius:50%;background:transparent;box-shadow:inset 0 0 0 1.5px rgba(120,120,128,.5);transition:background .15s,box-shadow .15s}
.sl-m .np-opt input::after{content:"";width:8px;height:8px;border-radius:50%;background:#fff;transform:scale(0);transition:transform .15s}
.sl-m .np-opt input:checked{background:var(--sl-acc);box-shadow:none}
.sl-m .np-opt input:checked::after{transform:scale(1)}
.sl-m .np-opt input[type=checkbox]{border-radius:7px}
.sl-m .np-opt input[type=checkbox]::after{width:5px;height:10px;margin-top:-2px;border-radius:0;background:none;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg) scale(0)}
.sl-m .np-opt input[type=checkbox]:checked::after{transform:rotate(45deg) scale(1)}

/* ô nhập + chọn */
#slOther,#slNew{margin:-2px 0 10px;animation:slFade .22s ease}
.sl-m .ctl{display:block;box-sizing:border-box;width:100%;height:46px;padding:0 14px;border:0;border-radius:14px;background-color:var(--sl-fill);color:inherit;font:15px -apple-system,"Segoe UI",sans-serif;outline:none;box-shadow:none;transition:background-color .15s,box-shadow .15s}
.sl-m .ctl::placeholder{color:var(--sl-sub)}
.sl-m .ctl:focus{background-color:var(--sl-fill2);box-shadow:0 0 0 2px var(--sl-acc)}
.sl-m select.ctl{-webkit-appearance:none;appearance:none;padding-right:38px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center;background-size:15px}

/* tóm tắt + kết quả */
.sl-m .np-kv{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:12px 0 0;padding:12px 14px;border-radius:16px;background:var(--sl-fill);font-size:13px;line-height:1.45}
.sl-m .np-kv em{font-style:normal;color:var(--sl-sub);white-space:nowrap}
.sl-m .np-kv span{min-width:0;overflow-wrap:anywhere}
.sl-m .np-res:empty{display:none}
.sl-m .np-res>div{margin-top:10px;padding:12px 14px;border-radius:14px;font-size:13px;line-height:1.5;animation:slFade .22s ease}
.sl-m .np-res .ok{background:rgba(52,199,89,.15);color:#1d7a38}
.sl-m .np-res .err{background:rgba(255,69,58,.13);color:#c4281e}
.sl-m .np-res .sub{margin:10px 0 0;background:var(--sl-fill);color:var(--sl-sub)}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .sl-m .np-res .ok{color:#6fe08c}:root:not([data-theme="light"]) .sl-m .np-res .err{color:#ff8a80}}

/* hộp xác nhận */
.sl-m .np-confirm{text-align:center;padding:4px 2px 0}
.sl-m .np-confirm .np-ico{display:grid;place-items:center;width:56px;height:56px;margin:0 auto 12px;border-radius:18px;background:rgba(255,159,10,.15);color:#ff9f0a}
.sl-m .np-confirm h2{margin:0 0 6px}
.sl-m .np-confirm p{margin:0;font-size:13.5px;line-height:1.5;color:var(--sl-sub)}

/* thanh nút: dính đáy, kính mờ */
.sl-m .np-foot{position:sticky;bottom:0;z-index:2;display:flex;gap:10px;margin:14px -18px 0;padding:14px 18px calc(16px + env(safe-area-inset-bottom,0px));background:linear-gradient(180deg,rgba(255,255,255,0),var(--sl-bg) 34%);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.sl-m .np-foot .btn{flex:1 1 0;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:0;height:46px;padding:0 14px;border-radius:999px;font-size:14.5px;font-weight:600;white-space:nowrap;touch-action:manipulation}
.sl-m .np-foot .btn:not(.pri){background:var(--sl-fill);color:inherit;box-shadow:none}
.sl-m .np-foot .btn.red{color:#ff453a}
.sl-m .np-foot .btn.pri{box-shadow:0 8px 20px rgba(10,132,255,.32)}
.sl-m .np-foot .btn:active{transform:scale(.97)}
.sl-m .np-foot .btn:disabled{opacity:.5}
.sl-m .np-foot.sl-4{display:grid;grid-template-columns:1fr 1fr}
.sl-m .np-foot.sl-4 .pri{grid-column:1/-1;order:-1}

/* điện thoại: bottom sheet */
@media(max-width:720px){
 #npModal.on:has(.sl-m){align-items:flex-end;padding:0}
 #npModal.on .sl-m{width:100%;max-height:90dvh;padding:28px 14px 0;border-radius:28px 28px 0 0;animation:slSheet .34s cubic-bezier(.2,.9,.2,1)}
 .sl-m::before{content:"";position:absolute;top:8px;left:50%;width:38px;height:5px;margin-left:-19px;border-radius:5px;background:rgba(120,120,128,.4)}
 .sl-m h2{font-size:19px}
 .sl-m .x{top:12px;right:12px}
 .sl-m .np-opt{padding:12px;border-radius:16px}
 .sl-m .ctl{height:48px;font-size:16px} /* 16px: iOS không tự phóng to khi focus */
 .sl-m .np-foot{margin:12px -14px 0;padding:12px 14px calc(14px + env(safe-area-inset-bottom,0px))}
 .sl-m .np-foot .btn{height:48px}
}
@media(max-width:380px){.sl-m .np-kv{grid-template-columns:1fr;gap:2px}.sl-m .np-kv em{margin-top:6px}}
@media(prefers-reduced-motion:reduce){#npModal.on .sl-m,#slOther,#slNew,.sl-m .np-res>div{animation:none}}`;
  document.head.appendChild(mcss);
  $$("#store").insertAdjacentHTML("beforeend", '<div id="slName3d"><span class="sl-eye"></span><b></b><span class="sl-u">● Chưa lưu</span></div>');
  const sb = document.createElement("button");
  sb.id = "slSave";
  sb.className = "sx-lb"; /* cùng kiểu với nút "Danh sách" của shelf-ui.js */
  sb.title = "Lưu cửa hàng";
  sb.innerHTML = IC("save", 17) + "<span>Lưu</span>";
  sb.addEventListener("click", () => openSave());
  $$("#tools").appendChild(sb); /* thứ tự: Danh sách · Xem/Chỉnh sửa · Lưu */

  function updUI() {
    const a = act(),
      el = $$("#slName3d");
    if (el) {
      el.querySelector(".sl-eye").textContent = a ? "CỬA HÀNG ĐANG MỞ" : "CHƯA CHỌN CỬA HÀNG";
      el.querySelector("b").textContent = a ? a.name : "Mô hình chưa gắn cửa hàng";
      el.classList.toggle("dirty", !!(a && dirty));
    }
    sb.classList.toggle("dirty", dirty);
  }
  const refresh = () => (updUI(), SC.render());
  const goStore = () => {
    const b = $$('#tabs [data-t="store"]');
    if (b) b.click();
  };

  /* ============ 6. MODAL (dùng lại #npModal của nav-pages) ============ */
  const M = $$("#npModal");
  let resolver = null,
    goFn = null;
  const show = (h) => {
    M.innerHTML = `<div class="box np-w np-s sl-m">${h}</div>`;
    M.classList.add("on");
  };
  const hide = () => {
    M.classList.remove("on");
    M.innerHTML = "";
  };
  new MutationObserver(() => {
    if (!M.classList.contains("on") && resolver) {
      const r = resolver;
      resolver = null;
      r("cancel");
    }
  }).observe(M, { attributes: true, attributeFilter: ["class"] });
  /* đang ghi dữ liệu thì không cho đóng modal bằng nền / Esc */
  M.addEventListener("click", (e) => busy && e.target === M && e.stopImmediatePropagation(), true);
  addEventListener("keydown", (e) => busy && e.key === "Escape" && e.stopImmediatePropagation(), true);
  const fmtT = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "—" : d.toLocaleString("vi-VN");
  };
  const msg = (title, body) =>
    show(`<div class="np-confirm"><span class="np-ico">${IC("warn", 28)}</span><h2>${esc(title)}</h2><p>${body}</p></div><div class="np-foot"><button class="btn pri" data-sl="close">Đóng</button></div>`);

  function askDirty() {
    const a = act();
    return new Promise((res) => {
      show(`<div class="np-confirm"><span class="np-ico">${IC("warn", 28)}</span><h2>Có thay đổi chưa lưu</h2><p>“${esc(a.name)}” đang có thay đổi chưa lưu. Bạn muốn làm gì trước khi chuyển cửa hàng?</p></div>
<div class="np-foot sl-4"><button class="btn" data-sl="d-cancel">Hủy</button><button class="btn red" data-sl="d-discard">Bỏ thay đổi</button><button class="btn" data-sl="d-keep">Giữ bản nháp</button><button class="btn pri" data-sl="d-save">Lưu rồi chuyển</button></div>`);
      resolver = res;
    });
  }

  /* ============ 7. XEM CỬA HÀNG ============ */
  async function view(id) {
    if (busy) return;
    const s = list().find((x) => x.id === id);
    if (!s) return toast("Không tìm thấy cửa hàng.");
    if (id === activeId) return goStore(); /* đang mở sẵn: giữ nguyên thay đổi chưa lưu */
    if (activeId && dirty) {
      const c = await askDirty();
      if (c === "cancel") return;
      busy = true;
      try {
        if (c === "save") await doSave({ mode: "cur" });
        else if (c === "keep") {
          if (!(await writeDraft(true))) throw new Error("không ghi được bản nháp");
        } else {
          const old = activeId;
          await enqueue(() => tx({ del: [["drafts", old]] }));
        }
      } catch (e) {
        busy = false;
        return toast("Chưa chuyển cửa hàng: " + errMsg(e));
      }
    }
    busy = true;
    try {
      const dr = await applyShop(s, true);
      await enqueue(() => tx({ put: [["meta", { k: "active", v: id }]] }));
      activeId = id;
      baseFp = dr ? dr.base : fp();
      draftFp = "";
      hasDraft = !!dr;
      dirty = fp() !== baseFp;
      busy = false;
      refresh();
      goStore();
      if (typeof overview === "function") overview();
      toast(dr && dirty ? "Đã mở “" + s.name + "” – khôi phục thay đổi chưa lưu" : "Đang mở: " + s.name);
    } catch (e) {
      busy = false;
      msg("Không mở được cửa hàng", esc(errMsg(e)) + "<br>Cửa hàng đang mở trước đó không bị thay đổi.");
    }
  }

  /* ============ 8. LƯU ============ */
  async function doSave(o) {
    const cur = list();
    let target,
      isNew = false;
    if (o.mode === "new") {
      target = SC.norm({ id: SC.nextId(cur), name: o.name, address: o.address || "", status: "active" });
      isNew = true;
    } else target = cur.find((x) => x.id === (o.mode === "cur" ? activeId : o.target));
    if (!target) throw new Error("Không tìm thấy cửa hàng đích.");
    const snap = SC.capture(target),
      chk = SL.prepareSnap(snap);
    if (chk.E.length) throw new Error("Bản chụp không hợp lệ: " + chk.E[0]);
    const f = fp(),
      upd = { ...target, snapshot: snap, updatedAt: new Date().toISOString() },
      prev = activeId,
      del = [["drafts", upd.id]];
    if (prev && prev !== upd.id) del.push(["drafts", prev]); /* thay đổi chưa lưu đã chuyển sang cửa hàng đích */
    await enqueue(() =>
      tx({
        put: [
          ["shops", upd],
          ["meta", { k: "active", v: upd.id }],
        ],
        del,
      }),
    ); /* chỉ đi tiếp khi IDB báo ghi xong */
    const now = list();
    SC.set(isNew ? [...now, upd] : now.map((x) => (x.id === upd.id ? upd : x)));
    written.set(upd.id, upd);
    activeId = upd.id;
    baseFp = f;
    dirty = false;
    hasDraft = false;
    draftFp = "";
    refresh();
    if (o.exp) SC.exportOne(upd.id);
    return upd;
  }

  function openSave() {
    if (busy) return;
    const a = act(),
      others = list().filter((s) => s.id !== activeId),
      def = a ? "cur" : others.length ? "other" : "new";
    let armed = false;
    show(`<button class="x" data-sl="close" aria-label="Đóng">${IC("x", 14)}</button><h2>Lưu cửa hàng</h2>
<p class="sub">${dirty ? "Có thay đổi chưa lưu." : "Chưa có thay đổi mới."} Mô hình 3D đang mở sẽ được lưu vào nơi bạn chọn.</p>
<label class="np-opt"><input type="radio" name="slm" value="cur"${a ? "" : " disabled"}${def === "cur" ? " checked" : ""}><span><b>Lưu vào cửa hàng hiện tại: ${esc(a ? a.name : "—")}</b><small>Cập nhật đúng cửa hàng này, giữ nguyên ID${a ? " " + esc(a.id) : ""}.</small></span></label>
<label class="np-opt"><input type="radio" name="slm" value="other"${others.length ? "" : " disabled"}${def === "other" ? " checked" : ""}><span><b>Lưu vào cửa hàng khác</b><small>Mô hình của cửa hàng đích sẽ được thay bằng mô hình đang mở.</small></span></label>
<div id="slOther" hidden><select id="slTarget" class="ctl">${others.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} — ${esc(s.id)}${s.snapshot ? "" : " (chưa có mô hình)"}</option>`).join("")}</select></div>
<label class="np-opt"><input type="radio" name="slm" value="new"${def === "new" ? " checked" : ""}><span><b>+ Tạo cửa hàng mới</b><small>Tạo ID mới và lưu mô hình đang mở vào đó.</small></span></label>
<div id="slNew" hidden><input id="slName" class="ctl" placeholder="Tên cửa hàng mới *" maxlength="80"><input id="slAddr" class="ctl" placeholder="Địa chỉ (tuỳ chọn)" maxlength="160" style="margin-top:6px"></div>
<label class="np-opt"><input type="checkbox" id="slExp"><span>Đồng thời tải file JSON sao lưu<small>File dùng đúng dữ liệu vừa lưu.</small></span></label>
<div class="np-kv" id="slInfo"></div><div class="np-res" id="slRes"></div>
<div class="np-foot"><button class="btn" data-sl="close">Hủy</button><button class="btn pri" id="slGo" data-sl="go">${IC("check", 15)}<span>Lưu</span></button></div>`);
    const q = (s) => M.querySelector(s),
      mode = () => (q("input[name=slm]:checked") || {}).value,
      res = (h) => (q("#slRes").innerHTML = h);
    const info = () => {
      const m = mode(),
        t = others.find((s) => s.id === q("#slTarget").value);
      q("#slOther").hidden = m !== "other";
      q("#slNew").hidden = m !== "new";
      q("#slInfo").innerHTML =
        m === "cur"
          ? `<em>Hành động</em><span>Cập nhật cửa hàng đang mở</span><em>Đích</em><span>${esc(a.name)} · ${esc(a.id)}</span>`
          : m === "other"
            ? `<em>Hành động</em><span>Ghi mô hình hiện tại vào cửa hàng khác</span><em>Đích</em><span>${t ? esc(t.name) + " · " + esc(t.id) : "—"}</span>${a ? `<em>Lưu ý</em><span>“${esc(a.name)}” giữ nguyên bản đã lưu; bạn sẽ chuyển sang làm việc trên cửa hàng đích.</span>` : ""}`
            : `<em>Hành động</em><span>Tạo cửa hàng mới</span><em>Đích</em><span>${esc(q("#slName").value.trim() || "(chưa đặt tên)")} · ID mới tự cấp</span>`;
      armed = false;
      q("#slGo span").textContent = "Lưu";
      res("");
    };
    M.querySelector(".box").addEventListener("change", info);
    q("#slName").addEventListener("input", info);
    info();
    goFn = async () => {
      const m = mode(),
        o = { mode: m, exp: q("#slExp").checked };
      if (m === "other") {
        o.target = q("#slTarget").value;
        const t = list().find((s) => s.id === o.target);
        if (!t) return res('<div class="err">Không tìm thấy cửa hàng đích.</div>');
        if (t.snapshot && !armed) {
          armed = true;
          q("#slGo span").textContent = "Ghi đè và lưu";
          return res(`<div class="err"><b>Sẽ ghi đè mô hình của “${esc(t.name)}”.</b><br>Cửa hàng này đã có dữ liệu 3D (lưu lúc ${esc(fmtT(t.snapshot.meta && t.snapshot.meta.capturedAt))}). Dữ liệu cũ sẽ bị thay thế. Bấm “Ghi đè và lưu” để xác nhận.</div>`);
        }
      }
      if (m === "new") {
        o.name = q("#slName").value.trim();
        o.address = q("#slAddr").value.trim();
        if (!o.name) return res('<div class="err">Vui lòng nhập tên cửa hàng mới.</div>');
        if (list().some((s) => SC.sig(s) === SC.sig(o))) return res('<div class="err">Đã có cửa hàng cùng tên và địa chỉ này.</div>');
      }
      busy = true;
      const all = M.querySelectorAll("button,input,select");
      all.forEach((e) => (e.disabled = true));
      res('<div class="sub">Đang lưu…</div>');
      try {
        const u = await doSave(o);
        res(`<div class="ok">Đã lưu vào “${esc(u.name)}” (${esc(u.id)}): ${u.snapshot.layout.items.length} quầy, ${u.snapshot.staff.items.length} nhân viên.</div>`);
        q(".np-foot").innerHTML = '<button class="btn pri" data-sl="close">Xong</button>';
        toast("Đã lưu vào " + u.name);
      } catch (e) {
        res(`<div class="err"><b>Lưu thất bại – dữ liệu cũ vẫn nguyên vẹn:</b><br>${esc(errMsg(e))}<br>Thay đổi hiện tại vẫn còn trong phiên, bạn có thể thử lại.</div>`);
        all.forEach((e2) => (e2.disabled = false));
        info();
      } finally {
        busy = false;
      }
    };
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sl]");
    if (!b || !M.contains(b)) return;
    const a = b.dataset.sl;
    if (a === "close") {
      if (!busy) hide();
    } else if (a === "go") goFn && goFn();
    else if (a.startsWith("d-")) {
      const r = resolver;
      resolver = null;
      hide();
      r && r(a.slice(2));
    }
  });

  /* Đổi tên nhanh (navbar mobile): chỉ đổi trường `name` của đúng ID.
     Không đụng snapshot / ID / bản nháp. Chỉ resolve khi đã ghi bền vững xong; lỗi thì throw. */
  async function rename(id, name) {
    name = String(name == null ? "" : name).replace(/\s+/g, " ").trim();
    if (!name) throw new Error("Tên cửa hàng không được để trống.");
    if (name.length > 80) throw new Error("Tên tối đa 80 ký tự.");
    if (busy) throw new Error("Đang xử lý thao tác khác, hãy thử lại sau giây lát.");
    const cur = list(), s = cur.find((x) => x.id === id);
    if (!s) throw new Error("Không tìm thấy cửa hàng.");
    if (s.name === name) return s;
    if (cur.some((x) => x.id !== id && SL.sig(x) === SL.sig({ name, address: s.address })))
      throw new Error("Đã có cửa hàng cùng tên và địa chỉ này.");
    const upd = { ...s, name, updatedAt: new Date().toISOString() };
    const next = cur.map((x) => (x.id === id ? upd : x));
    if (idbOK) await enqueue(() => tx({ put: [["shops", upd]] }));
    else localStorage.setItem("store-shops-v1", JSON.stringify(next)); /* quá dung lượng → throw */
    SC.set(next);
    written.set(id, upd);
    refresh(); /* cập nhật nhãn #slName3d + danh sách */
    document.dispatchEvent(new CustomEvent("storelink:change"));
    return upd;
  }

  window.StoreLink = { view, openSave, rename, isActive: (id) => id === activeId, get activeId() { return activeId; }, get dirty() { return dirty; } };
  
  /* ============ 9. KHỞI ĐỘNG ============ */
  (async function boot() {
    try {
      await open();
    } catch (e) {
      idbOK = false;
      toast("Thiết bị không cho lưu bền vững (IndexedDB): " + errMsg(e) + " Hãy xuất JSON để sao lưu.");
    }
    if (idbOK) {
      try {
        const [rows, mg, ac] = await Promise.all([rd("shops"), rd("meta", "migrated"), rd("meta", "active")]);
        let src = rows;
        if (!mg) {
          /* lần đầu: chuyển danh sách cũ trong localStorage sang IDB (không xóa bản cũ) */
          if (!rows.length && list().length) {
            src = list();
            await tx({ put: src.map((s) => ["shops", s]) });
          }
          await tx({ put: [["meta", { k: "migrated", v: 1 }]] });
        }
        src = [...src].sort((x, y) => (x.createdAt || "").localeCompare(y.createdAt || "") || x.id.localeCompare(y.id));
        SC.set(src);
        src.forEach((s) => written.set(s.id, s));
        const id = ac && ac.v && src.some((s) => s.id === ac.v) ? ac.v : null;
        if (id) {
          try {
            const dr = await applyShop(src.find((s) => s.id === id), false);
            activeId = id;
            baseFp = dr ? dr.base : fp();
            hasDraft = !!dr;
            if (dr) toast("Đã khôi phục thay đổi chưa lưu của “" + act().name + "”");
          } catch (e) {
            toast("Không mở lại được cửa hàng gần nhất: " + errMsg(e));
          }
        }
      } catch (e) {
        toast("Không đọc được dữ liệu đã lưu: " + errMsg(e));
      }
    }
    if (!baseFp) baseFp = fp();
    dirty = fp() !== baseFp;
    ready = true;
    refresh();
  })();
})();