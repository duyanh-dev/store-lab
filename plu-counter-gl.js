/* ==========================================================================
   PLU COUNTER – view WebGL (Three.js) v3: quầy thu ngân POV, máy POS 3D trong canvas
   Nạp SAU plu-counter.js. Tự đăng ký view "gl"; lỗi thì engine tự dùng view CSS.

   Three.js nạp bằng import() từ CDN. Muốn tự host:
     PLUCounter.config.threeUrl = "/vendor/three.module.min.js";
   hoặc: PLUCounter.config.three = THREE_NAMESPACE;

   Cảnh (đơn vị ~mét, mặt quầy y = 0, thu ngân đứng ở +z nhìn về -z):
     rổ (chìm trong quầy, trái) → máy quét kính chìm (giữa, hướng lên) → túi giấy (phải)
     Máy POS 3D ở phía sau; máy quét thứ 2 gắn dưới màn hình POS, hướng về thu ngân.
   UI POS (DOM) được chiếu bằng matrix3d lên đúng mặt phẳng màn hình 3D theo camera.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.PLUCounter) return;

  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
  var p3 = null;

  /* Danh sách nguồn Three.js: thử lần lượt cho đến khi nạp được */
var THREE_URLS = [
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "https://unpkg.com/three@0.160.0/build/three.module.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.module.min.js"
];

/* Kiểm tra bản THREE đủ mới (có CapsuleGeometry và SRGBColorSpace) */
function threeOk(t) {
  return !!(t && t.WebGLRenderer && t.CapsuleGeometry && t.SRGBColorSpace);
}

/* Nạp Three.js: ưu tiên bản người dùng cấp, rồi global, rồi import() từ các CDN */
function loadThree(cfg) {
  if (threeOk(cfg.three)) return Promise.resolve(cfg.three);
  if (threeOk(window.THREE)) return Promise.resolve(window.THREE);
  if (p3) return p3;

  var urls = cfg.threeUrl ? [cfg.threeUrl].concat(THREE_URLS) : THREE_URLS;
  var i = 0;
  function tryNext() {
    if (i >= urls.length) return Promise.reject(new Error("Không nạp được Three.js"));
    return import(urls[i++]).catch(tryNext);
  }
  p3 = tryNext();
  p3.catch(function () { p3 = null; });   /* lỗi thì cho lần sau thử lại */
  return p3;
}

/* Chế độ toàn màn hình: .pc phủ kín viewport, chỉ còn HUD + canvas WebGL + nút X */
function enterFull(sceneEl, ctx) {
  var host = sceneEl.closest ? sceneEl.closest(".pc") : null;
  if (!host) return { leave: function () {} };
  var root = document.documentElement, prevOv = root.style.overflow, left = false;
  host.classList.add("pc-full");
  root.style.overflow = "hidden";
    document.body.classList.add("plu-full");

  var xb = document.createElement("button");
  xb.type = "button"; xb.className = "pc-x"; xb.setAttribute("aria-label", "Thoát");
  xb.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  host.appendChild(xb);

  function leave() {
    if (left) return; left = true;
    host.classList.remove("pc-full");
    root.style.overflow = prevOv;
        document.body.classList.remove("plu-full");
    document.removeEventListener("keydown", onKey);
    if (xb.parentNode) xb.parentNode.removeChild(xb);
  }
  function exit() {
    /* ưu tiên hàm thoát của engine nếu có, rồi tới sự kiện "plu:exit" */
    var fn = ctx.exit || ctx.close || ctx.quit || ctx.onExit;
    if (typeof fn === "function") { fn(); return; }
    var ev = new CustomEvent("plu:exit", { bubbles: true, cancelable: true });
    if (!host.dispatchEvent(ev)) return;      /* engine đã xử lý (preventDefault) */
    leave();                                   /* không ai xử lý: ít nhất thoát toàn màn hình */
  }
  function onKey(e) { if (e.key === "Escape") exit(); }
  xb.addEventListener("click", exit);
  document.addEventListener("keydown", onKey);
  return { leave: leave };
}

  function hueOf(s) {
    var h = 0; s = String(s || "");
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }
  function easeIO(k) { return k < .5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k); }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }


  /* Khung giao diện Vynamic POS (chỉ để trang trí, không bắt chạm) */
var VX_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
var VX_HTML =
  '<div class="vx-top">' +
    VX_SVG.replace("<svg", '<svg class="vx-home"') + '<path d="M3.5 11.5L12 4l8.5 7.5M6 10v10h12V10M10 20v-5.5h4V20"/></svg>' +
    '<div class="vx-kg"><b>--,-- kg</b><i>± 1 kg</i></div>' +
    '<div class="vx-scale"><i>&lt;scale-min&gt;0 kg</i><i>&lt;scale-max&gt;2,147,483 kg</i></div>' +
    '<div class="vx-ttl"><b>VYNAMIC POS CLIENT</b><span class="vx-clk">2:48 PM  |  11/2/2026</span></div>' +
    VX_SVG.replace("<svg", '<svg class="vx-srch"') + '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/></svg>' +
  '</div>' +
  '<div class="vx-mid">' +
    '<span class="vx-pill" style="top:46px">IN LẠI BIÊN LAI</span>' +
    '<span class="vx-pill" style="top:160px">HỦY ĐƠN</span>' +
    '<div class="vx-pg">' +
      '<i class="c">' + VX_SVG + '<path d="M14.5 6l-6 6 6 6"/></svg></i>' +
      '<i class="d on"></i><i class="d"></i><i class="d"></i>' +
      '<i class="c">' + VX_SVG + '<path d="M9.5 6l6 6-6 6"/></svg></i>' +
    '</div>' +
  '</div>' +
  '<div class="vx-sum"><div class="l"><span>KHUYẾN MÃI VND<i>-</i></span><span>THUẾ VND<i>-</i></span><span>SỐ<i>-</i></span></div>' +
    '<div class="r"><span>TỔNG CỘNG VND<i>-</i></span></div></div>' +
  '<div class="vx-bot">' +
    '<b class="vx-dn">Dn</b>' +
    '<div class="vx-acc">Tài khoản điều hành: <b>207301</b><br>POS: 6</div>' +
    VX_SVG.replace("<svg", '<svg class="vx-ic"') + '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>' +
    VX_SVG.replace("<svg", '<svg class="vx-ic"') + '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>' +
  '</div>';

  /* ---------- hằng số bố cục ---------- */
  var CT = { x0: -5.4, x1: 5.4, z0: -2.0, z1: 2.2 };                 /* mặt quầy, dày 1.0 (y: -1 → 0) */
  var BASKET = { x: -2.6, z: 1.15, w: 1.95, d: 1.5, floor: -0.9 };   /* ô lõm vừa khít rổ */
  var SCAN = { x: 0.0, z: 0.75, w: 1.9, d: 1.15 };                   /* máy quét kính chìm trong quầy */
  var BAG = { x: 2.75, z: 0.95 };
  var MON = { z: -1.0, bottom: 0.85, tilt: 12 };                     /* máy POS: chân màn hình, độ ngả (độ) */
  var SCAN_Y = 0.23;                                                 /* tâm món hàng khi nằm trên kính */
  var SLOTS = [                                                      /* vị trí món trong rổ: lớp trên trước */
    [0.15, 0.02, 0.0], [-0.45, 0.01, 0.08], [0.5, 0.03, -0.1],
    [-0.5, -0.56, -0.3], [0.05, -0.56, -0.32], [0.55, -0.56, -0.28], [-0.2, -0.56, 0.32], [0.35, -0.56, 0.32]
  ];

  function build(THREE, sceneEl, ctx) {
    if (ctx.alive && !ctx.alive()) return null;
    var items = ctx.items, icon = ctx.icon;
    var V3 = THREE.Vector3, M4 = THREE.Matrix4;

    sceneEl.className = "pc-scene gl";
    sceneEl.innerHTML = '<div class="pcg"><div class="pcg-cv"><div class="pcg-pos"></div></div></div>';
    var cv = sceneEl.querySelector(".pcg-cv"), posMount = sceneEl.querySelector(".pcg-pos");

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      /* Lưu renderer vào ctx để dọn nếu build lỗi giữa chừng */
ctx._r = renderer;
/* Mất context WebGL: cho phép trình duyệt tự khôi phục */
renderer.domElement.addEventListener("webglcontextlost", function (e) { e.preventDefault(); });
    } catch (e) { throw new Error("WebGL không khả dụng"); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x0a0d14, 1);
    cv.insertBefore(renderer.domElement, posMount);

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0d14, 16, 42);
    var camera = new THREE.PerspectiveCamera(34, 2, 0.1, 80);

    var disposables = [], texCache = {};
    function mat(color, rough, metal, extra) {
      var m = new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: rough == null ? 0.6 : rough, metalness: metal || 0 }, extra || {}));
      disposables.push(m); return m;
    }
    function geo(g) { disposables.push(g); return g; }
    function mesh(g, m, x, y, z, shadow) {
      var o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0);
      if (shadow !== false) { o.castShadow = true; o.receiveShadow = true; }
      return o;
    }
    function box(x0, x1, y0, y1, z0, z1, m, shadow) {
      return mesh(geo(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0)), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, shadow);
    }

    /* ---------- ánh sáng ---------- */
    scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x1a1d28, 0.85));
    var key = new THREE.DirectionalLight(0xfff0dc, 2.3);
    key.position.set(-3.5, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 6; key.shadow.camera.bottom = -5;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 24;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x6aa0ff, 0.7);
    rim.position.set(5, 3, -4); scene.add(rim);
    var scanLight = new THREE.PointLight(0x4aa8ff, 0, 5, 1.6);
    scanLight.position.set(SCAN.x, 0.7, SCAN.z); scene.add(scanLight);
    var monGlow = new THREE.PointLight(0x4aa8ff, 1.1, 8, 1.6);          /* ánh sáng từ màn hình POS hắt xuống quầy */
    monGlow.position.set(0, 1.3, -0.2); scene.add(monGlow);

    /* ---------- quầy: mặt quầy dày 1.0, có 2 ô cắt (rổ sâu, máy quét nông) ---------- */
    var counterM = mat(0x3a4153, 0.42, 0.1), pitM = mat(0x0a0c11, 0.9), darkM = mat(0x12151c, 0.5, 0.5);
    var bx0 = BASKET.x - BASKET.w / 2, bx1 = BASKET.x + BASKET.w / 2;
    var bz0 = BASKET.z - BASKET.d / 2, bz1 = BASKET.z + BASKET.d / 2;
    var sx0 = SCAN.x - SCAN.w / 2, sx1 = SCAN.x + SCAN.w / 2;
    var sz0 = SCAN.z - SCAN.d / 2, sz1 = SCAN.z + SCAN.d / 2;
    scene.add(box(CT.x0, bx0, -1, 0, CT.z0, CT.z1, counterM));
    scene.add(box(bx0, bx1, -1, 0, CT.z0, bz0, counterM));
    scene.add(box(bx0, bx1, -1, 0, bz1, CT.z1, counterM));
    scene.add(box(bx0, bx1, -1, BASKET.floor, bz0, bz1, pitM));         /* đáy hố đặt rổ */
    scene.add(box(bx1, sx0, -1, 0, CT.z0, CT.z1, counterM));
    scene.add(box(sx0, sx1, -1, 0, CT.z0, sz0, counterM));
    scene.add(box(sx0, sx1, -1, 0, sz1, CT.z1, counterM));
    scene.add(box(sx0, sx1, -1, -0.1, sz0, sz1, darkM));                /* đế máy quét chìm */
    scene.add(box(sx1, CT.x1, -1, 0, CT.z0, CT.z1, counterM));
    scene.add(mesh(geo(new THREE.BoxGeometry(10.8, 1.9, 4.2)), mat(0x1b1f2a, 0.7), 0, -1.95, 0.1));   /* thân tủ quầy */
    scene.add(mesh(geo(new THREE.BoxGeometry(10.8, 0.55, 0.14)), mat(0x232834, 0.6), 0, 0.27, CT.z0 + 0.07));
    var edge = new THREE.Mesh(geo(new THREE.BoxGeometry(10.8, 0.035, 0.035)), new THREE.MeshBasicMaterial({ color: 0x4aa8ff }));
    disposables.push(edge.material); edge.position.set(0, -0.03, CT.z1 + 0.01); scene.add(edge);
    var floor = mesh(geo(new THREE.PlaneGeometry(70, 50)), mat(0x0d1017, 0.9), 0, -2.9, 0, false);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    /* ---------- backdrop: kệ hàng phía sau ---------- */
    scene.add(mesh(geo(new THREE.BoxGeometry(46, 14, 0.2)), mat(0x121722, 0.9), 0, 3.5, -5.0, false));
    var boxG = geo(new THREE.BoxGeometry(0.5, 0.6, 0.4));
    var rows = [0.6, 1.6, 2.6, 3.6, 4.6], perRow = 32, shelf = new THREE.InstancedMesh(boxG, mat(0xffffff, 0.8), rows.length * perRow);
    var tmpM = new THREE.Matrix4(), tmpC = new THREE.Color(), n = 0;
    rows.forEach(function (ry) {
      scene.add(mesh(geo(new THREE.BoxGeometry(20, 0.07, 0.9)), mat(0x2a3040, 0.5, 0.4), 0, ry - 0.34, -4.5, false));
      for (var c = 0; c < perRow; c++) {
        var sx = -9.6 + c * 0.6 + Math.random() * 0.06, sh = 0.75 + Math.random() * 0.5;
        tmpM.makeScale(1, sh, 1); tmpM.setPosition(sx, ry - 0.3 + 0.3 * sh, -4.5);
        shelf.setMatrixAt(n, tmpM);
        shelf.setColorAt(n, tmpC.setHSL(Math.random(), 0.35 + Math.random() * 0.3, 0.32 + Math.random() * 0.2));
        n++;
      }
    });
    shelf.instanceMatrix.needsUpdate = true; if (shelf.instanceColor) shelf.instanceColor.needsUpdate = true;
    shelf.frustumCulled = false; scene.add(shelf);

    /* ---------- máy quét kính chìm trong mặt quầy, hướng lên ---------- */
    var steelM = mat(0xa0a8b8, 0.3, 0.85);
    var glassM = mat(0x0e3a5c, 0.08, 0.3, { emissive: 0x1a6ea8, emissiveIntensity: 0.6 });
    scene.add(mesh(geo(new THREE.BoxGeometry(SCAN.w - 0.14, 0.03, SCAN.d - 0.14)), glassM, SCAN.x, -0.075, SCAN.z, false));
    [-1, 1].forEach(function (s) {
      scene.add(mesh(geo(new THREE.BoxGeometry(SCAN.w, 0.06, 0.07)), steelM, SCAN.x, -0.03, SCAN.z + s * (SCAN.d / 2 - 0.035), false));
      scene.add(mesh(geo(new THREE.BoxGeometry(0.07, 0.06, SCAN.d - 0.14)), steelM, SCAN.x + s * (SCAN.w / 2 - 0.035), -0.03, SCAN.z, false));
    });
    var laserM = new THREE.MeshBasicMaterial({ color: 0xff3b30 }); disposables.push(laserM);
    var laser = new THREE.Mesh(geo(new THREE.BoxGeometry(SCAN.w - 0.3, 0.012, 0.025)), laserM);
    laser.position.set(SCAN.x, -0.04, SCAN.z); laser.visible = false; scene.add(laser);

    /* ---------- máy POS 3D: đế, cổ, màn hình ngả, máy quét gắn dưới màn hình ---------- */
    var bezelM = mat(0x161a23, 0.35, 0.5);
var glassScrM = new THREE.MeshBasicMaterial({ color: 0xeceef8 }); disposables.push(glassScrM);
    var ledM = new THREE.MeshBasicMaterial({ color: 0x30d158 }); disposables.push(ledM);

    scene.add(mesh(geo(new THREE.BoxGeometry(1.9, 0.09, 1.0)), mat(0x1c212b, 0.4, 0.5), 0, 0.045, MON.z + 0.05));

    /* máy quét gắn vào cổ POS, cửa sổ quét hướng về thu ngân (+z) */
    var FS = { y: 0.30, z: MON.z + 0.17, w: 1.5, h: 0.38, d: 0.46 };
    scene.add(mesh(geo(new THREE.BoxGeometry(FS.w, FS.h, FS.d)), mat(0x1b1f2a, 0.45, 0.4), 0, FS.y, FS.z));
    var fGlassM = mat(0x3a0b0b, 0.1, 0.3, { emissive: 0xff2a1c, emissiveIntensity: 0.15 });
    var fWin = mesh(geo(new THREE.PlaneGeometry(1.2, 0.2)), fGlassM, 0, FS.y, FS.z + FS.d / 2 + 0.003, false);
    scene.add(fWin);
    [-1, 1].forEach(function (s) {                                       /* tai gá nối máy quét vào cổ */
      scene.add(mesh(geo(new THREE.BoxGeometry(0.08, 0.5, 0.2)), steelM, s * 0.55, 0.3, MON.z - 0.1));
    });
    var curtainG = geo(new THREE.BufferGeometry());                      /* tấm tia quét hình quạt chiếu ra phía trước */
    var CZ = 1.7, cz0 = FS.z + FS.d / 2 + 0.01;
    curtainG.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.55, 0, 0, 0.55, 0, 0, 1.15, 0, CZ,   -0.55, 0, 0, 1.15, 0, CZ, -1.15, 0, CZ
    ], 3));
    var curtainM = new THREE.MeshBasicMaterial({ color: 0xff2a1c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    disposables.push(curtainM);
    var curtain = new THREE.Mesh(curtainG, curtainM);
    curtain.position.set(0, FS.y, cz0); curtain.visible = false; scene.add(curtain);

    var monStatic = new THREE.Group(); scene.add(monStatic);             /* cổ (đổi chiều cao theo kích thước màn) */
    var monTilt = new THREE.Group(); scene.add(monTilt);                 /* màn hình ngả về phía thu ngân */
    var screenDisp = [];
    var SW = 3.4, SH = 2.125, PW = 720, PH = 450, isPortrait = null;
    function sgeo(g) { screenDisp.push(g); return g; }
    function buildMonitor(portrait) {
      screenDisp.forEach(function (g) { g.dispose(); }); screenDisp = [];
      [monStatic, monTilt].forEach(function (grp) { while (grp.children.length) grp.remove(grp.children[0]); });
if (portrait) { SW = 2.8; PW = 400; PH = 500; } else { SW = 3.2; PW = 640; PH = 480; }   /* ngang: 4:3 như màn thật */
      SH = SW * PH / PW;
      var cy = MON.bottom + SH / 2;
      monTilt.position.set(0, cy, MON.z);
      monTilt.rotation.x = -MON.tilt * Math.PI / 180;
      /* viền đen dày hơn ở cằm, giống máy thật */
monTilt.add(mesh(sgeo(new THREE.BoxGeometry(SW + 0.28, SH + 0.40, 0.16)), bezelM, 0, -0.06, -0.08));

      var scr = new THREE.Mesh(sgeo(new THREE.PlaneGeometry(SW, SH)), glassScrM); scr.position.z = 0.002; monTilt.add(scr);
/* đèn LED xanh dời sang góc phải dưới */
var led = new THREE.Mesh(sgeo(new THREE.SphereGeometry(0.028, 10, 8)), ledM); led.position.set(SW / 2 - 0.12, -(SH / 2 + 0.14), 0.01); monTilt.add(led);
      var neckH = cy - 0.09;
      monStatic.add(mesh(sgeo(new THREE.BoxGeometry(0.42, neckH, 0.24)), bezelM, 0, 0.09 + neckH / 2, MON.z - 0.2));
      monTilt.updateMatrixWorld(true);
    }

    /* ---------- rổ chìm trong ô lõm ---------- */
    var basketG = new THREE.Group(); basketG.position.set(BASKET.x, 0, BASKET.z); scene.add(basketG);
    var bkTex = (function () {
      var c = document.createElement("canvas"); c.width = 64; c.height = 32; var g = c.getContext("2d");
      g.fillStyle = "#c63a2c"; g.fillRect(0, 0, 64, 32);
      g.fillStyle = "#a02a20"; for (var x = 0; x < 64; x += 8) g.fillRect(x, 0, 2, 32);
      g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, 14, 64, 4);
      var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; disposables.push(t); return t;
    })();
    var TW = BASKET.w - 0.06, TD = BASKET.d - 0.06, BH = 1.02;           /* miệng rổ khớp ô lõm, trừ khe 3cm mỗi bên */
    var bkGeo = geo(new THREE.CylinderGeometry(0.70711, 0.70711 * 0.9, BH, 4, 1, true));
    bkGeo.rotateY(Math.PI / 4); bkGeo.scale(TW, 1, TD);
    basketG.add(mesh(bkGeo, mat(0xffffff, 0.55, 0, { map: bkTex, side: THREE.DoubleSide }), 0, BASKET.floor + BH / 2, 0));
    basketG.add(mesh(geo(new THREE.BoxGeometry(TW * 0.9, 0.05, TD * 0.9)), mat(0x9a2b20, 0.6), 0, BASKET.floor + 0.03, 0));
    var rimM = mat(0xe5483a, 0.4), RY = BASKET.floor + BH;
    [-1, 1].forEach(function (s) {
      basketG.add(mesh(geo(new THREE.BoxGeometry(TW + 0.08, 0.07, 0.07)), rimM, 0, RY, s * TD / 2));
      basketG.add(mesh(geo(new THREE.BoxGeometry(0.07, 0.07, TD + 0.08)), rimM, s * TW / 2, RY, 0));
      var h = mesh(geo(new THREE.TorusGeometry(0.28, 0.025, 8, 20, Math.PI)), rimM, s * TW / 2, RY, 0);
      h.rotation.y = Math.PI / 2; basketG.add(h);                        /* quai xách ở 2 đầu rổ */
    });

    /* ---------- túi giấy ---------- */
    var bagG = new THREE.Group(); bagG.position.set(BAG.x, 0, BAG.z); scene.add(bagG);
    var kraft = mat(0xc9a06c, 0.85, 0, {});
    var bagMats = [kraft, kraft, new THREE.MeshBasicMaterial({ visible: false }), kraft, kraft, kraft];
    disposables.push(bagMats[2]);
    bagG.add(mesh(geo(new THREE.BoxGeometry(1.4, 1.5, 1.1)), bagMats, 0, 0.75, 0));
    bagG.add(mesh(geo(new THREE.BoxGeometry(1.3, 1.48, 1.0)), mat(0x5a3d22, 0.95, 0, { side: THREE.BackSide }), 0, 0.76, 0, false));
    [-1, 1].forEach(function (s) {
      bagG.add(mesh(geo(new THREE.TorusGeometry(0.34, 0.024, 8, 20, Math.PI)), mat(0x9c7444, 0.8), 0, 1.5, s * 0.3));
    });
    var bagCanvas = document.createElement("canvas"); bagCanvas.width = bagCanvas.height = 128;
    var bagTex = new THREE.CanvasTexture(bagCanvas); bagTex.colorSpace = THREE.SRGBColorSpace; disposables.push(bagTex);
    function drawBag(nm) {
      var g = bagCanvas.getContext("2d"); g.clearRect(0, 0, 128, 128);
      g.fillStyle = "rgba(70,44,20,.85)"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "800 78px ui-monospace,Menlo,Consolas,monospace"; g.fillText(String(nm), 64, 58);
      g.font = "700 15px system-ui,sans-serif"; g.fillText("ĐÃ BỎ TÚI", 64, 108);
      bagTex.needsUpdate = true;
    }
    drawBag(0);
    var bagLabelM = new THREE.MeshBasicMaterial({ map: bagTex, transparent: true }); disposables.push(bagLabelM);
    var bagLabel = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.9, 0.9)), bagLabelM);
    bagLabel.position.set(0, 0.7, 0.553); bagG.add(bagLabel);

    /* ---------- món hàng 3D: mô hình dựng bằng code, nhận dạng theo emoji / tên ---------- */
    function emojiTex(emoji, hue) {
      var k = emoji + "|" + hue; if (texCache[k]) return texCache[k];
      var c = document.createElement("canvas"); c.width = c.height = 192; var g = c.getContext("2d");
      var gr = g.createLinearGradient(0, 0, 192, 192);
      gr.addColorStop(0, "hsl(" + hue + ",55%,92%)"); gr.addColorStop(1, "hsl(" + hue + ",50%,78%)");
      g.fillStyle = gr; g.fillRect(0, 0, 192, 192);
      g.lineWidth = 8; g.strokeStyle = "rgba(255,255,255,.7)"; g.strokeRect(4, 4, 184, 184);
      g.font = '112px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(emoji, 96, 104);
      var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      texCache[k] = t; return t;
    }

    var TAU = Math.PI * 2, mc = {}, tc = {};
    function M(c, r, m, x) { if (x) return mat(c, r, m, x); var k = c + "|" + r + "|" + m; return mc[k] || (mc[k] = mat(c, r, m)); }
    function MD(c, r, m) { var k = "d" + c + "|" + r + "|" + m; return mc[k] || (mc[k] = mat(c, r, m, { side: THREE.DoubleSide })); }
    function TM(key, tex, r) { var k = "t" + key; return mc[k] || (mc[k] = mat(0xffffff, r, 0, { map: tex })); }
    function ctex(key, w, h, draw) {
      if (tc[key]) return tc[key];
      var c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
      var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; disposables.push(t); return (tc[key] = t);
    }
    function rng(seed) { var s = (seed * 2654435761) >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
    function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d"); }
    function add(g, gm, m, x, y, z) {
      var o = new THREE.Mesh(geo(gm), m); o.position.set(x || 0, y || 0, z || 0);
      o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
    }
    function piv(g, x, y, z, ry) { var p = new THREE.Group(); p.position.set(x || 0, y || 0, z || 0); p.rotation.y = ry || 0; g.add(p); return p; }
    function sph(r, ws, hs) { return new THREE.SphereGeometry(r, ws || 28, hs || 20); }
    function ball(g, col, rad, x, y, z, rough) { return add(g, sph(rad, 16, 12), M(col, rough == null ? 0.5 : rough, 0), x, y, z); }
    function stick(g, a, b, rad, col) {
      var d = b.clone().sub(a), L = d.length();
      var o = add(g, new THREE.CylinderGeometry(rad, rad, L, 6), M(col, 0.7, 0), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      o.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); return o;
    }
    function bump(gm, amt, freq, seed) {                       /* làm vỏ sần/méo nhẹ, giữ nguyên normal để không lộ đường nối */
      var p = gm.attributes.position, n = gm.attributes.normal, v = new V3(), nn = new V3();
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i);
        var d = Math.sin(v.x * freq + seed) * Math.sin(v.y * freq * 1.3 + seed * 2) * Math.sin(v.z * freq * 1.7 + seed * 3) + 0.5 * Math.sin((v.x + v.z) * freq * 2.1 + seed);
        v.addScaledVector(nn, d * amt); p.setXYZ(i, v.x, v.y, v.z);
      }
      return gm;
    }
    function ribs(gm, n, amt) {                                /* múi dọc quanh trục y */
      var p = gm.attributes.position;
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), z = p.getZ(i), s = 1 + amt * Math.cos(n * Math.atan2(z, x));
        p.setX(i, x * s); p.setZ(i, z * s);
      }
      return gm;
    }
    function lathe(pts, seg) {                                 /* xoay biên dạng (r,y) từ dưới lên trên */
      var c = new THREE.SplineCurve(pts.map(function (q) { return new THREE.Vector2(Math.max(0.001, q[0]), q[1]); }));
      return new THREE.LatheGeometry(c.getPoints(pts.length * 6), seg || 28);
    }
    function vgrad(gm, ax, c1, c2) {                           /* tô màu chuyển dần theo trục */
      gm.computeBoundingBox();
      var bb = gm.boundingBox, p = gm.attributes.position, a = new THREE.Color(c1), b = new THREE.Color(c2), c = new THREE.Color();
      var lo = bb.min[ax], hi = bb.max[ax], col = new Float32Array(p.count * 3), get = "get" + ax.toUpperCase();
      for (var i = 0; i < p.count; i++) {
        c.copy(a).lerp(b, (p[get](i) - lo) / Math.max(hi - lo, 1e-5));
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      gm.setAttribute("color", new THREE.BufferAttribute(col, 3)); return gm;
    }
    function calyx(g, y, col, n, len, rad) {                   /* đài lá xoè trên đỉnh quả */
      for (var k = 0; k < n; k++) {
        var p = piv(g, 0, y, 0, k / n * TAU);
        var c = add(p, new THREE.ConeGeometry(rad || 0.04, len || 0.2, 5), M(col || 0x3d8f2c, 0.6, 0), (len || 0.2) / 2 * 0.8, 0, 0);
        c.rotation.z = -Math.PI / 2 - 0.3;
      }
    }
    function rb(g, o, col, sx, sy, sz, amt, freq, rough) {     /* quả tròn/bầu dục */
      var gm = sph(0.5, 40, 28); bump(gm, amt == null ? 0.01 : amt, freq || 8, o.seed); gm.scale(sx, sy, sz);
      return add(g, gm, M(col, rough == null ? 0.45 : rough, 0), 0, 0, 0);
    }
    function pearGeo() {
      return lathe([[0, -0.5], [0.2, -0.48], [0.38, -0.36], [0.46, -0.15], [0.38, 0.05], [0.25, 0.22], [0.17, 0.38], [0.1, 0.5], [0, 0.52]], 32);
    }

    /* ---- bộ dựng từng loại ---- */
    var B = {};
    B.blob = function (g, o, it) {
      var gm = sph(0.5, 28, 20); bump(gm, 0.03, 7, o.seed); gm.scale(1.1, 0.9, 1);
      add(g, gm, M(new THREE.Color("hsl(" + hueOf(it.cat + it.name) + ",55%,52%)").getHex(), 0.55, 0)); o.size = 0.55;
    };
    B.pear = function (g, o) {
      var gm = pearGeo(); bump(gm, 0.008, 9, o.seed); add(g, gm, M(o.green === false ? 0xd9c34a : 0xb7c443, 0.45, 0));
      add(g, new THREE.CylinderGeometry(0.014, 0.02, 0.2, 6), M(0x5a3b1e, 0.8, 0), 0.02, 0.6, 0).rotation.z = 0.2; o.size = 0.7;
    };
    B.avocado = function (g, o) {
      var gm = pearGeo(); gm.scale(1.05, 0.9, 1.05); bump(gm, 0.012, 14, o.seed);
      add(g, gm, M(0x2f4a1f, 0.7, 0)); o.size = 0.62;
    };
    B.pomelo = function (g, o) {
      rb(g, o, 0xb8cc4f, 1, 0.95, 1, 0.01, 5, 0.6);
      add(g, new THREE.CylinderGeometry(0.06, 0.08, 0.05, 10), M(0x7a8a2e, 0.7, 0), 0, 0.47, 0); o.size = 0.85;
    };
    B.passion = function (g, o) { rb(g, o, 0x6b2c7e, 1, 1, 1, 0.02, 14, 0.4); o.size = 0.5; };
    B.guava = function (g, o) {
      rb(g, o, 0xa9cf5c, 1, 1.05, 1, 0.012, 8, 0.5);
      add(g, new THREE.ConeGeometry(0.06, 0.06, 6), M(0x5a7a2a, 0.7, 0), 0, 0.53, 0); o.size = 0.55;
    };
    B.custard = function (g, o) { rb(g, o, 0x9bbf4a, 1, 0.95, 1, 0.035, 12, 0.7); o.size = 0.6; };
    B.mangosteen = function (g, o) {
      rb(g, o, 0x4a1d3d, 1, 0.85, 1, 0.006, 10, 0.4); calyx(g, 0.42, 0x4f8a2b, 6, 0.16, 0.05); o.size = 0.5;
    };
    B.mango = function (g, o) {
      var gm = sph(0.5, 36, 26); bump(gm, 0.01, 6, o.seed); gm.scale(1.15, 0.95, 0.8); vgrad(gm, "x", 0xa6c03a, 0xf0983a);
      add(g, gm, M(0xffffff, 0.4, 0, { vertexColors: true }));
      add(g, new THREE.CylinderGeometry(0.015, 0.02, 0.1, 6), M(0x5a3b1e, 0.8, 0), -0.4, 0.3, 0).rotation.z = 0.5; o.size = 0.68;
    };
    B.papaya = function (g, o) {
      var gm = sph(0.5, 36, 26); bump(gm, 0.008, 6, o.seed); gm.scale(1.5, 0.8, 0.8); vgrad(gm, "x", 0x9ab83a, 0xf0a030);
      add(g, gm, M(0xffffff, 0.5, 0, { vertexColors: true })); o.size = 0.85;
    };
    B.blueberry = function (g, o) { o.blue = true; B.grape(g, o); };
    B.cherry = function (g, o) {
      ball(g, 0xa8101c, 0.2, -0.2, 0, 0, 0.25); ball(g, 0x9a0e1a, 0.2, 0.2, 0, -0.05, 0.25);
      stick(g, new V3(-0.2, 0.18, 0), new V3(0, 0.55, 0), 0.012, 0x5f7a2f); stick(g, new V3(0.2, 0.18, -0.05), new V3(0, 0.55, 0), 0.012, 0x5f7a2f); o.size = 0.6;
    };
    B.lychee = function (g, o) {
      [[-0.22, 0, 0], [0.22, 0, 0.05], [0, 0.05, -0.3]].forEach(function (p) {
        var gm = sph(0.22, 24, 18); bump(gm, 0.012, 36, o.seed + p[0] * 10); add(g, gm, M(0xc9323a, 0.55, 0), p[0], p[1], p[2]);
      }); o.size = 0.6;
    };
    B.longan = function (g, o) {
      [[-0.22, 0, 0], [0.22, 0, 0.05], [0, 0.05, -0.3]].forEach(function (p) { ball(g, 0xc9a46a, 0.22, p[0], p[1], p[2], 0.6); }); o.size = 0.6;
    };
    B.starfruit = function (g, o) {
      var gm = sph(0.5, 36, 26); ribs(gm, 5, 0.3); gm.scale(0.75, 1.3, 0.75); add(g, gm, M(0xeccb3a, 0.4, 0)); g.rotation.z = Math.PI / 2; o.size = 0.8;
    };
    B.sweetpotato = function (g, o) { rb(g, o, 0x8f4a63, 1.7, 0.7, 0.7, 0.04, 4, 0.8); o.size = 0.8; };
    B.scallion = function (g, o) {
      for (var k = 0; k < 4; k++) {
        var z = (k - 1.5) * 0.09, ang = (k - 1.5) * 0.07;
        var w = add(g, new THREE.CylinderGeometry(0.035, 0.045, 0.35, 8), M(0xf2f2e2, 0.6, 0), -0.38, 0, z); w.rotation.z = Math.PI / 2;
        var gr = add(g, new THREE.CylinderGeometry(0.03, 0.04, 0.7, 8), M(0x3f9a2b, 0.6, 0), 0.15, 0, z + ang * 0.2); gr.rotation.z = Math.PI / 2; gr.rotation.y = ang;
      }
      o.size = 1.0;
    };
    B.cauliflower = function (g, o) {
      o.white = true; B.broccoli(g, o);
      for (var k = 0; k < 4; k++) { var p = piv(g, 0, -0.1, 0, k / 4 * TAU), lf = add(p, sph(0.5, 12, 8), MD(0x5aa83a, 0.7, 0), 0.25, 0.02, 0); lf.scale.set(0.5, 0.05, 0.22); lf.rotation.z = 0.5; }
    };
    B.cabbage = function (g, o) {
      var t = ctex("cb", 128, 128, function (c) {
        c.fillStyle = "#a9cf7a"; c.fillRect(0, 0, 128, 128); c.strokeStyle = "#7fae50"; c.lineWidth = 2;
        for (var i = 0; i < 16; i++) { c.beginPath(); c.moveTo(i * 8, 0); c.bezierCurveTo(i * 8 + 20, 40, i * 8 - 20, 90, i * 8, 128); c.stroke(); }
      });
      var gm = sph(0.5, 36, 26); bump(gm, 0.012, 10, o.seed); gm.scale(1, 0.9, 1); add(g, gm, TM("cb", t, 0.7)); o.size = 0.75;
    };
    B.lettuce = function (g, o) {
      var t = ctex("lt", 128, 128, function (c) {
        c.fillStyle = "#7cc04a"; c.fillRect(0, 0, 128, 128); c.strokeStyle = "#a9dd7a"; c.lineWidth = 2;
        for (var i = 0; i < 14; i++) { c.beginPath(); c.moveTo(i * 9, 0); c.bezierCurveTo(i * 9 + 25, 40, i * 9 - 25, 90, i * 9, 128); c.stroke(); }
      });
      var gm = sph(0.5, 44, 32); bump(gm, 0.07, 12, o.seed); gm.scale(1.1, 0.85, 1.1); add(g, gm, TM("lt", t, 0.7)); o.size = 0.75;
    };
    B.greens = function (g, o) {
      var r = o.rnd, n = 8;
      for (var k = 0; k < n; k++) {
        var p = piv(g, 0, 0, 0, (k / (n - 1) - 0.5) * 2.2);
        var lf = add(p, sph(0.5, 16, 10), M(r() > 0.5 ? 0x3f9b3a : 0x4aa83f, 0.65, 0), 0.45, (k % 3) * 0.025, 0); lf.scale.set(0.75, 0.06, 0.3); lf.rotation.z = 0.12 + r() * 0.1;
        add(p, new THREE.CylinderGeometry(0.025, 0.03, 0.35, 6), M(0xcfe3a0, 0.6, 0), 0.12, 0, 0).rotation.z = Math.PI / 2;
      }
      o.size = 0.8;
    };
    B.ginger = function (g, o) {
      var m = M(0xd1a362, 0.8, 0);
      [[0, 0, 0, 0, 1.0], [0.3, 0.06, 0.12, 0.7, 0.7], [-0.3, 0.04, -0.1, -0.6, 0.7], [0.1, 0.1, -0.2, 0.3, 0.5], [-0.1, 0.08, 0.2, -0.3, 0.5]].forEach(function (b) {
        var gm = new THREE.CapsuleGeometry(0.11, 0.3 * b[4], 6, 12); gm.rotateZ(Math.PI / 2); bump(gm, 0.02, 14, o.seed + b[0] * 5);
        var mm = add(g, gm, m, b[0], b[1], b[2]); mm.rotation.y = b[3]; mm.scale.y = 0.8;
      });
      o.size = 0.7;
    };

    /* ---- đồ không phải thực phẩm ---- */
    B.bottle = function (g, o, it) {
      var h = hueOf(it.cat + it.name), col = new THREE.Color("hsl(" + h + ",50%,60%)").getHex();
      add(g, lathe([[0, -0.5], [0.2, -0.5], [0.23, -0.46], [0.23, 0.12], [0.2, 0.22], [0.11, 0.3], [0.085, 0.34], [0.085, 0.44]], 28), mat(col, 0.15, 0.1, { transparent: true, opacity: 0.85 }));
      add(g, new THREE.CylinderGeometry(0.19, 0.19, 0.55, 20), M(new THREE.Color("hsl(" + h + ",60%,45%)").getHex(), 0.4, 0), 0, -0.22, 0);
      add(g, new THREE.CylinderGeometry(0.095, 0.095, 0.1, 16), M(0xf5f5f5, 0.4, 0), 0, 0.5, 0);
      var lm = mat(0xffffff, 0.6, 0, { map: emojiTex(icon(it), h), side: THREE.DoubleSide });
      add(g, new THREE.CylinderGeometry(0.235, 0.235, 0.36, 24, 1, true, -0.95, 1.9), lm, 0, -0.17, 0);
      add(g, new THREE.CylinderGeometry(0.235, 0.235, 0.36, 24, 1, true, Math.PI - 0.95, 1.9), lm, 0, -0.17, 0);
      o.size = 0.85;
    };
    B.can = function (g, o, it) {
      var h = hueOf(it.cat + it.name);
      add(g, new THREE.CylinderGeometry(0.25, 0.25, 0.7, 28), M(0xcfd5de, 0.25, 0.9));
      add(g, new THREE.CylinderGeometry(0.255, 0.255, 0.46, 28, 1, true), MD(new THREE.Color("hsl(" + h + ",60%,45%)").getHex(), 0.4, 0.2));
      var lm = mat(0xffffff, 0.6, 0, { map: emojiTex(icon(it), h), side: THREE.DoubleSide });
      add(g, new THREE.CylinderGeometry(0.258, 0.258, 0.4, 24, 1, true, -1.1, 2.2), lm);
      add(g, new THREE.CylinderGeometry(0.25, 0.23, 0.03, 28), M(0xb8c0cc, 0.25, 0.9), 0, 0.36, 0); o.size = 0.7;
    };
    B.pouch = function (g, o, it) {
      var h = hueOf(it.cat + it.name), gm = new THREE.BoxGeometry(0.56, 0.8, 0.14, 14, 20, 4), p = gm.attributes.position;
      for (var i = 0; i < p.count; i++) {
        var nx = p.getX(i) / 0.28, ny = p.getY(i) / 0.4, z = p.getZ(i), belly = (1 - nx * nx) * (1 - Math.pow(Math.abs(ny), 3));
        z += (z >= 0 ? 1 : -1) * belly * 0.09; if (Math.abs(ny) > 0.88) z *= 0.35; p.setZ(i, z);
      }
      gm.computeVertexNormals();
      var sd = M(new THREE.Color("hsl(" + h + ",55%,48%)").getHex(), 0.35, 0.4), lab = mat(0xffffff, 0.45, 0.1, { map: emojiTex(icon(it), h) });
      add(g, gm, [sd, sd, sd, sd, lab, lab]); o.size = 0.75;
    };

    /* ================= BỘ DỰNG ĐÃ NÂNG CẤP (texture + bump, chi tiết thật) ================= */
/* ---- hàm phụ: vẽ texture da quả (liền mạch theo chiều ngang) ---- */
function wd(c, w, x, y, r) { [-w, 0, w].forEach(function (d) { c.beginPath(); c.arc(x + d, y, r, 0, TAU); c.fill(); }); }
function specks(c, w, h, n, seed, r0, r1, col, a) {
  var r = rng(seed); c.fillStyle = col;
  for (var i = 0; i < n; i++) { c.globalAlpha = a * (0.4 + r() * 0.6); wd(c, w, r() * w, r() * h, r0 + r() * (r1 - r0)); }
  c.globalAlpha = 1;
}
function streaks(c, w, h, n, seed, col, a, lw) {               /* vệt dọc quả */
  var r = rng(seed); c.strokeStyle = col; c.lineCap = "round";
  for (var i = 0; i < n; i++) {
    var x = r() * w, ph = r() * 6; c.globalAlpha = a * (0.4 + r() * 0.6); c.lineWidth = lw * (0.4 + r());
    c.beginPath(); for (var y = 0; y <= h; y += 6) { var xx = x + Math.sin(y * 0.05 + ph) * 3; if (y) c.lineTo(xx, y); else c.moveTo(xx, y); } c.stroke();
  }
  c.globalAlpha = 1;
}
function vband(c, w, h, stops) {
  var gr = c.createLinearGradient(0, 0, 0, h); stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
  c.fillStyle = gr; c.fillRect(0, 0, w, h);
}
/* vật liệu: texture màu + dùng chính nó làm bump map (lỗ chân lông, múi, hạt nổi lên thật) */
function TB(key, tex, r, bs, dbl) {
  var k = "b" + key + (dbl ? "d" : ""); if (mc[k]) return mc[k];
  return (mc[k] = mat(0xffffff, r, 0, { map: tex, bumpMap: tex, bumpScale: bs == null ? 1 : bs, side: dbl ? THREE.DoubleSide : THREE.FrontSide }));
}
function skin(g, key, w, h, draw, sx, sy, sz, amt, freq, rough, bs, o) {   /* quả tròn có da */
  var t = ctex(key, w, h, draw), gm = sph(0.5, 48, 34);
  if (amt) bump(gm, amt, freq, o.seed); gm.scale(sx, sy, sz);
  return add(g, gm, TB(key, t, rough, bs));
}
function leaf(g, x, y, z, col) { var lf = add(g, sph(0.1, 14, 8), M(col, 0.6, 0), x, y, z); lf.scale.set(1.3, 0.13, 0.6); lf.rotation.z = 0.4; return lf; }
function curvedStem(g, a, b, c, rad, col) {
  var cu = new THREE.QuadraticBezierCurve3(new V3(a[0], a[1], a[2]), new V3(b[0], b[1], b[2]), new V3(c[0], c[1], c[2]));
  return add(g, tube(cu, 8, 6, rad, function (u) { return 1 - u * 0.3; }), M(col, 0.8, 0));
}
function hairs(g, rx, ry, rz, n, len, rad, c1, c2, r, sides) {   /* gai/lông có chuyển màu gốc→ngọn */
  var cg = new THREE.ConeGeometry(rad, len, sides || 5, 3); cg.translate(0, len / 2, 0); vgrad(cg, "y", c1, c2);
  var m = M(0xffffff, 0.65, 0, { vertexColors: true }), up = new V3(0, 1, 0);
  for (var k = 0; k < n; k++) {
    var z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z), d = new V3(s * Math.cos(a), z, s * Math.sin(a));
    var o = add(g, cg, m, d.x * rx, d.y * ry, d.z * rz); o.quaternion.setFromUnitVectors(up, d);
  }
}
function citrus(c1, c2, pore, n) {
  return function (c, w, h) {
    vband(c, w, h, [[0, c2], [0.5, c1], [1, c2]]);
    specks(c, w, h, n, 7, 0.8, 1.8, pore, 0.55); specks(c, w, h, n / 3, 11, 1.5, 2.6, "#fff2c0", 0.12);
  };
}

function tube(curve, seg, rseg, rad, taper, colorFn) {
  var gm = new THREE.TubeGeometry(curve, seg, rad, rseg, false), p = gm.attributes.position;
  var v = new V3(), c = new V3(), cc = new THREE.Color(), col = colorFn ? new Float32Array(p.count * 3) : null;
  for (var i = 0; i < p.count; i++) {
    var t = Math.floor(i / (rseg + 1)) / seg;
    curve.getPointAt(Math.min(t, 1), c); v.fromBufferAttribute(p, i); v.sub(c).multiplyScalar(taper(t)).add(c); p.setXYZ(i, v.x, v.y, v.z);
    if (col) { cc.set(colorFn(t)); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
  }
  if (col) gm.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return gm;
}

/* ---- TRÁI CÂY ---- */
B.apple = function (g, o) {
  var k = o.green ? "g" : o.yellow ? "y" : "r";
  var c1 = o.green ? "#9acd3c" : o.yellow ? "#f2d34a" : "#cf2418", c2 = o.green ? "#6fa626" : o.yellow ? "#d9a826" : "#7e100c";
  var t = ctex("ap2" + k, 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, c2], [0.16, c1], [0.85, c1], [1, c2]]);
    if (k == "r") { streaks(c, w, h, 70, 3, "#f2a63a", 0.32, 5); streaks(c, w, h, 50, 9, "#5a0a0a", 0.3, 4); }
    specks(c, w, h, 320, 5, 0.8, 1.6, "#f6e8a8", 0.55);
  });
  var gm = lathe([[0, -0.42], [0.2, -0.41], [0.38, -0.3], [0.49, -0.08], [0.49, 0.14], [0.38, 0.33], [0.2, 0.4], [0.09, 0.36], [0, 0.28]], 40);
  ribs(gm, 5, 0.012); bump(gm, 0.01, 8, o.seed); add(g, gm, TB("ap2" + k, t, 0.32, 0.6));
  curvedStem(g, [0, 0.3, 0], [0, 0.42, 0], [0.04, 0.5, 0], 0.016, 0x5a3b1e); leaf(g, 0.1, 0.47, 0, 0x3f8f2a); o.size = 0.6;
};
B.orange = function (g, o) {
  var y = o.yellow;
  skin(g, "or2" + (y ? 1 : 0), 256, 256, citrus(y ? "#f4b82a" : "#f59a22", y ? "#d9941a" : "#dd6c0e", "#b8560a", 1800), 1, 0.94, 1, 0.012, 5, 0.6, 1.5, o);
  var nv = ball(g, y ? 0xd9941a : 0xdd6c0e, 0.05, 0, -0.46, 0, 0.7); nv.scale.y = 0.5;
  calyx(g, 0.46, 0x4b7a2a, 5, 0.1, 0.03); add(g, new THREE.CylinderGeometry(0.02, 0.025, 0.04, 8), M(0x4b7a2a, 0.7, 0), 0, 0.48, 0); o.size = 0.58;
};
B.lemon = function (g, o) {
  var yl = (o.yellow || /lemon/.test(o.nm));
  skin(g, "le2" + (yl ? 1 : 0), 256, 256, citrus(yl ? "#f5d928" : "#7fc23a", yl ? "#dcb214" : "#5d9a26", yl ? "#c49a10" : "#3f7a1a", 1800), 1.28, 0.95, 0.95, 0.008, 5, 0.5, 1.6, o);
  [-1, 1].forEach(function (s) { var n = add(g, sph(0.07, 12, 10), M(yl ? 0xe9c81c : 0x6aab2e, 0.5, 0), s * 0.62, 0, 0); n.scale.set(1.2, 1, 1); });
  o.size = 0.55;
};
B.peach = function (g, o) {
  skin(g, "pe2", 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#e8a35c"], [0.5, "#f6c27a"], [1, "#f0b26a"]]);
    var gr = c.createRadialGradient(w * 0.3, h * 0.45, 4, w * 0.3, h * 0.45, w * 0.3);
    gr.addColorStop(0, "rgba(214,60,50,.85)"); gr.addColorStop(1, "rgba(214,60,50,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    specks(c, w, h, 900, 5, 0.6, 1.4, "#ffffff", 0.18); c.fillStyle = "rgba(150,50,30,.35)"; c.fillRect(w * 0.55, h * 0.12, 3, h * 0.76);
  }, 1, 0.95, 1, 0.012, 7, 0.85, 0.8, o);
  leaf(g, 0.08, 0.47, 0, 0x3f8f2a); o.size = 0.55;
};
B.plum = function (g, o) {
  skin(g, "pl2", 128, 128, function (c, w, h) {
    vband(c, w, h, [[0, "#3a1a4a"], [0.5, "#5b2a6b"], [1, "#44204f"]]); specks(c, w, h, 500, 3, 1, 2.5, "#b8a8d0", 0.14);
  }, 1, 0.95, 0.95, 0.006, 12, 0.3, 0.2, o); o.size = 0.5;
};
B.kiwi = function (g, o) {
  skin(g, "ki2", 256, 256, function (c, w, h) {
    c.fillStyle = "#8d6a3a"; c.fillRect(0, 0, w, h); var r = rng(4); c.lineCap = "round";
    for (var i = 0; i < 700; i++) { c.strokeStyle = r() > 0.5 ? "rgba(190,150,100,.6)" : "rgba(60,40,20,.5)"; c.lineWidth = 1; var x = r() * w, y = r() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 8, y + (r() - 0.5) * 8); c.stroke(); }
  }, 1.15, 0.9, 0.9, 0.012, 48, 0.95, 1.2, o); o.size = 0.55;
};
B.coconut = function (g, o) {
  skin(g, "co2", 256, 256, function (c, w, h) {
    c.fillStyle = "#6b4528"; c.fillRect(0, 0, w, h);
    streaks(c, w, h, 90, 2, "#3a2412", 0.5, 2); streaks(c, w, h, 90, 8, "#9a7048", 0.4, 2);
  }, 1, 1, 1, 0.012, 28, 0.9, 1.5, o);
  [[0.32, 0.3, 0.3], [0.4, 0.2, 0.18], [0.28, 0.18, 0.4]].forEach(function (d) {
    var v = new V3(d[0], d[1], d[2]).normalize().multiplyScalar(0.5); ball(g, 0x1c110a, 0.045, v.x, v.y, v.z, 0.8);
  }); o.size = 0.7;
};
B.tomato = function (g, o) {
  skin(g, "to2", 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#a81a10"], [0.2, "#d8301f"], [0.7, "#e2412a"], [1, "#b8220f"]]);
    streaks(c, w, h, 30, 4, "#f06a40", 0.2, 6); specks(c, w, h, 300, 3, 0.8, 1.4, "#ffd0b0", 0.15);
  }, 1, 0.82, 1, 0.01, 6, 0.22, 0.6, o);
  calyx(g, 0.4, 0x3d8f2c, 6, 0.22, 0.045); curvedStem(g, [0, 0.4, 0], [0.02, 0.5, 0], [0.08, 0.52, 0], 0.018, 0x4f8a2b); o.size = 0.55;
};
B.strawberry = function (g, o) {
  var t = ctex("sb2", 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#e0303a"], [0.6, "#cc1f2a"], [1, "#a9141f"]]); var r = rng(5);
    for (var i = 0; i < 170; i++) {
      var x = r() * w, y = h * 0.1 + r() * h * 0.82;
      c.fillStyle = "rgba(110,15,15,.55)"; c.beginPath(); c.ellipse(x, y, 3.6, 4.8, 0, 0, TAU); c.fill();
      c.fillStyle = "#ffe08a"; c.beginPath(); c.ellipse(x, y, 1.5, 2.4, 0, 0, TAU); c.fill();
    }
  });
  var gm = lathe([[0, -0.46], [0.1, -0.4], [0.24, -0.22], [0.34, 0.02], [0.36, 0.2], [0.3, 0.32], [0.15, 0.36], [0, 0.35]], 32);
  bump(gm, 0.008, 12, o.seed); add(g, gm, TB("sb2", t, 0.38, 1.2));
  calyx(g, 0.34, 0x3d8f2c, 9, 0.22, 0.04); add(g, new THREE.CylinderGeometry(0.014, 0.018, 0.1, 6), M(0x3d8f2c, 0.6, 0), 0, 0.4, 0); o.size = 0.5;
};
B.banana = function (g, o) {
  for (var k = 0; k < 2; k++) {
    (function (k) {
      var cu = new THREE.QuadraticBezierCurve3(new V3(-0.5, 0.12, 0), new V3(0, -0.3, 0), new V3(0.5, 0.12, 0));
      var gm = tube(cu, 28, 6, 0.12, function (t) { return 0.5 + 0.5 * Math.sin(Math.PI * t); }, function (t) {
        if (t < 0.05 || t > 0.96) return 0x4a3a1c;
        if (Math.sin(t * 131 + k * 7) * Math.sin(t * 57 + k * 3) > 0.86) return 0x6b4a1a;      /* đốm nâu */
        return (t < 0.18 || t > 0.86) ? 0xc9d23a : (k ? 0xeccb28 : 0xf4d630);                 /* hai đầu hơi xanh */
      });
      var m = add(g, gm, M(0xffffff, 0.45, 0, { vertexColors: true }));
      m.position.set(0, k * 0.02, (k - 0.5) * 0.28); m.rotation.y = k ? 0.12 : -0.1;
      ball(m, 0x4a3a1c, 0.06, -0.5, 0.12, 0, 0.8); ball(m, 0x3a2e16, 0.05, 0.5, 0.12, 0, 0.8);
    })(k);
  }
  o.size = 0.9;
};
B.watermelon = function (g, o) {
  var t = ctex("wm2", 512, 256, function (c, w, h) {
    c.fillStyle = "#5fb35a"; c.fillRect(0, 0, w, h); specks(c, w, h, 500, 2, 3, 10, "#3f8f45", 0.18);
    c.strokeStyle = "#1d5a2a"; c.lineCap = "round"; var r = rng(8);
    for (var x = 0; x < w; x += w / 12) {
      c.globalAlpha = 0.85; c.lineWidth = 18 + r() * 10; c.beginPath();
      for (var y = 0; y <= h; y += 8) { var xx = x + Math.sin(y * 0.06 + x) * 9 + Math.sin(y * 0.19 + x * 2) * 3; if (y) c.lineTo(xx, y); else c.moveTo(xx, y); }
      c.stroke();
    }
    c.globalAlpha = 1;
  });
  var gm = sph(0.5, 48, 34); gm.rotateZ(Math.PI / 2); bump(gm, 0.008, 4, o.seed); gm.scale(1.3, 1, 1);
  add(g, gm, TB("wm2", t, 0.35, 0.8)); add(g, new THREE.CylinderGeometry(0.02, 0.03, 0.06, 8), M(0x5a6a2a, 0.8, 0), 0, 0.5, 0); o.size = 0.95;
};
B.melon = function (g, o) {
  skin(g, "me2", 256, 256, function (c, w, h) {
    c.fillStyle = "#d8c585"; c.fillRect(0, 0, w, h); var r = rng(3); c.strokeStyle = "rgba(125,100,50,.75)"; c.lineWidth = 1.6;
    for (var i = 0; i < 220; i++) { var x = r() * w, y = r() * h; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 10, y + 6, x + 4, y + 16, x + 18, y + 22); c.stroke(); }
  }, 1.08, 1, 1, 0.012, 4, 0.7, 2, o); o.size = 0.7;
};
B.pineapple = function (g, o) {
  var t = ctex("pa2", 256, 256, function (c, w, h) {
    c.fillStyle = "#6a4210"; c.fillRect(0, 0, w, h);
    for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) {
      var x = i * 32 + (j % 2 ? 16 : 0) + 14, y = j * 32 + 16, gr = c.createRadialGradient(x, y - 2, 2, x, y, 18);
      gr.addColorStop(0, "#efc050"); gr.addColorStop(0.7, "#c98f26"); gr.addColorStop(1, "#7a4d12");
      c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, 14, 15, 0, 0, TAU); c.fill();
      c.fillStyle = "#3a2208"; c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill();
    }
  });
  t.repeat.set(2, 2.5);
  var gm = sph(0.5, 40, 30); gm.scale(0.72, 1, 0.72); add(g, gm, TB("pa2", t, 0.6, 1.5));
  var cg = new THREE.ConeGeometry(0.055, 0.55, 5, 1); cg.translate(0, 0.275, 0); vgrad(cg, "y", 0x2a6e22, 0x7bbd4a);
  var lm = M(0xffffff, 0.6, 0, { vertexColors: true });
  for (var j = 0; j < 4; j++) {
    var n = 7 + j * 3;
    for (var k = 0; k < n; k++) {
      var p = piv(g, 0, 0.48, 0, k / n * TAU + j), m = add(p, cg, lm); m.rotation.z = -(0.1 + j * 0.2); m.scale.y = 1 - j * 0.17;
    }
  }
  o.size = 1.0;
};
B.grape = function (g, o) {
  var r = o.rnd, col = o.blue ? 0x34408f : o.green ? 0xb5d24c : 0x5a2a86, gb = sph(0.1, 18, 14), m = M(col, 0.3, 0);
  [[0.22, 0.3, 7], [0.2, 0.16, 7], [0.15, 0.02, 6], [0.09, -0.12, 4], [0, -0.26, 1]].forEach(function (L) {
    for (var k = 0; k < L[2]; k++) {
      var a = k / L[2] * TAU + r(), b = add(g, gb, m, Math.cos(a) * L[0], L[1] + (r() - 0.5) * 0.04, Math.sin(a) * L[0]); b.scale.setScalar(0.9 + r() * 0.2);
    }
  });
  curvedStem(g, [0, 0.38, 0], [0, 0.48, 0], [0.05, 0.56, 0], 0.016, 0x5a4a2a); o.size = 0.6;
};
B.durian = function (g, o) {
  rb(g, o, 0xa9b04a, 1.15, 1, 1, 0.008, 6, 0.7);
  hairs(g, 0.55, 0.48, 0.48, 80, 0.17, 0.07, 0x8f9a3a, 0xd6c868, o.rnd, 4); o.size = 0.9;
};
B.rambutan = function (g, o) {
  rb(g, o, 0xc9231f, 1.1, 1, 1, 0.004, 6, 0.6);
  hairs(g, 0.5, 0.46, 0.46, 170, 0.13, 0.014, 0xc9231f, 0xb8d84a, o.rnd, 5); o.size = 0.55;
};
B.dragon = function (g, o) {
  rb(g, o, 0xd81b60, 1.15, 1, 0.9, 0.006, 8, 0.5);
  hairs(g, 0.52, 0.46, 0.42, 22, 0.22, 0.07, 0xd81b60, 0x6ab04a, o.rnd, 5); o.size = 0.75;
};

/* ---- RAU CỦ ---- */
B.carrot = function (g, o) {
  var t = ctex("ca2", 128, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#f39a24"], [1, "#e56f16"]]); var r = rng(6); c.strokeStyle = "rgba(150,60,10,.55)";
    for (var i = 0; i < 70; i++) { c.lineWidth = 1 + r() * 1.5; var x = r() * w, y = r() * h, l = 10 + r() * 40; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y + (r() - 0.5) * 2); c.stroke(); }
    specks(c, w, h, 200, 3, 0.8, 1.6, "#ffd09a", 0.3);
  });
  var gm = new THREE.ConeGeometry(0.15, 1, 24, 16); gm.rotateZ(-Math.PI / 2); bump(gm, 0.008, 50, o.seed); add(g, gm, TB("ca2", t, 0.6, 1.2));
  add(g, new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8), M(0x4a7f2a, 0.7, 0), -0.5, 0, 0).rotation.z = Math.PI / 2;
  for (var k = 0; k < 5; k++) {
    var lf = add(g, new THREE.ConeGeometry(0.025, 0.4, 6), M(0x3f9a2b, 0.7, 0), -0.7, (k - 2) * 0.03, (k % 2 ? 1 : -1) * 0.03);
    lf.rotation.z = Math.PI / 2 + (k - 2) * 0.12;
  }
  o.size = 0.95;
};
B.cucumber = function (g, o) {
  var t = ctex("cu2", 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#b7c24a"], [0.12, "#2d6a2a"], [0.88, "#2d6a2a"], [1, "#c5c850"]]);
    streaks(c, w, h, 40, 3, "#7fb04a", 0.45, 5); specks(c, w, h, 300, 5, 1, 2.4, "#8fbf55", 0.5);
  });
  var gm = new THREE.CapsuleGeometry(0.15, 0.55, 8, 24); gm.rotateZ(Math.PI / 2); bump(gm, 0.008, 60, o.seed); add(g, gm, TB("cu2", t, 0.45, 1)); o.size = 0.9;
};
B.eggplant = function (g, o) {
  var gm = lathe([[0, -0.5], [0.2, -0.48], [0.34, -0.38], [0.4, -0.2], [0.34, 0.05], [0.22, 0.3], [0.15, 0.48]], 40);
  vgrad(gm, "y", 0x2a0c3a, 0x4d1a68); add(g, gm, M(0xffffff, 0.18, 0.05, { vertexColors: true }));
  calyx(g, 0.47, 0x3f8a2b, 7, 0.2, 0.05);
  var cap = add(g, sph(0.2, 16, 10), M(0x3f8a2b, 0.6, 0), 0, 0.5, 0); cap.scale.set(1, 0.35, 1);
  add(g, new THREE.CylinderGeometry(0.03, 0.04, 0.14, 8), M(0x3f8a2b, 0.6, 0), 0, 0.6, 0);
  g.rotation.z = Math.PI / 2.3; o.size = 0.85;
};
B.bellpepper = function (g, o) {
  var gm = sph(0.5, 48, 34); ribs(gm, 4, 0.07); bump(gm, 0.01, 6, o.seed); gm.scale(0.95, 1.05, 0.95);
  var c1 = o.green ? 0x2f7d20 : o.yellow ? 0xdba90c : 0xa51610, c2 = o.green ? 0x4cae33 : o.yellow ? 0xf7cf2a : 0xe0301f;
  vgrad(gm, "y", c1, c2); add(g, gm, M(0xffffff, 0.22, 0, { vertexColors: true }));
  curvedStem(g, [0, 0.46, 0], [0.01, 0.58, 0], [0.07, 0.64, 0], 0.035, 0x4f8a2b);
  add(g, sph(0.1, 12, 8), M(0x4f8a2b, 0.6, 0), 0, 0.5, 0).scale.y = 0.4; o.size = 0.6;
};
B.chili = function (g, o) {
  for (var k = 0; k < 2; k++) {
    var cu = new THREE.CubicBezierCurve3(new V3(-0.5, 0.02, 0), new V3(-0.15, -0.12, 0), new V3(0.2, 0.14, 0), new V3(0.55, -0.06, 0));
    var gm = tube(cu, 28, 10, 0.075, function (t) { return t < 0.1 ? 1.2 : Math.max(0.12, 1 - t * 0.95); },
      function (t) { return o.green ? (t > 0.85 ? 0x2f7d20 : 0x3f9a2b) : (t > 0.85 ? 0x8f140e : 0xd3231a); });
    var m = add(g, gm, M(0xffffff, 0.22, 0, { vertexColors: true })); m.position.set(0, k * 0.12, (k - 0.5) * 0.18); m.rotation.y = (k - 0.5) * 0.4;
    var cp = ball(m, 0x3f8a2b, 0.09, -0.5, 0.03, 0, 0.6); cp.scale.set(0.7, 0.7, 1);
    add(m, new THREE.CylinderGeometry(0.012, 0.016, 0.12, 6), M(0x3f8a2b, 0.6, 0), -0.58, 0.07, 0).rotation.z = 0.9;
  }
  o.size = 0.95;
};
B.corn = function (g, o) {
  var t = ctex("co3", 256, 128, function (c, w, h) {
    c.fillStyle = "#b8860a"; c.fillRect(0, 0, w, h);
    for (var x = 0; x < w; x += 12) for (var y = 0; y < h; y += 10) {
      var xx = x + (Math.floor(y / 10) % 2 ? 6 : 0), gr = c.createRadialGradient(xx + 4, y + 4, 1, xx + 5, y + 5, 7);
      gr.addColorStop(0, "#ffe27a"); gr.addColorStop(0.6, "#f1be2c"); gr.addColorStop(1, "#a8740a");
      c.fillStyle = gr; c.beginPath(); c.ellipse(xx + 5, y + 5, 5.4, 4.6, 0, 0, TAU); c.fill();
    }
  });
  var gm = new THREE.CylinderGeometry(0.17, 0.15, 0.7, 32, 6); gm.rotateZ(-Math.PI / 2); add(g, gm, TB("co3", t, 0.45, 1.6));
  var tip = add(g, sph(0.16, 16, 12), TB("co3", t, 0.45, 1.6), 0.35, 0, 0); tip.scale.set(0.9, 0.9, 0.9);
  for (var s = 0; s < 8; s++) stick(g, new V3(0.4, 0, 0), new V3(0.6, (s - 3.5) * 0.02, (s % 3 - 1) * 0.03), 0.004, 0xc9a45a);
  for (var k = 0; k < 4; k++) {
    var p = piv(g, -0.12, 0, 0, 0); p.rotation.x = k / 4 * TAU;
    var lf = add(p, sph(0.5, 14, 8), MD(k % 2 ? 0x5aa83a : 0x4a9a32, 0.7, 0), 0.2, 0.19, 0); lf.scale.set(0.7, 0.03, 0.17); lf.rotation.z = -0.12;
  }
  o.size = 0.9;
};
B.potato = function (g, o) {
  skin(g, "po2", 256, 256, function (c, w, h) {
    c.fillStyle = "#cfae78"; c.fillRect(0, 0, w, h); specks(c, w, h, 90, 3, 6, 16, "#a88650", 0.22);
    specks(c, w, h, 500, 5, 0.8, 2.2, "#7a5a30", 0.5); specks(c, w, h, 250, 8, 0.8, 1.6, "#f0dcae", 0.4);
  }, 1.25, 0.85, 0.95, 0.07, 4.5, 0.88, 1.5, o);
  var r = o.rnd; for (var k = 0; k < 6; k++) {
    var z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z); ball(g, 0x6b4a26, 0.022, s * Math.cos(a) * 0.62, z * 0.42, s * Math.sin(a) * 0.47, 0.9);
  }
  o.size = 0.65;
};
B.onion = function (g, o) {
  var pu = o.purple, t = ctex("on2" + (pu ? 1 : 0), 128, 256, function (c, w, h) {
    vband(c, w, h, [[0, pu ? "#6a1d45" : "#a56a24"], [0.5, pu ? "#a63a6e" : "#d9a04a"], [1, pu ? "#7a2350" : "#b87a2c"]]);
    streaks(c, w, h, 60, 2, pu ? "#d88ab0" : "#f0cf88", 0.4, 2); streaks(c, w, h, 40, 6, pu ? "#4a1030" : "#7a4a14", 0.3, 2);
  });
  var gm = lathe([[0, -0.36], [0.14, -0.35], [0.34, -0.25], [0.46, -0.05], [0.45, 0.14], [0.32, 0.32], [0.12, 0.46], [0.02, 0.56]], 40);
  ribs(gm, 12, 0.012); add(g, gm, TB("on2" + (pu ? 1 : 0), t, 0.5, 0.7));
  add(g, new THREE.ConeGeometry(0.04, 0.14, 6), M(0x8a5a22, 0.8, 0), 0, 0.62, 0);
  var r = o.rnd; for (var k = 0; k < 8; k++) { var a = r() * TAU, d = r() * 0.07; add(g, new THREE.CylinderGeometry(0.004, 0.004, 0.09, 4), M(0xe8dcc0, 0.8, 0), Math.cos(a) * d, -0.39, Math.sin(a) * d); }
  o.size = 0.55;
};
B.garlic = function (g, o) {
  var t = ctex("ga2", 128, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#d8c9a4"], [0.5, "#f6eedd"], [1, "#efe4cc"]]); streaks(c, w, h, 50, 3, "#b890a8", 0.28, 2); streaks(c, w, h, 40, 7, "#cdbf9a", 0.35, 2);
  });
  var gm = lathe([[0, -0.3], [0.2, -0.28], [0.38, -0.15], [0.42, 0.05], [0.3, 0.25], [0.12, 0.42], [0.02, 0.55]], 36);
  ribs(gm, 6, 0.07); add(g, gm, TB("ga2", t, 0.5, 0.7));
  add(g, new THREE.ConeGeometry(0.03, 0.14, 6), M(0xd8c9a4, 0.8, 0), 0, 0.6, 0);
  var r = o.rnd; for (var k = 0; k < 8; k++) { var a = r() * TAU, d = r() * 0.07; add(g, new THREE.CylinderGeometry(0.004, 0.004, 0.07, 4), M(0xd8c9a4, 0.8, 0), Math.cos(a) * d, -0.32, Math.sin(a) * d); }
  o.size = 0.5;
};
B.broccoli = function (g, o) {
  var r = o.rnd, w = o.white, gb = sph(0.12, 12, 9); bump(gb, 0.03, 24, o.seed);
  vgrad(gb, "y", w ? 0xd9d2b0 : 0x1f5a22, w ? 0xf6f0d8 : 0x4f9a3a);
  var bm = M(0xffffff, 0.9, 0, { vertexColors: true }), sc = w ? 0xe8dcb4 : 0x8fb85b;
  add(g, new THREE.CylinderGeometry(0.09, 0.14, 0.5, 12), M(sc, 0.7, 0), 0, -0.2, 0);
  for (var i = 0; i < 14; i++) {
    var phi = r() * TAU, th = r() * 1.2, rad = 0.27 + r() * 0.05;
    var px = Math.sin(th) * Math.cos(phi) * rad * 1.15, py = 0.12 + Math.cos(th) * rad, pz = Math.sin(th) * Math.sin(phi) * rad * 1.15;
    stick(g, new V3(0, -0.2, 0), new V3(px * 0.7, py * 0.7, pz * 0.7), 0.025, sc);
    add(g, gb, bm, px, py, pz).scale.setScalar(0.9 + r() * 0.4);
    for (var k = 0; k < 6; k++) {
      var a = k / 6 * TAU; add(g, gb, bm, px + Math.cos(a) * 0.1, py + 0.04 + (k % 2) * 0.03, pz + Math.sin(a) * 0.1).scale.setScalar(0.5 + r() * 0.2);
    }
  }
  o.size = 0.7;
};
B.mushroom = function (g, o) {
  var wh = /trang|white/.test(o.nm), key = "mu2" + (wh ? 1 : 0);
  var t = ctex(key, 128, 128, function (c, w, h) {
    vband(c, w, h, [[0, wh ? "#d8cdb8" : "#8a5f38"], [0.5, wh ? "#efe6d4" : "#b88a5c"], [1, wh ? "#f6efe0" : "#d2ab7e"]]);
    specks(c, w, h, 60, 4, 3, 9, wh ? "#c9b48c" : "#7a5430", 0.18); specks(c, w, h, 200, 6, 0.6, 1.2, "#ffffff", 0.2);
  });
  var cap = add(g, new THREE.SphereGeometry(0.5, 40, 18, 0, TAU, 0, Math.PI / 2), TB(key, t, 0.6, 0.6, true), 0, 0.02, 0); cap.scale.y = 0.75;
  var under = add(g, new THREE.CircleGeometry(0.5, 32), M(0xd9c6a0, 0.8, 0), 0, 0.02, 0); under.rotation.x = Math.PI / 2;
  var sg = new THREE.CylinderGeometry(0.11, 0.16, 0.38, 18, 1); ribs(sg, 10, 0.03);
  add(g, sg, M(0xece0c8, 0.7, 0), 0, -0.17, 0); add(g, sph(0.15, 14, 10), M(0xe4d6b8, 0.8, 0), 0, -0.36, 0).scale.y = 0.5; o.size = 0.6;
};
B.egg = function (g, o) {
  var t = ctex("eg2", 128, 128, function (c, w, h) {
    vband(c, w, h, [[0, "#f0e0c8"], [1, "#f7ecd9"]]); specks(c, w, h, 300, 4, 0.6, 1.4, "#c9a982", 0.3);
  });
  var gm = lathe([[0, -0.5], [0.2, -0.46], [0.36, -0.3], [0.4, -0.05], [0.32, 0.2], [0.18, 0.4], [0, 0.5]], 32), m = TB("eg2", t, 0.45, 0.4);
  [[-0.38, 0, 0, 0.1], [0.38, 0, 0, -0.1], [0, 0, 0.36, 0.05]].forEach(function (p) {
    var e = add(g, gm, m, p[0], p[1], p[2]); e.scale.setScalar(0.55); e.rotation.z = p[3];
  });
  o.size = 0.7;
};

    /* ---- nhận dạng loại món: emoji trên POS quyết định, tên chỉ phân biệt trong cùng nhóm ---- */
    var RULES = [
      [/ca chua|tomato/, "tomato"], [/ca rot|carrot/, "carrot"], [/ca tim|eggplant|aubergine/, "eggplant"],
      [/khoai lang|sweet potato/, "sweetpotato"], [/khoai|potato/, "potato"],
      [/hanh la|hanh hoa|scallion|spring onion/, "scallion"], [/hanh|onion|shallot/, "onion"], [/\btoi\b|garlic/, "garlic"],
      [/bong cai xanh|broccoli/, "broccoli"], [/bong cai|sup lo|cauliflower/, "cauliflower"],
      [/bap cai|cai thao|cabbage/, "cabbage"], [/xa lach|lettuce|salad/, "lettuce"],
      [/ot chuong|bell pepper|capsicum/, "bellpepper"], [/\bot\b|chili|chilli/, "chili"],
      [/dua hau|watermelon/, "watermelon"], [/dua leo|dua chuot|cucumber|zucchini/, "cucumber"], [/dua luoi|dua vang|melon|cantaloupe/, "melon"],
      [/chanh day|passion/, "passion"], [/chanh|lime|lemon/, "lemon"], [/chuoi|banana/, "banana"], [/xoai|mango/, "mango"],
      [/du du|papaya/, "papaya"], [/thom|khom|pineapple/, "pineapple"], [/\bbo\b|avocado/, "avocado"], [/\ble\b|pear/, "pear"],
      [/\btao\b|apple/, "apple"], [/\bcam\b|quyt|orange|tangerine|mandarin/, "orange"], [/buoi|pomelo|grapefruit/, "pomelo"],
      [/\bnho\b|grape/, "grape"], [/blueberry|viet quat/, "blueberry"], [/dau tay|strawberry/, "strawberry"], [/cherry|anh dao/, "cherry"],
      [/\bdao\b|peach|nectarine/, "peach"], [/\bman\b|plum|\bmo\b|apricot/, "plum"], [/kiwi/, "kiwi"],
      [/thanh long|dragon/, "dragon"], [/sau rieng|durian/, "durian"], [/chom chom|rambutan/, "rambutan"],
      [/\bvai\b|lychee|litchi/, "lychee"], [/\bnhan\b|longan/, "longan"], [/mang cut|mangosteen/, "mangosteen"],
      [/\boi\b|guava/, "guava"], [/\bkhe\b|starfruit|carambola/, "starfruit"], [/mang cau|\bna\b|custard/, "custard"],
      [/\bbap\b|\bngo\b|corn/, "corn"], [/rau|\bcai\b|spinach|cilantro|herb|mint|basil|kale|bok choy/, "greens"],
      [/\bnam\b|mushroom/, "mushroom"], [/gung|ginger/, "ginger"], [/trung|egg/, "egg"],
      [/\blon\b|\bcan\b|soda|\bbia\b|beer/, "can"],
      [/chai|bottle|nuoc|water|dau an|\boil\b|sauce|tuong|\bsua\b|milk|juice|ruou|wine|shampoo|dau goi|sua tam|rua/, "bottle"]
    ];
    var EMOJI = {
      "🍎": "apple", "🍏": "apple", "🍐": "pear", "🍊": "orange", "🍋": "lemon", "🍌": "banana", "🍉": "watermelon", "🍇": "grape",
      "🍓": "strawberry", "🫐": "blueberry", "🍈": "melon", "🍒": "cherry", "🍑": "peach", "🥭": "mango", "🍍": "pineapple", "🥥": "coconut",
      "🥝": "kiwi", "🍅": "tomato", "🍆": "eggplant", "🥑": "avocado", "🥦": "broccoli", "🥬": "greens", "🥒": "cucumber", "🌶": "chili",
      "🫑": "bellpepper", "🌽": "corn", "🥕": "carrot", "🧄": "garlic", "🧅": "onion", "🥔": "potato", "🍠": "sweetpotato", "🍄": "mushroom",
      "🫚": "ginger", "🥚": "egg", "🧃": "bottle", "🍼": "bottle", "🥤": "bottle", "🧴": "bottle", "💧": "bottle", "🍶": "bottle", "🥫": "can"
    };
    var FAMILY = {                                                       /* emoji dễ nhầm: tên món chỉ được chọn trong nhóm này */
      "🥬": ["greens", "cabbage", "lettuce"], "🥦": ["broccoli", "cauliflower"],
      "🌶": ["chili", "bellpepper"], "🍊": ["orange", "pomelo"], "🍋": ["lemon", "orange"]
    };
    function kindOf(it) {
      var raw = String(it.name || "").toLowerCase(), nm = norm(raw), cat = norm(it.cat), em = String(icon(it) || "").replace(/\uFE0F/g, "");
      var emK = EMOJI[em];
      if (emK) {
        var fam = FAMILY[em];
        if (fam) for (var j = 0; j < RULES.length; j++) if (RULES[j][0].test(nm) && fam.indexOf(RULES[j][1]) >= 0) return RULES[j][1];
        return emK;
      }
      if (/dừa|coconut/.test(raw)) return "coconut";
      if (/ngò|rau mùi/.test(raw)) return "greens";
      for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(nm)) return RULES[i][1];
      if (/non/.test(cat) || em) return "pouch";                         /* emoji lạ → túi in đúng emoji đó */
      return "blob";
    }
    function makeItem(it, idx) {
      var kind = kindOf(it), nm = norm(it.name), em = String(icon(it) || "").replace(/\uFE0F/g, "");
      var o = {
        kind: kind, nm: nm, size: 0.62, seed: (hueOf(it.name) * 13 + idx * 7) % 97 + 1,
        green: /xanh|green|lime/.test(nm) || em === "🍏" || em === "🫑", yellow: /vang|yellow|lemon/.test(nm) || em === "🍋",
        purple: /tim|purple|red onion/.test(nm), blue: /blue|viet quat/.test(nm), white: false
      };
      o.rnd = rng(o.seed);
      var g = new THREE.Group();
      (B[kind] || B.blob)(g, o, it);
      var root = new THREE.Group(); root.add(g); root.updateMatrixWorld(true);
      var bb = new THREE.Box3().setFromObject(root), sz = bb.getSize(new V3()), ctr = bb.getCenter(new V3());
      g.position.set(-ctr.x, -ctr.y, -ctr.z);                           /* tâm mô hình về gốc để logic bay/xếp giữ nguyên */
      root.scale.setScalar(o.size / Math.max(sz.x, sz.y, sz.z, 0.01));
      return root;
    }

    var ents = items.map(function (it, idx) {
      var m = makeItem(it, idx);
      m.visible = false; m.rotation.y = (Math.random() - 0.5) * 0.9; scene.add(m);
      return { it: it, idx: idx, mesh: m, tp: new V3(), slot: -1, free: false };
    });
    function slotWorld(k) { var s = SLOTS[k]; return new V3(BASKET.x + s[0], s[1], BASKET.z + s[2]); }

    var rest = [];
    function setRest(list) {
      rest = list.slice();
      ents.forEach(function (e) { if (!e.free) { e.slot = -1; } });
      rest.forEach(function (it, k) {
        var e = ents[items.indexOf(it)];
        if (!e || e.free) return;
        if (k < SLOTS.length) {
          e.slot = k; e.tp.copy(slotWorld(k));
          if (!e.mesh.visible) { e.mesh.position.copy(e.tp); e.mesh.visible = true; }
        }
      });
      ents.forEach(function (e) { if (!e.free && e.slot < 0 && e.mesh.visible) e.mesh.visible = false; });
    }

    /* ---------- tween ---------- */
    var tweens = [];
    function tween(ms, fn, done) { tweens.push({ t: 0, d: ms / 1000, fn: fn, done: done }); }
    function arc(e, from, to, lift, ms, spin, done) {
      var c = from.clone().add(to).multiplyScalar(0.5); c.y += lift;
      var r0 = e.mesh.rotation.y, p = new V3();
      tween(ms, function (k) {
        var t = easeIO(k), a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
        p.set(a * from.x + b * c.x + d * to.x, a * from.y + b * c.y + d * to.y, a * from.z + b * c.z + d * to.z);
        e.mesh.position.copy(p);
        e.mesh.rotation.y = r0 + spin * t;
        e.mesh.rotation.z = Math.sin(k * Math.PI) * 0.3;
      }, function () { e.mesh.rotation.z = 0; if (done) done(); });
    }

    /* ---------- trạng thái ---------- */
    var mode = "idle", modeUntil = 0, time = 0, scanning = false, ready = false, readyBlend = 0;
    var focus = 0, focusT = 0, shake = 0, mx = 0, my = 0, px = 0, py = 0;
    var curEnt = null, bagN = 0, bagEnts = [], bagSquash = 0, basketCb = null, alive = true;
    var scanPos = new V3(SCAN.x, SCAN_Y, SCAN.z);

    /* ---------- camera POV: 2 tư thế (rộng / màn hình), tự khớp khung ---------- */
    var W = 1, H = 1, poseW = null, poseS = null;
    var camPos = new V3(), camLook = new V3();
    function fit(T, dir, pts, lx, ly) {
      var v = new V3(), d = 2.5;
      for (; d < 70; d += 0.12) {
        camera.position.copy(T).addScaledVector(dir, d); camera.lookAt(T); camera.updateMatrixWorld(true);
        var okk = true;
        for (var i = 0; i < pts.length && okk; i++) {
          v.copy(pts[i]).project(camera);
          if (Math.abs(v.x) > lx || Math.abs(v.y) > ly) okk = false;
        }
        if (okk) break;
      }
      return { pos: camera.position.clone(), look: T.clone() };
    }
    function resize() {
      W = Math.max(cv.clientWidth, 1); H = Math.max(cv.clientHeight, 1);
      renderer.setSize(W, H, false);
      var por = !!(window.matchMedia && window.matchMedia("(max-width:760px)").matches);
      if (por !== isPortrait) {
        isPortrait = por; buildMonitor(por);
        posMount.style.width = PW + "px"; posMount.style.height = PH + "px";
        posMount.classList.toggle("por", por);
      }
      camera.aspect = W / H; camera.fov = W / H < 0.9 ? 46 : 34; camera.updateProjectionMatrix();

      var top = Math.min(MON.bottom + SH + 0.1, 3.0), v = function (x, y, z) { return new V3(x, y, z); };
      var ex = por ? 3.5 : 3.6;
      poseW = fit(v(0, 0.9, 0.1), v(0, 0.55, 0.83).normalize(), [
        v(-ex, 0.3, 2.1), v(ex, 0.3, 2.1), v(-ex, 0, -1.4), v(ex, 0, -1.4),
        v(-1.5, top, MON.z), v(1.5, top, MON.z), v(BAG.x, 1.7, BAG.z)
      ], 0.95, 0.92);

      var corners = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(function (c) {
        return new V3(c[0] * SW / 2, c[1] * SH / 2, 0).applyMatrix4(monTilt.matrixWorld);
      });
      var ymax = Math.max(corners[0].y, corners[1].y);
      corners.push(v(0, 0.12, MON.z + 0.3));
      poseS = fit(v(0, (ymax + 0.12) / 2, MON.z + 0.1), v(0, 0.3, 0.95).normalize(), corners, 0.92, 0.9);
    }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(cv); else window.addEventListener("resize", resize);
    resize();

    /* ---------- chiếu UI POS (DOM) lên mặt phẳng màn hình 3D ---------- */
    var mA = new M4(), mB = new M4(), mS = new M4(), shown = false;
    function syncPOS() {
      mS.set(0.5 * W, 0, 0, 0.5 * W, 0, -0.5 * H, 0, 0.5 * H, 0, 0, -1, 0, 0, 0, 0, 1);
      mA.copy(mS).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(monTilt.matrixWorld);
      mB.makeTranslation(-SW / 2, SH / 2, 0.006); mA.multiply(mB);
      mB.makeScale(SW / PW, -SH / PH, 1); mA.multiply(mB);
      posMount.style.transform = "matrix3d(" + mA.elements.join(",") + ")";
      if (!shown) { shown = true; posMount.style.visibility = "visible"; }
    }

    var onMove = function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      var r = cv.getBoundingClientRect();
      mx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      my = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    };
    var onLeave = function () { mx = my = 0; };
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);

    var ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    var onDown = function (e) {
      if (!ready || !basketCb) return;
      var r = renderer.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      var targets = [basketG].concat(ents.filter(function (x) { return x.mesh.visible && !x.free; }).map(function (x) { return x.mesh; }));
      if (ray.intersectObjects(targets, true).length) basketCb();
    };
    renderer.domElement.addEventListener("pointerdown", onDown);

    /* ---------- vòng lặp ---------- */
    var raf = 0, last = 0;
    function update(dt) {
      time += dt;
      for (var i = tweens.length - 1; i >= 0; i--) {
        var tw = tweens[i]; tw.t += dt;
        var k = Math.min(1, tw.t / tw.d); tw.fn(k);
        if (k >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); }
      }
      var lf = 1 - Math.exp(-dt * 9);
      readyBlend += ((ready ? 1 : 0) - readyBlend) * (1 - Math.exp(-dt * 6));
      ents.forEach(function (e) {
        if (e.free || !e.mesh.visible) return;
        var bob = e.slot === 0 ? Math.sin(time * 5) * 0.06 * readyBlend : 0;
        e.mesh.position.x += (e.tp.x - e.mesh.position.x) * lf;
        e.mesh.position.y += (e.tp.y + (e.slot === 0 ? 0.14 * readyBlend : 0) + bob - e.mesh.position.y) * lf;
        e.mesh.position.z += (e.tp.z - e.mesh.position.z) * lf;
      });

      laser.visible = scanning;
      if (scanning) laser.position.z = SCAN.z + Math.sin(time * 14) * 0.42;
      if ((mode === "good" || mode === "bad") && time > modeUntil) mode = "idle";
      var tI = 0, lc = 0x4aa8ff, gc = 0x1a6ea8, gi = 0.6, curA = 0, curC = 0xff2a1c, fgI = 0.15;
      if (scanning) { tI = 2.0; curA = 0.16 + 0.08 * Math.sin(time * 18); fgI = 1.0; }
      else if (mode === "fail") { tI = 2.6 + Math.sin(time * 10) * 0.5; lc = 0xff3b30; gc = 0xc02820; gi = 0.9; curA = 0.1 + 0.08 * Math.sin(time * 10); fgI = 1.4; }
      else if (mode === "good") { tI = 2.2; lc = 0x30d158; gc = 0x1fa34a; gi = 0.9; curC = 0x30d158; curA = 0.2; fgI = 1.2; }
      else if (mode === "bad") { tI = 2.2; lc = 0xff3b30; gc = 0xc02820; gi = 0.9; curA = 0.2; fgI = 1.4; }
      scanLight.intensity += (tI - scanLight.intensity) * (1 - Math.exp(-dt * 10));
      scanLight.color.setHex(lc);
      glassM.emissive.setHex(gc); glassM.emissiveIntensity = gi + (scanning ? 0.4 : 0);
      curtain.visible = curA > 0.001; curtainM.color.setHex(curC); curtainM.opacity = curA;
      fGlassM.emissive.setHex(curC); fGlassM.emissiveIntensity = fgI;

      if (bagSquash > 0) {
        bagSquash = Math.max(0, bagSquash - dt * 4);
        var s = Math.sin(bagSquash * Math.PI);
        bagG.scale.set(1 + s * 0.06, 1 - s * 0.1, 1 + s * 0.06);
      }

      /* camera: chuyển mượt giữa tư thế rộng và tư thế nhìn màn hình, lắc khi sai */
      focus += (focusT - focus) * (1 - Math.exp(-dt * 3.2));
      px += (mx - px) * (1 - Math.exp(-dt * 4)); py += (my - py) * (1 - Math.exp(-dt * 4));
      shake = Math.max(0, shake - dt * 0.5);
      if (poseW && poseS) {
        var f = easeIO(Math.min(1, Math.max(0, focus))), calm = 1 - 0.75 * f, sk = shake * (1 - 0.65 * f);
        camPos.lerpVectors(poseW.pos, poseS.pos, f);
        camLook.lerpVectors(poseW.look, poseS.look, f);
        camPos.x += px * 0.4 * calm + Math.sin(time * 0.6) * 0.03 * calm + (Math.random() - 0.5) * sk;
        camPos.y += -py * 0.2 * calm + Math.sin(time * 0.8) * 0.025 * calm + (Math.random() - 0.5) * sk;
        camera.position.copy(camPos); camera.lookAt(camLook);
        camera.updateMatrixWorld(true);
        syncPOS();
      }
    }
    function loop(ts) {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
      update(dt);
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

    /* ---------- khung Vynamic POS: tự chèn lại nếu engine vẽ lại POS; gắn data-d cho phím số ---------- */
var vx = document.createElement("div"); vx.className = "vx"; vx.innerHTML = VX_HTML;
var vxClk = vx.querySelector(".vx-clk");
function vxTick() {
  var d = new Date();
  vxClk.textContent = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + "  |  " + (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
}
function vxSync() {
  if (vx.parentNode !== posMount) posMount.appendChild(vx);
  var ks = posMount.querySelectorAll(".pos-k");
  for (var i = 0; i < ks.length; i++) {
    var k = ks[i];
    if (!k.classList.contains("fn") && !k.classList.contains("ok")) k.setAttribute("data-d", (k.textContent || "").trim());
  }
}
var vxObs = new MutationObserver(vxSync);
vxObs.observe(posMount, { childList: true, subtree: true });
vxSync(); vxTick();
var vxTimer = setInterval(vxTick, 1000);

    /* ---------- giao diện view ---------- */
    return {
      kind: "gl",
      posMount: posMount,
      setRest: setRest,
      ready: function (on) { ready = !!on; },
      onBasket: function (fn) { basketCb = fn; },
      pick: function (it) {
        var e = ents[items.indexOf(it)]; curEnt = e; e.free = true; e.slot = -1;
        e.mesh.visible = true; focusT = 0;
        arc(e, e.mesh.position.clone(), scanPos, 1.2, 600, Math.PI * 0.6);
        return 650;
      },
      scanStart: function () { scanning = true; mode = "idle"; },
      scanFail: function () { scanning = false; mode = "fail"; focusT = 1; },   /* quét lỗi → camera nhìn vào màn hình POS để nhập PLU */
      scanClear: function () { scanning = false; if (mode === "fail") mode = "idle"; },
      result: function (good) { mode = good ? "good" : "bad"; modeUntil = time + 0.9; if (!good) shake = 0.12; },
      bag: function () {
        var e = curEnt; focusT = 0;
        var jx = (Math.random() - 0.5) * 0.3, jz = (Math.random() - 0.5) * 0.24, k = bagEnts.length;
        var over = new V3(BAG.x + jx, 1.8, BAG.z + jz);                  /* cao hơn miệng túi để không xuyên thành túi */
        var slot = new V3(BAG.x + jx, 0.34 + Math.min(k, 3) * 0.3, BAG.z + jz);
        arc(e, e.mesh.position.clone(), over, 0.3, 560, Math.PI * 0.4, function () {
          tween(240, function (t) { e.mesh.position.lerpVectors(over, slot, easeOut(t)); }, function () {
            bagN++; drawBag(bagN); bagSquash = 1;
            bagEnts.push(e);
            if (bagEnts.length > 6) { bagEnts.shift().mesh.visible = false; }
          });
        });
        return 820;
      },
      destroy: function () {
        alive = false; cancelAnimationFrame(raf);

        vxObs.disconnect(); clearInterval(vxTimer);
        if (ro) ro.disconnect(); else window.removeEventListener("resize", resize);
        cv.removeEventListener("pointermove", onMove); cv.removeEventListener("pointerleave", onLeave);
        renderer.domElement.removeEventListener("pointerdown", onDown);
        Object.keys(texCache).forEach(function (k) { texCache[k].dispose(); });
        screenDisp.forEach(function (g) { g.dispose(); });
        disposables.forEach(function (d) { try { d.dispose(); } catch (e) {} });
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) {}
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }

/* Đăng ký view gl: build lỗi thì giải phóng context rồi ném lỗi cho engine thử lại */
window.PLUCounter.registerView("gl", function (sceneEl, ctx) {
  var full = enterFull(sceneEl, ctx);
  return loadThree(ctx.cfg).then(function (THREE) {
    try {
      var v = build(THREE, sceneEl, ctx);
      if (!v) { full.leave(); return v; }
      var d = v.destroy;
      v.destroy = function () { full.leave(); d(); };
      return v;
    } catch (e) {
      if (ctx._r) { try { ctx._r.dispose(); ctx._r.forceContextLoss(); } catch (_) {} ctx._r = null; }
      full.leave(); throw e;
    }
  }, function (e) { full.leave(); throw e; });   /* nạp Three lỗi: trả về UI CSS cũ */
});
})();