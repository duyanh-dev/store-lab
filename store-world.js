/* =====================================================================
   store-world.js v4 – "Khu phố cửa hàng" (nạp SAU store-link.js)
   - Mỗi cửa hàng có một Ô ĐẤT (gx, gz). Cửa hàng đang mở luôn ở gốc tọa độ; các cửa hàng khác hiện
     ở ô đất của chúng dưới dạng NGOẠI THẤT chi tiết nhưng vẫn nhẹ (mỗi khối được gộp mesh theo vật liệu).
   - Thêm cửa hàng mới → tự chọn ô trống GẦN cửa hàng đang mở nhất (ưu tiên bên phải, rồi bên trái, rồi hàng khác).
   - ĐƯỜNG: mỗi hàng cửa hàng có một đường lớn phía trước (vỉa hè, vạch kẻ, vạch qua đường, đèn đường,
     xe chạy 2 chiều), tất cả nối vào 2 đại lộ ở hai đầu khu phố → liền mạch thành mạng đường.
   - CHUYỂN CỬA HÀNG: camera bay tới mặt tiền → màn kính mờ + tên cửa hàng → nạp → camera lượn từ thấp lên
     toàn cảnh, các khối xung quanh trồi lên lần lượt như sóng lan. Cửa hàng mới thêm cũng "mọc" lên.
   - Không sửa logic core: chỉ thêm vào scene, bọc clampTarget / StoreLink.view / ren.render.
   - Ô đất lưu riêng trong localStorage "store-world-v1".

   v3: bảng hiệu MAXIDI, xe chi tiết, cầu kính + toa con thoi + drone nối cửa hàng, cột sáng khi chọn cửa hàng.
   v4 (chỉ thêm hiệu ứng, logic ô đất / đồng bộ / camera / chuyển cửa hàng giữ nguyên):
   - CHU KỲ NGÀY ĐÊM: bình minh → trưa → hoàng hôn → đêm (120 s/vòng). Ánh sáng, màu trời, sương mù đổi theo;
     ban đêm đèn đường tỏa vệt sáng xuống mặt đường, bảng hiệu MAXIDI / đèn pha / đèn hậu / cầu kính sáng hơn,
     có sao và trăng. Nút "Ngày đêm" trong thanh công cụ: Tự động → Ban ngày → Ban đêm.
     Đang ở chế độ Chỉnh sửa thì tự về ban ngày để dễ thao tác.
   - ĐÈN GIAO THÔNG: mỗi ngã tư (đường × đại lộ) có đèn xanh/vàng/đỏ thật; xe dừng vạch khi đèn đỏ,
     xếp hàng chờ, phanh mượt, đại lộ cũng có xe chạy khi đường ngang dừng.
   - XE TẢI MAXIDI GIAO HÀNG THẬT: xe chạy đường trước từng hàng cửa hàng, dừng đúng trước cửa, bật đèn cảnh báo,
     mở cửa thùng, nhân viên giao hàng bê kiện đi vào cửa hàng, giao xong quay lại, xe đi tiếp sang cửa hàng kế bên.
   v5 (sửa lỗi + chỉnh giao diện):
   - Ban đêm KHÔNG còn động tới đèn của cảnh và không dùng chung vật liệu với core → nội thất cửa hàng luôn sáng.
     Đêm chỉ đổi màu trời, sương mù và màu vật liệu riêng của khu phố (đường, nhà, xe...).
   - iPhone / Safari: tự nới far-plane + sương mù khi zoom ra xem khu phố (trước đây cửa hàng bị cắt/phủ mờ hết),
     bật chế độ nhẹ (ít xe, ít drone, texture nhỏ, không sao), mỗi khâu dựng / vẽ có try-catch riêng để 1 lỗi không làm trắng cảnh.
   - Thanh công cụ trên điện thoại: chỉ khi thật sự bị tràn mới tự xuống dòng để hiện đủ mọi nút (UI chuẩn giữ nguyên khi vừa).
   ===================================================================== */
(() => {
  "use strict";
  if (!window.ShopCore || !window.StoreLink || typeof scene === "undefined" || typeof tag !== "function")
    return console.error("store-world: thiếu ShopCore / StoreLink / cảnh 3D – hãy nạp sau store-link.js.");
  const SC = window.ShopCore,
    STATUS = (window.ShopList && window.ShopList.STATUS) || {},
    GX = 24 /* khoảng cách ô theo x (m) */,
    GZ = 56 /* khoảng cách ô theo z (m): 41 m sân + 15 m đường */,
    FRONT = 15 /* mặt tiền mọi cửa hàng thẳng hàng tại z = 15 */,
    ROAD = 26.5 /* tim đường phía trước, tính từ gốc của hàng */,
    KEY = "store-world-v1",
    MAXB = 40,
    MAXDRONE = 10 /* số drone tối đa (giữ nhẹ) */,
    CYCLE = 120 /* giây cho một ngày đêm */,
    SIG_T = 28 /* chu kỳ đèn giao thông (s) */,
    clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    smooth = (a, b, v) => {
      const t = clamp((v - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    },
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    easeIO = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    easeBack = (p) => {
      const c1 = 1.70158,
        c3 = c1 + 1;
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    },
    CAN_MERGE = typeof mergeGroup === "function",
    LITE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform)) || window.matchMedia("(max-width:720px)").matches;

  /* ============ 1. Ô ĐẤT ============ */
  let plots = {};
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    if (o && typeof o === "object" && !Array.isArray(o))
      for (const k in o) if (Array.isArray(o[k]) && o[k].length === 2 && o[k].every(Number.isInteger)) plots[k] = o[k];
  } catch (e) {}
  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(plots));
    } catch (e) {}
  };
  /* ô [0,0] được giữ cho "mô hình chưa gắn cửa hàng"; các ô còn lại xếp theo khoảng cách thật tới cửa hàng hiện tại */
  const OFFS = [];
  for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) if (dx || dz) OFFS.push([dx, dz, dx * dx + 5.4 * dz * dz]);
  OFFS.sort((a, b) => a[2] - b[2] || b[0] - a[0] || Math.abs(a[1]) - Math.abs(b[1]) || a[1] - b[1]); /* hòa → ưu tiên bên phải */
  function nextPlot(ref) {
    const taken = new Set(Object.values(plots).map((p) => p[0] + "," + p[1]));
    taken.add("0,0");
    for (const o of OFFS) {
      const x = ref[0] + o[0],
        z = ref[1] + o[1];
      if (!taken.has(x + "," + z)) return [x, z];
    }
    return [ref[0] + 9, ref[1]];
  }
  const dirText = (o) => {
    const p = [];
    if (o[1] < 0) p.push("phía sau");
    if (o[1] > 0) p.push("phía trước");
    if (o[0] > 0) p.push("bên phải");
    if (o[0] < 0) p.push("bên trái");
    return p.join(" ");
  };

  /* ============ 2. VẬT LIỆU + HÌNH KHỐI DÙNG CHUNG ============ */
  const BOX = new THREE.BoxGeometry(1, 1, 1),
    CYL = new THREE.CylinderGeometry(1, 1, 1, 10),
    SPH = new THREE.SphereGeometry(1, 10, 8),
    PLN = new THREE.PlaneGeometry(1, 1),
    CIR = new THREE.CircleGeometry(1, 28),
    WHL = new THREE.CylinderGeometry(1, 1, 1, 18); /* bánh xe: trục dọc theo z (xoay sẵn vào hình học, khỏi cần rotation khi gộp mesh) */
  WHL.rotateX(Math.PI / 2);
  CIR.rotateX(-Math.PI / 2);
  /* vật liệu RIÊNG của khu phố: nhân bản từ M() để không chung với vật liệu nội thất (core) → đổi màu ban đêm không động tới cửa hàng */
  const dnMats = [],
    tintNow = new THREE.Color(1, 1, 1),
    MM = (c, r, m) => {
      const x = M(c, r, m).clone();
      if (x.color) {
        dnMats.push([x, x.color.clone()]);
        x.color.multiply(tintNow);
      }
      return x;
    };
  const wallM = MM(0xfafafc, 0.7),
    plinthM = MM(0xc9ced6, 0.8),
    corniceM = MM(0xe9eaee, 0.6),
    storeM = MM(0xe3e5ea, 0.7),
    padM = MM(0xc9ced6, 1),
    walkM = MM(0xdfe1e6, 0.9),
    parkM = MM(0xf5f5f7, 0.8),
    darkM = MM(0x2b2d33, 0.5),
    acM = MM(0x9aa0ab, 0.5, 0.3),
    dockM = MM(0x8a8d94, 0.5, 0.3),
    trunkM = MM(0x8a6d4f, 0.9),
    leafM = MM(0x6fae6b, 0.9),
    magM = MM(0xa81f7f, 0.6),
    asphM = MM(0x4a4d55, 0.95),
    sideM = MM(0xd9dbe0, 0.9),
    lineM = MM(0xf2f2f4, 0.7),
    tyreM = MM(0x141518, 0.95),
    rimM = MM(0xc4c8d2, 0.3, 0.7),
    plateM = MM(0xf7f7f9, 0.6),
    skinM = MM(0xe8bb98, 0.8),
    pantsM = MM(0x2f3b5a, 0.8),
    parcelM = MM(0xc9a063, 0.8),
    ROOF = { active: MM(0xb4bac6, 0.6), opening: MM(0xd3d6dc, 0.6), closed: MM(0x8e929b, 0.6) },
    GLOW = typeof glowMat === "function" ? glowMat(0xffffff, 0xfff1c4, 1.1).clone() : MM(0xfff1c4, 0.5),
    TAIL = typeof glowMat === "function" ? glowMat(0xff2a2a, 0xff2a2a, 1.3).clone() : MM(0xc62828, 0.5),
    /* vệt sáng đèn pha trên mặt đường */
    BEAM = new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0.14, depthWrite: false }),
    /* đèn cảnh báo + ánh sáng cửa thùng xe tải giao hàng */
    HAZ = new THREE.MeshBasicMaterial({ color: 0xffa21a }),
    DOORM = new THREE.MeshBasicMaterial({ color: 0xfff1c4 }),
    /* vệt sáng đèn đường trên mặt đất (chỉ hiện ban đêm) */
    POOLM = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
    CARC = [0xf5f5f7, 0xc9ced6, 0x3a3a40, 0x8a8d94, 0xe8e4dc, 0x2b4a7a, 0xb23a3a, 0x2e6b4f],
    CLEN = { sedan: 4.4, taxi: 4.4, suv: 4.7, bus: 9.6, truck: 7.0, dtruck: 7.0 };
  /* đèn giao thông: [tắt, sáng] cho đỏ / vàng / xanh */
  const SIGM = {
    r: [new THREE.MeshBasicMaterial({ color: 0x3a1212 }), new THREE.MeshBasicMaterial({ color: 0xff3535 })],
    y: [new THREE.MeshBasicMaterial({ color: 0x3a300c }), new THREE.MeshBasicMaterial({ color: 0xffc61a })],
    g: [new THREE.MeshBasicMaterial({ color: 0x0f2e1b }), new THREE.MeshBasicMaterial({ color: 0x35e07c })],
  };
  const put = (g, geo, mat, sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(sx, sy, sz);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    },
    box = (g, w, h, d, mat, x, y, z) => put(g, BOX, mat, w, h, d, x, y + h / 2, z),
    cyl = (g, r, h, mat, x, y, z) => put(g, CYL, mat, r, h, r, x, y + h / 2, z),
    ball = (g, r, mat, x, y, z, sy = 1) => put(g, SPH, mat, r, r * sy, r, x, y, z);
  const flat = (g) =>
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = false;
    });
  const root = new THREE.Group(),
    roadRoot = new THREE.Group(),
    carRoot = new THREE.Group(),
    linkRoot = new THREE.Group(),
    sigRoot = new THREE.Group(),
    poolRoot = new THREE.Group();
  scene.add(root, roadRoot, carRoot, linkRoot, sigRoot, poolRoot);
  const free = (g) => {
    if (CAN_MERGE && typeof disposeGroup === "function") disposeGroup(g); /* chỉ còn geometry gộp riêng của nhóm */
  };
  /* gỡ sprite (tag) khỏi cảnh và giải phóng texture */
  const dropSprite = (sp) => {
    if (!sp) return;
    scene.remove(sp);
    if (sp.material) {
      if (sp.material.map) sp.material.map.dispose();
      sp.material.dispose();
    }
  };

  /* bảng hiệu: nền tím MAXIDI, "MAXIDI" chữ lớn ở dưới, tên cửa hàng chữ nhỏ ở trên.
     sw = bề ngang bảng (m), bảng cao 1 m → canvas giữ đúng tỉ lệ để chữ không bị méo */
  const SIGN_H = 1.0;
  function signTex(name, sw) {
    const W = LITE ? 512 : 1024,
      H = Math.round((W * SIGN_H) / sw),
      c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d"),
      grd = x.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#b8238a");
    grd.addColorStop(1, "#8f1768");
    x.fillStyle = grd;
    x.fillRect(0, 0, W, H);
    x.strokeStyle = "rgba(255,255,255,.9)";
    x.lineWidth = 5;
    x.strokeRect(9, 9, W - 18, H - 18);
    x.textAlign = "center";
    x.textBaseline = "middle";
    /* tên cửa hàng (nhỏ, phía trên) */
    x.fillStyle = "rgba(255,255,255,.88)";
    let f = Math.round(H * 0.2);
    do x.font = "700 " + f + "px -apple-system,Segoe UI,Arial,sans-serif";
    while (x.measureText(name).width > W * 0.84 && --f > 14);
    x.fillText(name, W / 2, H * 0.27);
    /* vạch ngăn mảnh */
    x.fillStyle = "rgba(255,255,255,.5)";
    x.fillRect(W * 0.3, H * 0.4, W * 0.4, 2);
    /* MAXIDI (lớn, phía dưới) */
    x.fillStyle = "#fff";
    f = Math.round(H * 0.5);
    try {
      x.letterSpacing = Math.round(H * 0.04) + "px";
    } catch (e) {}
    do x.font = "900 " + f + "px -apple-system,Segoe UI,Arial,sans-serif";
    while (x.measureText("MAXIDI").width > W * 0.8 && --f > 20);
    x.fillText("MAXIDI", W / 2, H * 0.69);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = LITE ? 1 : 4;
    return t;
  }

  /* ============ 3. KHỐI NGOẠI THẤT CHI TIẾT (gộp mesh theo vật liệu → vài draw call / khối) ============ */
  function makeBlock(s, dx, dz) {
    const sn = s.snapshot && s.snapshot.store,
      w = clamp(sn && isFinite(sn.width) ? sn.width : 14, 8, 22),
      d = clamp(sn && isFinite(sn.depth) ? sn.depth : 30, 14, 30),
      fz = FRONT - d / 2 /* tâm thân nhà theo z */,
      fr = FRONT /* mặt tiền */,
      zf = fr + 0.12 /* mặt phẳng tường trước */,
      roof = ROOF[s.status] || ROOF.active,
      sw = Math.min(7.2, w * 0.8) /* bề ngang bảng hiệu */,
      g = new THREE.Group();
    /* nền sân, lối vào, vạch đỗ xe */
    box(g, w + 7, 0.12, d + 11, padM, 0, -0.2, fz - 1.5);
    box(g, 3.4, 0.03, 3.6, walkM, 0, -0.085, fr + 2.0);
    for (let k = 1; k <= 4; k++)
      [-1, 1].forEach((sg) => {
        const x = sg * (2.6 + k * 2.4);
        if (Math.abs(x) < w / 2 + 1.6) box(g, 0.12, 0.03, 3.2, parkM, x, -0.085, fr + 2.2);
      });
    /* thân: chân tường + tường + gờ mái + mái */
    box(g, w + 0.5, 0.35, d + 0.5, plinthM, 0, 0, fz);
    box(g, w + 0.24, 2.65, d + 0.24, wallM, 0, 0.35, fz);
    box(g, w + 0.5, 0.2, d + 0.5, corniceM, 0, 2.8, fz);
    box(g, w + 0.36, 0.1, d + 0.36, roof, 0, 3.0, fz);
    /* thiết bị trên mái */
    box(g, 1.5, 0.8, 1.1, acM, -w * 0.25, 3.1, fz - 4);
    box(g, 1.5, 0.8, 1.1, acM, w * 0.2, 3.1, fz - 9);
    box(g, 0.9, 0.5, 0.9, dockM, w * 0.05, 3.1, fz - 1.5);
    /* phòng kho + cửa cuốn phía sau */
    box(g, w + 1, 2.9, 5, storeM, 0, 0, fz - d / 2 - 2.5);
    box(g, w + 1.2, 0.1, 5.2, roof, 0, 2.9, fz - d / 2 - 2.5);
    box(g, 3.2, 2.4, 0.1, dockM, 0, 0.05, fz - d / 2 - 5.05);
    box(g, 0.5, 0.12, 0.15, GLOW, 0, 2.6, fz - d / 2 - 5.1);
    /* kính mặt tiền chia ô (2 bên cửa) */
    const half = w / 2 - 0.6,
      gx = (half + 1.5) / 2,
      gw = half - 1.5;
    [-1, 1].forEach((sg) => {
      box(g, gw, 1.55, 0.06, GLASS, sg * gx, 0.75, zf + 0.03);
      box(g, gw + 0.14, 0.07, 0.1, darkM, sg * gx, 0.7, zf + 0.04);
      box(g, gw + 0.14, 0.07, 0.1, darkM, sg * gx, 2.3, zf + 0.04);
      for (let i = 0; i <= 3; i++) box(g, 0.07, 1.7, 0.1, darkM, sg * gx - gw / 2 + (gw * i) / 3, 0.7, zf + 0.04);
    });
    /* cửa đôi kính + tay nắm + mái hiên + đèn */
    box(g, 2.8, 2.35, 0.1, darkM, 0, 0.35, zf + 0.04);
    box(g, 2.4, 2.2, 0.05, GLASS, 0, 0.4, zf + 0.09);
    box(g, 0.06, 2.2, 0.07, darkM, 0, 0.4, zf + 0.1);
    box(g, 0.05, 0.5, 0.06, acM, -0.25, 1.2, zf + 0.12);
    box(g, 0.05, 0.5, 0.06, acM, 0.25, 1.2, zf + 0.12);
    box(g, 4.6, 0.16, 1.5, magM, 0, 2.55, zf + 0.75);
    box(g, 3.6, 0.03, 0.8, GLOW, 0, 2.52, zf + 0.75);
    [-1, 1].forEach((sg) => box(g, 0.12, 0.3, 0.1, GLOW, sg * (w / 2 - 0.25), 2.0, zf + 0.06));
    /* biển hiệu trên mái: gờ + tấm chữ MAXIDI (tên cửa hàng nhỏ phía trên, phát sáng nhẹ) */
    box(g, sw + 0.5, 1.3, 0.3, corniceM, 0, 3.1, fr);
    box(g, sw, 0.04, 0.1, GLOW, 0, 3.16, fr + 0.2);
    const tex = signTex(s.name, sw),
      sm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3 });
    put(g, PLN, sm, sw, SIGN_H, 1, 0, 3.78, fr + 0.16);
    /* cây hai bên lối vào */
    [-1, 1].forEach((sg) => {
      const x = sg * (w / 2 + 1.3),
        z = fr + 3.0;
      cyl(g, 0.12, 1.3, trunkM, x, -0.08, z);
      ball(g, 0.75, leafM, x, 1.75, z);
      ball(g, 0.5, leafM, x + 0.3, 2.2, z + 0.1);
    });
    if (CAN_MERGE) mergeGroup(g); /* gộp trong hệ tọa độ cục bộ rồi mới đặt vị trí */
    flat(g);
    g.userData = { shopId: s.id, tex, sm, w, d };
    g.position.set(dx * GX, 0, dz * GZ);
    g.userData.cx = g.position.x;
    g.userData.cz = g.position.z + fz;
    g.userData.sprite = tag(s.name, g.position.x, 5.3, g.position.z + fz, 4.2);
    return g;
  }
  function killBlock(g) {
    root.remove(g);
    free(g);
    const u = g.userData;
    if (u.tex) u.tex.dispose();
    if (u.sm) u.sm.dispose();
    dropSprite(u.sprite);
  }

  /* ============ 4. ĐƯỜNG LỚN + ĐẠI LỘ + ĐÈN + XE ============ */
  let roadKey = "",
    streetsZ = [],
    carList = [],
    sigs = [],
    rowStops = new Map() /* dz → các x của cửa hàng trong hàng đó (đích giao hàng) */,
    RX = [0, 0];

  /* trạng thái đèn: 0 xanh · 1 vàng · 2 đỏ. Đường ngang xanh trước, rồi toàn đỏ 1 s, rồi đại lộ xanh */
  const lightSt = (type, si, ai, ts) => {
    const t = (ts + ((si * 7 + ai * 11) % SIG_T)) % SIG_T;
    if (type === 0) return t < 11 ? 0 : t < 13 ? 1 : 2;
    return t < 14 ? 2 : t < 25 ? 0 : t < 27 ? 1 : 2;
  };
  /* một cột đèn giao thông: cột + tay đòn + hộp đèn (tĩnh, gộp cùng đường) + 3 bóng đèn (đổi màu mỗi khung hình) */
  function addSignal(g, axis, dir, stopS, lane, curb, type, si, ai) {
    const p = stopS - dir * 0.4,
      lamps = [];
    if (axis === 0) {
      cyl(g, 0.07, 4.85, darkM, p, 0, curb);
      box(g, 0.1, 0.1, Math.abs(lane - curb), darkM, p, 4.75, (lane + curb) / 2);
      box(g, 0.32, 1.0, 0.5, darkM, p, 3.7, lane);
      [4.45, 4.2, 3.95].forEach((y) => lamps.push(put(sigRoot, SPH, SIGM.r[0], 0.09, 0.09, 0.09, p - dir * 0.17, y, lane)));
    } else {
      cyl(g, 0.07, 4.85, darkM, curb, 0, p);
      box(g, Math.abs(lane - curb), 0.1, 0.1, darkM, (lane + curb) / 2, 4.75, p);
      box(g, 0.5, 1.0, 0.32, darkM, lane, 3.7, p);
      [4.45, 4.2, 3.95].forEach((y) => lamps.push(put(sigRoot, SPH, SIGM.r[0], 0.09, 0.09, 0.09, lane, y, p - dir * 0.17)));
    }
    lamps[1].material = SIGM.y[0];
    lamps[2].material = SIGM.g[0];
    sigs.push({ lamps, type, si, ai, st: -1 });
  }

  function buildRoads(minDx, maxDx, minDz, maxDz) {
    const key = [minDx, maxDx, minDz, maxDz].join();
    if (key === roadKey) return;
    roadKey = key;
    while (roadRoot.children.length) {
      const o = roadRoot.children[0];
      roadRoot.remove(o);
      free(o);
    }
    while (sigRoot.children.length) sigRoot.remove(sigRoot.children[0]);
    while (poolRoot.children.length) poolRoot.remove(poolRoot.children[0]);
    sigs = [];
    carList.forEach((c) => {
      carRoot.remove(c.g);
      free(c.g);
      if (c.cour) carRoot.remove(c.cour.g);
    });
    carList = [];
    const g = new THREE.Group(),
      xL = minDx * GX - 30,
      xR = maxDx * GX + 30,
      x0 = xL - 45,
      x1 = xR + 45,
      zA = minDz * GZ + ROAD - 52,
      zB = maxDz * GZ + ROAD + 52,
      lampPts = [];
    streetsZ = [];
    for (let k = minDz; k <= maxDz; k++) streetsZ.push(k * GZ + ROAD);
    RX = [x0, x1];
    /* hai đại lộ dọc – mặt đường cao hơn đường ngang 2 cm để không chồng hình */
    [xL, xR].forEach((ax) => {
      box(g, 12, 0.15, zB - zA, asphM, ax, -0.2, (zA + zB) / 2);
      for (let z = zA + 3; z < zB - 3; z += 8) {
        if (streetsZ.some((s) => Math.abs(z - s) < 8)) continue;
        box(g, 0.25, 0.02, 3.2, lineM, ax, -0.05, z);
      }
    });
    streetsZ.forEach((zs) => {
      box(g, x1 - x0, 0.13, 9, asphM, (x0 + x1) / 2, -0.2, zs);
      for (let x = x0 + 3; x < x1 - 3; x += 8) {
        if (Math.abs(x - xL) < 9 || Math.abs(x - xR) < 9) continue;
        box(g, 3.2, 0.02, 0.25, lineM, x, -0.07, zs);
      }
      /* vỉa hè hai bên (giữa 2 đại lộ), vạch qua đường sát đại lộ */
      const sx0 = xL + 6,
        sx1 = xR - 6;
      [-1, 1].forEach((sg) => box(g, sx1 - sx0, 0.15, 2.1, sideM, (sx0 + sx1) / 2, -0.2, zs + sg * 5.55));
      [xL + 8.2, xR - 8.2].forEach((cx) => {
        for (let j = -3; j <= 3; j++) box(g, 2.4, 0.02, 0.5, lineM, cx, -0.07, zs + j * 1.1);
      });
      /* đèn đường dọc vỉa hè phía cửa hàng */
      for (let x = sx0 + 6; x < sx1 - 3; x += 20) {
        const pz = zs - 5.55;
        cyl(g, 0.08, 5, darkM, x, -0.05, pz);
        box(g, 0.08, 0.08, 1.3, darkM, x, 4.95, pz + 0.65);
        box(g, 0.25, 0.08, 0.5, GLOW, x, 4.9, pz + 1.2);
        lampPts.push([x, pz + 1.2]);
      }
    });
    /* vạch dừng + đèn giao thông ở mọi ngã tư (đường × đại lộ) */
    const stopsOf = (axis, dir, ai) => {
      const out = [];
      if (axis === 0) out.push({ s: dir > 0 ? (ai ? xR - 10.4 : xL - 7.2) : ai ? xR + 7.2 : xL + 10.4, type: 0, ai });
      return out;
    };
    streetsZ.forEach((zs, si) => {
      [xL, xR].forEach((ax, ai) => {
        addSignal(g, 0, 1, stopsOf(0, 1, ai)[0].s, zs - 2.25, zs - 4.9, 0, si, ai);
        addSignal(g, 0, -1, stopsOf(0, -1, ai)[0].s, zs + 2.25, zs + 4.9, 0, si, ai);
        addSignal(g, 1, 1, zs - 6.3, ax + 2.25, ax + 5.4, 1, si, ai);
        addSignal(g, 1, -1, zs + 6.3, ax - 2.25, ax - 5.4, 1, si, ai);
      });
    });
    /* vệt sáng dưới chân đèn đường (chỉ hiện ban đêm) */
    lampPts.forEach(([x, z]) => {
      const m = new THREE.Mesh(CIR, POOLM);
      m.scale.set(6.5, 1, 6.5);
      m.position.set(x, 0.012, z);
      poolRoot.add(m);
    });
    if (CAN_MERGE) mergeGroup(g);
    flat(g);
    roadRoot.add(g);

    /* xe chạy 2 chiều trên mỗi đường (và 2 làn trên mỗi đại lộ). Mỗi xe có tốc độ thật, tự phanh theo đèn và xe phía trước */
    const KINDS = ["sedan", "suv", "taxi", "sedan", "bus", "truck", "suv", "sedan", "taxi", "truck"],
      spawn = (kind, color, ax, dir, sp, lane, stops, lo, hi, pos, fixed, dz, deliver) => {
        const cg = makeCar(color, kind);
        if (ax === 0) cg.position.set(pos, 0, fixed);
        else cg.position.set(fixed, 0, pos);
        cg.rotation.y = ax === 0 ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? -Math.PI / 2 : Math.PI / 2;
        carRoot.add(cg);
        const c = { g: cg, ax, dir, sp, v: sp, len: CLEN[kind] || 4.4, lane, stops, lo, hi, p: pos, dz, deliver, st: null, served: null, kind };
        lane.push(c);
        carList.push(c);
      };
    streetsZ.forEach((zs, si) => {
      [
        [zs - 2.25, 1],
        [zs + 2.25, -1],
      ].forEach(([lz, dir], li) => {
        const n = Math.max(2, Math.round((x1 - x0) / (LITE ? 74 : 46))),
          sp = 5 + ((si * 2 + li) % 3) * 1.4,
          lane = [],
          stops = [0, 1].map((ai) => ({ s: stopsOf(0, dir, ai)[0].s, type: 0, si, ai }));
        for (let i = 0; i < n; i++) {
          const deliver = li === 0 && i === 0,
            kind = deliver ? "dtruck" : KINDS[(si * 3 + li * 4 + i * 3) % KINDS.length];
          spawn(kind, CARC[(si + li + i) % CARC.length], 0, dir, sp, lane, stops, x0, x1, x0 + ((x1 - x0) * (i + 0.35 * ((i * 7 + li) % 3))) / n, lz, minDz + si, deliver);
        }
      });
    });
    [xL, xR].forEach((ax, ai) =>
      [
        [ax + 2.25, 1],
        [ax - 2.25, -1],
      ].forEach(([lx, dir], li) => {
        const n = Math.max(2, Math.round((zB - zA) / (LITE ? 74 : 46))),
          sp = 5.5 + ((ai * 2 + li) % 3) * 1.2,
          lane = [],
          stops = streetsZ.map((zs, si) => ({ s: dir > 0 ? zs - 6.3 : zs + 6.3, type: 1, si, ai }));
        for (let i = 0; i < n; i++)
          spawn(KINDS[(ai * 5 + li * 3 + i * 7 + 2) % KINDS.length] === "truck" ? "suv" : KINDS[(ai * 5 + li * 3 + i * 7 + 2) % KINDS.length], CARC[(ai + li + i + 3) % CARC.length], 1, dir, sp, lane, stops, zA, zB, zA + ((zB - zA) * (i + 0.35 * ((i * 5 + li) % 3))) / n, lx, 0, false);
      }),
    );
  }

  /* ---- XE: mũi xe hướng +x. Chi tiết bằng khối xếp tầng (không dùng rotation để mergeGroup gộp an toàn) ---- */
  const bodyMats = new Map(),
    bodyMat = (c) => {
      let m = bodyMats.get(c);
      if (!m) bodyMats.set(c, (m = MM(c, 0.35, 0.35)));
      return m;
    };
  /* bánh xe: lốp + mâm + trục */
  function wheel(g, x, z, r, tw) {
    const o = z > 0 ? 0.012 : -0.012;
    put(g, WHL, tyreM, r, r, tw, x, r, z);
    put(g, WHL, rimM, r * 0.62, r * 0.62, tw + 0.025, x, r, z + o);
    put(g, WHL, darkM, r * 0.24, r * 0.24, tw + 0.05, x, r, z + o * 2);
    box(g, r * 0.12, r * 1.1, tw + 0.04, darkM, x, r * 0.45, z + o * 1.5); /* chấu mâm */
  }
  /* đèn pha + đèn hậu + vệt sáng đèn pha */
  function lamps(g, xf, xr, y, zs, beam) {
    [-1, 1].forEach((sg) => {
      box(g, 0.08, 0.15, 0.38, GLOW, xf, y, sg * zs);
      box(g, 0.08, 0.13, 0.38, TAIL, xr, y - 0.02, sg * zs);
      if (beam) box(g, beam, 0.012, 0.75, BEAM, xf + beam / 2, 0.025, sg * zs);
    });
  }
  function sedan(g, cm, taxi) {
    box(g, 4.1, 0.22, 1.6, darkM, 0, 0.2, 0); /* gầm */
    box(g, 4.2, 0.4, 1.74, cm, 0, 0.32, 0); /* thân dưới */
    box(g, 1.25, 0.1, 1.66, cm, 1.4, 0.72, 0); /* nắp capo */
    box(g, 0.9, 0.14, 1.66, cm, -1.6, 0.72, 0); /* cốp */
    box(g, 2.3, 0.44, 1.6, GLASS, -0.2, 0.72, 0); /* khoang kính */
    box(g, 0.45, 0.28, 1.5, GLASS, 0.98, 0.72, 0); /* kính chắn gió vát */
    box(g, 0.45, 0.28, 1.5, GLASS, -1.38, 0.72, 0); /* kính sau vát */
    box(g, 1.9, 0.08, 1.56, cm, -0.2, 1.16, 0); /* mui */
    [0.96, -0.2, -1.36].forEach((x) => box(g, 0.09, 0.44, 1.63, darkM, x, 0.72, 0)); /* cột A, B, C */
    box(g, 0.2, 0.2, 1.76, darkM, 2.12, 0.22, 0); /* cản trước */
    box(g, 0.2, 0.2, 1.76, darkM, -2.12, 0.22, 0); /* cản sau */
    box(g, 0.05, 0.12, 0.9, darkM, 2.12, 0.46, 0); /* lưới tản nhiệt */
    box(g, 0.03, 0.13, 0.42, plateM, -2.23, 0.3, 0); /* biển số */
    [-1, 1].forEach((sg) => {
      box(g, 0.2, 0.1, 0.14, cm, 0.82, 0.92, sg * 0.93); /* gương */
      box(g, 0.1, 0.04, 0.16, darkM, 0.12, 0.62, sg * 0.88); /* tay nắm */
      box(g, 0.1, 0.04, 0.16, darkM, -0.9, 0.62, sg * 0.88);
      [1.3, -1.3].forEach((x) => wheel(g, x, sg * 0.86, 0.36, 0.26));
    });
    lamps(g, 2.12, -2.12, 0.5, 0.6, 3.6);
    if (taxi) {
      box(g, 4.22, 0.05, 1.76, darkM, 0, 0.5, 0); /* sọc kẻ ca-rô */
      box(g, 0.7, 0.2, 0.36, GLOW, -0.2, 1.24, 0); /* đèn TAXI trên mui */
      box(g, 0.74, 0.04, 0.4, darkM, -0.2, 1.22, 0);
    } else box(g, 0.1, 0.03, 1.4, darkM, 0.2, 0.78, 0); /* gân nắp capo */
  }
  function suv(g, cm) {
    box(g, 4.4, 0.26, 1.7, darkM, 0, 0.22, 0);
    box(g, 4.5, 0.5, 1.84, cm, 0, 0.36, 0);
    box(g, 1.3, 0.12, 1.76, cm, 1.5, 0.86, 0);
    box(g, 2.9, 0.62, 1.7, GLASS, -0.55, 0.86, 0);
    box(g, 0.4, 0.4, 1.6, GLASS, 1.0, 0.86, 0);
    box(g, 3.0, 0.1, 1.72, cm, -0.6, 1.48, 0);
    [1.0, -0.4, -1.9].forEach((x) => box(g, 0.1, 0.62, 1.73, darkM, x, 0.86, 0));
    [-1, 1].forEach((sg) => {
      box(g, 2.6, 0.05, 0.08, darkM, -0.6, 1.58, sg * 0.62); /* thanh giá nóc */
      box(g, 0.22, 0.12, 0.15, cm, 0.98, 1.0, sg * 1.0);
      [1.4, -1.4].forEach((x) => wheel(g, x, sg * 0.93, 0.41, 0.28));
    });
    box(g, 0.22, 0.24, 1.9, darkM, 2.25, 0.24, 0);
    box(g, 0.22, 0.24, 1.9, darkM, -2.25, 0.24, 0);
    box(g, 0.05, 0.14, 1.0, darkM, 2.26, 0.58, 0);
    box(g, 0.03, 0.13, 0.42, plateM, -2.37, 0.34, 0);
    box(g, 0.28, 0.5, 0.1, darkM, -2.34, 0.4, 0); /* bánh dự phòng */
    lamps(g, 2.25, -2.25, 0.62, 0.68, 3.8);
  }
  function bus(g, cm) {
    box(g, 9.2, 0.28, 2.2, darkM, 0, 0.3, 0);
    box(g, 9.3, 2.4, 2.4, cm, 0, 0.55, 0);
    box(g, 9.34, 0.26, 2.44, magM, 0, 0.85, 0); /* sọc thương hiệu */
    box(g, 8.7, 0.95, 2.43, GLASS, -0.1, 1.55, 0); /* dải cửa sổ */
    for (let i = -4; i <= 4; i++) box(g, 0.09, 0.97, 2.45, darkM, i * 1.06 - 0.1, 1.55, 0);
    box(g, 0.06, 1.35, 2.22, GLASS, 4.66, 1.3, 0); /* kính chắn gió */
    box(g, 0.06, 0.38, 1.7, GLOW, 4.66, 2.45, 0); /* bảng điểm đến */
    box(g, 1.1, 2.0, 0.06, GLASS, 3.2, 0.7, 1.22); /* cửa lên xuống */
    box(g, 1.1, 2.0, 0.06, GLASS, 3.2, 0.7, -1.22);
    box(g, 9.0, 0.12, 2.2, corniceM, 0, 2.95, 0);
    box(g, 2.2, 0.28, 1.3, acM, -1.4, 3.07, 0);
    box(g, 1.2, 0.2, 1.1, acM, 1.6, 3.07, 0);
    box(g, 0.2, 0.26, 2.4, darkM, 4.68, 0.3, 0);
    box(g, 0.2, 0.26, 2.4, darkM, -4.68, 0.3, 0);
    box(g, 0.03, 0.15, 0.5, plateM, -4.8, 0.4, 0);
    [-1, 1].forEach((sg) => {
      [3.0, -3.0].forEach((x) => wheel(g, x, sg * 1.06, 0.5, 0.32));
      box(g, 0.2, 0.1, 0.15, darkM, 4.5, 1.9, sg * 1.28); /* gương hậu */
    });
    lamps(g, 4.66, -4.66, 0.7, 0.85, 4.2);
  }
  function truck(g, cm) {
    box(g, 6.6, 0.26, 1.9, darkM, 0, 0.3, 0); /* khung gầm */
    box(g, 4.3, 2.25, 2.14, magM, -1.0, 0.56, 0); /* thùng hàng MAXIDI */
    box(g, 4.34, 0.34, 2.18, lineM, -1.0, 1.3, 0); /* sọc trắng thương hiệu */
    box(g, 0.06, 1.7, 1.5, corniceM, -3.16, 0.7, 0); /* cửa sau */
    box(g, 4.4, 0.1, 2.2, corniceM, -1.0, 2.8, 0);
    box(g, 1.7, 1.5, 2.04, cm, 2.4, 0.56, 0); /* cabin */
    box(g, 0.8, 0.2, 2.0, cm, 1.6, 2.06, 0); /* chắn gió trên cabin */
    box(g, 0.06, 0.82, 1.78, GLASS, 3.27, 1.12, 0);
    box(g, 1.1, 0.6, 2.06, GLASS, 2.2, 1.22, 0);
    box(g, 0.1, 0.62, 2.08, darkM, 2.76, 1.22, 0);
    box(g, 0.2, 0.22, 2.1, darkM, 3.32, 0.32, 0);
    box(g, 0.05, 0.18, 1.0, darkM, 3.29, 0.66, 0);
    box(g, 0.2, 0.22, 2.1, darkM, -3.3, 0.32, 0);
    box(g, 0.03, 0.13, 0.44, plateM, -3.42, 0.4, 0);
    [-1, 1].forEach((sg) => {
      [2.4, -0.9, -2.3].forEach((x) => wheel(g, x, sg * 0.98, 0.45, 0.3));
      box(g, 0.2, 0.1, 0.15, darkM, 2.9, 1.5, sg * 1.18);
    });
    lamps(g, 3.3, -3.32, 0.72, 0.72, 4.0);
  }
  function makeCar(color, kind) {
    const g = new THREE.Group(),
      cm = bodyMat(kind === "taxi" ? 0xf2b705 : kind === "bus" || kind === "truck" || kind === "dtruck" ? 0xf5f5f7 : color);
    if (kind === "suv") suv(g, cm);
    else if (kind === "bus") bus(g, cm);
    else if (kind === "truck" || kind === "dtruck") truck(g, cm);
    else sedan(g, cm, kind === "taxi");
    if (CAN_MERGE) mergeGroup(g);
    flat(g);
    if (kind === "dtruck") {
      /* phần động (không gộp): 4 đèn cảnh báo nhấp nháy + ánh sáng cửa thùng khi mở */
      const hz = [];
      [
        [3.36, 0.95],
        [3.36, -0.95],
        [-3.36, 0.95],
        [-3.36, -0.95],
      ].forEach(([x, z]) => {
        const m = put(g, BOX, HAZ, 0.08, 0.14, 0.2, x, 0.95, z);
        m.visible = false;
        hz.push(m);
      });
      const door = put(g, BOX, DOORM, 0.06, 1.7, 1.5, -3.21, 1.55, 0);
      door.visible = false;
      g.userData = { hz, door };
    }
    return g;
  }

  /* ---- NHÂN VIÊN GIAO HÀNG: chân đu đưa, tay bê kiện hàng, mũ tím MAXIDI ---- */
  function makeCourier() {
    const g = new THREE.Group(),
      legs = [];
    [-1, 1].forEach((sg) => {
      const lg = new THREE.Group();
      lg.position.set(0, 0.8, sg * 0.12);
      box(lg, 0.2, 0.8, 0.18, pantsM, 0, -0.8, 0);
      g.add(lg);
      legs.push(lg);
    });
    box(g, 0.3, 0.62, 0.5, magM, 0, 0.8, 0);
    ball(g, 0.16, skinM, 0, 1.6, 0);
    box(g, 0.34, 0.1, 0.34, magM, 0.02, 1.68, 0);
    box(g, 0.4, 0.12, 0.12, skinM, 0.25, 1.15, 0.25);
    box(g, 0.4, 0.12, 0.12, skinM, 0.25, 1.15, -0.25);
    const pk = new THREE.Group();
    box(pk, 0.4, 0.36, 0.46, parcelM, 0, -0.18, 0);
    box(pk, 0.42, 0.06, 0.1, lineM, 0, 0.12, 0);
    pk.position.set(0.52, 1.18, 0);
    g.add(pk);
    flat(g);
    g.visible = false;
    carRoot.add(g);
    return { g, legs, box: pk };
  }
  /* nhãn nổi "Đã giao" bay lên rồi tan */
  const pops = [];
  function spawnPop(x, z) {
    const sp = tag("📦 Đã giao", x, 3.4, z, 3.2);
    if (sp) pops.push({ sp, t0: performance.now() });
  }
  /* bắt đầu quy trình giao hàng: xe đã dừng đúng chỗ trước cửa cửa hàng sx */
  function startDock(c, sx, ts) {
    const P = c.g.position,
      zd = c.dz * GZ + FRONT + 0.6;
    c.st = "dock";
    c.t0 = ts;
    c.served = sx;
    c.v = 0;
    c.pop = false;
    c.start = { x: P.x - 3.5, z: P.z };
    c.end = { x: sx + 0.6, z: zd };
    c.W = Math.hypot(c.end.x - c.start.x, c.end.z - c.start.z) / 1.8;
    if (!c.cour) c.cour = makeCourier();
  }
  function dockStep(c, ts) {
    const t = ts - c.t0,
      W = c.W,
      u = c.g.userData,
      co = c.cour,
      T1 = 1.3,
      T2 = T1 + W,
      T3 = T2 + 0.9,
      T4 = T3 + W,
      T6 = T4 + 1.7;
    const blink = (ts * 3) % 1 < 0.5;
    u.hz.forEach((m) => (m.visible = blink));
    u.door.visible = t > 0.7 && t < T4 + 0.4;
    if (t < T1 || t >= T4) co.g.visible = false;
    else {
      let x, z, yaw, walk = false;
      co.g.visible = true;
      if (t < T2) {
        const k = (t - T1) / W;
        x = c.start.x + (c.end.x - c.start.x) * k;
        z = c.start.z + (c.end.z - c.start.z) * k;
        yaw = Math.atan2(-(c.end.z - c.start.z), c.end.x - c.start.x);
        walk = true;
        co.box.visible = true;
      } else if (t < T3) {
        x = c.end.x;
        z = c.end.z;
        yaw = Math.PI / 2;
        co.box.visible = false;
        if (!c.pop) {
          c.pop = true;
          spawnPop(c.end.x, c.end.z - 0.6);
        }
      } else {
        const k = (t - T3) / W;
        x = c.end.x + (c.start.x - c.end.x) * k;
        z = c.end.z + (c.start.z - c.end.z) * k;
        yaw = Math.atan2(-(c.start.z - c.end.z), c.start.x - c.end.x);
        walk = true;
        co.box.visible = false;
      }
      co.g.position.set(x, walk ? Math.abs(Math.sin(ts * 8)) * 0.05 : 0, z);
      co.g.rotation.y = yaw;
      co.legs[0].rotation.z = walk ? Math.sin(ts * 8) * 0.6 : 0;
      co.legs[1].rotation.z = walk ? -Math.sin(ts * 8) * 0.6 : 0;
    }
    if (t >= T6) {
      c.st = null;
      u.hz.forEach((m) => (m.visible = false));
      u.door.visible = false;
      co.g.visible = false;
    }
  }

  /* mô phỏng giao thông: phanh theo đèn đỏ, giữ khoảng cách xe phía trước, xe tải dừng giao hàng */
  function stepCars(dt, ts) {
    for (let i = 0; i < carList.length; i++) {
      const c = carList[i];
      c.p = c.ax ? c.g.position.z : c.g.position.x;
    }
    for (let i = 0; i < carList.length; i++) {
      const c = carList[i],
        dir = c.dir,
        half = c.len / 2,
        P = c.g.position;
      if (c.st === "dock") {
        c.v = 0;
        dockStep(c, ts);
        continue;
      }
      let vt = c.sp;
      const front = c.p + dir * half;
      /* đèn giao thông */
      for (let k = 0; k < c.stops.length; k++) {
        const s = c.stops[k],
          d = (s.s - front) * dir;
        if (d < -0.4 || d > 45) continue;
        const st = lightSt(s.type, s.si, s.ai, ts);
        if (st === 0) continue;
        if (st === 1 && d < (c.v * c.v) / 6 + 0.5) continue; /* đèn vàng mà không kịp phanh thì đi tiếp */
        vt = Math.min(vt, Math.sqrt(6 * Math.max(0, d - 0.4)));
      }
      /* giữ khoảng cách với xe phía trước cùng làn */
      let gap = 99;
      for (let k = 0; k < c.lane.length; k++) {
        const o = c.lane[k];
        if (o === c) continue;
        const gp = (o.p - c.p) * dir - (half + o.len / 2) - 1.4;
        if (gp > -2 && gp < gap) gap = gp;
      }
      if (gap < 30) vt = Math.min(vt, Math.sqrt(6 * Math.max(0, gap - 0.3)));
      /* xe tải giao hàng: dừng đúng chỗ trước cửa từng cửa hàng trong hàng */
      if (c.deliver) {
        const list = rowStops.get(c.dz);
        if (list)
          for (let k = 0; k < list.length; k++) {
            const sx = list[k];
            if (c.served === sx) continue;
            const stp = sx + 5.8,
              d = (stp - c.p) * dir;
            if (d > -1.2 && d < 50) {
              vt = Math.min(vt, Math.sqrt(6 * Math.max(0, d)));
              if (d < 0.6 && c.v < 0.6) {
                P.x = stp;
                startDock(c, sx, ts);
              }
              break;
            }
          }
        if (c.st === "dock") continue;
      }
      if (c.v < vt) c.v = Math.min(vt, c.v + 3.5 * dt);
      else c.v = Math.max(vt, c.v - 9 * dt);
      let p = c.p + dir * c.v * dt;
      if (dir > 0 && p > c.hi) {
        p = c.lo;
        c.served = null;
      } else if (dir < 0 && p < c.lo) p = c.hi;
      if (c.ax) P.z = p;
      else P.x = p;
    }
  }
  /* cập nhật màu đèn giao thông */
  function stepSignals(ts) {
    for (let i = 0; i < sigs.length; i++) {
      const s = sigs[i],
        st = lightSt(s.type, s.si, s.ai, ts);
      if (st === s.st) continue;
      s.st = st;
      s.lamps[0].material = SIGM.r[st === 2 ? 1 : 0];
      s.lamps[1].material = SIGM.y[st === 1 ? 1 : 0];
      s.lamps[2].material = SIGM.g[st === 0 ? 1 : 0];
    }
  }

  /* ============ 4b. KẾT NỐI GIỮA CÁC CỬA HÀNG: cầu kính + toa con thoi + drone giao hàng ============ */
  const rotorM = new THREE.MeshBasicMaterial({ color: 0xe6e9f0, transparent: true, opacity: 0.4, depthWrite: false }),
    ledRM = new THREE.MeshBasicMaterial({ color: 0xff3b3b }),
    ledGM = new THREE.MeshBasicMaterial({ color: 0x3bff8a });
  let links = [];
  function clearLinks() {
    links.forEach((l) => {
      if (l.bridge) {
        linkRoot.remove(l.bridge);
        free(l.bridge);
      }
      if (l.pod) linkRoot.remove(l.pod);
      if (l.drone) linkRoot.remove(l.drone);
    });
    links = [];
  }
  /* cầu kính nối mặt hông 2 cửa hàng kề nhau (tọa độ tuyệt đối) */
  function makeBridge(xa, xb, zc) {
    const g = new THREE.Group(),
      L = xb - xa,
      cx = (xa + xb) / 2;
    box(g, L + 0.5, 0.22, 3.5, plinthM, cx, 0.45, zc); /* sàn */
    box(g, L, 1.95, 3.2, GLASS, cx, 0.67, zc); /* ống kính */
    box(g, L + 0.4, 0.16, 3.6, magM, cx, 2.62, zc); /* mái tím thương hiệu */
    box(g, L, 0.04, 0.3, GLOW, cx, 2.58, zc); /* dải đèn trần */
    [-1, 1].forEach((sg) => {
      box(g, L + 0.3, 0.09, 0.12, darkM, cx, 0.67, zc + sg * 1.62);
      box(g, L + 0.3, 0.09, 0.12, darkM, cx, 2.52, zc + sg * 1.62);
    });
    for (let x = xa + 0.9; x < xb - 0.5; x += 2.4) {
      box(g, 0.1, 1.95, 0.12, darkM, x, 0.67, zc + 1.62);
      box(g, 0.1, 1.95, 0.12, darkM, x, 0.67, zc - 1.62);
    }
    box(g, 0.3, 2.2, 3.5, darkM, xa + 0.05, 0.5, zc); /* khung đầu cầu */
    box(g, 0.3, 2.2, 3.5, darkM, xb - 0.05, 0.5, zc);
    if (L > 5) cyl(g, 0.34, 0.5, dockM, cx, 0, zc); /* trụ đỡ */
    if (L > 12) {
      cyl(g, 0.34, 0.5, dockM, xa + L / 3, 0, zc);
      cyl(g, 0.34, 0.5, dockM, xa + (2 * L) / 3, 0, zc);
    }
    if (CAN_MERGE) mergeGroup(g);
    flat(g);
    return g;
  }
  function makePod() {
    const g = new THREE.Group();
    box(g, 0.9, 0.5, 1.3, magM, 0, 0, 0);
    box(g, 0.6, 0.06, 0.9, GLOW, 0, 0.5, 0);
    box(g, 0.96, 0.08, 1.36, corniceM, 0, 0.2, 0);
    flat(g);
    return g;
  }
  function makeDrone() {
    const g = new THREE.Group(),
      rotors = [];
    box(g, 0.9, 0.24, 0.9, darkM, 0, 0, 0);
    box(g, 2.1, 0.06, 0.1, darkM, 0, 0.1, 0);
    box(g, 0.1, 0.06, 2.1, darkM, 0, 0.1, 0);
    [
      [-1.05, -1.05],
      [1.05, -1.05],
      [-1.05, 1.05],
      [1.05, 1.05],
    ].forEach(([x, z]) => {
      const rg = new THREE.Group();
      rg.position.set(x, 0.24, z);
      put(rg, BOX, darkM, 0.12, 0.12, 0.12, 0, -0.04, 0);
      put(rg, BOX, acM, 1.2, 0.025, 0.09, 0, 0.05, 0);
      put(rg, BOX, acM, 0.09, 0.025, 1.2, 0, 0.05, 0);
      put(rg, CYL, rotorM, 0.62, 0.012, 0.62, 0, 0.05, 0);
      g.add(rg);
      rotors.push(rg);
    });
    /* kiện hàng treo dưới bụng drone */
    box(g, 0.6, 0.42, 0.6, magM, 0, -0.5, 0);
    box(g, 0.62, 0.07, 0.62, lineM, 0, -0.3, 0);
    box(g, 0.05, 0.3, 0.05, darkM, 0, -0.16, 0);
    const lr = put(g, SPH, ledRM, 0.08, 0.08, 0.08, 0.5, 0.06, 0.5),
      lg = put(g, SPH, ledGM, 0.08, 0.08, 0.08, -0.5, 0.06, -0.5);
    g.userData = { rotors, lr, lg };
    flat(g);
    return g;
  }
  function buildLinks(cells) {
    clearLinks();
    const list = [];
    cells.forEach((c) => {
      const r = cells.get(c.dx + 1 + "," + c.dz),
        f = cells.get(c.dx + "," + (c.dz + 1));
      if (r) list.push({ a: c, b: r, h: true });
      if (f) list.push({ a: c, b: f, h: false });
    });
    const near = (p) => Math.hypot(p.a.dx + p.b.dx, (p.a.dz + p.b.dz) * 2.3);
    list.sort((p, q) => near(p) - near(q));
    let nd = 0;
    list.forEach((p, i) => {
      const { a, b } = p,
        l = { h: p.h, ph: (((i * 0.37) % 1) + 1) % 1 },
        ta = [a.g && a.g.userData.anim, b.g && b.g.userData.anim].filter(Boolean);
      l.t0 = ta.length ? Math.max(...ta.map((x) => x.t0)) + 350 : null;
      if (p.h) {
        const xa = a.dx * GX + a.w / 2 + 0.25,
          xb = b.dx * GX - b.w / 2 - 0.25,
          L = xb - xa,
          zc = a.dz * GZ + FRONT - 8;
        if (L >= 1.5) {
          l.bridge = makeBridge(xa, xb, zc);
          linkRoot.add(l.bridge);
          if (L > 2.6) {
            l.pod = makePod();
            l.pod.position.set(xa + 1, 0.72, zc);
            l.xa = xa + 1.1;
            l.xb = xb - 1.1;
            l.zc = zc;
            l.T = 5 + L * 0.35;
            linkRoot.add(l.pod);
          }
          if (l.t0 != null) {
            l.bridge.scale.y = 0.001;
            l.bridge.visible = false;
            if (l.pod) l.pod.visible = false;
          }
        }
      }
      if (nd < (LITE ? 4 : MAXDRONE)) {
        nd++;
        const A = { x: a.dx * GX, z: a.dz * GZ + FRONT - a.d / 2 },
          B = { x: b.dx * GX, z: b.dz * GZ + FRONT - b.d / 2 },
          dist = Math.hypot(B.x - A.x, B.z - A.z);
        l.drone = makeDrone();
        l.A = A;
        l.B = B;
        l.arc = 3 + dist * 0.07;
        l.DT = 9 + dist / 5;
        l.yaw = Math.atan2(-(B.z - A.z), B.x - A.x);
        l.drone.position.set(A.x, 4, A.z);
        if (l.t0 != null) l.drone.visible = false;
        linkRoot.add(l.drone);
      }
      links.push(l);
    });
  }

  /* cột sáng + vòng sóng khi chọn cửa hàng */
  const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 40, 28, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff4fc3, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    ),
    ringGeo = new THREE.RingGeometry(0.88, 1, 56),
    rings = [0, 1].map(() => {
      const m = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0xff4fc3, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      scene.add(m);
      return m;
    });
  beam.visible = false;
  scene.add(beam);

  /* ============ 4c. CHU KỲ NGÀY ĐÊM ============ */
  /* Ban đêm CHỈ đổi: màu trời, sương mù, màu vật liệu riêng của khu phố (đường, nhà, xe...) và độ sáng vật liệu phát sáng.
     KHÔNG đụng vào bất kỳ đèn nào của cảnh và không dùng chung vật liệu với core → nội thất cửa hàng luôn sáng như ban ngày. */
  const DN = { mode: 0 /* 0 tự động · 1 ban ngày · 2 ban đêm */, dl: 1, w: 0, lastN: -1, lastW: -1 },
    NIGHT_T = new THREE.Color(0.2, 0.25, 0.42),
    WARM_T = new THREE.Color(1, 0.78, 0.62),
    NIGHT_BG = new THREE.Color(0x070b1a),
    DUSK_BG = new THREE.Color(0xf19a6b),
    tmpC = new THREE.Color(),
    BGS = { base: null, clr: null, a: 1, fog: null },
    GB = GLOW.emissiveIntensity != null ? GLOW.emissiveIntensity : 1,
    TB = TAIL.emissiveIntensity != null ? TAIL.emissiveIntensity : 1;
  const mixBg = (out, base, n, w) => out.copy(base).lerp(DUSK_BG, w * 0.5).lerp(NIGHT_BG, n * 0.96);
  /* sao + trăng (đi theo camera nên luôn ở rất xa) */
  const starGeo = new THREE.BufferGeometry(),
    SN = 380,
    sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    const a = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1,
      b = ((Math.sin(i * 78.233 + 3.1) * 12345.678) % 1 + 1) % 1,
      th = a * Math.PI * 2,
      el = 0.06 + b * 1.2,
      r = Math.cos(el);
    sp[i * 3] = Math.cos(th) * r;
    sp[i * 3 + 1] = Math.sin(el);
    sp[i * 3 + 2] = Math.sin(th) * r;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })),
    moon = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf1f4ff, transparent: true, opacity: 0, depthWrite: false, fog: false })),
    sky = new THREE.Group();
  stars.frustumCulled = false;
  stars.renderOrder = -2;
  moon.renderOrder = -1;
  sky.add(stars, moon);
  sky.visible = false;
  scene.add(sky);
  function applyDayNight(dt, ts) {
    let tgt, wt;
    const forced = mode === "edit"; /* đang chỉnh sửa → trời luôn sáng cho dễ nhìn */
    if (forced) {
      tgt = 1;
      wt = 0;
    } else if (DN.mode === 0) {
      const e = Math.sin(Math.PI * 2 * (ts / CYCLE + 0.25)); /* bắt đầu từ giữa trưa */
      tgt = smooth(-0.12, 0.3, e);
      wt = Math.exp(-Math.pow((e - 0.06) / 0.22, 2));
    } else {
      tgt = DN.mode === 1 ? 1 : 0;
      wt = 0;
    }
    const kk = Math.min(1, dt * (DN.mode === 0 && !forced ? 12 : 2.5));
    DN.dl += (tgt - DN.dl) * kk;
    DN.w += (wt - DN.w) * kk;
    const n = 1 - DN.dl,
      w = DN.w;
    if (Math.abs(n - DN.lastN) < 0.002 && Math.abs(w - DN.lastW) < 0.002) return;
    DN.lastN = n;
    DN.lastW = w;
    /* màu vật liệu riêng của khu phố: nhân với tông đêm (xanh tối) / hoàng hôn (cam ấm) */
    tintNow.setRGB(1, 1, 1).lerp(NIGHT_T, n * 0.92).lerp(WARM_T, w * 0.35);
    for (let i = 0; i < dnMats.length; i++) dnMats[i][0].color.copy(dnMats[i][1]).multiply(tintNow);
    /* trời + sương mù */
    const bg = scene.background;
    if (bg && bg.isColor) {
      if (!BGS.base) BGS.base = bg.clone();
      mixBg(bg, BGS.base, n, w);
    } else if (!bg && ren.getClearColor) {
      if (!BGS.clr) {
        BGS.clr = new THREE.Color();
        ren.getClearColor(BGS.clr);
        BGS.a = ren.getClearAlpha();
      }
      if (BGS.a > 0) ren.setClearColor(mixBg(tmpC, BGS.clr, n, w), BGS.a);
    }
    if (scene.fog && scene.fog.color) {
      if (!BGS.fog) BGS.fog = scene.fog.color.clone();
      mixBg(scene.fog.color, BGS.fog, n, w);
    }
    /* vật liệu phát sáng + vệt sáng */
    GLOW.emissiveIntensity = GB * (1 + n * 1.6);
    TAIL.emissiveIntensity = TB * (1 + n * 0.8);
    BEAM.opacity = 0.14 + n * 0.34;
    POOLM.opacity = n * 0.5;
    poolRoot.visible = n > 0.02;
    blocks.forEach((g) => {
      if (g.userData.sm) g.userData.sm.emissiveIntensity = 0.3 + n * 0.9;
    });
    stars.material.opacity = n;
    moon.material.opacity = Math.min(1, n * 1.4);
    sky.visible = !LITE && n > 0.02;
  }

  /* ============ 5. ĐỒNG BỘ DANH SÁCH ⇄ Ô ĐẤT ⇄ CẢNH ============ */
  let sig = "",
    inited = false,
    built = false,
    lastAct = null,
    prevIds = new Set(),
    known = new Set(),
    EXT = { x0: 0, x1: 0, z0: 0, z1: 0 },
    EXTR = { minDx: 0, maxDx: 0, minDz: 0, maxDz: 0 },
    blocks = new Map(),
    selId = null,
    going = false;
  const T0 = Date.now(),
    refOf = () => (StoreLink.activeId && plots[StoreLink.activeId] ? plots[StoreLink.activeId] : [0, 0]);

  function sync(force) {
    const list = SC.list || [],
      ids = new Set(list.map((s) => s.id));
    let changed = false;
    if (list.length || Date.now() - T0 > 8000)
      for (const id in plots)
        if (!ids.has(id)) {
          delete plots[id];
          changed = true;
        }
    const act = StoreLink.activeId;
    if (act && ids.has(act) && !plots[act]) {
      plots[act] = nextPlot([0, 0]);
      changed = true;
    }
    const ref = refOf(),
      fresh = [];
    list.forEach((s) => {
      if (!plots[s.id]) {
        plots[s.id] = nextPlot(ref);
        changed = true;
        fresh.push(s);
      }
    });
    if (changed) persist();
    if (list.length && !inited) {
      inited = true;
      list.forEach((s) => known.add(s.id));
    } else if (inited) {
      const nu = fresh.filter((s) => !known.has(s.id));
      nu.forEach((s) => known.add(s.id));
      if (nu.length === 1) {
        const p = plots[nu[0].id];
        toast("“" + nu[0].name + "” nằm " + dirText([p[0] - ref[0], p[1] - ref[1]]) + " cửa hàng hiện tại. Mở tab Cửa hàng → “Khu phố” để xem.");
      } else if (nu.length > 1) toast(nu.length + " cửa hàng mới đã được đặt quanh cửa hàng hiện tại.");
    }
    const s2 = JSON.stringify([act, plots, list.map((s) => [s.id, s.name, s.status, s.snapshot && s.snapshot.store ? [s.snapshot.store.width, s.snapshot.store.depth] : 0])]);
    if (force || s2 !== sig) {
      sig = s2;
      rebuild(list);
    }
  }

  function rebuild(list) {
    blocks.forEach(killBlock);
    blocks.clear();
    const ref = refOf(),
      act = StoreLink.activeId,
      cand = [],
      animAll = built && act !== lastAct,
      base = performance.now() + (going ? 650 : 80);
    list.forEach((s) => {
      const p = plots[s.id];
      if (!p || s.id === act) return;
      const dx = p[0] - ref[0],
        dz = p[1] - ref[1];
      if (dx || dz) cand.push([s, dx, dz]);
    });
    cand.sort((a, b) => a[1] * a[1] * 0.3 + a[2] * a[2] - (b[1] * b[1] * 0.3 + b[2] * b[2]));
    let mnx = 0, mxx = 0, mnz = 0, mxz = 0;
    /* ô gốc = cửa hàng đang mở (không phải khối), dùng để nối cầu / drone với các cửa hàng kề bên */
    const cells = new Map(),
      oW = typeof STORE !== "undefined" && isFinite(STORE.W) ? STORE.W : 14,
      oD = typeof STORE !== "undefined" && isFinite(STORE.D) ? STORE.D : 30;
    cells.set("0,0", { dx: 0, dz: 0, w: oW, d: oD, g: null });
    cand.slice(0, MAXB).forEach(([s, dx, dz]) => {
      let g;
      try {
        g = makeBlock(s, dx, dz);
      } catch (e) {
        console.error("store-world: makeBlock", e);
        return;
      }
      root.add(g);
      blocks.set(s.id, g);
      cells.set(dx + "," + dz, { dx, dz, w: g.userData.w, d: g.userData.d, g });
      mnx = Math.min(mnx, dx);
      mxx = Math.max(mxx, dx);
      mnz = Math.min(mnz, dz);
      mxz = Math.max(mxz, dz);
      if (built && (animAll || !prevIds.has(s.id))) {
        g.scale.y = 0.001;
        g.userData.sprite.visible = false;
        g.userData.anim = { t0: base + (animAll ? Math.hypot(dx * GX, dz * GZ) * 14 : 0), dur: 850 };
      }
    });
    EXTR = { minDx: mnx, maxDx: mxx, minDz: mnz, maxDz: mxz };
    EXT = { x0: mnx * GX - 26, x1: mxx * GX + 26, z0: mnz * GZ - 6, z1: mxz * GZ + 16 };
    /* đích giao hàng của từng hàng: x của mọi cửa hàng (gồm cả cửa hàng đang mở ở gốc) */
    rowStops = new Map();
    cells.forEach((c) => {
      if (!rowStops.has(c.dz)) rowStops.set(c.dz, []);
      rowStops.get(c.dz).push(c.dx * GX);
    });
    rowStops.forEach((a) => a.sort((p, q) => p - q));
    try {
      buildRoads(mnx, mxx, mnz, mxz);
    } catch (e) {
      roadKey = "";
      console.error("store-world: buildRoads", e);
    }
    try {
      buildLinks(cells);
    } catch (e) {
      console.error("store-world: buildLinks", e);
    }
    prevIds = new Set(blocks.keys());
    lastAct = act;
    built = true;
    DN.lastN = -1; /* ép áp lại ánh sáng ban đêm cho khối mới */
    if (selId && !blocks.has(selId)) hidePill();
  }
  setInterval(() => !document.hidden && !going && sync(), 400);
  sync();

  /* camera được trượt tới các ô lân cận + 2 đại lộ */
  if (typeof clampTarget === "function")
    clampTarget = function () {
      cam.tx = THREE.MathUtils.clamp(cam.tx, -STORE.W / 2 - 6 + EXT.x0, STORE.W / 2 + 6 + EXT.x1);
      cam.tz = THREE.MathUtils.clamp(cam.tz, -STORE.D / 2 - 9 + EXT.z0, STORE.D / 2 + 8 + EXT.z1);
    };

  /* ============ 6. CAMERA ============ */
  const fovT = () => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function allBounds() {
    const x0 = EXTR.minDx * GX - 40,
      x1 = EXTR.maxDx * GX + 40,
      z0 = EXTR.minDz * GZ - 24,
      z1 = EXTR.maxDz * GZ + ROAD + 8,
      t = fovT(),
      a = camera.aspect || 1;
    return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, r: Math.max((z1 - z0 + 4) / t, (x1 - x0) / (t * a)) };
  }
  /* tween camera tự viết (mượt hơn stepCam); interruptible: chạm vào màn hình là dừng */
  const down = new Set();
  function tween(to, ms, intr) {
    return new Promise((res) => {
      const from = { th: cam.th, ph: cam.ph, r: cam.r, tx: cam.tx, ty: cam.ty, tz: cam.tz },
        t0 = performance.now();
      to = { ...to, th: from.th + wrap(to.th - from.th) };
      (function f(now) {
        const p = clamp((now - t0) / ms, 0, 1),
          e = easeIO(p);
        if (intr && down.size) return res();
        for (const k in from) cam[k] = from[k] + (to[k] - from[k]) * e;
        cam.T = null;
        cam.vth = 0;
        p < 1 ? requestAnimationFrame(f) : res();
      })(t0);
    });
  }
  function fitAll() {
    const b = allBounds();
    cam.vth = 0;
    cam.T = { th: cam.th + wrap(0 - cam.th), ph: 0.85, r: b.r, tx: b.cx, ty: 0, tz: b.cz };
  }
  function flyTo(g) {
    cam.vth = 0;
    cam.T = { th: cam.th + wrap(0 - cam.th), ph: 0.85, r: Math.max(12, cam.fit * 0.85), tx: g.userData.cx, ty: 0, tz: g.userData.cz };
  }
  cv.parentElement.addEventListener(
    "wheel",
    (e) => {
      if (e.target !== cv) return;
      e.stopPropagation();
      e.preventDefault();
      cam.T = null;
      cam.r = clamp(cam.r * (1 + e.deltaY * 0.001), 3, Math.max(cam.fit * 1.3, allBounds().r));
    },
    { capture: true, passive: false },
  );

  /* ============ 7. GIAO DIỆN: nút Khu phố, thẻ chọn, màn kính chuyển cảnh ============ */
  const css = document.createElement("style");
  css.textContent = `
#swPill{position:absolute;left:50%;top:calc(var(--sl-top,14px) + 76px + env(safe-area-inset-top,0px));transform:translate(-50%,-6px);z-index:3;
 display:flex;align-items:center;gap:10px;max-width:min(92vw,460px);padding:8px 8px 8px 18px;border-radius:999px;color:#1d1d1f;
 background:linear-gradient(180deg,rgba(255,255,255,.78),rgba(255,255,255,.5));
 -webkit-backdrop-filter:blur(26px) saturate(170%);backdrop-filter:blur(26px) saturate(170%);
 box-shadow:0 1px 2px rgba(0,0,0,.08),0 12px 28px -8px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(0,0,0,.05);
 opacity:0;pointer-events:none;transition:opacity .25s ease,transform .35s cubic-bezier(.2,.9,.25,1)}
#swPill.on{opacity:1;pointer-events:auto;transform:translate(-50%,0)}
#swPill .sw-t{min-width:0;display:flex;flex-direction:column;gap:1px}
#swPill .sw-t b{font:650 14.5px/1.25 -apple-system,"SF Pro Text","Segoe UI",sans-serif;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#swPill .sw-t span{font:500 11.5px/1.2 -apple-system,"Segoe UI",sans-serif;opacity:.55;white-space:nowrap}
#swPill button{-webkit-appearance:none;appearance:none;border:0;cursor:pointer;font:600 13.5px -apple-system,"Segoe UI",sans-serif;-webkit-tap-highlight-color:transparent;transition:transform .25s cubic-bezier(.2,.8,.2,1),filter .2s}
#swPill button:active{transform:scale(.95)}
#swPill .sw-go{flex:none;height:38px;padding:0 16px;border-radius:999px;color:#fff;background:linear-gradient(180deg,#48484c,#1d1d1f);
 box-shadow:0 .5px 1px rgba(0,0,0,.2),0 4px 10px -3px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.28),inset 0 -1px 0 rgba(0,0,0,.35)}
#swPill .sw-x{flex:none;display:grid;place-items:center;width:34px;height:34px;padding:0;border-radius:50%;color:inherit;opacity:.7;background:rgba(0,0,0,.06)}
/* màn kính chuyển cảnh */
#swVeil{position:absolute;inset:0;z-index:6;display:grid;place-items:center;opacity:0;pointer-events:none;
 background:radial-gradient(circle at 50% 50%,rgba(250,250,252,.5),rgba(226,228,234,.84));
 -webkit-backdrop-filter:blur(0) saturate(100%);backdrop-filter:blur(0) saturate(100%);
 transition:opacity .8s ease,-webkit-backdrop-filter .8s ease,backdrop-filter .8s ease}
#swVeil.on{opacity:1;pointer-events:auto;-webkit-backdrop-filter:blur(26px) saturate(165%);backdrop-filter:blur(26px) saturate(165%);
 transition-duration:.45s}
#swVeil.lock{pointer-events:auto}
#swVeil.inst,#swVeil.inst .sw-c{transition:none!important}
#swVeil .sw-c{display:flex;flex-direction:column;align-items:center;gap:4px;max-width:86%;padding:22px 38px 24px;border-radius:36px;color:#1d1d1f;text-align:center;
 background:linear-gradient(180deg,rgba(255,255,255,.8),rgba(255,255,255,.5));
 box-shadow:0 1px 2px rgba(0,0,0,.08),0 24px 54px -14px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(0,0,0,.05);
 transform:scale(.92) translateY(10px);opacity:0;transition:transform .6s cubic-bezier(.2,.9,.25,1) .08s,opacity .4s ease .08s}
#swVeil.on .sw-c{transform:none;opacity:1}
#swVeil .sw-k{font:600 10.5px/1.3 -apple-system,"Segoe UI",sans-serif;letter-spacing:.2em;opacity:.5}
#swVeil .sw-n{font:700 clamp(22px,4vw,32px)/1.2 -apple-system,"SF Pro Display","Segoe UI",sans-serif;letter-spacing:-.02em}
#swVeil .sw-s{font:500 12px/1.3 -apple-system,"Segoe UI",sans-serif;opacity:.5}
@media (prefers-color-scheme:dark){
 #swPill{color:#f5f5f7;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.07));
  box-shadow:0 1px 2px rgba(0,0,0,.5),0 12px 28px -8px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(0,0,0,.4)}
 #swPill .sw-go{color:#111;background:linear-gradient(180deg,#fafafa,#d4d4d8)}
 #swPill .sw-x{background:rgba(255,255,255,.1)}
 #swVeil{background:radial-gradient(circle at 50% 50%,rgba(40,40,46,.5),rgba(16,16,20,.84))}
 #swVeil .sw-c{color:#f5f5f7;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.07));
  box-shadow:0 1px 2px rgba(0,0,0,.5),0 24px 54px -14px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(0,0,0,.4)}}
@media (max-width:720px){#swPill{top:calc(var(--sl-top,14px) + 66px + env(safe-area-inset-top,0px))}}
@media (prefers-reduced-motion:reduce){#swVeil,#swVeil .sw-c{transition-duration:.01s!important}}
/* thanh công cụ bị tràn trên điện thoại → xuống dòng để hiện đủ mọi nút (class chỉ được gắn khi thật sự tràn) */
#tools.sw-wrap{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;justify-content:center!important;align-content:flex-start!important;gap:6px!important;
 max-width:calc(100vw - 16px)!important;width:auto!important;height:auto!important;max-height:none!important;overflow:visible!important;box-sizing:border-box}
#tools.sw-wrapc{display:flex!important;flex-direction:column!important;flex-wrap:wrap!important;align-content:flex-start!important;gap:6px!important;
 max-height:var(--sw-mh,70vh)!important;height:auto!important;overflow:visible!important;box-sizing:border-box}
#tools.sw-wrap>*,#tools.sw-wrapc>*{flex:0 0 auto!important}`;
  document.head.appendChild(css);

  const pill = document.createElement("div");
  pill.id = "swPill";
  pill.innerHTML = `<div class="sw-t"><b></b><span></span></div><button class="sw-go" type="button">Mở cửa hàng</button><button class="sw-x" type="button" aria-label="Đóng">${IC("x", 14)}</button>`;
  $("#store").appendChild(pill);
  pill.addEventListener("pointerdown", (e) => e.stopPropagation());
  const hidePill = () => {
    selId = null;
    pill.classList.remove("on");
  };
  function showPill(id) {
    const s = (SC.list || []).find((x) => x.id === id);
    if (!s) return;
    selId = id;
    pill.querySelector("b").textContent = s.name;
    pill.querySelector("span").textContent = s.id + " · " + (STATUS[s.status] || "");
    pill.classList.add("on");
  }
  pill.querySelector(".sw-x").onclick = hidePill;
  pill.querySelector(".sw-go").onclick = () => {
    const id = selId;
    hidePill();
    if (id) StoreLink.view(id);
  };

  const veilEl = document.createElement("div");
  veilEl.id = "swVeil";
  veilEl.innerHTML = '<div class="sw-c"><span class="sw-k">ĐANG MỞ CỬA HÀNG</span><b class="sw-n"></b><span class="sw-s"></span></div>';
  $("#store").appendChild(veilEl);
  let veilOn = false;
  function veil(on, name, sub, instant) {
    if (name != null) {
      veilEl.querySelector(".sw-n").textContent = name;
      veilEl.querySelector(".sw-s").textContent = sub || "";
    }
    if (instant) {
      veilEl.classList.add("inst");
      veilEl.classList.toggle("on", on);
      void veilEl.offsetWidth;
      requestAnimationFrame(() => veilEl.classList.remove("inst"));
    } else veilEl.classList.toggle("on", on);
    veilOn = on;
  }

  const bt = document.createElement("button");
  bt.id = "swAll";
  bt.className = "sx-lb";
  bt.title = "Xem toàn bộ khu phố cửa hàng";
  bt.innerHTML = IC("shops", 17) + "<span>Khu phố</span>";
  bt.onclick = fitAll;
  $("#tools").appendChild(bt);

  /* nút Ngày đêm: Tự động → Ban ngày → Ban đêm */
  const DN_LBL = [
      ["🌗", "Ngày đêm"],
      ["☀️", "Ban ngày"],
      ["🌙", "Ban đêm"],
    ],
    dnBtn = document.createElement("button");
  dnBtn.id = "swDN";
  dnBtn.className = "sx-lb";
  const dnPaint = () => {
    dnBtn.innerHTML = "<span>" + DN_LBL[DN.mode][0] + " " + DN_LBL[DN.mode][1] + "</span>";
    dnBtn.title = "Chu kỳ ngày đêm: " + ["tự động", "luôn ban ngày", "luôn ban đêm"][DN.mode] + " (bấm để đổi)";
  };
  dnBtn.onclick = () => {
    DN.mode = (DN.mode + 1) % 3;
    dnPaint();
  };
  dnPaint();
  $("#tools").appendChild(dnBtn);

  /* thanh công cụ trên điện thoại: chỉ khi thật sự tràn khỏi màn hình mới cho xuống dòng, còn vừa thì giữ nguyên UI chuẩn */
  const mqPhone = window.matchMedia("(max-width:720px), (max-height:520px)");
  let fitBusy = false;
  function fitTools() {
    const t = $("#tools");
    if (!t || fitBusy) return;
    fitBusy = true;
    try {
      t.classList.remove("sw-wrap", "sw-wrapc");
      t.style.removeProperty("--sw-mh");
      if (!mqPhone.matches) return;
      const r = t.getBoundingClientRect(),
        vw = window.innerWidth,
        vh = window.innerHeight,
        overW = t.scrollWidth > t.clientWidth + 2 || r.left < -1 || r.right > vw + 1,
        overH = t.scrollHeight > t.clientHeight + 2 || r.top < -1 || r.bottom > vh + 1;
      if (!overW && !overH) return;
      if (getComputedStyle(t).flexDirection === "column") {
        t.style.setProperty("--sw-mh", Math.max(120, vh - Math.max(0, r.top) - 90) + "px");
        t.classList.add("sw-wrapc");
      } else t.classList.add("sw-wrap");
    } finally {
      fitBusy = false;
    }
  }
  window.addEventListener("resize", fitTools);
  window.addEventListener("orientationchange", () => setTimeout(fitTools, 250));
  try {
    new MutationObserver(() => setTimeout(fitTools, 0)).observe($("#tools"), { childList: true });
  } catch (e) {}
  setInterval(fitTools, 1500);
  setTimeout(fitTools, 300);

  /* ============ 8. CHUYỂN CỬA HÀNG (bọc StoreLink.view: mọi nơi gọi đều có animation) ============ */
  const _view = StoreLink.view;
  async function go(id) {
    const s = (SC.list || []).find((x) => x.id === id);
    if (going || !s || id === StoreLink.activeId) return _view(id);
    going = true;
    hidePill();
    const g = blocks.get(id),
      inStore = $("#store").classList.contains("on") && tab === "store",
      dirty = StoreLink.dirty && StoreLink.activeId;
    try {
      /* 1) bay tới mặt tiền khối được chọn, rồi phủ màn kính */
      if (g && inStore && !dirty) {
        veilEl.classList.add("lock");
        await tween({ th: 0, ph: 0.5, r: 26, tx: g.userData.cx, ty: 1.4, tz: g.position.z + FRONT - 3 }, 1250, false);
        veil(true, s.name, s.id + " · " + (STATUS[s.status] || ""));
        await sleep(520);
      }
      /* 2) nạp cửa hàng thật (có thể hiện hộp thoại "chưa lưu") */
      await _view(id);
      if (StoreLink.activeId !== id) return veil(false); /* người dùng hủy */
      /* 3) hạ cánh: dựng lại khu phố quanh cửa hàng mới, camera lượn từ thấp lên toàn cảnh */
      if (!veilOn) veil(true, s.name, s.id + " · " + (STATUS[s.status] || ""), true);
      sync(true);
      cam.T = null;
      cam.vth = 0;
      Object.assign(cam, { th: 0.9, ph: 0.4, r: Math.max(9, cam.fit * 0.4), tx: 0, ty: 1.4, tz: 12 });
      await sleep(200);
      veil(false);
      await tween({ th: 0, ph: mode === "edit" ? 0.6 : 0.85, r: cam.fit, tx: 0, ty: 0, tz: -1 }, 2200, true);
      if (typeof overview === "function") overview();
    } finally {
      going = false;
      veilEl.classList.remove("lock");
      if (veilOn) veil(false); /* lỡ có lỗi giữa chừng thì vẫn gỡ màn kính */
    }
  }
  StoreLink.view = go;

  /* ============ 9. BẤM VÀO KHỐI (chế độ Xem, chỉ khi là một cú chạm gọn) ============ */
  const rc = new THREE.Raycaster(),
    mv = new THREE.Vector2();
  let dn = null;
  cv.addEventListener("pointerdown", (e) => {
    down.add(e.pointerId);
    dn = down.size === 1 && !e.shiftKey && !(e.pointerType === "mouse" && e.button !== 0) ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  });
  cv.addEventListener("pointercancel", (e) => {
    down.delete(e.pointerId);
    dn = null;
  });
  cv.addEventListener("pointerup", (e) => {
    down.delete(e.pointerId);
    const d = dn;
    dn = null;
    if (!d || d.id !== e.pointerId || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    if (mode !== "view" || going || !blocks.size) return;
    const r = cv.getBoundingClientRect();
    mv.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rc.setFromCamera(mv, camera);
    const h = rc.intersectObjects(root.children, true)[0];
    if (!h) return selId && hidePill();
    let o = h.object;
    while (o && !o.userData.shopId) o = o.parent;
    if (!o) return;
    showPill(o.userData.shopId);
    flyTo(o);
  });
  setInterval(() => mode === "edit" && selId && hidePill(), 500);

  /* ============ 10. MỖI KHUNG HÌNH: khối trồi lên + giao thông + đèn + giao hàng + drone + ngày đêm ============ */
  const _render = ren.render.bind(ren);
  const safe = (f) => {
    try {
      f();
    } catch (e) {
      if (!safe.err) {
        safe.err = 1;
        console.error("store-world:", e);
      }
    }
  };
  /* zoom ra xem cả khu phố (nhất là màn hình dọc điện thoại): nới far-plane + giảm sương mù để cửa hàng không bị cắt / phủ mờ.
     Chỉ nới thêm, không bao giờ thu hẹp lại mức gốc của core. */
  const camBase = { fn: null, ff: null, fd: null };
  function adaptView() {
    const r = cam.r || 0,
      need = Math.ceil((r * 3 + 300) / 50) * 50;
    if (camera.far < need) {
      camera.far = need;
      camera.updateProjectionMatrix();
    }
    const f = scene.fog;
    if (!f) return;
    const k = blocks.size ? clamp((r - cam.fit * 1.1) / (cam.fit * 0.5 + 1), 0, 1) : 0;
    if (f.isFog) {
      if (camBase.fn == null) {
        camBase.fn = f.near;
        camBase.ff = f.far;
      }
      f.near = camBase.fn + (Math.max(camBase.fn, r * 0.8) - camBase.fn) * k;
      f.far = camBase.ff + (Math.max(camBase.ff, r * 2.6) - camBase.ff) * k;
    } else if (f.isFogExp2) {
      if (camBase.fd == null) camBase.fd = f.density;
      f.density = camBase.fd + (Math.min(camBase.fd, 0.9 / Math.max(r, 1)) - camBase.fd) * k;
    }
  }
  let last = performance.now();
  function frame() {
    const now = performance.now(),
      dt = Math.min(0.05, (now - last) / 1000),
      ts = now / 1000;
    last = now;
    safe(adaptView);
    blocks.forEach((g) => {
      const a = g.userData.anim;
      if (!a) return;
      const p = (now - a.t0) / a.dur;
      if (p >= 1) {
        g.scale.y = 1;
        g.userData.sprite.visible = true;
        delete g.userData.anim;
      } else {
        g.scale.y = p <= 0 ? 0.001 : Math.max(0.001, easeBack(p));
        g.userData.sprite.visible = p > 0.75;
      }
    });
    /* giao thông: đèn + xe + xe tải giao hàng */
    safe(() => {
      stepSignals(ts);
      stepCars(dt, ts);
    });
    /* nhãn "Đã giao" bay lên rồi tan */
    for (let i = pops.length - 1; i >= 0; i--) {
      const q = pops[i],
        age = (now - q.t0) / 1000;
      if (age > 2.6) {
        dropSprite(q.sp);
        pops.splice(i, 1);
      } else {
        q.sp.position.y = 3.4 + age * 0.6;
        if (q.sp.material) q.sp.material.opacity = age > 1.9 ? Math.max(0, 1 - (age - 1.9) / 0.7) : 1;
      }
    }
    /* cầu kính mọc cùng khối, toa con thoi chạy qua lại, drone mang kiện hàng bay vòng cung giữa các mái */
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      let vis = true;
      if (l.t0 != null) {
        const p = (now - l.t0) / 700;
        if (p >= 1) {
          l.t0 = null;
          if (l.bridge) {
            l.bridge.scale.y = 1;
            l.bridge.visible = true;
          }
        } else {
          vis = false;
          if (l.bridge) {
            l.bridge.visible = p > 0;
            l.bridge.scale.y = p <= 0 ? 0.001 : Math.max(0.001, easeBack(p));
          }
        }
      }
      if (l.pod) {
        l.pod.visible = vis;
        if (vis) {
          const u = 0.5 - 0.5 * Math.cos((ts / l.T) * Math.PI * 2 + l.ph * 6.283);
          l.pod.position.x = l.xa + (l.xb - l.xa) * u;
        }
      }
      if (l.drone) {
        const d = l.drone;
        d.visible = vis;
        if (vis) {
          const f = ((ts / l.DT + l.ph) % 1) * 2,
            leg = f < 1 ? f : f - 1,
            u = easeIO(clamp((leg - 0.12) / 0.76, 0, 1)),
            k = f < 1 ? u : 1 - u,
            ud = d.userData;
          d.position.set(l.A.x + (l.B.x - l.A.x) * k, 4 + l.arc * Math.sin(Math.PI * k) + Math.sin(ts * 3 + l.ph * 9) * 0.12, l.A.z + (l.B.z - l.A.z) * k);
          d.rotation.y = f < 1 ? l.yaw : l.yaw + Math.PI;
          for (let j = 0; j < 4; j++) ud.rotors[j].rotation.y += dt * 42;
          ud.lr.visible = (ts * 2 + l.ph) % 1 < 0.5;
          ud.lg.visible = !ud.lr.visible;
        }
      }
    }
    /* cột sáng + 2 vòng sóng lan tỏa trên cửa hàng đang được chọn */
    const sg = selId && blocks.get(selId);
    if (sg && !going) {
      beam.visible = true;
      beam.position.set(sg.userData.cx, 20, sg.userData.cz);
      beam.material.opacity = 0.11 + 0.05 * Math.sin(ts * 3);
      rings.forEach((r, i) => {
        const k = (ts / 1.8 + i * 0.5) % 1;
        r.visible = true;
        r.position.set(sg.userData.cx, 0.06, sg.userData.cz);
        r.scale.set(4 + 10 * k, 4 + 10 * k, 1);
        r.material.opacity = 0.55 * (1 - k);
      });
    } else if (beam.visible) {
      beam.visible = false;
      rings.forEach((r) => (r.visible = false));
    }
    /* ngày đêm (sao + trăng đi theo camera) */
    safe(() => applyDayNight(dt, ts));
    if (sky.visible) {
      const R = Math.min((camera.far || 2000) * 0.45, 900);
      sky.position.copy(camera.position);
      stars.scale.setScalar(R);
      moon.scale.setScalar(R * 0.035);
      moon.position.set(-0.45 * R, 0.62 * R, -0.64 * R);
    }
  }
  ren.render = (s, c) => {
    try {
      frame();
    } catch (e) {
      if (!frame.err) {
        frame.err = 1;
        console.error("store-world:", e);
      }
    }
    _render(s, c);
  };

  window.StoreWorld = {
    fitAll,
    go,
    plots: () => ({ ...plots }),
    rebuild: () => sync(true),
    fitTools,
    dayNight: (m) => {
      DN.mode = clamp(m | 0, 0, 2);
      dnPaint();
    },
  };
})();