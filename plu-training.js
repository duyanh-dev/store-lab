/* PLU Training – Liquid Glass v4
   Đọc dữ liệu từ window.PLU_SOURCE ([{code,name,cat,img?,chk?,dup?}]).
   Tiến độ: localStorage "plu.prog" (tương thích bản cũ) · meta: "plu.meta".
   API giữ nguyên: PLUTraining.open(mode?) / close() / isOpen()
   Mode: home | visual | flash | reflex | recog | rev | exam | stats | list */
(function () {
  "use strict";

  var KEY = "plu.prog", MKEY = "plu.meta", DAY = 864e5;
  var INTV = [3e5, 6e5, DAY, 3 * DAY, 7 * DAY, 16 * DAY]; /* khoảng ôn lại theo bậc nhớ */
  var D = window.PLU_SOURCE || [];
  var root, body, catBar, titleEl, subEl;
  var mode = "home", curCat = "ALL", limitOnce = 0, streak = 0, soundOn = true;
  var P = {}, M = {}, tm, keyHandler;
  var byCode = {}, sorted = [], fam = {};

  try { P = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { P = {}; }
  try { M = JSON.parse(localStorage.getItem(MKEY) || "{}"); } catch (e) { M = {}; }

  /* ---------- tiện ích ---------- */
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  };
  var saveT = 0;
  function flush() { clearTimeout(saveT); saveT = 0; try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  var save = function () { if (!saveT) saveT = setTimeout(flush, 400); };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", function () { if (document.hidden) flush(); });
  var saveM = function () { try { localStorage.setItem(MKEY, JSON.stringify(M)); } catch (e) {} };
  var norm = function (s) { return String(s || "").replace(/\D/g, ""); };
  function g(c) {
    var r = P[c] || (P[c] = {});
    if (r.ok == null) { r.ok = 0; r.bad = 0; r.ms = 0; r.pts = 0; }
    if (r.st == null) { r.st = 0; r.due = 0; }
    return r;
  }
  function vnFold(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  }
  function shuffle(a) {
    var arr = a.slice();
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  function when(ts) {
    var d = ts - Date.now();
    if (d <= 0) return "đến hạn ôn";
    if (d < 36e5) return "ôn lại sau " + Math.max(1, Math.round(d / 6e4)) + " phút";
    if (d < DAY) return "ôn lại sau " + Math.round(d / 36e5) + " giờ";
    return "ôn lại sau " + Math.round(d / DAY) + " ngày";
  }

  /* ---------- dữ liệu phụ: tra theo mã, mã lân cận, họ mã ---------- */
  function reindex() {
    byCode = {};
    D.forEach(function (d) { if (!byCode[d.code]) byCode[d.code] = d; });
    sorted = D.slice().sort(function (a, b) { return (+a.code) - (+b.code) || a.name.localeCompare(b.name); });
    var cnt = {};
    D.forEach(function (d) {
      var k = d.code[0]; cnt[k] = cnt[k] || {};
      cnt[k][d.cat] = (cnt[k][d.cat] || 0) + 1;
    });
    fam = {};
    Object.keys(cnt).forEach(function (k) {
      var best = null;
      Object.keys(cnt[k]).forEach(function (c) { if (!best || cnt[k][c] > cnt[k][best]) best = c; });
      fam[k] = best;
    });
  }
  function neighbors(it) {
    var i = sorted.indexOf(it), out = [];
    if (i > 0) out.push(sorted[i - 1]);
    if (i >= 0 && i < sorted.length - 1) out.push(sorted[i + 1]);
    return out.filter(function (n) { return n.code !== it.code; });
  }

  /* ---------- màu theo nhóm hàng (giờ chỉ còn dùng làm dữ liệu, giao diện dùng 1 màu nhấn) ---------- */
  var HUES = {
    "Trái cây": 30, "Trái cây mùa vụ": 352, "Rau củ": 138, "Trứng": 48, "Gạo": 78,
    "Bún + đậu hũ": 175, "Hàng mát + đông": 200, "Bột hòa tan": 268, "Bánh kẹo (Trung Quốc)": 322,
    "Bánh kẹo (lẻ/xá)": 338, "Thạch rau câu": 245, "Xúc xích": 10, "Non-food": 220
  };
  function hue(cat) {
    if (HUES[cat] != null) return HUES[cat];
    var h = 0; for (var i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) % 360;
    return h;
  }
  function setHue(cat) { if (root) root.style.setProperty("--h", cat ? hue(cat) : 212); }

  /* ---------- biểu tượng SVG ---------- */
  var IC = {
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.4v.1"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    cube: '<path d="M12 2.5l8.5 4.7v9.6L12 21.5l-8.5-4.7V7.2z"/><path d="M12 12l8.5-4.8M12 12v9.5M12 12L3.5 7.2"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    swap: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    chart: '<path d="M4 20V11M10 20V4M16 20v-7M22 20H2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
    vol: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  function ic(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + "</svg>"; }
  var FLAME = '<svg viewBox="0 0 24 24"><path d="M12 2c.8 3.6 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 0 1.8.8 2.8 2 3 0-3.6-1.2-5.4 1-9z"/></svg>';
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

  /* ---------- âm thanh ---------- */
  var actx;
  function warmAudio() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
    } catch (e) {}
  }
  function beep(type) {
    if (!soundOn) return;
    try {
      warmAudio();
      var o = actx.createOscillator(), gn = actx.createGain(), now = actx.currentTime;
      o.connect(gn); gn.connect(actx.destination);
      if (type === "ok") {
        o.type = "sine"; o.frequency.setValueAtTime(587.33, now); o.frequency.exponentialRampToValueAtTime(880, now + .12);
        gn.gain.setValueAtTime(.12, now); gn.gain.exponentialRampToValueAtTime(.001, now + .18); o.start(now); o.stop(now + .18);
      } else if (type === "bad") {
        o.type = "triangle"; o.frequency.setValueAtTime(220, now); o.frequency.linearRampToValueAtTime(140, now + .22);
        gn.gain.setValueAtTime(.15, now); gn.gain.exponentialRampToValueAtTime(.001, now + .25); o.start(now); o.stop(now + .25);
      } else {
        o.type = "sine"; o.frequency.setValueAtTime(420, now);
        gn.gain.setValueAtTime(.04, now); gn.gain.exponentialRampToValueAtTime(.001, now + .04); o.start(now); o.stop(now + .04);
      }
    } catch (e) {}
  }

  /* ---------- emoji minh họa (ưu tiên nhóm hàng, rồi tên; dùng ranh giới từ để khỏi nhầm "Bông" với "Bơ") ---------- */
  function getIcon(it) {
    var n = vnFold(it.name), c = vnFold(it.cat), t = function (r) { return r.test(n); };
    if (/gao/.test(c)) return "🌾";
    if (/trung/.test(c)) return "🥚";
    if (/thach/.test(c)) return "🍮";
    if (/non-food/.test(c)) return t(/\btam\b/) ? "🪥" : t(/\bbong\b/) ? "🧻" : "🧴";
    if (/xuc xich/.test(c) || t(/xuc xich|doi sun/)) return "🌭";
    if (/bun|dau hu/.test(c)) return t(/dau hu/) ? "🥡" : "🍜";
    if (/hang mat/.test(c)) return t(/pho mai/) ? "🧀" : t(/\bkem\b/) ? "🍦" : "🧊";
    if (/bot hoa tan/.test(c)) return t(/ngu coc/) ? "🥣" : "🍵";
    if (/banh keo/.test(c)) {
      if (t(/mochi/)) return "🍡"; if (t(/\bkeo\b/)) return "🍬"; if (t(/socola|choco/)) return "🍫";
      if (t(/bap rang/)) return "🍿"; if (t(/banh gao/)) return "🍘"; if (t(/\bpia\b/)) return "🥮";
      if (t(/\bthach\b/)) return "🍮"; return "🍪";
    }
    if (t(/chuoi/)) return "🍌"; if (t(/\btao\b/)) return "🍎"; if (t(/\bcam\b|quyt|buoi/)) return "🍊";
    if (t(/dua hau/)) return "🍉"; if (t(/dua luoi/)) return "🍈"; if (t(/\bnho\b/)) return "🍇";
    if (t(/xoai|du du/)) return "🥭"; if (t(/\bdao\b|\bman\b/)) return "🍑"; if (t(/\ble\b|\boi\b|\bcoc\b/)) return "🍐";
    if (t(/dua xiem/)) return "🥥"; if (t(/\bbo\b/)) return "🥑"; if (t(/chanh/)) return "🍋";
    if (t(/sau rieng|\bmit\b/)) return "🍈"; if (t(/chom chom|\bvai\b/)) return "🍒";
    if (t(/hong|luu/)) return "🍎"; if (t(/thanh long/)) return "🍓"; if (t(/mang cut/)) return "🍇"; if (t(/vu sua/)) return "🍏";
    if (t(/ca chua/)) return "🍅"; if (t(/ca rot|cu cai/)) return "🥕"; if (t(/bap my/)) return "🌽";
    if (t(/bap cai|cai thao|\bcai\b/)) return "🥬"; if (t(/\bot\b/)) return "🌶️"; if (t(/khoai tay/)) return "🥔";
    if (t(/khoai/)) return "🍠"; if (t(/bi do/)) return "🎃";
    if (t(/dua leo|muop|kho qua|\bbau\b|\bbi\b|dau bap|su su/)) return "🥒";
    if (t(/\bgia\b/)) return "🌱"; if (t(/hanh/)) return "🧅"; if (t(/gung|\bsa\b/)) return "🌿";
    return "🏷️";
  }

  /* ---------- cấp độ nhớ + lịch ôn ngắt quãng ---------- */
  var LV = ["Mới", "Đang học", "Đã nhớ"];
  function seen(c) { var r = g(c); return r.ok + r.bad; }
  function box(c) {
    var r = g(c), n = r.ok + r.bad;
    if (!n) return 0;
    var acc = r.ok / n, avg = r.ms / Math.max(r.ok, 1);
    return r.ok >= 3 && acc >= .8 && avg <= 4500 ? 2 : 1;
  }
  function isDue(c) { return seen(c) > 0 && g(c).due <= Date.now(); }
  function isWeak(c) { var r = g(c); return r.bad > 0 && (box(c) !== 2 || r.st === 0); }
  function totalPts() { return D.reduce(function (s, d) { return s + g(d.code).pts; }, 0); }
  function counts() {
    var o = { due: 0, weak: 0, nw: 0, known: 0, learn: 0 };
    D.forEach(function (d) {
      var b = box(d.code);
      if (b === 0) o.nw++; else if (b === 2) o.known++; else o.learn++;
      if (isDue(d.code)) o.due++;
      if (isWeak(d.code)) o.weak++;
    });
    return o;
  }

  function rec(c, ok, ms, wrong) {
    var r = g(c), gain = 0, now = Date.now();
    if (ok) {
      r.ok++; r.ms += ms; streak++;
      if (streak > (M.best || 0)) { M.best = streak; saveM(); }
      gain = 10 + Math.max(0, Math.round(5 - ms / 1000)) + Math.min(15, streak * 2);
      r.pts += gain;
      if (ms <= 5000) r.st = Math.min(5, r.st + 1);
      r.due = now + INTV[r.st];
      beep("ok");
    } else {
      r.bad++; streak = 0; r.st = 0; r.due = now;
      if (wrong && wrong !== c) { r.conf = r.conf || {}; r.conf[wrong] = (r.conf[wrong] || 0) + 1; }
      beep("bad");
    }
    save(); updateHeader(true);
    return gain;
  }

  /* ---------- chọn câu hỏi: ưu tiên mã sai nhiều, mã mới, mã đến hạn ---------- */
  function activePool() {
    var f;
    if (curCat === "ALL") return D.slice();
    if (curCat === "WEAK") f = D.filter(function (d) { return isWeak(d.code); });
    else if (curCat === "DUE") f = D.filter(function (d) { return isDue(d.code); });
    else if (curCat === "NEW") f = D.filter(function (d) { return box(d.code) === 0; });
    else f = D.filter(function (d) { return d.cat === curCat; });
    return f.length ? f : D.slice();
  }
  function pick(n, ex) {
    var base = activePool().filter(function (d) { return !ex || ex.indexOf(d.code) < 0; }), out = [];
    while (out.length < n && base.length) {
      var w = base.map(function (d) {
        var r = g(d.code), b = box(d.code);
        return 1 + r.bad * 2.5 + (b === 0 ? 2.2 : b === 1 ? 1.2 : 0) + (isDue(d.code) ? 2 : 0);
      });
      var t = w.reduce(function (a, b) { return a + b; }, 0) * Math.random(), i = 0;
      while (i < base.length - 1 && (t -= w[i]) > 0) i++;
      out.push(base.splice(i, 1)[0]);
    }
    return out;
  }
  function distract(it, hard) {
    var near = D.filter(function (d) {
      return d.code !== it.code && (hard ? d.cat === it.cat || d.code[0] === it.code[0] : true);
    });
    if (near.length < 3) near = D.filter(function (d) { return d.code !== it.code; });
    return shuffle(near).slice(0, 3);
  }

  /* ---------- thành phần giao diện ---------- */
  function lvBadge(it) { var b = box(it.code); return '<span class="plu-lvb l' + b + '">' + LV[b] + "</span>"; }
  function lens(it, ring) {
    return '<div class="plu-lens-wrap' + (ring ? " rg" : "") + '"' + (ring ? ' id="rg" style="--p:100"' : "") + ">" +
      '<div class="plu-lens">' + (it.img ? '<img alt="" decoding="async" src="' + esc(it.img) + '">' : '<span class="plu-emo">' + getIcon(it) + "</span>") + "</div>" +
      '<div class="plu-ground"></div></div>';
  }
  function codeTiles(code, cls) {
    return '<div class="plu-code ' + (cls || "") + '">' + String(code).split("").map(function (d) { return '<div class="plu-d on">' + d + "</div>"; }).join("") + "</div>";
  }
  function pips(n, i, hist) {
    var s = '<div class="plu-pips">';
    for (var j = 0; j < n; j++) s += "<i" + (hist[j] === true ? ' class="ok"' : hist[j] === false ? ' class="no"' : j === i ? ' class="cur"' : "") + "></i>";
    return s + "</div>";
  }
  function ringSvg(p, s, t, sub) {
    var c = 2 * Math.PI * 52;
    return '<div class="plu-rs" style="width:' + s + "px;height:" + s + 'px"><svg viewBox="0 0 120 120"><circle class="tr" cx="60" cy="60" r="52"/>' +
      '<circle class="fg" cx="60" cy="60" r="52" transform="rotate(-90 60 60)" style="--c:' + c.toFixed(1) + '" stroke-dasharray="' + c.toFixed(1) +
      '" stroke-dashoffset="' + (c * (1 - Math.max(0, Math.min(1, p)))).toFixed(1) + '"/></svg>' +
      '<div class="plu-rt"><b>' + t + "</b>" + (sub ? "<span>" + sub + "</span>" : "") + "</div></div>";
  }
  function chipOf(d) { return '<span class="plu-chip"><b>' + d.code + "</b>" + esc(d.name) + "</span>"; }

  function updateHeader(bump) {
    if (!root) return;
    var p = $("#plu-pts"), s = $("#plu-str");
    if (p) p.querySelector("b").textContent = totalPts();
    if (s) {
      s.querySelector("b").textContent = streak;
      s.classList.toggle("hot", streak >= 3);
      if (bump) { s.classList.remove("bump"); void s.offsetWidth; s.classList.add("bump"); }
    }
  }

  /* ==========================================================
     1. Thẻ học: Hình ảnh / Thẻ lật (lật 3D thật)
     ========================================================== */
  function cards(visual, limit) {
    var q = pick(Math.min(limit || 15, activePool().length)), i = 0, hist = [];
    (function next() {
      keyHandler = null;
      if (i >= q.length) return cardsDone(visual, hist);
      var it = q[i], flipped = false, finished = false, t0 = Date.now();
      setHue(it.cat);
      var nb = neighbors(it), fm = fam[it.code[0]];

      body.innerHTML =
        pips(q.length, i, hist) +
        '<div class="plu-stage"><div class="plu-tilt"><div class="plu-flip" id="fc">' +
        '<div class="plu-face g flat">' + lvBadge(it) + '<span class="plu-qn">' + (i + 1) + "/" + q.length + "</span>" +
        (visual ? lens(it) : "") +
        '<div class="plu-kicker">' + esc(it.cat) + "</div>" +
        '<div class="plu-name">' + esc(it.name) + "</div>" +
        '<div class="plu-hint">Chạm thẻ để xem mã</div></div>' +
        '<div class="plu-face g flat back"><div class="plu-kicker">Mã PLU</div>' + codeTiles(it.code) +
        '<div class="plu-name sm">' + esc(it.name) + "</div>" +
        '<div class="plu-ctx">' + (fm ? '<span class="plu-chip">Đầu số <b>' + it.code[0] + "xx</b>" + esc(fm) + "</span>" : "") +
        nb.map(chipOf).join("") + "</div></div>" +
        "</div></div>" +
        '<div class="plu-row" id="ctl"><button class="plu-btn pri lg" id="flip">Lật thẻ<kbd>Space</kbd></button></div></div>';

      function rate(good) {
        if (finished) return; finished = true;
        var ms = Math.min(6000, Math.max(900, Date.now() - t0));
        rec(it.code, good, good ? ms : 4000);
        hist.push(good); i++; next();
      }
      function doFlip() {
        if (flipped) return; flipped = true; beep("tap");
        $("#fc").classList.add("flipped");
        $("#ctl").innerHTML = '<button class="plu-btn bad lg" id="n">Chưa nhớ<kbd>1</kbd></button><button class="plu-btn good lg" id="y">Đã thuộc<kbd>2</kbd></button>';
        $("#n").onclick = function (e) { e.stopPropagation(); rate(false); };
        $("#y").onclick = function (e) { e.stopPropagation(); rate(true); };
      }
      $("#flip").onclick = function (e) { e.stopPropagation(); doFlip(); };
      $("#fc").onclick = function () { doFlip(); };
      keyHandler = function (e) {
        if (e.repeat) return;
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!flipped) doFlip(); else rate(true); }
        else if (!flipped && (e.key === "ArrowUp" || e.key === "ArrowDown")) doFlip();
        else if (flipped && (e.key === "1" || e.key === "ArrowLeft")) rate(false);
        else if (flipped && (e.key === "2" || e.key === "ArrowRight")) rate(true);
      };
    })();
  }
  function cardsDone(visual, hist) {
    var good = hist.filter(Boolean).length, tot = hist.length || 1;
    setHue(good / tot >= .7 ? 142 : 28);
    body.innerHTML = '<div class="plu-stage"><div class="plu-end g">' +
      ringSvg(good / tot, 140, good + "/" + hist.length, "đã thuộc") +
      '<div class="plu-name">Xong lượt học</div>' +
      '<div class="plu-hint" style="margin:0">Mã chưa thuộc sẽ được xếp ôn lại sớm hơn.</div>' +
      '<div class="plu-row"><button class="plu-btn" id="again">Học lượt mới</button><button class="plu-btn pri" id="rx">Luyện phản xạ</button></div></div></div>';
    $("#again").onclick = function () { cards(visual); };
    $("#rx").onclick = function () { go("reflex"); };
  }

  /* ==========================================================
     2. Bài hỏi: bàn phím POS / trắc nghiệm
     ========================================================== */
  function quiz(o) {
    var q = pick(Math.min(o.n, activePool().length)), i = 0, ok = 0, tot = 0, hist = [], missed = [], xp = 0, hard = o.hard;
    var isName = o.type === "name";

    (function next() {
      clearInterval(tm); keyHandler = null;
      if (i >= q.length) return done();

      var it = q[i], t0 = Date.now(), lim = o.time * 1000, typed = "", fin = false, len = it.code.length || 3, adv;
      setHue(it.cat);

      var top = isName
        ? '<div class="plu-kicker">Mã trên cân</div>' + codeTiles(it.code)
        : lens(it) + '<div class="plu-kicker">' + esc(it.cat) + '</div><div class="plu-name">' + esc(it.name) + "</div>";
      var scr = o.type === "input"
        ? '<div class="plu-code" id="scr">' + new Array(len + 1).join('<div class="plu-d">•</div>') + "</div>" : "";
      var left = '<div class="plu-tilt"><div class="plu-q g">' + (o.time ? '<div class="plu-timer"><i id="tbar"></i></div>' : "") + lvBadge(it) +
        '<span class="plu-qn">' + (i + 1) + "/" + q.length + "</span>" + top + scr + '<div class="plu-fb" id="fb"></div></div></div>';

      var right;
      if (o.type === "input") {
        right = '<div class="plu-pad g">' + ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "OK"].map(function (k) {
          var cls = k === "CLR" ? " fn" : k === "OK" ? " ok-key" : "";
          return '<button class="plu-key' + cls + '" data-k="' + k + '">' + (k === "CLR" ? "Xoá" : k === "OK" ? "Nhập" : k) + "</button>";
        }).join("") + "</div>";
      } else {
        right = '<div class="plu-opts" id="ops">' + shuffle([it].concat(distract(it, hard))).map(function (d, idx) {
          return '<button class="plu-opt" data-c="' + d.code + '"><span class="kc">' + (idx + 1) + "</span>" +
            '<span class="ot' + (isName ? "" : " mono") + '">' + esc(isName ? d.name : d.code) + "</span>" +
            '<span class="nm">' + esc(isName ? d.code : d.name) + "</span></button>";
        }).join("") + "</div>";
      }
      body.innerHTML = pips(q.length, i, hist) + '<div class="plu-stage split">' + left + right + "</div>";

      function renderDigits() {
        $$(".plu-d", $("#scr")).forEach(function (el, idx) {
          var ch = typed[idx] || "";
          el.textContent = ch || "•";
          el.classList.toggle("filled", !!ch);
          el.classList.toggle("cur", idx === typed.length);
        });
      }
      function step() { clearTimeout(adv); i++; next(); }

      function ans(good, sel, given) {
        if (fin) return; fin = true;
        clearTimeout(tm); keyHandler = null;
        var tb = $("#tbar");
        if (tb) { var tr = getComputedStyle(tb).transform; tb.style.transition = "none"; tb.style.transform = tr; }
        var ms = Date.now() - t0;
        tot++; if (good) ok++; else missed.push(it);
        hist.push(good); o.log.push({ ok: good, ms: ms });
        var gain = rec(it.code, good, ms, good ? null : given);
        xp += gain;
        var pp = $$(".plu-pips i")[i]; if (pp) pp.className = good ? "ok" : "no";

        var wrongIt = given && given !== it.code ? byCode[given] : null, fb;
        if (good) {
          fb = '<div class="fbk ok"><b>Chính xác</b><span>' + (ms / 1000).toFixed(1) + "s · +" + gain + " XP</span></div>";
        } else {
          fb = '<div class="fbk no"><b>' + (given ? "Sai" : "Hết giờ") + "</b><span>Đáp án <code>" + it.code + "</code> " + esc(it.name) + "</span>" +
            (wrongIt ? "<em>" + given + " là " + esc(wrongIt.name) + "</em>" : "") +
            '<button class="plu-btn sm" id="nx">Tiếp<kbd>Enter</kbd></button></div>';
        }
        $("#fb").innerHTML = fb;
        var nx = $("#nx"); if (nx) nx.onclick = step;

        $$(".plu-d").forEach(function (el) { el.classList.remove("filled", "cur"); el.classList.add(good ? "good" : "bad"); });
        var ops = $("#ops"); if (ops) ops.classList.add("done");
        $$(".plu-opt").forEach(function (b) {
          b.disabled = true;
          if (b.dataset.c === it.code) b.classList.add("ok"); else if (b === sel) b.classList.add("no");
        });
        keyHandler = function (e) { if (!e.repeat && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); step(); } };
        adv = setTimeout(step, good ? 600 : 2600);
      }

      if (o.type === "input") {
        renderDigits();
        var hit = function (k) {
          var el = root.querySelector('.plu-key[data-k="' + k + '"]');
          if (el) { el.classList.add("hit"); setTimeout(function () { el.classList.remove("hit"); }, 90); }
        };
        var press = function (k) {
          if (fin) return; beep("tap");
          if (k === "CLR") { typed = typed.slice(0, -1); renderDigits(); }
          else if (k === "OK") { if (typed.length > 0) ans(typed === it.code, null, typed); }
          else if (/^\d$/.test(k) && typed.length < len) {
            typed += k; renderDigits();
            if (typed.length === len) setTimeout(function () { ans(typed === it.code, null, typed); }, 90);
          }
        };
        $$(".plu-key").forEach(function (b) { b.onclick = function () { press(b.dataset.k); }; });
        keyHandler = function (e) {
          if (e.repeat) return;
          if (/^\d$/.test(e.key)) { hit(e.key); press(e.key); }
          else if (e.key === "Backspace") { hit("CLR"); press("CLR"); }
          else if (e.key === "Enter") { hit("OK"); press("OK"); }
        };
      } else {
        var btns = $$(".plu-opt");
        btns.forEach(function (b) { b.onclick = function () { ans(b.dataset.c === it.code, b, b.dataset.c); }; });
        keyHandler = function (e) {
          var idx = ["1", "2", "3", "4"].indexOf(e.key);
          if (!e.repeat && idx >= 0 && btns[idx]) btns[idx].click();
        };
      }

      if (o.time) {
        var tbar = $("#tbar");
        if (tbar) {
          tbar.style.transition = "transform " + lim + "ms linear";
          requestAnimationFrame(function () { requestAnimationFrame(function () { tbar.style.transform = "scaleX(0)"; }); });
        }
        tm = setTimeout(function () { ans(false, null, ""); }, lim); /* clearInterval/clearTimeout dùng chung bộ đếm nên các chỗ clearInterval(tm) khác vẫn huỷ được */
      }
    })();

    function done() {
      var acc = Math.round(ok / Math.max(tot, 1) * 100);
      var oks = o.log.filter(function (l) { return l.ok; });
      var avg = oks.length ? oks.reduce(function (a, l) { return a + l.ms; }, 0) / oks.length / 1000 : 0;
      var pass = acc >= 90 && avg <= 5;
      if (o.exam) { M.exam = { acc: acc, avg: +avg.toFixed(1), pass: pass, ts: Date.now() }; saveM(); }
      setHue(acc >= 80 ? 142 : 28);

      /* Bài thi (nhánh dự phòng): dùng chung giao diện kết quả sát hạch mới */
if (o.exam) {
  body.innerHTML = examResultHTML({ acc: acc, ok: ok, tot: tot, avg: avg, xp: xp, pass: pass, missed: missed, again: "Luyện lượt mới" });
  $("#again").onclick = function () { o.log = []; quiz(o); };
  var wk0 = $("#wk");
  if (wk0) wk0.onclick = function () { curCat = "WEAK"; renderCats(); go("reflex"); };
  return;
}
      body.innerHTML = '<div class="plu-stage"><div class="plu-end g">' +
        '<div class="plu-kicker">' + (o.exam ? "Kết quả sát hạch" : "Hoàn thành") + "</div>" +
        ringSvg(acc / 100, 150, acc + "%", "chính xác") +
        (o.exam ? '<div class="plu-verdict ' + (pass ? "k" : "x") + '">' + (pass ? "Đạt chuẩn đứng quầy" : "Chưa đạt – cần luyện thêm phản xạ") + "</div>" : "") +
        '<div class="plu-mini"><div><b>' + ok + "/" + tot + "</b><span>Đúng</span></div><div><b>" + avg.toFixed(1) + "s</b><span>Tốc độ TB</span></div><div><b>+" + xp + "</b><span>XP phiên</span></div></div>" +
        (missed.length ? '<div class="plu-kicker" style="margin-top:6px">Cần xem lại</div><div class="plu-miss">' + missed.map(chipOf).join("") + "</div>" : "") +
        '<div class="plu-row"><button class="plu-btn pri" id="again">Luyện lượt mới</button>' +
        (missed.length ? '<button class="plu-btn" id="wk">Ôn mã hay sai</button>' : "") + "</div></div></div>";
      $("#again").onclick = function () { o.log = []; quiz(o); };
      var wk = $("#wk");
      if (wk) wk.onclick = function () { curCat = "WEAK"; renderCats(); go("reflex"); };
    }
  }

  /* Dựng HTML màn kết quả sát hạch – CHỈ giao diện, không chứa logic chấm điểm.
   d = { acc, ok, tot, avg, xp, pass, missed[], again } */
/* Dựng HTML màn kết quả sát hạch – CHỈ giao diện, không có logic chấm điểm.
   d = { acc, ok, tot, avg, xp, pass, missed[], again }
   Cấu trúc: 1 thẻ kính gồm [vòng % + 3 chỉ số] → [kết luận] → [mã cần xem lại] → [nút] */
function examResultHTML(d) {
  var missed = d.missed || [];

  /* Danh sách mã sai: mỗi dòng = ô mã + tên hàng */
  var missHtml = missed.length
    ? '<div class="plu-xr-list">' + missed.map(function (m) {
        return '<div class="plu-xr-it"><b>' + m.code + '</b><span>' + esc(m.name) + "</span></div>";
      }).join("") + "</div>"
    : '<div class="plu-xr-clean">Không sai mã nào. Rất tốt!</div>';

  return '<div class="plu-xr">' +
    '<div class="plu-xr-card g">' +
      '<div class="plu-kicker plu-xr-k">Kết quả sát hạch</div>' +

      /* Hàng trên: vòng % bên trái, 3 chỉ số bên phải */
      '<div class="plu-xr-top">' +
        ringSvg(d.acc / 100, 150, d.acc + "%", "chính xác") +
        '<div class="plu-xr-stats">' +
          '<div class="plu-xr-st"><b>' + d.ok + "/" + d.tot + "</b><span>Đúng</span></div>" +
          '<div class="plu-xr-st"><b>' + d.avg.toFixed(1) + "s</b><span>Tốc độ TB</span></div>" +
          '<div class="plu-xr-st"><b>+' + d.xp + "</b><span>XP phiên</span></div>" +
        "</div>" +
      "</div>" +

      /* Kết luận đạt / chưa đạt: một dải ngang trọn chiều rộng thẻ */
      /* Dùng tên class riêng (is-pass / is-fail) để không trùng .k / .x của host */
'<div class="plu-xr-v ' + (d.pass ? "is-pass" : "is-fail") + '">' +
        (d.pass ? "Đạt chuẩn đứng quầy" : "Chưa đạt – cần luyện thêm phản xạ") + "</div>" +

      /* Mã cần xem lại */
      '<div class="plu-xr-hd"><span>Cần xem lại</span><small>' + missed.length + " mã</small></div>" + missHtml +

      /* Nút hành động (giữ nguyên id) */
      '<div class="plu-xr-act">' +
        '<button class="plu-btn pri lg" id="again">' + d.again + "</button>" +
        (missed.length ? '<button class="plu-btn lg" id="wk">Ôn mã hay sai</button>' : "") +
      "</div>" +
    "</div></div>";
}
  function examCounter() {
  var n = Math.min(20, activePool().length);
  if (!window.PLUCounter) return quiz({ type: "input", n: n, time: 6, exam: true, log: [] });
  setHue();
  PLUCounter.start({
    mount: body, items: pick(n), time: 6,
    icon: getIcon, beep: beep,
    setKeys: function (f) { keyHandler = f; },
    onAnswer: function (it, ok, ms, given) { return rec(it.code, ok, ms, ok ? null : given); },
    onFinish: examResult
  });
}
function examResult(r) {
  var acc = Math.round(r.ok / Math.max(r.tot, 1) * 100);
  var oks = r.log.filter(function (l) { return l.ok; });
  var avg = oks.length ? oks.reduce(function (a, l) { return a + l.ms; }, 0) / oks.length / 1000 : 0;
  var pass = acc >= 90 && avg <= 5;
  M.exam = { acc: acc, avg: +avg.toFixed(1), pass: pass, ts: Date.now() }; saveM();
  setHue(acc >= 80 ? 142 : 28);
  /* Chỉ đổi phần dựng giao diện */
  body.innerHTML = examResultHTML({ acc: acc, ok: r.ok, tot: r.tot, avg: avg, xp: r.xp, pass: pass, missed: r.missed, again: "Thi lại" });
  $("#again").onclick = examCounter;
  var wk = $("#wk");
  if (wk) wk.onclick = function () { curCat = "WEAK"; renderCats(); go("reflex"); };
}

  function levelPick(title, sub, run) {
    setHue();
    body.innerHTML = '<div class="plu-stage"><div><div class="plu-kicker">' + sub + '</div><h3 class="plu-h3" style="margin-top:6px">' + title + "</h3></div>" +
      '<button class="plu-choice g" data-h="0"><b>Cơ bản</b><span>Đáp án nhiễu lấy ngẫu nhiên từ toàn bộ danh sách.</span></button>' +
      '<button class="plu-choice g" data-h="1"><b>Nâng cao</b><span>Đáp án nhiễu cùng nhóm hàng hoặc cùng đầu số, dễ nhầm như khi đứng cân thật.</span></button></div>';
    $$("[data-h]").forEach(function (b) { b.onclick = function () { run(b.dataset.h === "1"); }; });
  }

  /* ==========================================================
     3. Màn Hôm nay: kế hoạch thông minh
     ========================================================== */
  function smartPlan() {
    var c = counts();
    if (c.known + c.learn === 0) return { t: "Làm quen 10 mã đầu tiên", s: "Xem hình, đọc tên rồi lật thẻ để nhớ mã. Hệ thống tự lên lịch ôn lại theo độ nhớ của bạn.", cat: "ALL", mode: "visual", limit: 10 };
    if (c.due > 0) return { t: "Ôn " + Math.min(c.due, 12) + " mã đến hạn", s: "Đây là những mã sắp quên. Ôn đúng lúc giúp nhớ lâu hơn và tốn ít thời gian hơn.", cat: "DUE", mode: "reflex" };
    if (c.weak > 0) return { t: "Sửa " + c.weak + " mã hay sai", s: "Luyện gõ lại những mã bạn từng nhầm cho đến khi phản xạ nhanh và chắc.", cat: "WEAK", mode: "reflex" };
    if (c.nw > 0) return { t: "Học thêm " + Math.min(c.nw, 10) + " mã mới", s: "Bạn đã ổn các mã cũ. Mở rộng thêm một nhóm mã mới.", cat: "NEW", mode: "visual", limit: 10 };
    return { t: "Thi thử đứng quầy", s: "Bạn đã thuộc gần hết. Thử bài thi 20 câu để kiểm tra phản xạ thật.", cat: "ALL", mode: "exam" };
  }
  function start(cat, m, limit) { curCat = cat; limitOnce = limit || 0; renderCats(); go(m); }

    function home() {
    setHue();
    var c = counts(), tot = D.length, p100 = tot ? Math.round(c.known / tot * 100) : 0;
    var plan = smartPlan(), ex = M.exam, cats = [];
    D.forEach(function (d) { if (cats.indexOf(d.cat) < 0) cats.push(d.cat); });
    var today = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });
    var lv = p100 ? Math.max(p100, 8) : 0;

    var tiles = [
      ["DUE", "Đến hạn ôn", "Mã sắp quên", c.due, "reflex", "clock"],
      ["WEAK", "Mã hay sai", "Hay bị nhầm", c.weak, "reflex", "alert"],
      ["NEW", "Mã mới", "Chưa học", c.nw, "visual", "spark"]
    ];

    body.innerHTML = '<div class="plu-t">' +

      '<section class="plu-t-hero plu-t-glass">' +
        '<div class="plu-t-copy"><div class="plu-kicker">' + esc(today) + "</div>" +
          "<h3>" + plan.t + "</h3><p>" + plan.s + "</p>" +
          '<button class="plu-btn pri lg plu-t-go" id="go">Bắt đầu' + ic("arrow") + "</button></div>" +
        '<div class="plu-t-orb">' +
          '<div class="plu-t-ball' + (p100 ? "" : " empty") + '" style="--lv:' + lv + '%">' +
            '<div class="plu-t-liq"><svg class="plu-t-wave" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10Q25 0 50 10T100 10T150 10T200 10V20H0Z"/></svg><div class="plu-t-liqb"></div></div>' +
            '<div class="plu-t-bt"><b>' + p100 + "%</b><span>đã nhớ</span></div></div>" +
          '<div class="plu-t-facts"><div><b>' + c.known + "</b><span>đã nhớ</span></div><div><b>" + c.learn + "</b><span>đang học</span></div><div><b>" + c.nw + "</b><span>chưa học</span></div></div>" +
        "</div></section>" +

      '<section class="plu-t-tiles">' + tiles.map(function (s) {
        return '<button class="plu-t-tile plu-t-glass" data-q="' + s[0] + '" data-m="' + s[4] + '"' + (s[3] ? "" : " disabled") + ">" +
          '<span class="plu-t-tico">' + ic(s[5]) + "</span><b>" + s[3] + '</b><span class="plu-t-tlab">' + s[1] + "</span><small>" + s[2] + "</small></button>";
      }).join("") + "</section>" +

      '<div class="plu-t-lower">' +

        '<section class="plu-t-cats plu-t-glass"><div class="plu-t-hd"><div class="plu-kicker">Theo nhóm hàng</div><small>Chạm để luyện riêng</small></div>' +
        '<div class="plu-t-cgrid">' + cats.map(function (cat) {
          var items = D.filter(function (d) { return d.cat === cat; }), k = 0;
          items.forEach(function (d) { if (box(d.code) === 2) k++; });
          return '<button class="plu-t-cat" data-cat="' + esc(cat) + '" style="--p:' + (k / items.length * 100).toFixed(0) + '%">' +
            '<span class="plu-t-cname">' + esc(cat) + '</span><span class="plu-t-ccnt">' + k + "/" + items.length + '</span><i class="plu-t-cbar"></i></button>';
        }).join("") + "</div></section>" +

        '<section class="plu-t-exam plu-t-glass"><div class="plu-kicker">Sát hạch quầy</div>' +
        (ex
          ? '<div class="plu-t-exn"><b>' + ex.acc + "%</b><span>" + ex.avg + 's mỗi câu</span></div><div class="plu-t-badge ' + (ex.pass ? "is-pass" : "is-fail") + '">' + (ex.pass ? "Đạt chuẩn" : "Chưa đạt") + "</div>"
          : '<div class="plu-t-exn"><b>–</b><span>Chưa thi lần nào</span></div>') +
        "<p>Đạt từ 90% và dưới 5 giây mỗi câu.</p>" +
        '<button class="plu-btn lg" id="ex">' + (ex ? "Thi lại" : "Thi thử") + "</button></section>" +

      "</div></div>";

    $("#go").onclick = function () { start(plan.cat, plan.mode, plan.limit); };
    $("#ex").onclick = function () { start("ALL", "exam"); };
    $$(".plu-t-tile").forEach(function (b) {
      b.onclick = function () { start(b.dataset.q, b.dataset.m, b.dataset.q === "NEW" ? 10 : 0); };
    });
    $$(".plu-t-cat").forEach(function (b) {
      b.onclick = function () {
        var items = D.filter(function (d) { return d.cat === b.dataset.cat; });
        var k = items.filter(function (d) { return box(d.code) === 2; }).length;
        start(b.dataset.cat, k / items.length < .6 ? "visual" : "reflex");
      };
    });
  }

  /* ==========================================================
     4. Tiến độ: bản đồ nhiệt + mã hay nhầm lẫn nhau
     ========================================================== */
  function stats() {
    setHue();
    var c = counts(), ok = 0, bad = 0, ms = 0, pts = 0, cats = [];
    D.forEach(function (d) { var r = g(d.code); ok += r.ok; bad += r.bad; ms += r.ms; pts += r.pts; if (cats.indexOf(d.cat) < 0) cats.push(d.cat); });
    var n = ok + bad, lvl = D.length ? c.known / D.length : 0;
    var lv = lvl >= .9 ? "Thành thạo" : lvl >= .5 ? "Vững vàng" : lvl >= .2 ? "Đang tiến bộ" : "Khởi đầu";
    var s = function (v, l) { return '<div class="plu-st g"><b>' + v + "</b><span>" + l + "</span></div>"; };

    var pairs = [];
    D.forEach(function (d) {
      var cf = g(d.code).conf; if (!cf) return;
      Object.keys(cf).forEach(function (k) { pairs.push({ a: d, k: k, b: byCode[k], n: cf[k] }); });
    });
    pairs.sort(function (x, y) { return y.n - x.n; });
    pairs = pairs.slice(0, 6);

    body.innerHTML = '<div class="plu-sts">' +
      s(lv, "Cấp độ") + s(pts, "Tổng XP") + s(n ? Math.round(ok / n * 100) + "%" : "–", "Độ chính xác") +
      s(ok ? (ms / ok / 1000).toFixed(1) + "s" : "–", "Phản xạ TB") + s(c.known + "/" + D.length, "Đã nhớ") +
      s(c.learn, "Đang học") + s(c.due, "Đến hạn ôn") + s(M.best || 0, "Chuỗi dài nhất") + "</div>" +
      '<div class="plu-sec">Bản đồ ghi nhớ<small>chạm vào một mã để xem chi tiết</small></div>' +
      '<div class="plu-legend"><span><i></i>Mới</span><span><i class="l1"></i>Đang học</span><span><i class="l2"></i>Đã nhớ</span><span><i class="l3"></i>Hay sai</span></div>' +
      '<div class="plu-detail g" id="hmd">Chọn một mã bên dưới.</div>' +
      cats.map(function (cat) {
        var items = D.filter(function (d) { return d.cat === cat; });
        var k = items.filter(function (d) { return box(d.code) === 2; }).length;
        return '<div class="plu-hm-grp g"><div class="hd">' + esc(cat) + "<small>" + k + "/" + items.length + '</small></div><div class="plu-hm-g">' +
          items.map(function (d) {
            var st = isWeak(d.code) ? 3 : box(d.code);
            return '<button class="plu-hm l' + st + '" data-c="' + d.code + '" title="' + esc(d.name) + '">' + d.code + "</button>";
          }).join("") + "</div></div>";
      }).join("") +
      '<div class="plu-sec">Mã hay nhầm lẫn nhau</div>' +
      '<div class="plu-cf g">' + (pairs.length ? pairs.map(function (p) {
        return '<div class="plu-cfr"><b>' + p.a.code + '</b><span class="n">' + esc(p.a.name) + '</span><span class="x">bị nhầm với</span><b>' + p.k + '</b><span class="n">' + (p.b ? esc(p.b.name) : "mã ngoài danh sách") + '</span><span class="c">×' + p.n + "</span></div>";
      }).join("") : '<div class="plu-empty">Chưa ghi nhận cặp mã nào bị nhầm.</div>') + "</div>" +
      '<div class="plu-row" style="margin-top:18px"><button class="plu-btn bad" id="rs">Xoá tiến độ học</button></div>';

    $$(".plu-hm").forEach(function (b) {
      b.onclick = function () {
        $$(".plu-hm.sel").forEach(function (x) { x.classList.remove("sel"); });
        b.classList.add("sel");
        var d = byCode[b.dataset.c], r = g(d.code), b2 = box(d.code);
        $("#hmd").innerHTML = "<span><b>" + d.code + "</b>" + esc(d.name) + " · " + LV[b2] + " · đúng " + r.ok + ", sai " + r.bad + (seen(d.code) ? " · " + when(r.due) : "") + "</span>";
      };
    });
    var rs = $("#rs");
    rs.onclick = function () {
      if (!rs.classList.contains("arm")) { rs.classList.add("arm"); rs.textContent = "Bấm lần nữa để xác nhận xoá"; return; }
      P = {}; M = {}; streak = 0; save(); saveM(); updateHeader(); stats();
    };
  }

  /* ==========================================================
     5. Tra cứu
     ========================================================== */
  function list() {
    setHue();
    var issues = D.filter(function (d) { return d.chk || d.dup; }), pool = activePool();
    body.innerHTML = (issues.length ? '<div class="plu-warn"><b>Cần đối chiếu thực tế:</b> ' + issues.map(function (d) {
      return d.code + " " + esc(d.name) + (d.dup ? " (trùng mã với " + esc(d.dup) + ")" : " (ảnh gốc mờ)");
    }).join("; ") + ".</div>" : "") +
      '<div class="plu-sch-wrap"><input class="plu-sch" id="sch" autocomplete="off" inputmode="search" placeholder="Gõ tên không dấu (buoi, sau rieng) hoặc mã PLU"></div>' +
      '<div class="plu-list g" id="ls">' + pool.map(function (d) {
        var b = box(d.code), w = isWeak(d.code);
        return '<div class="plu-li" data-c="' + d.code + '" data-k="' + esc(vnFold(d.name) + " " + vnFold(d.cat)) + '"><b>' + d.code + '</b><span class="n">' + esc(d.name) +
          "<small>" + esc(d.cat) + (d.chk || d.dup ? " · cần đối chiếu" : "") + "</small></span>" +
          '<span class="plu-lv' + (w ? " w" : b === 2 ? " k" : "") + '">' + (w ? "Hay sai" : LV[b]) + "</span></div>";
      }).join("") + '<div class="plu-empty" id="emp" hidden>Không tìm thấy sản phẩm phù hợp.</div></div>';

    var rows = $$(".plu-li"), emp = $("#emp"), sch = $("#sch"), pend = 0;
    function draw() {
      pend = 0;
      var k = vnFold(sch.value.trim()), nk = norm(sch.value), n = 0;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], hit = !k || r.dataset.k.indexOf(k) >= 0 || (nk && r.dataset.c.indexOf(nk) >= 0);
        if (r.hidden === hit) r.hidden = !hit;
        if (hit) n++;
      }
      emp.hidden = n > 0;
    }
    sch.oninput = function () { if (!pend) pend = requestAnimationFrame(draw); };
  }

  /* ---------- điều hướng ---------- */
  var TABS = [
    ["home", "Hôm nay", "home", "Hôm nay", "Kế hoạch ôn tập theo độ nhớ của bạn"],
    ["visual", "Hình ảnh", "cube", "Học bằng hình", "Nhìn hình, đọc tên, lật xem mã"],
    ["flash", "Thẻ lật", "layers", "Thẻ lật", "Tự nhớ mã trước khi lật"],
    ["reflex", "Phản xạ", "bolt", "Phản xạ POS", "Gõ mã trên bàn phím như ở quầy"],
    ["recog", "Chọn mã", "target", "Chọn mã đúng", "Thấy tên hàng, chọn mã"],
    ["rev", "Học ngược", "swap", "Học ngược", "Thấy mã trên cân, đoán tên hàng"],
    ["exam", "Thi quầy", "trophy", "Thi đứng quầy", "Đạt từ 90% và dưới 5 giây mỗi câu"],
    ["stats", "Tiến độ", "chart", "Tiến độ", "Bản đồ ghi nhớ và các mã hay nhầm"],
    ["list", "Tra cứu", "search", "Tra cứu nhanh", "Tìm theo tên không dấu hoặc mã"]
  ];

  function renderCats() {
    var cats = [];
    D.forEach(function (d) { if (cats.indexOf(d.cat) < 0) cats.push(d.cat); });
    var items = [["ALL", "Tất cả (" + D.length + ")"], ["DUE", "Đến hạn"], ["NEW", "Mới"], ["WEAK", "Hay sai"]].concat(cats.map(function (c) { return [c, c]; }));
    catBar.innerHTML = items.map(function (it) {
      return '<button class="plu-cat-chip' + (curCat === it[0] ? " on" : "") + '" data-cat="' + esc(it[0]) + '">' + esc(it[1]) + "</button>";
    }).join("");
    $$(".plu-cat-chip", catBar).forEach(function (btn) {
      btn.onclick = function () { curCat = btn.dataset.cat; renderCats(); go(mode); };
    });
  }

  function go(m) {
    clearInterval(tm); keyHandler = null; mode = m;
    if (window.PLUCounter) PLUCounter.stop();
    $$(".plu-nv").forEach(function (b) { b.classList.toggle("on", b.dataset.m === m); });
    TABS.forEach(function (t) { if (t[0] === m) { titleEl.textContent = t[3]; subEl.textContent = t[4]; } });
    catBar.style.display = (m === "stats" || m === "home") ? "none" : "flex";
    body.scrollTop = 0;
    var lim = limitOnce; limitOnce = 0;
    if (m === "home") home();
    else if (m === "visual") cards(true, lim);
    else if (m === "flash") cards(false, lim);
    else if (m === "reflex") quiz({ type: "input", n: 15, time: 7, log: [] });
    else if (m === "recog") levelPick("Nhận diện mã PLU", "Xem tên mặt hàng, chọn nhanh mã đúng", function (h) { quiz({ type: "opt", n: 12, time: 0, hard: h, log: [] }); });
    else if (m === "rev") levelPick("Học ngược: mã sang tên", "Nhìn mã trên cân, đoán đúng sản phẩm", function (h) { quiz({ type: "name", n: 12, time: 0, hard: h, log: [] }); });
    else if (m === "exam") examCounter();
    else if (m === "stats") stats();
    else list();
  }

  /* ---------- dựng khung ---------- */
  function build() {
    root = document.createElement("div");
    root.id = "plu";
    root.innerHTML =
      '<div class="plu-bg"></div>' +
      '<div class="plu-shell">' +
      '<main class="plu-main">' +
      '<header class="plu-head g"><div class="plu-ttl"><h2 id="plu-t"></h2><span class="plu-sub" id="plu-s"></span></div>' +
      '<div class="plu-pills"><span class="plu-pill" id="plu-str" title="Chuỗi đúng liên tiếp">' + FLAME + "<b>0</b></span>" +
      '<span class="plu-pill" id="plu-pts" title="Tổng XP">' + STAR + "<b>0</b></span></div>" +
      '<button class="plu-ib" id="plu-snd" aria-label="Bật/tắt âm thanh">' + ic("vol") + "</button>" +
      '<button class="plu-ib plu-x" aria-label="Đóng">' + ic("close") + "</button></header>" +
      '<nav class="plu-tabs g" aria-label="Chế độ học">' +
      TABS.map(function (t) { return '<button class="plu-nv" data-m="' + t[0] + '" title="' + t[3] + '">' + ic(t[2]) + "<span>" + t[1] + "</span></button>"; }).join("") + "</nav>" +
      '<div class="plu-cats"></div><div class="plu-body"></div></main></div>';
    document.body.appendChild(root);

    body = $(".plu-body"); catBar = $(".plu-cats"); titleEl = $("#plu-t"); subEl = $("#plu-s");
    $(".plu-x").onclick = close;
    var snd = $("#plu-snd");
    snd.onclick = function () { soundOn = !soundOn; snd.innerHTML = ic(soundOn ? "vol" : "mute"); };
    $$(".plu-nv").forEach(function (b) {
      b.onclick = function () { go(b.dataset.m); b.scrollIntoView && b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); };
    });

    window.addEventListener("keydown", function (e) {
      if (!root || !root.classList.contains("on")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.target && e.target.tagName === "INPUT") return;
      if (keyHandler) keyHandler(e);
    });

    window.addEventListener("resize", scheduleFit);
    window.addEventListener("orientationchange", scheduleFit);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", scheduleFit);
    root.addEventListener("pointerdown", warmAudio, { passive: true });
    renderCats();
    updateHeader();
  }

  /* Tìm các thanh fixed/sticky của host (nav trên/dưới/hai bên) đang nằm trên PLU rồi chừa chỗ.
     Quét theo phần tử (không dò điểm) nên bắt được cả nav dạng viên thuốc nổi cách mép dưới vài chục px. */
  var fitT = 0;
  function scheduleFit() { clearTimeout(fitT); fitT = setTimeout(fitHost, 120); }
  function fitHost() {
    if (!root || !root.classList.contains("on")) return;
    var W = window.innerWidth, H = window.innerHeight, top = 0, bot = 0, lf = 0, rt = 0, GAP = 8;
    var nodes = document.body.querySelectorAll("body > *, body > * > *, body > * > * > *");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el === root || root.contains(el)) continue;
      var cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < .05) continue;
      var z = parseInt(cs.zIndex, 10);
      if (!isNaN(z) && z < 12) continue;                       /* nằm dưới PLU, không che */
      var r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) continue;
      if (r.right <= 0 || r.left >= W || r.bottom <= 0 || r.top >= H) continue;
      if (r.width > W * .9 && r.height > H * .35) continue;    /* lớp phủ toàn màn hình */
      if (r.height > H * .5 && r.width < W * .35) {            /* thanh dọc */
        if (r.left < W * .3) lf = Math.max(lf, r.right + GAP); else if (r.right > W * .7) rt = Math.max(rt, W - r.left + GAP);
      } else if (r.width > W * .4 && r.height < H * .35) {     /* thanh ngang */
        if (r.top > H * .5) bot = Math.max(bot, H - r.top + GAP); else if (r.bottom < H * .5) top = Math.max(top, r.bottom + GAP);
      }
    }
    root.style.setProperty("--fit-top", Math.ceil(top) + "px");
    root.style.setProperty("--fit-bot", Math.ceil(bot) + "px");
    root.style.setProperty("--fit-l", Math.ceil(lf) + "px");
    root.style.setProperty("--fit-r", Math.ceil(rt) + "px");
  }

  /* Nền: vài biểu tượng hàng hoá cỡ lớn, mờ, đặt cố định (kính sẽ khúc xạ chúng) */
  function fillBg() {
    var bg = $(".plu-bg"); if (!bg) return;
    var seenE = {}, pool = [];
    shuffle(D).forEach(function (d) { var e = getIcon(d); if (e !== "🏷️" && !seenE[e]) { seenE[e] = 1; pool.push(e); } });
    var slots = [[5, 10, 130, -14], [76, 6, 160, 12], [38, 32, 96, 8], [88, 44, 120, -10], [8, 56, 150, 10],
                 [56, 64, 130, -8], [26, 84, 110, 14], [82, 86, 140, -12], [46, 4, 90, -6]];
    bg.innerHTML = slots.map(function (s, i) {
      return pool[i] ? '<span style="left:' + s[0] + "%;top:" + s[1] + "%;font-size:" + s[2] + "px;transform:rotate(" + s[3] + 'deg)">' + pool[i] + "</span>" : "";
    }).join("");
  }
  function open(m) {
    D = window.PLU_SOURCE || D;
    reindex();
    if (!root) build(); else renderCats();
    fillBg();
    root.classList.add("on");
    fitHost(); setTimeout(fitHost, 450); setTimeout(fitHost, 1400);
    updateHeader();
    go(m || mode);
  }
  function close() {
    clearTimeout(tm); keyHandler = null; flush();
    if (root) root.classList.remove("on");
    if (window.PLUCounter) PLUCounter.stop();
  }

  window.PLUTraining = {
    open: open,
    close: close,
    isOpen: function () { return !!(root && root.classList.contains("on")); }
  };
})();