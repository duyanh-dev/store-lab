/* ==========================================================================
   PLU COUNTER – Quầy POS cho chế độ "Thi đứng quầy"  (v2: tách engine / view)

   Engine lo luồng thi: lấy món từ rổ → quét (không có mã vạch) → nhập PLU → bỏ vào túi.
   "View" lo phần nhìn: có 2 view có sẵn
     · "gl"  (plu-counter-gl.js, Three.js)  – quầy 3D thật, ánh sáng + bóng + camera
     · "css" (trong file này)               – quầy giả 3D bằng CSS, dùng làm dự phòng
   cfg.renderer = "auto" (mặc định: thử gl, lỗi/chậm thì tự rơi về css) | "gl" | "css"

   API:
     PLUCounter.start({ mount, items, time, icon, beep, setKeys, onAnswer, onFinish, cfg? })
     PLUCounter.stop()
     PLUCounter.config      // { split:70, autoPick:true, tilt:60, renderer:"auto", threeUrl:"" }
     PLUCounter.registerPOS(fn)          // thay giao diện máy POS
     PLUCounter.registerView(name, fn)   // thêm/thay view (gl tự đăng ký)

   ---------- HỢP ĐỒNG GIAO DIỆN POS ----------
   registerPOS(function factory(mount, cfg, api) { ...; return hooks; })
     mount : phần tử DOM rỗng nằm trong màn hình máy POS
     cfg   : { split }  tỉ lệ cột trái (%)
     api   : { press(key) }  key = "0".."9" | "CLR" | "OK"
     hooks : setState(kind,text) · clearItem() · showItem(item,{kg,icon}) · setInput(typed,len,state)
             reveal(item,good,given,gain,ms) · addLine({code,name,kg,ok}) · startTimer(ms) · stopTimer()
             flashKey(key) · destroy()

   ---------- HỢP ĐỒNG VIEW ----------
   registerView(name, function factory(sceneEl, ctx) { return view | Promise<view> | null })
     ctx   : { items, icon(item), cfg, alive() }
     view  : { posMount, setRest(restItems), pick(item)→ms, scanStart(), scanFail(), scanClear(),
               result(good), bag()→ms, ready(on), onBasket(fn), destroy() }
   ========================================================================== */
(function () {
  "use strict";

  var CFG = { split: 70, autoPick: true, tilt: 60, renderer: "auto", threeUrl: "" };
  var sess = null;
  var posFactory = defaultPOS;
  var views = {};

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function ext(t) {
    for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) t[k] = s[k]; }
    return t;
  }

  /* ==========================================================
     GIAO DIỆN POS MẶC ĐỊNH: trái 70% thông tin món, phải 30% bàn phím + màn hình nhập
     ========================================================== */
  function defaultPOS(mount, cfg, api) {
    var KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "OK"];
    var clock = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    mount.innerHTML =
      '<div class="pos" style="--pos-l:' + cfg.split + "fr;--pos-r:" + (100 - cfg.split) + 'fr">' +
      '<div class="pos-tm"><i></i></div>' +
      '<section class="pos-l">' +
      '<div class="pos-bar"><span>QUẦY <b>03</b></span><span>THU NGÂN <b>BẠN</b></span><span>' + clock + '</span><span class="pos-state wait">Chờ hàng</span></div>' +
      '<div class="pos-item"><div class="pos-pic">🛒</div><div class="pos-info"><div class="pos-nm">Chờ món tiếp theo</div>' +
      '<div class="pos-meta">Hàng không có mã vạch sẽ hiện ở đây</div><div class="pos-ans"></div></div></div>' +
      '<div class="pos-rcpt"><div class="pos-rh"><span>Mã</span><span>Tên hàng</span><span style="text-align:right">Cân (kg)</span><span></span></div><div class="pos-rls"></div></div>' +
      "</section>" +
      '<section class="pos-r"><div class="pos-lcd"><small>Nhập mã PLU</small><div class="pos-lcd-v"></div></div><div class="pos-pad">' +
      KEYS.map(function (k) {
        var cls = k === "CLR" ? " fn" : k === "OK" ? " ok" : "";
        return '<button class="pos-k' + cls + '" data-k="' + k + '">' + (k === "CLR" ? "Xoá" : k === "OK" ? "Nhập" : k) + "</button>";
      }).join("") + "</div></section></div>";

    var q = function (s) { return mount.querySelector(s); };
    var st = q(".pos-state"), pic = q(".pos-pic"), nm = q(".pos-nm"), meta = q(".pos-meta"), ans = q(".pos-ans");
    var lcd = q(".pos-lcd"), lcdV = q(".pos-lcd-v"), rls = q(".pos-rls"), tmI = q(".pos-tm i");

    Array.prototype.forEach.call(mount.querySelectorAll(".pos-k"), function (b) {
      b.onclick = function () { api.press(b.dataset.k); };
    });

    return {
      setState: function (kind, text) { st.className = "pos-state " + kind; st.textContent = text; },
      clearItem: function () {
        pic.innerHTML = "🛒"; nm.textContent = "Chờ món tiếp theo"; meta.textContent = "Hàng không có mã vạch sẽ hiện ở đây"; ans.innerHTML = "";
      },
      showItem: function (it, m) {
        pic.innerHTML = it.img ? '<img alt="" src="' + esc(it.img) + '">' : (m.icon || "🏷️");
        nm.textContent = it.name;
        meta.textContent = it.cat + " · " + m.kg + " kg · bán theo cân";
        ans.innerHTML = "";
      },
      setInput: function (typed, len, state) {
        var h = "";
        for (var j = 0; j < len; j++) {
          h += typed[j] ? "<span>" + typed[j] + "</span>" : '<span class="p' + (j === typed.length && !state ? " cur" : "") + '">•</span>';
        }
        lcdV.innerHTML = h;
        lcd.className = "pos-lcd" + (state ? " " + state : "");
      },
      reveal: function (it, good, given, gain, ms, why) {
  ans.innerHTML = good
    ? '<b class="g">Đúng · ' + (ms / 1000).toFixed(1) + "s · +" + gain + " XP</b>"
    : '<b class="r">Đáp án <code>' + it.code + "</code></b>" + (given ? " · bạn nhập " + esc(given) : why === "skip" ? " · bạn bỏ qua" : " · hết giờ");
},
      addLine: function (l) {
        var r = document.createElement("div");
        r.className = "pos-rl";
        r.innerHTML = '<span class="c">' + l.code + '</span><span class="n">' + esc(l.name) + '</span><span class="w">' + l.kg +
          '</span><span class="k ' + (l.ok ? "y" : "x") + '">' + (l.ok ? "✓" : "✗") + "</span>";
        rls.appendChild(r);
        while (rls.children.length > 8) rls.removeChild(rls.firstChild);
      },
      startTimer: function (ms) {
        tmI.style.transition = "none"; tmI.style.transform = "scaleX(1)"; void tmI.offsetWidth;
        tmI.style.transition = "transform " + ms + "ms linear"; tmI.style.transform = "scaleX(0)";
      },
      stopTimer: function () {
        var tr = getComputedStyle(tmI).transform; tmI.style.transition = "none"; tmI.style.transform = tr;
      },
      flashKey: function (k) {
        var el = mount.querySelector('.pos-k[data-k="' + k + '"]');
        if (el) { el.classList.add("hit"); setTimeout(function () { el.classList.remove("hit"); }, 90); }
      },
      destroy: function () { mount.innerHTML = ""; }
    };
  }

  /* ==========================================================
     VIEW "css": quầy giả 3D bằng CSS (dự phòng khi không có WebGL)
     ========================================================== */
  function cssView(sceneEl, ctx) {
    var icon = ctx.icon, timers = [], cleanups = [];
    var vlater = function (fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; };

    sceneEl.className = "pc-scene";
    sceneEl.innerHTML =
      '<div class="pc-world">' +
      '<div class="pc-wall"></div>' +
      '<div class="pc-mon"><div class="pc-bezel"><div class="pc-screen"></div></div><div class="pc-neck"></div><div class="pc-foot"></div></div>' +
      '<div class="pc-deck"><div class="pc-top">' +
      '<div class="pc-belt"></div><div class="pc-scan"><i></i></div><div class="pc-bagzone"></div>' +
      '<i class="pc-shadow" style="left:19%;top:70%;width:170px"></i><i class="pc-shadow" style="left:83%;top:72%;width:110px"></i>' +
      '<div class="pc-basket"><div class="pc-bk-handle"></div><div class="pc-bk-pile"></div><div class="pc-bk-body"></div><div class="pc-bk-rim"></div><div class="pc-bk-n"></div></div>' +
      '<div class="pc-bag"><div class="pc-bag-h"></div><div class="pc-bag-b">0</div></div>' +
      "</div></div></div>";

    var $ = function (sel) { return sceneEl.querySelector(sel); };


    function setSkip(mode) {                       /* "dont" | "next" | "" */
  skip.hidden = !mode;
  skip.className = "plu-btn sm pc-skip " + (mode || "");
  skip.innerHTML = mode === "dont" ? "Không biết" : 'Tiếp<kbd>Enter</kbd>';
}


    var world = $(".pc-world"), top = $(".pc-top");
    var scanner = $(".pc-scan"), belt = $(".pc-belt"), basket = $(".pc-basket"), pile = $(".pc-bk-pile"), bkN = $(".pc-bk-n");
    var bag = $(".pc-bag"), bagB = $(".pc-bag-b");
    var PT = { basket: [0.19, 0.70], scan: [0.51, 0.64], bag: [0.83, 0.72] };
    var curEl = null, bagN = 0;

    function put(el, pt) {
      el._pt = pt;
      el.style.transform = "translate3d(" + (pt[0] * top.offsetWidth).toFixed(1) + "px," + (pt[1] * top.offsetHeight).toFixed(1) + "px,0)";
    }
    function bodyOf(el) { return el.firstChild.nextSibling; }

    var onResize = function () { if (curEl && curEl._pt) put(curEl, curEl._pt); };
    window.addEventListener("resize", onResize);
    cleanups.push(function () { window.removeEventListener("resize", onResize); });

    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches, raf = 0;
    if (!reduce) {
      var onMove = function (e) {
        if (e.pointerType !== "mouse" || raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = sceneEl.getBoundingClientRect();
          var nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2));
          var ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2));
          world.style.transform = "perspective(1600px) rotateX(" + (ny * -1.4).toFixed(2) + "deg) rotateY(" + (nx * 2.2).toFixed(2) + "deg)";
        });
      };
      var onLeave = function () { world.style.transform = ""; };
      sceneEl.addEventListener("pointermove", onMove);
      sceneEl.addEventListener("pointerleave", onLeave);
      cleanups.push(function () { cancelAnimationFrame(raf); sceneEl.removeEventListener("pointermove", onMove); sceneEl.removeEventListener("pointerleave", onLeave); });
    }

    return {
      kind: "css",
      posMount: $(".pc-screen"),
      setRest: function (rest) {
        pile.innerHTML = rest.slice(0, 4).map(function (it) { return "<span>" + icon(it) + "</span>"; }).join("");
        bkN.textContent = rest.length ? "Còn " + rest.length : "Hết hàng";
      },
      ready: function (on) { basket.classList.toggle("ready", !!on); },
      onBasket: function (fn) { basket.onclick = fn; },
      pick: function (it) {
        var el = curEl = document.createElement("div");
        el.className = "pc-it";
        el.innerHTML = '<i class="pc-it-sh"></i><div class="pc-it-b">' + (it.img ? '<img alt="" src="' + esc(it.img) + '">' : icon(it)) + "</div>";
        top.appendChild(el);
        put(el, PT.basket); void el.offsetWidth;
        bodyOf(el).classList.add("hop");
        put(el, PT.scan); belt.classList.add("run");
        vlater(function () { belt.classList.remove("run"); bodyOf(el).classList.add("big"); }, 640);
        return 650;
      },
      scanStart: function () { scanner.classList.remove("fail"); scanner.classList.add("on"); },
      scanFail: function () { scanner.classList.remove("on"); scanner.classList.add("fail"); },
      scanClear: function () { scanner.classList.remove("on", "fail"); },
      result: function () {},
      bag: function () {
        var el = curEl, b = bodyOf(el);
        b.classList.remove("big", "hop"); void b.offsetWidth; b.classList.add("hop");
        put(el, PT.bag);
        vlater(function () {
          b.classList.add("gone"); bagN++; bagB.textContent = bagN;
          bag.classList.remove("pop"); void bag.offsetWidth; bag.classList.add("pop");
        }, 560);
        vlater(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
        return 820;
      },
      destroy: function () {
        timers.forEach(clearTimeout);
        cleanups.forEach(function (f) { try { f(); } catch (e) {} });
      }
    };
  }

  /* ==========================================================
     ENGINE
     ========================================================== */
  function start(o) {
    stop();
    var items = o.items || [], N = items.length, cfg = ext({}, CFG, o.cfg), lim = (o.time || 0) * 1000;
    var mount = o.mount;
    if (!N) { if (o.onFinish) o.onFinish({ ok: 0, tot: 0, log: [], missed: [], xp: 0 }); return; }

    var s = sess = { dead: false, timers: [], cleanups: [], posObj: null, view: null, o: o };
    var icon = function (it) { return o.icon ? o.icon(it) : "🏷️"; };
    var beep = function (t) { if (o.beep) o.beep(t); };

    mount.innerHTML =
      '<div class="pc" style="--tilt:' + cfg.tilt + 'deg">' +
      '<div class="pc-hud"><div class="plu-pips">' + new Array(N + 1).join("<i></i>") + '</div><span class="pc-tag"></span>' +
      '<button class="plu-btn sm pc-skip" hidden>Tiếp<kbd>Enter</kbd></button></div>' +
      '<div class="pc-scene"></div>' +
      '<div class="pc-help"><b>0–9</b> nhập mã · <b>Backspace</b> xoá · <b>Enter</b> xác nhận · hết giờ tính là sai</div></div>';

    var $ = function (sel) { return mount.querySelector(sel); };
    var sceneEl = $(".pc-scene"), tag = $(".pc-tag"), skip = $(".pc-skip"), pips = mount.querySelectorAll(".plu-pips i");

    function setSkip(mode) {                       /* "dont" | "next" | "" */
  skip.hidden = !mode;
  skip.className = "plu-btn sm pc-skip " + (mode || "");
  skip.innerHTML = mode === "dont" ? "Không biết" : 'Tiếp<kbd>Enter</kbd>';
}

    /* --- trạng thái phiên --- */
    var view = null, pos = null;
    var i = -1, cur = null, typed = "", len = 3, t0 = 0, state = "idle";
    var ok = 0, tot = 0, xp = 0, log = [], missed = [], proceeded = false, advT = 0, kg = "0.000", wrongWait = false;

    function later(fn, ms) {
      var id = setTimeout(function () { if (sess === s && !s.dead) fn(); }, ms);
      s.timers.push(id); return id;
    }

    /* --- chọn view: gl nếu có và nạp kịp, không thì css --- */
    var ctx = { items: items, icon: icon, cfg: cfg, alive: function () { return !s.dead && !decided; } };
var decided = false;
function useView(v) {
  if (s.dead) { if (v && v.destroy) v.destroy(); return; }
  decided = true; view = s.view = v; init();
}
/* Hiển thị màn hình chờ (không có nút lỗi, không có chữ "không tải được") */
function showLoading() {
  if (s.dead) return;
  sceneEl.className = "pc-scene loading";
  sceneEl.innerHTML = '<div class="pc-loading">Đang dựng quầy 3D…</div>';
}

/* Dùng view CSS dự phòng, im lặng, không báo lỗi */
function useFallback() {
  if (s.dead || decided) return;
  try { useView(cssView(sceneEl, ctx)); } catch (e) { console.error("PLUCounter: view CSS lỗi", e); }
}

/* Chọn view: thử GL nhiều lần ngầm, xong thì hiển thị, hết lượt thì dùng CSS */
function chooseView() {
  if (cfg.renderer === "css" || !views.gl) return useFallback();

  var MAX_TRIES = 3;          /* số lần thử GL */
  var TIMEOUT = 15000;        /* tối đa 15s mỗi lần */
  var tries = 0;

  showLoading();

  /* Một lần thử dựng GL */
  function attempt() {
    if (s.dead || decided) return;
    tries++;
    var settled = false;

    /* Quá thời gian thì bỏ lần này, thử lại hoặc dùng CSS */
    var timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      retryOrFallback(new Error("GL timeout"));
    }, TIMEOUT);
    s.timers.push(timer);

    Promise.resolve()
      .then(function () { return views.gl(sceneEl, ctx); })
      .then(function (v) {
        clearTimeout(timer);
        /* Trả về trễ sau khi đã timeout/đóng: huỷ để không rò rỉ context */
        if (settled || s.dead || decided) { if (v && v.destroy) v.destroy(); return; }
        settled = true;
        if (!v) return retryOrFallback(new Error("GL view null"));
        useView(v);           /* WebGL xong → hiển thị ngay */
      })
      .catch(function (e) {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        retryOrFallback(e);
      });
  }

  /* Thử lại sau một khoảng ngắn, hết lượt thì dùng CSS */
  function retryOrFallback(err) {
    try { console.warn("PLUCounter: GL lần " + tries + " lỗi", err); } catch (_) {}
    if (s.dead || decided) return;
    if (tries < MAX_TRIES) {
      showLoading();
      later(attempt, 800 * tries);
    } else {
      useFallback();
    }
  }

  attempt();
}
chooseView();

    function updatePile() {
      var from = state === "idle" || state === "await" || state === "fetch" ? i : i + 1;
      view.setRest(items.slice(Math.max(from, 0)));
    }

    function next() {
      i++; proceeded = false; wrongWait = false; typed = "";
      if (i >= N) return finish();
      cur = items[i]; len = cur.code.length || 3; state = "fetch";
      Array.prototype.forEach.call(pips, function (p, j) { if (j === i) p.className = "cur"; });
      tag.textContent = "Món " + (i + 1) + "/" + N;
      updatePile();
      pos.setState("wait", "Chờ hàng"); pos.clearItem(); pos.setInput("", len, "");
      if (cfg.autoPick) later(function () { state = "await"; pick(); }, 450);
      else { state = "await"; view.ready(true); }
    }

    function pick() {
      if (state !== "await") return;
      state = "moving"; view.ready(false); updatePile();
      var d = view.pick(cur); beep("tap");
      later(scan, d);
    }

    function scan() {
      state = "scan"; view.scanStart();
      pos.setState("scan", "Đang quét…");
      beep("tap");
      later(function () {
        view.scanFail();
        beep("tap"); later(function () { beep("tap"); }, 110);
        kg = (0.18 + Math.random() * 2.1).toFixed(3);
pos.setState("nobar", "Không có mã vạch");
        pos.showItem(cur, { kg: kg, icon: icon(cur) });
        pos.setInput("", len, "");
        state = "type"; t0 = Date.now();
        setSkip("dont");
        if (lim) { pos.startTimer(lim); s.limT = later(function () { answer(false, ""); }, lim); }
      }, 700);
    }

    function press(k) {
      if (state !== "type") return;
      beep("tap");
      if (k === "CLR") { typed = typed.slice(0, -1); pos.setInput(typed, len, ""); }
      else if (k === "OK") { if (typed.length) answer(typed === cur.code, typed); }
      else if (/^\d$/.test(k) && typed.length < len) {
        typed += k; pos.setInput(typed, len, "");
        if (typed.length === len) later(function () { if (state === "type" && typed.length === len) answer(typed === cur.code, typed); }, 90);
      }
    }

    function answer(good, given, why) {
  if (state !== "type") return;
  state = "result"; clearTimeout(s.limT); pos.stopTimer();
  var ms = lim && !given && !good && !why ? lim : Date.now() - t0;
  tot++; if (good) ok++; else missed.push(cur);
  log.push({ ok: good, ms: ms });
  var gain = (o.onAnswer ? o.onAnswer(cur, good, ms, good ? null : given) : 0) || 0;
  xp += gain;
  if (pips[i]) pips[i].className = good ? "ok" : "no";
  pos.setInput(good ? cur.code : typed, len, good ? "good" : "bad");
  pos.reveal(cur, good, given, gain, ms, why);
  pos.setState(good ? "ok" : "bad", good ? "Đã thêm vào hoá đơn" : (given ? "Sai mã PLU" : why === "skip" ? "Bỏ qua" : "Hết giờ"));
  pos.addLine({ code: cur.code, name: cur.name, kg: kg, ok: good });
  view.scanClear(); view.result(good);
  if (good) { setSkip(""); later(proceed, 450); }
  else { wrongWait = true; setSkip("next"); advT = later(proceed, 2600); }
}

    function proceed() {
      if (proceeded || state !== "result") return;
      proceeded = true; wrongWait = false; clearTimeout(advT); setSkip("");
      state = "bag";
      var d = view.bag();
      later(next, d);
    }

    function finish() {
      state = "end"; updatePile();
      later(function () {
        var r = { ok: ok, tot: tot, log: log, missed: missed, xp: xp };
        teardown(s);
        if (o.onFinish) o.onFinish(r);
      }, 500);
    }

    function init() {
      sceneEl.classList.remove("loading");
      var api = { press: function (k) { press(k); } };
      pos = s.posObj = posFactory(view.posMount, { split: cfg.split }, api);
skip.onclick = function () { if (state === "type") answer(false, "", "skip"); else proceed(); };
      view.onBasket(function () { if (state === "await") pick(); });

      if (o.setKeys) o.setKeys(function (e) {
        if (e.repeat) return;
        if (state === "await") { if (e.key === " " || e.key === "Enter") { e.preventDefault(); pick(); } return; }
        if (state === "type") {
          if (/^\d$/.test(e.key)) { pos.flashKey(e.key); press(e.key); }
          else if (e.key === "Backspace") { pos.flashKey("CLR"); press("CLR"); }
          else if (e.key === "Enter") { e.preventDefault(); pos.flashKey("OK"); press("OK"); }
          return;
        }
        if (state === "result" && wrongWait && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); proceed(); }
      });

      updatePile();
      next();
    }
  }

  function teardown(s) {
    if (!s || s.dead) return;
    s.dead = true;
    s.timers.forEach(clearTimeout);
    s.cleanups.forEach(function (f) { try { f(); } catch (e) {} });
    try { if (s.posObj && s.posObj.stopTimer) s.posObj.stopTimer(); } catch (e) {}
    try { if (s.view && s.view.destroy) s.view.destroy(); } catch (e) {}
    if (s.o && s.o.setKeys) s.o.setKeys(null);
    if (sess === s) sess = null;
  }
  function stop() { teardown(sess); }

  window.PLUCounter = {
    start: start,
    stop: stop,
    config: CFG,
    registerPOS: function (fn) { posFactory = typeof fn === "function" ? fn : defaultPOS; },
    registerView: function (name, fn) { if (typeof fn === "function") views[name] = fn; else delete views[name]; }
  };
})();