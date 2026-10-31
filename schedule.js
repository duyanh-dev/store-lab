/* =====================================================================
   schedule.js – Tab "Lịch làm việc" (nạp SAU script.js và store-link.js, TRƯỚC edit-dial.js)

   NGUYÊN TẮC (không sửa logic core):
   - Nhân viên = chính StaffRegistry của script.js. Thêm / sửa / xóa ở đây sẽ đồng bộ NPC 3D,
     danh sách ở tab Nhân viên và saveStaff() như cũ.
   - Lịch của mỗi người nằm trong staff.ext.sched  →  tự đi theo snapshot cửa hàng, bản nháp,
     xuất / nhập JSON và cảnh báo "chưa lưu" của store-link.js (vì fp() đã gồm StaffRegistry).
   - Cửa hàng đang xem = StoreLink.activeId → đổi cửa hàng thì lịch đổi theo.
   - Chức vụ: STM = role "manager" · ASM = role "deputy" · FT / PT = role "staff" + ext.pos.
   - Dữ liệu ca: staff.ext.sched["YYYY-MM-DD"] = {t:"AM"|"PM"|"OFF"|"C", a:"HH:MM", b:"HH:MM"}
       AM 05:30–13:30 · PM 13:30–21:30 (STM/ASM/FT, cố định 8 giờ) · C = giờ tùy chọn (chỉ PT)
   ===================================================================== */
(() => {
  "use strict";
  if (typeof StaffRegistry === "undefined") return console.error("schedule.js: cần nạp sau script.js");

  /* ---------- Cấu hình ---------- */
  const CFG = {
    /* nơi đặt tab: lấy phần tử đầu tiên khớp. Nếu tab "Làm việc" của nav-pages có id khác, thêm selector vào đây */
    containers: ["#sched .np-wrap", "#workPage", "#page-work", "#schedulePage", "#work", '[data-page="work"]', '[data-page="schedule"]'],
    open: "05:30", close: "21:30",
    AM: ["05:30", "13:30"], PM: ["13:30", "21:30"],
    maxPT: 8, /* PT tối đa giờ / ngày */
    fallbackAfter: 2500, /* ms: không thấy container thì tự tạo nút riêng trên thanh đầu */
  };
  const POS = {
    STM: { n: "Cửa hàng trưởng", o: 0, fixed: true },
    ASM: { n: "Cửa hàng phó", o: 1, fixed: true },
    FT: { n: "Nhân viên Full-time", o: 2, fixed: true },
    PT: { n: "Nhân viên Part-time", o: 3, fixed: false },
  };
  const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  /* ---------- Tiện ích ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const dm = (d) => pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
  const m2 = (t) => { const [h, m] = t.split(":"); return +h * 60 + +m; };
  const t2 = (m) => pad((m / 60) | 0) + ":" + pad(m % 60);
  const mondayOf = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const toast2 = (m) => (typeof toast === "function" ? toast(m) : console.log(m));
  const SLOTS = (m2(CFG.close) - m2(CFG.open)) / 30;
  const slotT = (i) => t2(m2(CFG.open) + i * 30);

  /* ---------- Mô hình dữ liệu (chỉ đọc / ghi staff.ext) ---------- */
  const staffAll = () => StaffRegistry.all();
  const posOf = (s) => (s.role === "manager" ? "STM" : s.role === "deputy" ? "ASM" : s.ext && s.ext.pos === "PT" ? "PT" : "FT");
  function setPos(s, p) {
    s.role = p === "STM" ? "manager" : p === "ASM" ? "deputy" : "staff";
    s.ext = s.ext || {};
    s.ext.pos = p;
  }
  const entry = (s, k) => (s.ext && s.ext.sched && s.ext.sched[k]) || null;
  function setEntry(s, k, e) {
    s.ext = s.ext || {};
    s.ext.sched = s.ext.sched || {};
    if (e) s.ext.sched[k] = e; else delete s.ext.sched[k];
  }
  /* khoảng giờ làm [a,b] hoặc null (nghỉ / chưa xếp) */
  function times(e) {
    if (!e || e.t === "OFF") return null;
    if (e.t === "AM") return CFG.AM;
    if (e.t === "PM") return CFG.PM;
    return e.a && e.b ? [e.a, e.b] : null;
  }
  const hoursOf = (e) => { const t = times(e); return t ? (m2(t[1]) - m2(t[0])) / 60 : 0; };
  const weekKeys = (wk) => DAYS.map((_, i) => ymd(addDays(wk, i)));
  const offCount = (s, keys, except) => keys.filter((k) => k !== except && (entry(s, k) || {}).t === "OFF").length;
  const alCount = (s, keys) => keys.filter((k) => (entry(s, k) || {}).t === "AL").length;
  const MAXOFF = 1; /* STM / ASM / FT: tối đa 1 ngày nghỉ tuần (AL tính riêng) */
  const weekHours = (s, keys) => keys.reduce((a, k) => a + hoursOf(entry(s, k)), 0);
  /* ca ưa thích để "Áp mẫu": STM sáng, ASM chiều, FT xen kẽ */
  function prefOf(s, idx) {
    if (s.ext && (s.ext.pref === "AM" || s.ext.pref === "PM")) return s.ext.pref;
    const p = posOf(s);
    return p === "STM" ? "AM" : p === "ASM" ? "PM" : idx % 2 ? "PM" : "AM";
  }

  /* ---------- Đồng bộ với thế giới 3D / tab Nhân viên của script.js ---------- */
  function world(code, removed) {
    try {
      const i = npcs.findIndex((n) => n.s.code === code);
      let pos = null, rot = 0;
      if (i >= 0) { const o = npcs[i]; pos = o.g.position.clone(); rot = o.g.rotation.y; npcs.splice(i, 1); scene.remove(o.g); disposeChar(o); }
      const s = StaffRegistry.get(code);
      if (s && !removed) { const n = addNpc(s); if (pos) { n.g.position.copy(pos); n.g.rotation.y = rot; } }
      saveStaff();
      renderList();
      if (removed) { if (cur && cur.code === code) { stage.remove(cur.g); disposeChar(cur); cur = null; } showChar((StaffRegistry.all()[0] || {}).code); }
      else if (cur && cur.code === code) showChar(code);
    } catch (e) { console.warn("schedule.js: đồng bộ NPC lỗi", e); }
  }
  /* chỉ ghi lịch: không cần dựng lại NPC */
  const persist = () => { try { saveStaff(); } catch (e) {} };

  /* ---------- Thông tin cửa hàng đang xem ---------- */
  function shop() {
    const L = window.StoreLink, id = L && L.activeId, SCx = window.ShopCore;
    const sh = id && SCx && SCx.list.find((s) => s.id === id);
    return { id, name: sh ? sh.name : null, dirty: !!(L && L.dirty) };
  }

  /* ---------- Trạng thái UI ---------- */
  const st = { wk: mondayOf(new Date()), m: null, sig: "" };
  const root = document.createElement("div");
  root.className = "sch-root";
  root.innerHTML = '<div class="sch-main"></div><div class="sch-ov" hidden></div>';
  const main = root.querySelector(".sch-main"), ov = root.querySelector(".sch-ov");
  const X = '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* ---------- Độ phủ ca của một ngày ---------- */
  function dayInfo(key) {
    const cnt = Array(SLOTS).fill(0), kh = Array(SLOTS).fill(0), who = [];
    staffAll().forEach((s) => {
      const t = times(entry(s, key));
      if (!t) return;
      who.push(s);
      const a = m2(t[0]), b = m2(t[1]), key2 = posOf(s) === "STM" || posOf(s) === "ASM";
      for (let i = 0; i < SLOTS; i++) {
        const x = m2(CFG.open) + i * 30;
        if (x >= a && x < b) { cnt[i]++; if (key2) kh[i]++; }
      }
    });
    const ranges = (f) => { const o = []; let s = -1; f.forEach((v, i) => { if (v && s < 0) s = i; if (!v && s >= 0) { o.push([s, i]); s = -1; } }); if (s >= 0) o.push([s, f.length]); return o; };
    const w = [];
    if (!who.length) w.push(["bad", "Chưa xếp ai"]);
    else {
      ranges(cnt.map((n) => n === 0)).forEach(([a, b]) => w.push(["bad", `Không có người ${slotT(a)}–${slotT(b)}`]));
      ranges(cnt.map((n, i) => n > 0 && kh[i] === 0)).forEach(([a, b]) => w.push(["", `Thiếu STM/ASM ${slotT(a)}–${slotT(b)}`]));
    }
    const am = who.filter((s) => m2(times(entry(s, key))[0]) < m2(CFG.PM[0])).length,
      pm = who.filter((s) => m2(times(entry(s, key))[1]) > m2(CFG.PM[0])).length;
    return { cnt, kh, w, am, pm, n: who.length };
  }

  /* ---------- Vẽ giao diện ---------- */
  function render() {
    const keys = weekKeys(st.wk), sh = shop(), todayK = ymd(new Date()), all = staffAll(),
      tIdx = keys.indexOf(todayK), mob = innerWidth <= 720;
    /* thứ tự cột: trên điện thoại, ngày hôm nay được đưa lên đầu (sát cột tên) để xem ngay */
    let ord = keys.map((_, i) => i);
    if (mob && tIdx > 0) ord = [...ord.slice(tIdx), ...ord.slice(0, tIdx)];
    const list = [...all].sort((a, b) => POS[posOf(a)].o - POS[posOf(b)].o || a.code.localeCompare(b.code));
    const stm = all.filter((s) => posOf(s) === "STM").length, asm = all.filter((s) => posOf(s) === "ASM").length;
    let body = "", last = "", fi = 0; const warns = [];
    list.forEach((s) => {
      const p = posOf(s);
      if (p !== last) { last = p; body += `<tr class="sch-g"><td colspan="9">${POS[p].n} · ${all.filter((x) => posOf(x) === p).length}</td></tr>`; }
      const cells = ord.map((i) => {
        const k = keys[i], e = entry(s, k), t = times(e);
        const c = !e ? "" : e.t === "OFF" ? "off" : e.t === "AL" ? "al" : e.t === "AM" ? "am" : e.t === "PM" ? "pm" : "cu";
        const lb = !e ? "+" : e.t === "OFF" ? "Nghỉ" : e.t === "AL" ? "AL" : e.t === "AM" ? "Sáng" : e.t === "PM" ? "Chiều" : hoursOf(e) + " giờ";
        return `<td class="${i === tIdx ? "today" : ""}"><button class="sch-c ${c}" data-act="cell" data-c="${esc(s.code)}" data-d="${i}">${lb}${t ? `<small>${t[0]}–${t[1]}</small>` : ""}</button></td>`;
      }).join("");
      const h = weekHours(s, keys), fx = POS[p].fixed, oc = offCount(s, keys), ac = alCount(s, keys),
        sub = (fx ? `<small class="${oc > MAXOFF ? "bad" : ""}">Nghỉ ${oc}/${MAXOFF}</small>` : "") + (ac ? `<small>AL ${ac}</small>` : "");
      if (fx) { if (oc > MAXOFF) warns.push(`${s.name}: nghỉ ${oc} ngày (tối đa ${MAXOFF})`); const free = keys.filter((k) => !entry(s, k)).length; if (free) warns.push(`${s.name}: còn ${free} ngày chưa xếp`); }
      body += `<tr><td class="sch-nm"><button class="sch-who" data-act="edit" data-c="${esc(s.code)}"><span class="av rg-${(ROLES[s.role] || ROLES.staff)[1]}">${esc((s.nick || s.name || "?").trim().charAt(0).toUpperCase())}</span><span><b>${esc(s.name)}</b><small><span class="sch-pos">${p}</span>${esc(s.code)}</small></span></button></td>${cells}<td class="sch-hr"><b>${h}</b> giờ${sub}</td></tr>`;
      fi++;
    });
    const cov = ord.map((i) => {
      const k = keys[i];
      const d = dayInfo(k), cells = d.cnt.map((n, j) => `<i class="${n === 0 ? "z" : d.kh[j] === 0 ? "k" : ""}" style="--n:${Math.min(n, 6) / 6}" title="${slotT(j)} · ${n} người"></i>`).join("");
      return `<div class="sch-day${i === tIdx ? " today" : ""}"><h4>${DAYS[i]}${i === tIdx ? ' <em class="sch-tg">Hôm nay</em>' : ""} <small>${dm(addDays(st.wk, i))}</small></h4><div class="sch-strip">${cells}</div>
<div class="sch-axis"><span>${CFG.open}</span><span>${CFG.PM[0]}</span><span>${CFG.close}</span></div>
<div class="sch-sum"><span class="mt">Sáng ${d.am}</span><span class="mt">Chiều ${d.pm}</span><span class="mt">Tổng ${d.n}</span></div>
<ul class="sch-warn">${d.w.length ? d.w.map((w) => `<li class="${w[0]}">${esc(w[1])}</li>`).join("") : '<li class="good">Đủ người, luôn có STM/ASM</li>'}</ul></div>`;
    }).join("");
    const rangeLb = `${dm(st.wk)} – ${dm(addDays(st.wk, 6))}/${addDays(st.wk, 6).getFullYear()}`;
    main.innerHTML = `<div class="sch-top"><h2>Lịch làm việc</h2>
<span class="sch-store${sh.name ? "" : " none"}">${sh.name ? "Cửa hàng: <span>" + esc(sh.name) + "</span>" : "<span>Chưa chọn cửa hàng · đang xem mô hình hiện tại</span>"}</span>
<span class="sch-dirty${sh.dirty ? " on" : ""}">● Chưa lưu cửa hàng</span><span class="sch-sp"></span>
<div class="sch-bar"><button class="btn sm" data-act="tpl">Áp mẫu ca</button><button class="btn sm" data-act="copy">Chép tuần trước</button><button class="btn sm red" data-act="clear">Xóa lịch tuần</button><button class="btn sm" data-act="save">Lưu cửa hàng</button><button class="btn pri sm" data-act="add">+ Thêm nhân viên</button></div></div>
<div class="sch-wk"><button class="btn" data-act="prev" title="Tuần trước">‹</button><b>${rangeLb}</b><button class="btn" data-act="next" title="Tuần sau">›</button><button class="btn sm" data-act="today">Tuần này</button></div>
${list.length ? `<div class="sch-tw"><table class="sch-t"><thead><tr><th class="sch-nm">Nhân viên</th>${ord.map((i) => `<th class="${i === tIdx ? "today" : ""}">${DAYS[i]}<small>${i === tIdx ? "Hôm nay · " : ""}${dm(addDays(st.wk, i))}</small></th>`).join("")}<th class="sch-hr">Giờ/tuần</th></tr></thead><tbody>${body}</tbody></table></div>` : '<div class="sch-tw sch-empty">Cửa hàng này chưa có nhân viên. Bấm “+ Thêm nhân viên”.</div>'}
${warns.length ? `<ul class="sch-warn sch-wk-warn">${warns.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
<h3 class="sch-h3">Độ phủ ca trong tuần</h3><div class="sch-cov">${cov}</div>
<p class="sch-note">STM / ASM / FT làm 8 giờ: ca sáng ${CFG.AM[0]}–${CFG.AM[1]}, ca chiều ${CFG.PM[0]}–${CFG.PM[1]}. PT xếp giờ tự do trong ${CFG.open}–${CFG.close}, tối đa ${CFG.maxPT} giờ/ngày. STM/ASM/FT nghỉ tối đa 1 ngày/tuần (còn lại làm đủ 8 giờ), ngày phép năm đánh dấu AL tính riêng. Lịch từ thứ 2 đến Chủ nhật.${stm > 1 ? " <b>Cảnh báo: có hơn 1 STM.</b>" : ""}${asm > 1 ? " <b>Có hơn 1 ASM.</b>" : ""}${!stm ? " Chưa có STM." : ""} Lịch và nhân viên được lưu cùng cửa hàng khi bấm “Lưu cửa hàng”.</p>`;
    st.sig = signature();
    if (mob) { const tw = main.querySelector(".sch-tw"); if (tw && st.lastWk !== keys[0]) tw.scrollLeft = 0; }
    st.lastWk = keys[0];
  }
  function signature() {
    let j = "";
    try { j = JSON.stringify(staffAll().map((s) => [s.code, s.name, s.nick, s.role, s.ext])); } catch (e) {}
    const sh = shop();
    return (innerWidth <= 720 ? "m" : "d") + ymd(new Date()) + "|" + (sh.id || "") + "|" + sh.name + "|" + sh.dirty + "|" + j;
  }

  /* ---------- Hộp thoại ---------- */
  const openOv = (h) => { ov.innerHTML = `<div class="sch-box">${h}</div>`; ov.hidden = false; };
  const closeOv = () => { ov.hidden = true; ov.innerHTML = ""; st.m = null; };
  const timeOpts = (from, to, sel) => { let o = ""; for (let m = m2(from); m <= m2(to); m += 30) o += `<option value="${t2(m)}"${t2(m) === sel ? " selected" : ""}>${t2(m)}</option>`; return o; };

  function cellDialog(code, di) {
    const s = StaffRegistry.get(code); if (!s) return;
    const k = weekKeys(st.wk)[di], e = entry(s, k), p = posOf(s), fixed = POS[p].fixed;
    st.m = { type: "cell", code, di };
    const chk = '<label class="sch-chk"><input type="checkbox" id="schAll"> Áp dụng cho cả tuần (T2–CN)</label>';
    const base = `<button class="btn sm x" data-act="close" aria-label="Đóng">${X}</button><h3>${esc(s.name)}</h3><p class="sub">${p} · ${DAYS[di]} ${dm(addDays(st.wk, di))}</p>`;
    if (fixed) {
      openOv(`${base}<div class="sch-opts"><button class="btn am${e && e.t === "AM" ? " on" : ""}" data-act="set" data-t="AM">Ca sáng<small>${CFG.AM[0]}–${CFG.AM[1]} · 8 giờ</small></button>
<button class="btn pm${e && e.t === "PM" ? " on" : ""}" data-act="set" data-t="PM">Ca chiều<small>${CFG.PM[0]}–${CFG.PM[1]} · 8 giờ</small></button>
<button class="btn" data-act="set" data-t="OFF">Nghỉ tuần (tối đa 1)</button><button class="btn al" data-act="set" data-t="AL">AL – phép năm</button><button class="btn" data-act="set" data-t="NONE" style="grid-column:1/-1">Xóa ca</button></div><div class="sch-err" id="schE"></div>${chk}`);
    } else {
      const a = e && e.t === "C" ? e.a : "08:00", b = e && e.t === "C" ? e.b : "16:00";
      openOv(`${base}<div class="chips"><button class="chip" data-act="pre" data-a="05:30" data-b="09:30">Sáng sớm 4h</button><button class="chip" data-act="pre" data-a="09:30" data-b="13:30">Sáng 4h</button><button class="chip" data-act="pre" data-a="10:00" data-b="16:00">Giữa ngày 6h</button><button class="chip" data-act="pre" data-a="13:30" data-b="17:30">Chiều 4h</button><button class="chip" data-act="pre" data-a="17:30" data-b="21:30">Tối 4h</button></div>
<div class="sch-row2"><label>Bắt đầu<select id="schA">${timeOpts(CFG.open, t2(m2(CFG.close) - 30), a)}</select></label><label>Kết thúc<select id="schB">${timeOpts(t2(m2(CFG.open) + 30), CFG.close, b)}</select></label></div>
<div class="sch-hrs" id="schH"></div><div class="sch-err" id="schE"></div>${chk}
<div class="sch-foot" style="flex-wrap:wrap"><button class="btn" data-act="set" data-t="OFF">Nghỉ</button><button class="btn al" data-act="set" data-t="AL">AL</button><button class="btn" data-act="set" data-t="NONE">Xóa ca</button><button class="btn pri" data-act="set" data-t="C">Lưu giờ</button></div>`);
      ptHint();
    }
  }
  function ptHint() {
    const A = ov.querySelector("#schA"), B = ov.querySelector("#schB"); if (!A) return;
    const h = (m2(B.value) - m2(A.value)) / 60;
    ov.querySelector("#schH").textContent = h > 0 ? `Tổng: ${h} giờ` : "";
    ov.querySelector("#schE").textContent = h <= 0 ? "Giờ kết thúc phải sau giờ bắt đầu." : h > CFG.maxPT ? `PT tối đa ${CFG.maxPT} giờ/ngày.` : "";
    return h > 0 && h <= CFG.maxPT;
  }
  function applyShift(t) {
    const m = st.m; if (!m) return;
    const s = StaffRegistry.get(m.code); if (!s) return closeOv();
    let e = null;
    if (t === "AM" || t === "PM" || t === "OFF" || t === "AL") e = { t };
    else if (t === "C") {
      if (!ptHint()) return;
      e = { t: "C", a: ov.querySelector("#schA").value, b: ov.querySelector("#schB").value };
    }
    if (e && e.t !== "OFF" && e.t !== "C" && !POS[posOf(s)].fixed) e = null;
    const all = ov.querySelector("#schAll").checked, keys = weekKeys(st.wk);
    const fx = POS[posOf(s)].fixed, errEl = ov.querySelector("#schE");
    if (fx && e && e.t === "OFF" && (all || offCount(s, keys, keys[m.di]) >= MAXOFF)) {
      if (errEl) errEl.textContent = `${posOf(s)} chỉ được nghỉ ${MAXOFF} ngày/tuần. Dùng AL nếu là ngày phép năm.`;
      return;
    }
    (all ? keys : [keys[m.di]]).forEach((k) => {
      const cur = entry(s, k);
      if (all && fx && e && (e.t === "AM" || e.t === "PM") && cur && (cur.t === "OFF" || cur.t === "AL")) return; /* giữ ngày nghỉ / AL */
      setEntry(s, k, e);
    });
    if (all && (t === "AM" || t === "PM")) { s.ext.pref = t; }
    persist(); closeOv(); render();
  }

  function staffDialog(code) {
    const s = code ? StaffRegistry.get(code) : null, p = s ? posOf(s) : "FT";
    st.m = { type: "staff", code: code || null };
    openOv(`<button class="btn sm x" data-act="close" aria-label="Đóng">${X}</button><h3>${s ? "Sửa nhân viên" : "Thêm nhân viên"}</h3><p class="sub">${s ? esc(s.code) : "Mã được cấp tự động"}</p>
<label>Họ tên<input type="text" id="sfN" maxlength="60" value="${esc(s ? s.name : "")}"></label>
<div class="sch-row2"><label>Biệt danh<input type="text" id="sfK" maxlength="30" value="${esc(s ? s.nick : "")}"></label><label>Điện thoại<input type="text" id="sfP" maxlength="20" value="${esc(s ? s.phone : "")}"></label></div>
<div class="sch-row2"><label>Chức vụ<select id="sfR">${Object.entries(POS).map(([v, o]) => `<option value="${v}"${v === p ? " selected" : ""}>${v} – ${o.n}</option>`).join("")}</select></label>
<label>Ca ưa thích<select id="sfC"><option value="AM"${s && s.ext && s.ext.pref === "AM" ? " selected" : ""}>Sáng</option><option value="PM"${s && s.ext && s.ext.pref === "PM" ? " selected" : ""}>Chiều</option></select></label></div>
<div class="sch-err" id="sfE"></div>
<div class="sch-foot">${s ? '<button class="btn red" data-act="del">Xóa</button>' : ""}<button class="btn pri" data-act="saveS">Lưu</button></div>`);
  }
  function saveStaffDialog() {
    const name = ov.querySelector("#sfN").value.trim();
    if (!name) return (ov.querySelector("#sfE").textContent = "Vui lòng nhập họ tên.");
    const p = ov.querySelector("#sfR").value;
    let s = st.m.code ? StaffRegistry.get(st.m.code) : null;
    const isNew = !s;
    if (isNew) s = newStaff();
    s.name = name; s.nick = ov.querySelector("#sfK").value.trim(); s.phone = ov.querySelector("#sfP").value.trim();
    setPos(s, p);
    s.ext = s.ext || {};
    s.ext.pref = ov.querySelector("#sfC").value;
    /* chuyển sang PT thì bỏ ca cố định không hợp lệ; chuyển sang FT/STM/ASM thì bỏ ca giờ tùy chọn */
    Object.keys(s.ext.sched || {}).forEach((k) => { const e = s.ext.sched[k]; if ((POS[p].fixed && e.t === "C") || (!POS[p].fixed && (e.t === "AM" || e.t === "PM"))) delete s.ext.sched[k]; });
    if (isNew) StaffRegistry.register(s);
    world(s.code);
    closeOv(); render();
    toast2((isNew ? "Đã thêm " : "Đã cập nhật ") + s.name);
  }

  /* ---------- Thao tác hàng loạt ---------- */
  function applyTemplate() {
    const keys = weekKeys(st.wk); let n = 0, idx = 0;
    staffAll().filter((s) => POS[posOf(s)].fixed).sort((a, b) => POS[posOf(a)].o - POS[posOf(b)].o || a.code.localeCompare(b.code)).forEach((s) => {
      const p = prefOf(s, idx);
      /* 6 ngày làm + 1 ngày nghỉ tuần, ngày nghỉ xoay vòng giữa các người; không đụng AL / ca đã xếp */
      let needOff = offCount(s, keys) < MAXOFF;
      const pref = (6 + idx) % 7, empty = keys.map((k, i) => (entry(s, k) ? -1 : i)).filter((i) => i >= 0);
      const offI = needOff && empty.length ? (empty.includes(pref) ? pref : empty[empty.length - 1]) : -1;
      idx++;
      keys.forEach((k, i) => { if (!entry(s, k)) { setEntry(s, k, i === offI ? { t: "OFF" } : { t: p }); n++; } });
    });
    persist(); render(); toast2(n ? `Đã điền ${n} ô cho STM/ASM/FT: 6 ngày làm + 1 ngày nghỉ (chỉ ô trống, giữ nguyên AL)` : "Không còn ô trống để điền");
  }
  function copyPrev() {
    const cur2 = weekKeys(st.wk), prev = weekKeys(addDays(st.wk, -7)); let n = 0;
    staffAll().forEach((s) => cur2.forEach((k, i) => { const e = entry(s, prev[i]); if (e && !entry(s, k)) { if (e.t === "OFF" && POS[posOf(s)].fixed && offCount(s, cur2) >= MAXOFF) return; setEntry(s, k, { ...e }); n++; } }));
    persist(); render(); toast2(n ? `Đã chép ${n} ca từ tuần trước` : "Tuần trước không có ca nào để chép");
  }
  let clearArm = 0;
  function clearWeek(btn) {
    if (!clearArm) { clearArm = 1; btn.textContent = "Bấm lần nữa để xóa"; setTimeout(() => { clearArm = 0; if (btn.isConnected) btn.textContent = "Xóa lịch tuần"; }, 3000); return; }
    clearArm = 0;
    const keys = weekKeys(st.wk);
    staffAll().forEach((s) => keys.forEach((k) => setEntry(s, k, null)));
    persist(); render(); toast2("Đã xóa lịch tuần này");
  }

  /* ---------- Sự kiện (ủy quyền) ---------- */
  root.addEventListener("click", (e) => {
    if (e.target === ov) return closeOv();
    const b = e.target.closest("[data-act]"); if (!b) return;
    const D = b.dataset, a = D.act;
    if (a === "cell") cellDialog(D.c, +D.d);
    else if (a === "edit") staffDialog(D.c);
    else if (a === "add") staffDialog(null);
    else if (a === "prev") { st.wk = addDays(st.wk, -7); render(); }
    else if (a === "next") { st.wk = addDays(st.wk, 7); render(); }
    else if (a === "today") { st.wk = mondayOf(new Date()); render(); }
    else if (a === "tpl") applyTemplate();
    else if (a === "copy") copyPrev();
    else if (a === "clear") clearWeek(b);
    else if (a === "save") { if (window.StoreLink) StoreLink.openSave(); else toast2("Chưa có store-link.js"); }
    else if (a === "close") closeOv();
    else if (a === "set") applyShift(D.t === "NONE" ? "NONE" : D.t);
    else if (a === "pre") { ov.querySelector("#schA").value = D.a; ov.querySelector("#schB").value = D.b; ptHint(); }
    else if (a === "saveS") saveStaffDialog();
    else if (a === "del") {
      if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = "Xác nhận xóa"; return; }
      const code = st.m.code, nm = (StaffRegistry.get(code) || {}).name;
      StaffRegistry.remove(code); world(code, true); closeOv(); render(); toast2("Đã xóa " + (nm || code));
    }
  });
  root.addEventListener("change", (e) => { if (e.target.id === "schA" || e.target.id === "schB") ptHint(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !ov.hidden) closeOv(); });

  /* ---------- Gắn vào tab + theo dõi đổi cửa hàng / đổi dữ liệu ---------- */
  let fbBtn = null, t0 = performance.now();
  function host() { for (const q of CFG.containers) { const h = document.querySelector(q); if (h) return h; } return null; }
  function mount() {
    const h = host();
    if (h) {
      if (!h.contains(root)) h.replaceChildren(root); /* thay khung placeholder của nav-pages.js */
      root.classList.remove("sch-float");
      root.classList.add("sch-in");
      if (fbBtn) { fbBtn.remove(); fbBtn = null; }
      return true;
    }
    if (performance.now() - t0 > CFG.fallbackAfter && !fbBtn) {
      /* không thấy container của tab "Làm việc": tự tạo nút "Lịch làm việc" trên thanh đầu để dùng được ngay */
      root.classList.add("sch-float"); root.hidden = true; document.body.appendChild(root);
      fbBtn = document.createElement("button");
      fbBtn.className = "btn sch-fb";
      fbBtn.textContent = "Lịch làm việc";
      fbBtn.onclick = () => { root.hidden = !root.hidden; if (!root.hidden) render(); };
      const hd = document.querySelector("header"), tabs = document.querySelector("#tabs");
      hd && tabs ? hd.insertBefore(fbBtn, tabs) : document.body.appendChild(fbBtn);
    }
    return false;
  }
  function poll() {
    mount();
    if (!root.isConnected || root.hidden || !root.offsetParent && !root.classList.contains("sch-float")) return;
    if (!ov.hidden) return; /* đang mở hộp thoại: không vẽ lại */
    if (signature() !== st.sig) render();
  }
  mount();
  render();
  setInterval(poll, 600);
  document.addEventListener("storelink:change", () => root.isConnected && ov.hidden && render());

  /* =====================================================================
     NHÂN VIÊN TRONG CỬA HÀNG 3D CHẠY THEO LỊCH
     - Chỉ người có ca đang diễn ra mới có mặt trong cửa hàng; hết ca thì đi ra cửa rồi biến mất,
       đến ca thì đi từ cửa vào (đi vòng quầy nhờ dxNav nếu có).
     - 3 chế độ ở bảng "Giờ cửa hàng": Giờ thực · Chọn giờ (xem trước theo tuần đang mở ở tab Lịch) · Tất cả (như cũ).
     - Không sửa core: chỉ bọc stepNpc / goal (cùng cách các patch cũ đang làm).
     ===================================================================== */
  (function live() {
    if (typeof npcs === "undefined" || typeof stepNpc !== "function" || typeof goal !== "function" || typeof scene === "undefined") return;
    const KEY = "store-clock-v1", LONG = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
    const ck = { mode: "live", day: 0, min: 480, v: 0 };
    try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && ["live", "manual", "all"].includes(o.mode)) ck.mode = o.mode; } catch (e) {}
    const saveCk = () => { try { localStorage.setItem(KEY, JSON.stringify({ mode: ck.mode })); } catch (e) {} };

    /* thời điểm đang xét: k = khóa ngày có lịch (null = cuối tuần), m = số phút trong ngày */
    function when() {
      if (ck.mode === "manual") return { k: ymd(addDays(st.wk, ck.day)), m: ck.min, lb: LONG[ck.day] + " " + dm(addDays(st.wk, ck.day)) };
      const d = new Date(), wd = (d.getDay() + 6) % 7;
      return { k: ymd(d), m: d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60, lb: LONG[wd] + " " + dm(d) + " · " + pad(d.getHours()) + ":" + pad(d.getMinutes()) };
    }
    function onDuty(s, w) {
      if (ck.mode === "all") return true;
      if (!w.k) return false;
      const t = times(entry(s, w.k));
      return !!t && w.m >= m2(t[0]) && w.m < m2(t[1]);
    }
    const door = () => [(STORE.door[0] + STORE.door[1]) / 2, STORE.D / 2 - 0.5];
    function putAtDoor(n) {
      const d = door();
      n.g.position.set(d[0], 0, d[1]);
      n.g.rotation.y = Math.PI; /* quay mặt vào trong */
      n.rs = null; n.nv = null; n.mi = undefined; /* reset trạng thái việc đang làm (lấy hàng, lau nhà…) */
      if (n.g.parent !== scene) scene.add(n.g);
    }
    function exitPath(n) {
      const p = n.g.position, d = door();
      let path = null;
      try { path = window.dxNav && dxNav.path(p.x, p.z, d[0], d[1]); } catch (e) {}
      path = path && path.length ? path.slice() : [];
      path.push(d);
      return path;
    }

    /* goal: đang ra về thì đích là các điểm trên đường ra cửa */
    const _goal = goal;
    goal = function (n) {
      if (n.dst === "exit" && n.ex) {
        const w = n.ex.path[Math.min(n.ex.i, n.ex.path.length - 1)];
        return { x: w[0], z: w[1], act: "walk" };
      }
      return _goal(n);
    };

    /* stepNpc: quyết định có mặt / vào ca / ra về trước khi chạy logic cũ */
    const _step = stepNpc;
    stepNpc = function (n, dt, t) {
      const on = onDuty(n.s, when());
      if (n.dst === undefined) { /* lần đầu thấy NPC này: khớp ngay, không đi */
        n.dst = on ? "in" : "out"; n.sv = ck.v;
        if (!on && n.g.parent === scene) scene.remove(n.g);
      } else if (n.sv !== ck.v) { /* người dùng đổi chế độ / giờ: khớp ngay */
        n.sv = ck.v; n.ex = null;
        if (on) { if (n.dst === "out") putAtDoor(n); n.dst = "in"; }
        else { if (n.g.parent === scene) scene.remove(n.g); n.dst = "out"; }
      } else if (n.dst === "out" && on) { putAtDoor(n); n.dst = "in"; }
      else if (n.dst === "in" && !on) { n.ex = { path: exitPath(n), i: 0 }; n.dst = "exit"; }
      else if (n.dst === "exit" && on) { n.ex = null; n.dst = "in"; }

      if (n.dst === "out") return;
      if (n.dst === "exit" && n.ex) {
        const w = n.ex.path[Math.min(n.ex.i, n.ex.path.length - 1)];
        if (Math.hypot(w[0] - n.g.position.x, w[1] - n.g.position.z) < 0.3) {
          if (n.ex.i < n.ex.path.length - 1) n.ex.i++;
          else { scene.remove(n.g); n.dst = "out"; n.ex = null; return; }
        }
      }
      _step(n, dt, t);
    };

    /* ---------- bảng "Giờ cửa hàng" trong tab Cửa hàng ---------- */
    const pn = document.createElement("div");
    pn.className = "panel sch-clock" + (innerWidth <= 720 ? " min" : "");
    pn.id = "schClock";
    pn.innerHTML = `<div class="sch-ck-h"><div class="seg"><button data-m="live">Giờ thực</button><button data-m="manual">Chọn giờ</button><button data-m="all">Tất cả</button></div><button class="sch-ck-t" data-ck="tog" aria-label="Thu gọn / mở rộng">▾</button></div>
<div class="sch-ck-man"><div class="seg">${DAYS.map((d, i) => `<button data-d="${i}">${i === 6 ? "CN" : "T" + (i + 2)}</button>`).join("")}</div><div class="sch-ck-sl"><input type="range" min="${m2(CFG.open)}" max="${m2(CFG.close) - 15}" step="15"><b></b></div></div>
<div class="sch-ck-st"></div>`;
    document.querySelector("#store").appendChild(pn);
    const rng = pn.querySelector("input"), tb = pn.querySelector(".sch-ck-sl b"), stx = pn.querySelector(".sch-ck-st");
    function upd() {
      pn.style.display = typeof mode !== "undefined" && mode === "edit" ? "none" : "";
      if (document.activeElement !== rng) rng.value = ck.min;
      tb.textContent = t2(ck.min);
      pn.querySelectorAll("[data-m]").forEach((b) => b.classList.toggle("on", b.dataset.m === ck.mode));
      pn.querySelectorAll("[data-d]").forEach((b) => b.classList.toggle("on", +b.dataset.d === ck.day));
      pn.classList.toggle("man", ck.mode === "manual");
      const w = when(), who = staffAll().filter((s) => onDuty(s, w)), name = (s) => esc(s.nick || s.name);
      let h;
      if (ck.mode === "all") h = "Đang hiện <b>tất cả</b> nhân viên, không theo lịch.";
      else {
        const head = `<b>${esc(ck.mode === "manual" ? w.lb + " · " + t2(ck.min) : w.lb)}</b><br>`;
        h = !w.k ? head + "Không có lịch: cửa hàng không có nhân viên."
          : who.length ? head + `● ${who.length} người đang làm: ${who.slice(0, 5).map(name).join(", ")}${who.length > 5 ? " +" + (who.length - 5) : ""}`
          : head + "Chưa có ai trong ca này.";
      }
      if (stx.innerHTML !== h) stx.innerHTML = h;
    }
    pn.addEventListener("pointerdown", (e) => e.stopPropagation());
    pn.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.ck) pn.classList.toggle("min");
      if (b.dataset.m) { ck.mode = b.dataset.m; ck.v++; saveCk(); }
      if (b.dataset.d) { ck.day = +b.dataset.d; ck.v++; }
      upd();
    });
    rng.addEventListener("input", () => { ck.min = +rng.value; ck.v++; upd(); });
    upd();
    setInterval(upd, 500);
    window.StoreClock = ck;
  })();

  window.Schedule = { render, mount, root, posOf, entry, times, weekKeys, el: root };
})();