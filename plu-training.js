/* PLU Training – Liquid Glass 3D Edition
   Đọc dữ liệu từ window.PLU_SOURCE ([{code,name,cat,img?,chk?,dup?}]).
   Tiến độ lưu tại localStorage "plu.prog". */
(function () {
  var D = window.PLU_SOURCE || [],
    KEY = "plu.prog",
    root,
    body,
    catBar,
    mode = "visual",
    curCat = "ALL",
    streak = 0,
    soundOn = true,
    P = {},
    tm,
    keyHandler;

  try {
    P = JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch (e) {
    P = {};
  }

  var $ = function (s, r) { return (r || root).querySelector(s); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {}
  };
  var g = function (c) {
    return P[c] || (P[c] = { ok: 0, bad: 0, ms: 0, pts: 0 });
  };
  var norm = function (s) { return String(s || "").replace(/\D/g, ""); };

  /* Bỏ dấu tiếng Việt để tra cứu nhanh (gõ "buoi" ra "Bưởi da xanh") */
  function vnFold(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  }

  /* Âm thanh phản hồi nhẹ bằng Web Audio API (không cần file mp3) */
  var actx;
  function beep(type) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), gain = actx.createGain();
      o.connect(gain);
      gain.connect(actx.destination);
      var now = actx.currentTime;
      if (type === "ok") {
        o.type = "sine";
        o.frequency.setValueAtTime(587.33, now);
        o.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        o.start(now);
        o.stop(now + 0.18);
      } else if (type === "bad") {
        o.type = "triangle";
        o.frequency.setValueAtTime(220, now);
        o.frequency.linearRampToValueAtTime(140, now + 0.22);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        o.start(now);
        o.stop(now + 0.25);
      } else {
        o.type = "sine";
        o.frequency.setValueAtTime(420, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        o.start(now);
        o.stop(now + 0.04);
      }
    } catch (e) {}
  }

  /* Tự động nhận diện Emoji minh họa theo tên & danh mục sản phẩm */
  function getIcon(it) {
    var n = vnFold(it.name), c = vnFold(it.cat);
    if (/chuoi/.test(n)) return "🍌";
    if (/tao/.test(n)) return "🍎";
    if (/cam|quyt|buoi/.test(n)) return "🍊";
    if (/dua hau|dua luoi/.test(n)) return "🍉";
    if (/nho/.test(n)) return "🍇";
    if (/xoai|du du/.test(n)) return "🥭";
    if (/dao/.test(n)) return "🍑";
    if (/le|oi/.test(n)) return "🍐";
    if (/dua xiem/.test(n)) return "🥥";
    if (/bo/.test(n)) return "🥑";
    if (/chanh/.test(n)) return "🍋";
    if (/ca chua/.test(n)) return "🍅";
    if (/ca rot/.test(n)) return "🥕";
    if (/bap my/.test(n)) return "🌽";
    if (/ot/.test(n)) return "🌶️";
    if (/khoai/.test(n)) return "🍠";
    if (/dua leo|bau|bi|muop|su su|kho qua/.test(n)) return "🥒";
    if (/cai|rau|gia/.test(n)) return "🥬";
    if (/hanh|gung|sa/.test(n)) return "🧅";
    if (/trung/.test(c)) return "🥚";
    if (/gao/.test(c)) return "🌾";
    if (/bun|dau hu/.test(c)) return "🍜";
    if (/kem/.test(n)) return "🍦";
    if (/xuc xich|doi sun|pho mai/.test(n)) return "🌭";
    if (/tra|ngu coc/.test(n)) return "🍵";
    if (/keo|socola/.test(n)) return "🍬";
    if (/banh|bap rang/.test(n)) return "🥮";
    if (/thach|rau cau/.test(c)) return "🍮";
    if (/non-food/.test(c)) return "🧴";
    return "🏷️";
  }

  function box(c) {
    var r = g(c), n = r.ok + r.bad;
    if (!n) return 0;
    var acc = r.ok / n, avg = r.ms / Math.max(r.ok, 1);
    return r.ok >= 3 && acc >= 0.8 && avg <= 4500 ? 2 : 1;
  }
  var LV = ["Chưa nhớ", "Đang học", "Đã nhớ"];

  function totalPts() {
    return D.reduce(function (s, d) { return s + g(d.code).pts; }, 0);
  }

  function updateHeader() {
    if (!root) return;
    var ptsEl = $("#plu-pts"), strEl = $("#plu-str");
    if (ptsEl) ptsEl.textContent = "⭐ " + totalPts();
    if (strEl) {
      strEl.textContent = "🔥 " + streak;
      strEl.classList.toggle("fire", streak >= 3);
    }
  }

  function rec(c, ok, ms) {
    var r = g(c);
    if (ok) {
      r.ok++;
      r.ms += ms;
      streak++;
      var bonus = Math.min(15, streak * 2);
      r.pts += 10 + Math.max(0, Math.round(5 - ms / 1000)) + bonus;
      beep("ok");
    } else {
      r.bad++;
      streak = 0;
      beep("bad");
    }
    save();
    updateHeader();
  }

  /* Lọc danh sách theo danh mục đang chọn */
  function activePool() {
    if (curCat === "ALL") return D.slice();
    if (curCat === "WEAK") {
      var w = D.filter(function (d) { return g(d.code).bad > 0 || box(d.code) === 1; });
      return w.length >= 4 ? w : D.slice();
    }
    var flt = D.filter(function (d) { return d.cat === curCat; });
    return flt.length ? flt : D.slice();
  }

  function pick(n, ex) {
    var base = activePool().filter(function (d) { return !ex || ex.indexOf(d.code) < 0; });
    var out = [];
    while (out.length < n && base.length) {
      var w = base.map(function (d) {
        var r = g(d.code), b = box(d.code);
        return 1 + r.bad * 2.5 + (b === 0 ? 2.2 : b === 1 ? 1.2 : 0);
      });
      var t = w.reduce(function (a, b) { return a + b; }, 0) * Math.random(), i = 0;
      while (i < base.length - 1 && (t -= w[i]) > 0) i++;
      out.push(base.splice(i, 1)[0]);
    }
    return out;
  }

  function shuffle(a) {
    var arr = a.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function distract(it, hard) {
    var near = D.filter(function (d) {
      return d.code !== it.code && (hard ? d.cat === it.cat || d.code[0] === it.code[0] : true);
    });
    if (near.length < 3) near = D.filter(function (d) { return d.code !== it.code; });
    return shuffle(near).slice(0, 3);
  }

  function img(it) {
    var b = box(it.code);
    return (
      '<span class="plu-badge-lv' + (b === 2 ? " lv2" : "") + '">' + LV[b] + "</span>" +
      '<div class="plu-img">' +
      (it.img ? '<img alt="" src="' + esc(it.img) + '">' : getIcon(it)) +
      "</div>"
    );
  }

  /* ---------- 1. Thẻ học 3D (Visual / Flashcard) ---------- */
  function cards(visual) {
    var q = pick(Math.min(15, activePool().length)), i = 0;
    (function next() {
      keyHandler = null;
      if (i >= q.length) {
        body.innerHTML =
          '<div class="plu-stage"><div class="plu-card">' +
          '<div class="plu-img">🎉</div>' +
          '<div class="nm2">Hoàn thành lượt học!</div>' +
          '<div class="cat">Các mã chưa thuộc sẽ được ưu tiên lặp lại thông minh.</div>' +
          '<div class="plu-row"><button class="plu-btn pri" id="again">Học lượt mới</button></div>' +
          "</div></div>";
        $("#again").onclick = function () { cards(visual); };
        return;
      }
      var it = q[i], flipped = false;
      body.innerHTML =
        '<div class="plu-bar"><i style="width:' + (i / q.length) * 100 + '%"></i></div>' +
        '<div class="plu-stage">' +
        '<div class="plu-card plu-flip-wrap" id="fcard">' +
        '<div class="plu-flip-inner">' +
        (visual ? img(it) : '<span class="plu-badge-lv">' + (i + 1) + "/" + q.length + "</span>") +
        '<div class="cat">' + (i + 1) + "/" + q.length + " · " + esc(it.cat) + "</div>" +
        '<div class="nm2">' + esc(it.name) + "</div>" +
        '<div class="plu-face-back" id="ans-box" style="opacity:.18;filter:blur(8px);transition:all .28s">' +
        '<div class="cat">MÃ PLU CHUẨN</div>' +
        '<div class="big">' + esc(it.code) + "</div>" +
        "</div>" +
        "</div>" +
        '<div class="plu-row" id="ctl"><button class="plu-btn pri" id="flip">Lật xem mã (Space)</button></div>' +
        "</div></div>";

      function doFlip() {
        if (flipped) return;
        flipped = true;
        beep("tap");
        var ab = $("#ans-box");
        if (ab) { ab.style.opacity = "1"; ab.style.filter = "none"; }
        $("#ctl").innerHTML =
          '<button class="plu-btn bad" id="n">Chưa nhớ (1)</button>' +
          '<button class="plu-btn pri" id="y">Đã thuộc (2)</button>';
        $("#n").onclick = function (e) { e.stopPropagation(); rec(it.code, false, 4000); i++; next(); };
        $("#y").onclick = function (e) { e.stopPropagation(); rec(it.code, true, 2500); i++; next(); };
      }

      $("#flip").onclick = function (e) { e.stopPropagation(); doFlip(); };
      $("#fcard").onclick = function () { if (!flipped) doFlip(); };
      keyHandler = function (e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!flipped) doFlip(); else if ($("#y")) $("#y").click(); }
        else if (flipped && (e.key === "1" || e.key === "ArrowLeft")) $("#n").click();
        else if (flipped && (e.key === "2" || e.key === "ArrowRight")) $("#y").click();
      };
    })();
  }

  /* ---------- 2. Bài hỏi: Nhập mã POS Numpad / Trắc nghiệm ---------- */
  function quiz(o) {
    var q = pick(Math.min(o.n, activePool().length)),
      i = 0,
      ok = 0,
      tot = 0,
      hard = o.hard;

    (function next() {
      clearInterval(tm);
      keyHandler = null;
      if (i >= q.length) return done();

      var it = q[i],
        t0 = Date.now(),
        lim = o.time * 1000,
        typed = "",
        fin = false,
        len = it.code.length || 3;

      var leftCard =
        '<div class="plu-card">' +
        (o.type !== "name" ? img(it) : '<div class="plu-img">🔢</div>') +
        '<div class="cat">Câu ' + (i + 1) + "/" + q.length + " · " + esc(o.type === "name" ? "Tìm tên sản phẩm" : it.cat) + "</div>" +
        '<div class="' + (o.type === "name" ? "big" : "nm2") + '">' + esc(o.type === "name" ? it.code : it.name) + "</div>" +
        (o.time ? '<div class="plu-bar t"><i id="tb" style="width:100%"></i></div>' : "") +
        (o.type === "input"
          ? '<div class="plu-pos-screen" id="scr">' +
            Array.from({ length: len }).map(function () { return '<div class="plu-digit">_</div>'; }).join("") +
            "</div>"
          : "") +
        '<div class="plu-fb" id="fb"></div>' +
        "</div>";

      var rightPanel = "";
      if (o.type === "input") {
        rightPanel =
          '<div class="plu-numpad">' +
          ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "OK"]
            .map(function (k) {
              var cls = k === "CLR" ? " fn" : k === "OK" ? " ok-key" : "";
              var lbl = k === "CLR" ? "Xoá" : k === "OK" ? "Nhập ↵" : k;
              return '<button class="plu-key' + cls + '" data-k="' + k + '">' + lbl + "</button>";
            })
            .join("") +
          "</div>";
      } else {
        var ops = shuffle([it].concat(distract(it, hard)));
        rightPanel =
          '<div class="plu-opts">' +
          ops
            .map(function (d, idx) {
              return (
                '<button class="plu-opt" data-c="' + d.code + '">' +
                '<span style="font-size:11px;color:var(--mute)">Phím ' + (idx + 1) + "</span>" +
                "<span>" + esc(o.type === "name" ? d.name : d.code) + "</span>" +
                "</button>"
              );
            })
            .join("") +
          "</div>";
      }

      body.innerHTML =
        '<div class="plu-bar"><i style="width:' + (i / q.length) * 100 + '%"></i></div>' +
        '<div class="plu-stage split">' + leftCard + rightPanel + "</div>";

      function renderDigits() {
        var boxes = root.querySelectorAll(".plu-digit");
        boxes.forEach(function (el, idx) {
          var ch = typed[idx] || "";
          el.textContent = ch || "•";
          el.classList.toggle("filled", !!ch);
        });
      }

      function ans(good, sel) {
        if (fin) return;
        fin = true;
        clearInterval(tm);
        keyHandler = null;
        var ms = Date.now() - t0;
        tot++;
        if (good) ok++;
        o.log.push({ ok: good, ms: ms });
        rec(it.code, good, ms);
        var fb = $("#fb");
        if (fb) {
          fb.className = "plu-fb " + (good ? "ok" : "no");
          fb.textContent = good
            ? "✓ Chính xác · " + (ms / 1000).toFixed(1) + "s"
            : "✕ Sai · Đáp án: " + it.code + " (" + it.name + ")";
        }
        root.querySelectorAll(".plu-opt").forEach(function (b) {
          b.disabled = true;
          if (b.dataset.c === it.code) b.classList.add("ok");
          else if (b === sel) b.classList.add("no");
        });
        setTimeout(function () { i++; next(); }, good ? 550 : 1450);
      }

      if (o.type === "input") {
        renderDigits();
        var pressKey = function (k) {
          if (fin) return;
          beep("tap");
          if (k === "CLR") {
            typed = typed.slice(0, -1);
            renderDigits();
          } else if (k === "OK") {
            if (typed.length > 0) ans(typed === it.code);
          } else if (/^\d$/.test(k) && typed.length < len) {
            typed += k;
            renderDigits();
            if (typed.length === len) setTimeout(function () { ans(typed === it.code); }, 90);
          }
        };
        root.querySelectorAll(".plu-key").forEach(function (b) {
          b.onclick = function () { pressKey(b.dataset.k); };
        });
        keyHandler = function (e) {
          if (/^\d$/.test(e.key)) pressKey(e.key);
          else if (e.key === "Backspace") pressKey("CLR");
          else if (e.key === "Enter") pressKey("OK");
        };
      } else {
        var optBtns = root.querySelectorAll(".plu-opt");
        optBtns.forEach(function (b) {
          b.onclick = function () { ans(b.dataset.c === it.code, b); };
        });
        keyHandler = function (e) {
          var idx = ["1", "2", "3", "4"].indexOf(e.key);
          if (idx >= 0 && optBtns[idx]) optBtns[idx].click();
        };
      }

      if (o.time) {
        tm = setInterval(function () {
          var p = 1 - (Date.now() - t0) / lim;
          var tb = $("#tb");
          if (tb) tb.style.width = Math.max(0, p * 100) + "%";
          if (p <= 0) ans(false);
        }, 80);
      }
    })();

    function done() {
      var acc = Math.round((ok / Math.max(tot, 1)) * 100),
        oks = o.log.filter(function (l) { return l.ok; }),
        avg = oks.length ? oks.reduce(function (a, l) { return a + l.ms; }, 0) / oks.length / 1000 : 0;
      var ready = o.exam
        ? acc >= 90 && avg <= 5
          ? "🏆 Đạt chuẩn đứng quầy thu ngân!"
          : "⚠️ Chưa đạt chuẩn – Cần luyện thêm phản xạ"
        : "";
      body.innerHTML =
        '<div class="plu-stage"><div class="plu-card">' +
        '<div class="plu-img">' + (acc >= 80 ? "🏆" : "💪") + "</div>" +
        '<div class="cat">' + (o.exam ? "KẾT QUẢ SÁT HẠCH" : "HOÀN THÀNH") + "</div>" +
        '<div class="big">' + acc + "%</div>" +
        '<div class="cat">Đúng ' + ok + "/" + tot + " câu · Tốc độ TB " + avg.toFixed(1) + "s</div>" +
        (ready ? '<div class="nm2" style="font-size:17px;margin-top:10px">' + ready + "</div>" : "") +
        '<div class="plu-row"><button class="plu-btn pri" id="again">Luyện lại lượt mới</button></div>' +
        "</div></div>";
      $("#again").onclick = function () { o.log = []; quiz(o); };
    }
  }

  function levelPick(title, sub, run) {
    body.innerHTML =
      '<div class="plu-stage"><div class="plu-card">' +
      '<div class="plu-img">⚡</div>' +
      '<div class="nm2">' + title + "</div>" +
      '<div class="cat">' + sub + "</div>" +
      '<div class="plu-row">' +
      '<button class="plu-btn" data-h="0">Cơ bản (Ngẫu nhiên)</button>' +
      '<button class="plu-btn pri" data-h="1">Nâng cao (Cùng nhóm dễ nhầm)</button>' +
      "</div></div></div>";
    body.querySelectorAll("[data-h]").forEach(function (b) {
      b.onclick = function () { run(b.dataset.h === "1"); };
    });
  }

  /* ---------- 3. Thống kê + Tra cứu thông minh ---------- */
  function stats() {
    var c = [0, 0, 0], n = 0, ok = 0, bad = 0, ms = 0, pts = 0;
    D.forEach(function (d) {
      var r = g(d.code);
      c[box(d.code)]++;
      ok += r.ok;
      bad += r.bad;
      ms += r.ms;
      pts += r.pts;
    });
    n = ok + bad;
    var lvl = D.length ? c[2] / D.length : 0,
      lv = lvl >= 0.9 ? "Thành thạo" : lvl >= 0.5 ? "Vững vàng" : lvl >= 0.2 ? "Đang tiến bộ" : "Khởi đầu";
    var weak = D.filter(function (d) { return g(d.code).bad > 0; })
      .sort(function (a, b) { return g(b.code).bad - g(a.code).bad; })
      .slice(0, 8);
    var s = function (v, l) { return '<div class="plu-st"><b>' + v + "</b><span>" + l + "</span></div>"; };

    body.innerHTML =
      '<div class="plu-stats">' +
      s(lv, "Cấp độ") +
      s(pts, "Tổng điểm XP") +
      s(n ? Math.round((ok / n) * 100) + "%" : "–", "Độ chính xác") +
      s(ok ? (ms / ok / 1000).toFixed(1) + "s" : "–", "Phản xạ TB") +
      s(c[2] + "/" + D.length, "Đã thuộc nằm lòng") +
      s(c[1], "Đang học") +
      "</div>" +
      '<div class="plu-bar"><i style="width:' + lvl * 100 + '%"></i></div>' +
      '<h4 style="margin:12px 0 8px">🔥 Các mã hay nhầm nhất</h4>' +
      '<div class="plu-list">' +
      (weak.length
        ? weak
            .map(function (d) {
              return (
                '<div class="plu-li">' +
                '<span class="ic">' + getIcon(d) + "</span>" +
                "<b>" + d.code + "</b>" +
                '<span class="n">' + esc(d.name) + "</span>" +
                '<span class="plu-lv">Sai ' + g(d.code).bad + " lần</span></div>"
              );
            })
            .join("")
        : '<div class="plu-li"><span class="n">Chưa có mã bị sai. Hãy bắt đầu luyện tập!</span></div>') +
      "</div>" +
      '<div class="plu-row"><button class="plu-btn bad" id="rs">Xoá tiến độ học</button></div>';

    var b = $("#rs");
    b.onclick = function () {
      if (!b.classList.contains("arm")) {
        b.classList.add("arm");
        b.textContent = "Bấm lần nữa để xác nhận xoá";
        return;
      }
      P = {};
      streak = 0;
      save();
      updateHeader();
      stats();
    };
  }

  function list() {
    var issues = D.filter(function (d) { return d.chk || d.dup; });
    body.innerHTML =
      (issues.length
        ? '<div class="plu-warn">⚠️ Cần đối chiếu thực tế: ' +
          issues
            .map(function (d) {
              return d.code + " " + esc(d.name) + (d.dup ? " (trùng mã với " + esc(d.dup) + ")" : " (ảnh gốc mờ)");
            })
            .join("; ") +
          ".</div>"
        : "") +
      '<input class="plu-sch" id="sch" placeholder="🔍 Tìm tên không dấu (vd: buoi, sau rieng) hoặc mã PLU...">' +
      '<div class="plu-list" id="ls"></div>';

    var draw = function () {
      var raw = $("#sch").value.trim(),
        k = vnFold(raw),
        nk = norm(raw);
      var pool = activePool().filter(function (d) {
        return !k || vnFold(d.name).indexOf(k) >= 0 || vnFold(d.cat).indexOf(k) >= 0 || (nk && d.code.indexOf(nk) >= 0);
      });
      $("#ls").innerHTML =
        pool
          .map(function (d) {
            var b = box(d.code);
            return (
              '<div class="plu-li">' +
              '<span class="ic">' + getIcon(d) + "</span>" +
              "<b>" + d.code + "</b>" +
              '<span class="n">' + esc(d.name) + ' <small style="color:var(--mute)">· ' + esc(d.cat) + "</small></span>" +
              '<span class="plu-lv' + (b === 2 ? " k" : "") + '">' + LV[b] + "</span></div>"
            );
          })
          .join("") || '<div class="plu-li"><span class="n">Không tìm thấy sản phẩm phù hợp.</span></div>';
    };
    $("#sch").oninput = draw;
    draw();
  }

  var TABS = [
    ["visual", "🌟 Hình ảnh 3D"],
    ["flash", "🗂️ Thẻ lật"],
    ["reflex", "⚡ Phản xạ POS"],
    ["recog", "🎯 Chọn mã"],
    ["rev", "🔄 Học ngược"],
    ["exam", "🏆 Thi đứng quầy"],
    ["stats", "📊 Tiến độ"],
    ["list", "🔍 Tra cứu"]
  ];

  function renderCats() {
    var cats = [];
    D.forEach(function (d) { if (cats.indexOf(d.cat) < 0) cats.push(d.cat); });
    var items = [["ALL", "Tất cả (" + D.length + ")"], ["WEAK", "🔥 Hay sai"]].concat(
      cats.map(function (c) { return [c, c]; })
    );
    catBar.innerHTML = items
      .map(function (it) {
        return '<button class="plu-cat-chip' + (curCat === it[0] ? " on" : "") + '" data-cat="' + esc(it[0]) + '">' + esc(it[1]) + "</button>";
      })
      .join("");
    catBar.querySelectorAll(".plu-cat-chip").forEach(function (btn) {
      btn.onclick = function () {
        curCat = btn.dataset.cat;
        renderCats();
        go(mode);
      };
    });
  }

  function go(m) {
    clearInterval(tm);
    keyHandler = null;
    mode = m;
    root.querySelectorAll(".plu-seg button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.m === m);
    });
    catBar.style.display = m === "stats" ? "none" : "flex";
    if (m === "visual") cards(true);
    else if (m === "flash") cards(false);
    else if (m === "reflex") quiz({ type: "input", n: 15, time: 7, log: [] });
    else if (m === "recog") levelPick("Nhận diện Mã PLU", "Xem tên mặt hàng và chọn nhanh mã đúng", function (h) { quiz({ type: "opt", n: 12, time: 0, hard: h, log: [] }); });
    else if (m === "rev") levelPick("Học ngược: Mã → Tên hàng", "Nhìn mã PLU trên cân và đoán đúng sản phẩm", function (h) { quiz({ type: "name", n: 12, time: 0, hard: h, log: [] }); });
    else if (m === "exam") quiz({ type: "input", n: Math.min(20, activePool().length), time: 6, exam: true, log: [] });
    else if (m === "stats") stats();
    else list();
  }

  function build() {
    root = document.createElement("div");
    root.id = "plu";
    root.innerHTML =
      '<div class="plu-box">' +
      '<div class="plu-top">' +
      '<div class="plu-brand">' +
      '<div class="plu-logo">🏷️</div>' +
      '<div><h2>PLU Process Card</h2><span class="plu-sub">Hệ thống luyện phản xạ mã cân siêu thị</span></div>' +
      "</div>" +
      '<div class="plu-pills">' +
      '<span class="plu-pill" id="plu-str">🔥 0</span>' +
      '<span class="plu-pill" id="plu-pts">⭐ 0</span>' +
      "</div>" +
      '<button class="plu-ico-btn" id="plu-snd" title="Bật/Tắt âm thanh">🔊</button>' +
      '<button class="plu-x" aria-label="Đóng">✕</button>' +
      "</div>" +
      '<div class="plu-nav-wrap">' +
      '<div class="plu-seg">' +
      TABS.map(function (t) { return '<button data-m="' + t[0] + '">' + t[1] + "</button>"; }).join("") +
      "</div>" +
      "</div>" +
      '<div class="plu-cats"></div>' +
      '<div class="plu-body"></div>' +
      "</div>";

    document.body.appendChild(root);
    body = $(".plu-body");
    catBar = $(".plu-cats");

    root.querySelector(".plu-x").onclick = close;
    var sndBtn = $("#plu-snd");
    sndBtn.onclick = function () {
      soundOn = !soundOn;
      sndBtn.textContent = soundOn ? "🔊" : "🔇";
    };
    root.querySelectorAll(".plu-seg button").forEach(function (b) {
      b.onclick = function () { go(b.dataset.m); };
    });

    window.addEventListener("keydown", function (e) {
      if (!root || !root.classList.contains("on")) return;
      if (e.key === "Escape") { close(); return; }
      if (keyHandler) keyHandler(e);
    });

    renderCats();
    updateHeader();
  }

  function open(m) {
    D = window.PLU_SOURCE || D;
    if (!root) build();
    root.classList.add("on");
    updateHeader();
    go(m || mode);
  }

  function close() {
    clearInterval(tm);
    keyHandler = null;
    if (root) root.classList.remove("on");
  }

  window.PLUTraining = {
    open: open,
    close: close,
    isOpen: function () { return !!(root && root.classList.contains("on")); }
  };
})();