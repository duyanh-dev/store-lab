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
/* Khung POS: thanh trạng thái trên (có màn hình cân) + thanh quầy dưới. Chỉ trang trí, không bắt chạm */
var VX_HTML =
  '<div class="vp-top">' +
    '<svg class="vp-home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11.5L12 4l8.5 7.5M6 10v10h12V10M10 20v-5.5h4V20"/></svg>' +
    '<div class="vp-wt"><small>CÂN</small><b class="vp-kg">0,000</b><span>kg</span></div>' +
    '<div class="vp-ttl"><b>PLU POS</b><small class="vp-clk"></small></div>' +
    '<div class="vp-sig"><i></i><i></i><i></i><i></i></div>' +
  '</div>' +
  '<div class="vp-bot"><span>THU NGÂN <b>BẠN</b></span><span>QUẦY <b>03</b></span>' +
    '<span class="vp-scn wait"><i></i><em>Máy quét sẵn sàng</em></span></div>';

var VP_CSS = [
".vp{position:absolute;inset:0;pointer-events:none;z-index:5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
".vp-top{position:absolute;left:0;right:0;top:0;height:46px;display:flex;align-items:center;gap:16px;padding:0 14px;color:#fff;background:linear-gradient(#2d6199,#1d426b);border-bottom:2px solid #11294a}",
".vp-home{width:24px;height:24px;flex:none;opacity:.9}",
".vp-wt{display:flex;align-items:baseline;gap:5px;padding:3px 10px;background:#0b1a2b;border:1px solid #0a1422;border-radius:4px;box-shadow:inset 0 1px 3px rgba(0,0,0,.6)}",
".vp-wt small{font-size:9px;letter-spacing:.1em;color:#7fa3c9}",
".vp-kg{font:700 20px ui-monospace,Menlo,Consolas,monospace;color:#6dff9c;min-width:62px;text-align:right}",
".vp-wt span{font-size:11px;color:#9fc0e0}",
".vp-ttl{margin-left:auto;text-align:right;line-height:1.15}",
".vp-ttl b{display:block;font-size:13px;letter-spacing:.08em}",
".vp-ttl small{font-size:10px;color:#a9c4e2}",
".vp-sig{display:flex;align-items:flex-end;gap:2px;height:14px}",
".vp-sig i{width:3px;background:#cfe3f8;border-radius:1px}",
".vp-sig i:nth-child(1){height:4px}.vp-sig i:nth-child(2){height:7px}.vp-sig i:nth-child(3){height:10px}.vp-sig i:nth-child(4){height:14px}",
".vp-bot{position:absolute;left:0;right:0;bottom:0;height:34px;display:flex;align-items:center;gap:18px;padding:0 14px;font-size:11px;color:#c4d4e6;background:linear-gradient(#26384f,#182638);border-top:2px solid #0e1a2a}",
".vp-bot b{color:#fff}",
".vp-scn{margin-left:auto;display:flex;align-items:center;gap:6px}",
".vp-scn em{font-style:normal}",
".vp-scn i{width:9px;height:9px;border-radius:50%;background:#2fb25a;box-shadow:0 0 6px #2fb25a}",
".vp-scn.scan i{background:#ffb020;box-shadow:0 0 6px #ffb020}",
".vp-scn.nobar i,.vp-scn.bad i{background:#ff3b30;box-shadow:0 0 6px #ff3b30}",
/* chừa chỗ cho 2 thanh, bo góc màn hình, thêm vệt phản chiếu kính */

".pcg-pos::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:9;background:linear-gradient(115deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 38%),radial-gradient(120% 90% at 50% 120%,rgba(0,0,0,.18),transparent 60%)}"
].join("");

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
    var platM = mat(0xc9ced6, 0.32, 0.85);
scene.add(mesh(geo(new THREE.BoxGeometry(SCAN.w - 0.14, 0.03, SCAN.d - 0.14)), platM, SCAN.x, -0.075, SCAN.z, false));   /* mâm cân inox */
scene.add(mesh(geo(new THREE.BoxGeometry(1.1, 0.034, 0.26)), glassM, SCAN.x, -0.073, SCAN.z, false));                    /* ô kính quét */
var ledBarM = new THREE.MeshBasicMaterial({ color: 0x1f6a3a }); disposables.push(ledBarM);
scene.add(mesh(geo(new THREE.BoxGeometry(0.5, 0.012, 0.02)), ledBarM, SCAN.x, 0.003, SCAN.z + SCAN.d / 2 - 0.035, false)); /* LED báo trạng thái */
    [-1, 1].forEach(function (s) {
      scene.add(mesh(geo(new THREE.BoxGeometry(SCAN.w, 0.06, 0.07)), steelM, SCAN.x, -0.03, SCAN.z + s * (SCAN.d / 2 - 0.035), false));
      scene.add(mesh(geo(new THREE.BoxGeometry(0.07, 0.06, SCAN.d - 0.14)), steelM, SCAN.x + s * (SCAN.w / 2 - 0.035), -0.03, SCAN.z, false));
    });
    var laserM = new THREE.MeshBasicMaterial({ color: 0xff3b30 }); disposables.push(laserM);
    var laser = new THREE.Mesh(geo(new THREE.BoxGeometry(SCAN.w - 1.0, 0.012, 0.025)), laserM);
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
SW = 3.2; PW = 640; PH = 480;   /* ngang: 4:3 như màn thật */
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


/* ================= v4: HÀNG ĐÓNG GÓI THẬT (túi, chai, lon) + QUẢ CHI TIẾT HƠN ================= */
var EMO_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function hsl(h, s, l) { return "hsl(" + (((h % 360) + 360) % 360) + "," + s + "%," + l + "%)"; }
function hx(h, s, l) { return new THREE.Color(hsl(h, s, l)).getHex(); }

/* môi trường phản chiếu nhỏ (vài softbox) cho nhựa / kim loại / foil; lỗi thì bỏ qua, vật liệu vẫn dùng được */
var envTex = null;
try {
  var pmrem = new THREE.PMREMGenerator(renderer), envS = new THREE.Scene();
  var skyM = new THREE.MeshBasicMaterial({ color: 0x46526e, side: THREE.BackSide }); disposables.push(skyM);
  envS.add(new THREE.Mesh(geo(new THREE.SphereGeometry(30, 24, 16)), skyM));
  [[0, 14, 6, 0xffffff, 12, 1, 8, 3.2], [-14, 6, 5, 0xffe9cf, 1, 9, 9, 2.4], [14, 5, -2, 0x9cc0ff, 1, 9, 9, 2.0],
   [0, 4, -16, 0xffffff, 14, 7, 1, 1.6], [0, -6, 6, 0x6a5a48, 14, 1, 10, 0.8]].forEach(function (L) {
    var bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(L[3]).multiplyScalar(L[7]) }); disposables.push(bm);
    var bx = new THREE.Mesh(geo(new THREE.BoxGeometry(L[4], L[5], L[6])), bm); bx.position.set(L[0], L[1], L[2]); envS.add(bx);
  });
  var envRT = pmrem.fromScene(envS, 0.03); envTex = envRT.texture; disposables.push(envRT); pmrem.dispose();
} catch (envErr) { envTex = null; }

function PM(p, envI) {                                       /* vật liệu bóng (clearcoat) + phản chiếu môi trường */
  var m = new THREE.MeshPhysicalMaterial(p);
  if (envTex) { m.envMap = envTex; m.envMapIntensity = envI == null ? 1 : envI; }
  disposables.push(m); return m;
}
function ltex(key, w, h, draw) {                             /* texture nhãn: không lặp, lọc dị hướng cao cho chữ rõ */
  if (tc[key]) return tc[key];
  var c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  disposables.push(t); return (tc[key] = t);
}
function fitLines(c, text, maxW, maxLines) {
  var words = String(text).split(/\s+/), lines = [], cur = "";
  words.forEach(function (w) {
    var t = cur ? cur + " " + w : w;
    if (!cur || c.measureText(t).width <= maxW) cur = t; else { lines.push(cur); cur = w; }
  });
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += "…"; }
  return lines;
}
/* in nhãn sản phẩm vào hình chữ nhật (x,y,w,h): nền chuyển màu, sóng, huy hiệu emoji, tên, nhóm hàng */
function printArt(c, x, y, w, h, it, hue) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  var g1 = c.createLinearGradient(x, y, x + w * 0.4, y + h);
  g1.addColorStop(0, hsl(hue, 72, 50)); g1.addColorStop(1, hsl(hue + 30, 78, 30));
  c.fillStyle = g1; c.fillRect(x, y, w, h);
  c.fillStyle = "rgba(255,255,255,.13)"; c.beginPath(); c.moveTo(x, y + h * 0.62);
  c.bezierCurveTo(x + w * 0.3, y + h * 0.5, x + w * 0.62, y + h * 0.8, x + w, y + h * 0.58); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,.09)"; c.beginPath(); c.moveTo(x, y + h * 0.74);
  c.bezierCurveTo(x + w * 0.35, y + h * 0.66, x + w * 0.6, y + h * 0.9, x + w, y + h * 0.7); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); c.fill();
  var r0 = rng(hueOf(it.name) + 3); c.fillStyle = "rgba(255,255,255,.12)";
  for (var i = 0; i < 14; i++) { c.beginPath(); c.arc(x + r0() * w, y + r0() * h * 0.5, 2 + r0() * Math.min(w, h) * 0.03, 0, TAU); c.fill(); }
  var wide = w > h * 1.6, cx, cy, r, tx, ty, fs, maxW, capY;
  if (wide) { r = h * 0.34; cx = x + w * 0.24; cy = y + h * 0.5; tx = x + w * 0.62; maxW = w * 0.48; fs = Math.round(h * 0.2); ty = y + h * 0.4; capY = y + h * 0.82; }
  else { r = Math.min(w * 0.36, h * 0.26); cx = x + w / 2; cy = y + h * 0.34; tx = cx; maxW = w * 0.86; fs = Math.round(h * 0.085); ty = y + h * 0.66; capY = y + h * 0.93; }
  var bg = c.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  bg.addColorStop(0, "#ffffff"); bg.addColorStop(1, "rgba(255,255,255,.86)");
  c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = r * 0.18; c.shadowOffsetY = r * 0.06;
  c.fillStyle = bg; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
  c.shadowColor = "transparent"; c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.lineWidth = Math.max(2, r * 0.07); c.strokeStyle = hsl(hue, 85, 72); c.stroke();
  c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#000";
  c.font = Math.round(r * 1.2) + "px " + EMO_FONT; c.fillText(String(icon(it) || "🏷️"), cx, cy + r * 0.06);
  fs = Math.max(10, fs); c.font = "800 " + fs + 'px system-ui,"Segoe UI",Roboto,sans-serif';
  var lines = fitLines(c, it.name, maxW, 2);
  c.shadowColor = "rgba(0,0,0,.5)"; c.shadowBlur = fs * 0.2; c.shadowOffsetY = fs * 0.06; c.fillStyle = "#fff";
  lines.forEach(function (ln, k) { c.fillText(ln, tx, ty + k * fs * 1.12); });
  c.shadowColor = "transparent"; c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.font = "700 " + Math.max(8, Math.round(fs * 0.5)) + "px system-ui,sans-serif"; c.fillStyle = "rgba(255,255,255,.82)";
  c.fillText(String(it.cat || "").toUpperCase(), tx, capY);
  c.restore();
}
/* nhãn quấn quanh thân trụ: mặt trước ở giữa ảnh (u = 0.5 ↔ +z), mặt sau nối liền qua mép ảnh */
function wrapTex(key, w, h, it, hue, base) {
  return ltex(key, w, h, function (c) {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    printArt(c, w * 0.25, 0, w * 0.5, h, it, hue);
    printArt(c, w * 0.75, 0, w * 0.5, h, it, hue + 40);
    printArt(c, -w * 0.25, 0, w * 0.5, h, it, hue + 40);
  });
}

/* ---- TÚI BAO BÌ (snack / bánh kẹo / gạo / bún…): gối foil bóng, mép hàn có răng cưa, lỗ treo, nhăn 2 bên ---- */
B.pouch = function (g, o, it) {
  var hue = hueOf(it.cat + it.name), W = 0.62, H = 0.9, T = 0.1, SE = 0.085;
  var face = ltex("pk|" + it.name + "|" + hue, 384, 576, function (c, w, h) {
    var fg = c.createLinearGradient(0, 0, w, 0);
    fg.addColorStop(0, "#cfd4dc"); fg.addColorStop(0.5, "#f3f5f9"); fg.addColorStop(1, "#c8ced8");
    c.fillStyle = fg; c.fillRect(0, 0, w, h);
    var sy = Math.round(h * SE);
    printArt(c, 0, sy, w, h - 2 * sy, it, hue);
    for (var yy = 0; yy < sy; yy += 4) {                                 /* răng cưa mép hàn */
      c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(0, yy, w, 1.5); c.fillRect(0, h - sy + yy, w, 1.5);
      c.fillStyle = "rgba(60,70,90,.22)"; c.fillRect(0, yy + 2, w, 1.5); c.fillRect(0, h - sy + yy + 2, w, 1.5);
    }
    c.fillStyle = "rgba(20,24,32,.8)"; c.beginPath(); c.ellipse(w / 2, sy * 0.45, w * 0.045, sy * 0.2, 0, 0, TAU); c.fill();   /* lỗ treo */
    var sh = c.createLinearGradient(0, 0, w, 0);                         /* ánh foil: tối mép, sáng gần mép */
    sh.addColorStop(0, "rgba(0,0,0,.18)"); sh.addColorStop(0.12, "rgba(255,255,255,.14)"); sh.addColorStop(0.5, "rgba(255,255,255,0)");
    sh.addColorStop(0.9, "rgba(255,255,255,.08)"); sh.addColorStop(1, "rgba(0,0,0,.2)");
    c.fillStyle = sh; c.fillRect(0, 0, w, h);
  });
  var bmp = ltex("pkb", 256, 384, function (c, w, h) {                   /* bump: răng cưa mép hàn + nếp nhăn 2 bên */
    c.fillStyle = "#808080"; c.fillRect(0, 0, w, h);
    var sy = Math.round(h * SE);
    for (var yy = 0; yy < sy; yy += 4) {
      c.fillStyle = "#ffffff"; c.fillRect(0, yy, w, 2); c.fillRect(0, h - sy + yy, w, 2);
      c.fillStyle = "#303030"; c.fillRect(0, yy + 2, w, 2); c.fillRect(0, h - sy + yy + 2, w, 2);
    }
    var r = rng(11); c.lineWidth = 2;
    for (var i = 0; i < 26; i++) {
      var x = r() < 0.5 ? r() * w * 0.18 : w - r() * w * 0.18, y0 = sy + r() * h * 0.7;
      c.strokeStyle = i % 2 ? "rgba(255,255,255,.4)" : "rgba(0,0,0,.35)";
      c.beginPath(); c.moveTo(x, y0); c.lineTo(x + (r() - 0.5) * 12, y0 + 24 + r() * 80); c.stroke();
    }
  });
  var gm = new THREE.BoxGeometry(W, H, T, 24, 36, 1), p = gm.attributes.position;
  for (var i = 0; i < p.count; i++) {                                    /* phình như gối, dẹt ở mép hàn */
    var nx = p.getX(i) / (W / 2), ny = Math.abs(p.getY(i) / (H / 2)), z = p.getZ(i), sg = z >= 0 ? 1 : -1;
    var s = Math.min(1, Math.max(0, (1 - 2 * SE - ny) / 0.22)); s = s * s * (3 - 2 * s);
    var b = Math.pow(Math.max(0, 1 - nx * nx), 0.7);
    p.setZ(i, sg * (0.012 + 0.09 * b * s));
  }
  gm.computeVertexNormals();
  var front = PM({ map: face, bumpMap: bmp, bumpScale: 2, roughness: 0.34, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.28 }, 0.9);
  var edge = PM({ color: 0xdfe3ea, roughness: 0.4, metalness: 0.35 }, 0.9);
  add(g, gm, [edge, edge, edge, edge, front, front]); o.size = 0.82;
};

/* ---- CHAI: PET trong có nước + nhãn quấn + nắp có khía; chai dầu gội/sữa tắm dùng chai nhựa đặc có vòi bơm ---- */
B.bottle = function (g, o, it) {
  var hue = hueOf(it.cat + it.name), nm = norm(it.name);
  var pump = /dau goi|sua tam|sua rua|rua tay|rua mat|shampoo|soap|conditioner|\bgel\b|kem danh/.test(nm);
  var water = /nuoc suoi|water|tinh khiet|la vie|aquafina/.test(nm);
  var liq = water ? 0xbfe3f5 : /dau an|\boil\b|dau oliu/.test(nm) ? 0xe0a820 : /tuong|nuoc mam|sauce|xi dau|giam/.test(nm) ? 0x4a2410 : /\bsua\b|milk/.test(nm) ? 0xf6f2ea : hx(hue, 70, 52);
  if (pump) {
    var wrapP = wrapTex("bp|" + it.name + "|" + hue, 1024, 224, it, hue, "#ffffff");
    var bm = PM({ color: hx(hue, 45, 70), roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1 }, 1);
    add(g, lathe([[0, -0.5], [0.22, -0.5], [0.27, -0.47], [0.285, -0.38], [0.285, 0.12], [0.25, 0.24], [0.13, 0.3], [0.09, 0.32], [0.09, 0.34], [0, 0.34]], 36), bm).scale.z = 0.62;
    add(g, new THREE.CylinderGeometry(0.288, 0.288, 0.46, 40, 1, true, -Math.PI, TAU),
      PM({ map: wrapP, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 }, 0.8), 0, -0.17, 0).scale.z = 0.62;
    var cm = PM({ color: 0xf2f2f2, roughness: 0.3, metalness: 0, clearcoat: 0.6 }, 1);
    add(g, new THREE.CylinderGeometry(0.1, 0.12, 0.07, 20), cm, 0, 0.375, 0);
    add(g, new THREE.CylinderGeometry(0.035, 0.035, 0.16, 10), cm, 0, 0.47, 0);
    add(g, new THREE.BoxGeometry(0.26, 0.06, 0.09), cm, 0.07, 0.56, 0);
    add(g, new THREE.CylinderGeometry(0.02, 0.025, 0.08, 8), cm, 0.2, 0.55, 0).rotation.z = Math.PI / 2;
    o.size = 0.9; return;
  }
  var wrap = wrapTex("bt|" + it.name + "|" + hue, 1024, 224, it, hue, "#ffffff");
  var shellM = PM({ color: 0xdfeefa, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false }, 1.2);
  var shell = add(g, lathe([[0, -0.5], [0.17, -0.5], [0.225, -0.47], [0.245, -0.4], [0.245, 0.08], [0.22, 0.2], [0.14, 0.28], [0.1, 0.31], [0.092, 0.34], [0.092, 0.44], [0, 0.44]], 40), shellM);
  shell.castShadow = false; shell.renderOrder = 2;
  var liqM = PM({ color: liq, roughness: 0.12, metalness: 0, clearcoat: 0.4, transparent: water, opacity: water ? 0.55 : 1 }, 0.8);
  add(g, lathe([[0, -0.485], [0.16, -0.485], [0.215, -0.455], [0.232, -0.4], [0.232, 0], [0.212, 0.12], [0.13, 0.2], [0, 0.204]], 36), liqM);
  var lab = add(g, new THREE.CylinderGeometry(0.249, 0.249, 0.34, 48, 1, true, -Math.PI, TAU),
    PM({ map: wrap, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3 }, 0.8), 0, -0.14, 0); lab.castShadow = false;
  var capG = new THREE.CylinderGeometry(0.1, 0.1, 0.13, 32, 1); ribs(capG, 28, 0.03);
  add(g, capG, PM({ color: hx(hue, 70, 45), roughness: 0.4, metalness: 0, clearcoat: 0.5 }, 1), 0, 0.455, 0);
  add(g, new THREE.TorusGeometry(0.098, 0.014, 8, 28), PM({ color: 0xe8eef5, roughness: 0.3, metalness: 0 }, 1), 0, 0.37, 0).rotation.x = Math.PI / 2;
  o.size = 0.9;
};

/* ---- LON: thân in nhãn quấn, cổ và nắp nhôm, khoen mở lon ---- */
B.can = function (g, o, it) {
  var hue = hueOf(it.cat + it.name);
  var wrap = wrapTex("cn|" + it.name + "|" + hue, 1024, 366, it, hue, "#aab2bd");
  var al = PM({ color: 0xcfd5de, roughness: 0.28, metalness: 0.9 }, 1.1);
  var pr = PM({ map: wrap, roughness: 0.3, metalness: 0.55, clearcoat: 0.8, clearcoatRoughness: 0.2 }, 1);
  add(g, new THREE.CylinderGeometry(0.25, 0.25, 0.56, 56, 1, true, -Math.PI, TAU), pr, 0, 0, 0);
  add(g, lathe([[0.25, 0.28], [0.246, 0.31], [0.222, 0.333], [0.2, 0.348]], 40), al);
  add(g, lathe([[0.2, -0.348], [0.222, -0.333], [0.246, -0.31], [0.25, -0.28]], 40), al);
  add(g, new THREE.TorusGeometry(0.2, 0.012, 8, 40), al, 0, 0.352, 0).rotation.x = Math.PI / 2;
  add(g, new THREE.CircleGeometry(0.19, 40), al, 0, 0.347, 0).rotation.x = -Math.PI / 2;
  add(g, new THREE.RingGeometry(0.1, 0.15, 36), PM({ color: 0xb4bcc8, roughness: 0.35, metalness: 0.9 }, 1), 0, 0.349, 0).rotation.x = -Math.PI / 2;
  add(g, new THREE.BoxGeometry(0.11, 0.008, 0.07), al, 0, 0.356, 0.03);
  add(g, new THREE.TorusGeometry(0.024, 0.007, 6, 16), al, 0, 0.358, 0.075).rotation.x = Math.PI / 2;
  add(g, new THREE.CircleGeometry(0.2, 36), al, 0, -0.348, 0).rotation.x = Math.PI / 2;
  o.size = 0.72;
};

/* ---- QUẢ / CỦ: bản chi tiết (texture + bump) thay cho các loại trước đây chỉ là khối trơn ---- */
B.pear = function (g, o) {
  var yl = o.yellow, key = "pr2" + (yl ? 1 : 0);
  var t = ctex(key, 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#98ac38"], [0.5, yl ? "#e6d04a" : "#c0cd48"], [1, "#a89c36"]]);
    var gr = c.createRadialGradient(w * 0.3, h * 0.55, 4, w * 0.3, h * 0.55, w * 0.26);
    gr.addColorStop(0, "rgba(214,104,58,.4)"); gr.addColorStop(1, "rgba(214,104,58,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    specks(c, w, h, 700, 5, 0.7, 1.7, "#74601f", 0.5); specks(c, w, h, 160, 9, 1.8, 3.6, "#8a7430", 0.16);
  });
  var gm = pearGeo(); bump(gm, 0.008, 9, o.seed); add(g, gm, TB(key, t, 0.5, 0.7));
  curvedStem(g, [0, 0.5, 0], [0.03, 0.62, 0], [0.1, 0.68, 0], 0.018, 0x5a3b1e);
  ball(g, 0x4a3318, 0.03, 0, -0.5, 0, 0.8).scale.y = 0.5; o.size = 0.7;
};
B.avocado = function (g, o) {
  var t = ctex("av2", 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#1f2e14"], [0.5, "#2c3d1c"], [1, "#25331a"]]);
    specks(c, w, h, 1400, 3, 0.8, 2.4, "#4a5a2c", 0.55); specks(c, w, h, 900, 7, 0.8, 2, "#12190c", 0.5); specks(c, w, h, 60, 11, 2, 4, "#5a4a2a", 0.25);
  });
  var gm = pearGeo(); gm.scale(1.05, 0.88, 1.05); bump(gm, 0.014, 18, o.seed); add(g, gm, TB("av2", t, 0.62, 1.8));
  add(g, new THREE.CylinderGeometry(0.03, 0.04, 0.07, 8), M(0x4a4a22, 0.8, 0), 0.01, 0.46, 0); o.size = 0.62;
};
B.pomelo = function (g, o) {
  skin(g, "pm2", 256, 256, citrus("#cfdc6a", "#a8bd3e", "#7f9428", 900), 1, 0.92, 1, 0.014, 4, 0.55, 1.2, o);
  ball(g, 0xb9cc55, 0.2, 0, 0.4, 0, 0.6).scale.set(1, 0.6, 1);
  add(g, new THREE.CylinderGeometry(0.05, 0.07, 0.05, 10), M(0x6f8a2a, 0.7, 0), 0, 0.56, 0); o.size = 0.85;
};
B.passion = function (g, o) {
  skin(g, "pf2", 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#4a1d5e"], [0.5, "#6e2f86"], [1, "#4a1d5e"]]);
    specks(c, w, h, 520, 5, 0.8, 2.0, "#d8b8e8", 0.45); specks(c, w, h, 300, 9, 0.8, 1.6, "#2a0f38", 0.4);
  }, 1, 1.05, 1, 0.012, 12, 0.35, 0.6, o);
  curvedStem(g, [0, 0.46, 0], [0, 0.54, 0], [0.05, 0.58, 0], 0.016, 0x5a6a2a);
  calyx(g, 0.46, 0x4f8a2b, 5, 0.1, 0.03); o.size = 0.5;
};
B.guava = function (g, o) {
  skin(g, "gv2", 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#98b94a"], [0.5, "#b4d05e"], [1, "#9cba4c"]]);
    var gr = c.createRadialGradient(w * 0.35, h * 0.5, 4, w * 0.35, h * 0.5, w * 0.3);
    gr.addColorStop(0, "rgba(240,190,90,.35)"); gr.addColorStop(1, "rgba(240,190,90,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    specks(c, w, h, 600, 5, 0.9, 2.2, "#7c9a3a", 0.4); specks(c, w, h, 260, 9, 0.7, 1.3, "#e8f0b0", 0.35);
  }, 1, 1.05, 1, 0.012, 8, 0.5, 0.9, o);
  for (var k = 0; k < 4; k++) {
    var pv = piv(g, 0, 0.52, 0, k / 4 * TAU), cn = add(pv, new THREE.ConeGeometry(0.035, 0.1, 5), M(0x5a7a2a, 0.7, 0), 0.05, 0, 0);
    cn.rotation.z = -Math.PI / 2 + 0.6;
  }
  o.size = 0.55;
};
B.custard = function (g, o) {
  var t = ctex("cu3", 256, 256, function (c, w, h) {
    c.fillStyle = "#9cbf52"; c.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += 28) for (var x = 0; x < w; x += 32) {
      var xx = x + ((y / 28) % 2 ? 16 : 0), gr = c.createRadialGradient(xx + 14, y + 12, 2, xx + 16, y + 14, 18);
      gr.addColorStop(0, "#c6e07a"); gr.addColorStop(0.7, "#8fb348"); gr.addColorStop(1, "#4f7424");
      c.fillStyle = gr; c.beginPath(); c.ellipse(xx + 16, y + 14, 15, 13, 0, 0, TAU); c.fill();
    }
  });
  var gm = sph(0.5, 48, 34); bump(gm, 0.012, 6, o.seed); gm.scale(1, 0.95, 1); add(g, gm, TB("cu3", t, 0.6, 2.2));
  curvedStem(g, [0, 0.45, 0], [0.02, 0.55, 0], [0.07, 0.6, 0], 0.02, 0x5a6a2a); o.size = 0.6;
};
B.mangosteen = function (g, o) {
  skin(g, "ms2", 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#3a1230"], [0.5, "#5a2050"], [1, "#401536"]]);
    specks(c, w, h, 500, 5, 0.8, 2, "#8a4a80", 0.28); specks(c, w, h, 400, 8, 0.8, 1.6, "#1a0816", 0.4);
  }, 1, 0.86, 1, 0.006, 10, 0.25, 0.5, o);
  ball(g, 0x4f8a2b, 0.17, 0, 0.4, 0, 0.5).scale.set(1, 0.3, 1);
  calyx(g, 0.42, 0x5a9a30, 6, 0.2, 0.05); add(g, new THREE.CylinderGeometry(0.02, 0.025, 0.06, 6), M(0x3f6a22, 0.7, 0), 0, 0.5, 0); o.size = 0.5;
};
B.mango = function (g, o) {
  skin(g, "mg2", 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#8fb53a"], [0.35, "#e9c23a"], [0.7, "#f1a032"], [1, "#a8b83a"]]);
    var gr = c.createRadialGradient(w * 0.3, h * 0.5, 6, w * 0.3, h * 0.5, w * 0.3);
    gr.addColorStop(0, "rgba(210,60,40,.7)"); gr.addColorStop(1, "rgba(210,60,40,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    specks(c, w, h, 520, 5, 0.7, 1.5, "#f7e8a0", 0.5);
  }, 1.15, 0.95, 0.8, 0.01, 6, 0.35, 0.5, o);
  curvedStem(g, [-0.4, 0.3, 0], [-0.46, 0.4, 0], [-0.38, 0.5, 0], 0.016, 0x5a3b1e); o.size = 0.68;
};
B.papaya = function (g, o) {
  skin(g, "pp2", 256, 256, function (c, w, h) {
    vband(c, w, h, [[0, "#8fb53a"], [0.4, "#e6b53a"], [0.75, "#f0a030"], [1, "#98b43c"]]);
    streaks(c, w, h, 40, 3, "#d8873a", 0.25, 6); specks(c, w, h, 300, 5, 0.8, 1.8, "#f7e4a0", 0.3);
  }, 1.5, 0.8, 0.8, 0.008, 6, 0.5, 0.5, o);
  add(g, new THREE.CylinderGeometry(0.04, 0.05, 0.07, 8), M(0x5a6a22, 0.8, 0), -0.76, 0.02, 0).rotation.z = Math.PI / 2; o.size = 0.85;
};
B.cherry = function (g, o) {
  [[-0.2, 0, 0], [0.2, 0, -0.05]].forEach(function (q, i) {
    var gm = sph(0.2, 28, 20); gm.scale(1, 0.95, 0.95);
    add(g, gm, PM({ color: i ? 0x8f0c18 : 0xa8101c, roughness: 0.22, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.1 }, 0.9), q[0], q[1], q[2]);
    curvedStem(g, [q[0], 0.18, q[2]], [q[0] * 0.5, 0.42, q[2]], [0, 0.58, 0], 0.011, 0x5f7a2f);
  });
  o.size = 0.6;
};
B.lychee = function (g, o) {
  var t = ctex("ly2", 256, 256, function (c, w, h) {
    c.fillStyle = "#c8323c"; c.fillRect(0, 0, w, h);
    for (var y = 0; y < h; y += 16) for (var x = 0; x < w; x += 16) {
      var xx = x + ((y / 16) % 2 ? 8 : 0), gr = c.createRadialGradient(xx + 7, y + 7, 1, xx + 8, y + 8, 10);
      gr.addColorStop(0, "#e86a62"); gr.addColorStop(0.6, "#c8323c"); gr.addColorStop(1, "#7e1a22");
      c.fillStyle = gr; c.beginPath(); c.arc(xx + 8, y + 8, 8, 0, TAU); c.fill();
    }
    specks(c, w, h, 200, 5, 0.8, 1.4, "#f2c06a", 0.4);
  });
  [[-0.22, 0, 0], [0.22, 0, 0.05], [0, 0.04, -0.3]].forEach(function (q, i) {
    var gm = sph(0.22, 30, 22); bump(gm, 0.008, 30, o.seed + i * 5); add(g, gm, TB("ly2", t, 0.5, 2.4), q[0], q[1], q[2]);
    add(g, new THREE.CylinderGeometry(0.012, 0.016, 0.05, 6), M(0x6b8a2a, 0.7, 0), q[0], q[1] + 0.22, q[2]);
  });
  leaf(g, 0, 0.26, -0.15, 0x3f8f2a); o.size = 0.6;
};
B.longan = function (g, o) {
  var t = ctex("lg2", 128, 128, function (c, w, h) {
    vband(c, w, h, [[0, "#b89258"], [0.5, "#d2ae72"], [1, "#b8925a"]]);
    specks(c, w, h, 300, 3, 0.7, 1.8, "#8a6a3a", 0.35); specks(c, w, h, 200, 7, 0.7, 1.4, "#f0dcae", 0.3);
  });
  [[-0.22, 0, 0], [0.22, 0, 0.05], [0, 0.05, -0.3]].forEach(function (q, i) {
    var gm = sph(0.22, 24, 18); bump(gm, 0.006, 20, o.seed + i * 3); add(g, gm, TB("lg2", t, 0.65, 0.6), q[0], q[1], q[2]);
  });
  curvedStem(g, [0, 0.12, -0.15], [0, 0.3, -0.1], [0.06, 0.4, -0.05], 0.014, 0x7a5a30); o.size = 0.6;
};
B.starfruit = function (g, o) {
  var t = ctex("sf2", 128, 128, function (c, w, h) {
    vband(c, w, h, [[0, "#c9cf3a"], [0.5, "#f0d63c"], [1, "#d8c838"]]); streaks(c, w, h, 20, 3, "#f7ea78", 0.4, 3);
  });
  var gm = sph(0.5, 40, 28); ribs(gm, 5, 0.32); gm.scale(0.75, 1.3, 0.75); add(g, gm, TB("sf2", t, 0.35, 0.5));
  g.rotation.z = Math.PI / 2; o.size = 0.8;
};
B.sweetpotato = function (g, o) {
  var t = ctex("sp2", 256, 128, function (c, w, h) {
    vband(c, w, h, [[0, "#7a3a55"], [0.5, "#9a4a68"], [1, "#82405c"]]);
    streaks(c, w, h, 40, 3, "#c98aa6", 0.25, 3); specks(c, w, h, 400, 5, 0.8, 2.4, "#5a2238", 0.4); specks(c, w, h, 160, 9, 0.8, 1.6, "#d8a8b8", 0.3);
  });
  var gm = sph(0.5, 40, 28); bump(gm, 0.04, 4, o.seed); gm.scale(1.7, 0.7, 0.7);
  var p = gm.attributes.position;
  for (var i = 0; i < p.count; i++) { var f = 1 - 0.55 * Math.pow(Math.abs(p.getX(i)) / 0.85, 3); p.setY(i, p.getY(i) * f); p.setZ(i, p.getZ(i) * f); }
  add(g, gm, TB("sp2", t, 0.8, 1.0)); o.size = 0.8;
};
B.ginger = function (g, o) {
  var t = ctex("gi2", 128, 128, function (c, w, h) {
    vband(c, w, h, [[0, "#c79a58"], [0.5, "#dcb878"], [1, "#c8a060"]]);
    c.strokeStyle = "rgba(110,76,36,.55)"; c.lineWidth = 3;
    for (var y = 10; y < h; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 2); c.stroke(); }
    specks(c, w, h, 300, 4, 0.7, 1.8, "#8a6a3a", 0.35);
  });
  var m = TB("gi2", t, 0.8, 1.2);
  [[0, 0, 0, 0, 1.0], [0.3, 0.06, 0.12, 0.7, 0.7], [-0.3, 0.04, -0.1, -0.6, 0.7], [0.1, 0.1, -0.2, 0.3, 0.5], [-0.1, 0.08, 0.2, -0.3, 0.5]].forEach(function (b) {
    var gm = new THREE.CapsuleGeometry(0.11, 0.3 * b[4], 6, 12); gm.rotateZ(Math.PI / 2); bump(gm, 0.02, 14, o.seed + b[0] * 5);
    var mm = add(g, gm, m, b[0], b[1], b[2]); mm.rotation.y = b[3]; mm.scale.y = 0.8;
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


    var B0 = "(^|[\\s,.;:/()\\-])", B1 = "($|[\\s,.;:/()\\-])";
function R(w) { return new RegExp(B0 + "(?:" + w + ")" + B1); }
 
/* tên là hàng đóng gói / chai lọ (so trên chữ đã bỏ dấu) */
var PACK = R("gao|nep|bun|mien|hu tieu|mi goi|mi tom|mi an lien|banh|keo|snack|bim bim|bot|duong|muoi|ca phe|yen mach|ngu coc|socola|chocolate|xuc xich|ruoc");
var CONTAINER = R("chai|binh|bottle|nuoc|tuong|sua|dau an|oil|sauce|juice|milk|ruou|wine|shampoo|dau goi|sua tam|rua tay|rua mat");
var CANR = R("lon|bia|soda|beer|can");                                   /* so trên chữ gốc: "lớn" không khớp "lon" */
 
/* từ mơ hồ khi bỏ dấu: nếu tên CÓ dấu thì bỏ chúng khỏi RULES, để bản khớp đúng dấu (STRICT) quyết định */
var AMB = /\b(toi|hanh|ot|bo|le|nho|dao|man|mo|vai|nhan|oi|khe|na|nam|lon|cai|thom|khom|bia|trung)\b/g;
 
/* khớp trên chữ gốc, ĐÚNG DẤU (thứ tự quan trọng: cụm dài trước từ ngắn) */
var STRICT = [
  [R("hành lá|hành hoa|scallion|spring onion"), "scallion"], [R("hành|hành tây|hành tím|onion|shallot"), "onion"],
  [R("tỏi|garlic"), "garlic"], [R("ớt chuông|bell pepper|capsicum"), "bellpepper"], [R("ớt|chili|chilli"), "chili"],
  [R("bơ|avocado"), "avocado"], [R("lê|pear"), "pear"], [R("nho|grape"), "grape"], [R("đào|peach|nectarine"), "peach"],
  [R("mận|mơ|plum|apricot"), "plum"], [R("vải|lychee|litchi"), "lychee"], [R("nhãn|longan"), "longan"],
  [R("ổi|guava"), "guava"], [R("khế|starfruit|carambola"), "starfruit"], [R("na|mãng cầu|custard"), "custard"],
  [R("nấm|mushroom"), "mushroom"], [R("trứng|egg"), "egg"], [R("thơm|dứa|khóm|pineapple"), "pineapple"],
  [R("bắp cải|cải thảo|cabbage"), "cabbage"], [R("cải|rau|spinach|cilantro|herb|mint|basil|kale|bok choy"), "greens"]
];
var PACKED_OK = { bottle: 1, can: 1, pouch: 1, blob: 1 };
 
/* loại theo TÊN (không xét emoji); trả null nếu không nhận ra */
function nameKind(raw, nm, plain) {
  if (PACK.test(nm)) return "pouch";
  if (CONTAINER.test(nm)) return "bottle";
  if (CANR.test(raw)) return "can";
  for (var i = 0; i < STRICT.length; i++) if (STRICT[i][0].test(raw)) return STRICT[i][1];
  if (/dừa|coconut/.test(raw)) return "coconut";
  if (/ngò|rau mùi/.test(raw)) return "greens";
  var n2 = plain ? nm : nm.replace(AMB, " ");
  for (var j = 0; j < RULES.length; j++) if (RULES[j][0].test(n2)) return RULES[j][1];
  return null;
}
 
function kindOf(it) {
  /* bỏ tên riêng dễ gây khớp nhầm (Việt Nam, Trung Nguyên, Hà Nội...) */
  var raw = String(it.name || "").toLowerCase().replace(/việt nam|viet nam|trung nguyên|trung nguyen|hà nội|ha noi/g, " ");
  var nm = norm(raw), cat = norm(it.cat), em = String(icon(it) || "").replace(/\uFE0F/g, "");
  var plain = raw === nm, emK = EMOJI[em], nk = nameKind(raw, nm, plain);
  if (emK) {
    /* emoji là đồ tươi nhưng tên là hàng đóng gói / chai lọ / lon → tin tên */
    if ((nk === "pouch" || nk === "bottle" || nk === "can") && !PACKED_OK[emK]) return nk;
    var fam = FAMILY[em];
    if (fam) for (var j = 0; j < RULES.length; j++) if (RULES[j][0].test(nm) && fam.indexOf(RULES[j][1]) >= 0) return RULES[j][1];
    return emK;
  }
  if (nk) return nk;
  if (/non/.test(cat) || em) return "pouch";                             /* emoji lạ → túi in đúng emoji đó */
  return "blob";
}
 
 

    // function kindOf(it) {
    //   var raw = String(it.name || "").toLowerCase(), nm = norm(raw), cat = norm(it.cat), em = String(icon(it) || "").replace(/\uFE0F/g, "");
    //   var emK = EMOJI[em];
    //   if (emK) {
    //     var fam = FAMILY[em];
    //     if (fam) for (var j = 0; j < RULES.length; j++) if (RULES[j][0].test(nm) && fam.indexOf(RULES[j][1]) >= 0) return RULES[j][1];
    //     return emK;
    //   }
    //   if (/dừa|coconut/.test(raw)) return "coconut";
    //   if (/ngò|rau mùi/.test(raw)) return "greens";
    //   for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(nm)) return RULES[i][1];
    //   if (/non/.test(cat) || em) return "pouch";                         /* emoji lạ → túi in đúng emoji đó */
    //   return "blob";
    // }

  /* ===================== KHỐI 2 – tem mã vạch (dán trước makeItem) ===================== */
function isScannable(it) {
  var f = ctx.cfg && ctx.cfg.isScannable;
  if (typeof f === "function") { try { return !!f(it); } catch (_) {} }
  return !!(it && (it.barcode || it.ean || it.scannable || it.scan || it.bar));
}
function addBarcode(g, it, bb, sz, ctr) {
  if (!isScannable(it)) return;
  var code = String(it.barcode || it.ean || "");
  if (!/^\d{8,13}$/.test(code)) { var r = rng(hueOf(it.name) + 77); code = "8934"; for (var i = 0; i < 9; i++) code += Math.floor(r() * 10); }
  var tex = ltex("bc|" + code, 192, 112, function (c, w, h) {
    c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); c.fillStyle = "#111";
    var r2 = rng(+code.slice(-6) + 3), x = 16;
    while (x < w - 16) { var bw = 2 + Math.floor(r2() * 4); c.fillRect(x, 12, bw, h - 38); x += bw + 2 + Math.floor(r2() * 4); }
    c.font = "600 15px ui-monospace,Menlo,Consolas,monospace"; c.textAlign = "center"; c.fillStyle = "#222";
    c.fillText(code.length === 13 ? code.charAt(0) + " " + code.slice(1, 7) + " " + code.slice(7) : code, w / 2, h - 9);
  });
  var w = Math.max(0.14, Math.min(0.4, sz.x * 0.42));
  var m = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, w * 112 / 192)), mat(0xffffff, 0.55, 0, { map: tex }));
  m.position.set(ctr.x, bb.min.y + sz.y * 0.3, bb.max.z + 0.006); g.add(m);
}
/* ===================== HẾT KHỐI 2 ===================== */


    function makeItem(it, idx) {
      var kind = kindOf(it), nm = norm(it.name), em = String(icon(it) || "").replace(/\uFE0F/g, "");
      var o = {
        kind: kind, nm: nm, size: 0.62, seed: (hueOf(it.name) * 13 + idx * 7) % 97 + 1,
        green: /xanh|green|lime/.test(nm) || em === "🍏" || em === "🫑", yellow: /vang|yellow|lemon/.test(nm) || em === "🍋",
        purple: /tim|purple|red onion/.test(nm), blue: /blue|viet quat/.test(nm), white: false
      };
      o.rnd = rng(o.seed);
      var g = new THREE.Group();
      try { (B[kind] || B.blob)(g, o, it); }
catch (err) {                                                      /* một mô hình lỗi không được làm hỏng cả quầy 3D */
  try { console.warn("PLUCounter GL: lỗi dựng mô hình '" + kind + "', dùng khối mặc định.", err); } catch (_) {}
  g = new THREE.Group(); o.size = 0.6; B.blob(g, o, it);
}
      var root = new THREE.Group(); root.add(g); root.updateMatrixWorld(true);
      var bb = new THREE.Box3().setFromObject(root), sz = bb.getSize(new V3()), ctr = bb.getCenter(new V3());

      addBarcode(g, it, bb, sz, ctr);

      g.position.set(-ctr.x, -ctr.y, -ctr.z);                           /* tâm mô hình về gốc để logic bay/xếp giữ nguyên */
      root.scale.setScalar(o.size / Math.max(sz.x, sz.y, sz.z, 0.01));
      root.userData.pack = (kind === "pouch" || kind === "bottle" || kind === "can") ? kind : null;   /* hàng đóng gói: ngả nhẹ ở máy quét */
      return root;
    }

    var PACK_TILT = { pouch: 0.52, bottle: 0.36, can: 0.28 };            /* độ ngả ra sau (rad) khi đặt trên kính máy quét */
var ents = items.map(function (it, idx) {
  var m = makeItem(it, idx), pk = m.userData.pack;
  m.rotation.order = "YXZ";                                          /* xoay quanh trục đứng trước, rồi mới ngả */
  m.visible = false; m.rotation.y = (Math.random() - 0.5) * 0.9; scene.add(m);
  var e = { it: it, idx: idx, mesh: m, tp: new V3(), slot: -1, free: false, scanTo: new V3(SCAN.x, SCAN_Y, SCAN.z), rotTo: null };
  if (pk) {
    var rn = rng(idx * 37 + 5), yaw0 = m.rotation.y;
    e.rotTo = { x: -PACK_TILT[pk], y: (rn() - 0.5) * 0.34, z: (rn() - 0.5) * 0.08 };
    m.rotation.set(e.rotTo.x, e.rotTo.y, e.rotTo.z); m.position.set(0, 0, 0); m.updateMatrixWorld(true);
    var pbb = new THREE.Box3().setFromObject(m, true);
    e.scanTo = new V3(SCAN.x + (rn() - 0.5) * 0.24, -0.052 - pbb.min.y, SCAN.z + (rn() - 0.5) * 0.1);
    m.rotation.set(0, yaw0, 0);
  }
  return e;
});


/* ==========================================================================
   DEBUG (tạm): dán ngay SAU "var ents = items.map(...);" rồi mở Console.
   Tìm dòng của món bị lệch: cột emoji sai → lỗi dữ liệu; cột kind sai → lỗi luật.
   ========================================================================== */
try {
  console.table(items.map(function (it) {
    return { name: it.name, cat: it.cat, emoji: icon(it), kind: kindOf(it) };
  }));
} catch (e) {}
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

               X.onRest(list.length);

    }

    /* ---------- tween ---------- */
    var tweens = [];
    function tween(ms, fn, done) { tweens.push({ t: 0, d: ms / 1000, fn: fn, done: done }); }
    function arc(e, from, to, lift, ms, spin, done, rot) {
  var c = from.clone().add(to).multiplyScalar(0.5); c.y += lift;
  var r0 = e.mesh.rotation.y, x0 = e.mesh.rotation.x, p = new V3();
  var yEnd = r0 + spin, xEnd = x0, zEnd = 0;
  if (rot) {                                                         /* có tư thế đích: xoay theo đường ngắn nhất */
    var dy = rot.y - r0; dy -= Math.round(dy / TAU) * TAU;
    yEnd = r0 + dy; xEnd = rot.x; zEnd = rot.z || 0;
  }
  tween(ms, function (k) {
    var t = easeIO(k), a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
    p.set(a * from.x + b * c.x + d * to.x, a * from.y + b * c.y + d * to.y, a * from.z + b * c.z + d * to.z);
    e.mesh.position.copy(p);
    e.mesh.rotation.y = r0 + (yEnd - r0) * t;
    e.mesh.rotation.x = x0 + (xEnd - x0) * t;
    e.mesh.rotation.z = Math.sin(k * Math.PI) * 0.3 + zEnd * t;
  }, function () { e.mesh.rotation.z = zEnd; if (done) done(); });
}

    /* ---------- trạng thái ---------- */
    var mode = "idle", modeUntil = 0, time = 0, scanning = false, ready = false, readyBlend = 0;
    var focus = 0, focusT = 0, shake = 0, mx = 0, my = 0, px = 0, py = 0;
        /* Độ căng thẳng 0..1 (do vòng đồng hồ đặt): điều khiển camera tiến vào và ánh sáng ấm dần */
    var tension = 0, tensionT = 0, warmC = new THREE.Color(0xff9a5a);
    var curEnt = null, bagN = 0, bagEnts = [], bagSquash = 0, basketCb = null, alive = true;
    var scanPos = new V3(SCAN.x, SCAN_Y, SCAN.z);


   /* ===================== EXTRAS v5 ===================== */
var X = (function () {
  var PI = Math.PI, T2 = PI * 2, auCtx = null;
  var SOUND = !(ctx.cfg && ctx.cfg.sound === false);
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
 
  /* ---------- helper ---------- */
  function cvTex(w, h, draw) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; disposables.push(t); return t;
  }
  function flatM(c) { var m = new THREE.MeshBasicMaterial({ color: c }); disposables.push(m); return m; }
  function rrect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function sign(txt, w, h, bg, fg, border) {                              /* biển in phẳng, mờ, ăn sáng theo cảnh */
    var tx = cvTex(512, Math.round(512 * h / w), function (c, W, H) {
      c.fillStyle = bg; c.fillRect(0, 0, W, H);
      if (border) { c.strokeStyle = border; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6); }
      c.fillStyle = fg; c.font = "700 " + Math.round(H * 0.46) + "px system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
      c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, W / 2, H / 2 + 2);
    });
    var m = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85, metalness: 0 }); disposables.push(m);
    return new THREE.Mesh(geo(new THREE.PlaneGeometry(w, h)), m);
  }
  function beep(f, ms, vol, delay) {                                      /* bíp máy quét: sóng sin ngắn, êm */
    if (!SOUND) return;
    try {
      if (!auCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; auCtx = new AC(); }
      if (auCtx.state === "suspended") auCtx.resume();
      var o = auCtx.createOscillator(), g = auCtx.createGain(), t = auCtx.currentTime + (delay || 0), v = vol || 0.05;
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(auCtx.destination);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.005);
      g.gain.setValueAtTime(v, t + ms / 1000 - 0.015); g.gain.linearRampToValueAtTime(0.0001, t + ms / 1000);
      o.start(t); o.stop(t + ms / 1000 + 0.02);
    } catch (e) {}
  }
 
  /* ================= 1. THEME: ánh sáng + vật liệu sáng sủa ================= */
  renderer.setClearColor(0xe9e6e0, 1);
  renderer.toneMappingExposure = 1.2;
  scene.fog.color.setHex(0xe9e6e0); scene.fog.near = 22; scene.fog.far = 70;
  scene.children.forEach(function (o) {
    if (o.isHemisphereLight) { o.color.setHex(0xffffff); o.groundColor.setHex(0xcfc8bc); o.intensity = 1.15; }
  });
  key.color.setHex(0xfff6ea); key.intensity = 2.4;
  rim.color.setHex(0xffffff); rim.intensity = 0.35;
  monGlow.color.setHex(0xffffff); monGlow.intensity = 0.25;
  counterM.color.setHex(0xd6d8dc); counterM.roughness = 0.35; counterM.metalness = 0;
  edge.material.color.setHex(0xb9bec6);                                   /* gờ inox mép quầy */
  scene.traverse(function (o) {                                           /* nhận diện theo kích thước hình học */
    var gp = o.geometry && o.geometry.parameters, m = o.material;
    if (!gp || !m || Array.isArray(m) || !m.color) return;
    if (gp.width === 10.8 && gp.height === 1.9) { m.color.setHex(0xe6e4df); m.roughness = 0.6; m.metalness = 0; }        /* thân tủ quầy */
    else if (gp.width === 10.8 && gp.height === 0.55) { m.color.setHex(0xd3d1cb); m.roughness = 0.6; m.metalness = 0; }  /* gờ sau quầy */
    else if (gp.width === 46 && gp.height === 14) { m.color.setHex(0xeeebe4); m.roughness = 0.95; }                      /* tường */
    else if (gp.width === 20 && gp.height === 0.07) { m.color.setHex(0xc4c9cf); m.roughness = 0.5; m.metalness = 0.1; } /* ván kệ */
  });
 
  /* sàn gạch men sáng, vân nhẹ */
  var ft = cvTex(256, 256, function (c, w, h) {
    c.fillStyle = "#d9d6cf"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#dedbd4"; c.fillRect(0, 0, w / 2, h / 2); c.fillRect(w / 2, h / 2, w / 2, h / 2);
    c.fillStyle = "#d3d0c9"; c.fillRect(w / 2, 0, w / 2, h / 2); c.fillRect(0, h / 2, w / 2, h / 2);
    c.strokeStyle = "rgba(110,105,95,.28)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke(); c.strokeRect(0, 0, w, h);
  });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(24, 17);
  floor.material = mat(0xffffff, 0.4, 0.04, { map: ft });
 
  /* kệ hàng: màu bao bì tự nhiên + cột kệ inox */
  var pal = [0xc4463d, 0xe3b94a, 0x3f7f55, 0x3a6ea5, 0xeeeae0, 0x8a5a3a, 0xd98a3a, 0x7a5aa0, 0x5aa0a8], cc = new THREE.Color();
  for (var si = 0; si < shelf.count; si++) {
    cc.setHex(pal[(Math.random() * pal.length) | 0]); cc.offsetHSL(0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.12);
    shelf.setColorAt(si, cc);
  }
  if (shelf.instanceColor) shelf.instanceColor.needsUpdate = true;
  var upM = mat(0xc9cdd2, 0.45, 0.1);
  for (var ux = -9.6; ux <= 9.7; ux += 2.4) scene.add(box(ux - 0.03, ux + 0.03, -0.3, 5.1, -4.95, -4.1, upM, false));
 
  /* tường: dải thương hiệu + biển tên + biển lối đi (phẳng, mờ) */
  scene.add(box(-23, 23, 5.15, 5.4, -4.9, -4.86, mat(0x2f7a57, 0.8), false));
  var sgn = sign("PLU MART", 6.0, 1.05, "#ffffff", "#2f7a57", "#2f7a57"); sgn.position.set(0, 6.05, -4.86); scene.add(sgn);
  [[-5.0, "RAU CỦ"], [5.0, "TRÁI CÂY"]].forEach(function (a) {
    var l = sign(a[1], 2.4, 0.7, "#ffffff", "#3a3f4a", "#c9cdd2"); l.position.set(a[0], 5.55, -4.6); scene.add(l);
    var l2 = l.clone(); l2.rotation.y = PI; l2.position.z = -4.64; scene.add(l2);
    [-1, 1].forEach(function (s) { scene.add(mesh(geo(new THREE.CylinderGeometry(0.012, 0.012, 2.2, 6)), upM, a[0] + s * 1.0, 6.7, -4.62, false)); });
  });
  [-5.4, 5.4].forEach(function (x) {                                      /* cột bê tông sơn trắng */
    scene.add(mesh(geo(new THREE.BoxGeometry(0.8, 14, 0.8)), mat(0xddd9d1, 0.9), x, 3.5, -4.7, false));
    scene.add(mesh(geo(new THREE.BoxGeometry(0.86, 0.5, 0.86)), mat(0xc9c5bc, 0.9), x, -2.65, -4.7, false));
  });
  /* chậu cây */
  scene.add(mesh(geo(new THREE.CylinderGeometry(0.55, 0.42, 1.1, 16)), mat(0x8a857c, 0.7), 5.0, -2.35, -3.3));
  [[0, 0.7, 0, 0.7], [-0.35, 0.4, 0.15, 0.5], [0.35, 0.45, -0.1, 0.5], [0.05, 1.05, 0.1, 0.45]].forEach(function (b) {
    scene.add(mesh(geo(new THREE.SphereGeometry(b[3], 14, 10)), mat(0x4a7a4a, 0.8), 5.0 + b[0], -1.8 + b[1], -3.3 + b[2]));
  });
 
  /* đèn số làn: hộp trắng nhỏ trên trụ inox + chấm trạng thái (xanh = mở làn) */
  var TX = 4.3, TZ = -1.2;
  scene.add(mesh(geo(new THREE.CylinderGeometry(0.05, 0.07, 2.0, 10)), mat(0xb9bec6, 0.35, 0.6), TX, 1.0, TZ));
  scene.add(mesh(geo(new THREE.BoxGeometry(0.62, 0.5, 0.14)), mat(0xf2f1ee, 0.5), TX, 2.15, TZ));
  var ln = sign("6", 0.5, 0.38, "#f2f1ee", "#2b2f38"); ln.position.set(TX, 2.15, TZ + 0.075); scene.add(ln);
  var lampM = flatM(0x2fb25a), lamp = new THREE.Mesh(geo(new THREE.SphereGeometry(0.06, 12, 8)), lampM); lamp.position.set(TX, 2.46, TZ + 0.04); scene.add(lamp);
 
  /* ================= 2. NGƯỜI (tỉ lệ thật hơn, màu trung tính) ================= */
  function person(o) {
    var g = new THREE.Group();
    var skinM = mat(o.skin, 0.6), shirtM = mat(o.shirt, 0.8), pantM = mat(o.pants, 0.85), hairM = mat(o.hair, 0.6), shoeM = mat(0x23252b, 0.6), eyeM = flatM(0x1c1a18);
    var P = { root: g, legs: [], cur: {} };
    [-0.36, 0.36].forEach(function (x) {
      var hip = new THREE.Group(); hip.position.set(x, 2.3, 0); g.add(hip);
      hip.add(mesh(geo(new THREE.CapsuleGeometry(0.28, 1.5, 4, 10)), pantM, 0, -1.05, 0));
      hip.add(mesh(geo(new THREE.BoxGeometry(0.5, 0.3, 0.9)), shoeM, 0, -2.15, 0.15));
      P.legs.push(hip);
    });
    var tor = mesh(geo(new THREE.CapsuleGeometry(0.62, 0.9, 6, 14)), shirtM, 0, 3.3, 0); tor.scale.z = 0.72; g.add(tor); P.torso = tor;
    g.add(mesh(geo(new THREE.CylinderGeometry(0.16, 0.19, 0.3, 10)), skinM, 0, 4.4, 0));
    var head = new THREE.Group(); head.position.set(0, 4.52, 0); g.add(head); P.head = head;
    head.add(mesh(geo(new THREE.SphereGeometry(0.4, 24, 18)), skinM, 0, 0.3, 0));
    head.add(mesh(geo(new THREE.SphereGeometry(0.43, 24, 14, 0, T2, 0, PI * 0.56)), hairM, 0, 0.32, -0.03));
    [-1, 1].forEach(function (s) { head.add(mesh(geo(new THREE.SphereGeometry(0.045, 10, 8)), eyeM, s * 0.14, 0.34, 0.36, false)); });
    P.brows = [-1, 1].map(function (s) { var b = mesh(geo(new THREE.BoxGeometry(0.16, 0.03, 0.03)), hairM, s * 0.14, 0.45, 0.36, false); head.add(b); return b; });
    head.add(mesh(geo(new THREE.SphereGeometry(0.05, 10, 8)), skinM, 0, 0.26, 0.4, false));
    P.mouth = mesh(geo(new THREE.TorusGeometry(0.085, 0.018, 6, 14, PI)), flatM(0x8a4a44), 0, 0.14, 0.38, false); head.add(P.mouth);
    function arm(s) {
      var sh = new THREE.Group(); sh.position.set(s * 0.82, 4.0, 0); g.add(sh);
      sh.add(mesh(geo(new THREE.CapsuleGeometry(0.2, 0.8, 4, 10)), shirtM, 0, -0.6, 0));
      var el = new THREE.Group(); el.position.set(0, -1.15, 0); sh.add(el);
      el.add(mesh(geo(new THREE.CapsuleGeometry(0.17, 0.7, 4, 10)), shirtM, 0, -0.55, 0));
      el.add(mesh(geo(new THREE.SphereGeometry(0.17, 12, 10)), skinM, 0, -1.1, 0));
      return { sh: sh, el: el };
    }
    P.L = arm(-1); P.R = arm(1);
    var ph = new THREE.Group(); ph.position.set(0, -1.1, 0.14); ph.visible = false; P.R.el.add(ph); P.phone = ph;
    ph.add(mesh(geo(new THREE.BoxGeometry(0.24, 0.42, 0.04)), mat(0x1a1c22, 0.3, 0.3), 0, 0, 0, false));
    return P;
  }
  function applyPose(P, p, lf) {
    var c = P.cur;
    for (var k in p) if (typeof p[k] === "number") c[k] = c[k] == null ? p[k] : c[k] + (p[k] - c[k]) * lf;
    P.L.sh.rotation.x = c.lsx; P.L.sh.rotation.z = -c.lsz; P.L.el.rotation.x = c.lex;
    P.R.sh.rotation.x = c.rsx; P.R.sh.rotation.z = c.rsz; P.R.el.rotation.x = c.rex;
    P.head.rotation.y = c.hy; P.head.rotation.x = c.hx;
    P.phone.visible = !!p.phone;
  }
  function face(P, smile, flat, brow) {
    P.mouth.rotation.z = smile ? PI : 0; P.mouth.scale.y = flat ? 0.2 : 1;
    P.brows[0].rotation.z = -brow; P.brows[1].rotation.z = brow;
  }
 
  /* --- khách hàng đứng đối diện (phản ứng bằng cử chỉ, không biểu tượng) --- */
  var CUST_Y = -2.9;
  var cust = person({ shirt: 0x5d6b7c, pants: 0x33373f, skin: 0xd9a982, hair: 0x2b2420 });
  cust.root.position.set(-3.7, CUST_Y, -2.9); cust.root.rotation.y = 0.1; scene.add(cust.root);
  var cm = { n: "idle", sub: "idle", until: 0, subUntil: 0, nextSub: 3 };
  function setMood(n, dur) { cm.n = n; cm.until = time + dur; }
  function custUpdate(dt) {
    var t = time, lf = 1 - Math.exp(-dt * 9), name;
    if (cm.n !== "idle" && t > cm.until) { cm.n = "idle"; cm.sub = "idle"; cm.nextSub = t + 1.2; }
    if (cm.n === "idle") {
      if (cm.sub !== "idle" && t > cm.subUntil) cm.sub = "idle";
      if (cm.sub === "idle" && t > cm.nextSub) {
        var o = ["phone", "look", "idle", "idle"]; cm.sub = o[(Math.random() * o.length) | 0];
        cm.subUntil = t + 2.2 + Math.random() * 2; cm.nextSub = cm.subUntil + 2 + Math.random() * 3;
      }
    }
    name = cm.n === "idle" ? cm.sub : cm.n;
    var p = { lsx: 0.04, lsz: 0.1 + Math.sin(t * 1.6) * 0.02, lex: -0.12, rsx: 0.04, rsz: 0.1 + Math.sin(t * 1.6 + 1) * 0.02, rex: -0.12, hy: 0, hx: 0, tap: 0, phone: false };
    var free = false, smile = true, flat = true, brow = 0;
    switch (name) {
      case "phone": p.rsx = -0.7; p.rex = -1.6; p.hx = 0.35; p.phone = true; free = true; break;
      case "look": p.hy = Math.sin(t * 0.9) * 0.7; free = true; break;
      case "impatient": p.rsx = -0.5; p.rex = -2.0; p.lsx = -0.4; p.lex = -0.6; p.tap = 1; smile = false; brow = 0.15; break;
      case "happy": p.rsx = -0.5; p.rex = -0.9; p.hx = 0.08; smile = true; flat = false; break;               /* gật nhẹ, hài lòng */
      case "angry": p.lsx = p.rsx = -0.8; p.lex = p.rex = -2.1; p.lsz = p.rsz = -0.35; p.hy = Math.sin(t * 9) * 0.22; free = true; smile = false; flat = false; brow = 0.3; break;
      case "receive": p.rsx = -0.9; p.rex = -0.6; p.hx = Math.sin(t * 8) * 0.1; free = true; smile = true; flat = false; break;
    }
    if (!free) {
      var lookItem = (cm.n === "watch" || cm.n === "impatient" || scanning) && curEnt;
      var tp = lookItem ? curEnt.mesh.position : camera.position, rp = cust.root.position;
      var dx = tp.x - rp.x, dz = tp.z - rp.z;
      p.hy += cl(Math.atan2(dx, dz) - cust.root.rotation.y, -0.9, 0.9);
      p.hx += cl(-Math.atan2(tp.y - (rp.y + 4.9), Math.hypot(dx, dz)), -0.4, 0.5);
    }
    applyPose(cust, p, lf); face(cust, smile, flat, brow);
    cust.torso.scale.y = 1 + Math.sin(t * 1.8) * 0.012;
    cust.root.rotation.y = 0.1 + Math.sin(t * 0.4) * 0.05;
    cust.legs[0].rotation.x = p.tap ? -Math.abs(Math.sin(t * 9)) * 0.3 : 0;
  }
 
  /* --- người đi lại phía sau --- */
  var walkers = [];
  [[0x8c6d5a, 0x2e3440, 0xd9a982, 0x2b2420, 1.1, -9], [0x5e7a6b, 0x4a4f5a, 0xc08f68, 0x1a1a1a, -1.3, 9], [0xb0a28c, 0x3b4252, 0xe0b894, 0x6a4a2a, 0.9, 2]].forEach(function (a) {
    var w = person({ shirt: a[0], pants: a[1], skin: a[2], hair: a[3] });
    w.root.scale.setScalar(0.8); w.root.position.set(a[5], CUST_Y, -4.05); w.root.rotation.y = a[4] > 0 ? PI / 2 : -PI / 2;
    w.R.el.add(mesh(geo(new THREE.BoxGeometry(0.55, 0.3, 0.4)), mat(0xc0392b, 0.6), 0, -1.35, 0.15));
    w.R.sh.rotation.x = -0.2; w.R.el.rotation.x = -1.2; w.L.sh.rotation.z = -0.1;
    scene.add(w.root); walkers.push({ P: w, v: a[4], ph: Math.random() * 6 });
  });
  function walkUpdate(dt) {
    walkers.forEach(function (w) {
      var r = w.P.root; r.position.x += w.v * dt;
      if (w.v > 0 && r.position.x > 11) r.position.x = -11; else if (w.v < 0 && r.position.x < -11) r.position.x = 11;
      w.ph += dt * Math.abs(w.v) * 4.5; var s = Math.sin(w.ph);
      w.P.legs[0].rotation.x = s * 0.55; w.P.legs[1].rotation.x = -s * 0.55; w.P.L.sh.rotation.x = -s * 0.4;
      r.position.y = CUST_Y + Math.abs(s) * 0.05;
    });
  }
 
  /* ================= 3. GIỎ HÀNG: nhựa đục lỗ, tay cầm cao su, thẻ gợi ý giấy ================= */
  (function () {
    var c = bkTex.image; c.width = 256; c.height = 128; var g = c.getContext("2d");
    var gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#d6473a"); gr.addColorStop(1, "#a82f24");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    g.fillStyle = "rgba(60,14,10,.7)";
    for (var r = 0; r < 4; r++) for (var q = 0; q < 10; q++) { rrect(g, q * 25.6 + (r % 2 ? 12.8 : 0) + 4, 10 + r * 28, 16, 14, 6); g.fill(); }
    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, 0, 256, 5);
    bkTex.needsUpdate = true;
  })();
  [-1, 1].forEach(function (s) {
    var gp = mesh(geo(new THREE.CapsuleGeometry(0.045, 0.3, 4, 8)), mat(0x2a2d34, 0.85), s * TW / 2, RY + 0.28, 0);
    gp.rotation.x = PI / 2; basketG.add(gp);
  });
  /* thẻ giấy nhỏ chỉ hiện khi giỏ sẵn sàng (thay cho hiệu ứng sáng) */
  var tagC = document.createElement("canvas"); tagC.width = 320; tagC.height = 96;
  var tagT = new THREE.CanvasTexture(tagC); tagT.colorSpace = THREE.SRGBColorSpace; disposables.push(tagT);
  var tagM = new THREE.SpriteMaterial({ map: tagT, transparent: true, depthWrite: false, opacity: 0 }); disposables.push(tagM);
  var tag = new THREE.Sprite(tagM); tag.scale.set(1.9, 0.57, 1); tag.position.set(BASKET.x, 1.95, BASKET.z); tag.visible = false; scene.add(tag);
  var tagKey = "", restN = items.length;

  var dragOn = false;

         function drawTag() {
         if (tagKey === "t") return; tagKey = "t";
         var g = tagC.getContext("2d"); g.clearRect(0, 0, 320, 96);
         g.shadowColor = "rgba(0,0,0,.25)"; g.shadowBlur = 8; g.shadowOffsetY = 2;
         g.fillStyle = "#ffffff"; rrect(g, 10, 8, 300, 62, 12); g.fill(); g.shadowColor = "transparent";
         g.beginPath(); g.moveTo(140, 69); g.lineTo(160, 88); g.lineTo(180, 69); g.closePath(); g.fill();
         g.fillStyle = "#2b2f38"; g.font = "600 24px system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
         g.fillText("Kéo món lên máy quét", 160, 39); tagT.needsUpdate = true;
       }

 
  /* ================= 4. SCAN: laser nhiều tia như máy thật, món lướt qua kính ================= */
  var pat = [];                                                          /* tia quét chéo (nháy nhẹ khi quét) */
  [0.9, -0.9, 0.35].forEach(function (a) {
    var l = new THREE.Mesh(geo(new THREE.BoxGeometry(SCAN.w - 0.95, 0.006, 0.012)), laserM);
    l.rotation.y = a; l.position.set(SCAN.x, -0.045, SCAN.z); l.visible = false; scene.add(l); pat.push(l);
  });
  var pickAt = -9;
 
  /* ================= 5. MÁY IN BIÊN LAI ================= */
  scene.add(box(1.75, 2.45, 0, 0.34, -1.25, -0.65, mat(0xcfd2d6, 0.5, 0.1)));
  scene.add(box(1.85, 2.35, 0.335, 0.355, -1.0, -0.94, mat(0x2a2d34, 0.6), false));
  var ppTex = cvTex(64, 128, function (c, w, h) {
    c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); c.fillStyle = "#9aa0aa"; var r = rng(5);
    for (var y = 10; y < h - 6; y += 9) c.fillRect(8, y, 16 + r() * 36, 3);
  });
  var ppM = mat(0xffffff, 0.9, 0, { map: ppTex, side: THREE.DoubleSide, transparent: true });
  var paper = mesh(geo(new THREE.PlaneGeometry(0.4, 0.9).translate(0, 0.45, 0)), ppM, 2.1, 0.35, -0.97, false);
  paper.rotation.x = 0.2; paper.scale.y = 0.001; paper.visible = false; scene.add(paper);
  function printFx() {
    paper.visible = true; ppM.opacity = 1; paper.position.y = 0.35; paper.scale.y = 0.001;
    tween(1900, function (k) {
      if (k < 0.3) paper.scale.y = Math.max(0.001, easeOut(k / 0.3));
      else if (k > 0.75) { var u = (k - 0.75) / 0.25; paper.position.y = 0.35 + u * 0.6; ppM.opacity = 1 - u; }
    }, function () { paper.visible = false; });
  }
 
  /* ================= UPDATE ================= */
  function update(dt) {
    /* đèn trạng thái làn: xanh bình thường, hổ phách khi chờ nhập, đỏ khi sai */
    var lc = 0x2fb25a;
    if (mode === "fail") lc = Math.sin(time * 6) > 0 ? 0xe0a020 : 0x6a5010; else if (mode === "bad") lc = 0xd0382e;
    lampM.color.setHex(lc);
 
    /* thẻ gợi ý trên giỏ */
    var show = ready && restN > 0 && !dragOn;

    if (show) drawTag();

    tagM.opacity += ((show ? 1 : 0) - tagM.opacity) * (1 - Math.exp(-dt * 10));
    tag.visible = tagM.opacity > 0.02; tag.position.y = 1.95 + Math.sin(time * 2.2) * 0.04;
 
    /* scan: tia laser chéo + món lướt nhẹ qua kính như tay thu ngân đưa hàng */
    for (var i = 0; i < pat.length; i++) pat[i].visible = scanning && ((Math.floor(time * 30) + i) % 3 !== 0);
if (scanning && curEnt && curEnt.free && curEnt.mesh.visible && !curEnt.held && time > pickAt + 0.66) {
           if (curEnt.manual) {                                  /* người dùng tự đặt: chỉ rung rất nhẹ, không trượt đi chỗ khác */
           curEnt.mesh.position.y = curEnt.scanTo.y + Math.sin(time * 14) * 0.004;
         } else {
           curEnt.mesh.position.x = SCAN.x + Math.sin(time * 5.5) * 0.14;
           curEnt.mesh.position.y = SCAN_Y + 0.05 + Math.sin(time * 11) * 0.012;
           curEnt.mesh.rotation.y += Math.cos(time * 5.5) * dt * 0.5;
         }
       }
    custUpdate(dt); walkUpdate(dt);
  }
 
  return {
    update: update,
    setDrag: function (b) { dragOn = !!b; },
       pickDone: function () { pickAt = -9; },

    /* Cho phép bên ngoài phát tiếng bíp (dùng cho tiếng tích đồng hồ) */
    beep: beep,
    /* Khách hàng tỏ ra sốt ruột khi sắp hết giờ (không ghi đè khi đang có phản ứng khác) */
    hurry: function () { if (cm.n === "idle") setMood("impatient", 1.2); },
    onRest: function (n) { restN = n; },

    onPick: function () { pickAt = time; setMood("watch", 3); },
    onScanStart: function () { setMood("watch", 3); },
    onFail: function () { setMood("impatient", 12); beep(420, 110, 0.05); beep(420, 110, 0.05, 0.16); },
    onClear: function () { if (cm.n === "impatient") cm.until = time + 0.1; },
    onResult: function (good) {
      if (good) { setMood("happy", 1.4); beep(2400, 90, 0.05); }
      else { setMood("angry", 1.4); beep(330, 260, 0.05); }
    },
    onBag: function () { setMood("receive", 1.2); printFx(); },
    dispose: function () { try { if (auCtx) auCtx.close(); } catch (e) {} }
    
  };
})();
/* =================== HẾT EXTRAS v5 =================== */


/* ==========================================================================
   PLU COUNTER GL – DETAILS v6 (add-on, chạy SAU khối EXTRAS v5)
   Thêm chi tiết khung cảnh, vẫn sáng – trung tính – vật liệu mờ. Không đụng logic core.

   [1] Dán khối "DETAILS v6" bên dưới ngay SAU khối EXTRAS v5 (sau dòng "/* HẾT EXTRAS v5 *​/").
   [2] Trong update(dt), ngay sau dòng  X.update(dt);  thêm:   D.update(dt);

   Hai chỉnh nhỏ trong khối EXTRAS v5 (vì mép phải mặt quầy bị camera cắt):
   [3] Đổi toạ độ đèn số làn:   var TX = 4.3, TZ = -1.2;   →   var TX = 3.4, TZ = -1.55;
   [4] (tuỳ chọn) nếu khách bị cắt mép trái: cust.root.position.set(-3.7, …) → (-3.1, …)

   Thêm gì (đều nhỏ, tinh tế):
   - Mặt quầy: vân laminate, viền inox quanh hố rổ, máy cà thẻ quay về phía khách, dây cáp
     POS ↔ máy in ↔ máy cà thẻ, lọ sát khuẩn, giá kẹo nhỏ.
   - Kệ hàng: lon/hũ xen hộp, thêm 3 tầng kệ thấp, thanh giá + tem giá, cột kệ, chân kệ.
   - Tường: ốp chân tường, phào chân, đồng hồ treo chạy thật, biển lối ra, bình chữa cháy.
   - Trần/sàn: đèn tuýp treo, bóng đổ mềm dưới quầy, vạch xếp hàng, chồng rổ nhựa.
   ========================================================================== */

/* ===================== DETAILS v6 ===================== */
var D = (function () {
  var PI = Math.PI, T2 = PI * 2, V = THREE.Vector3;
  function cvTex(w, h, draw) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; disposables.push(t); return t;
  }
  function flatM(c) { var m = new THREE.MeshBasicMaterial({ color: c }); disposables.push(m); return m; }
  function sgn(txt, w, h, bg, fg) {
    var tx = cvTex(512, Math.round(512 * h / w), function (c, W, H) {
      c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = fg;
      c.font = "700 " + Math.round(H * 0.46) + "px system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
      c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, W / 2, H / 2 + 2);
    });
    var m = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85 }); disposables.push(m);
    return new THREE.Mesh(geo(new THREE.PlaneGeometry(w, h)), m);
  }
  var steel = mat(0xb9bec6, 0.35, 0.3), dk = mat(0x2a2d34, 0.55, 0.1), rub = mat(0x25272d, 0.85), wh = mat(0xf2f1ee, 0.55);
  var pal = [0xc4463d, 0xe3b94a, 0x3f7f55, 0x3a6ea5, 0xeeeae0, 0x8a5a3a, 0xd98a3a, 0x7a5aa0, 0x5aa0a8];
  var cc = new THREE.Color(), tm4 = new THREE.Matrix4();
  function pick() { return pal[(Math.random() * pal.length) | 0]; }
  function col(hex) { return cc.setHex(hex).offsetHSL(0, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.1); }

  /* ---------- 1. MẶT QUẦY ---------- */
  var sp = cvTex(256, 256, function (c, w, h) {                           /* vân laminate rất nhẹ */
    c.fillStyle = "#d6d8dc"; c.fillRect(0, 0, w, h);
    for (var i = 0; i < 1400; i++) {
      c.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,.35)" : "rgba(120,125,135,.18)";
      c.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
  });
  counterM.map = sp; counterM.color.setHex(0xffffff); counterM.needsUpdate = true;

  /* viền inox quanh miệng hố rổ */
  scene.add(box(bx0 - 0.07, bx1 + 0.07, 0, 0.014, bz0 - 0.07, bz0, steel, false));
  scene.add(box(bx0 - 0.07, bx1 + 0.07, 0, 0.014, bz1, bz1 + 0.07, steel, false));
  scene.add(box(bx0 - 0.07, bx0, 0, 0.014, bz0, bz1, steel, false));
  scene.add(box(bx1, bx1 + 0.07, 0, 0.014, bz0, bz1, steel, false));

  /* máy cà thẻ (khách bấm), mặt lưng quay về thu ngân */
  var tg = new THREE.Group(); tg.position.set(-2.4, 0, -1.75); scene.add(tg);
  tg.add(mesh(geo(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 14)), steel, 0, 0.05, 0));
  tg.add(mesh(geo(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8)), steel, 0, 0.19, 0));
  var tp = new THREE.Group(); tp.position.set(0, 0.34, 0); tp.rotation.x = 0.4; tg.add(tp);
  tp.add(mesh(geo(new THREE.BoxGeometry(0.5, 0.34, 0.1)), dk, 0, 0, 0));
  var tscr = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.42, 0.16)), flatM(0x1d2a38)); tscr.rotation.y = PI; tscr.position.set(0, 0.06, -0.052); tp.add(tscr);
  tp.add(mesh(geo(new THREE.BoxGeometry(0.36, 0.1, 0.012)), mat(0x3a3f4a, 0.5), 0, -0.09, -0.054, false));
  var tlg = new THREE.Mesh(geo(new THREE.CircleGeometry(0.04, 16)), steel); tlg.position.set(0, 0, 0.052); tp.add(tlg);

  /* lọ sát khuẩn */
  scene.add(mesh(geo(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16)), wh, 2.9, 0.2, -1.75));
  scene.add(mesh(geo(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8)), steel, 2.9, 0.44, -1.75));
  scene.add(mesh(geo(new THREE.BoxGeometry(0.14, 0.03, 0.04)), steel, 2.93, 0.48, -1.75));

  /* giá kẹo nhỏ cạnh máy cà thẻ */
  var rk = new THREE.Group(); rk.position.set(-3.25, 0, -1.75); scene.add(rk);
  rk.add(mesh(geo(new THREE.BoxGeometry(0.62, 0.95, 0.03)), wh, 0, 0.5, -0.12));
  [-1, 1].forEach(function (s) { rk.add(mesh(geo(new THREE.BoxGeometry(0.03, 0.95, 0.28)), steel, s * 0.31, 0.5, 0)); });
  [0.2, 0.5, 0.8].forEach(function (y) {
    rk.add(mesh(geo(new THREE.BoxGeometry(0.62, 0.025, 0.28)), steel, 0, y, 0));
    for (var k = 0; k < 6; k++) {
      var b = mesh(geo(new THREE.BoxGeometry(0.08, 0.1, 0.07)), mat(pick(), 0.6), -0.25 + k * 0.1, y + 0.065, 0.02, false); rk.add(b);
    }
  });

  /* dây cáp (đen, mảnh) */
  var rubG = [];
  function cable(pts) {
    var cu = new THREE.CatmullRomCurve3(pts.map(function (p) { return new V(p[0], p[1], p[2]); }));
    scene.add(mesh(geo(new THREE.TubeGeometry(cu, 24, 0.018, 6, false)), rub, 0, 0, 0, false));
  }
  cable([[0.7, 0.03, -0.75], [1.1, 0.02, -0.5], [1.5, 0.02, -0.55], [1.76, 0.12, -0.9]]);
  cable([[-0.5, 0.03, -0.8], [-0.7, 0.02, -1.3], [-0.85, 0.02, -1.8], [-0.85, -0.02, -1.95]]);
  cable([[-2.4, 0.03, -1.7], [-2.0, 0.02, -1.45], [-1.2, 0.02, -1.15], [-0.95, 0.03, -0.9]]);
  scene.add(mesh(geo(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 14)), rub, -0.85, 0.006, -1.9, false));

  /* ---------- 2. KỆ HÀNG ---------- */
  var boardM = mat(0xc4c9cf, 0.5, 0.1), upM = mat(0xc9cdd2, 0.45, 0.1);
  /* lon/hũ xen trong các tầng kệ có sẵn: ẩn một số hộp, thay bằng hình trụ */
  var zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
  var cyl = new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(0.2, 0.2, 0.55, 14)), mat(0xffffff, 0.5), rows.length * 8), ci = 0;
  rows.forEach(function (ry, ri) {
    for (var c = 1; c < perRow; c += 4) {
      shelf.setMatrixAt(ri * perRow + c, zeroM);
      var sh = 0.8 + Math.random() * 0.4;
      tm4.makeScale(1, sh, 1); tm4.setPosition(-9.6 + c * 0.6, ry - 0.3 + 0.275 * sh, -4.5);
      cyl.setMatrixAt(ci, tm4); cyl.setColorAt(ci, col(pick())); ci++;
    }
  });
  shelf.instanceMatrix.needsUpdate = true;
  cyl.instanceMatrix.needsUpdate = true; if (cyl.instanceColor) cyl.instanceColor.needsUpdate = true;
  cyl.castShadow = true; cyl.frustumCulled = false; scene.add(cyl);

  /* 3 tầng kệ thấp + chân kệ + cột */
  var rows2 = [-0.3, -1.3, -2.3];
  var low = new THREE.InstancedMesh(boxG, mat(0xffffff, 0.8), rows2.length * perRow), li = 0;
  rows2.forEach(function (ry) {
    scene.add(mesh(geo(new THREE.BoxGeometry(20, 0.07, 0.9)), boardM, 0, ry - 0.34, -4.5, false));
    for (var c = 0; c < perRow; c++) {
      var sh = 0.75 + Math.random() * 0.5;
      tm4.makeScale(1, sh, 1); tm4.setPosition(-9.6 + c * 0.6 + Math.random() * 0.06, ry - 0.3 + 0.3 * sh, -4.5);
      low.setMatrixAt(li, tm4); low.setColorAt(li, col(pick())); li++;
    }
  });
  low.instanceMatrix.needsUpdate = true; if (low.instanceColor) low.instanceColor.needsUpdate = true; low.frustumCulled = false; scene.add(low);
  scene.add(box(-10, 10, -2.9, -2.67, -4.95, -4.05, mat(0xaeb3ba, 0.5, 0.1), false));
  for (var ux = -9.6; ux <= 9.7; ux += 2.4) scene.add(box(ux - 0.03, ux + 0.03, -2.9, -0.3, -4.95, -4.1, upM, false));

  /* thanh giá + tem giá trước mỗi tầng */
  var allRows = rows.concat(rows2), tagPal = [0xd4503f, 0xe6c84a, 0x4a8a5a, 0xf4f3ef];
  var tags = new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(0.18, 0.1)), mat(0xffffff, 0.8), allRows.length * 14), ti = 0;
  allRows.forEach(function (ry) {
    scene.add(box(-10, 10, ry - 0.39, ry - 0.3, -4.06, -4.04, wh, false));
    for (var k = 0; k < 14; k++) {
      tm4.makeTranslation(-9.4 + k * 1.4 + Math.random() * 0.5, ry - 0.345, -4.032);
      tags.setMatrixAt(ti, tm4); tags.setColorAt(ti, cc.setHex(tagPal[(Math.random() * tagPal.length) | 0])); ti++;
    }
  });
  tags.instanceMatrix.needsUpdate = true; if (tags.instanceColor) tags.instanceColor.needsUpdate = true; tags.frustumCulled = false; scene.add(tags);

  /* ---------- 3. TƯỜNG ---------- */
  scene.add(box(-23, 23, -2.9, -0.5, -4.9, -4.87, mat(0xdad6cd, 0.9), false));      /* ốp chân tường */
  scene.add(box(-23, 23, -2.9, -2.65, -4.9, -4.84, mat(0xc3bfb6, 0.8), false));     /* phào chân */
  /* đồng hồ treo tường, chạy giờ thật */
  var clkC = document.createElement("canvas"); clkC.width = clkC.height = 128;
  var clkT = new THREE.CanvasTexture(clkC); clkT.colorSpace = THREE.SRGBColorSpace; disposables.push(clkT);
  var clkM = new THREE.MeshStandardMaterial({ map: clkT, roughness: 0.5 }); disposables.push(clkM);
  var clk = new THREE.Mesh(geo(new THREE.CircleGeometry(0.5, 40)), clkM); clk.position.set(4.3, 6.05, -4.84); scene.add(clk);
  var clkR = new THREE.Mesh(geo(new THREE.TorusGeometry(0.5, 0.035, 8, 40)), dk); clkR.position.set(4.3, 6.05, -4.84); scene.add(clkR);
  function drawClock() {
    var g = clkC.getContext("2d"), d = new Date(), cx = 64, cy = 64;
    g.fillStyle = "#fbfaf7"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#2b2f38"; g.lineCap = "round";
    for (var i = 0; i < 12; i++) { var a = i / 12 * T2; g.lineWidth = i % 3 ? 2 : 4; g.beginPath(); g.moveTo(cx + Math.sin(a) * 50, cy - Math.cos(a) * 50); g.lineTo(cx + Math.sin(a) * 58, cy - Math.cos(a) * 58); g.stroke(); }
    function hand(a, l, w, c) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * l, cy - Math.cos(a) * l); g.stroke(); }
    hand(((d.getHours() % 12) + d.getMinutes() / 60) / 12 * T2, 28, 5, "#2b2f38");
    hand((d.getMinutes() + d.getSeconds() / 60) / 60 * T2, 42, 3.5, "#2b2f38");
    hand(d.getSeconds() / 60 * T2, 46, 1.5, "#b83a30");
    clkT.needsUpdate = true;
  }
  drawClock();
  /* biển lối ra + bình chữa cháy trên cột */
  var ex = sgn("LỐI RA", 0.95, 0.34, "#2f7a57", "#ffffff"); ex.position.set(5.4, 3.7, -4.27); scene.add(ex);
  scene.add(mesh(geo(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 14)), mat(0xb83a30, 0.5), -5.4, -1.2, -4.16));
  scene.add(mesh(geo(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 10)), dk, -5.4, -0.78, -4.16));

  /* ---------- 4. TRẦN + SÀN ---------- */
  [-3.2, 3.2].forEach(function (x) {                                       /* đèn tuýp treo (trắng phẳng, không phát màu) */
    var fx = new THREE.Mesh(geo(new THREE.BoxGeometry(3.2, 0.08, 0.34)), flatM(0xfbfaf6)); fx.position.set(x, 6.8, -3.0); scene.add(fx);
    scene.add(mesh(geo(new THREE.BoxGeometry(3.3, 0.04, 0.4)), mat(0xc9cdd2, 0.5), x, 6.86, -3.0, false));
    [-1.4, 1.4].forEach(function (s) { scene.add(mesh(geo(new THREE.CylinderGeometry(0.01, 0.01, 2.6, 6)), steel, x + s, 8.15, -3.0, false)); });
  });
  var ao = cvTex(256, 128, function (c, w, h) {                            /* bóng đổ mềm dưới quầy */
    c.shadowOffsetX = 600; c.shadowColor = "rgba(0,0,0,.5)"; c.shadowBlur = 26; c.fillStyle = "#000"; c.fillRect(-600 + 40, 26, w - 80, h - 52);
  });
  var aoM = new THREE.MeshBasicMaterial({ map: ao, transparent: true, depthWrite: false }); disposables.push(aoM);
  var aoP = new THREE.Mesh(geo(new THREE.PlaneGeometry(13, 6.6)), aoM); aoP.rotation.x = -PI / 2; aoP.position.set(0, -2.893, 0.1); scene.add(aoP);
  scene.add(mesh(geo(new THREE.BoxGeometry(14, 0.01, 0.07)), mat(0xcbbf8e, 0.7), 0, -2.895, -3.75, false));   /* vạch xếp hàng */
  var bkM = mat(0xc0392b, 0.55, 0, { side: THREE.DoubleSide });          /* chồng rổ nhựa */
  var sg = geo(new THREE.CylinderGeometry(0.7, 0.55, 0.5, 4, 1, true)); sg.rotateY(PI / 4); sg.scale(1, 1, 0.75);
  for (var i = 0; i < 6; i++) scene.add(mesh(sg, bkM, -4.9, -2.65 + i * 0.2, -3.2));

  var clkT0 = 0;
  return {
    update: function (dt) { clkT0 += dt; if (clkT0 >= 1) { clkT0 = 0; drawClock(); } }
  };
})();
/* =================== HẾT DETAILS v6 =================== */

    /* ---------- camera POV: 2 tư thế (rộng / màn hình), tự khớp khung ---------- */
var W = 1, H = 1, poseW = null, poseS = null, poseK = null, zoomK = 0, zoomKT = 0;
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

    /* nút chuyển giữa "phóng bàn phím" và "xem cả màn hình" (chỉ hiện trên điện thoại khi đang nhìn màn POS) */
var zbtn = document.createElement("button");
zbtn.type = "button"; zbtn.className = "pcg-zoom"; zbtn.hidden = true;
cv.appendChild(zbtn);
function zoomUI() {
  zbtn.hidden = !(isPortrait && poseK && focusT === 1);
  zbtn.textContent = zoomKT ? "Xem cả màn hình" : "Phóng bàn phím";
}
zbtn.addEventListener("click", function () { zoomKT = zoomKT ? 0 : 1; zoomUI(); });

/* Chạm vào vùng nhập/bàn phím khi đang nhìn cả màn hình (điện thoại): zoom vào bàn phím.
   Lần chạm đầu chỉ dùng để zoom, không bấm nhầm phím ở cỡ nhỏ. */
var tapGate = false, tapGateT = 0;
var GATE_EVS = ["pointerdown", "mousedown", "touchstart", "pointerup", "mouseup", "touchend", "click"];
function kbNeedsZoom() { return !!(isPortrait && poseK && focusT === 1 && zoomKT === 0); }
function kbGate(e) {
  var now = performance.now();
  if (e.type === "pointerdown" && kbNeedsZoom() && e.target.closest && e.target.closest(".pos-r")) {
    zoomKT = 1; zoomUI(); tapGate = true; tapGateT = now;       /* bật chặn cho cú chạm này */
  }
  if (tapGate && now - tapGateT < 700) {                          /* nuốt toàn bộ sự kiện của cú chạm zoom */
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (e.type === "click") tapGate = false;
  } else if (tapGate) tapGate = false;
}
GATE_EVS.forEach(function (n) { posMount.addEventListener(n, kbGate, true); });

    function resize() {
      W = Math.max(cv.clientWidth, 1); H = Math.max(cv.clientHeight, 1);
      renderer.setSize(W, H, false);
      var por = !!(window.matchMedia && window.matchMedia("(max-width:760px)").matches);
      if (por !== isPortrait) {
        isPortrait = por; buildMonitor(por);
        posMount.style.width = PW + "px"; posMount.style.height = PH + "px";
        
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

            poseK = null;
      if (por) {                         /* điện thoại: thêm tư thế phóng vào ô nhập + bàn phím */
        var mp = function (lx, ly) { return new V3(-SW / 2 + lx / PW * SW, SH / 2 - ly / PH * SH, 0.006).applyMatrix4(monTilt.matrixWorld); };
        var kc = [mp(400, 52), mp(640, 52), mp(400, 440), mp(640, 440)];
        var kT = new V3().add(kc[0]).add(kc[1]).add(kc[2]).add(kc[3]).multiplyScalar(0.25);
        poseK = fit(kT, v(0, 0.3, 0.95).normalize(), kc, 0.97, 0.96);
      } else zoomKT = 0;
      zoomUI();
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

   /* ===================== KHỐI 1 – thay cho khối raycaster/onDown cũ ===================== */
var ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), tmpP = new V3();
var cvEl = renderer.domElement;
cvEl.style.touchAction = "none";                              /* cảm ứng: kéo món không bị cuộn trang / cắt pointer */
var HOVER_Y = 1.0, ZONE_PAD = 0.3;                            /* độ cao món khi cầm; dung sai quanh kính (đơn vị cảnh) */
var HOLD = new THREE.Plane(new V3(0, 1, 0), -HOVER_Y);
var pend = null, drag = null, dropping = false, manualDrop = null, hintT = 0, zoneBad = 0;
function clampv(v, a, b) { return Math.max(a, Math.min(b, v)); }
function vibe(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {} }
 
/* khung gợi ý vị trí quét trên mặt kính (mảnh, mờ; xanh khi món đang ở trên vùng quét) */
var zoneM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }); disposables.push(zoneM);
(function () {
  var x0 = sx0 + 0.1, x1 = sx1 - 0.1, z0 = sz0 + 0.1, z1 = sz1 - 0.1, t = 0.035;
  scene.add(box(x0, x1, -0.056, -0.048, z0, z0 + t, zoneM, false)); scene.add(box(x0, x1, -0.056, -0.048, z1 - t, z1, zoneM, false));
  scene.add(box(x0, x0 + t, -0.056, -0.048, z0, z1, zoneM, false)); scene.add(box(x1 - t, x1, -0.056, -0.048, z0, z1, zoneM, false));
})();
 
function setNdc(cx, cy, off) {
  var r = cvEl.getBoundingClientRect();
  ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - off - r.top) / r.height) * 2 + 1);
}
function planePt(cx, cy, off) { setNdc(cx, cy, off); ray.setFromCamera(ptr, camera); return ray.ray.intersectPlane(HOLD, tmpP); }
function inZone(x, z, pad) { return x > sx0 - pad && x < sx1 + pad && z > sz0 - pad && z < sz1 + pad; }
function topEnt() {                                           /* món trên cùng trong rổ = món engine sẽ lấy (rest[0]) */
  for (var i = 0; i < ents.length; i++) if (ents[i].slot === 0 && ents[i].mesh.visible && !ents[i].free) return ents[i];
  return null;
}
 
var onDown = function (e) {
  if (!ready || !basketCb || drag || pend || dropping || manualDrop) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  setNdc(e.clientX, e.clientY, 0); ray.setFromCamera(ptr, camera);
  var targets = [basketG].concat(ents.filter(function (x) { return x.mesh.visible && !x.free; }).map(function (x) { return x.mesh; }));
  if (!ray.intersectObjects(targets, true).length) return;
  var t = topEnt(); if (!t) return;
  pend = { e: t, id: e.pointerId, x0: e.clientX, y0: e.clientY, cx: e.clientX, cy: e.clientY, touch: e.pointerType !== "mouse" };
  try { cvEl.setPointerCapture(e.pointerId); } catch (_) {}
  e.preventDefault();
};
function beginDrag() {
  drag = pend; pend = null; drag.px = drag.e.mesh.position.x; drag.pz = drag.e.mesh.position.z; drag.over = false;
  var it = drag.e; it.free = true; X.setDrag(true); cvEl.style.cursor = "grabbing"; vibe(8);
}
var onDragMove = function (e) {
  var s = drag || pend; if (!s || e.pointerId !== s.id) return;
  s.cx = e.clientX; s.cy = e.clientY;
  if (pend && !drag && Math.hypot(e.clientX - pend.x0, e.clientY - pend.y0) > 8) beginDrag();   /* chạm nhẹ không nhấc món lên */
};
var onDragEnd = function (e) {
  var s = drag || pend; if (!s || e.pointerId !== s.id) return;
  try { cvEl.releasePointerCapture(e.pointerId); } catch (_) {}
  if (pend) { pend = null; hintT = 1.6; return; }             /* chỉ chạm: nháy khung gợi ý chỗ đặt món */
  var d = drag; drag = null; X.setDrag(false); cvEl.style.cursor = "";
if (d.committed) { settleHeld(d.e); return; }
if (e.type !== "pointercancel" && d.over && ready && basketCb) dropOnScanner(d); else sendBack(d.e, e.type !== "pointercancel");
};
function sendBack(it, bad) {                                  /* trả món về rổ: update() tự lướt về đúng ô */
  it.manual = false; it.free = false;
  if (bad) { zoneBad = 1; vibe(18); }
  var r0 = { x: it.mesh.rotation.x, z: it.mesh.rotation.z };
  tween(300, function (k) { it.mesh.rotation.x = r0.x * (1 - k); it.mesh.rotation.z = r0.z * (1 - k); });
}
function dropOnScanner(d) {
  var it = d.e, to = new V3(clampv(d.px, SCAN.x - 0.4, SCAN.x + 0.4), it.scanTo.y, clampv(d.pz, SCAN.z - 0.18, SCAN.z + 0.18));
  var from = it.mesh.position.clone(), m = it.mesh, r0 = { x: m.rotation.x, y: m.rotation.y, z: m.rotation.z };
  var rt = it.rotTo || { x: 0, y: r0.y, z: 0 }, dy = rt.y - r0.y; dy -= Math.round(dy / TAU) * TAU;
  dropping = true; it.manual = true;
  tween(180, function (k) {
    var t = easeOut(k); m.position.lerpVectors(from, to, t);
    m.rotation.set(r0.x + (rt.x - r0.x) * t, r0.y + dy * t, r0.z + ((rt.z || 0) - r0.z) * t);
  }, function () {
    dropping = false;
    if (!alive || !ready || !basketCb) { sendBack(it, false); return; }
    manualDrop = { e: it }; vibe(10);
    basketCb();                                               /* = người dùng "bấm lấy món" như trước; engine gọi view.pick(it) */
    if (manualDrop) setTimeout(function () {                  /* engine chưa nhận sau 0,5s → trả món về rổ */
      if (manualDrop && manualDrop.e === it) { manualDrop = null; sendBack(it, false); }
    }, 500);
  });
}
cvEl.addEventListener("pointerdown", onDown);
cvEl.addEventListener("pointermove", onDragMove);
cvEl.addEventListener("pointerup", onDragEnd);
cvEl.addEventListener("pointercancel", onDragEnd);
cvEl.addEventListener("lostpointercapture", onDragEnd);
 
/* nút "Tự động quét": hành vi cũ (engine tự lấy món, món tự bay lên kính) */
var abtn = document.createElement("button");
abtn.type = "button"; abtn.className = "pcg-auto"; abtn.hidden = true; abtn.textContent = "Tự động quét";
abtn.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
abtn.addEventListener("click", function () {
  if (!ready || !basketCb || drag || pend || dropping || manualDrop) return;
  abtn.hidden = true; abtnOn = false; basketCb();
});
cv.appendChild(abtn);
var abtnOn = false;
function autoUI() {
  var on = !!(ready && basketCb && rest.length && !drag && !pend && !dropping && !manualDrop && focusT === 0);
  if (on !== abtnOn) { abtnOn = on; abtn.hidden = !on; if (!drag) cvEl.style.cursor = on ? "grab" : ""; }
}
 
var HOLD_DWELL = 0.3, HOLD_LIFT = 0.35;      /* giữ trên kính bao lâu thì quét; độ cao tay cầm món */
function commitHold(d) {
  var it = d.e;
  d.committed = true; it.held = true; manualDrop = { e: it }; vibe(12);
  basketCb();                                 /* engine nhận → gọi view.pick(it) */
  if (manualDrop) setTimeout(function () {    /* engine không nhận → huỷ, món vẫn trên tay */
    if (manualDrop && manualDrop.e === it) { manualDrop = null; d.committed = false; it.held = false; d.dwell = 0; }
  }, 500);
}
function settleHeld(it) {                     /* thả tay khi đang quét: món nằm xuống mâm cân */
  it.held = false;
  var m = it.mesh, from = m.position.clone(), to = new V3(from.x, it.scanTo.y, from.z), r0 = { x: m.rotation.x, z: m.rotation.z }, rt = it.rotTo || { x: 0, z: 0 };
  tween(160, function (k) {
    if (it.bagging) return;
    var t = easeOut(k); m.position.lerpVectors(from, to, t);
    m.rotation.x = r0.x + (rt.x - r0.x) * t; m.rotation.z = r0.z * (1 - t);
  });
}
function dragUpdate(dt) {
  if (drag) {
    if (!drag.committed && (!ready || !basketCb)) { var d0 = drag; drag = null; X.setDrag(false); cvEl.style.cursor = ""; sendBack(d0.e, false); }
    else {
      var it = drag.e, m = it.mesh, p = planePt(drag.cx, drag.cy, drag.touch ? 60 : 0);
      if (p) {
        drag.px = clampv(p.x, -4.2, 4.2); drag.pz = clampv(p.z, -0.5, 2.0);
        if (drag.committed) {                 /* đang quét: tay chỉ rê trong vùng kính */
          drag.px = clampv(drag.px, SCAN.x - 0.55, SCAN.x + 0.55); drag.pz = clampv(drag.pz, SCAN.z - 0.2, SCAN.z + 0.2);
        }
      }
      drag.over = drag.committed || inZone(drag.px, drag.pz, ZONE_PAD);
      if (!drag.committed) {
        if (drag.over && ready && basketCb && !manualDrop && !dropping) { drag.dwell = (drag.dwell || 0) + dt; if (drag.dwell >= HOLD_DWELL) commitHold(drag); }
        else drag.dwell = 0;
      }
      var ty = drag.over ? it.scanTo.y + HOLD_LIFT : HOVER_Y, k = 1 - Math.exp(-dt * 16), ox = m.position.x;
      if (drag.committed) ty += Math.sin(time * 13) * 0.004;               /* tay run nhẹ */
      m.position.x += (drag.px - ox) * k; m.position.y += (ty - m.position.y) * k; m.position.z += (drag.pz - m.position.z) * k;
      var vx = (m.position.x - ox) / Math.max(dt, 1e-3);
      m.rotation.z += (clampv(-vx * 0.05, -0.35, 0.35) - m.rotation.z) * k;
      m.rotation.x += ((it.rotTo ? it.rotTo.x * 0.6 : 0) - m.rotation.x) * k;
    }
  }
  var zt = drag ? (drag.over ? 0.95 : 0.5) : (hintT > 0 ? 0.9 * Math.min(1, hintT) * (0.7 + 0.3 * Math.sin(time * 12)) : 0);
  hintT = Math.max(0, hintT - dt * 0.9);
  if (zoneBad > 0) { zoneBad = Math.max(0, zoneBad - dt * 2.2); zoneM.color.setHex(0xd0382e); zt = Math.max(zt, zoneBad); }
  else zoneM.color.setHex(drag && drag.over ? 0x2fb25a : 0xffffff);
  zoneM.opacity += (zt - zoneM.opacity) * (1 - Math.exp(-dt * 12));
}
function disposeManual() {
  cvEl.removeEventListener("pointerdown", onDown); cvEl.removeEventListener("pointermove", onDragMove);
  cvEl.removeEventListener("pointerup", onDragEnd); cvEl.removeEventListener("pointercancel", onDragEnd);
  cvEl.removeEventListener("lostpointercapture", onDragEnd);
  if (abtn.parentNode) abtn.parentNode.removeChild(abtn);
}
/* ===================== HẾT KHỐI 1 ===================== */

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

      dragUpdate(dt); autoUI();

      laser.visible = scanning;
      if (scanning) laser.position.z = SCAN.z + Math.sin(time * 14) * 0.09;
      if ((mode === "good" || mode === "bad") && time > modeUntil) mode = "idle";
      var tI = 0, lc = 0x4aa8ff, gc = 0x1a6ea8, gi = 0.6, curA = 0, curC = 0xff2a1c, fgI = 0.15;
      if (scanning) { tI = 2.0; curA = 0.16 + 0.08 * Math.sin(time * 18); fgI = 1.0; }
      else if (mode === "fail") { tI = 2.6 + Math.sin(time * 10) * 0.5; lc = 0xff3b30; gc = 0xc02820; gi = 0.9; curA = 0.1 + 0.08 * Math.sin(time * 10); fgI = 1.4; }
      else if (mode === "good") { tI = 2.2; lc = 0x30d158; gc = 0x1fa34a; gi = 0.9; curC = 0x30d158; curA = 0.2; fgI = 1.2; }
      else if (mode === "bad") { tI = 2.2; lc = 0xff3b30; gc = 0xc02820; gi = 0.9; curA = 0.2; fgI = 1.4; }
      scanLight.intensity += (tI - scanLight.intensity) * (1 - Math.exp(-dt * 10));
      scanLight.color.setHex(lc);
      ledBarM.color.setHex(scanning ? 0xffb020 : mode === "good" ? 0x30d158 : (mode === "fail" || mode === "bad") ? 0xff3b30 : 0x1f6a3a);
      glassM.emissive.setHex(gc); glassM.emissiveIntensity = gi + (scanning ? 0.4 : 0);
      curtain.visible = curA > 0.001; curtainM.color.setHex(curC); curtainM.opacity = curA;
      fGlassM.emissive.setHex(curC); fGlassM.emissiveIntensity = fgI;

      if (bagSquash > 0) {
        bagSquash = Math.max(0, bagSquash - dt * 4);
        var s = Math.sin(bagSquash * Math.PI);
        bagG.scale.set(1 + s * 0.06, 1 - s * 0.1, 1 + s * 0.06);
      }

      X.update(dt);
      D.update(dt);
            /* Căng thẳng: tiến về giá trị đích mượt, ánh sáng từ màn POS ấm dần khi sắp hết giờ */
      tension += (tensionT - tension) * (1 - Math.exp(-dt * 2));
      monGlow.color.setHex(0xffffff).lerp(warmC, tension);
      monGlow.intensity = 0.25 + tension * 0.4;

      /* camera: chuyển mượt giữa tư thế rộng và tư thế nhìn màn hình, lắc khi sai */
      focus += (focusT - focus) * (1 - Math.exp(-dt * 3.2));
      px += (mx - px) * (1 - Math.exp(-dt * 4)); py += (my - py) * (1 - Math.exp(-dt * 4));
      shake = Math.max(0, shake - dt * 0.5);
            zoomK += (zoomKT - zoomK) * (1 - Math.exp(-dt * 5));
      if (poseW && poseS) {
        var f = easeIO(Math.min(1, Math.max(0, focus))), calm = 1 - 0.75 * f, sk = shake * (1 - 0.65 * f);
        camPos.lerpVectors(poseW.pos, poseS.pos, f);
        camLook.lerpVectors(poseW.look, poseS.look, f);
        if (poseK && zoomK > 0.001) {                       /* phóng vào bàn phím, camera đứng yên hơn */
          var zk = easeIO(Math.min(1, zoomK)) * f;
          camPos.lerp(poseK.pos, zk); camLook.lerp(poseK.look, zk);
          calm *= 1 - zk; sk *= 1 - 0.6 * zk;
        }
        camPos.x += px * 0.4 * calm + Math.sin(time * 0.6) * 0.03 * calm + (Math.random() - 0.5) * sk;
        camPos.y += -py * 0.2 * calm + Math.sin(time * 0.8) * 0.025 * calm + (Math.random() - 0.5) * sk;
        camera.position.copy(camPos); camera.lookAt(camLook);
                /* Camera tiến vào rất nhẹ (tối đa 2 độ FOV) khi căng thẳng tăng; cập nhật khi giá trị đổi */
        var nf = (W / H < 0.9 ? 46 : 34) - tension * 2;
        if (Math.abs(nf - camera.fov) > 0.002) { camera.fov = nf; camera.updateProjectionMatrix(); }
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

   /* ---------- khung POS: chèn CSS, tự chèn lại nếu engine vẽ lại POS, đồng bộ cân + trạng thái máy quét ---------- */
if (!document.getElementById("pcg-vp-css")) {
  var vpSt = document.createElement("style"); vpSt.id = "pcg-vp-css"; vpSt.textContent = VP_CSS; document.head.appendChild(vpSt);
}
var vx = document.createElement("div"); vx.className = "vp"; vx.innerHTML = VX_HTML;
var vpClk = vx.querySelector(".vp-clk"), vpKg = vx.querySelector(".vp-kg"), vpScn = vx.querySelector(".vp-scn"), vpTxt = vpScn.querySelector("em");
var VP_ST = { wait: "Máy quét sẵn sàng", scan: "Đang quét…", nobar: "Không đọc được mã", ok: "Đã đọc mã", bad: "Sai mã PLU" };
function p2(n) { return n < 10 ? "0" + n : "" + n; }
function vxTick() {
  var d = new Date();
  vpClk.textContent = p2(d.getHours()) + ":" + p2(d.getMinutes()) + "   " + p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear();
}
function vxSync() {
  if (vx.parentNode !== posMount) posMount.appendChild(vx);
  var ks = posMount.querySelectorAll(".pos-k");
  for (var i = 0; i < ks.length; i++) {
    var k = ks[i];
    if (!k.classList.contains("fn") && !k.classList.contains("ok")) k.setAttribute("data-d", (k.textContent || "").trim());
  }
  /* chỉ ghi khi giá trị đổi, tránh MutationObserver tự gọi lại vô hạn */
  var stEl = posMount.querySelector(".pos-state"), kind = "wait", m = stEl && /\b(wait|scan|nobar|ok|bad)\b/.exec(stEl.className);
  if (m) kind = m[1];
  var cls = "vp-scn " + kind; if (vpScn.className !== cls) vpScn.className = cls;
  if (vpTxt.textContent !== VP_ST[kind]) vpTxt.textContent = VP_ST[kind];
  var mt = posMount.querySelector(".pos-meta"), g = mt && /([\d.]+)\s*kg/.exec(mt.textContent);
  var kg = (kind === "wait" || !g) ? "0,000" : g[1].replace(".", ",");
  if (vpKg.textContent !== kg) vpKg.textContent = kg;
}
var vxObs = new MutationObserver(vxSync);
vxObs.observe(posMount, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
vxSync(); vxTick();
var vxTimer = setInterval(vxTick, 15000);

        /* ===================== TIME RING v2: vòng đồng hồ + căng thẳng cảnh ===================== */
    var TR = (function () {
      var MODES = ["full", "calm", "off"];
      var LABEL = { full: "Đầy đủ", calm: "Nhẹ", off: "Tắt" };
      var CIRC = 2 * Math.PI * 19;                    /* chu vi vòng (r = 19) */
      var mode = "full";
      try { var sv = localStorage.getItem("plu-timer-mode"); if (MODES.indexOf(sv) >= 0) mode = sv; } catch (e) {}

      /* Dựng DOM: vòng SVG, đầu cung sáng (.hd), gợn sóng (.rp), số giây, nút chế độ, lớp viền đỏ */
      var el = document.createElement("div"); el.className = "pcg-tm";
      el.innerHTML =
        '<div class="rg"><svg viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="19"/>' +
        '<circle class="fg" cx="22" cy="22" r="19"/></svg><i class="hd"></i><i class="rp"></i><b>--</b></div>' +
        '<button type="button" class="md"></button>';
      var fg = el.querySelector(".fg"), num = el.querySelector("b"), md = el.querySelector(".md");
      var hd = el.querySelector(".hd"), rp = el.querySelector(".rp");
      var vig = document.createElement("div"); vig.className = "pcg-tm-vig";
      cv.appendChild(el); cv.appendChild(vig);
      fg.style.strokeDasharray = CIRC;

      /* Áp chế độ hiện tại lên giao diện và lưu lại */
      function applyMode() {
        md.textContent = "Đồng hồ: " + LABEL[mode];
        cv.classList.toggle("tm-off", mode === "off");
        try { localStorage.setItem("plu-timer-mode", mode); } catch (e) {}
      }
      md.addEventListener("click", function () {
        mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length]; applyMode();
      });
      applyMode();

      /* Màu liên tục theo tiến độ p: xanh (140) → hổ phách (40) ở p=0.33 → đỏ (5) */
      function tmHue(p) {
        return p > 0.33 ? 40 + (p - 0.33) / 0.67 * 100 : 5 + Math.max(0, p - 0.05) / 0.28 * 35;
      }

      /* Đọc tiến độ 0..1 từ thanh .pos-tm i của engine */
      function readProgress() {
        var i = posMount.querySelector(".pos-tm i");
        if (!i) return null;
        var t = getComputedStyle(i).transform;
        if (!t || t === "none") return 1;
        var m = t.match(/matrix\(([^)]+)\)/);
        return m ? Math.max(0, Math.min(1, parseFloat(m[1].split(",")[0]))) : 1;
      }

      var lastP = null, startAt = 0, startP = 1, lastSec = -1, shownSec = "";

      /* Mỗi 100ms: cập nhật vòng, màu, đầu cung, số giây, căng thẳng cảnh, viền đỏ, tiếng tích */
      function tick() {
        var p = readProgress(), now = performance.now();
        if (p === null || mode === "off") {
          el.classList.remove("show"); vig.style.opacity = 0; lastP = null; tensionT = 0; return;
        }
        el.classList.add("show");
        if (lastP === null || p > lastP + 0.2) {                       /* câu mới: reset + vòng "hiện ra" nhẹ */
          startAt = now; startP = p; lastSec = -1;
          el.classList.remove("in"); void el.offsetWidth; el.classList.add("in");
        }
        lastP = p;

        /* Ước lượng số giây còn lại từ tốc độ chạy của thanh */
        var used = startP - p, sec = null;
        if (used > 0.04) sec = Math.ceil(p / (used / ((now - startAt) / 1000)));
        var txt = sec === null ? "" : String(sec);
        if (txt !== shownSec) {                                        /* số đổi: chạy lại animation trượt */
          shownSec = txt; num.textContent = txt;
          num.classList.remove("tk"); void num.offsetWidth; num.classList.add("tk");
        }

        /* Cung tiến độ + màu liên tục + đầu cung xoay theo p */
        fg.style.strokeDashoffset = CIRC * (1 - p);
        el.style.setProperty("--tc", "hsl(" + tmHue(p).toFixed(0) + ",85%,55%)");
        hd.style.transform = "rotate(" + (p * 360).toFixed(1) + "deg)";
        el.classList.toggle("crit", p < 0.15 && mode === "full");

        /* Căng thẳng cảnh: 0 khi còn trên 1/3, tăng dần tới 1 khi hết giờ (chỉ ở chế độ Đầy đủ) */
        tensionT = mode === "full" ? Math.max(0, Math.min(1, 1 - p / 0.33)) : 0;

        if (mode === "full" && p < 0.15) {
          vig.style.opacity = (1 - p / 0.15) * 0.9;
          if (sec !== null && sec !== lastSec) { lastSec = sec; X.beep(1100, 35, 0.03); X.hurry(); }
        } else vig.style.opacity = 0;
      }
      var timer = setInterval(tick, 100);

      /* Gợn sóng mảnh toả ra từ đồng hồ khi có kết quả: xanh = đúng, đỏ = sai */
      function flash(good) {
        if (mode === "off") return;
        rp.className = "rp"; void rp.offsetWidth; rp.className = "rp " + (good ? "g" : "b");
      }

      /* Dọn dẹp khi huỷ view */
      function dispose() { clearInterval(timer); tensionT = 0; }

      return { dispose: dispose, flash: flash };
    })();
    /* =================== HẾT TIME RING v2 =================== */
    /* =================== HẾT TIME RING =================== */
    
    /* ---------- giao diện view ---------- */
    return {
      kind: "gl",
      posMount: posMount,
      setRest: setRest,
      ready: function (on) { ready = !!on; },
      onBasket: function (fn) { basketCb = fn; },
      /* ===================== KHỐI 3 – thay pick + thêm scanOk trong object trả về ===================== */
      pick: function (it) {

        var e = ents[items.indexOf(it)]; curEnt = e; e.free = true; e.slot = -1;
        e.mesh.visible = true; focusT = 0; zoomKT = 0; zoomUI();
        X.onPick(e);
        if (manualDrop) {                                     /* người dùng đã tự đặt món lên kính */
          var md = manualDrop; manualDrop = null;
          if (md.e === e) { e.manual = true; X.pickDone(); return 60; }   /* không bay nữa, engine đi tiếp gần như ngay */
          sendBack(md.e, false);                              /* engine chọn món khác: trả món vừa đặt về rổ */
        }
        e.manual = false;                                     /* quét tự động: bay như cũ */
        arc(e, e.mesh.position.clone(), e.scanTo, 1.2, 600, Math.PI * 0.6, null, e.rotTo);
        return 650;
      },
      scanOk: function () {                                   /* engine gọi khi món có mã vạch quét thành công */
        scanning = false; mode = "good"; modeUntil = time + 0.9; X.onResult(true);
      },
/* ===================== HẾT KHỐI 3 ===================== */
      scanStart: function () { scanning = true; mode = "idle"; X.onScanStart(); },
      /* Quét lỗi: camera nhìn vào màn POS, KHÔNG tự zoom bàn phím (giống PC) */
scanFail: function () { scanning = false; mode = "fail"; focusT = 1; zoomKT = 0; zoomUI(); X.onFail(); },   /* quét lỗi → camera nhìn vào màn hình POS (điện thoại: phóng vào bàn phím) */
      scanClear: function () { scanning = false; if (mode === "fail") mode = "idle"; X.onClear(); },
      result: function (good) { mode = good ? "good" : "bad"; modeUntil = time + 0.9; if (!good) shake = 0.12; X.onResult(good); TR.flash(good); },
            bag: function () {
        var e = curEnt; focusT = 0; zoomKT = 0; zoomUI();

        e.bagging = true; e.held = false;
if (drag && drag.e === e) { try { cvEl.releasePointerCapture(drag.id); } catch (_) {} drag = null; X.setDrag(false); cvEl.style.cursor = ""; }
        X.onBag();
        var jx = (Math.random() - 0.5) * 0.3, jz = (Math.random() - 0.5) * 0.24, k = bagEnts.length;
        var over = new V3(BAG.x + jx, 1.8, BAG.z + jz);                  /* cao hơn miệng túi để không xuyên thành túi */
        var slot = new V3(BAG.x + jx, 0.34 + Math.min(k, 3) * 0.3, BAG.z + jz);
        arc(e, e.mesh.position.clone(), over, 0.3, 560, Math.PI * 0.4, function () {
          tween(240, function (t) { e.mesh.position.lerpVectors(over, slot, easeOut(t)); }, function () {
            bagN++; drawBag(bagN); bagSquash = 1;
            bagEnts.push(e);
            if (bagEnts.length > 6) { bagEnts.shift().mesh.visible = false; }
          });
        }, e.rotTo ? { x: 0, y: (Math.random() - 0.5) * 0.7, z: 0 } : null);   /* hàng đóng gói dựng thẳng lại khi vào túi */
        return 820;
      },
      destroy: function () {
        alive = false; cancelAnimationFrame(raf);

        vxObs.disconnect(); X.dispose(); TR.dispose(); clearInterval(vxTimer);
                if (ro) ro.disconnect(); else window.removeEventListener("resize", resize);
        cv.removeEventListener("pointermove", onMove); cv.removeEventListener("pointerleave", onLeave);
        disposeManual();

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