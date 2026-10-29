/* ============ CORE: đăng ký đối tượng theo mã duy nhất ============ */
function makeRegistry(name) {
  const m = new Map();
  return {
    register(o) {
      if (!o.code) throw Error(name + ": thiếu code");
      if (m.has(o.code)) throw Error(name + ": trùng mã " + o.code);
      m.set(o.code, o);
      return o;
    },
    get: (c) => m.get(c),
    all: () => [...m.values()],
    remove: (c) => m.delete(c),
    clear: () => m.clear(),
  };
}
const ShelfRegistry = makeRegistry("Quầy"),
  StaffRegistry = makeRegistry("Nhân viên");
const $ = (s) => document.querySelector(s),
  PI = Math.PI;

/* ============ CỬA HÀNG · DỮ LIỆU (mỗi quầy một khối riêng) ============
   Mã: Z<khu>-<loại><số>. pos=[x,z] · size=[độ dày, chiều dài] · rot=góc xoay (rad), mặt trước = +x cục bộ
   Quầy thêm mới có mã dạng X-<loại><số>. details: chỗ bổ sung chi tiết sau này. */
const STORE = { W: 14, D: 30, door: [0.5, 6.5], kho: [4.8, 6.6] };

/* ====== VỊ TRÍ CỬA (đổi được trong Chỉnh sửa → "Sửa vị trí cửa") ====== */
const DOOR_W = 6 /* bề rộng lỗ cửa */,
  DOOR_LIM = STORE.W / 2 - DOOR_W / 2 - 0.5 /* = 3.5 */,
  DOOR_KEY = "store-door-v1";
const clampDoor = (x) =>
  Math.round(Math.max(-DOOR_LIM, Math.min(DOOR_LIM, +x || 0)) * 2) / 2;
let doorDX = 3.5; /* mặc định giống bản cũ (cửa bên phải) */
try {
  const s = JSON.parse(localStorage.getItem(DOOR_KEY));
  if (s && isFinite(s.dx)) doorDX = clampDoor(s.dx);
} catch (e) {}
STORE.door = [doorDX - DOOR_W / 2, doorDX + DOOR_W / 2];
/* ====== VỊ TRÍ CỬA: "left" | "center" | "right" | hoặc số x bất kỳ ====== */
const DOOR_POS = "left"; /* "right" = đúng như bản cũ */
{
  const lim = STORE.W / 2 - DOOR_W / 2 - 0.5; /* = 3.5, chừa 0.5m mép tường */
  const dx =
    DOOR_POS === "left"
      ? -lim
      : DOOR_POS === "right"
        ? lim
        : DOOR_POS === "center"
          ? 0
          : Math.max(-lim, Math.min(lim, +DOOR_POS || 0));
  STORE.door = [dx - DOOR_W / 2, dx + DOOR_W / 2];
}
const R = ShelfRegistry.register;
R({
  code: "CASHIER_001",
  name: "Quầy thu ngân 1",
  type: "cashier",
  sides: 1,
  pos: [-4.8, 13],
  rot: PI / 2,
  size: [0.9, 2.2],
  details: {},
});
R({
  code: "CASHIER_002",
  name: "Quầy thu ngân 2",
  type: "cashier",
  sides: 1,
  pos: [-2, 13],
  rot: PI / 2,
  size: [0.9, 2.2],
  details: {},
});
R({
  code: "SHELF_001",
  name: "Kệ giữa cụm 1",
  type: "shelf",
  sides: 2,
  pos: [0, 7.5],
  rot: 0,
  size: [1.4, 5],
  details: { soTang: 3 },
});
R({
  code: "SHELF_002",
  name: "Kệ tường trái cụm 1",
  type: "shelf",
  sides: 1,
  pos: [-6.6, 7.5],
  rot: 0,
  size: [0.8, 5],
  details: { soTang: 3 },
});
R({
  code: "SHELF_003",
  name: "Kệ tường phải cụm 1",
  type: "shelf",
  sides: 1,
  pos: [6.6, 7.5],
  rot: PI,
  size: [0.8, 5],
  details: { soTang: 3 },
});
R({
  code: "SHELF_004",
  name: "Kệ giữa cụm 2",
  type: "shelf",
  sides: 2,
  pos: [0, 0.5],
  rot: 0,
  size: [1.4, 5],
  details: { soTang: 3 },
});
R({
  code: "SHELF_005",
  name: "Kệ tường trái cụm 2",
  type: "shelf",
  sides: 1,
  pos: [-6.6, 0.5],
  rot: 0,
  size: [0.8, 5],
  details: { soTang: 3 },
});
R({
  code: "SHELF_006",
  name: "Kệ tường phải cụm 2",
  type: "shelf",
  sides: 1,
  pos: [6.6, 0.5],
  rot: PI,
  size: [0.8, 5],
  details: { soTang: 3 },
});
R({
  code: "VEGETABLE_SHELF_001",
  name: "Quầy rau củ",
  type: "produce",
  sides: 2,
  pos: [0, -8.5],
  rot: 0,
  size: [1.6, 3.8],
  details: {},
});
R({
  code: "COLD_SHELF_001",
  name: "Quầy hàng lạnh (sữa)",
  type: "cold",
  sides: 1,
  pos: [-4.2, -13.8],
  rot: -PI / 2,
  size: [1, 5],
  details: {},
});
R({
  code: "RICE_SHELF_001",
  name: "Khu gạo",
  type: "rice",
  sides: 1,
  pos: [1.6, -13.8],
  rot: -PI / 2,
  size: [1.1, 4.6],
  details: {},
});
const TYPES = {
  shelf: ["Kệ hàng", "SHELF"],
  produce: ["Quầy rau củ", "VEGETABLE_SHELF"],
  cold: ["Tủ mát", "COLD_SHELF"],
  freezer: ["Tủ đông", "FREEZER"],
  rice: ["Khu gạo", "RICE_SHELF"],
  cashier: ["Quầy thu ngân", "CASHIER"],
  display: ["Pallet khuyến mãi", "DISPLAY"],
};
const PRESETS = [
  ["Kệ 2 mặt", "shelf", 2, [1.4, 5]],
  ["Kệ 1 mặt", "shelf", 1, [0.8, 5]],
  ["Quầy rau củ", "produce", 2, [1.6, 3.6]],
  ["Tủ mát", "cold", 1, [1, 4]],
  ["Tủ đông", "freezer", 1, [1, 2.4]],
  ["Khu gạo", "rice", 1, [1.1, 3.6]],
  ["Quầy thu ngân", "cashier", 1, [0.9, 2.2]],
  ["Pallet KM", "display", 1, [1.2, 1.2]],
];
const DEFAULT_LAYOUT = JSON.stringify(ShelfRegistry.all());
const KEY = "store-layout-v3";
try {
  const s = JSON.parse(localStorage.getItem(KEY));
  if (Array.isArray(s) && s.length) {
    ShelfRegistry.clear();
    s.forEach(R);
  }
} catch (e) {}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ShelfRegistry.all()));
  } catch (e) {}
};

/* ============ 3D: vật liệu & hình khối bo góc ============ */
const mc = {},
  gc = {};
const M = (c, r = 0.7, m = 0) =>
  mc[c + "|" + r + "|" + m] ||
  (mc[c + "|" + r + "|" + m] = new THREE.MeshStandardMaterial({
    color: c,
    roughness: r,
    metalness: m,
  }));
const GLASS = new THREE.MeshStandardMaterial({
  color: 0xcfe8ff,
  roughness: 0.05,
  transparent: true,
  opacity: 0.22,
});
/* =====================================================================
   LAG-FIX – gộp mesh theo vật liệu. Dán các khối bên dưới vào script.js
   (xem hướng dẫn từng bước trong tin nhắn). Không cần thư viện ngoài.
   ===================================================================== */

/* ---------- BƯỚC 1: thay hàm geo() cũ (khoảng dòng 187) ----------
   Vật nhỏ (sản phẩm, thẻ giá, chi tiết) dùng hộp thường thay cho ExtrudeGeometry
   bo góc: ít đỉnh hơn ~15 lần mà nhìn từ xa gần như y hệt.
   Gốc toạ độ giữ nguyên: x,z ở giữa, y từ 0 → h.                               */
function geo(w, h, d, r) {
  const k = [w, h, d, r] + "";
  if (gc[k]) return gc[k];
  /* vật nhỏ hoặc mỏng → hộp thường */
  if (Math.min(w, h, d) < 0.06 || Math.max(w, h, d) < 0.35) {
    const bg = new THREE.BoxGeometry(w, h, d);
    bg.translate(0, h / 2, 0);
    return (gc[k] = bg);
  }
  const b = Math.min(r, 0.02, w / 3, d / 3, h / 3),
    W = w - 2 * b,
    D = d - 2 * b,
    q = Math.max(0.001, Math.min(r, W / 2, D / 2)),
    x = -W / 2,
    y = -D / 2,
    s = new THREE.Shape();
  s.moveTo(x + q, y);
  s.lineTo(x + W - q, y);
  s.quadraticCurveTo(x + W, y, x + W, y + q);
  s.lineTo(x + W, y + D - q);
  s.quadraticCurveTo(x + W, y + D, x + W - q, y + D);
  s.lineTo(x + q, y + D);
  s.quadraticCurveTo(x, y + D, x, y + D - q);
  s.lineTo(x, y + q);
  s.quadraticCurveTo(x, y, x + q, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.001, h - 2 * b),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 1 /* 2 → 1 */,
    curveSegments: 2 /* 3 → 2 */,
  });
  g.rotateX(-PI / 2);
  g.translate(0, b, 0);
  return (gc[k] = g);
}
function rb(w, h, d, mat, x, y, z, p, r = 0.04) {
  const m = new THREE.Mesh(
    geo(w, h, d, r),
    typeof mat === "number" ? M(mat) : mat,
  );
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  p.add(m);
  return m;
}
function rng(str) {
  let h = 7;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return () => (
    (h = (Math.imul(h ^ (h >>> 15), 2246822507) + 1013904223) | 0),
    ((h >>> 0) % 1000) / 1000
  );
}
const PAL = [
  0xe8504a, 0xf5a742, 0x4fa3f7, 0x6cc070, 0xf2e2c4, 0xb48cf0, 0xff8fb1,
  0xf7d046,
];

/* Bộ dựng từng loại quầy: it.size=[w dày, d dài]; mặt trước = +x */
/* =====================================================================
   BUILD v2 – QUẦY SIÊU THỊ CHI TIẾT
   Giả định các helper sẵn có trong dự án của bạn (giữ nguyên chữ ký cũ):
     THREE, rb(w,h,d,color,x,y,z,g,radius)  -> trả về mesh, y = đáy hộp
     rng(seed) -> hàm random 0..1,  PAL (mảng màu),  M(color,roughness),  GLASS
   Thân quầy: kích thước it.size = [w, d]; it.sides, it.code, it.details.soTang
   ===================================================================== */

/* ========================= BẢNG MÀU THEO NGÀNH ========================= */
const P_NOODLE = [
  0xe53935, 0xff7043, 0xfdd835, 0xffb300, 0xf4511e, 0xc62828, 0xfff176,
  0x43a047,
];
const P_SNACK = [
  0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xfb8c00, 0x8e24aa, 0xec407a,
  0x00acc1, 0xffffff,
];
const P_SAUCE = [
  0x8d4a1b, 0xc7791f, 0xd8a31a, 0x9a2a1f, 0x2e7d32, 0xf3e2a9, 0x4e342e,
  0xe64a19,
];
const P_HOME = [
  0x1e88e5, 0x26a69a, 0xec407a, 0x7e57c2, 0x66bb6a, 0x29b6f6, 0xffa726,
  0xffffff,
];
const P_DRINK = [
  0xe53935, 0x1e88e5, 0x43a047, 0xfb8c00, 0xfdd835, 0x8e24aa, 0xffffff,
  0x00acc1,
];
const P_FROZ = [
  0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xfb8c00, 0x8e24aa, 0xec407a,
  0x00acc1,
];
const P_ICE = [
  0xf48fb1, 0x81d4fa, 0xfff59d, 0xa5d6a7, 0xce93d8, 0xffcc80, 0x8d6e63,
  0xffffff,
];

/* ============================ HELPER CHUNG ============================ */
const pick = (a, rd) => a[Math.floor(rd() * a.length)];

/* Texture chữ (canvas) – có cache để không tạo trùng */
const _tex = new Map();
function labelTex(text, bg, fg, ar = 2) {
  const key = text + "|" + bg + "|" + fg + "|" + ar;
  if (_tex.has(key)) return _tex.get(key);
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = Math.max(32, Math.round(512 / ar));
  const c = cv.getContext("2d");
  c.fillStyle = bg;
  c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = "rgba(255,255,255,.55)";
  c.lineWidth = 5;
  c.strokeRect(5, 5, cv.width - 10, cv.height - 10);
  c.fillStyle = fg;
  c.textAlign = "center";
  c.textBaseline = "middle";
  let size = Math.round(cv.height * 0.6);
  c.font = `bold ${size}px Arial`;
  while (c.measureText(text).width > cv.width * 0.9 && size > 12) {
    size -= 3;
    c.font = `bold ${size}px Arial`;
  }
  c.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  _tex.set(key, t);
  return t;
}
/* Bảng hiệu phẳng: (x,y,z) là tâm, ry = xoay quanh Y (π/2 = hướng +x) */
const _smat =
  new Map(); /* cache vật liệu biển hiệu: cùng chữ/màu/glow → dùng chung 1 material để gộp mesh được */
function sign(g, text, bg, fg, w, h, x, y, z, ry = 0, glow = 0) {
  const sk = text + "|" + bg + "|" + fg + "|" + (w / h).toFixed(2) + "|" + glow;
  let mat = _smat.get(sk);
  if (!mat) {
    const tex = labelTex(text, bg, fg, w / h);
    mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
    if (glow) {
      mat.emissive = new THREE.Color(0xffffff);
      mat.emissiveMap = tex;
      mat.emissiveIntensity = glow;
    }
    _smat.set(sk, mat);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}
const _gmat = new Map();
function glowMat(c, e, i = 0.9) {
  const k = c + "|" + e + "|" + i;
  let m = _gmat.get(k);
  if (!m)
    _gmat.set(
      k,
      (m = new THREE.MeshStandardMaterial({
        color: c,
        emissive: e,
        emissiveIntensity: i,
      })),
    );
  return m;
}
const wrapMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.22,
  roughness: 0.1,
});

function cyl(rt, rbm, h, c, x, y, z, g, seg = 14, rough = 0.5) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rbm, h, seg),
    M(c, rough),
  );
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  g.add(m);
  return m;
}
/* trụ nằm: trục theo z / theo x, y là TÂM */
function cylZ(r, len, c, x, yc, z, g, seg = 10) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, len, seg),
    M(c, 0.6),
  );
  m.position.set(x, yc, z);
  m.rotation.x = Math.PI / 2;
  m.castShadow = true;
  g.add(m);
  return m;
}
function cylX(r, len, c, x, yc, z, g, seg = 10) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, len, seg),
    M(c, 0.6),
  );
  m.position.set(x, yc, z);
  m.rotation.z = Math.PI / 2;
  m.castShadow = true;
  g.add(m);
  return m;
}
function sph(r, c, x, yc, z, g, sx = 1, sy = 1, sz = 1, rough = 0.6) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), M(c, rough));
  m.position.set(x, yc, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  g.add(m);
  return m;
}
function cone(r, len, c, x, yc, z, g, rz = 0, rx = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, len, seg), M(c, 0.6));
  m.position.set(x, yc, z);
  m.rotation.set(rx, 0, rz);
  m.castShadow = true;
  g.add(m);
  return m;
}
function torus(R, r, c, x, yc, z, g, rx = Math.PI / 2, arc = Math.PI * 2) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(R, r, 8, 16, arc),
    M(c, 0.6),
  );
  m.position.set(x, yc, z);
  m.rotation.x = rx;
  m.castShadow = true;
  g.add(m);
  return m;
}

/* ============================ SẢN PHẨM ============================
   kind: bottle | can | box | bag | cup | jar | carton | tube | detergent
         | cupy (hũ sữa chua) | tub (hộp kem)
   s = hướng mặt trước (+1 / -1 theo trục x); (x,y,z): y = đáy sản phẩm      */
function prod(g, kind, x, y, z, s, c, c2, h, rd) {
  switch (kind) {
    case "bottle": {
      const r = 0.04;
      cyl(r, r, h * 0.62, c, x, y, z, g, 12, 0.25);
      cyl(r * 0.42, r, h * 0.16, c, x, y + h * 0.62, z, g, 12, 0.25);
      cyl(r * 0.42, r * 0.42, h * 0.1, c, x, y + h * 0.78, z, g, 10, 0.25);
      cyl(r * 0.5, r * 0.5, h * 0.08, c2, x, y + h * 0.88, z, g, 10, 0.4);
      cyl(r + 0.002, r + 0.002, h * 0.28, c2, x, y + h * 0.16, z, g, 12, 0.5);
      break;
    }
    case "can": {
      const r = 0.034,
        hh = Math.min(h, 0.14);
      cyl(r, r, hh, c, x, y, z, g, 14, 0.25);
      cyl(r + 0.001, r + 0.001, hh * 0.4, c2, x, y + hh * 0.3, z, g, 14, 0.4);
      cyl(r * 0.88, r, 0.012, 0xcfd2d8, x, y + hh - 0.012, z, g, 14, 0.2);
      break;
    }
    case "box": {
      rb(0.15, h, 0.2, c, x, y, z, g, 0.012);
      rb(0.006, h * 0.62, 0.15, c2, x + s * 0.075, y + h * 0.12, z, g, 0.003);
      rb(
        0.008,
        h * 0.22,
        0.1,
        0xffffff,
        x + s * 0.075,
        y + h * 0.62,
        z,
        g,
        0.003,
      );
      break;
    }
    case "bag": {
      rb(0.13, h, 0.2, c, x, y, z, g, 0.05);
      rb(0.1, 0.02, 0.2, c2, x, y + h - 0.012, z, g, 0.005);
      rb(0.1, 0.014, 0.2, c2, x, y, z, g, 0.005);
      rb(0.008, h * 0.5, 0.14, c2, x + s * 0.066, y + h * 0.25, z, g, 0.004);
      rb(
        0.01,
        h * 0.18,
        0.09,
        0xffffff,
        x + s * 0.068,
        y + h * 0.47,
        z,
        g,
        0.004,
      );
      break;
    }
    case "cup": {
      cyl(0.05, 0.035, h * 0.86, c, x, y, z, g, 14, 0.5);
      cyl(0.0455, 0.0385, h * 0.34, c2, x, y + h * 0.24, z, g, 14, 0.5);
      cyl(0.053, 0.053, 0.015, c2, x, y + h * 0.86, z, g, 14, 0.4);
      break;
    }
    case "jar": {
      cyl(0.04, 0.04, h * 0.7, c, x, y, z, g, 14, 0.25);
      cyl(0.042, 0.042, h * 0.14, c2, x, y + h * 0.7, z, g, 14, 0.4);
      cyl(0.0415, 0.0415, h * 0.28, c2, x, y + h * 0.18, z, g, 14, 0.5);
      break;
    }
    case "carton": {
      rb(0.095, h * 0.75, 0.095, c, x, y, z, g, 0.006);
      rb(0.095, h * 0.12, 0.095, 0xffffff, x, y + h * 0.75, z, g, 0.004);
      rb(0.07, h * 0.1, 0.03, 0xffffff, x, y + h * 0.87, z, g, 0.003);
      cyl(0.012, 0.012, 0.012, c2, x, y + h * 0.97, z, g, 8);
      rb(0.004, h * 0.4, 0.07, c2, x + s * 0.048, y + h * 0.18, z, g, 0.002);
      break;
    }
    case "tube": {
      cyl(0.04, 0.04, h, c, x, y, z, g, 14, 0.5);
      cyl(0.042, 0.042, 0.012, c2, x, y + h, z, g, 14, 0.4);
      cyl(0.0415, 0.0415, h * 0.4, c2, x, y + h * 0.3, z, g, 14, 0.5);
      break;
    }
    case "detergent": {
      rb(0.12, h * 0.78, 0.17, c, x, y, z, g, 0.03);
      rb(0.07, h * 0.14, 0.1, c, x, y + h * 0.78, z, g, 0.02);
      cyl(0.022, 0.022, h * 0.08, c2, x, y + h * 0.92, z, g, 10, 0.4);
      rb(0.006, h * 0.42, 0.12, c2, x + s * 0.062, y + h * 0.18, z, g, 0.003);
      rb(
        0.008,
        h * 0.14,
        0.08,
        0xffffff,
        x + s * 0.064,
        y + h * 0.42,
        z,
        g,
        0.003,
      );
      break;
    }
    case "cupy": {
      cyl(0.036, 0.028, h * 0.78, c, x, y, z, g, 12, 0.5);
      cyl(0.037, 0.037, 0.008, 0xe0e0e6, x, y + h * 0.78, z, g, 12, 0.2);
      cyl(0.034, 0.03, h * 0.3, c2, x, y + h * 0.22, z, g, 12, 0.5);
      break;
    }
    case "tub": {
      cyl(0.05, 0.043, h * 0.8, c, x, y, z, g, 14, 0.5);
      cyl(0.052, 0.052, h * 0.18, c2, x, y + h * 0.8, z, g, 14, 0.4);
      cyl(0.0495, 0.0445, h * 0.3, 0xffffff, x, y + h * 0.25, z, g, 14, 0.5);
      break;
    }
    default:
      rb(0.15, h, 0.2, c, x, y, z, g, 0.012);
  }
}
const FP = {
  bottle: 0.1,
  can: 0.075,
  box: 0.17,
  bag: 0.15,
  cup: 0.115,
  jar: 0.095,
  carton: 0.105,
  tube: 0.09,
  detergent: 0.15,
  cupy: 0.08,
  tub: 0.115,
};
const MAXH = {
  bottle: 0.34,
  can: 0.13,
  box: 0.3,
  bag: 0.26,
  cup: 0.11,
  jar: 0.16,
  carton: 0.22,
  tube: 0.24,
  detergent: 0.3,
  cupy: 0.07,
  tub: 0.11,
};

/* Xếp một hàng hàng hoá dọc theo z, nhiều hàng sâu theo x; có thẻ giá nếu truyền tagX */
function fillRow(
  g,
  kind,
  s,
  xs,
  y,
  th,
  z0,
  z1,
  rd,
  pal,
  gap = 0.1,
  tagX,
  tagY,
) {
  const fp = (FP[kind] || 0.15) * 1.06,
    n = Math.max(1, Math.floor((z1 - z0) / fp)),
    span = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    const z = z0 + span * (i + 0.5);
    if (tagX !== undefined)
      rb(
        0.014,
        0.032,
        Math.min(0.08, span * 0.8),
        i % 3 === 2 ? 0xfdd835 : 0xe53935,
        tagX,
        tagY,
        z,
        g,
        0.004,
      );
  }
  xs.forEach((x) => {
    for (let i = 0; i < n; i++) {
      if (rd() < gap) continue;
      const c = pick(pal, rd),
        c2 = rd() > 0.5 ? 0xffffff : pick(pal, rd),
        h = Math.min(th * (0.82 + rd() * 0.16), MAXH[kind] || 0.3),
        z = z0 + span * (i + 0.5);
      prod(g, kind, x, y, z, s, c, c2, h, rd);
      if (kind === "can" && th > 0.3 && rd() > 0.4)
        prod(g, kind, x, y + h, z, s, c, c2, h, rd);
    }
  });
}

/* ===================== KỆ GONDOLA DÙNG CHUNG ===================== */
function gondola(it, g, cfg = {}) {
  const [w, d] = it.size,
    H = cfg.H || 1.75,
    two = it.sides === 2,
    rd = rng(it.code),
    T = (it.details && it.details.soTang) || cfg.tiers || 4,
    kinds = cfg.kinds || ["bottle", "box", "jar", "bag", "can"],
    pal = cfg.pal || PAL,
    acc = cfg.accent || 0x1e88e5,
    sides = two ? [-1, 1] : [1],
    sp = two ? 0 : -w / 2 + 0.02,
    th = (H - 0.25) / T - 0.06;
  /* đế + chân kệ */
  rb(w, 0.1, d, 0x8e8e93, 0, 0, 0, g, 0.02);
  rb(w - 0.06, 0.05, d - 0.06, 0x55555b, 0, 0, 0, g, 0.01);
  /* hai đầu kệ + dải màu ngành hàng */
  [-1, 1].forEach((s) => {
    rb(w, H, 0.04, 0xd9d9de, 0, 0, s * (d / 2 - 0.02), g, 0.01);
    rb(w * 0.98, 0.06, 0.045, acc, 0, H - 0.14, s * (d / 2 - 0.02), g, 0.005);
  });
  /* lưng kệ + thanh trụ có lỗ */
  rb(0.04, H, d, 0xe6e6ea, sp, 0, 0, g, 0.01);
  const np = Math.max(2, Math.floor(d / 0.9) + 1);
  for (let i = 0; i < np; i++)
    rb(
      0.06,
      H,
      0.03,
      0xbfc0c6,
      sp,
      0,
      -d / 2 + 0.02 + (i * (d - 0.04)) / (np - 1),
      g,
      0.004,
    );
  /* các tầng */
  for (let t = 0; t < T; t++) {
    const y = 0.12 + (t * (H - 0.25)) / T;
    rb(w, 0.03, d - 0.08, 0xc7c7cc, 0, y, 0, g, 0.01);
    sides.forEach((s) => {
      const kind = pick(kinds, rd),
        xs = [s * (w / 2 - 0.13)];
      if (w / 2 - 0.3 > 0.06) xs.push(s * (w / 2 - 0.3));
      rb(0.014, 0.045, d - 0.1, 0xf4f4f6, s * (w / 2 - 0.005), y, 0, g, 0.004);
      fillRow(
        g,
        kind,
        s,
        xs,
        y + 0.03,
        th,
        -d / 2 + 0.1,
        d / 2 - 0.1,
        rd,
        pal,
        0.1,
        s * (w / 2 + 0.004),
        y + 0.006,
      );
    });
  }
  rb(w, 0.05, d, 0xf2f2f4, 0, H, 0, g, 0.02);
  /* biển hiệu ngành hàng trên nóc */
  const Lw = Math.min(d - 0.1, 1.7);
  rb(0.05, 0.36, Lw, 0x2b2d33, sp, H + 0.05, 0, g, 0.01);
  if (two) {
    sign(
      g,
      cfg.title || "TẠP HÓA",
      cfg.signBg || "#1e88e5",
      "#ffffff",
      Lw - 0.04,
      0.3,
      0.027,
      H + 0.23,
      0,
      Math.PI / 2,
      0.35,
    );
    sign(
      g,
      cfg.title || "TẠP HÓA",
      cfg.signBg || "#1e88e5",
      "#ffffff",
      Lw - 0.04,
      0.3,
      -0.027,
      H + 0.23,
      0,
      -Math.PI / 2,
      0.35,
    );
  } else
    sign(
      g,
      cfg.title || "TẠP HÓA",
      cfg.signBg || "#1e88e5",
      "#ffffff",
      Lw - 0.04,
      0.3,
      sp + 0.027,
      H + 0.23,
      0,
      Math.PI / 2,
      0.35,
    );
}

/* =================== THỊT / HẢI SẢN – HELPER RIÊNG =================== */
function meatTray(g, x, y, z, type, rd) {
  rb(0.23, 0.03, 0.16, 0xf7f5ee, x, y, z, g, 0.01);
  const t = y + 0.03;
  if (type === "pork") {
    for (let k = 0; k < 3; k++) {
      rb(0.065, 0.03, 0.05, 0xf19a94, x - 0.07 + k * 0.07, t, z, g, 0.012);
      rb(
        0.065,
        0.008,
        0.012,
        0xfff0e0,
        x - 0.07 + k * 0.07,
        t + 0.028,
        z + 0.02,
        g,
        0.003,
      );
    }
  } else if (type === "beef") {
    rb(0.2, 0.032, 0.1, 0xa31515, x, t, z, g, 0.014);
    for (let k = 0; k < 4; k++)
      rb(
        0.15,
        0.003,
        0.006,
        0xf3c9c9,
        x + (rd() - 0.5) * 0.03,
        t + 0.031,
        z - 0.035 + k * 0.024,
        g,
        0.002,
      );
  } else if (type === "chicken") {
    for (let k = 0; k < 3; k++) {
      sph(0.032, 0xf0c27a, x - 0.06 + k * 0.06, t + 0.022, z, g, 1.1, 0.8, 1.3);
      cylZ(
        0.007,
        0.07,
        0xf3ead7,
        x - 0.06 + k * 0.06,
        t + 0.018,
        z + 0.07,
        g,
        6,
      );
    }
  } else if (type === "ribs") {
    rb(0.2, 0.035, 0.11, 0xe8a58f, x, t, z, g, 0.012);
    for (let k = 0; k < 4; k++)
      rb(
        0.2,
        0.004,
        0.008,
        0xf3ead7,
        x,
        t + 0.034,
        z - 0.04 + k * 0.027,
        g,
        0.002,
      );
  } else if (type === "mince") {
    sph(0.09, 0xe58a86, x, t + 0.005, z, g, 1, 0.4, 0.75);
    for (let k = 0; k < 3; k++)
      rb(
        0.14,
        0.002,
        0.004,
        0xd8736f,
        x,
        t + 0.034,
        z - 0.03 + k * 0.03,
        g,
        0.001,
      );
  } else {
    for (let k = 0; k < 4; k++)
      cylX(0.017, 0.2, 0xb5483b, x, t + 0.017, z - 0.05 + k * 0.034, g, 8);
  }
  const f = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.07, 0.165), wrapMat);
  f.position.set(x, y + 0.045, z);
  g.add(f);
  rb(0.07, 0.002, 0.045, 0xffee58, x + 0.07, y + 0.074, z + 0.045, g, 0.001);
}
function fish(g, x, y, z, c, L, ry) {
  const f = new THREE.Group();
  sph(L * 0.3, c, 0, 0.03, 0, f, 1.6, 0.55, 0.5, 0.35);
  sph(L * 0.28, 0xeceff1, 0, 0.018, 0, f, 1.5, 0.3, 0.46, 0.35);
  cone(L * 0.14, L * 0.24, c, -L * 0.52, 0.03, 0, f, -Math.PI / 2, 0, 3);
  cone(L * 0.07, L * 0.16, c, 0, 0.03 + L * 0.15, 0, f, 0, 0, 3);
  [-1, 1].forEach((s) =>
    sph(L * 0.03, 0x111111, L * 0.36, 0.05, s * L * 0.1, f),
  );
  f.position.set(x, y, z);
  f.rotation.y = ry;
  g.add(f);
}
function crab(g, x, y, z, ry) {
  const f = new THREE.Group();
  sph(0.055, 0xd84315, 0, 0.035, 0, f, 1.1, 0.5, 1.2);
  [-1, 1].forEach((s) => {
    sph(0.03, 0xe64a19, 0.06, 0.04, s * 0.1, f, 1.2, 0.8, 1);
    for (let k = 0; k < 3; k++)
      rb(
        0.007,
        0.007,
        0.07,
        0xbf360c,
        -0.04 + k * 0.035,
        0.03,
        s * 0.095,
        f,
        0.002,
      );
    sph(0.007, 0x111111, 0.05, 0.065, s * 0.025, f);
  });
  f.position.set(x, y, z);
  f.rotation.y = ry;
  g.add(f);
}
function shrimp(g, x, y, z, ry) {
  const f = new THREE.Group();
  for (let k = 0; k < 5; k++)
    sph(
      0.017 - k * 0.0015,
      0xf4a28c,
      k * 0.022,
      0.015 + Math.sin(k * 0.7) * 0.02,
      0,
      f,
      1,
      0.9,
      1,
    );
  cone(0.012, 0.03, 0xe57373, 0.12, 0.02, 0, f, -Math.PI / 2, 0, 3);
  f.position.set(x, y, z);
  f.rotation.y = ry;
  g.add(f);
}
function squid(g, x, y, z, ry) {
  const f = new THREE.Group();
  sph(0.035, 0xf3e5e0, 0, 0.03, 0, f, 2.6, 0.7, 0.7);
  for (let k = 0; k < 4; k++)
    rb(0.08, 0.008, 0.008, 0xe6c9c0, -0.12, 0.016, -0.015 + k * 0.01, f, 0.002);
  cone(0.03, 0.05, 0xe0b9ae, 0.1, 0.03, 0, f, -Math.PI / 2, 0, 3);
  f.position.set(x, y, z);
  f.rotation.y = ry;
  g.add(f);
}

/* ======================== QUẦY RAU CỦ QUẢ ======================== */
const FRUIT_NAME = {
  apple: "TÁO",
  orange: "CAM",
  lemon: "CHANH",
  tomato: "CÀ CHUA",
  banana: "CHUỐI",
  cabbage: "BẮP CẢI",
  carrot: "CÀ RỐT",
  eggplant: "CÀ TÍM",
  corn: "BẮP",
  potato: "KHOAI TÂY",
  cucumber: "DƯA LEO",
  broccoli: "SÚP LƠ",
  grape: "NHO",
  chili: "ỚT",
};
const FRUIT_BG = {
  apple: "#c62828",
  orange: "#ef6c00",
  lemon: "#9e9d24",
  tomato: "#d32f2f",
  banana: "#f9a825",
  cabbage: "#2e7d32",
  carrot: "#e65100",
  eggplant: "#6a1b9a",
  corn: "#f9a825",
  potato: "#795548",
  cucumber: "#2e7d32",
  broccoli: "#388e3c",
  grape: "#6a1b9a",
  chili: "#b71c1c",
};
function fruit(g, kind, x, y, z, rd) {
  const j = () => (rd() - 0.5) * 0.02;
  x += j();
  z += j();
  switch (kind) {
    case "apple":
      sph(
        0.05,
        rd() > 0.3 ? 0xd32f2f : 0xc0ca33,
        x,
        y + 0.046,
        z,
        g,
        1,
        0.92,
        1,
        0.35,
      );
      cyl(0.003, 0.003, 0.02, 0x5d4037, x, y + 0.08, z, g, 5);
      break;
    case "orange":
      sph(0.055, 0xfb8c00, x, y + 0.055, z, g, 1, 0.95, 1, 0.8);
      break;
    case "lemon":
      sph(0.042, 0xe6ee33, x, y + 0.037, z, g, 1.3, 0.85, 0.85, 0.7);
      break;
    case "tomato":
      sph(0.046, 0xe53935, x, y + 0.04, z, g, 1, 0.85, 1, 0.35);
      sph(0.022, 0x43a047, x, y + 0.076, z, g, 1, 0.4, 1);
      break;
    case "banana":
      [-1, 0, 1].forEach((k) => {
        const m = cylZ(
          0.017,
          0.17,
          0xfdd835,
          x + k * 0.034,
          y + 0.025 + (k === 0 ? 0.018 : 0),
          z,
          g,
          8,
        );
        m.rotation.z = k * 0.12;
        cylZ(
          0.008,
          0.02,
          0x5d4037,
          x + k * 0.034,
          y + 0.025 + (k === 0 ? 0.018 : 0),
          z + 0.095,
          g,
          6,
        );
      });
      break;
    case "cabbage":
      sph(0.08, 0x7cb342, x, y + 0.07, z, g, 1, 0.9, 1);
      sph(0.065, 0xaed581, x, y + 0.09, z, g, 1, 0.8, 1);
      break;
    case "carrot":
      cone(0.018, 0.17, 0xfb6a00, x, y + 0.02, z, g, 0, Math.PI / 2);
      cone(0.012, 0.04, 0x388e3c, x, y + 0.02, z - 0.1, g, 0, -Math.PI / 2, 5);
      break;
    case "eggplant":
      sph(0.04, 0x4a148c, x, y + 0.035, z, g, 0.8, 0.8, 2.0, 0.3);
      sph(0.02, 0x2e7d32, x, y + 0.04, z + 0.085, g, 1, 0.7, 0.8);
      break;
    case "corn":
      cylZ(0.025, 0.17, 0xfdd835, x, y + 0.025, z, g, 10);
      sph(0.032, 0x66bb6a, x, y + 0.028, z - 0.07, g, 1, 0.9, 1.5);
      break;
    case "potato":
      sph(0.05, 0xb08a5a, x, y + 0.04, z, g, 1.2, 0.8, 0.9, 0.9);
      break;
    case "cucumber":
      cylZ(0.022, 0.17, 0x2e7d32, x, y + 0.022, z, g, 8);
      break;
    case "broccoli":
      sph(0.055, 0x2e7d32, x, y + 0.075, z, g, 1, 0.8, 1);
      cyl(0.014, 0.018, 0.045, 0x9ccc65, x, y, z, g, 6);
      break;
    case "grape":
      for (let k = 0; k < 9; k++)
        sph(
          0.019,
          0x6a1b9a,
          x + ((k % 3) - 1) * 0.034,
          y + 0.02 + Math.floor(k / 3) * 0.022,
          z + (k % 2) * 0.03 - 0.015,
          g,
          1,
          1,
          1,
          0.3,
        );
      break;
    case "chili":
      for (let k = 0; k < 4; k++)
        cylZ(
          0.009,
          0.1,
          0xd50000,
          x + (k - 1.5) * 0.02,
          y + 0.01 + (k % 2) * 0.012,
          z,
          g,
          6,
        );
      break;
    default:
      sph(0.05, 0x7cb342, x, y + 0.05, z, g);
  }
}
/* ───────────── (1) THAY HÀM crate() CŨ ───────────── */
/* y0 = mặt bàn đặt rổ (mặc định 0.45 như cũ), tilt = góc nghiêng (rad, mặc định ~7°).
   Mặt trước (phía khách, hướng s) hạ thấp, mặt sau nâng lên → khách nhìn rõ rau củ.
   Điểm xoay = mép dưới phía trước, nên mép trước rổ không bị chìm vào bàn. */
function crate(g, cx, cz, s, kind, rd, y0 = 0.45, tilt = 0.12, stack = true) {
  const P = new THREE.Group(),
    Q = new THREE.Group(),
    px = cx + s * 0.31;
  P.position.set(px, y0, cz);
  P.rotation.z = -s * tilt;
  Q.position.set(-px, -y0, -cz);
  P.add(Q);
  g.add(P);

  rb(0.62, 0.2, 0.7, 0xd2b48c, cx, y0, cz, Q, 0.02);
  [0.04, 0.1, 0.16].forEach((hh) =>
    rb(0.628, 0.025, 0.708, 0xb88f5a, cx, y0 + hh, cz, Q, 0.006),
  );
  [-1, 1].forEach((a) =>
    [-1, 1].forEach((b) =>
      rb(
        0.05,
        0.2,
        0.05,
        0x8a6b45,
        cx + a * 0.285,
        y0,
        cz + b * 0.325,
        Q,
        0.01,
      ),
    ),
  );
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 4; j++) {
      fruit(Q, kind, cx + (i - 1) * 0.18, y0 + 0.2, cz + (j - 1.5) * 0.17, rd);
      /* dòng này: thêm "stack &&" */
      if (stack && i === 1 && (j === 1 || j === 2))
        fruit(Q, kind, cx, y0 + 0.28, cz + (j - 1.5) * 0.17, rd);
    }
  rb(0.05, 0.07, 0.62, 0x8a6b45, cx - s * 0.27, y0, cz, g, 0.01);
  cyl(0.006, 0.006, 0.18, 0x888888, cx + s * 0.33, y0, cz, g, 6);
  sign(
    g,
    FRUIT_NAME[kind] || "TRÁI CÂY",
    FRUIT_BG[kind] || "#2e7d32",
    "#ffffff",
    0.24,
    0.1,
    cx + s * 0.335,
    y0 + 0.21,
    cz,
    s > 0 ? Math.PI / 2 : -Math.PI / 2,
    0.2,
  );
}

/* ====================== TỦ ĐỨNG (mát / đông) ====================== */
function coldUnit(it, g, theme) {
  const [w, d] = it.size,
    rd = rng(it.code),
    fz = theme === "frozen",
    H = 2.0,
    acc = fz ? 0x1565c0 : 0x00897b,
    accS = fz ? "#1565c0" : "#00897b",
    led = glowMat(0xffffff, fz ? 0xbfe0ff : 0xcfe8ff, 0.9);
  rb(w, 0.15, d, 0x3b3d44, 0, 0, 0, g, 0.02);
  rb(0.08, H, d, 0xe9eaee, -w / 2 + 0.04, 0, 0, g, 0.02);
  [-1, 1].forEach((s) =>
    rb(w, H, 0.07, 0xe9eaee, 0, 0, s * (d / 2 - 0.035), g, 0.02),
  );
  rb(w, 0.32, d, 0xf4f5f7, 0, H - 0.32, 0, g, 0.04);
  rb(w + 0.01, 0.06, d + 0.01, acc, 0, H - 0.2, 0, g, 0.01);
  rb(
    0.02,
    H - 0.5,
    d - 0.14,
    fz ? 0xeaf4ff : 0xf6fbff,
    -w / 2 + 0.09,
    0.18,
    0,
    g,
    0.005,
  );
  [-1, 1].forEach(
    (s) =>
      (rb(
        0.03,
        H - 0.55,
        0.03,
        0xffffff,
        w / 2 - 0.07,
        0.2,
        s * (d / 2 - 0.1),
        g,
        0.005,
      ).material = led),
  );
  rb(w - 0.3, 0.03, d - 0.14, 0xffffff, -0.03, H - 0.36, 0, g, 0.005).material =
    led;
  /* kệ + hàng */
  const NS = 5,
    step = (H - 0.54) / NS,
    th = step - 0.04,
    kindsBy = fz
      ? ["tub", "bag", "box", "tub", "bag"]
      : ["bottle", "can", "carton", "cupy", "bottle"],
    pal = fz ? P_FROZ : P_DRINK;
  for (let t = 0; t < NS; t++) {
    const y = 0.18 + t * step;
    rb(w - 0.14, 0.02, d - 0.14, 0xcfd8dc, 0, y, 0, g, 0.004);
    const xs = [];
    for (let x = w / 2 - 0.15; x > -w / 2 + 0.2 && xs.length < 3; x -= 0.15)
      xs.push(x);
    fillRow(
      g,
      kindsBy[t],
      1,
      xs,
      y + 0.02,
      th,
      -d / 2 + 0.1,
      d / 2 - 0.1,
      rd,
      pal,
      0.06,
      w / 2 - 0.045,
      y + 0.004,
    );
  }
  /* cửa kính + khung + tay nắm */
  const k = Math.max(2, Math.round(d / 0.72)),
    pw = (d - 0.14) / k,
    ph = H - 0.55;
  rb(0.05, 0.05, d - 0.14, 0x2b2d33, w / 2, 0.18, 0, g, 0.01);
  rb(0.05, 0.05, d - 0.14, 0x2b2d33, w / 2, H - 0.37, 0, g, 0.01);
  for (let i = 0; i <= k; i++) {
    const zf = -d / 2 + 0.07 + i * pw;
    rb(0.05, H - 0.5, 0.045, 0x2b2d33, w / 2, 0.18, zf, g, 0.01);
    if (i > 0 && i < k)
      cyl(0.011, 0.011, 0.4, 0xb0b3b8, w / 2 + 0.05, 0.85, zf, g, 8, 0.3);
  }
  for (let i = 0; i < k; i++) {
    const gl = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, ph, pw - 0.05),
      GLASS,
    );
    gl.position.set(w / 2, 0.18 + ph / 2, -d / 2 + 0.07 + (i + 0.5) * pw);
    g.add(gl);
  }
  sign(
    g,
    fz ? "ĐÔNG LẠNH  -18°C" : "NƯỚC • SỮA • MÁT",
    accS,
    "#ffffff",
    Math.min(d - 0.1, 1.5),
    0.2,
    w / 2 + 0.006,
    H - 0.16,
    0,
    Math.PI / 2,
    0.6,
  );
  sign(
    g,
    fz ? "-18°C" : "4°C",
    "#101418",
    fz ? "#4fc3f7" : "#69f0ae",
    0.16,
    0.07,
    w / 2 + 0.034,
    0.1,
    d / 2 - 0.2,
    Math.PI / 2,
    1.0,
  );
}

/* ===================== TỦ ĐÔNG NẰM (chest freezer) ===================== */
function cellFill(g, type, x, z, cw, cd, y0, rd, pal) {
  const nx = Math.max(1, Math.floor(cw / 0.12)),
    nz = Math.max(1, Math.floor(cd / 0.12));
  if (type === "tub") {
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++)
        prod(
          g,
          "tub",
          x - cw / 2 + (cw / nx) * (i + 0.5),
          y0,
          z - cd / 2 + (cd / nz) * (j + 0.5),
          1,
          pick(pal, rd),
          pick(pal, rd),
          0.12,
          rd,
        );
  } else if (type === "bagflat") {
    const bw = Math.min(cw - 0.05, 0.3);
    for (let L = 0; L < 3; L++)
      for (let k = 0; k < 2; k++) {
        const pz = z + (k - 0.5) * (cd / 2.1),
          yy = y0 + L * 0.044,
          c = pick(pal, rd);
        rb(bw, 0.04, 0.2, c, x, yy, pz, g, 0.016);
        rb(bw * 0.6, 0.006, 0.13, 0xffffff, x, yy + 0.04, pz, g, 0.002);
        rb(bw, 0.006, 0.04, pick(pal, rd), x, yy + 0.04, pz + 0.075, g, 0.002);
        sph(0.025, c, x, yy + 0.047, pz, g, 1, 0.3, 1);
      }
  } else if (type === "bars") {
    const bx = Math.max(1, Math.floor(cw / 0.1)),
      bz = Math.max(1, Math.floor(cd / 0.1));
    for (let i = 0; i < bx; i++)
      for (let j = 0; j < bz; j++) {
        const px = x - cw / 2 + (cw / bx) * (i + 0.5),
          pz = z - cd / 2 + (cd / bz) * (j + 0.5),
          c = pick(pal, rd);
        rb(0.085, 0.13, 0.085, c, px, y0, pz, g, 0.008);
        rb(0.087, 0.045, 0.087, 0xffffff, px, y0 + 0.04, pz, g, 0.004);
      }
  } else if (type === "tray") {
    const tw = Math.min(cw - 0.04, 0.24);
    for (let L = 0; L < 3; L++) {
      rb(tw, 0.03, 0.17, 0xf8f8f4, x, y0 + L * 0.05, z - 0.08, g, 0.01);
      rb(
        tw - 0.03,
        0.025,
        0.13,
        pick([0xf19a94, 0xa31515, 0xf0c27a], rd),
        x,
        y0 + L * 0.05 + 0.03,
        z - 0.08,
        g,
        0.01,
      );
      rb(tw, 0.03, 0.17, 0xf8f8f4, x, y0 + L * 0.05, z + 0.1, g, 0.01);
      rb(
        tw - 0.03,
        0.025,
        0.13,
        pick([0xf19a94, 0xa31515, 0xf0c27a], rd),
        x,
        y0 + L * 0.05 + 0.03,
        z + 0.1,
        g,
        0.01,
      );
    }
  } else if (type === "fish") {
    const tw = Math.min(cw - 0.04, 0.26);
    for (let L = 0; L < 4; L++) {
      const yy = y0 + L * 0.034;
      rb(tw, 0.03, 0.12, 0x4fc3f7, x, yy, z - 0.07, g, 0.008);
      sph(0.04, 0xcfd8dc, x, yy + 0.034, z - 0.07, g, 1.8, 0.35, 0.7, 0.3);
      rb(tw, 0.03, 0.12, 0x29b6f6, x, yy, z + 0.08, g, 0.008);
      sph(0.04, 0xb0bec5, x, yy + 0.034, z + 0.08, g, 1.8, 0.35, 0.7, 0.3);
    }
  } else {
    /* nugget – túi đứng */
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < Math.max(1, Math.floor(cd / 0.16)); j++)
        prod(
          g,
          "bag",
          x - cw / 2 + (cw / nx) * (i + 0.5),
          y0,
          z - cd / 2 + (cd / Math.max(1, Math.floor(cd / 0.16))) * (j + 0.5),
          1,
          pick(pal, rd),
          pick(pal, rd),
          0.14,
          rd,
        );
  }
}
function chest(it, g, theme) {
  const [w, d] = it.size,
    rd = rng(it.code),
    ice = theme === "ice",
    acc = ice ? 0xec407a : 0x1e88e5,
    accS = ice ? "#d81b60" : "#1565c0",
    pal = ice ? P_ICE : P_FROZ,
    types = ice
      ? ["tub", "bars", "tub", "bars"]
      : ["bagflat", "tub", "tray", "fish", "nugget", "bars"],
    TOP = 0.95;
  /* thân + chân + dải màu + lỗ thông gió */
  rb(w - 0.1, 0.07, d - 0.1, 0x2b2d33, 0, 0, 0, g, 0.02);
  rb(w, 0.72, d, 0xf4f6f8, 0, 0.07, 0, g, 0.06);
  rb(w + 0.006, 0.07, d + 0.006, acc, 0, 0.36, 0, g, 0.02);
  for (let i = 0; i < 5; i++)
    rb(
      0.012,
      0.012,
      d * 0.3,
      0x9aa0a8,
      -w / 2 - 0.002,
      0.14 + i * 0.03,
      0,
      g,
      0.004,
    );
  /* thành giếng + viền nhôm */
  [-1, 1].forEach((s) => {
    rb(w, 0.16, 0.07, 0xe3e7ec, 0, 0.79, s * (d / 2 - 0.035), g, 0.015);
    rb(0.07, 0.16, d - 0.14, 0xe3e7ec, s * (w / 2 - 0.035), 0.79, 0, g, 0.015);
    rb(w, 0.03, 0.05, 0xb9bec6, 0, TOP, s * (d / 2 - 0.025), g, 0.008);
    rb(0.05, 0.03, d - 0.1, 0xb9bec6, s * (w / 2 - 0.025), TOP, 0, g, 0.008);
  });
  rb(w - 0.14, 0.02, d - 0.14, 0xdfe9f2, 0, 0.79, 0, g, 0.004);
  /* ô giỏ + hàng đông lạnh */
  const nc = w > 1.1 ? 3 : 2,
    nr = Math.max(2, Math.round((d - 0.14) / 0.55)),
    cw = (w - 0.14) / nc,
    cd = (d - 0.14) / nr;
  for (let i = 0; i < nc; i++)
    for (let j = 0; j < nr; j++) {
      const cx = -(w - 0.14) / 2 + cw * (i + 0.5),
        cz = -(d - 0.14) / 2 + cd * (j + 0.5);
      /* khung giỏ dây thép */
      [-1, 1].forEach((s) => {
        rb(
          cw - 0.01,
          0.13,
          0.012,
          0xb7bcc4,
          cx,
          0.8,
          cz + s * (cd / 2 - 0.006),
          g,
          0.003,
        );
        rb(
          0.012,
          0.13,
          cd - 0.01,
          0xb7bcc4,
          cx + s * (cw / 2 - 0.006),
          0.8,
          cz,
          g,
          0.003,
        );
      });
      cellFill(g, pick(types, rd), cx, cz, cw - 0.04, cd - 0.04, 0.81, rd, pal);
    }
  /* sương giá */
  for (let k = 0; k < 26; k++) {
    const m = sph(
      0.015 + rd() * 0.015,
      0xf2fbff,
      (rd() - 0.5) * (w - 0.14),
      0.88 + rd() * 0.06,
      (rd() - 0.5) * (d - 0.14),
      g,
      1.4,
      0.5,
      1.2,
      0.9,
    );
    m.castShadow = false;
  }
  for (let k = 0; k < 14; k++)
    rb(
      0.04 + rd() * 0.04,
      0.008,
      0.03,
      0xffffff,
      (rd() > 0.5 ? 1 : -1) * (w / 2 - 0.05),
      TOP + 0.03,
      (rd() - 0.5) * d,
      g,
      0.003,
    );
  /* nắp kính trượt (2 tấm lệch tầng) + tay nắm */
  [-1, 1].forEach((s, i) => {
    const gl = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.12, 0.012, d / 2 + 0.02),
      GLASS,
    );
    gl.position.set(0, TOP + 0.035 + i * 0.018, s * (d / 4 + 0.005 * -s));
    g.add(gl);
    rb(
      w - 0.12,
      0.016,
      0.025,
      0x9aa0a8,
      0,
      TOP + 0.03 + i * 0.018,
      s * (d / 4 + 0.005 * -s) + s * (d / 4 - 0.01),
      g,
      0.004,
    );
    rb(
      0.06,
      0.02,
      0.02,
      0x555a63,
      0,
      TOP + 0.04 + i * 0.018,
      s * 0.02,
      g,
      0.005,
    );
  });
  /* biển hiệu treo 2 mặt + cột */
  const Lw = Math.min(d - 0.2, 1.3);
  [-1, 1].forEach((s) =>
    cyl(0.012, 0.012, 0.62, 0x888888, 0, TOP, s * (Lw / 2 - 0.03), g, 8, 0.3),
  );
  rb(
    0.04,
    0.3,
    Lw,
    accS === "#d81b60" ? 0x880e4f : 0x0d3c78,
    0,
    1.5,
    0,
    g,
    0.01,
  );
  [-1, 1].forEach((s) =>
    sign(
      g,
      ice ? "KEM • ĐÁ LẠNH" : "HÀNG ĐÔNG -18°C",
      accS,
      "#ffffff",
      Lw - 0.04,
      0.26,
      s * 0.022,
      1.65,
      0,
      s * (Math.PI / 2),
      0.4,
    ),
  );
  /* giá & đèn nhiệt độ */
  [-1, 1].forEach((s) => {
    rb(0.012, 0.05, d * 0.8, 0xffffff, s * (w / 2 + 0.006), 0.62, 0, g, 0.003);
    const nt = Math.max(3, Math.floor((d * 0.8) / 0.25));
    for (let k = 0; k < nt; k++)
      rb(
        0.014,
        0.04,
        0.12,
        k % 2 ? 0xe53935 : 0xfdd835,
        s * (w / 2 + 0.01),
        0.617,
        -d * 0.4 + 0.125 + k * ((d * 0.8 - 0.25) / Math.max(1, nt - 1)),
        g,
        0.004,
      );
  });
  rb(0.012, 0.07, 0.17, 0x111111, w / 2 + 0.006, 0.45, d / 2 - 0.2, g, 0.004);
  sign(
    g,
    "-18°C",
    "#101418",
    "#ff5252",
    0.15,
    0.06,
    w / 2 + 0.014,
    0.455,
    d / 2 - 0.2,
    Math.PI / 2,
    1.0,
  );
}

/* ============ TỦ MÁT HỞ NHIỀU TẦNG (quầy thịt / đồ mát kiểu siêu thị) ============ */
const DECK_PRICES = [
  "39.000",
  "59.000",
  "89.000",
  "99.000",
  "129.000",
  "149.000",
];
const DECK_TY = ["pork", "beef", "chicken", "ribs", "mince", "sausage"];
/* một ô hàng trên kệ: x0..x1 theo chiều sâu, z0..z1 theo chiều dài, y = mặt kệ */
function deckCell(g, kind, x0, x1, y, z0, z1, rd) {
  const W = x1 - x0,
    L = z1 - z0,
    xc = (x0 + x1) / 2,
    zc = (z0 + z1) / 2;
  if (kind === "trays") {
    /* chồng khay trắng, lớp thịt hồng trên cùng */
    const nx = Math.max(1, Math.floor(W / 0.24)),
      nz = Math.max(1, Math.floor(L / 0.17));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = x0 + (W / nx) * (i + 0.5),
          z = z0 + (L / nz) * (j + 0.5),
          hs = 2 + Math.floor(rd() * 3);
        for (let k = 0; k < hs; k++)
          rb(0.22, 0.025, 0.15, 0xf6f6f2, x, y + k * 0.028, z, g, 0.008);
        rb(
          0.19,
          0.03,
          0.12,
          pick([0xf19a94, 0xe58a86, 0xa31515], rd),
          x,
          y + hs * 0.028,
          z,
          g,
          0.012,
        );
      }
  } else if (kind === "wrapped") {
    /* khay thịt bọc màng, đủ loại */
    const nx = Math.max(1, Math.floor(W / 0.25)),
      nz = Math.max(1, Math.floor(L / 0.175));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++)
        meatTray(
          g,
          x0 + (W / nx) * (i + 0.5),
          y,
          z0 + (L / nz) * (j + 0.5),
          pick(DECK_TY, rd),
          rd,
        );
  } else if (kind === "crate") {
    /* rổ nhựa đen đựng xúc xích / gói hút chân không đỏ */
    const red = pick([0xc62828, 0xd32f2f, 0xff5722], rd),
      iw = W - 0.04,
      il = L - 0.04,
      nx = Math.max(1, Math.floor(iw / 0.1)),
      nz = Math.max(2, Math.floor(il / 0.075));
    rb(W - 0.02, 0.15, L - 0.02, 0x25262b, xc, y, zc, g, 0.015);
    rb(W, 0.02, L, 0x3a3b41, xc, y + 0.14, zc, g, 0.008);
    for (let k = 0; k < 2; k++)
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++) {
          const x = xc - iw / 2 + (iw / nx) * (i + 0.5),
            z = zc - il / 2 + (il / nz) * (j + 0.5),
            c = rd() > 0.25 ? red : 0xfff176;
          rb(0.085, 0.045, 0.062, c, x, y + 0.15 + k * 0.047, z, g, 0.006);
          if (k === 1)
            rb(
              0.05,
              0.004,
              0.04,
              0xffffff,
              x,
              y + 0.15 + k * 0.047 + 0.045,
              z,
              g,
              0.002,
            );
        }
  } else if (kind === "bags") {
    /* túi xanh: há cảo, viên thả lẩu */
    const nx = Math.max(1, Math.floor(W / 0.24)),
      nz = Math.max(1, Math.floor(L / 0.2));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = x0 + (W / nx) * (i + 0.5),
          z = z0 + (L / nz) * (j + 0.5);
        for (let k = 0; k < 2; k++) {
          const yy = y + k * 0.05;
          rb(
            0.2,
            0.045,
            0.17,
            rd() > 0.25 ? 0x1e88e5 : 0x1565c0,
            x,
            yy,
            z,
            g,
            0.02,
          );
          rb(0.1, 0.004, 0.07, 0xffffff, x, yy + 0.045, z, g, 0.002);
        }
      }
  } else {
    /* gói cam – đỏ xếp lớp: lạp xưởng, chả, đồ ướp sẵn */
    const nx = Math.max(1, Math.floor(W / 0.22)),
      nz = Math.max(1, Math.floor(L / 0.16));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = x0 + (W / nx) * (i + 0.5),
          z = z0 + (L / nz) * (j + 0.5),
          c = pick([0xff7043, 0xf4511e, 0xe53935], rd);
        for (let k = 0; k < 3; k++)
          rb(0.2, 0.04, 0.15, c, x, y + k * 0.042, z, g, 0.008);
        rb(0.08, 0.004, 0.06, 0xffffff, x, y + 3 * 0.042, z, g, 0.002);
      }
  }
}

/* Quầy rau củ quả T tầng: T=2 là quầy rau củ quả tươi cũ (nâng lên 2 tầng), T=3 là bản 3 tầng.
   Giữ nguyên: bệ gỗ, tường xanh, phun sương, biển 2 mặt, rổ nghiêng, bảng giá, sides 1/2. */
function produceStand(it, g, T) {
  const [w, d] = it.size,
    n = Math.max(2, Math.floor(d / 0.9)),
    rd = rng(it.code),
    two = it.sides === 2,
    list = Object.keys(FRUIT_NAME),
    sides = two ? [-1, 1] : [1],
    sp = two ? 0 : -w / 2 + 0.03,
    SP = 0.5 /* khoảng cách giữa các tầng */,
    topY = 0.45 + (T - 1) * SP + 0.5;
  rb(w, 0.45, d, 0xb8956a, 0, 0, 0, g, 0.03);
  rb(w + 0.01, 0.04, d + 0.01, 0x8a6b45, 0, 0.41, 0, g, 0.01);
  /* tường xanh phía sau + ống phun sương + biển */
  rb(0.05, topY - 0.45, d, 0x7a9a5a, sp, 0.45, 0, g, 0.01);
  for (let k = 0; k < 6 + T * 5; k++)
    sph(
      0.07 + rd() * 0.04,
      pick([0x2e7d32, 0x43a047, 0x66bb6a], rd),
      sp + (rd() - 0.5) * 0.04,
      0.55 + rd() * (topY - 0.7),
      (rd() - 0.5) * d,
      g,
      0.5,
      1,
      1.2,
    );
  cylZ(0.012, d - 0.1, 0x9aa4ad, sp + (two ? 0 : 0.1), topY - 0.06, 0, g, 8);
  for (let k = 0; k < Math.max(3, n * 2); k++)
    cyl(
      0.004,
      0.004,
      0.05,
      0x9aa4ad,
      sp + (two ? 0 : 0.1),
      topY - 0.12,
      -d / 2 + 0.2 + k * ((d - 0.4) / Math.max(1, n * 2 - 1)),
      g,
      5,
    );
  const Lw = Math.min(d - 0.1, 1.5);
  rb(0.05, 0.3, Lw, 0x1b5e20, sp, topY + 0.02, 0, g, 0.01);
  const sy = topY + 0.17;
  if (two) {
    sign(
      g,
      "RAU CỦ QUẢ TƯƠI",
      "#2e7d32",
      "#ffffff",
      Lw - 0.04,
      0.26,
      0.027,
      sy,
      0,
      Math.PI / 2,
      0.35,
    );
    sign(
      g,
      "RAU CỦ QUẢ TƯƠI",
      "#2e7d32",
      "#ffffff",
      Lw - 0.04,
      0.26,
      -0.027,
      sy,
      0,
      -Math.PI / 2,
      0.35,
    );
  } else
    sign(
      g,
      "RAU CỦ QUẢ TƯƠI",
      "#2e7d32",
      "#ffffff",
      Lw - 0.04,
      0.26,
      sp + 0.027,
      sy,
      0,
      Math.PI / 2,
      0.35,
    );
  cyl(0.02, 0.02, 0.5, 0x6b6b70, sp, topY - 0.5, -Lw / 2 + 0.05, g, 8);
  cyl(0.02, 0.02, 0.5, 0x6b6b70, sp, topY - 0.5, Lw / 2 - 0.05, g, 8);
  /* khung + sàn các tầng trên */
  for (let t = 1; t < T; t++) {
    const yd = 0.45 + t * SP;
    sides.forEach((s) => {
      const fx = s * w * 0.22;
      [-1, 1].forEach((e) =>
        [-1, 1].forEach((a) =>
          rb(
            0.04,
            SP - 0.04,
            0.04,
            0x6b6b70,
            fx + a * 0.32,
            yd - SP,
            e * (d / 2 - 0.05),
            g,
            0.006,
          ),
        ),
      );
      rb(0.72, 0.04, d - 0.04, 0xb8956a, fx, yd - 0.04, 0, g, 0.01);
      rb(0.74, 0.015, d - 0.02, 0x8a6b45, fx, yd - 0.055, 0, g, 0.004);
    });
  }
  /* rổ rau củ, mỗi tầng một hàng, đều nghiêng */
  for (let i = 0; i < n; i++)
    sides.forEach((s) => {
      const z = -d / 2 + 0.45 + (i * (d - 0.9)) / Math.max(1, n - 1);
      for (let t = 0; t < T; t++)
        crate(
          g,
          s * w * 0.22,
          z,
          s,
          pick(list, rd),
          rd,
          0.45 + t * SP,
          0.12,
          t === T - 1,
        );
    });
}

/* ---- Tủ mát sữa chua / Yakult: một ô hàng (x0..x1 chiều sâu, z0..z1 chiều dài) ---- */
const P_DAIRY = [0xffffff, 0xe53935, 0x43a047, 0xfdd835, 0xf48fb1, 0x81d4fa];
const DAIRY_PRICES = [
  "7.900",
  "12.500",
  "17.900",
  "25.000",
  "28.900",
  "35.500",
];
function dairyCell(g, kind, x0, x1, y, z0, z1, rd) {
  const W = x1 - x0,
    L = z1 - z0,
    xc = (x0 + x1) / 2,
    zc = (z0 + z1) / 2;
  if (kind === "yakult") {
    /* chai Yakult nhỏ xếp hàng sát nhau, nắp đỏ / vàng */
    const rows = Math.max(1, Math.min(3, Math.floor(W / 0.05))),
      nz = Math.max(1, Math.floor(L / 0.046));
    for (let r = 0; r < rows; r++)
      for (let j = 0; j < nz; j++) {
        const x = x1 - 0.03 - r * 0.05,
          z = z0 + (L / nz) * (j + 0.5);
        cyl(
          0.019,
          0.02,
          0.065,
          pick([0xf3e5f5, 0xffcdd2, 0xfff9c4, 0xc8e6c9, 0xffffff], rd),
          x,
          y,
          z,
          g,
          10,
          0.4,
        );
        cyl(
          0.016,
          0.016,
          0.012,
          pick([0xe53935, 0xe53935, 0xfdd835], rd),
          x,
          y + 0.065,
          z,
          g,
          8,
          0.4,
        );
      }
    const bw = W - rows * 0.05 - 0.01;
    if (bw > 0.04)
      rb(bw, 0.07, L - 0.02, 0xf4f4f0, x0 + bw / 2, y, zc, g, 0.008);
  } else if (kind === "cups") {
    /* hũ sữa chua nắp giấy bạc, 3 hàng */
    const xs = [x1 - 0.05, x1 - 0.14, x1 - 0.23].filter((x) => x > x0 + 0.03);
    fillRow(g, "cupy", 1, xs, y, 0.07, z0, z1, rd, P_DAIRY, 0.05);
    const bx = xs.length ? xs[xs.length - 1] - 0.06 : x1;
    if (bx - x0 > 0.05)
      rb(bx - x0, 0.06, L - 0.02, 0xe8f1f5, (x0 + bx) / 2, y, zc, g, 0.008);
  } else if (kind === "jars") {
    /* hũ thuỷ tinh sữa chua / pudding nắp trắng */
    const xs = [x1 - 0.06, x1 - 0.16].filter((x) => x > x0 + 0.03);
    fillRow(g, "jar", 1, xs, y, 0.13, z0, z1, rd, P_DAIRY, 0.05);
  } else if (kind === "cartons") {
    /* hộp sữa chua / phô mai xếp chồng 3 lớp */
    const nx = Math.max(1, Math.floor(W / 0.2)),
      nz = Math.max(1, Math.floor(L / 0.16));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = x0 + (W / nx) * (i + 0.5),
          z = z0 + (L / nz) * (j + 0.5),
          c = pick([0xffffff, 0xf5f5f0, 0xfdd835, 0xe53935], rd);
        for (let k = 0; k < 3; k++) {
          rb(0.18, 0.07, 0.14, c, x, y + k * 0.072, z, g, 0.006);
          rb(
            0.004,
            0.045,
            0.1,
            pick([0xe53935, 0x1e88e5, 0x43a047], rd),
            x + 0.091,
            y + k * 0.072 + 0.012,
            z,
            g,
            0.001,
          );
        }
      }
  } else {
    /* chai trà sữa / sữa nằm nghiêng ngang, nắp hướng ra khách, 2 lớp */
    const nz = Math.max(1, Math.floor(L / 0.066)),
      bl = Math.max(0.1, W - 0.05);
    for (let k = 0; k < 2; k++)
      for (let j = 0; j < nz; j++) {
        const z = z0 + (L / nz) * (j + 0.5),
          yc = y + 0.03 + k * 0.058,
          c = pick([0x6d4c41, 0x8bc34a, 0xf5deb3, 0xa1887f, 0x558b2f], rd);
        cylX(0.03, bl, c, x1 - 0.03 - bl / 2, yc, z, g, 10);
        cylX(
          0.0305,
          bl * 0.35,
          pick([0xffffff, 0xfff3e0], rd),
          x1 - 0.03 - bl * 0.6,
          yc,
          z,
          g,
          10,
        );
        cylX(0.014, 0.03, c, x1 - 0.015, yc, z, g, 8);
        cylX(
          0.016,
          0.014,
          pick([0xe53935, 0xfdd835, 0xffffff], rd),
          x1 - 0.002,
          yc,
          z,
          g,
          8,
        );
      }
  }
}

/* ───────────── (2) DÁN TRÊN "const BUILD = {" ───────────── */
/* Một ô hàng bánh trên kệ nướng: x0..x1 chiều sâu, z0..z1 chiều dài, y = mặt kệ, s = hướng mặt trước */
const BAKE_GOLD = [0xd9964a, 0xe0a85f, 0xc77d3a, 0xe8bd7a];
function bakeCell(g, kind, x0, x1, y, z0, z1, rd, s) {
  const W = x1 - x0,
    L = z1 - z0,
    xc = (x0 + x1) / 2,
    zc = (z0 + z1) / 2;
  if (kind === "loaf") {
    /* hộp nhựa trong đựng bánh mì / bánh ngọt, xếp 2 lớp */
    const nx = Math.max(1, Math.floor(W / 0.24)),
      nz = Math.max(1, Math.floor(L / 0.22));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = x0 + (W / nx) * (i + 0.5),
          z = z0 + (L / nz) * (j + 0.5);
        for (let k = 0; k < 2; k++) {
          const yy = y + k * 0.105;
          rb(0.2, 0.012, 0.18, 0xf4f4f0, x, yy, z, g, 0.004);
          for (let a = 0; a < 2; a++)
            for (let b = 0; b < 2; b++)
              sph(
                0.04,
                pick(BAKE_GOLD, rd),
                x - 0.05 + a * 0.1,
                yy + 0.04,
                z - 0.045 + b * 0.09,
                g,
                1.15,
                0.8,
                1,
              );
          const f = new THREE.Mesh(
            new THREE.BoxGeometry(0.21, 0.095, 0.19),
            wrapMat,
          );
          f.position.set(x, yy + 0.05, z);
          g.add(f);
          rb(
            0.006,
            0.03,
            0.08,
            pick([0xe53935, 0x43a047, 0xfdd835], rd),
            x + s * 0.104,
            yy + 0.02,
            z,
            g,
            0.001,
          );
        }
      }
  } else if (kind === "pack") {
    /* bánh mì / bánh bông lan đóng túi, xếp 3 lớp */
    const nx = Math.max(1, Math.floor(W / 0.14)),
      nz = Math.max(1, Math.floor(L / 0.2));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = x0 + (W / nx) * (i + 0.5),
          z = z0 + (L / nz) * (j + 0.5),
          c = pick([0xe0a85f, 0xd9964a, 0xf3d9a4, 0xc77d3a, 0xf48fb1], rd);
        for (let k = 0; k < 3; k++) {
          rb(0.12, 0.055, 0.18, c, x, y + k * 0.058, z, g, 0.02);
          rb(0.07, 0.004, 0.1, 0xffffff, x, y + k * 0.058 + 0.055, z, g, 0.001);
        }
        rb(0.006, 0.05, 0.1, 0xe53935, x + s * 0.062, y + 0.04, z, g, 0.001);
      }
  } else if (kind === "cookies") {
    /* hũ bánh quy / bánh khô nắp đỏ */
    const nx = Math.max(1, Math.floor(W / 0.1)),
      nz = Math.max(1, Math.floor(L / 0.1));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = x0 + (W / nx) * (i + 0.5),
          z = z0 + (L / nz) * (j + 0.5);
        prod(
          g,
          "jar",
          x,
          y,
          z,
          s,
          pick([0xe6b86a, 0xd7a35a, 0xf0d28a], rd),
          0xe53935,
          0.17,
          rd,
        );
      }
  } else {
    /* thùng carton mở nắp, bên trong là túi bánh dựng đứng */
    rb(W - 0.02, 0.2, L - 0.02, 0xc9a678, xc, y, zc, g, 0.01);
    rb(W - 0.02, 0.008, L - 0.02, 0xa88555, xc, y + 0.19, zc, g, 0.002);
    rb(
      0.006,
      0.08,
      L * 0.5,
      0xe0cfa8,
      xc + s * (W / 2 - 0.012),
      y + 0.06,
      zc,
      g,
      0.002,
    );
    const nx = Math.max(1, Math.floor((W - 0.06) / 0.1)),
      nz = Math.max(1, Math.floor((L - 0.06) / 0.1));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = xc - (W - 0.06) / 2 + ((W - 0.06) / nx) * (i + 0.5),
          z = zc - (L - 0.06) / 2 + ((L - 0.06) / nz) * (j + 0.5);
        rb(
          0.085,
          0.12,
          0.09,
          pick([0xf9a825, 0xe65100, 0xfdd835, 0xd9964a], rd),
          x,
          y + 0.17,
          z,
          g,
          0.02,
        );
        rb(0.005, 0.04, 0.06, 0xffffff, x + s * 0.043, y + 0.22, z, g, 0.001);
      }
  }
}

/* =============================== BUILD =============================== */
const BUILD = {
  /* ---------- kệ tạp hoá chung ---------- */
  shelf(it, g) {
    gondola(it, g, {
      title: "TẠP HÓA",
      signBg: "#1e88e5",
      accent: 0x1e88e5,
      kinds: ["bottle", "box", "jar", "bag", "can"],
      pal: PAL,
    });
  },
  noodle(it, g) {
    gondola(it, g, {
      title: "MÌ • PHỞ • CHÁO",
      signBg: "#e53935",
      accent: 0xe53935,
      kinds: ["bag", "cup", "bag", "box"],
      pal: P_NOODLE,
    });
  },
  snack(it, g) {
    gondola(it, g, {
      title: "BÁNH KẸO • SNACK",
      signBg: "#8e24aa",
      accent: 0x8e24aa,
      kinds: ["bag", "tube", "box", "bag"],
      pal: P_SNACK,
    });
  },
  sauce(it, g) {
    gondola(it, g, {
      title: "GIA VỊ • DẦU ĂN",
      signBg: "#ef6c00",
      accent: 0xef6c00,
      kinds: ["bottle", "jar", "bottle", "can"],
      pal: P_SAUCE,
    });
  },
  household(it, g) {
    gondola(it, g, {
      title: "HÓA MỸ PHẨM",
      signBg: "#00897b",
      accent: 0x00897b,
      kinds: ["detergent", "bottle", "box", "detergent"],
      pal: P_HOME,
    });
  },

  /* ---------- rau củ quả ---------- */
  /* quầy rau củ quả tươi – nay là 2 tầng */
  produce(it, g) {
    produceStand(it, g, 2);
  },
  /* quầy rau củ quả 3 tầng */
  produce3(it, g) {
    produceStand(it, g, 3);
  },

  /* ---------- tủ mát hở sữa chua – Yakult – nước (khung giống chiller) ---------- */
  dairy(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      H = 2.1,
      NT = 4,
      fx = w / 2,
      Lw = Math.min(d - 0.7, 1.6);
    /* đế + lưới hút gió inox phía trước */
    rb(w, 0.12, d, 0x3b3d44, 0, 0, 0, g, 0.02);
    rb(0.05, 0.24, d - 0.06, 0xaeb3ba, fx - 0.03, 0.1, 0, g, 0.01);
    for (let k = 0; k < 5; k++)
      rb(
        0.054,
        0.012,
        d - 0.1,
        0x55595f,
        fx - 0.03,
        0.15 + k * 0.036,
        0,
        g,
        0.003,
      );
    /* hai hông, lưng, nóc */
    [-1, 1].forEach((s) =>
      rb(w, H, 0.06, 0xe9eaee, 0, 0, s * (d / 2 - 0.03), g, 0.015),
    );
    rb(0.05, H, d, 0xe4e7ea, -fx + 0.025, 0, 0, g, 0.01);
    rb(w + 0.04, 0.28, d, 0xf1f2f4, 0.02, H - 0.28, 0, g, 0.03);
    /* đèn LED dưới nóc */
    rb(
      0.07,
      0.025,
      d - 0.16,
      0xffffff,
      fx - 0.15,
      H - 0.305,
      0,
      g,
      0.005,
    ).material = glowMat(0xffffff, 0xdff0ff, 1.3);
    /* bảng hiệu + banner đỏ nâu phía dưới như ảnh + đèn nhiệt độ */
    sign(
      g,
      "SỮA CHUA • NƯỚC MÁT",
      "#0277bd",
      "#ffffff",
      Lw,
      0.2,
      fx + 0.045,
      H - 0.14,
      0,
      Math.PI / 2,
      0.5,
    );
    sign(
      g,
      "CHUẨN NGON NHÀ LÀM",
      "#6d1b1b",
      "#ffcc80",
      Lw,
      0.16,
      fx + 0.012,
      0.22,
      0,
      Math.PI / 2,
      0.3,
    );
    if (d > 2.2)
      sign(
        g,
        "4°C",
        "#101418",
        "#69f0ae",
        0.14,
        0.06,
        fx + 0.046,
        H - 0.14,
        d / 2 - 0.16,
        Math.PI / 2,
        1.0,
      );
    /* các tầng kệ */
    const ns = Math.max(2, Math.floor((d - 0.2) / 0.6)),
      sl = (d - 0.2) / ns,
      x0 = -fx + 0.1,
      x1 = fx - 0.07;
    for (let t = 0; t < NT; t++) {
      const y = 0.4 + t * 0.36,
        pool =
          t === 0
            ? ["lay", "lay", "yakult"]
            : t === 1
              ? ["yakult", "cups", "jars", "yakult"]
              : t === 2
                ? ["cups", "yakult", "cups", "cartons"]
                : ["cartons", "cartons", "cups"];
      rb(w - 0.08, 0.03, d - 0.08, 0xcfd3d8, 0, y, 0, g, 0.008);
      rb(0.02, 0.055, d - 0.1, 0xffffff, fx - 0.03, y, 0, g, 0.004);
      rb(0.014, 0.1, d - 0.1, 0xd4d8dd, -fx + 0.06, y + 0.03, 0, g, 0.004);
      for (let s = 0; s < ns; s++) {
        const z0 = -d / 2 + 0.1 + s * sl,
          z1 = z0 + sl - 0.03,
          zc = (z0 + z1) / 2;
        dairyCell(g, pick(pool, rd), x0, x1, y + 0.03, z0, z1, rd);
        sign(
          g,
          pick(DAIRY_PRICES, rd),
          "#fdd835",
          "#111111",
          Math.min(0.12, sl * 0.5),
          0.05,
          fx - 0.016,
          y + 0.028,
          zc,
          Math.PI / 2,
          0,
        );
      }
    }
  },
  /* ---------- kệ bánh nướng mỗi ngày (kiểu kệ 3 tầng + banner) ---------- */
  bakeshelf(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      two = it.sides === 2,
      sides = two ? [-1, 1] : [1],
      sp = two ? 0 : -w / 2 + 0.02,
      H = 1.5,
      DECKS = [0.16, 0.6, 1.02],
      ns = Math.max(2, Math.floor((d - 0.1) / 0.5)),
      sl = (d - 0.1) / ns,
      Lw = Math.min(d - 0.1, 2.2);
    /* đế + khung đen */
    rb(w, 0.12, d, 0x2b2d33, 0, 0, 0, g, 0.02);
    [-1, 1].forEach((e) =>
      rb(w, H, 0.04, 0x2b2d33, 0, 0, e * (d / 2 - 0.02), g, 0.01),
    );
    rb(0.04, H, d, 0x3a3b41, sp, 0, 0, g, 0.01);
    /* các tầng */
    DECKS.forEach((y, t) => {
      rb(w, 0.03, d - 0.08, 0x2b2d33, 0, y, 0, g, 0.008);
      sides.forEach((s) => {
        const xmin = s > 0 ? (two ? 0.05 : -w / 2 + 0.08) : -(w / 2 - 0.06),
          xmax = s > 0 ? w / 2 - 0.06 : -0.05;
        rb(
          0.02,
          0.06,
          d - 0.08,
          0xffffff,
          s * (w / 2 - 0.01),
          y,
          0,
          g,
          0.004,
        ); /* thanh gắn thẻ giá */
        for (let i = 0; i < ns; i++) {
          const z0 = -d / 2 + 0.05 + i * sl,
            z1 = z0 + sl - 0.03,
            zc = (z0 + z1) / 2,
            kind =
              t === 0
                ? "cartonbox"
                : pick(["loaf", "pack", "loaf", "cookies"], rd);
          bakeCell(g, kind, xmin, xmax, y + 0.03, z0, z1, rd, s);
          sign(
            g,
            pick(DECK_PRICES, rd),
            "#fdd835",
            "#111111",
            Math.min(0.14, sl * 0.5),
            0.055,
            s * (w / 2 + 0.003),
            y + 0.03,
            zc,
            s > 0 ? Math.PI / 2 : -Math.PI / 2,
            0,
          );
        }
      });
    });
    rb(w, 0.04, d, 0xf2f2f4, 0, H, 0, g, 0.01);
    /* banner lớn phía trên */
    rb(0.05, 0.62, Lw, 0xbf360c, sp, H + 0.04, 0, g, 0.01);
    const sg = (x, ry) =>
      sign(
        g,
        "NƯỚNG MỖI NGÀY",
        "#e65100",
        "#ffffff",
        Lw - 0.06,
        0.52,
        x,
        H + 0.35,
        0,
        ry,
        0.4,
      );
    if (two) {
      sg(0.028, Math.PI / 2);
      sg(-0.028, -Math.PI / 2);
    } else sg(sp + 0.028, Math.PI / 2);
  },

  /* ---------- tủ mát đứng ---------- */
  cold(it, g) {
    coldUnit(it, g, "drink");
  },
  /* ---------- tủ đông đứng cửa kính ---------- */
  ufreezer(it, g) {
    coldUnit(it, g, "frozen");
  },
  /* ---------- tủ đông nằm (hàng đông lạnh) ---------- */
  freezer(it, g) {
    chest(it, g, "frozen");
  },
  /* ---------- tủ kem ---------- */
  icecream(it, g) {
    chest(it, g, "ice");
  },

  /* ---------- tủ mát hở nhiều tầng (thịt, xúc xích, đồ mát) ---------- */
  chiller(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      H = 2.1,
      NT = 4,
      fx = w / 2,
      Lw = Math.min(d - 0.7, 1.6);
    /* đế + lưới hút gió inox phía trước */
    rb(w, 0.12, d, 0x3b3d44, 0, 0, 0, g, 0.02);
    rb(0.05, 0.24, d - 0.06, 0xaeb3ba, fx - 0.03, 0.1, 0, g, 0.01);
    for (let k = 0; k < 5; k++)
      rb(
        0.054,
        0.012,
        d - 0.1,
        0x55595f,
        fx - 0.03,
        0.15 + k * 0.036,
        0,
        g,
        0.003,
      );
    /* hai hông, lưng, nóc */
    [-1, 1].forEach((s) =>
      rb(w, H, 0.06, 0xe9eaee, 0, 0, s * (d / 2 - 0.03), g, 0.015),
    );
    rb(0.05, H, d, 0xe4e7ea, -fx + 0.025, 0, 0, g, 0.01);
    rb(w + 0.04, 0.28, d, 0xf1f2f4, 0.02, H - 0.28, 0, g, 0.03);
    /* đèn LED dưới nóc */
    rb(
      0.07,
      0.025,
      d - 0.16,
      0xffffff,
      fx - 0.15,
      H - 0.305,
      0,
      g,
      0.005,
    ).material = glowMat(0xffffff, 0xdff0ff, 1.3);
    /* bảng hiệu + đèn nhiệt độ */
    sign(
      g,
      "THỊT • ĐỒ MÁT",
      "#0277bd",
      "#ffffff",
      Lw,
      0.2,
      fx + 0.045,
      H - 0.14,
      0,
      Math.PI / 2,
      0.5,
    );
    if (d > 2.2)
      sign(
        g,
        "2°C",
        "#101418",
        "#69f0ae",
        0.14,
        0.06,
        fx + 0.046,
        H - 0.14,
        d / 2 - 0.16,
        Math.PI / 2,
        1.0,
      );
    /* các tầng kệ */
    const ns = Math.max(2, Math.floor((d - 0.2) / 0.6)),
      sl = (d - 0.2) / ns,
      x0 = -fx + 0.1,
      x1 = fx - 0.07;
    for (let t = 0; t < NT; t++) {
      const y = 0.4 + t * 0.36,
        pool =
          t === NT - 1
            ? ["wrapped", "wrapped", "bags", "trays"]
            : t === 0
              ? ["bags", "crate", "packs", "trays"]
              : ["trays", "wrapped", "crate", "wrapped", "packs"],
        sale = Math.floor(rd() * ns);
      rb(w - 0.08, 0.03, d - 0.08, 0xcfd3d8, 0, y, 0, g, 0.008); /* mặt kệ */
      rb(
        0.02,
        0.055,
        d - 0.1,
        0xffffff,
        fx - 0.03,
        y,
        0,
        g,
        0.004,
      ); /* gờ gắn thẻ giá */
      rb(
        0.014,
        0.1,
        d - 0.1,
        0xd4d8dd,
        -fx + 0.06,
        y + 0.03,
        0,
        g,
        0.004,
      ); /* gờ chắn phía sau */
      for (let s = 0; s < ns; s++) {
        const z0 = -d / 2 + 0.1 + s * sl,
          z1 = z0 + sl - 0.03,
          zc = (z0 + z1) / 2;
        deckCell(g, pick(pool, rd), x0, x1, y + 0.03, z0, z1, rd);
        if (s === sale)
          sign(
            g,
            "-30%",
            "#d50000",
            "#ffee58",
            Math.min(0.1, sl * 0.45),
            0.05,
            fx - 0.016,
            y + 0.028,
            zc,
            Math.PI / 2,
            0,
          );
        else
          sign(
            g,
            pick(DECK_PRICES, rd),
            "#fdd835",
            "#111111",
            Math.min(0.12, sl * 0.5),
            0.05,
            fx - 0.016,
            y + 0.028,
            zc,
            Math.PI / 2,
            0,
          );
      }
    }
  },

  /* ---------- gạo ---------- */
  rice(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      cols = w > 1 ? 2 : 1,
      sw = Math.min(0.5, w / cols - 0.04),
      n = Math.max(1, Math.floor((d - 0.2) / 0.44)),
      xs = cols === 2 ? [-w * 0.25, w * 0.25] : [0],
      NAMES = ["ST25", "JASMINE", "NẾP", "TẤM", "GẠO LỨT", "GẠO THƠM"],
      BGS = ["#e53935", "#2e7d32", "#1e88e5", "#ef6c00", "#6d4c41", "#8e24aa"];
    /* pallet gỗ */
    rb(w, 0.12, d, 0xcfa979, 0, 0.1, 0, g, 0.01);
    for (let i = 0; i < 3; i++)
      rb(
        w,
        0.1,
        0.1,
        0x9c7a55,
        0,
        0,
        -d / 2 + 0.08 + (i * (d - 0.16)) / 2,
        g,
        0.01,
      );
    for (let i = 0; i < 6; i++)
      rb(
        w,
        0.004,
        0.012,
        0x7a5c3c,
        0,
        0.222,
        -d / 2 + 0.1 + (i * (d - 0.2)) / 5,
        g,
        0.001,
      );
    xs.forEach((x) => {
      const s = x < 0 ? -1 : 1;
      for (let L = 0; L < 3; L++)
        for (let i = 0; i < n; i++) {
          const z = -d / 2 + 0.25 + (i * (d - 0.5)) / Math.max(1, n - 1),
            y = 0.22 + L * 0.2,
            k = Math.floor(rd() * 6);
          rb(sw, 0.2, 0.4, 0xf1e6cc, x, y, z, g, 0.1);
          rb(sw * 0.92, 0.025, 0.36, 0xe6d8b8, x, y + 0.18, z, g, 0.03);
          rb(
            0.004,
            0.19,
            0.02,
            0xcdbb94,
            x + s * (sw / 2 - 0.01),
            y + 0.005,
            z + 0.19,
            g,
            0.001,
          );
          rb(
            0.004,
            0.19,
            0.02,
            0xcdbb94,
            x + s * (sw / 2 - 0.01),
            y + 0.005,
            z - 0.19,
            g,
            0.001,
          );
          if (L === 2) rb(0.1, 0.03, 0.06, 0xb89868, x, y + 0.2, z, g, 0.012);
          sign(
            g,
            NAMES[k],
            BGS[k],
            "#ffffff",
            0.26,
            0.11,
            x + s * (sw / 2 + 0.004),
            y + 0.1,
            z,
            s > 0 ? Math.PI / 2 : -Math.PI / 2,
            0.15,
          );
        }
    });
    sign(
      g,
      "GẠO CÁC LOẠI",
      "#b71c1c",
      "#ffffff",
      Math.min(d - 0.1, 1.2),
      0.22,
      0,
      0.9 + 0.3,
      0,
      Math.PI / 2,
      0.35,
    );
    cyl(0.015, 0.015, 0.42, 0x6b6b70, 0, 0.82, 0, g, 8);
  },

  /* ---------- thu ngân ---------- */
  cashier(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      bl = d * 0.52,
      bz = -d * 0.1;
    rb(w, 1, d, 0xf2f2f4, 0, 0, 0, g, 0.05);
    rb(w + 0.002, 0.12, d + 0.002, 0x1e88e5, 0, 0.14, 0, g, 0.02);
    rb(w + 0.04, 0.04, d + 0.04, 0xc9a678, 0, 1, 0, g, 0.02);
    rb(0.012, 0.1, 0.34, 0x9aa0a8, -w / 2 - 0.004, 0.55, 0, g, 0.004); // ngăn kéo tiền
    /* băng chuyền + 2 trục + thanh chắn khách */
    rb(0.34, 0.03, bl, 0x26262a, 0.05, 1.04, bz, g, 0.01);
    [-1, 1].forEach((s) =>
      rb(0.03, 0.05, bl, 0xb0b3b8, 0.05 + s * 0.185, 1.04, bz, g, 0.005),
    );
    [-1, 1].forEach((s) =>
      cylX(0.025, 0.34, 0x777b82, 0.05, 1.065, bz + s * (bl / 2 - 0.01), g, 10),
    );
    for (let k = 0; k < 8; k++)
      rb(
        0.3,
        0.002,
        0.01,
        0x3a3a40,
        0.05,
        1.07,
        bz - bl / 2 + 0.1 + k * ((bl - 0.2) / 7),
        g,
        0.001,
      );
    rb(0.2, 0.06, 0.02, 0x2e7d32, 0.05, 1.07, bz + bl / 2 - 0.12, g, 0.004);
    /* hàng trên băng chuyền */
    prod(
      g,
      "bottle",
      0.05,
      1.07,
      bz - bl * 0.3,
      1,
      0xe53935,
      0xffffff,
      0.24,
      rd,
    );
    prod(g, "box", 0.05, 1.07, bz - bl * 0.05, 1, 0x1e88e5, 0xfdd835, 0.2, rd);
    prod(g, "bag", 0.05, 1.07, bz + bl * 0.18, 1, 0x43a047, 0xffffff, 0.2, rd);
    /* màn hình POS */
    rb(0.14, 0.02, 0.14, 0x333338, -w / 2 + 0.14, 1.04, d * 0.28, g, 0.01);
    cyl(0.015, 0.015, 0.1, 0x333338, -w / 2 + 0.14, 1.06, d * 0.28, g, 8);
    const sc = rb(
      0.04,
      0.24,
      0.34,
      0x1d1d1f,
      -w / 2 + 0.12,
      1.16,
      d * 0.28,
      g,
      0.012,
    );
    sc.rotation.z = 0.25;
    const scr = rb(
      0.006,
      0.2,
      0.3,
      0x0a2a4a,
      -w / 2 + 0.145,
      1.18,
      d * 0.28,
      g,
      0.003,
    );
    scr.rotation.z = 0.25;
    scr.material = glowMat(0x0a2a4a, 0x2a8cff, 0.7);
    rb(0.1, 0.015, 0.2, 0x222226, -w / 2 + 0.26, 1.04, d * 0.28, g, 0.006); // bàn phím
    /* máy quét mã vạch */
    rb(
      0.12,
      0.025,
      0.17,
      0x1d1d1f,
      0.05 - 0.25 + 0.08,
      1.04,
      d * 0.3,
      g,
      0.008,
    );
    rb(
      0.07,
      0.004,
      0.11,
      0xff2a2a,
      0.05 - 0.25 + 0.08,
      1.065,
      d * 0.3,
      g,
      0.001,
    ).material = glowMat(0x330000, 0xff2a2a, 1.2);
    /* máy POS thẻ + máy in hoá đơn */
    const pos = rb(
      0.08,
      0.03,
      0.12,
      0x3a7bff,
      w / 2 - 0.12,
      1.04,
      d / 2 - 0.25,
      g,
      0.01,
    );
    pos.rotation.z = -0.2;
    rb(
      0.02,
      0.004,
      0.08,
      0x111111,
      w / 2 - 0.12,
      1.075,
      d / 2 - 0.25,
      g,
      0.001,
    );
    rb(0.1, 0.1, 0.13, 0x2b2b30, -w / 2 + 0.12, 1.04, d * 0.1, g, 0.012);
    rb(
      0.06,
      0.003,
      0.1,
      0xffffff,
      -w / 2 + 0.12,
      1.14,
      d * 0.1 + 0.04,
      g,
      0.001,
    );
    /* giá kẹo – sô cô la sát lối khách */
    rb(0.12, 0.02, d * 0.4, 0xdcdce0, w / 2 - 0.1, 1.1, -d * 0.28, g, 0.006);
    fillRow(
      g,
      "box",
      1,
      [w / 2 - 0.1],
      1.12,
      0.09,
      -d * 0.48,
      -d * 0.08,
      rd,
      P_SNACK,
      0.1,
    );
    /* cột đèn số quầy */
    cyl(0.015, 0.015, 0.55, 0x4a4a4f, -w / 2 + 0.06, 1.04, -d / 2 + 0.1, g, 8);
    rb(0.07, 0.2, 0.2, 0x1d1d1f, -w / 2 + 0.06, 1.55, -d / 2 + 0.1, g, 0.01);
    [-1, 1].forEach((s) =>
      sign(
        g,
        String((rd() * 8 + 1) | 0),
        "#00c853",
        "#ffffff",
        0.18,
        0.18,
        -w / 2 + 0.06 + s * 0.037,
        1.65,
        -d / 2 + 0.1,
        s * (Math.PI / 2),
        1.0,
      ),
    );
  },

  /* ---------- pallet khuyến mãi ---------- */
  display(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code);
    for (let i = 0; i < 3; i++)
      rb(
        w,
        0.06,
        0.1,
        0x9c7a55,
        0,
        0,
        -d / 2 + 0.06 + (i * (d - 0.12)) / 2,
        g,
        0.01,
      );
    for (let i = 0; i < 5; i++)
      rb(
        w,
        0.03,
        d / 5 - 0.02,
        0xcfa979,
        0,
        0.1,
        -d / 2 + d / 10 + (i * d) / 5,
        g,
        0.006,
      );
    for (let l = 0; l < 3; l++) {
      const shr = 1 - l * 0.16,
        cw = (w / 2.3) * shr,
        cd = (d / 2.3) * shr,
        y = 0.13 + l * 0.3;
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          const x = (i - 0.5) * w * 0.46 * shr,
            z = (j - 0.5) * d * 0.46 * shr,
            c = pick(PAL, rd);
          rb(cw, 0.3, cd, 0xc9a678, x, y, z, g, 0.012);
          rb(cw * 0.18, 0.302, cd * 1.002, 0xe0cfa8, x, y, z, g, 0.002);
          [-1, 1].forEach((s) => {
            rb(
              0.006,
              0.14,
              cd * 0.7,
              c,
              x + s * (cw / 2),
              y + 0.08,
              z,
              g,
              0.003,
            );
            rb(
              0.008,
              0.05,
              cd * 0.45,
              0xffffff,
              x + s * (cw / 2),
              y + 0.2,
              z,
              g,
              0.003,
            );
          });
        }
    }
    /* lốc chai đặt trên cùng + bảng SALE */
    for (let k = 0; k < 3; k++)
      for (let m = 0; m < 2; m++)
        cyl(
          0.03,
          0.03,
          0.22,
          pick(P_DRINK, rd),
          (k - 1) * 0.07,
          1.03,
          (m - 0.5) * 0.07,
          g,
          12,
          0.3,
        );
    cyl(0.012, 0.012, 0.55, 0x777777, 0, 1.03, 0, g, 8);
    [-1, 1].forEach((s) =>
      sign(
        g,
        "SALE -30%",
        "#d50000",
        "#ffee58",
        0.55,
        0.22,
        s * 0.014,
        1.45,
        0,
        s * (Math.PI / 2),
        0.5,
      ),
    );
  },

  /* ---------- nước đóng chai (pallet lốc 6 chai) ---------- */
  drinks(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      pw = 0.23,
      pd = 0.16,
      cx = Math.max(1, Math.min(6, Math.floor(w / pw))),
      cz = Math.max(1, Math.min(6, Math.floor(d / pd))),
      wc = pick([0x29b6f6, 0xe53935, 0x43a047, 0xfb8c00], rd);
    for (let i = 0; i < 3; i++)
      rb(
        w,
        0.06,
        0.1,
        0x9c7a55,
        0,
        0,
        -d / 2 + 0.06 + (i * (d - 0.12)) / 2,
        g,
        0.01,
      );
    for (let i = 0; i < 5; i++)
      rb(
        w,
        0.03,
        d / 5 - 0.02,
        0xcfa979,
        0,
        0.06,
        -d / 2 + d / 10 + (i * d) / 5,
        g,
        0.006,
      );
    for (let L = 0; L < 3; L++)
      for (let i = 0; i < cx; i++)
        for (let j = 0; j < cz; j++) {
          const x = -w / 2 + (w / cx) * (i + 0.5),
            z = -d / 2 + (d / cz) * (j + 0.5),
            y = 0.09 + L * 0.3;
          if (L < 2) {
            rb(pw - 0.01, 0.28, pd - 0.01, 0xd9efff, x, y, z, g, 0.012);
            rb(
              0.006,
              0.12,
              pd * 0.8,
              wc,
              x + (pw - 0.01) / 2,
              y + 0.08,
              z,
              g,
              0.002,
            );
            rb(
              0.006,
              0.12,
              pd * 0.8,
              wc,
              x - (pw - 0.01) / 2,
              y + 0.08,
              z,
              g,
              0.002,
            );
          } else {
            for (let a = 0; a < 3; a++)
              for (let b = 0; b < 2; b++) {
                const bx = x + (a - 1) * 0.07,
                  bz = z + (b - 0.5) * 0.07;
                cyl(0.032, 0.032, 0.17, 0xcfe9ff, bx, y, bz, g, 12, 0.15);
                cyl(
                  0.013,
                  0.032,
                  0.05,
                  0xcfe9ff,
                  bx,
                  y + 0.17,
                  bz,
                  g,
                  12,
                  0.15,
                );
                cyl(0.014, 0.014, 0.03, wc, bx, y + 0.22, bz, g, 8, 0.4);
                cyl(0.033, 0.033, 0.08, wc, bx, y + 0.05, bz, g, 12, 0.5);
              }
            const f = new THREE.Mesh(
              new THREE.BoxGeometry(pw - 0.01, 0.27, pd - 0.01),
              wrapMat,
            );
            f.position.set(x, y + 0.135, z);
            g.add(f);
          }
        }
    sign(
      g,
      "NƯỚC SUỐI • NƯỚC NGỌT",
      "#0277bd",
      "#ffffff",
      Math.min(d - 0.1, 1.3),
      0.2,
      w / 2 + 0.004,
      0.72 + 0.1,
      0,
      Math.PI / 2,
      0.3,
    );
  },

  /* ---------- trứng ---------- */
  eggs(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      cx = Math.max(1, Math.floor((w - 0.1) / 0.36)),
      cz = Math.max(1, Math.floor((d - 0.1) / 0.32)),
      EB = [0xf3e5c8, 0xe9cf9f, 0xd9b27a];
    rb(w, 0.7, d, 0xe9d3a8, 0, 0, 0, g, 0.03);
    rb(w + 0.02, 0.04, d + 0.02, 0xb8956a, 0, 0.7, 0, g, 0.01);
    for (let i = 0; i < cx; i++)
      for (let j = 0; j < cz; j++) {
        const x = (i - (cx - 1) / 2) * 0.36,
          z = (j - (cz - 1) / 2) * 0.32,
          eb = pick(EB, rd);
        for (let L = 0; L < 3; L++)
          rb(0.33, 0.07, 0.29, 0xc9b99a, x, 0.74 + L * 0.075, z, g, 0.008);
        rb(
          0.006,
          0.05,
          0.18,
          pick([0xe53935, 0x1e88e5, 0x43a047], rd),
          x + 0.166,
          0.8,
          z,
          g,
          0.002,
        );
        rb(0.31, 0.012, 0.27, 0xd6c8ab, x, 0.965, z, g, 0.004);
        for (let a = 0; a < 6; a++)
          for (let b = 0; b < 5; b++)
            sph(
              0.025,
              eb,
              x - 0.135 + a * 0.054,
              0.99,
              z - 0.11 + b * 0.055,
              g,
              1,
              1.25,
              1,
              0.5,
            );
      }
    const Lw = Math.min(d - 0.1, 1.2);
    cyl(0.015, 0.015, 0.5, 0x6b6b70, 0, 0.74, 0, g, 8);
    [-1, 1].forEach((s) =>
      sign(
        g,
        "TRỨNG TƯƠI",
        "#f9a825",
        "#4e342e",
        Lw,
        0.22,
        s * 0.012,
        1.35,
        0,
        s * (Math.PI / 2),
        0.4,
      ),
    );
  },

  /* ---------- quầy bánh mì / bánh ngọt ---------- */
  bakery(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      CH = 1.34;
    rb(w, 0.7, d, 0xc89b6a, 0, 0, 0, g, 0.04);
    for (let i = 0; i < 5; i++)
      rb(
        0.01,
        0.5,
        (d - 0.2) / 5 - 0.03,
        0xb4854f,
        w / 2 + 0.002,
        0.1,
        -d / 2 + 0.1 + ((i + 0.5) * (d - 0.2)) / 5,
        g,
        0.004,
      );
    rb(w + 0.04, 0.04, d + 0.04, 0xf5efe6, 0, 0.7, 0, g, 0.01);
    rb(0.04, 0.62, d, 0xc89b6a, -w / 2 + 0.02, 0.74, 0, g, 0.01);
    /* khung + kính */
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) =>
        rb(
          0.025,
          0.62,
          0.025,
          0x5d4037,
          sx * (w / 2 - 0.02),
          0.74,
          sz * (d / 2 - 0.02),
          g,
          0.004,
        ),
      ),
    );
    const gF = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.55, d - 0.08),
      GLASS,
    );
    gF.position.set(w / 2 - 0.01, 1.03, 0);
    g.add(gF);
    const gT = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.06, 0.015, d - 0.08),
      GLASS,
    );
    gT.position.set(0, CH, 0);
    g.add(gT);
    [-1, 1].forEach((s) => {
      const gS = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.06, 0.55, 0.015),
        GLASS,
      );
      gS.position.set(0, 1.03, s * (d / 2 - 0.01));
      g.add(gS);
    });
    rb(w - 0.2, 0.02, d - 0.2, 0xfff1c4, 0, CH - 0.04, 0, g, 0.005).material =
      glowMat(0xfff1c4, 0xffe3a0, 1.1);
    /* 2 tầng khay */
    [0.74, 1.04].forEach((ly, li) => {
      rb(w - 0.14, 0.02, d - 0.14, 0xd7ccc8, 0, ly, 0, g, 0.005);
      const nz = Math.max(2, Math.floor((d - 0.14) / 0.36));
      for (let j = 0; j < nz; j++) {
        const z = -d / 2 + 0.07 + ((j + 0.5) * (d - 0.14)) / nz,
          x = 0.04,
          t = Math.floor(rd() * 5),
          y = ly + 0.02;
        rb(0.3, 0.012, 0.28, 0xffffff, x, y, z, g, 0.004);
        if (t === 0)
          for (let k = 0; k < 3; k++) {
            cylX(
              0.035,
              0.42,
              0xd9a05b,
              x,
              y + 0.04 + (k === 1 ? 0.05 : 0),
              z - 0.08 + k * 0.08,
              g,
              10,
            );
            for (let c = 0; c < 4; c++)
              rb(
                0.008,
                0.012,
                0.03,
                0xb57a3a,
                x - 0.15 + c * 0.1,
                y + 0.075 + (k === 1 ? 0.05 : 0),
                z - 0.08 + k * 0.08,
                g,
                0.002,
              );
          }
        else if (t === 1)
          for (let k = 0; k < 2; k++) {
            rb(0.2, 0.09, 0.11, 0xe0a85f, x, y, z - 0.07 + k * 0.14, g, 0.035);
            sph(
              0.06,
              0xd9964a,
              x,
              y + 0.085,
              z - 0.07 + k * 0.14,
              g,
              1.5,
              0.45,
              0.9,
            );
          }
        else if (t === 2)
          for (let a = 0; a < 3; a++)
            for (let b = 0; b < 3; b++)
              sph(
                0.048,
                0xdea65a,
                x - 0.09 + a * 0.09,
                y + 0.04,
                z - 0.08 + b * 0.08,
                g,
                1,
                0.78,
                1,
              );
        else if (t === 3)
          for (let a = 0; a < 3; a++)
            for (let b = 0; b < 2; b++) {
              const cr = torus(
                0.035,
                0.022,
                0xd9964a,
                x - 0.08 + a * 0.08,
                y + 0.03,
                z - 0.06 + b * 0.12,
                g,
                Math.PI / 2,
                Math.PI * 1.35,
              );
              cr.rotation.z = rd() * 3;
            }
        else
          for (let a = 0; a < 3; a++)
            for (let b = 0; b < 2; b++) {
              const dx = x - 0.08 + a * 0.08,
                dz = z - 0.06 + b * 0.12,
                gl = pick([0xf48fb1, 0x6d4c41, 0xfff59d, 0x81d4fa], rd);
              torus(0.04, 0.017, 0xe0b26a, dx, y + 0.02, dz, g);
              torus(0.04, 0.012, gl, dx, y + 0.034, dz, g);
              for (let sp = 0; sp < 5; sp++)
                rb(
                  0.004,
                  0.004,
                  0.004,
                  pick(P_SNACK, rd),
                  dx + (rd() - 0.5) * 0.07,
                  y + 0.048,
                  dz + (rd() - 0.5) * 0.07,
                  g,
                  0.001,
                );
            }
        rb(0.004, 0.035, 0.1, 0xffffff, x + 0.152, y + 0.005, z, g, 0.001);
        rb(0.006, 0.012, 0.06, 0xe53935, x + 0.153, y + 0.02, z, g, 0.001);
      }
    });
    /* kẹp + túi giấy + biển */
    rb(0.04, 0.02, 0.2, 0x9aa0a8, w / 2 - 0.08, 0.75, d / 2 - 0.2, g, 0.006);
    for (let k = 0; k < 4; k++)
      rb(
        0.1,
        0.18,
        0.06,
        0xd7b98a,
        w / 2 + 0.02,
        0.74,
        -d / 2 + 0.15 + k * 0.07,
        g,
        0.004,
      );
    const Lw = Math.min(d - 0.1, 1.5);
    rb(0.04, 0.28, Lw, 0x5d4037, 0, CH + 0.02, 0, g, 0.01);
    [-1, 1].forEach((s) =>
      sign(
        g,
        "BÁNH MÌ • BÁNH NGỌT",
        "#8d5524",
        "#fff3e0",
        Lw - 0.03,
        0.24,
        s * 0.022,
        CH + 0.16,
        0,
        s * (Math.PI / 2),
        0.5,
      ),
    );
  },

  /* ---------- quầy thịt tươi ---------- */
  meat(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      TY = ["pork", "beef", "chicken", "ribs", "mince", "sausage"];
    rb(w, 0.78, d, 0xf2f2f4, 0, 0, 0, g, 0.05);
    rb(w + 0.004, 0.1, d + 0.004, 0xc62828, 0, 0.3, 0, g, 0.02);
    rb(w - 0.05, 0.04, d - 0.05, 0x2b2d33, 0, 0, 0, g, 0.01);
    rb(0.05, 1.15, d, 0xe9eaee, -w / 2 + 0.03, 0.78, 0, g, 0.01);
    rb(w * 0.45, 0.2, d - 0.1, 0xe3e7ec, -w * 0.22, 0.78, 0, g, 0.01);
    rb(w * 0.5, 0.02, d - 0.1, 0xfafafa, w * 0.22 - 0.02, 0.78, 0, g, 0.003);
    /* khay thịt: bậc cao (sau) + bậc thấp (trước) */
    const nz = Math.max(2, Math.floor((d - 0.1) / 0.18));
    for (let j = 0; j < nz; j++) {
      const z = -d / 2 + 0.05 + ((j + 0.5) * (d - 0.1)) / nz;
      meatTray(g, -w * 0.22, 0.98, z, pick(TY, rd), rd);
      meatTray(g, w * 0.12, 0.8, z, pick(TY, rd), rd);
      if (w > 1.0) meatTray(g, w * 0.34, 0.8, z, pick(TY, rd), rd);
    }
    /* kính chắn + đèn hồng + thẻ giá + biển */
    const gl = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.32, d - 0.1),
      GLASS,
    );
    gl.position.set(w / 2 - 0.04, 1.0, 0);
    g.add(gl);
    rb(0.04, 0.04, d - 0.1, 0x2b2d33, w / 2 - 0.04, 1.16, 0, g, 0.01);
    rb(w * 0.5, 0.03, d - 0.1, 0xffb3b3, 0, 1.78, 0, g, 0.006).material =
      glowMat(0xffb3b3, 0xff6f6f, 0.9);
    rb(0.012, 0.05, d - 0.1, 0xffffff, w / 2 + 0.006, 0.7, 0, g, 0.003);
    const Lw = Math.min(d - 0.1, 1.6);
    sign(
      g,
      "THỊT TƯƠI SỐNG",
      "#b71c1c",
      "#ffffff",
      Lw,
      0.28,
      -w / 2 + 0.06,
      1.75 + 0.2,
      0,
      Math.PI / 2,
      0.45,
    );
    sign(
      g,
      "THỊT TƯƠI SỐNG",
      "#b71c1c",
      "#ffffff",
      Lw,
      0.28,
      w / 2 - 0.04,
      1.35,
      0,
      Math.PI / 2,
      0.45,
    );
    cyl(0.012, 0.012, 0.35, 0x888888, w / 2 - 0.04, 1.0, Lw / 2 - 0.05, g, 8);
    cyl(0.012, 0.012, 0.35, 0x888888, w / 2 - 0.04, 1.0, -Lw / 2 + 0.05, g, 8);
  },

  /* ---------- quầy hải sản (kèm bể nuôi) ---------- */
  seafood(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      tank = d > 2.0,
      td = tank ? 0.75 : 0,
      ld = d - td,
      z0 = -d / 2 + td;
    rb(w, 0.8, d, 0xeaf1f5, 0, 0, 0, g, 0.04);
    rb(w + 0.004, 0.1, d + 0.004, 0x0277bd, 0, 0.3, 0, g, 0.02);
    rb(w - 0.05, 0.04, d - 0.05, 0x2b2d33, 0, 0, 0, g, 0.01);
    /* viền inox quanh khay đá */
    const zc = z0 + ld / 2;
    [-1, 1].forEach((s) => {
      rb(
        w,
        0.12,
        0.04,
        0xcfd8dc,
        0,
        0.8,
        z0 + (s > 0 ? ld - 0.02 : 0.02),
        g,
        0.01,
      );
      rb(0.04, 0.12, ld - 0.04, 0xcfd8dc, s * (w / 2 - 0.02), 0.8, zc, g, 0.01);
    });
    rb(w - 0.06, 0.08, ld - 0.06, 0xdff1fb, 0, 0.8, zc, g, 0.03);
    /* đá vụn */
    const nI = Math.min(150, Math.floor(w * ld * 120));
    for (let k = 0; k < nI; k++) {
      const m = rb(
        0.04 + rd() * 0.04,
        0.03 + rd() * 0.03,
        0.04 + rd() * 0.04,
        rd() > 0.5 ? 0xe8f6ff : 0xf7fcff,
        (rd() - 0.5) * (w - 0.1),
        0.86 + rd() * 0.025,
        z0 + 0.06 + rd() * (ld - 0.12),
        g,
        0.012,
      );
      m.rotation.y = rd() * 3;
    }
    /* hải sản bày trên đá */
    const FC = [0x78909c, 0xff8a65, 0x4db6ac, 0xb0bec5, 0xffd54f],
      rows = Math.max(2, Math.floor((ld - 0.2) / 0.3)),
      fx = w > 1 ? [-w * 0.27, 0, w * 0.27] : [0];
    for (let r = 0; r < rows; r++) {
      const z = z0 + 0.15 + (r * (ld - 0.3)) / Math.max(1, rows - 1);
      fx.forEach((x) => {
        const t = Math.floor(rd() * 4),
          ry = Math.PI / 2 + (rd() - 0.5) * 0.5;
        if (t === 0) fish(g, x, 0.9, z, pick(FC, rd), 0.3, ry);
        else if (t === 1) {
          crab(g, x - 0.1, 0.9, z, ry);
          crab(g, x + 0.1, 0.9, z + 0.05, ry + 0.6);
        } else if (t === 2)
          for (let k = 0; k < 4; k++)
            shrimp(g, x - 0.12, 0.9, z - 0.1 + k * 0.07, ry);
        else {
          squid(g, x, 0.9, z - 0.05, ry);
          squid(g, x, 0.9, z + 0.07, ry + 0.2);
        }
      });
    }
    /* sò – ngao */
    for (let k = 0; k < 10; k++) {
      const sh = sph(
        0.035,
        pick([0x8d6e63, 0xbcaaa4, 0x6d4c41], rd),
        (rd() - 0.5) * (w - 0.2),
        0.89,
        z0 + 0.1 + rd() * (ld - 0.2),
        g,
        1,
        0.55,
        0.8,
      );
      sh.rotation.y = rd() * 3;
    }
    /* thẻ giá + biển hiệu + kính chắn */
    rb(0.012, 0.05, ld - 0.1, 0xffffff, w / 2 + 0.006, 0.7, zc, g, 0.003);
    const gl = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.3, ld - 0.1),
      GLASS,
    );
    gl.position.set(w / 2 - 0.03, 1.07, zc);
    g.add(gl);
    const Lw = Math.min(ld - 0.1, 1.6);
    cyl(0.012, 0.012, 0.7, 0x888888, 0, 0.8, zc - Lw / 2 + 0.05, g, 8);
    cyl(0.012, 0.012, 0.7, 0x888888, 0, 0.8, zc + Lw / 2 - 0.05, g, 8);
    rb(0.04, 0.28, Lw, 0x01579b, 0, 1.5, zc, g, 0.01);
    [-1, 1].forEach((s) =>
      sign(
        g,
        "HẢI SẢN TƯƠI SỐNG",
        "#0277bd",
        "#ffffff",
        Lw - 0.03,
        0.24,
        s * 0.022,
        1.64,
        zc,
        s * (Math.PI / 2),
        0.45,
      ),
    );
    /* bể nuôi cá */
    if (tank) {
      const tz = -d / 2 + td / 2;
      rb(w, 0.7, td, 0x37474f, 0, 0, tz, g, 0.03);
      const wt = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.1, 0.55, td - 0.1),
        new THREE.MeshStandardMaterial({
          color: 0x4fc3f7,
          transparent: true,
          opacity: 0.35,
          roughness: 0.1,
        }),
      );
      wt.position.set(0, 0.98, tz);
      g.add(wt);
      for (let k = 0; k < 4; k++)
        fish(
          g,
          (rd() - 0.5) * (w - 0.4),
          0.8 + rd() * 0.4,
          tz + (rd() - 0.5) * (td - 0.3),
          pick([0xff7043, 0xffd54f, 0x4db6ac, 0xef5350], rd),
          0.14,
          rd() * 6,
        );
      for (let k = 0; k < 12; k++)
        sph(
          0.01 + rd() * 0.01,
          0xe1f5fe,
          (rd() - 0.5) * (w - 0.3),
          0.8 + rd() * 0.5,
          tz + (rd() - 0.5) * (td - 0.3),
          g,
          1,
          1,
          1,
          0.1,
        );
      rb(w - 0.1, 0.02, td - 0.1, 0xd7ccc8, 0, 0.7, tz, g, 0.005);
      for (let k = 0; k < 8; k++)
        sph(
          0.03,
          pick([0x558b2f, 0x8d6e63, 0x9e9e9e], rd),
          (rd() - 0.5) * (w - 0.3),
          0.74,
          tz + (rd() - 0.5) * (td - 0.3),
          g,
          1.3,
          0.8,
          1.1,
        );
    }
  },

  /* ---------- xe đẩy hàng ---------- */
  cart(it, g) {
    const [w, d] = it.size,
      n = Math.max(2, Math.min(6, Math.floor((d - 0.2) / 0.2)));
    for (let i = 0; i < n; i++) {
      const z = -d / 2 + 0.55 + i * 0.2,
        y = 0.1 + i * 0.045,
        bw = Math.min(0.56, w - 0.1);
      rb(bw, 0.015, 0.75, 0xc7ccd1, 0, y + 0.3, z - 0.0, g, 0.004);
      for (let k = 0; k < 4; k++) {
        rb(
          bw,
          0.012,
          0.012,
          0xb3b9bf,
          0,
          y + 0.42 + k * 0.1,
          z + 0.37,
          g,
          0.003,
        );
        rb(
          bw,
          0.012,
          0.012,
          0xb3b9bf,
          0,
          y + 0.42 + k * 0.1,
          z - 0.37,
          g,
          0.003,
        );
        rb(
          0.012,
          0.012,
          0.75,
          0xb3b9bf,
          bw / 2,
          y + 0.42 + k * 0.1,
          z,
          g,
          0.003,
        );
        rb(
          0.012,
          0.012,
          0.75,
          0xb3b9bf,
          -bw / 2,
          y + 0.42 + k * 0.1,
          z,
          g,
          0.003,
        );
      }
      [-1, 1].forEach((a) =>
        [-1, 1].forEach((b) =>
          rb(
            0.014,
            0.12,
            0.014,
            0xb3b9bf,
            (a * bw) / 2,
            y + 0.3,
            z + b * 0.37,
            g,
            0.003,
          ),
        ),
      );
      rb(0.02, 0.28, 0.02, 0x9aa0a8, 0, y + 0.05, z, g, 0.004);
      rb(bw * 0.6, 0.02, 0.02, 0x9aa0a8, 0, y + 0.05, z, g, 0.004);
      cylX(0.012, bw + 0.04, 0xe53935, 0, y + 0.62, z + 0.4, g, 8);
      [-1, 1].forEach((a) =>
        [-1, 1].forEach((b) =>
          cylX(
            0.04,
            0.025,
            0x333338,
            a * 0.2,
            0.04,
            z + b * 0.27 + i * 0.0,
            g,
            10,
          ),
        ),
      );
    }
    sign(
      g,
      "XE ĐẨY",
      "#1565c0",
      "#ffffff",
      0.5,
      0.16,
      w / 2 - 0.02,
      0.95,
      0,
      Math.PI / 2,
      0.3,
    );
  },

  /* ---------- giá kẹo / sô cô la cạnh quầy thu ngân ---------- */
  candy(it, g) {
    const [w, d] = it.size,
      rd = rng(it.code),
      H = 1.2,
      T = 4;
    rb(w, 0.1, d, 0x8e8e93, 0, 0, 0, g, 0.02);
    rb(0.04, H, d, 0xe6e6ea, -w / 2 + 0.02, 0, 0, g, 0.01);
    [-1, 1].forEach((s) =>
      rb(w, H, 0.03, 0xd9d9de, 0, 0, s * (d / 2 - 0.015), g, 0.008),
    );
    for (let t = 0; t < T; t++) {
      const y = 0.14 + t * 0.24;
      rb(w, 0.025, d - 0.06, 0xc7c7cc, 0, y, 0, g, 0.006);
      rb(0.012, 0.04, d - 0.08, 0xffffff, w / 2 - 0.004, y, 0, g, 0.003);
      fillRow(
        g,
        pick(["box", "tube", "bag", "box"], rd),
        1,
        [w / 2 - 0.12],
        y + 0.025,
        0.18,
        -d / 2 + 0.08,
        d / 2 - 0.08,
        rd,
        P_SNACK,
        0.05,
        w / 2 + 0.003,
        y + 0.005,
      );
    }
    rb(w, 0.04, d, 0xf2f2f4, 0, H, 0, g, 0.01);
    rb(0.04, 0.2, d, 0x6a1b9a, -w / 2 + 0.02, H + 0.03, 0, g, 0.01);
    sign(
      g,
      "KẸO • SÔ CÔ LA",
      "#8e24aa",
      "#ffffff",
      d - 0.06,
      0.18,
      -w / 2 + 0.045,
      H + 0.14,
      0,
      Math.PI / 2,
      0.4,
    );
  },
};

/* ===== Danh mục để đăng ký vào menu thêm quầy (tuỳ cấu trúc dự án) ===== */
const BUILD_META = {
  shelf: { label: "Kệ tạp hoá", size: [0.9, 2.4] },
  noodle: { label: "Kệ mì – phở – cháo", size: [0.9, 2.4] },
  snack: { label: "Kệ bánh kẹo – snack", size: [0.9, 2.4] },
  sauce: { label: "Kệ gia vị – dầu ăn", size: [0.9, 2.4] },
  household: { label: "Kệ hoá mỹ phẩm", size: [0.9, 2.4] },
  produce: { label: "Quầy rau củ quả", size: [1.6, 3.6] },
  produce3: { label: "Quầy rau củ quả 3 tầng", size: [1.6, 2.7] },
  dairy: { label: "Tủ mát hở sữa chua – Yakult", size: [0.9, 2.5] },
  bakeshelf: { label: "Kệ bánh nướng mỗi ngày", size: [0.9, 2.4] },
  cold: { label: "Tủ mát đứng (nước, sữa)", size: [0.8, 2.4] },
  ufreezer: { label: "Tủ đông đứng cửa kính", size: [0.8, 2.2] },
  freezer: { label: "Tủ đông nằm", size: [0.9, 2.0] },
  icecream: { label: "Tủ kem", size: [0.9, 1.6] },
  rice: { label: "Quầy gạo", size: [1.2, 2.0] },
  cashier: { label: "Quầy thu ngân", size: [0.9, 1.8] },
  display: { label: "Pallet khuyến mãi", size: [1.2, 1.2] },
  drinks: { label: "Pallet nước đóng chai", size: [1.2, 1.2] },
  eggs: { label: "Bàn trứng", size: [1.1, 1.3] },
  bakery: { label: "Quầy bánh mì – bánh ngọt", size: [0.8, 1.8] },
  meat: { label: "Quầy thịt tươi", size: [1.0, 2.4] },
  seafood: { label: "Quầy hải sản + bể cá", size: [1.0, 3.0] },
  cart: { label: "Khu xe đẩy", size: [0.7, 1.4] },
  candy: { label: "Giá kẹo – sô cô la", size: [0.6, 1.0] },
  chiller: { label: "Tủ mát hở nhiều tầng", size: [0.9, 2.5] },
};

/* ============ BỘ ICON SVG (nét mảnh kiểu SF Symbols, thay emoji mặc định) ============ */
const ICONS = {
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  cat: '<path d="M5 4.5l3.2 3.2a8 8 0 017.6 0L19 4.5V12a7 7 0 01-14 0z"/><path d="M9.5 12.5v.01M14.5 12.5v.01M10.5 15.5c.9.7 2.1.7 3 0"/>',
  game: '<path d="M7 8h10a4 4 0 014 4l-1 5a2.5 2.5 0 01-4.3 1.2L14 16h-4l-1.7 2.2A2.5 2.5 0 014 17l-1-5a4 4 0 014-4z"/><path d="M8 11v3M6.5 12.5h3M15.5 11.5v.01M17.5 13.5v.01"/>',
  cake: '<path d="M4 20h16M5 20v-6a2 2 0 012-2h10a2 2 0 012 2v6M5 16c2 1.5 3.5-1.5 7 0s5 1.5 7 0M12 12V9"/><path d="M12 4c.9 1 .9 2.2 0 3-.9-.8-.9-2 0-3z"/>',
  bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  sprout:
    '<path d="M12 21v-9M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 16c0-3-2.5-5-6-5 0 3.5 2.5 5 6 5z"/>',
  crown: '<path d="M4 18.5h16M4.5 8l4 4 3.5-6 3.5 6 4-4-1.5 10.5h-13z"/>',
  heart:
    '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.2 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  smile:
    '<circle cx="12" cy="12" r="9"/><path d="M8.5 14c1 1.5 2 2 3.5 2s2.5-.5 3.5-2M9 9.5v.01M15 9.5v.01"/>',
  tag: '<path d="M3.5 12.5v-8a1 1 0 011-1h8l8 8-9 9z"/><circle cx="8" cy="8" r="1.2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  rotL: '<path d="M3.5 12A8.5 8.5 0 1112 20.5M3.5 12V6.5M3.5 12H9"/>',
  rotR: '<path d="M20.5 12A8.5 8.5 0 10 12 20.5M20.5 12V6.5M20.5 12H15"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14"/>',
  magnet: '<path d="M6 3h4v8a2 2 0 004 0V3h4v8a6 6 0 01-12 0zM6 7h4M14 7h4"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  redo: '<path d="M15 7l4.5 4.5L15 16M19 11.5h-9a5 5 0 000 10"/>',
  undo: '<path d="M9 7L4.5 11.5 9 16M5 11.5h9a5 5 0 010 10"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
  data: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  fit: '<path d="M4 9V5a1 1 0 011-1h4M15 4h4a1 1 0 011 1v4M20 15v4a1 1 0 01-1 1h-4M9 20H5a1 1 0 01-1-1v-4"/>',
  zoomin:
    '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M11 8.5v5M8.5 11h5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
};
const ICON_NAMES = {
  star: "Sao",
  sun: "Mặt trời",
  cat: "Mèo",
  game: "Game",
  cake: "Bánh",
  bolt: "Tia chớp",
  sprout: "Mầm",
  crown: "Vương miện",
  heart: "Trái tim",
  moon: "Trăng",
  smile: "Mặt cười",
  tag: "Nhãn",
};
const EMO = {
  "🌟": "star",
  "☀️": "sun",
  "🐱": "cat",
  "🎮": "game",
  "🍰": "cake",
  "⚡": "bolt",
  "🌱": "sprout",
  "👑": "crown",
  "💗": "heart",
  "😴": "moon",
  "🏷️": "tag",
};
const IC = (n, s = 16) =>
  `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ""}</svg>`;
const tIc = (t) =>
  ICONS[t.icon]
    ? `<span class="mi" style="color:${esc(t.color)}">${IC(t.icon, 13)}</span>`
    : esc(t.icon || "") + " ";

/* ============ NHÂN VIÊN & TAG: dữ liệu (mỗi người / mỗi tag một khối riêng) ============
   Mã nhân viên EMP_0001, tag TAG_001. Ngoại hình nằm trong look{} (thiếu trường nào thì dùng LOOK0).
   role: manager|deputy|staff → áo xám|xám|hồng (tự động theo chức vụ). ext{}: thuộc tính mở rộng tương lai. */
const ROLES = {
  manager: ["Cửa hàng trưởng", "gray"],
  deputy: ["Cửa hàng phó", "gray"],
  staff: ["Nhân viên", "pink"],
};
const LOOK0 = {
  height: 1.7,
  build: 0.4,
  headSize: 1,
  legRatio: 1,
  armRatio: 1,
  skin: "#f0c8a4",
  hair: "#2b2220",
  hairStyle: "short",
  face: "oval",
  eyes: "dot",
  blush: true,
  pants: "#2c3140",
  shoes: "#f5f5f7",
  acc: [],
};
const ACCS = [
  ["glasses", "Kính"],
  ["cap", "Mũ"],
  ["apron", "Tạp dề"],
  ["lanyard", "Dây thẻ"],
  ["tie", "Cà vạt"],
  ["catears", "Tai mèo"],
];
const TagRegistry = makeRegistry("Tag");
[
  ["star", "Chăm chỉ", "#f5a623", "Làm việc rất tận tâm"],
  ["sun", "Năng lượng tích cực", "#ff9500", "Luôn vui vẻ"],
  ["cat", "Mèo con", "#af52de", "Nhẹ nhàng, dễ thương"],
  ["game", "Game thủ", "#5856d6", "Mê chơi game"],
  ["cake", "Mê đồ ngọt", "#ff2d55", "Hay xin bánh kẹo"],
  ["bolt", "Nhanh nhẹn", "#d4a000", "Xử lý việc rất nhanh"],
  ["sprout", "Tân binh", "#34c759", "Mới vào làm"],
  ["crown", "Cửa hàng trưởng", "#a2845e", "Quản lý cửa hàng"],
  ["heart", "Thân thiện", "#ff6b9d", "Hòa đồng với mọi người"],
  ["moon", "Hay buồn ngủ", "#30a8d8", "Cần thêm cà phê"],
].forEach((t, i) =>
  TagRegistry.register({
    code: "TAG_" + String(i + 1).padStart(3, "0"),
    icon: t[0],
    name: t[1],
    color: t[2],
    desc: t[3],
  }),
);
const S = StaffRegistry.register;
S({
  code: "EMP_0001",
  name: "Nguyễn Văn A",
  nick: "Anh A",
  role: "manager",
  tags: ["TAG_008", "TAG_001"],
  personality: "Điềm tĩnh, nghiêm túc nhưng hay đùa.",
  note: "Dữ liệu mẫu",
  shift: "Hành chính",
  phone: "09xx xxx 001",
  start: "2020-03-01",
  skills: "Quản lý, đặt hàng",
  ext: {},
  look: {
    height: 1.78,
    build: 0.55,
    face: "square",
    hair: "#2b2220",
    acc: ["tie"],
  },
  routine: {
    type: "patrol",
    points: [
      [3.4, 11],
      [3.4, -3.8],
      [-3.4, -3.8],
      [-3.4, 10],
    ],
  },
});
S({
  code: "EMP_0002",
  name: "Bạn (Cửa hàng phó)",
  nick: "CHP",
  role: "deputy",
  tags: ["TAG_006", "TAG_009"],
  personality: "Nhanh nhẹn, hay hỗ trợ mọi người.",
  note: "Dữ liệu mẫu",
  shift: "Ca sáng / chiều",
  phone: "09xx xxx 002",
  start: "2021-06-15",
  skills: "Quản lý ca, kiểm kho",
  ext: {},
  look: {
    height: 1.72,
    build: 0.35,
    hair: "#1d1a2a",
    acc: ["glasses", "lanyard"],
  },
  routine: {
    type: "patrol",
    points: [
      [-3.4, -10],
      [-3.4, -3.8],
      [3.4, -3.8],
      [3.4, -10],
    ],
  },
});
S({
  code: "EMP_0003",
  name: "Trần Thị B",
  nick: "Bé B",
  role: "staff",
  tags: ["TAG_003", "TAG_005"],
  personality: "Hiền, hay cười.",
  note: "Dữ liệu mẫu",
  shift: "Ca sáng",
  phone: "09xx xxx 003",
  start: "2023-02-10",
  skills: "Thu ngân",
  ext: {},
  look: {
    height: 1.58,
    build: 0.25,
    hairStyle: "pony",
    hair: "#4a2c2a",
    eyes: "happy",
    acc: ["catears"],
  },
  routine: { type: "station", code: "CASHIER_001", side: "back", act: "scan" },
});
S({
  code: "EMP_0004",
  name: "Lê Văn C",
  nick: "Cu C",
  role: "staff",
  tags: ["TAG_004", "TAG_010"],
  personality: "Ít nói, làm chắc tay.",
  note: "Dữ liệu mẫu",
  shift: "Ca chiều",
  phone: "09xx xxx 004",
  start: "2023-08-20",
  skills: "Sắp xếp hàng, kho",
  ext: {},
  look: {
    height: 1.82,
    build: 0.8,
    skin: "#dcab88",
    hair: "#151515",
    acc: ["cap"],
  },
  routine: { type: "station", code: "SHELF_002", side: "front", act: "stock" },
});
S({
  code: "EMP_0005",
  name: "Phạm Thị D",
  nick: "Bé D",
  role: "staff",
  tags: ["TAG_007", "TAG_002"],
  personality: "Hào hứng, học nhanh.",
  note: "Dữ liệu mẫu",
  shift: "Ca tối",
  phone: "09xx xxx 005",
  start: "2024-01-05",
  skills: "Thu ngân, rau củ",
  ext: {},
  look: {
    height: 1.63,
    build: 0.45,
    hairStyle: "bun",
    hair: "#6b3f2a",
    eyes: "big",
    acc: ["apron"],
  },
  routine: { type: "station", code: "SHELF_006", side: "front", act: "stock" },
});
S({
  code: "EMP_0006",
  name: "Hoàng Văn E",
  nick: "Em E",
  role: "staff",
  tags: ["TAG_001"],
  personality: "",
  note: "",
  shift: "Ca sáng",
  phone: "",
  start: "2024-09-12",
  skills: "Thu ngân",
  ext: {},
  look: {
    height: 1.68,
    build: 1,
    hairStyle: "bob",
    skin: "#e3b894",
    hair: "#201a18",
  },
  routine: { type: "station", code: "CASHIER_002", side: "back", act: "scan" },
});

const DEFAULT_STAFF = JSON.stringify({
  staff: StaffRegistry.all(),
  tags: TagRegistry.all(),
});
const SKEY = "store-staff-v3";
try {
  const d = JSON.parse(localStorage.getItem(SKEY));
  if (d && Array.isArray(d.staff)) {
    StaffRegistry.clear();
    d.staff.forEach(S);
    TagRegistry.clear();
    (d.tags || []).forEach((t) => {
      t.icon = EMO[t.icon] || t.icon;
      TagRegistry.register(t);
    });
  }
} catch (e) {}
const saveStaff = () => {
  try {
    localStorage.setItem(
      SKEY,
      JSON.stringify({ staff: StaffRegistry.all(), tags: TagRegistry.all() }),
    );
  } catch (e) {}
};

/* ============ NHÂN VIÊN: model 3D tham số hóa (chiều cao, thể hình, tỷ lệ, tóc, mặt, phụ kiện) + hành động ============ */
const hex = (v) => parseInt(String(v).replace("#", ""), 16) || 0;
function makeChar(s) {
  const k = { ...LOOK0, ...s.look },
    gray = (ROLES[s.role] || ROLES.staff)[1] === "gray",
    shirt = gray ? 0x9a9aa0 : 0xff8fb1,
    W = 0.8 + k.build * 0.6,
    LEG = 0.82 * k.legRatio,
    ARM = 0.55 * k.armRatio,
    by = LEG + 0.1,
    skin = hex(k.skin),
    hair = hex(k.hair),
    pants = hex(k.pants),
    shoes = hex(k.shoes);
  const g = new THREE.Group(),
    b = new THREE.Group();
  b.position.y = by;
  g.add(b);
  g.scale.setScalar(k.height / 1.72);
  const mk = (ge, c, x, y, z, p = b, r = 0.75) => {
    const m = new THREE.Mesh(ge, M(c, r));
    m.position.set(x, y, z);
    m.castShadow = true;
    p.add(m);
    return m;
  };
  const cy = (a, h) => new THREE.CylinderGeometry(a, a * 0.92, h, 16),
    sp = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h),
    bx = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  mk(cy(0.2 * W, 0.55), shirt, 0, 0.3, 0);
  mk(cy(0.18 * W, 0.16), pants, 0, -0.04, 0);
  mk(cy(0.05, 0.08), skin, 0, 0.62, 0);
  mk(bx(0.1, 0.06, 0.01), 0xffffff, 0.1 * W, 0.45, 0.19 * W);
  const head = new THREE.Group();
  head.position.y = 0.78;
  b.add(head);
  const fs = {
    oval: [0.96, 1.06, 1],
    round: [1.06, 0.98, 1.02],
    square: [1.04, 0.98, 1.04],
  }[k.face] || [1, 1, 1];
  head.scale.set(fs[0] * k.headSize, fs[1] * k.headSize, fs[2] * k.headSize);
  mk(sp(0.15, 20, 16), skin, 0, 0, 0, head);
  const hs = k.hairStyle;
  if (hs !== "none") {
    mk(
      new THREE.SphereGeometry(0.16, 20, 12, 0, 2 * PI, 0, PI * 0.52),
      hair,
      0,
      0.01,
      -0.01,
      head,
    );
    if (hs === "long") mk(bx(0.31, 0.36, 0.1), hair, 0, -0.12, -0.1, head);
    if (hs === "bob") {
      mk(bx(0.33, 0.2, 0.1), hair, 0, -0.03, -0.09, head);
      [-1, 1].forEach((x) =>
        mk(bx(0.04, 0.2, 0.2), hair, x * 0.15, -0.03, -0.02, head),
      );
    }
    if (hs === "bun") mk(sp(0.075), hair, 0, 0.17, -0.05, head);
    if (hs === "pony") {
      mk(sp(0.06), hair, 0, 0.02, -0.17, head);
      mk(cy(0.04, 0.26), hair, 0, -0.12, -0.19, head);
    }
  }
  [-1, 1].forEach((x) => {
    if (k.eyes === "happy")
      mk(bx(0.05, 0.012, 0.01), 0x1d1d1f, x * 0.055, 0, 0.145, head);
    else if (k.eyes === "big") {
      mk(sp(0.03, 10, 8), 0xffffff, x * 0.055, 0, 0.13, head);
      mk(sp(0.016, 8, 6), 0x1d1d1f, x * 0.055, 0, 0.158, head);
    } else mk(sp(0.018, 8, 8), 0x1d1d1f, x * 0.055, 0, 0.14, head);
    if (k.blush)
      mk(sp(0.03, 10, 8), 0xff8fb1, x * 0.095, -0.04, 0.125, head).scale.z =
        0.3;
  });
  mk(bx(0.045, 0.01, 0.01), 0xb8505f, 0, -0.07, 0.145, head);
  const A = k.acc || [];
  if (A.includes("glasses")) {
    [-1, 1].forEach((x) =>
      mk(
        new THREE.TorusGeometry(0.036, 0.006, 6, 16),
        0x1d1d1f,
        x * 0.055,
        0,
        0.15,
        head,
      ),
    );
    mk(bx(0.03, 0.006, 0.006), 0x1d1d1f, 0, 0.005, 0.15, head);
  }
  if (A.includes("cap")) {
    mk(
      new THREE.SphereGeometry(0.17, 16, 10, 0, 2 * PI, 0, PI * 0.45),
      shirt,
      0,
      0.03,
      0,
      head,
    );
    mk(bx(0.2, 0.01, 0.12), shirt, 0, 0.05, 0.16, head);
  }
  if (A.includes("catears"))
    [-1, 1].forEach((x) => {
      mk(
        new THREE.ConeGeometry(0.05, 0.11, 4),
        hair,
        x * 0.09,
        0.17,
        0,
        head,
      ).rotation.z = -x * 0.3;
    });
  if (A.includes("apron"))
    mk(bx(0.34 * W, 0.42, 0.02), 0xffffff, 0, 0.22, 0.205 * W);
  if (A.includes("lanyard")) {
    mk(bx(0.025, 0.3, 0.01), 0x0a84ff, 0, 0.42, 0.205 * W);
    mk(bx(0.07, 0.09, 0.01), 0xffffff, 0, 0.25, 0.215 * W);
  }
  if (A.includes("tie")) mk(bx(0.05, 0.24, 0.01), 0x1c3a6b, 0, 0.38, 0.21 * W);
  const arm = (x) => {
    const a = new THREE.Group();
    a.position.set(x * (0.2 * W + 0.05), 0.52, 0);
    b.add(a);
    mk(cy(0.055 * W, ARM), skin, 0, -ARM / 2, 0, a);
    mk(cy(0.065 * W, 0.26), shirt, 0, -0.1, 0, a);
    mk(sp(0.06, 10, 8), skin, 0, -ARM - 0.01, 0, a);
    return a;
  };
  const leg = (x) => {
    const l = new THREE.Group();
    l.position.set(x * 0.09 * W, -0.06, 0);
    b.add(l);
    mk(cy(0.075 * W, LEG), pants, 0, -LEG / 2, 0, l);
    mk(bx(0.13 * W, 0.07, 0.24), shoes, 0, -LEG - 0.02, 0.04, l);
    return l;
  };
  return {
    g,
    b,
    head,
    by,
    aL: arm(-1),
    aR: arm(1),
    lL: leg(-1),
    lR: leg(1),
    mode: "idle",
    cur: {},
    s,
    sc: k.height / 1.72,
    pop: 1,
  };
}
/* giải phóng hình học của model cũ (vật liệu dùng chung nên giữ lại) */
function disposeChar(c) {
  if (c && c.g)
    c.g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
}
function pose(c, dt, t) {
  const m = c.mode,
    w = Math.sin(t * 7),
    T = {
      ll: 0,
      lr: 0,
      al: Math.sin(t * 1.6) * 0.04,
      ar: -Math.sin(t * 1.6) * 0.04,
      arz: 0,
      alz: 0,
      lean: 0,
      bob: Math.sin(t * 2) * 0.006,
      hx: 0,
    };
  if (m === "walk") {
    T.ll = w * 0.6;
    T.lr = -w * 0.6;
    T.al = -w * 0.55;
    T.ar = w * 0.55;
    T.bob = Math.abs(Math.cos(t * 7)) * 0.035;
  }
  if (m === "wave") {
    T.ar = -2.7;
    T.arz = -0.3 + Math.sin(t * 8) * 0.45;
  }
  if (m === "scan") {
    T.ar = -1.05 + Math.sin(t * 3) * 0.28;
    T.al = -0.7;
    T.hx = 0.35;
    T.lean = 0.06;
  }
  if (m === "stock") {
    T.ar = -1.3 + Math.sin(t * 2.4) * 0.25;
    T.al = -1.3 + Math.sin(t * 2.4 + 1) * 0.25;
    T.lean = 0.12;
    T.hx = 0.1;
  }
  const k = 1 - Math.exp(-dt * 10),
    C = c.cur;
  for (const n in T) C[n] = (C[n] ?? T[n]) + (T[n] - (C[n] ?? T[n])) * k;
  c.lL.rotation.x = C.ll;
  c.lR.rotation.x = C.lr;
  c.aL.rotation.x = C.al;
  c.aR.rotation.x = C.ar;
  c.aR.rotation.z = C.arz;
  c.aL.rotation.z = C.alz;
  c.b.rotation.x = C.lean;
  c.b.position.y = c.by + C.bob;
  c.head.rotation.x = C.hx;
}
const turn = (a, b, k) => {
  let d = ((((b - a + PI) % (2 * PI)) + 2 * PI) % (2 * PI)) - PI;
  return a + d * k;
};

/* ============ CẢNH CỬA HÀNG ============ */
const cv = $("#cv"),
  ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
ren.setPixelRatio(Math.min(devicePixelRatio, 1.25));
ren.shadowMap.enabled = true;
ren.shadowMap.autoUpdate = false;
ren.shadowMap.type = THREE.PCFSoftShadowMap;
ren.outputEncoding = THREE.sRGBEncoding;
ren.toneMapping = THREE.ACESFilmicToneMapping;
ren.toneMappingExposure = 1.05;
const scene = new THREE.Scene(),
  dm = matchMedia("(prefers-color-scheme:dark)");
const setBg = () => {
  const c = new THREE.Color(dm.matches ? 0x24262d : 0xe6e9ef);
  scene.background = c;
  scene.fog = new THREE.Fog(c, 80, 150);
  gmat.color.set(dm.matches ? 0x2c2f37 : 0xdadee5);
};
scene.add(new THREE.HemisphereLight(0xffffff, 0xbfbfc6, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(-10, 24, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {
  left: -20,
  right: 20,
  top: 20,
  bottom: -20,
  near: 1,
  far: 70,
});
sun.shadow.bias = -0.0004;
sun.shadow.radius = 3;
scene.add(sun);
/* cam: th/ph/r + điểm nhìn (tx,ty,tz); T = đích animation (null khi người dùng tự điều khiển); ox/oy = bù vùng bị panel che */
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200),
  cam = {
    th: 0,
    vth: 0,
    ph: 0.85,
    r: 46,
    fit: 46,
    tx: 0,
    ty: 0,
    tz: -1,
    ox: 0,
    oy: 0,
    T: null,
  };

/* các đoạn tường theo phía; vòng lặp hạ thấp phía gần camera để nhìn được vào trong */
/* vật liệu tường theo từng phía; mờ nhẹ khi camera ở phía đó */
const WFADE = 0.3; /* độ đục khi mờ: 0 = tàng hình, 1 = đặc */
const WALLS = {};
const wallSet = (key) =>
  WALLS[key] ||
  (WALLS[key] = {
    f: 1,
    o: { w: 1, c: 1, b: 1, g: GLASS.opacity },
    m: {
      w: new THREE.MeshStandardMaterial({
        color: 0xfafafc,
        roughness: 0.7,
        transparent: true,
      }),
      c: new THREE.MeshStandardMaterial({
        color: 0xb4bac6,
        roughness: 0.6,
        transparent: true,
      }),
      b: new THREE.MeshStandardMaterial({
        color: 0xc9ced6,
        roughness: 0.7,
        transparent: true,
      }),
      g: GLASS.clone(),
    },
  });

(function shell() {
  const { W, D } = STORE,
    hw = W / 2,
    hd = D / 2,
    H = 3,
    t = 0.24;
  /* sàn gạch */
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#ececef";
  x.fillRect(0, 0, 128, 128);
  x.strokeStyle = "#dcdce0";
  x.lineWidth = 3;
  x.strokeRect(0, 0, 128, 128);
  const tx = new THREE.CanvasTexture(c);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.repeat.set(W / 1.5, D / 1.5);
  tx.anisotropy = 4;
  const fl = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ map: tx, roughness: 0.35 }),
  );
  fl.rotation.x = -PI / 2;
  fl.receiveShadow = true;
  scene.add(fl);
  rb(W + 1, 0.1, 5, 0xd4d4d8, 0, -0.1, -hd - 2.5, scene, 0.02);

  /* tường ngang (chạy theo x); glass = nửa trên là kính (mặt tiền) */
  const hwall = (a, b, z, key, glass) => {
    const len = b - a,
      S = wallSet(key);
    if (glass) {
      rb(len, 0.9, t, S.m.w, (a + b) / 2, 0, z, scene, 0.03);
      const gh = H - 0.98,
        gl = new THREE.Mesh(new THREE.BoxGeometry(len, gh, 0.05), S.m.g);
      gl.position.set((a + b) / 2, 0.9 + gh / 2, z);
      scene.add(gl);
    } else rb(len, H, t, S.m.w, (a + b) / 2, 0, z, scene, 0.03);
    rb(
      len + 0.02,
      0.08,
      t + 0.06,
      S.m.c,
      (a + b) / 2,
      H - 0.08,
      z,
      scene,
      0.02,
    );
    rb(len + 0.02, 0.12, t + 0.04, S.m.b, (a + b) / 2, 0, z, scene, 0.02);
  };
  /* dầm trên khung cửa */
  const lintel = (a, b, z, key) => {
    const len = b - a,
      S = wallSet(key);
    rb(len, H - 2.4, t, S.m.w, (a + b) / 2, 2.4, z, scene, 0.03);
    rb(
      len + 0.02,
      0.08,
      t + 0.06,
      S.m.c,
      (a + b) / 2,
      H - 0.08,
      z,
      scene,
      0.02,
    );
  };
  /* tường dọc (chạy theo z) */
  const vwall = (px, a, b, key) => {
    const len = b - a,
      S = wallSet(key);
    rb(t, H, len, S.m.w, px, 0, (a + b) / 2, scene, 0.03);
    rb(t + 0.06, 0.08, len, S.m.c, px, H - 0.08, (a + b) / 2, scene, 0.02);
    rb(t + 0.04, 0.12, len, S.m.b, px, 0, (a + b) / 2, scene, 0.02);
  };

  /* mặt tiền dựng bằng hàm để dựng lại được khi dời cửa */
  let front = [];
  function buildFront() {
    front.forEach((o) => scene.remove(o));
    const n0 = scene.children.length,
      [d0, d1] = STORE.door,
      dm = (d0 + d1) / 2;
    hwall(-hw - t / 2, d0, hd, "f", true);
    hwall(d1, hw + t / 2, hd, "f", true);
    lintel(d0, d1, hd, "f");
    rb(
      d1 - d0,
      0.03,
      1.5,
      0x3a3a40,
      dm,
      0,
      hd - 0.8,
      scene,
      0.01,
    ); /* thảm cửa */
    front = scene.children.slice(n0);
  }
  buildFront();
  window.rebuildFront = buildFront;

  /* tường sau: chừa cửa kho; kéo dài ra hai bên cho khít phòng kho */
  hwall(-hw - 0.5 - t / 2, STORE.kho[0], -hd, "b");
  hwall(STORE.kho[1], hw + 0.5 + t / 2, -hd, "b");
  lintel(STORE.kho[0], STORE.kho[1], -hd, "b");
  /* hai bên */
  vwall(-hw, -hd, hd, "l");
  vwall(hw, -hd, hd, "r");
  /* phòng kho phía sau */
  vwall(-hw - 0.5, -hd - 5, -hd, "rl");
  vwall(hw + 0.5, -hd - 5, -hd, "rr");
  hwall(-hw - 0.5 - t / 2, hw + 0.5 + t / 2, -hd - 5, "bb");

  for (let i = 0; i < 5; i++)
    rb(0.9, 0.6, 0.7, 0xc9a678, -5 + i * 1.6, 0, -hd - 2, scene, 0.04);
})();

const gmat = new THREE.MeshStandardMaterial({ color: 0xdadee5, roughness: 1 });
(function env() {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), gmat);
  g.rotation.x = -PI / 2;
  g.position.y = -0.2;
  g.receiveShadow = true;
  scene.add(g);
  rb(STORE.W + 7, 0.12, STORE.D + 11, 0xc9ced6, 0, -0.2, -1.5, scene, 0.2);
  rb(STORE.W + 7, 0.02, 3, 0x9aa0ab, 0, -0.07, STORE.D / 2 + 3.4, scene, 0.01);
  const tree = (x, z, k) => {
    const t = new THREE.Group();
    rb(0.25, 1.3 * k, 0.25, 0x8a6d4f, 0, 0, 0, t, 0.08);
    [
      [0, 1.7, 0, 0.85],
      [0.35, 1.35, 0.1, 0.55],
      [-0.35, 1.4, -0.1, 0.5],
    ].forEach(([a, b, c, r]) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r * k, 16, 12),
        M(0x6fae6b, 0.9),
      );
      m.position.set(a * k, b * k, c * k);
      m.castShadow = true;
      t.add(m);
    });
    t.position.set(x, -0.08, z);
    scene.add(t);
  };
  [
    [-9.3, 16],
    [9.3, 16],
    [-9.3, 7],
    [9.3, 7],
    [-9.3, -3],
    [9.3, -3],
    [-9.3, -12],
    [9.3, -12],
    [-9.3, -19],
    [9.3, -19],
    [-4, 19.5],
    [4, 19.5],
  ].forEach((q, i) => tree(q[0], q[1], 0.9 + (i % 3) * 0.12));
  [
    [-9.6, 11],
    [9.6, 11],
    [-9.6, -8],
    [9.6, -8],
  ].forEach((q) => rb(0.7, 0.4, 0.7, 0xb7bcc6, q[0], -0.08, q[1], scene, 0.08));
})();
function tag(text, x, y, z, w, plain) {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 80;
  const g = c.getContext("2d");
  g.fillStyle = plain ? "rgba(60,60,67,.85)" : "rgba(255,255,255,.82)";
  g.beginPath();
  g.roundRect(6, 12, 308, 56, 28);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,.95)";
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = plain ? "#fff" : "#1d1d1f";
  let f = 30;
  do g.font = "600 " + f + "px -apple-system,Segoe UI,sans-serif";
  while (g.measureText(text).width > 290 && --f > 12);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 160, 41);
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      depthTest: false,
    }),
  );
  s.position.set(x, y, z);
  s.scale.set(w, w / 4, 1);
  s.renderOrder = 9;
  scene.add(s);
  return s;
}

/* Dựng / cập nhật quầy */
const groups = {},
  labels = {};

/* ---------- BƯỚC 2: thêm hàm mergeGroup() (đặt ngay trên function build) ----------
   Gom mọi Mesh con của một quầy (kể cả mesh nằm trong Group lồng nhau như cá, cua)
   thành vài Mesh duy nhất, mỗi vật liệu một Mesh. Vài trăm–vài nghìn draw call
   của một quầy còn lại khoảng 15–40.
   Chỉ dùng mảng thô nên không phụ thuộc phiên bản three.js.                       */
function mergeGroup(g) {
  g.updateMatrixWorld(true);
  const buckets = new Map(); /* material → {pos[], nor[], uv[]} */
  const meshes = [];
  g.traverse((o) => {
    if (o.isMesh && o.geometry && o.geometry.attributes.position)
      meshes.push(o);
  });
  const m3 = new Float32Array(9);
  for (const o of meshes) {
    const geom = o.geometry,
      pa = geom.attributes.position.array,
      na = geom.attributes.normal ? geom.attributes.normal.array : null,
      ua = geom.attributes.uv ? geom.attributes.uv.array : null,
      idx = geom.index ? geom.index.array : null,
      e = o.matrixWorld.elements,
      n = idx ? idx.length : pa.length / 3;
    /* ma trận pháp tuyến = nghịch đảo chuyển vị của 3x3 trên-trái */
    const a = e[0],
      b = e[4],
      c = e[8],
      d = e[1],
      f = e[5],
      h = e[9],
      i = e[2],
      j = e[6],
      k = e[10];
    const A = f * k - h * j,
      B = h * i - d * k,
      C = d * j - f * i;
    let det = a * A + b * B + c * C;
    det = det ? 1 / det : 1;
    m3[0] = A * det;
    m3[1] = B * det;
    m3[2] = C * det;
    m3[3] = (c * j - b * k) * det;
    m3[4] = (a * k - c * i) * det;
    m3[5] = (b * i - a * j) * det;
    m3[6] = (b * h - c * f) * det;
    m3[7] = (c * d - a * h) * det;
    m3[8] = (a * f - b * d) * det;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.length > 1) continue; /* vật liệu mảng: bỏ qua, giữ nguyên mesh */
    const mat = mats[0];
    let bk = buckets.get(mat);
    if (!bk) buckets.set(mat, (bk = { pos: [], nor: [], uv: [], o: [] }));
    bk.o.push(o);
    for (let t = 0; t < n; t++) {
      const v = idx ? idx[t] : t,
        x = pa[v * 3],
        y = pa[v * 3 + 1],
        z = pa[v * 3 + 2];
      bk.pos.push(
        e[0] * x + e[4] * y + e[8] * z + e[12],
        e[1] * x + e[5] * y + e[9] * z + e[13],
        e[2] * x + e[6] * y + e[10] * z + e[14],
      );
      if (na) {
        /* n' = (M⁻¹)ᵀ·n ; m3[3*c+r] = M⁻¹[r][c] */
        const nx = na[v * 3],
          ny = na[v * 3 + 1],
          nz = na[v * 3 + 2];
        const X = m3[0] * nx + m3[1] * ny + m3[2] * nz,
          Y = m3[3] * nx + m3[4] * ny + m3[5] * nz,
          Z = m3[6] * nx + m3[7] * ny + m3[8] * nz;
        const L = Math.hypot(X, Y, Z) || 1;
        bk.nor.push(X / L, Y / L, Z / L);
      } else bk.nor.push(0, 1, 0);
      if (ua) bk.uv.push(ua[v * 2], ua[v * 2 + 1]);
      else bk.uv.push(0, 0);
    }
  }
  /* bỏ mesh cũ */
  const done = new Set();
  buckets.forEach((bk) => bk.o.forEach((o) => done.add(o)));
  done.forEach((o) => o.parent && o.parent.remove(o));
  /* dọn Group rỗng còn sót (cá/cua…) */
  const empties = [];
  g.traverse((o) => {
    if (o !== g && o.isGroup && !o.children.length) empties.push(o);
  });
  empties.forEach((o) => o.parent && o.parent.remove(o));
  /* tạo mesh gộp */
  buckets.forEach((bk, mat) => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(bk.pos), 3),
    );
    geom.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(bk.nor), 3),
    );
    geom.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array(bk.uv), 2),
    );
    geom.computeBoundingSphere();
    geom.computeBoundingBox();
    const m = new THREE.Mesh(geom, mat);
    /* kính trong suốt không đổ/nhận bóng để đỡ tốn */
    m.receiveShadow = !mat.transparent;
    m.castShadow = !mat.transparent;
    m.matrixAutoUpdate = false; /* quầy tĩnh, khỏi tính lại ma trận mỗi khung */
    m.updateMatrix();
    g.add(m);
  });
}
function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry)
      o.geometry.dispose(); /* geometry gộp là riêng của quầy → giải phóng an toàn */
  });
}

/* ---------- BƯỚC 3: thay build() và unbuild() cũ (khoảng dòng 1184–1202) ---------- */
function build(it) {
  if (typeof BUILD[it.type] !== "function") return;
  const old = groups[it.code];

  if (old) {
    scene.remove(old);
    disposeGroup(old);
  }
  const g = new THREE.Group();
  g.userData.code = it.code;
  BUILD[it.type](it, g);
  mergeGroup(g); /* ← dòng mới: gộp mesh trước khi đặt vị trí */
  g.position.set(it.pos[0], 0, it.pos[1]);
  g.rotation.y = it.rot;
  scene.add(g);
  groups[it.code] = g;
  if (!labels[it.code]) labels[it.code] = tag(it.code, 0, 0, 0, 3);
  labels[it.code].position.set(it.pos[0], 2.7, it.pos[1]);
}
function unbuild(c) {
  if (groups[c]) disposeGroup(groups[c]);
  scene.remove(groups[c]);
  scene.remove(labels[c]);
  delete groups[c];
  delete labels[c];
}
ShelfRegistry.all().forEach(build);
const selMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    color: 0x0a84ff,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  }),
);
selMesh.rotation.x = -PI / 2;
selMesh.position.y = 0.02;
selMesh.visible = false;
scene.add(selMesh);

/* NPC nhân viên trong cửa hàng */
const npcs = [];
function addNpc(s) {
  const c = makeChar(s);
  c.g.userData.staff = s.code;
  c.i = 0;
  c.wait = 0;
  const r =
    s.routine ||
    (s.routine = {
      type: "patrol",
      points: [
        [3.4, 8],
        [3.4, -3.8],
      ],
    });
  const p = r.type === "patrol" ? r.points[0] : [2 + npcs.length * 0.3, 11];
  c.g.position.set(p[0], 0, p[1]);
  scene.add(c.g);
  npcs.push(c);
  return c;
}
StaffRegistry.all().forEach((s) => addNpc(s));
function goal(n) {
  const r = n.s.routine;
  if (r.type === "patrol") {
    const p = r.points[n.i % r.points.length];
    return { x: p[0], z: p[1], act: "idle" };
  }
  const it = ShelfRegistry.get(r.code);
  if (!it) return { x: n.g.position.x, z: n.g.position.z, act: "idle" };
  const lx = r.side === "front" ? it.size[0] / 2 + 0.75 : -it.size[0] / 2 - 0.5,
    c = Math.cos(it.rot),
    sn = Math.sin(it.rot);
  return {
    x: it.pos[0] + lx * c,
    z: it.pos[1] - lx * sn,
    act: r.act,
    face: it.pos,
  };
}
function stepNpc(n, dt, t) {
  const gl = goal(n),
    p = n.g.position,
    dx = gl.x - p.x,
    dz = gl.z - p.z,
    d = Math.hypot(dx, dz);
  if (d > 0.08) {
    n.mode = "walk";
    const v = Math.min(d, 1.3 * dt);
    p.x += (dx / d) * v;
    p.z += (dz / d) * v;
    n.g.rotation.y = turn(
      n.g.rotation.y,
      Math.atan2(dx, dz),
      Math.min(1, dt * 8),
    );
  } else {
    n.mode = gl.act;
    if (gl.face)
      n.g.rotation.y = turn(
        n.g.rotation.y,
        Math.atan2(gl.face[0] - p.x, gl.face[1] - p.z),
        Math.min(1, dt * 6),
      );
    if (n.s.routine.type === "patrol" && (n.wait += dt) > 2) {
      n.wait = 0;
      n.i++;
    }
  }
  pose(n, dt, t);
}

/* ============ CAMERA: điều khiển tay + tự động focus mượt ============ */
const wrap = (a) => ((((a + PI) % (2 * PI)) + 2 * PI) % (2 * PI)) - PI;
let vo = null;
function fit() {
  const w = cv.clientWidth,
    h = cv.clientHeight;
  if (!w) return;
  ren.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  vo = null;
  const t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
    need = Math.max((STORE.D + 10) / t, (STORE.W + 5) / (t * camera.aspect)),
    had = Math.abs(cam.r - cam.fit) < 0.01;
  cam.fit = need;
  if (had) cam.r = need;
  if (cam.T && cam.T.ov) cam.T.r = need;
}
function updCam() {
  const s = Math.sin(cam.ph),
    c = Math.cos(cam.ph);
  camera.position.set(
    cam.tx + cam.r * s * Math.sin(cam.th),
    cam.ty + cam.r * c,
    cam.tz + cam.r * s * Math.cos(cam.th),
  );
  camera.lookAt(cam.tx, cam.ty, cam.tz);
}
const zoom = (k) => {
  cam.T = null;
  cam.r = THREE.MathUtils.clamp(cam.r * k, 3, cam.fit * 1.3);
};

/* biên cho phép trượt: quanh cửa hàng + sân + kho */
function clampTarget() {
  cam.tx = THREE.MathUtils.clamp(cam.tx, -STORE.W / 2 - 6, STORE.W / 2 + 6);
  cam.tz = THREE.MathUtils.clamp(cam.tz, -STORE.D / 2 - 9, STORE.D / 2 + 8);
}
/* trượt theo số pixel kéo trên màn hình (dx,dy) – theo đúng hướng camera đang nhìn */
function panPx(dx, dy) {
  cam.T = null;
  cam.vth = 0;
  const h = cv.clientHeight || 1,
    k = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * cam.r) / h,
    fz = k / Math.max(0.35, Math.cos(cam.ph)),
    sn = Math.sin(cam.th),
    cs = Math.cos(cam.th);
  cam.tx += -dx * k * cs + dy * fz * -sn;
  cam.tz += dx * k * sn + dy * fz * -cs;
  clampTarget();
}
/* đi bằng bàn phím */
const keysDown = new Set(),
  PK = {
    w: "f",
    arrowup: "f",
    s: "b",
    arrowdown: "b",
    a: "l",
    arrowleft: "l",
    d: "r",
    arrowright: "r",
    q: "ql",
    e: "qr",
  };
function stepKeys(dt) {
  if (!keysDown.size) return;
  const sp = Math.max(2, cam.r * 0.7) * dt,
    sn = Math.sin(cam.th),
    cs = Math.cos(cam.th);
  let f = 0,
    r = 0;
  if (keysDown.has("f")) f += 1;
  if (keysDown.has("b")) f -= 1;
  if (keysDown.has("r")) r += 1;
  if (keysDown.has("l")) r -= 1;
  if (keysDown.has("ql")) cam.th += 1.4 * dt;
  if (keysDown.has("qr")) cam.th -= 1.4 * dt;
  if (f || r) {
    cam.tx += (-sn * f + cs * r) * sp;
    cam.tz += (-cs * f - sn * r) * sp;
    clampTarget();
  }
}
addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  if (
    tab !== "store" ||
    document.querySelector("#modal.on,#dmodal.on,#amodal.on")
  )
    return;
  const k = PK[e.key.toLowerCase()];
  if (!k) return;
  keysDown.add(k);
  cam.T = null;
  cam.vth = 0;
  e.preventDefault();
});
addEventListener("keyup", (e) => {
  const k = PK[e.key.toLowerCase()];
  if (k) keysDown.delete(k);
});
addEventListener("blur", () => keysDown.clear());
const CK = ["th", "ph", "r", "tx", "ty", "tz"];
function stepCam(dt) {
  const T = cam.T;
  if (!T) return;
  const k = 1 - Math.exp(-dt * 5);
  let done = true;
  CK.forEach((n) => {
    const d = T[n] - cam[n];
    cam[n] += d * k;
    if (Math.abs(d) > (n === "r" ? 0.03 : 0.004)) done = false;
  });
  if (done) {
    CK.forEach((n) => (cam[n] = T[n]));
    cam.T = null;
  }
}
/* bù vùng bị panel che: PC → panel bên phải, SP → thanh công cụ trên + panel dưới */
function offsetTarget() {
  if (mode !== "edit" || !selected) return [0, 0];
  const e = $("#insp"),
    r = e.getBoundingClientRect(),
    w = cv.clientWidth,
    h = cv.clientHeight;
  if (!r.width || !w) return [0, 0];
  if (innerWidth > 720) return [Math.max(0, (w - r.left + 12) / 2), 0];
  const a = $("#add").getBoundingClientRect(),
    top = a.height ? a.bottom : 70,
    c = (top + r.top - 8) / 2;
  return [0, THREE.MathUtils.clamp(h / 2 - c, 0, h * 0.4)];
}
function applyOffset(dt) {
  const [tx, ty] = offsetTarget(),
    k = 1 - Math.exp(-dt * 6);
  cam.ox += (tx - cam.ox) * k;
  cam.oy += (ty - cam.oy) * k;
  const w = cv.clientWidth,
    h = cv.clientHeight;
  if (!w) return;
  const key = w + "|" + h + "|" + cam.ox.toFixed(1) + "|" + cam.oy.toFixed(1);
  if (key === vo) return;
  vo = key;
  if (Math.abs(cam.ox) < 0.2 && Math.abs(cam.oy) < 0.2)
    camera.clearViewOffset();
  else camera.setViewOffset(w, h, cam.ox, cam.oy, w, h);
}
/* kiểm tra tầm nhìn tới quầy có bị quầy khác che không */
const occR = new THREE.Raycaster();
function occlusion(it, th, ph, r) {
  const s = Math.sin(ph),
    c = Math.cos(ph),
    tg = new THREE.Vector3(it.pos[0], 0.9, it.pos[1]),
    cp = new THREE.Vector3(
      tg.x + r * s * Math.sin(th),
      tg.y + r * c,
      tg.z + r * s * Math.cos(th),
    ),
    ux = Math.sin(it.rot),
    uz = Math.cos(it.rot),
    others = Object.keys(groups)
      .filter((k) => k !== it.code)
      .map((k) => groups[k]);
  let n = 0;
  [-0.4, 0, 0.4].forEach((f) => {
    const p = new THREE.Vector3(
        tg.x + ux * it.size[1] * f,
        0.9,
        tg.z + uz * it.size[1] * f,
      ),
      d = p.clone().sub(cp),
      L = d.length();
    occR.set(cp, d.normalize());
    occR.far = Math.max(0.1, L - 0.2);
    if (occR.intersectObjects(others, true).length) n++;
  });
  return n;
}
function focusItem(code) {
  const it = ShelfRegistry.get(code);
  if (!it) return;
  const t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
    a = Math.min(1, camera.aspect || 1),
    ext = Math.max(it.size[0], it.size[1]),
    r = THREE.MathUtils.clamp((ext + 1.8) / (t * a), 4.5, Math.max(cam.fit, 8)),
    thF = Math.atan2(Math.cos(it.rot), -Math.sin(it.rot));
   cam.vth = 0;
  cam.T = {
    th: cam.th + wrap(thF - cam.th) /* luôn bay tới mặt chính diện, đi theo hướng xoay ngắn nhất */,
    ph: 0.62,
    r,
    tx: it.pos[0],
    ty: 0.8,
    tz: it.pos[1],
  };
}
function overview() {
  cam.vth = 0;
  cam.T = {
    th: cam.th,
    ph: mode === "edit" ? 0.6 : 0.85,
    r: cam.fit,
    tx: 0,
    ty: 0,
    tz: -1,
    ov: true,
  };
}

/* Tương tác */
const ray = new THREE.Raycaster(),
  mv = new THREE.Vector2(),
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  pt = new THREE.Vector3();
function aim(e) {
  const r = cv.getBoundingClientRect();
  mv.set(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    -((e.clientY - r.top) / r.height) * 2 + 1,
  );
  ray.setFromCamera(mv, camera);
}
function hit(e) {
  aim(e);
  const list = [
      ...Object.values(groups),
      ...(showStaff && mode === "view" ? npcs.map((n) => n.g) : []),
    ],
    h = ray.intersectObjects(list, true)[0];
  if (!h) return {};
  let o = h.object;
  while (o && !o.userData.code && !o.userData.staff) o = o.parent;
  return o ? { code: o.userData.code, staff: o.userData.staff } : {};
}
let mode = "view",
  selected = null,
  drag = null,
  moved = 0,
  pinch = 0,
  showStaff = true,
  tapC = null,
  panning = false,
  cen = null;

const ptrs = new Map();
/* ───────── BƯỚC 3: THAY 4 handler pointerdown / pointermove / pointerup / pointercancel của cv ───────── */

cv.addEventListener("pointerdown", (e) => {
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  moved = 0;
  cam.vth = 0;
  tapC = null;
  /* chuột phải / giữa / Shift = trượt */
  panning =
    e.pointerType === "mouse" &&
    (e.button === 1 || e.button === 2 || e.shiftKey);
  if (panning) cam.T = null;
  if (mode === "edit" && ptrs.size === 1 && !panning) {
    const c = pickItem(e);
    tapC = c;
    if (c) {
      if (selected !== c) select(c);
      aim(e);
      ray.ray.intersectPlane(plane, pt);
      const it = ShelfRegistry.get(c);
      drag = { it, ox: it.pos[0] - pt.x, oz: it.pos[1] - pt.z, s0: snap() };
    }
  }
});
cv.addEventListener("pointermove", (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p[0],
    dy = e.clientY - p[1];
  moved += Math.abs(dx) + Math.abs(dy);
  p[0] = e.clientX;
  p[1] = e.clientY;
  if (ptrs.size === 2) {
    /* 2 ngón: chụm = zoom, kéo cả cặp = trượt */
    const [a, b] = [...ptrs.values()],
      d = Math.hypot(a[0] - b[0], a[1] - b[1]),
      cx = (a[0] + b[0]) / 2,
      cy = (a[1] + b[1]) / 2;
    if (pinch) zoom(pinch / d);
    if (cen) panPx(cx - cen[0], cy - cen[1]);
    pinch = d;
    cen = [cx, cy];
    drag = null;
    return;
  }
  if (panning) {
    panPx(dx, dy);
    return;
  }
  if (drag) {
    if (moved < 6) return;
    aim(e);
    if (ray.ray.intersectPlane(plane, pt)) {
      drag.it.pos = snapPos(drag.it, pt.x + drag.ox, pt.z + drag.oz);
      moveItem(drag.it);
    }
  } else if (moved > 3) {
    cam.T = null;
    cam.th -= dx * 0.006;
    cam.vth = -dx * 0.006;
    cam.ph = THREE.MathUtils.clamp(cam.ph - dy * 0.004, 0.25, 1.3);
  }
});
cv.addEventListener("pointerup", (e) => {
  const tap = ptrs.size === 1 && moved < 6 && !panning;
  if (drag) {
    if (snap() !== drag.s0) {
      hist.push(drag.s0);
      fut.length = 0;
      updHist();
      save();
    }
    guides(null, null);
  }
  if (tap) {
    if (mode === "edit") {
      tapC ? select(tapC, true) : select(null);
    } else {
      const h = hit(e);
      if (h.staff) openStaff(h.staff);
      else select(h.code || null);
    }
  }
  drag = null;
  ptrs.delete(e.pointerId);
  pinch = 0;
  cen = null;
  if (!ptrs.size) panning = false;
});
cv.addEventListener("pointercancel", (e) => {
  ptrs.delete(e.pointerId);
  drag = null;
  pinch = 0;
  cen = null;
  panning = false;
});
/* tắt menu chuột phải để dùng chuột phải kéo trượt */
cv.addEventListener("contextmenu", (e) => e.preventDefault());
/* nhấp đúp: lên quầy = zoom tới quầy · lên sàn = bay tới điểm đó */
cv.addEventListener("dblclick", (e) => {
  const h = hit(e);
  if (h.code) return focusItem(h.code);
  aim(e);
  if (!ray.ray.intersectPlane(plane, pt)) return;
  cam.vth = 0;
  cam.T = {
    th: cam.th,
    ph: cam.ph,
    r: cam.r,
    tx: THREE.MathUtils.clamp(pt.x, -STORE.W / 2 - 6, STORE.W / 2 + 6),
    ty: 0,
    tz: THREE.MathUtils.clamp(pt.z, -STORE.D / 2 - 9, STORE.D / 2 + 8),
  };
});
cv.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom(1 + e.deltaY * 0.001);
  },
  { passive: false },
);
addEventListener("keydown", (e) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    mode === "edit" &&
    !["INPUT", "TEXTAREA"].includes(e.target.tagName)
  ) {
    const k = e.key.toLowerCase();
    if (k === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    if (k === "y") {
      e.preventDefault();
      redo();
      return;
    }
  }
  if (e.key === "Escape") $("#modal").classList.remove("on");
  if (mode === "edit" && selected && e.target.tagName !== "INPUT") {
    if (e.key === "r" || e.key === "R") rot(PI / 2);
    if (e.key === "Delete" || e.key === "Backspace") del();
  }
});

/* ============ CỬA HÀNG · giao diện ============ */
function place() {
  const it = selected && ShelfRegistry.get(selected);
  selMesh.visible = !!it;
  if (it) {
    selMesh.position.x = it.pos[0];
    selMesh.position.z = it.pos[1];
    selMesh.rotation.z = it.rot;
    selMesh.scale.set(it.size[0] + 0.5, it.size[1] + 0.5, 1);
  }
}
function select(c, f) {
  selected = c;
  place();
  document
    .querySelectorAll("#legend button")
    .forEach((b) => b.classList.toggle("on", b.dataset.c === c));
  inspector();
  if (f && c && mode === "edit") focusItem(c);
}
let legend = () => {},
  inspector = () => {},
  showPre = () => {},
  openAdd = () => {};
const deg = (r) => Math.round(((((r * 180) / PI) % 360) + 360) % 360);

const STP = {
  r: { bg: 90, sm: 15, pre: [0, 90, 180, 270] },
  d: { bg: 0.5, sm: 0.1, pre: [] },
  w: { bg: 0.1, sm: 0.05, pre: [] },
};

/* ---------- BƯỚC 4: thay hàm rot() (khoảng dòng 1621) ----------
   Xoay quầy không cần dựng lại cả quầy, chỉ cần xoay Group.                   */
function rot(a) {
  const it = ShelfRegistry.get(selected);
  if (!it) return;
  pushHist();
  it.rot += a;
  if (groups[it.code]) groups[it.code].rotation.y = it.rot;
  else build(it);
  place();
  save();
  inspector();
}

function del() {
  if (!selected) return;
  pushHist();
  ShelfRegistry.remove(selected);
  unbuild(selected);
  legend();
  select(null);
  save();
}
function addItem(type, sides, size, pos, rt, name) {
  pushHist();
  const p = TYPES[type][1];
  let n = 1,
    code;
  do code = p + "_" + String(n++).padStart(3, "0");
  while (ShelfRegistry.get(code));
  const it = {
    code,
    name: name || TYPES[type][0] + " mới",
    type,
    sides,
    pos,
    rot: rt || 0,
    size,
    details: {},
  };
  ShelfRegistry.register(it);
  build(it);
  legend();
  select(code, true);
  save();
}

$("#tools").addEventListener("click", (e) => {
  const m = e.target.dataset.m;
  if (!m) return;
  mode = m;
  e.currentTarget
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("on", b.dataset.m === m));
  $("#add").style.display = m === "edit" ? "flex" : "none";
  inspector();
  if (m === "edit" && selected) focusItem(selected);
  else overview();
});

/* ============ NHÂN VIÊN · giao diện: sân khấu 3D, danh sách, modal hồ sơ + chỉnh sửa ============ */
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const clone = (o) => JSON.parse(JSON.stringify(o));
const toast = (m) => {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("on");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("on"), 2800);
};
/* sân khấu nền trong suốt: kính của giao diện hiện qua canvas */
const mkStage = (cvs) => {
  const r = new THREE.WebGLRenderer({
      canvas: cvs,
      antialias: true,
      alpha: true,
    }),
    s = new THREE.Scene(),
    c = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.setClearColor(0x000000, 0);
  r.shadowMap.enabled = true;
  r.outputEncoding = THREE.sRGBEncoding;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  s.add(new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 0.8));
  const l = new THREE.DirectionalLight(0xffffff, 1);
  l.position.set(-3, 6, 5);
  l.castShadow = true;
  l.shadow.mapSize.set(1024, 1024);
  s.add(l);
  const p = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.06, 48),
    M(0xd2d5dc, 0.5),
  );
  p.position.y = -0.03;
  p.receiveShadow = true;
  s.add(p);
  c.position.set(0, 1.25, 5.2);
  c.lookAt(0, 0.9, 0);
  return { r, s, c };
};
/* đặt camera sao cho nhân vật luôn lọt khung cả dọc lẫn ngang (SP dọc, PC ngang) */
function frame(c, a, H, ly) {
  const t = 2 * Math.tan(THREE.MathUtils.degToRad(c.fov / 2));
  c.position.set(0, ly + 0.25, Math.max(H / t, 2.1 / (t * a)));
  c.lookAt(0, ly, 0);
}
const st2 = mkStage($("#cv2")),
  ren2 = st2.r,
  stage = st2.s,
  cam2 = st2.c;
const st3 = mkStage($("#cv3")),
  ren3 = st3.r,
  stage3 = st3.s,
  cam3 = st3.c;
setBg();
dm.addEventListener("change", setBg);
let cur = null,
  act = "idle",
  ry = 0.4,
  pv = null,
  pvMode = "idle",
  pvRy = 0.3,
  draft = null,
  isNew = false;
const ACTS = [
  ["Đứng", "idle"],
  ["Đi bộ", "walk"],
  ["Vẫy tay", "wave"],
  ["Thu ngân", "scan"],
  ["Xếp hàng", "stock"],
];
const ini = (s) =>
  esc((s.nick || s.name || "?").trim().charAt(0).toUpperCase());
const tagsOf = (s) =>
  (s.tags || []).map((c) => TagRegistry.get(c)).filter(Boolean);
const pills = (s) =>
  tagsOf(s)
    .map(
      (t) =>
        `<span class="mt" title="${esc(t.desc)}">${tIc(t)}${esc(t.name)}</span>`,
    )
    .join("");
function renderNote(s) {
  const r = ROLES[s.role] || ROLES.staff,
    F2 = [
      ["Mã", s.code],
      ["Biệt danh", s.nick],
      ["Điện thoại", s.phone],
      ["Vào làm", s.start],
      ["Ca làm", s.shift],
      ["Ghi chú", s.note],
    ],
    sk = s.skills;
  $("#note").innerHTML =
    `<div class="nh"><span class="av">${ini(s)}</span><div class="ni"><b>${esc(s.name)}</b><span class="mute"><i class="ud ${r[1]}"></i><span class="tx">${esc(r[0])}${s.shift ? " · " + esc(s.shift) : ""}</span></span></div><button class="btn pri sm" data-open="1">${IC("edit", 13)}<span>Hồ sơ</span></button></div>
 <div class="nt">${pills(s) || '<span class="mute">Chưa có tag</span>'}</div>
 <div class="dg">${F2.map((f) => `<div><em>${f[0]}</em><span>${esc(f[1] || "—")}</span></div>`).join("")}<div class="w"><em>Kỹ năng</em><span>${esc(sk || "—")}</span></div></div>${s.personality ? '<p class="pers">' + esc(s.personality) + "</p>" : ""}`;
}
function showChar(code) {
  const s = StaffRegistry.get(code);
  if (cur) {
    stage.remove(cur.g);
    disposeChar(cur);
    cur = null;
  }
  if (!s) {
    $("#note").innerHTML = '<span class="mute">Chưa có nhân viên nào.</span>';
    document.querySelectorAll(".srow").forEach((b) => b.classList.remove("on"));
    return;
  }
  document
    .querySelectorAll(".srow")
    .forEach((b) => b.classList.toggle("on", b.dataset.c === code));
  cur = makeChar(s);
  cur.g.rotation.y = ry;
  cur.g.scale.setScalar(cur.sc * 0.88);
  cur.pop = 0;
  stage.add(cur.g);
  cur.mode = act;
  cur.code = code;
  renderNote(s);
  const row = document.querySelector(`.srow[data-c="${code}"]`);
  if (row && row.scrollIntoView)
    try {
      row.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
    } catch (e) {}
}
function renderList() {
  const all = StaffRegistry.all();
  $("#slist").innerHTML =
    '<div class="sh"><b>Nhân viên</b><span>' +
    all.length +
    "</span></div>" +
    all
      .map((s) => {
        const r = ROLES[s.role] || ROLES.staff,
          tg = tagsOf(s),
          sh = tg.slice(0, 3);
        return `<button class="srow" data-c="${s.code}"><div class="c1"><span class="av">${ini(s)}</span><span class="nm"><b>${esc(s.name)}</b><small><i class="ud ${r[1]}"></i><span class="tx">${esc(r[0])}</span></small></span><span class="cd">${esc(s.code)}</span></div><div class="c2">${sh.length ? sh.map((t) => `<span class="mt">${tIc(t)}${esc(t.name)}</span>`).join("") + (tg.length > 3 ? '<span class="mt">+' + (tg.length - 3) + "</span>" : "") : '<span class="mute">Chưa có tag</span>'}</div><div class="c3"><span><em>Ca</em>${esc(s.shift || "—")}</span><span><em>Kỹ năng</em>${esc(s.skills || "—")}</span></div></button>`;
      })
      .join("") +
    '<button class="btn pri" id="addS" title="Thêm nhân viên">' +
    IC("plus", 15) +
    '<span class="lbl2">Thêm nhân viên</span></button>';
  if (cur)
    document.querySelector(`.srow[data-c="${cur.code}"]`)?.classList.add("on");
}
$("#slist").onclick = (e) => {
  if (e.target.closest("#addS")) return openStaff(null);
  const b = e.target.closest(".srow");
  if (b) showChar(b.dataset.c);
};
$("#note").onclick = (e) => {
  if (e.target.closest("[data-open]") && cur) openStaff(cur.code);
};
$("#acts").innerHTML = ACTS.map(
  (a) =>
    `<button class="${a[1] === act ? "on" : ""}" data-a="${a[1]}">${a[0]}</button>`,
).join("");
$("#acts").onclick = (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  act = b.dataset.a;
  if (cur) cur.mode = act;
  document
    .querySelectorAll("#acts [data-a]")
    .forEach((x) => x.classList.toggle("on", x === b));
};
const drag3 = (cvs, get, set) => {
  let x = null;
  cvs.addEventListener("pointerdown", (e) => {
    x = e.clientX;
    cvs.setPointerCapture(e.pointerId);
  });
  cvs.addEventListener("pointermove", (e) => {
    if (x != null) {
      set(get() + (e.clientX - x) * 0.01);
      x = e.clientX;
    }
  });
  cvs.addEventListener("pointerup", () => (x = null));
  cvs.addEventListener("pointercancel", () => (x = null));
};
drag3(
  $("#cv2"),
  () => ry,
  (v) => {
    ry = v;
    if (cur) cur.g.rotation.y = v;
  },
);
drag3(
  $("#cv3"),
  () => pvRy,
  (v) => {
    pvRy = v;
    if (pv) pv.g.rotation.y = v;
  },
);

/* --- Modal hồ sơ --- */
const SL = [
  ["height", "Chiều cao (m)", 1.45, 1.95, 0.01],
  ["build", "Thể hình (gầy → mập)", 0, 1, 0.05],
  ["headSize", "Kích thước đầu", 0.85, 1.25, 0.05],
  ["legRatio", "Tỷ lệ chân", 0.85, 1.2, 0.05],
  ["armRatio", "Tỷ lệ tay", 0.85, 1.2, 0.05],
];
const SEL = {
  hairStyle: [
    "Kiểu tóc",
    {
      short: "Ngắn",
      long: "Dài",
      bun: "Búi",
      pony: "Đuôi ngựa",
      bob: "Bob",
      none: "Không tóc",
    },
  ],
  face: ["Khuôn mặt", { oval: "Trái xoan", round: "Tròn", square: "Vuông" }],
  eyes: ["Mắt", { dot: "Chấm", happy: "Cười", big: "To tròn" }],
};
const F = $("#form");
function renderForm() {
  const d = draft,
    k = { ...LOOK0, ...d.look },
    op = F.querySelector("details")?.open,
    pre = (f, l) =>
      l
        .map(
          (p) =>
            `<button class="btn sm" data-pre="${f}" data-v="${p[1]}">${p[0]}</button>`,
        )
        .join("");
  const inp = (f, l) =>
    `<label>${l}<input type="text" data-f="${f}" value="${esc(d[f])}"></label>`;
  $("#mcode").textContent = d.code + (isNew ? " · mới" : "");
  F.innerHTML = `<div class="sec"><h5>Thông tin cơ bản</h5>
 <div class="g2">${inp("name", "Tên")}${inp("nick", "Biệt danh")}<label>Chức vụ<select data-f="role">${Object.entries(
   ROLES,
 )
   .map(
     ([v, r]) =>
       `<option value="${v}"${d.role === v ? " selected" : ""}>${r[0]}</option>`,
   )
   .join(
     "",
   )}</select></label>${inp("shift", "Ca làm")}${inp("phone", "Điện thoại")}${inp("start", "Vào làm")}</div></div>
 <div class="sec"><h5>Công việc &amp; ghi chú</h5>${inp("skills", "Kỹ năng")}${inp("personality", "Tính cách")}<label>Ghi chú<textarea data-f="note" rows="2">${esc(d.note)}</textarea></label></div>
 <div class="sec"><h5>Tag</h5><div class="chips">${TagRegistry.all()
   .map(
     (t) =>
       `<button class="chip${(d.tags || []).includes(t.code) ? " on" : ""}" data-tag="${t.code}">${tIc(t)}${esc(t.name)}</button>`,
   )
   .join("")}</div>
 <details><summary>Quản lý tag (tạo / sửa / xóa)</summary>${TagRegistry.all()
   .map(
     (t) =>
       `<div class="trow"><span class="ti" style="color:${t.color}">${tIc(t)}</span><select data-t="${t.code}" data-p="icon">${Object.entries(
         ICON_NAMES,
       )
         .map(
           ([k, n]) =>
             `<option value="${k}"${t.icon === k ? " selected" : ""}>${n}</option>`,
         )
         .join(
           "",
         )}</select><input data-t="${t.code}" data-p="name" value="${esc(t.name)}"><input type="color" data-t="${t.code}" data-p="color" value="${t.color}"><input data-t="${t.code}" data-p="desc" value="${esc(t.desc)}" placeholder="Mô tả"><button class="btn red sm" data-dt="${t.code}">${IC("x", 12)}</button></div>`,
   )
   .join(
     "",
   )}<button class="btn sm" data-nt="1">${IC("plus", 13)} Tạo tag mới</button><div class="mute" style="margin-top:6px">Tag là dữ liệu chung, sửa/xóa có hiệu lực ngay.</div></details></div>
 <div class="sec"><h5>Ngoại hình</h5><div class="chips">${pre("height", [
   ["Thấp", 1.55],
   ["Trung bình", 1.7],
   ["Cao", 1.85],
 ])}</div><div class="chips">${pre("build", [
   ["Gầy", 0.1],
   ["Cân đối", 0.4],
   ["Đầy đặn", 0.7],
   ["Mập", 1],
 ])}</div>
 ${SL.map((s) => `<label>${s[1]}: <b data-v="${s[0]}">${(+k[s[0]]).toFixed(2)}</b><input type="range" data-k="${s[0]}" min="${s[2]}" max="${s[3]}" step="${s[4]}" value="${k[s[0]]}"></label>`).join("")}
 <div class="g2">${Object.entries(SEL)
   .map(
     ([f, [l, o]]) =>
       `<label>${l}<select data-k="${f}">${Object.entries(o)
         .map(
           ([v, n]) =>
             `<option value="${v}"${k[f] === v ? " selected" : ""}>${n}</option>`,
         )
         .join("")}</select></label>`,
   )
   .join("")}
 ${[
   ["skin", "Màu da"],
   ["hair", "Màu tóc"],
   ["pants", "Quần"],
   ["shoes", "Giày"],
 ]
   .map(
     ([f, l]) =>
       `<label>${l}<input type="color" data-k="${f}" value="${k[f]}"></label>`,
   )
   .join("")}</div>
 <div class="chips">${ACCS.map(([v, n]) => `<button class="chip${k.acc.includes(v) ? " on" : ""}" data-acc="${v}">${n}</button>`).join("")}<button class="chip${k.blush ? " on" : ""}" data-blush="1">Má hồng</button></div>
 <div class="mute">Màu áo: ${(ROLES[d.role] || ROLES.staff)[1] === "gray" ? "xám" : "hồng"} theo chức vụ.</div></div>`;
  if (op) F.querySelector("details").open = true;
}
function rebuildPv() {
  if (pv) {
    stage3.remove(pv.g);
    disposeChar(pv);
  }
  pv = makeChar(draft);
  pv.g.rotation.y = pvRy;
  pv.mode = pvMode;
  stage3.add(pv.g);
}
F.addEventListener("input", (e) => {
  const t = e.target,
    d = draft;
  if (t.dataset.k) {
    d.look = d.look || {};
    d.look[t.dataset.k] = t.type === "range" ? +t.value : t.value;
    const b = F.querySelector(`b[data-v="${t.dataset.k}"]`);
    if (b) b.textContent = (+t.value).toFixed(2);
    rebuildPv();
  } else if (t.dataset.f) {
    d[t.dataset.f] = t.value;
    if (t.dataset.f === "role") {
      rebuildPv();
      renderForm();
    }
  } else if (t.dataset.t) {
    TagRegistry.get(t.dataset.t)[t.dataset.p] = t.value;
    saveStaff();
  }
});
F.addEventListener("change", (e) => {
  if (e.target.dataset.t) renderForm();
});
F.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  const d = draft;
  d.look = d.look || {};
  const D = t.dataset,
    open = () => (F.querySelector("details").open = true);
  if (D.tag) {
    const a = (d.tags = d.tags || []),
      i = a.indexOf(D.tag);
    i < 0 ? a.push(D.tag) : a.splice(i, 1);
    t.classList.toggle("on");
  } else if (D.acc) {
    const a = (d.look.acc = [...(d.look.acc || [])]),
      i = a.indexOf(D.acc);
    i < 0 ? a.push(D.acc) : a.splice(i, 1);
    t.classList.toggle("on");
    rebuildPv();
  } else if (D.blush) {
    d.look.blush = !{ ...LOOK0, ...d.look }.blush;
    t.classList.toggle("on");
    rebuildPv();
  } else if (D.pre) {
    d.look[D.pre] = +D.v;
    renderForm();
    rebuildPv();
  } else if (D.nt) {
    let n = 1,
      c;
    do c = "TAG_" + String(n++).padStart(3, "0");
    while (TagRegistry.get(c));
    TagRegistry.register({
      code: c,
      icon: "tag",
      name: "Tag mới",
      color: "#0a84ff",
      desc: "",
    });
    saveStaff();
    renderForm();
    open();
  } else if (D.dt) {
    TagRegistry.remove(D.dt);
    StaffRegistry.all().forEach(
      (s) => (s.tags = (s.tags || []).filter((x) => x !== D.dt)),
    );
    d.tags = (d.tags || []).filter((x) => x !== D.dt);
    saveStaff();
    renderForm();
    open();
  }
});
$("#pvb").innerHTML = [
  ["Đứng", "idle"],
  ["Đi bộ", "walk"],
  ["Vẫy tay", "wave"],
]
  .map(
    (a) =>
      `<button class="${a[1] === pvMode ? "on" : ""}" data-a="${a[1]}">${a[0]}</button>`,
  )
  .join("");
$("#pvb").onclick = (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  pvMode = b.dataset.a;
  if (pv) pv.mode = pvMode;
  document
    .querySelectorAll("#pvb [data-a]")
    .forEach((x) => x.classList.toggle("on", x === b));
};
function newStaff() {
  let n = 1,
    c;
  do c = "EMP_" + String(n++).padStart(4, "0");
  while (StaffRegistry.get(c));
  return {
    code: c,
    name: "Nhân viên mới",
    nick: "",
    role: "staff",
    tags: [],
    personality: "",
    note: "",
    shift: "",
    phone: "",
    start: "",
    skills: "",
    ext: {},
    look: {},
    routine: {
      type: "patrol",
      points: [
        [3.4, 8],
        [3.4, -3.8],
        [-3.4, -3.8],
      ],
    },
  };
}
function foot() {
  $("#foot").innerHTML =
    `<button class="btn pri" data-a="save">${IC("check", 15)}<span class="lg">Lưu thay đổi</span><span class="ss">Lưu</span></button><button class="btn" data-a="revert" title="Khôi phục dữ liệu đã lưu">${IC("undo", 15)}<span class="lg">Khôi phục dữ liệu đã lưu</span><span class="ss">Khôi phục</span></button><button class="btn" data-a="exp" title="Xuất JSON người này">${IC("download", 15)}<span class="lg">Xuất JSON người này</span><span class="ss">Xuất</span></button>${isNew ? "" : '<button class="btn red" data-a="del" title="Xóa nhân viên">' + IC("trash", 15) + '<span class="lg">Xóa nhân viên</span><span class="ss">Xóa</span></button>'}`;
}
function size3() {
  const c = $("#cv3"),
    w = c.clientWidth,
    h = c.clientHeight;
  if (w && h) {
    ren3.setSize(w, h, false);
    cam3.aspect = w / h;
    frame(cam3, w / h, 3.3, 0.85);
    cam3.updateProjectionMatrix();
  }
}
function openStaff(code) {
  isNew = !code;
  draft = code ? clone(StaffRegistry.get(code)) : newStaff();
  renderForm();
  foot();
  $("#modal").classList.add("on");
  size3();
  rebuildPv();
}
function saveDraft() {
  const s = clone(draft),
    ex = StaffRegistry.get(s.code);
  if (ex) {
    Object.keys(ex).forEach((k) => delete ex[k]);
    Object.assign(ex, s);
    const i = npcs.findIndex((n) => n.s.code === s.code);
    if (i >= 0) {
      const o = npcs[i];
      npcs.splice(i, 1);
      scene.remove(o.g);
      disposeChar(o);
      const n = addNpc(ex);
      n.g.position.copy(o.g.position);
      n.g.rotation.y = o.g.rotation.y;
    }
  } else {
    StaffRegistry.register(s);
    addNpc(s);
  }
  saveStaff();
  renderList();
  showChar(s.code);
  isNew = false;
  foot();
  $("#mcode").textContent = s.code;
  $("#modal").classList.remove("on"); /* lưu xong thì đóng modal */
  toast("Đã lưu " + s.code);
}
$("#foot").onclick = (e) => {
  const bt = e.target.closest("[data-a]");
  if (!bt) return;
  const a = bt.dataset.a;
  if (a === "save") saveDraft();
  if (a === "revert") {
    draft = isNew ? newStaff() : clone(StaffRegistry.get(draft.code));
    renderForm();
    rebuildPv();
    foot();
    toast("Đã khôi phục dữ liệu đã lưu");
  }
  if (a === "exp") {
    foot();
    dl(
      draft.code + ".json",
      pack("staff-one", { item: draft, name: draft.name }),
    );
  }
  if (a === "del") {
    if (!bt.dataset.arm) {
      bt.dataset.arm = 1;
      bt.classList.add("arm");
      bt.innerHTML = "<span>Xác nhận</span>";
      return;
    }
    const c = draft.code,
      i = npcs.findIndex((n) => n.s.code === c);
    if (i >= 0) {
      scene.remove(npcs[i].g);
      disposeChar(npcs[i]);
      npcs.splice(i, 1);
    }
    StaffRegistry.remove(c);
    saveStaff();
    if (cur && cur.code === c) {
      stage.remove(cur.g);
      disposeChar(cur);
      cur = null;
    }
    renderList();
    showChar((StaffRegistry.all()[0] || {}).code);
    $("#modal").classList.remove("on");
  }
};
$("#modal").onclick = (e) => {
  if (e.target.id === "modal" || e.target.closest("#mx"))
    $("#modal").classList.remove("on");
};

/* ============ XUẤT / NHẬP JSON (gói có phiên bản) ============
   {format:'store-package',version:1,kind:'full|store|staff|shelf-one|staff-one',id,name,createdAt,store:{items},staff:{items},tags:[]} */
let lastOut = "",
  pending = null;
function pack(kind, o = {}) {
  const p = {
    format: "store-package",
    version: 1,
    kind,
    id: "PKG_" + Date.now().toString(36).toUpperCase(),
    name: o.name || "Gói dữ liệu cửa hàng",
    createdAt: new Date().toISOString(),
    app: "store-manager-v2",
  };
  if (kind === "full" || kind === "store")
    p.store = {
      size: { width: STORE.W, depth: STORE.D },
      items: clone(ShelfRegistry.all()),
    };
  if (kind === "shelf-one") p.store = { items: [clone(o.item)] };
  if (kind === "full" || kind === "staff") {
    p.staff = { items: clone(StaffRegistry.all()) };
    p.tags = clone(TagRegistry.all());
  }
  if (kind === "staff-one") {
    p.staff = { items: [clone(o.item)] };
    p.tags = clone(
      TagRegistry.all().filter((t) => (o.item.tags || []).includes(t.code)),
    );
  }
  return p;
}
async function dl(name, p) {
  const txt = JSON.stringify(p, null, 2);
  lastOut = txt;
  try {
    const d = window.claude && (await claude.use("downloads"));
    if (!d) throw { code: "unavailable" };
    await d.save({ filename: name, data: txt });
    toast("Đã xuất " + name);
  } catch (e) {
    if (e && e.code === "declined") return;
    openData();
    $("#jout").value = txt;
    toast("Không lưu trực tiếp được – hãy copy JSON ở ô dưới cùng");
  }
}
const exportShelf = (it) =>
  dl(it.code + ".json", pack("shelf-one", { item: it, name: it.name }));
const nextCode = (list, pre, pad) => {
  let n = 1,
    c;
  do c = pre + String(n++).padStart(pad, "0");
  while (list.some((x) => x.code === c));
  return c;
};
function validate(p) {
  const E = [],
    W = [],
    v = { store: null, staff: null, tags: null },
    num = (x) => typeof x === "number" && isFinite(x),
    seen = new Set(),
    cl = THREE.MathUtils.clamp;
  if (!p || typeof p !== "object" || p.format !== "store-package")
    return {
      E: ['Không phải gói dữ liệu cửa hàng (thiếu format "store-package").'],
      W,
      v,
    };
  if (!num(p.version)) E.push("Thiếu phiên bản định dạng.");
  else if (p.version > 1)
    E.push(
      "Phiên bản định dạng " +
        p.version +
        " mới hơn bản này hỗ trợ (tối đa 1).",
    );
  if (!["full", "store", "staff", "shelf-one", "staff-one"].includes(p.kind))
    E.push("Loại gói không hợp lệ: " + p.kind);
  const dup = (c, w) => {
    if (seen.has(w + c)) E.push("Mã trùng trong file: " + c);
    seen.add(w + c);
  };
  if (p.store) {
    if (!Array.isArray(p.store.items)) E.push("store.items phải là danh sách.");
    else
      v.store = p.store.items
        .map((it, i) => {
          const n = "Quầy #" + (i + 1) + " (" + (it && it.code) + ")";
          if (!it || typeof it.code !== "string" || !it.code) {
            E.push(n + ": thiếu mã.");
            return null;
          }
          dup(it.code, "s");
          if (!TYPES[it.type]) {
            E.push(n + ': loại không hỗ trợ "' + it.type + '".');
            return null;
          }
          if (
            !Array.isArray(it.pos) ||
            it.pos.length !== 2 ||
            !it.pos.every(num) ||
            !Array.isArray(it.size) ||
            it.size.length !== 2 ||
            !it.size.every((x) => num(x) && x > 0 && x <= 12)
          ) {
            E.push(n + ": vị trí/kích thước không hợp lệ.");
            return null;
          }
          if (
            Math.abs(it.pos[0]) > STORE.W / 2 - 0.7 ||
            Math.abs(it.pos[1]) > STORE.D / 2 - 0.7
          )
            W.push(n + ": nằm ngoài cửa hàng, sẽ được kéo vào trong.");
          return {
            code: it.code,
            name: String(it.name || TYPES[it.type][0]),
            type: it.type,
            sides: it.sides === 2 ? 2 : 1,
            pos: [
              cl(it.pos[0], -STORE.W / 2 + 0.7, STORE.W / 2 - 0.7),
              cl(it.pos[1], -STORE.D / 2 + 0.7, STORE.D / 2 - 0.7),
            ],
            rot: num(it.rot) ? it.rot : 0,
            size: [...it.size],
            details:
              it.details && typeof it.details === "object" ? it.details : {},
          };
        })
        .filter(Boolean);
  }
  if (p.tags) {
    if (!Array.isArray(p.tags)) E.push("tags phải là danh sách.");
    else
      v.tags = p.tags
        .map((t, i) => {
          if (!t || typeof t.code !== "string" || !t.code) {
            E.push("Tag #" + (i + 1) + ": thiếu mã.");
            return null;
          }
          dup(t.code, "t");
          return {
            code: t.code,
            icon: EMO[t.icon] || String(t.icon || "tag"),
            name: String(t.name || "Tag"),
            color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : "#0a84ff",
            desc: String(t.desc || ""),
          };
        })
        .filter(Boolean);
  }
  if (p.staff) {
    if (!Array.isArray(p.staff.items)) E.push("staff.items phải là danh sách.");
    else
      v.staff = p.staff.items
        .map((s, i) => {
          const n = "Nhân viên #" + (i + 1) + " (" + (s && s.code) + ")";
          if (!s || typeof s.code !== "string" || !s.code) {
            E.push(n + ": thiếu mã.");
            return null;
          }
          dup(s.code, "e");
          if (!ROLES[s.role]) {
            E.push(n + ': chức vụ không hợp lệ "' + s.role + '".');
            return null;
          }
          return {
            ...s,
            name: String(s.name || "(chưa đặt tên)"),
            tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
            look: s.look && typeof s.look === "object" ? s.look : {},
            ext: s.ext && typeof s.ext === "object" ? s.ext : {},
            routine:
              s.routine && s.routine.type
                ? s.routine
                : {
                    type: "patrol",
                    points: [
                      [3.4, 8],
                      [3.4, -3.8],
                    ],
                  },
          };
        })
        .filter(Boolean);
  }
  if (!v.store && !v.staff && !v.tags && !E.length)
    E.push("Gói không chứa dữ liệu nào.");
  return { E, W, v };
}
function commit(sh, st, tg) {
  ShelfRegistry.clear();
  sh.forEach(R);
  StaffRegistry.clear();
  st.forEach(S);
  TagRegistry.clear();
  tg.forEach(TagRegistry.register);
  Object.keys(groups).forEach(unbuild);
  ShelfRegistry.all().forEach(build);
  legend();
  select(null);
  npcs.splice(0).forEach((n) => {
    scene.remove(n.g);
    disposeChar(n);
  });
  StaffRegistry.all().forEach(addNpc);
  if (cur) {
    stage.remove(cur.g);
    disposeChar(cur);
    cur = null;
  }
  renderList();
  showChar((st[0] || {}).code);
  save();
  saveStaff();
}
function applyImport() {
  const V = validate(pending);
  if (V.E.length) return;
  const v = V.v,
    mode = (document.querySelector("input[name=imode]:checked") || {}).value,
    dupm = $("#idup").value;
  if (!mode) return toast("Hãy chọn chế độ nhập: Thay thế hoặc Gộp.");
  if (mode === "replace" && /-one$/.test(pending.kind))
    return toast("Gói một đối tượng chỉ nhập được bằng chế độ Gộp.");
  const bk = JSON.stringify({
    sh: ShelfRegistry.all(),
    st: StaffRegistry.all(),
    tg: TagRegistry.all(),
  });
  try {
    localStorage.setItem("store-backup", bk);
  } catch (e) {}
  window._bk = bk;
  let sh = clone(ShelfRegistry.all()),
    st = clone(StaffRegistry.all()),
    tg = clone(TagRegistry.all());
  if (mode === "replace") {
    if (v.store) sh = [];
    if (v.staff) st = [];
    if (v.tags) tg = [];
  }
  const mp = { s: {}, t: {} },
    put = (list, it, gen, m) => {
      const i = list.findIndex((x) => x.code === it.code);
      if (i < 0) {
        list.push(it);
        return;
      }
      if (dupm === "skip") return;
      if (dupm === "overwrite") {
        list[i] = it;
        return;
      }
      const old = it.code;
      it.code = gen(list, it);
      m[old] = it.code;
      list.push(it);
    };
  (v.tags || []).forEach((t) =>
    put(tg, clone(t), (l) => nextCode(l, "TAG_", 3), mp.t),
  );
  (v.store || []).forEach((s) =>
    put(sh, clone(s), (l, it) => nextCode(l, TYPES[it.type][1] + "_", 3), mp.s),
  );
  (v.staff || []).forEach((s) => {
    s = clone(s);
    s.tags = s.tags.map((c) => mp.t[c] || c);
    if (s.routine.code) s.routine.code = mp.s[s.routine.code] || s.routine.code;
    put(st, s, (l) => nextCode(l, "EMP_", 4), {});
  });
  const known = new Set(tg.map((t) => t.code));
  st.forEach((s) => (s.tags = (s.tags || []).filter((c) => known.has(c))));
  commit(sh, st, tg);
  $("#jres").innerHTML =
    '<div class="ok">Đã nhập xong. Có thể bấm “Hoàn tác lần nhập gần nhất”.</div>';
  toast("Đã nhập dữ liệu");
}
function checkImport() {
  let p;
  const txt = $("#jin").value.trim();
  pending = null;
  try {
    p = JSON.parse(txt);
  } catch (e) {
    $("#jres").innerHTML =
      '<div class="err">Không đọc được JSON: ' +
      esc(e.message) +
      "<br>Dữ liệu hiện tại không bị thay đổi.</div>";
    return;
  }
  const V = validate(p);
  if (V.E.length) {
    $("#jres").innerHTML =
      '<div class="err"><b>File không hợp lệ – không có gì bị thay đổi:</b><br>' +
      V.E.slice(0, 12).map(esc).join("<br>") +
      "</div>";
    return;
  }
  pending = p;
  const v = V.v,
    dS = (v.store || []).filter((x) => ShelfRegistry.get(x.code)).length,
    dE = (v.staff || []).filter((x) => StaffRegistry.get(x.code)).length,
    dT = (v.tags || []).filter((x) => TagRegistry.get(x.code)).length,
    one = /-one$/.test(p.kind);
  $("#jres").innerHTML =
    `<div class="ok"><b>${esc(p.name || "Gói dữ liệu")}</b> · ${esc(p.id || "")} · loại <i>${p.kind}</i> · v${p.version}<br>${(v.store || []).length} quầy · ${(v.staff || []).length} nhân viên · ${(v.tags || []).length} tag · trùng mã: ${dS} quầy, ${dE} nhân viên, ${dT} tag</div>
 ${V.W.length ? '<div class="mute">Lưu ý: ' + V.W.slice(0, 6).map(esc).join("<br>") + "</div>" : ""}
 <label><input type="radio" name="imode" value="replace"${one ? " disabled" : ""}> <b>Thay thế</b> – dữ liệu tương ứng trong file thay toàn bộ dữ liệu hiện tại (quầy / nhân viên+tag)</label>
 <label><input type="radio" name="imode" value="merge"> <b>Gộp</b> – thêm vào dữ liệu hiện có</label>
 <label>Khi trùng mã (chế độ Gộp): <select id="idup"><option value="newcode">Cấp mã mới cho bản nhập (giữ cả hai)</option><option value="skip">Bỏ qua bản nhập</option><option value="overwrite">Ghi đè bản hiện có</option></select></label>
 <button class="btn pri" data-e="apply">${IC("check", 14)} Xác nhận và áp dụng</button>`;
}
function openData() {
  $("#dbox").innerHTML =
    `<button class="x" data-x="1">${IC("x", 14)}</button><h2 style="margin:0 0 4px">Dữ liệu JSON</h2>
 <h5>Xuất</h5><div class="chips"><button class="btn pri" data-e="full">${IC("download", 14)} Gói đầy đủ</button><button class="btn" data-e="store">Cửa hàng</button><button class="btn" data-e="staff">Nhân viên + tag</button></div>
 <div class="mute">Xuất một nhân viên: mở hồ sơ → Xuất JSON. Xuất một quầy: bấm quầy → Xuất JSON.</div>
 <h5>Nhập</h5><input type="file" id="jf" accept=".json,application/json"><textarea id="jin" rows="4" placeholder="…hoặc dán nội dung JSON vào đây"></textarea><button class="btn" data-e="check">Kiểm tra</button><div id="jres"></div>
 <h5>Khôi phục</h5><button class="btn" data-e="undo">${IC("undo", 14)} Hoàn tác lần nhập gần nhất</button><textarea id="jout" rows="3" placeholder="JSON vừa xuất (dự phòng để copy)">${esc(lastOut)}</textarea>`;
  $("#dmodal").classList.add("on");
}
$("#dbox").addEventListener("click", (e) => {
  if (e.target.closest("[data-x]")) return $("#dmodal").classList.remove("on");
  const bt = e.target.closest("[data-e]");
  if (!bt) return;
  const a = bt.dataset.e;
  if (a === "full") dl("goi-day-du.json", pack("full", { name: "Gói đầy đủ" }));
  if (a === "store")
    dl("cua-hang.json", pack("store", { name: "Bố cục cửa hàng" }));
  if (a === "staff")
    dl("nhan-vien.json", pack("staff", { name: "Nhân viên và tag" }));
  if (a === "check") checkImport();
  if (a === "apply") applyImport();
  if (a === "undo") {
    let b = window._bk;
    try {
      b = b || localStorage.getItem("store-backup");
    } catch (x) {}
    if (!b) return toast("Chưa có bản sao lưu");
    const o = JSON.parse(b);
    commit(o.sh, o.st, o.tg);
    toast("Đã hoàn tác");
  }
});
$("#dbox").addEventListener("change", async (e) => {
  if (e.target.id === "jf" && e.target.files[0]) {
    $("#jin").value = await e.target.files[0].text();
    checkImport();
  }
});
$("#dmodal").onclick = (e) => {
  if (e.target.id === "dmodal") e.target.classList.remove("on");
};
$("#dataBtn").innerHTML =
  IC("data", 15) + '<span class="lbl">Dữ liệu JSON</span>';
$("#mx").innerHTML = IC("x", 14);
$("#dataBtn").onclick = openData;
renderList();

/* ============ BỐ CỤC: hoàn tác/làm lại, hít/căn chỉnh, kéo thả, thêm quầy 3D ============ */
const hist = [],
  fut = [];
let lastP = 0,
  snapOn = true;
const snap = () => JSON.stringify(ShelfRegistry.all());
const updHist = () => {
  const u = $("#hu"),
    r = $("#hr");
  if (u) {
    u.disabled = !hist.length;
    r.disabled = !fut.length;
  }
};
function pushHist() {
  hist.push(snap());
  if (hist.length > 100) hist.shift();
  fut.length = 0;
  updHist();
}
function pushHistDeb() {
  if (Date.now() - lastP > 800) pushHist();
  lastP = Date.now();
}
function restore(str) {
  ShelfRegistry.clear();
  JSON.parse(str).forEach(R);
  Object.keys(groups).forEach(unbuild);
  ShelfRegistry.all().forEach(build);
  legend();
  if (selected && !ShelfRegistry.get(selected)) selected = null;
  select(selected);
  save();
}
function undo() {
  if (!hist.length) return toast("Không còn gì để hoàn tác");
  fut.push(snap());
  restore(hist.pop());
  updHist();
}
function redo() {
  if (!fut.length) return toast("Không còn gì để làm lại");
  hist.push(snap());
  restore(fut.pop());
  updHist();
}
const bounds = (it, pos = it.pos) => {
  const c = Math.abs(Math.cos(it.rot)),
    s = Math.abs(Math.sin(it.rot));
  return {
    x: pos[0],
    z: pos[1],
    hx: (it.size[0] * c + it.size[1] * s) / 2,
    hz: (it.size[0] * s + it.size[1] * c) / 2,
  };
};
/* ===== ĐƯỜNG DÓNG HÀNG (guides): đoạn thẳng giữa các quầy liên quan + chấm đầu/cuối + nhãn chi tiết =====
   xanh = đang trùng khớp (≤ 2 cm) · cam = gần trùng, ghi rõ độ lệch (< 40 cm) */
const GM = {
  s: new THREE.MeshBasicMaterial({
    color: 0x0a84ff,
    transparent: true,
    opacity: 0.7,
    depthTest: false,
  }),
  n: new THREE.MeshBasicMaterial({
    color: 0xff9f0a,
    transparent: true,
    opacity: 0.7,
    depthTest: false,
  }),
};
const GCOL = { snap: "#0a84ff", near: "#ff9f0a" },
  GPOOL = [];
function gslot(i) {
  if (GPOOL[i]) return GPOOL[i];
  const g = new THREE.Group(),
    line = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), GM.s),
    d1 = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), GM.s),
    d2 = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), GM.s);
  [line, d1, d2].forEach((m) => {
    m.rotation.x = -PI / 2;
    m.renderOrder = 10;
    g.add(m);
  });
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 72;
  const tx = new THREE.CanvasTexture(cv),
    sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tx,
        depthTest: false,
        transparent: true,
      }),
    );
  sp.renderOrder = 11;
  g.add(sp);
  g.visible = false;
  scene.add(g);
  return (GPOOL[i] = { g, line, d1, d2, sp, cv, tx, ratio: 3.5 });
}
/* nhãn: viên thuốc tối, chữ trắng đậm, chấm màu báo loại (xanh = trùng khớp, cam = gần trùng); độ rộng theo chữ */
function setLbl(s, t, k) {
  const c = s.cv,
    x = c.getContext("2d"),
    F = "600 32px -apple-system,Segoe UI,Roboto,sans-serif";
  x.font = F;
  const tw = Math.ceil(x.measureText(t).width);
  c.width = tw + 48;
  c.height = 72;
  x.font = F;
  x.fillStyle = "rgba(28,28,32,.88)";
  x.beginPath();
  x.roundRect(2, 6, c.width - 4, 60, 30);
  x.fill();
  x.fillStyle = "#fff";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(t, c.width / 2, 38);
  s.ratio = c.width / c.height;
  s.tx.needsUpdate = true;
}
function guides(list) {
  list = list || [];
  GPOOL.forEach((s) => (s.g.visible = false));
  list.slice(0, 10).forEach((e, i) => {
    const s = gslot(i),
      len = Math.max(0.05, e.hi - e.lo),
      mid = (e.hi + e.lo) / 2,
      m = e.kind === "snap" ? GM.s : GM.n;
    s.line.material = s.d1.material = s.d2.material = m;
    const X = e.ax === "x";
    if (X) {
      s.line.scale.set(0.035, len, 1);
      s.line.position.set(e.v, 0.05, mid);
      s.d1.position.set(e.v, 0.05, e.lo);
      s.d2.position.set(e.v, 0.05, e.hi);
    } else {
      s.line.scale.set(len, 0.035, 1);
      s.line.position.set(mid, 0.05, e.v);
      s.d1.position.set(e.lo, 0.05, e.v);
      s.d2.position.set(e.hi, 0.05, e.v);
    }
    s.sp.visible = !!e.txt;
    if (e.txt) {
      setLbl(s, e.txt, e.kind);
      const ax = X ? e.v : e.hi,
        az = X ? e.lo : e.v,
        dist = camera.position.distanceTo(new THREE.Vector3(ax, 0.3, az)),
        h = THREE.MathUtils.clamp(dist * 0.042, 0.5, 2.6),
        w = h * s.ratio;
      s.sp.scale.set(w, h, 1);
      if (X) s.sp.position.set(e.v, 0.3, e.lo - h * 0.75);
      else s.sp.position.set(e.hi + w / 2 + 0.25, 0.3, e.v);
    }
    s.g.visible = true;
  });
}
/* mọi cặp (đặc điểm của quầy đang chỉnh) × (đặc điểm của quầy khác / tường / trục giữa): mép trái-tâm-mép phải theo x, mép trên-tâm-mép dưới theo z */
function alignPairs(b, ex) {
  const hw = STORE.W / 2 - 0.12,
    hd = STORE.D / 2 - 0.12,
    out = { x: [], z: [] },
    MX = [
      ["mép trái", b.x - b.hx],
      ["tâm", b.x],
      ["mép phải", b.x + b.hx],
    ],
    MZ = [
      ["mép trên", b.z - b.hz],
      ["tâm", b.z],
      ["mép dưới", b.z + b.hz],
    ],
    zr = [b.z - b.hz, b.z + b.hz],
    xr = [b.x - b.hx, b.x + b.hx],
    T = [];
  ShelfRegistry.all().forEach((o) => {
    if (o.code === ex) return;
    const q = bounds(o);
    T.push({
      n: o.code,
      fx: [q.x - q.hx, q.x, q.x + q.hx],
      fxn: ["mép trái", "tâm", "mép phải"],
      fz: [q.z - q.hz, q.z, q.z + q.hz],
      fzn: ["mép trên", "tâm", "mép dưới"],
      xr: [q.x - q.hx, q.x + q.hx],
      zr: [q.z - q.hz, q.z + q.hz],
    });
  });
  T.push(
    { n: "tường trái", fx: [-hw], fxn: [""], fz: [], xr, zr },
    { n: "tường phải", fx: [hw], fxn: [""], fz: [], xr, zr },
    { n: "tường trên", fx: [], fz: [-hd], fzn: [""], xr, zr },
    { n: "tường dưới", fx: [], fz: [hd], fzn: [""], xr, zr },
    { n: "trục giữa (dọc)", fx: [0], fxn: [""], fz: [], xr, zr },
    { n: "trục giữa (ngang)", fx: [], fz: [0], fzn: [""], xr, zr },
  );
  T.forEach((t) => {
    t.fx.forEach((v, i) =>
      MX.forEach((m) =>
        out.x.push({
          d: v - m[1],
          v,
          mv: m[0],
          tv: t.fxn[i],
          n: t.n,
          lo: Math.min(zr[0], t.zr[0]),
          hi: Math.max(zr[1], t.zr[1]),
        }),
      ),
    );
    t.fz.forEach((v, i) =>
      MZ.forEach((m) =>
        out.z.push({
          d: v - m[1],
          v,
          mv: m[0],
          tv: t.fzn[i],
          n: t.n,
          lo: Math.min(xr[0], t.xr[0]),
          hi: Math.max(xr[1], t.xr[1]),
        }),
      ),
    );
  });
  return out;
}
/* danh sách đường cần vẽ cho một vị trí/kích thước cụ thể */
function guideList(b, ex) {
  const P = alignPairs(b, ex),
    out = [];
  ["x", "z"].forEach((ax) => {
    const M = new Map();
    let near = null;
    P[ax].forEach((p) => {
      const ad = Math.abs(p.d);
      if (ad < 0.02) {
        const k = p.v.toFixed(2) + p.mv;
        let e = M.get(k);
        if (!e) {
          e = {
            ax,
            v: p.v,
            lo: p.lo,
            hi: p.hi,
            kind: "snap",
            mv: p.mv,
            nm: [],
          };
          M.set(k, e);
          out.push(e);
        }
        e.lo = Math.min(e.lo, p.lo);
        e.hi = Math.max(e.hi, p.hi);
        const nm = (p.tv + " " + p.n).trim();
        if (!e.nm.includes(nm)) e.nm.push(nm);
      } else if (ad < 0.4 && (!near || ad < Math.abs(near.d))) near = p;
    });
    if (near)
      out.push(
        {
          ax,
          v: near.v,
          lo: near.lo,
          hi: near.hi,
          kind: "near",
          txt:
            near.mv +
            " lệch " +
            Math.abs(near.d).toFixed(2) +
            "m so với " +
            (near.tv + " " + near.n).trim(),
        },
        { ax, v: near.v - near.d, lo: near.lo, hi: near.hi, kind: "near" },
      );
  });
  out.forEach((e) => {
    if (e.nm)
      e.txt =
        e.mv +
        " ≡ " +
        e.nm.slice(0, 2).join(", ") +
        (e.nm.length > 2 ? " +" + (e.nm.length - 2) : "");
  });
  return out.slice(0, 10);
}
const showResizeGuides = (it) => guides(guideList(bounds(it), it.code));
function moveItem(it) {
  groups[it.code].position.set(it.pos[0], 0, it.pos[1]);
  labels[it.code].position.set(it.pos[0], 2.7, it.pos[1]);
  place();
}
function snapPos(it, x, z) {
  const b0 = bounds(it),
    hw = STORE.W / 2 - 0.12,
    hd = STORE.D / 2 - 0.12,
    T = 0.35,
    cl = (v, m) => Math.max(-m, Math.min(m, v));
  let X = cl(x, hw - b0.hx),
    Z = cl(z, hd - b0.hz),
    ax = null,
    az = null;
  if (snapOn) {
    const P = alignPairs(bounds(it, [X, Z]), it.code),
      best = (a) =>
        a.reduce((m, p) => (!m || Math.abs(p.d) < Math.abs(m.d) ? p : m), null),
      bx = best(P.x),
      bz = best(P.z);
    if (bx && Math.abs(bx.d) < T) ax = bx.d;
    if (bz && Math.abs(bz.d) < T) az = bz.d;
  }
  X = ax != null ? X + ax : Math.round(X * 4) / 4;
  Z = az != null ? Z + az : Math.round(Z * 4) / 4;
  X = Math.round(cl(X, hw - b0.hx) * 1000) / 1000;
  Z = Math.round(cl(Z, hd - b0.hz) * 1000) / 1000;
  guides(guideList(bounds(it, [X, Z]), it.code));
  return [X, Z];
}
function pickItem(e) {
  const h = hit(e);
  if (h.code) return h.code;
  aim(e);
  if (!ray.ray.intersectPlane(plane, pt)) return null;
  let best = null,
    bd = 1e9;
  ShelfRegistry.all().forEach((it) => {
    const dx = pt.x - it.pos[0],
      dz = pt.z - it.pos[1],
      c = Math.cos(it.rot),
      s = Math.sin(it.rot),
      lx = dx * c - dz * s,
      lz = dx * s + dz * c;
    if (
      Math.abs(lx) <= it.size[0] / 2 + 0.3 &&
      Math.abs(lz) <= it.size[1] / 2 + 0.3
    ) {
      const d = Math.hypot(dx, dz);
      if (d < bd) {
        bd = d;
        best = it.code;
      }
    }
  });
  return best;
}
function freeSpot(size) {
  const b = bounds({ rot: 0, size, pos: [0, 0] }),
    os = ShelfRegistry.all().map((o) => bounds(o));
  for (let r = 0; r < 16; r += 0.5)
    for (let a = 0; a < 12; a++) {
      const x = Math.sin((a * PI) / 6) * r,
        z = -3.8 + Math.cos((a * PI) / 6) * r;
      if (
        Math.abs(x) > STORE.W / 2 - 0.2 - b.hx ||
        Math.abs(z) > STORE.D / 2 - 0.2 - b.hz
      )
        continue;
      if (
        !os.some(
          (o) =>
            Math.abs(o.x - x) < o.hx + b.hx + 0.5 &&
            Math.abs(o.z - z) < o.hz + b.hz + 0.5,
        )
      )
        return [Math.round(x * 4) / 4, Math.round(z * 4) / 4];
    }
  return [0, -3.8];
}
function alignItem(it, k) {
  pushHist();
  const b = bounds(it),
    hw = STORE.W / 2 - 0.12,
    hd = STORE.D / 2 - 0.12;
  const o = ShelfRegistry.all()
    .filter((x) => x !== it)
    .map((x) => ({ q: bounds(x) }))
    .sort(
      (a, c) =>
        Math.hypot(a.q.x - b.x, a.q.z - b.z) -
        Math.hypot(c.q.x - b.x, c.q.z - b.z),
    )[0];
  let [x, z] = it.pos;
  if (k === "wall") {
    const d = [
      ["l", b.x - b.hx + hw],
      ["r", hw - (b.x + b.hx)],
      ["t", b.z - b.hz + hd],
      ["b", hd - (b.z + b.hz)],
    ].sort((a, c) => a[1] - c[1])[0][0];
    if (d === "l") x = -hw + b.hx;
    if (d === "r") x = hw - b.hx;
    if (d === "t") z = -hd + b.hz;
    if (d === "b") z = hd - b.hz;
  }
  if (k === "mid") x = 0;
  if (k === "midz") z = 0;
  if (k === "row" && o) {
    if (Math.abs(o.q.x - b.x) < Math.abs(o.q.z - b.z)) x = o.q.x;
    else z = o.q.z;
  }
  if (k === "next" && o) {
    const rx = Math.abs(o.q.x - b.x) / (o.q.hx + b.hx),
      rz = Math.abs(o.q.z - b.z) / (o.q.hz + b.hz);
    if (rx >= rz) x = o.q.x + (b.x < o.q.x ? -1 : 1) * (o.q.hx + b.hx + 0.05);
    else z = o.q.z + (b.z < o.q.z ? -1 : 1) * (o.q.hz + b.hz + 0.05);
  }
  if (k === "sq") {
    it.rot = (Math.round(it.rot / (PI / 2)) * PI) / 2;
    x = Math.round(x * 2) / 2;
    z = Math.round(z * 2) / 2;
  }
  const c = bounds(it);
  if (k === "corner") {
    x = (x < 0 ? -1 : 1) * (hw - c.hx);
    z = (z < 0 ? -1 : 1) * (hd - c.hz);
  }
  it.pos = [
    Math.max(-hw + c.hx, Math.min(hw - c.hx, x)),
    Math.max(-hd + c.hz, Math.min(hd - c.hz, z)),
  ];
  build(it);
  place();
  save();
  inspector();
  toast("Đã căn chỉnh");
}

/* Bảng chỉnh sửa bố cục */

$("#add").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.id === "openAdd") openAdd();
  if (b.id === "hu") undo();
  if (b.id === "hr") redo();
  if (b.id === "ov") overview();
  if (b.id === "sn") {
    snapOn = !snapOn;
    b.classList.toggle("on", snapOn);
    toast("Tự hít: " + (snapOn ? "bật" : "tắt"));
  }
  if (b.id === "rs") {
    pushHist();
    restore(DEFAULT_LAYOUT);
    toast("Đã khôi phục mặc định (Ctrl+Z để hoàn tác)");
  }
};
updHist();

/* Cửa sổ thêm quầy: mô hình 3D xoay 360° */
const st4 = mkStage($("#cv4")),
  ren4 = st4.r,
  stage4 = st4.s,
  cam4 = st4.c;
cam4.position.set(0, 1.7, 5.4);
cam4.lookAt(0, 0.7, 0);
let aPre = 0,
  aMod = null,
  aRy = 0.6;
const DESC = [
  "Kệ đôi đặt giữa lối đi, hai mặt hàng",
  "Kệ đơn, đặt sát tường",
  "Thùng gỗ rau củ, hai mặt",
  "Tủ mát kính có đèn",
  "Tủ đông nắp kính",
  "Bao gạo xếp chồng",
  "Quầy thu ngân, màn hình và băng chuyền",
  "Pallet hàng khuyến mãi",
];

$("#ax").innerHTML = IC("x", 14);
$("#aok").innerHTML = IC("plus", 15) + "<span>Thêm vào cửa hàng</span>";

function size4() {
  const c = $("#cv4"),
    w = c.clientWidth,
    h = c.clientHeight;
  if (w && h) {
    ren4.setSize(w, h, false);
    cam4.aspect = w / h;
    cam4.updateProjectionMatrix();
  }
}

$("#amodal").onclick = (e) => {
  if (e.target.id === "amodal" || e.target.closest("#ax"))
    $("#amodal").classList.remove("on");
};
drag3(
  $("#cv4"),
  () => aRy,
  (v) => {
    aRy = v;
    if (aMod) aMod.rotation.y = v;
  },
);

/* ============ Tab + vòng lặp ============ */
let tab = "store";
$("#tabs").onclick = (e) => {
  const t = e.target.dataset.t;
  if (!t) return;
  tab = t;
  document
    .querySelectorAll("#tabs button")
    .forEach((b) => b.classList.toggle("on", b.dataset.t === t));
  $("#store").classList.toggle("on", t === "store");
  $("#staff").classList.toggle("on", t === "staff");
  fit();
  size2();
  if (t === "staff") {
    if (!cur || !StaffRegistry.get(cur.code))
      showChar((StaffRegistry.all()[0] || {}).code);
    requestAnimationFrame(size2);
  }
};
function size2() {
  const w = cv2w().clientWidth,
    h = cv2w().clientHeight;
  if (!w || !h) return;
  ren2.setSize(w, h, false);
  cam2.aspect = w / h;
  frame(cam2, w / h, 2.9, 0.95);
  cam2.updateProjectionMatrix();
}
const cv2w = () => $("#cv2").parentElement;
const sizeAll = () => {
  fit();
  size2();
  size3();
  size4();
};
const ro = new ResizeObserver(sizeAll);
[$("#store"), $(".cvwrap"), $(".pv"), $("#cv4").parentElement].forEach((x) =>
  ro.observe(x),
);
addEventListener("resize", sizeAll);
setBg();
fit();
overview();
cam.T = null;
cam.r = cam.fit;
const elModal = $("#modal"),
  elAModal = $("#amodal");
let FR = 0,
  last = performance.now();
(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000),
    t = now / 1000;
  last = now;
  if (tab === "store") {
    npcs.forEach((n) => {
      n.g.visible = showStaff;
      if (showStaff) stepNpc(n, dt, t);
    });
    stepCam(dt);
    stepKeys(dt);
    if (!ptrs.size && !cam.T && Math.abs(cam.vth) > 1e-4) {
      cam.th += cam.vth;
      cam.vth *= 0.93;
    }
    applyOffset(dt);
    updCam();
    const cp = camera.position,
      hw = STORE.W / 2,
      hd = STORE.D / 2,
      cut = {
        f: cp.z > hd,
        b: cp.z < -hd,
        l: cp.x < -hw,
        r: cp.x > hw,
        bb: cp.z < -hd - 5.5,
        rl: cp.x < -hw - 0.5,
        rr: cp.x > hw + 0.5,
      },
      kw = 1 - Math.exp(-dt * 8);
    for (const s in WALLS) {
      const w = WALLS[s],
        goal = cut[s] ? WFADE : 1;
      w.f += (goal - w.f) * kw;
      if (Math.abs(goal - w.f) < 0.004) w.f = goal;
      for (const k in w.m) {
        w.m[k].opacity = w.o[k] * w.f;
        w.m[k].depthWrite = w.f > 0.98;
      }
    }
    if (++FR % 4 === 0) ren.shadowMap.needsUpdate = true;
    ren.render(scene, camera);
  } else if (cur) {
    pose(cur, dt, t);
    if (cur.pop < 1) {
      cur.pop = Math.min(1, cur.pop + dt * 4);
      const e = 1 - Math.pow(1 - cur.pop, 3);
      cur.g.scale.setScalar(cur.sc * (0.88 + 0.12 * e));
    }
    ren2.render(stage, cam2);
  }
  if (pv && elModal.classList.contains("on")) {
    pose(pv, dt, t);
    ren3.render(stage3, cam3);
  }
  if (aMod && elAModal.classList.contains("on")) {
    if (window.aSpin !== false) aRy += dt * 0.4;
    aMod.rotation.y = aRy;
    ren4.render(stage4, cam4);
  }
})(last);
/* ============ PATCH v2: sửa UI lệch, gắn bộ phận model, camera sân khấu, chọn bộ phận (IIFE, bọc lại hàm gốc phía trên) ============ */
(() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)),
    ZMIN = 0.3,
    ZMAX = 1.25,
    modal = document.getElementById("modal"),
    modalOn = () => modal.classList.contains("on");
  ICONS.minus = '<path d="M5 12h14"/>';

  /* --- Sửa lỗi UI lệch: scrollIntoView chỉ cuộn trong #slist --- */
  const _sv = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (o) {
    const L = document.getElementById("slist");
    if (L && this.classList && this.classList.contains("srow")) {
      if (getComputedStyle(L).flexDirection === "row")
        L.scrollTo({
          left: this.offsetLeft - (L.clientWidth - this.offsetWidth) / 2,
          behavior: "smooth",
        });
      else
        L.scrollTo({
          top: this.offsetTop - (L.clientHeight - this.offsetHeight) / 2,
          behavior: "smooth",
        });
      return;
    }
    _sv.call(this, o);
  };
  ["main", "#staff", "body"].forEach((s) => {
    const e = document.querySelector(s);
    e.addEventListener("scroll", () => {
      e.scrollLeft = 0;
      e.scrollTop = 0;
    });
  });

  /* --- Gắn nhãn bộ phận cho model --- */
  const _mkc = makeChar;
  makeChar = function (s) {
    const c = _mkc(s),
      W = 0.8 + { ...LOOK0, ...s.look }.build * 0.6;
    c.g.traverse((m) => {
      if (!m.isMesh) return;
      const p = m.parent,
        t = m.geometry.type,
        r = m.geometry.parameters || {},
        y = m.position.y,
        z = m.position.z;
      let q = "body";
      if (p === c.head) {
        if (t === "SphereGeometry" && r.radius === 0.15) q = "head";
        else if (
          t === "ConeGeometry" ||
          t === "TorusGeometry" ||
          (t === "SphereGeometry" && r.radius === 0.17) ||
          (t === "BoxGeometry" && z >= 0.1495)
        )
          q = "acc";
        else if (
          (t === "SphereGeometry" && r.radius < 0.04) ||
          (t === "BoxGeometry" && Math.abs(z - 0.145) < 0.003)
        )
          q = "face";
        else q = "hair";
      } else if (p === c.b) {
        if (t === "CylinderGeometry")
          q = y > 0.55 ? "head" : y > 0.1 ? "body" : "legs";
        else q = z > 0.2 * W ? "acc" : "body";
      } else if (p === c.aL || p === c.aR) q = "arms";
      else if (p === c.lL || p === c.lR)
        q = t === "BoxGeometry" ? "shoes" : "legs";
      m.userData.part = q;
    });
    return c;
  };

  /* --- Camera từng sân khấu --- */
  const rc = new THREE.Raycaster(),
    mv = new THREE.Vector2();
  const cast = (x, y, cvs, cam, obj) => {
    const r = cvs.getBoundingClientRect();
    mv.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    rc.setFromCamera(mv, cam);
    return rc
      .intersectObject(obj.g, true)
      .filter((h) => h.object.userData.part);
  };
  function pickPart(e, cvs, cam, obj) {
    const h = cast(e.clientX, e.clientY, cvs, cam, obj)[0];
    if (!h) return null;
    let q = h.object.userData.part;
    if (q === "head") {
      const p = obj.head.worldToLocal(h.point.clone());
      if (p.z > 0.07 && p.y < 0.06 && p.y > -0.1 && Math.abs(p.x) < 0.11)
        q = "face";
    }
    return q;
  }
  const mkO = (cvs, cam, obj, ly, H, def, rot, set) => ({
    V: { z: 1, zt: 1, fy: ly, ft: ly, raw: ly },
    ly,
    H,
    cvs,
    cam,
    obj,
    def,
    rot,
    setRot: set,
    man: false,
  });
  const O2 = mkO(
    document.getElementById("cv2"),
    cam2,
    () => cur,
    0.95,
    2.9,
    0.4,
    () => ry,
    (v) => {
      ry = v;
      if (cur) cur.g.rotation.y = v;
    },
  );
  const O3 = mkO(
    document.getElementById("cv3"),
    cam3,
    () => pv,
    0.85,
    3.3,
    0.3,
    () => pvRy,
    (v) => {
      pvRy = v;
      if (pv) pv.g.rotation.y = v;
    },
  );
  function vf(c, o) {
    const V = o.V,
      n = performance.now(),
      dt = Math.min(0.05, (n - (V.t || n)) / 1000);
    V.t = n;
    const k = 1 - Math.exp(-dt * 12);
    V.z += (V.zt - V.z) * k;
    V.fy += (V.ft - V.fy) * k;
    const t = 2 * Math.tan(THREE.MathUtils.degToRad(c.fov / 2)),
      d = Math.max(o.H / t, 2.1 / (t * c.aspect)) * V.z;
    c.position.set(0, V.fy + 0.25 * V.z, d);
    c.lookAt(0, V.fy, 0);
  }
  [
    [ren2, O2],
    [ren3, O3],
  ].forEach(([r, o]) => {
    const f = r.render.bind(r);
    r.render = (s, c) => {
      vf(c, o);
      f(s, c);
    };
  });
  const resetV = (o) => {
    o.V.zt = 1;
    o.V.ft = o.ly;
    o.V.raw = o.ly;
    o.man = false;
  };
  function zoomTo(o, z, x, y) {
    const V = o.V;
    o.man = true;
    V.zt = clamp(z, ZMIN, ZMAX);
    const c = o.obj();
    if (c && V.zt < 1 && x != null) {
      const h = cast(x, y, o.cvs, o.cam, c)[0];
      if (h) V.raw = clamp(h.point.y, 0.2, 1.7);
    }
    V.ft = o.ly + (V.raw - o.ly) * clamp((1 - V.zt) / 0.4, 0, 1);
  }
  /* focus camera vào đúng bộ phận đang chỉnh */
  function focusPart(o, q) {
    const c = o.obj();
    if (!c) return;
    c.g.updateMatrixWorld(true);
    const b = new THREE.Box3();
    c.g.traverse((m) => {
      if (m.isMesh && m.userData.part === q) b.expandByObject(m);
    });
    if (b.isEmpty()) return q === "acc" ? focusPart(o, "head") : 0;
    const s = b.getSize(new THREE.Vector3()),
      cy = (b.min.y + b.max.y) / 2,
      cm = o.cam,
      t = 2 * Math.tan(THREE.MathUtils.degToRad(cm.fov / 2)),
      base = Math.max(o.H / t, 2.1 / (t * cm.aspect)),
      vis = Math.max(s.y * 1.9, (Math.max(s.x, s.z) * 1.9) / cm.aspect, 0.6);
    o.man = false;
    o.V.zt = clamp(vis / (t * base), ZMIN, 1);
    o.V.raw = o.V.ft = clamp(cy, 0.1, 1.8);
  }

  /* --- Chọn bộ phận: nhãn, phát sáng trên model, nổi thẻ trong form --- */
  const PN = {
    head: "Đầu",
    hair: "Tóc",
    face: "Khuôn mặt",
    body: "Thân",
    arms: "Tay",
    legs: "Chân",
    shoes: "Giày",
    acc: "Phụ kiện",
  };
  let selPart = null;
  const HM = new Map(),
    hlMat = (m) => {
      let h = HM.get(m);
      if (!h) {
        h = m.clone();
        h.emissive = new THREE.Color(0x0a84ff);
        h.emissiveIntensity = 0.45;
        HM.set(m, h);
      }
      return h;
    };
  function paint(c) {
    if (c)
      c.g.traverse((o) => {
        if (o.isMesh && o.userData.part) {
          const b = o.userData.base || (o.userData.base = o.material);
          o.material = o.userData.part === selPart ? hlMat(b) : b;
        }
      });
  }
  function applyHL(sc) {
    F.classList.toggle("hs", !!selPart);
    F.querySelectorAll("[data-card]").forEach((c) =>
      c.classList.toggle("sel", c.dataset.card === selPart),
    );
    const c = selPart && F.querySelector(`[data-card="${selPart}"]`);
    if (sc && c)
      F.scrollTo({
        top: Math.max(
          0,
          c.getBoundingClientRect().top -
            F.getBoundingClientRect().top +
            F.scrollTop -
            56,
        ),
        behavior: "smooth",
      });
  }
  function mkTag(host, onOpen) {
    const t = document.createElement("div");
    t.className = "ptag";
    t.innerHTML =
      '<button class="o"></button><button class="x" title="Bỏ chọn">✕</button>';
    host.appendChild(t);
    t.querySelector(".o").onclick = () => onOpen && onOpen();
    t.querySelector(".x").onclick = () => selectPart(null);
    return t;
  }
  const T2 = mkTag(document.querySelector(".cvwrap"), () => {
      if (cur && selPart) {
        const k = selPart;
        openStaff(cur.code);
        selectPart(k, true);
      }
    }),
    T3 = mkTag(document.querySelector(".pv"));
  function updTags() {
    [T2, T3].forEach((t) => t.classList.toggle("on", !!selPart));
    T2.firstChild.textContent = selPart
      ? PN[selPart] + " · Sửa chi tiết ›"
      : "Chạm vào bộ phận để chọn";
    T3.firstChild.textContent = selPart
      ? "Đang sửa: " + PN[selPart]
      : "Chạm vào bộ phận để sửa";
  }
  function selectPart(p, sc) {
    selPart = p;
    paint(cur);
    paint(pv);
    updTags();
    applyHL(sc);
    if (p) {
      if (modalOn()) focusPart(O3, p);
      else if (cur) focusPart(O2, p);
    } else {
      resetV(O2);
      resetV(O3);
    }
  }
  updTags();
  const _rf0 = null;
  renderForm = function () {
    const d = draft,
      K = { ...LOOK0, ...d.look },
      op = F.querySelector("details")?.open,
      st = F.scrollTop;
    const HAIRS = [
        "#151515",
        "#2b2220",
        "#4a2c2a",
        "#6b3f2a",
        "#b5651d",
        "#e8c07d",
        "#d9d9d9",
      ],
      SKINS = [
        "#f6d7bd",
        "#f0c8a4",
        "#e3b894",
        "#dcab88",
        "#c48c66",
        "#8d5a3b",
      ];
    const row = (l, f) =>
      `<label class="li"><span>${l}</span><input type="text" data-f="${f}" value="${esc(d[f])}"></label>`;
    const num = (k, l, mn, mx, sp, ps, fm) => {
      const v = +K[k],
        nv = (s) => +clamp(v + s * sp, mn, mx).toFixed(2);
      return `<div class="ln"><div class="lt"><span>${l}</span><b>${fm(v)}</b></div><div class="ctl2"><div class="seg sg">${ps.map((p) => `<button class="${Math.abs(v - p[1]) < sp * 0.55 ? "on" : ""}" data-pre="${k}" data-v="${p[1]}">${p[0]}</button>`).join("")}</div><div class="stp"><button data-pre="${k}" data-v="${nv(-1)}" title="Giảm">${IC("minus", 14)}</button><button data-pre="${k}" data-v="${nv(1)}" title="Tăng">${IC("plus", 14)}</button></div></div></div>`;
    };
    const opt = (k, l, o) =>
      `<div class="ln"><div class="lt"><span>${l}</span></div><div class="chips">${Object.entries(
        o,
      )
        .map(
          ([v, n]) =>
            `<button class="chip${K[k] === v ? " on" : ""}" data-set="${k}" data-v="${v}">${n}</button>`,
        )
        .join("")}</div></div>`;
    const clr = (k, l, c) =>
      `<div class="ln"><div class="clr"><span>${l}</span><span class="dots">${(c || []).map((h) => `<button class="dot${String(K[k]).toLowerCase() === h ? " on" : ""}" style="background:${h}" data-set="${k}" data-v="${h}" title="${h}"></button>`).join("")}<input type="color" data-k="${k}" value="${K[k]}"></span></div></div>`;
    const card = (q, t, b) =>
      `<div class="pc" data-card="${q}"><h5>${t}</h5>${b}</div>`;
    const g3 = (v) => "×" + v.toFixed(2);
    $("#mcode").textContent = d.code + (isNew ? " · mới" : "");
    F.innerHTML = `<div class="nav2"><div class="seg">${[
      ["info", "Thông tin"],
      ["work", "Công việc"],
      ["tag", "Tag"],
      ["look", "Ngoại hình"],
    ]
      .map((a) => `<button data-go="${a[0]}">${a[1]}</button>`)
      .join("")}</div></div>
 <div class="pc" data-sec="info"><h5>Thông tin cơ bản</h5><div class="ls">${row("Tên", "name")}${row("Biệt danh", "nick")}<label class="li"><span>Chức vụ</span><select data-f="role">${Object.entries(
   ROLES,
 )
   .map(
     ([v, r]) =>
       `<option value="${v}"${d.role === v ? " selected" : ""}>${r[0]}</option>`,
   )
   .join(
     "",
   )}</select></label>${row("Ca làm", "shift")}${row("Điện thoại", "phone")}${row("Vào làm", "start")}</div></div>
 <div class="pc" data-sec="work"><h5>Công việc &amp; ghi chú</h5><div class="ls">${row("Kỹ năng", "skills")}${row("Tính cách", "personality")}<label class="li ta"><span>Ghi chú</span><textarea data-f="note" rows="2">${esc(d.note)}</textarea></label></div></div>
 <div class="pc" data-sec="tag"><h5>Tag</h5><div class="chips">${TagRegistry.all()
   .map(
     (t) =>
       `<button class="chip${(d.tags || []).includes(t.code) ? " on" : ""}" data-tag="${t.code}">${tIc(t)}${esc(t.name)}</button>`,
   )
   .join("")}</div>
 <details><summary>Quản lý tag (tạo / sửa / xóa)</summary>${TagRegistry.all()
   .map(
     (t) =>
       `<div class="trow"><span class="ti" style="color:${t.color}">${tIc(t)}</span><select data-t="${t.code}" data-p="icon">${Object.entries(
         ICON_NAMES,
       )
         .map(
           ([k, n]) =>
             `<option value="${k}"${t.icon === k ? " selected" : ""}>${n}</option>`,
         )
         .join(
           "",
         )}</select><input data-t="${t.code}" data-p="name" value="${esc(t.name)}"><input type="color" data-t="${t.code}" data-p="color" value="${t.color}"><input data-t="${t.code}" data-p="desc" value="${esc(t.desc)}" placeholder="Mô tả"><button class="btn red sm" data-dt="${t.code}">${IC("x", 12)}</button></div>`,
   )
   .join(
     "",
   )}<button class="btn sm" data-nt="1">${IC("plus", 13)} Tạo tag mới</button><div class="mute" style="margin-top:6px">Tag là dữ liệu chung, sửa/xóa có hiệu lực ngay.</div></details></div>
 <div data-sec="look"><div class="gt">Ngoại hình</div><div class="gs">Chạm vào nhân vật hoặc chỉnh trong từng thẻ — camera sẽ tự đưa tới đúng bộ phận.</div>
 ${card("hair", "Tóc", opt("hairStyle", "Kiểu tóc", SEL.hairStyle[1]) + clr("hair", "Màu tóc", HAIRS))}
 ${card(
   "head",
   "Đầu",
   num(
     "headSize",
     "Kích thước đầu",
     0.85,
     1.25,
     0.05,
     [
       ["Nhỏ", 0.9],
       ["Vừa", 1],
       ["To", 1.15],
     ],
     g3,
   ) + clr("skin", "Màu da (cả người)", SKINS),
 )}
 ${card("face", "Khuôn mặt", opt("face", "Dáng mặt", SEL.face[1]) + opt("eyes", "Mắt", SEL.eyes[1]) + `<div class="ln"><div class="chips"><button class="chip${K.blush ? " on" : ""}" data-blush="1">Má hồng</button></div></div>`)}
 ${card(
   "body",
   "Thân",
   num(
     "height",
     "Chiều cao",
     1.45,
     1.95,
     0.02,
     [
       ["Thấp", 1.55],
       ["Trung bình", 1.7],
       ["Cao", 1.85],
     ],
     (v) => v.toFixed(2) + " m",
   ) +
     num(
       "build",
       "Thể hình",
       0,
       1,
       0.1,
       [
         ["Gầy", 0.1],
         ["Cân đối", 0.4],
         ["Đầy đặn", 0.7],
         ["Mập", 1],
       ],
       (v) => Math.round(v * 100) + "%",
     ) +
     `<div class="mute">Màu áo: ${(ROLES[d.role] || ROLES.staff)[1] === "gray" ? "xám" : "hồng"} theo chức vụ.</div>`,
 )}
 ${card(
   "arms",
   "Tay",
   num(
     "armRatio",
     "Độ dài tay",
     0.85,
     1.2,
     0.05,
     [
       ["Ngắn", 0.9],
       ["Vừa", 1],
       ["Dài", 1.1],
     ],
     g3,
   ),
 )}
 ${card(
   "legs",
   "Chân",
   num(
     "legRatio",
     "Độ dài chân",
     0.85,
     1.2,
     0.05,
     [
       ["Ngắn", 0.9],
       ["Vừa", 1],
       ["Dài", 1.1],
     ],
     g3,
   ) + clr("pants", "Màu quần"),
 )}
 ${card("shoes", "Giày", clr("shoes", "Màu giày"))}
 ${card("acc", "Phụ kiện", `<div class="chips">${ACCS.map(([v, n]) => `<button class="chip${(K.acc || []).includes(v) ? " on" : ""}" data-acc="${v}">${n}</button>`).join("")}</div>`)}</div>`;
    if (op) F.querySelector("details").open = true;
    F.scrollTop = st;
    applyHL(false);
  };

  /* --- Form ⇄ model: chạm thẻ nào thì model focus bộ phận đó; chạm ngoài thẻ thì bỏ chọn --- */
  F.addEventListener("click", (e) => {
    const b = e.target.closest("[data-set]");
    if (!b) return;
    draft.look = draft.look || {};
    draft.look[b.dataset.set] = b.dataset.v;
    renderForm();
    rebuildPv();
  });
  const pickCard = (e) => {
    const g = e.target.closest && e.target.closest("[data-go]");
    if (g) {
      const s = F.querySelector(`[data-sec="${g.dataset.go}"]`);
      F.querySelectorAll("[data-go]").forEach((x) =>
        x.classList.toggle("on", x === g),
      );
      if (s)
        F.scrollTo({
          top:
            s.getBoundingClientRect().top -
            F.getBoundingClientRect().top +
            F.scrollTop -
            52,
          behavior: "smooth",
        });
      if (selPart) selectPart(null);
      return;
    }
    const c = e.target.closest && e.target.closest("[data-card]"),
      q = c ? c.dataset.card : null;
    if (q !== selPart) selectPart(q, false);
  };
  F.addEventListener("click", pickCard);
  F.addEventListener("focusin", pickCard);

  const _rb = rebuildPv;
  rebuildPv = function () {
    _rb();
    paint(pv);
    if (selPart && modalOn() && !O3.man) focusPart(O3, selPart);
  };
  const _os = openStaff;
  openStaff = function (c) {
    resetV(O3);
    _os(c);
    updTags();
    paint(pv);
    if (selPart) {
      focusPart(O3, selPart);
      applyHL(true);
    }
  };
  const _sc = showChar;
  showChar = function (c) {
    if (!(cur && cur.code === c) && selPart) {
      selPart = null;
      resetV(O2);
      resetV(O3);
    }
    _sc(c);
    paint(cur);
    updTags();
  };
  new MutationObserver(() => {
    if (!modalOn()) {
      if (selPart) selectPart(null);
      else resetV(O3);
    }
  }).observe(modal, { attributes: true, attributeFilter: ["class"] });

  /* --- Điều khiển: kéo = xoay · cuộn/chụm = zoom · chạm = chọn · chạm ra ngoài = bỏ chọn + hết zoom --- */
  O2.tap = function (e) {
    if (!cur) return;
    const q = pickPart(e, this.cvs, cam2, cur);
    if (!q) return selectPart(null);
    if (q === selPart) {
      const k = q;
      openStaff(cur.code);
      selectPart(k, true);
    } else selectPart(q, false);
  };
  O3.tap = function (e) {
    if (!pv) return;
    const q = pickPart(e, this.cvs, cam3, pv);
    selectPart(q && q !== selPart ? q : null, true);
  };
  function ctl(o) {
    const cvs = o.cvs,
      host = cvs.parentElement,
      P = new Map();
    let moved = 0,
      d0 = 0,
      z0 = 1;
    const on = (t, f) =>
      host.addEventListener(
        t,
        (e) => {
          if (e.target !== cvs) return;
          e.stopPropagation();
          f(e);
        },
        true,
      );
    on("pointerdown", (e) => {
      cvs.setPointerCapture(e.pointerId);
      P.set(e.pointerId, [e.clientX, e.clientY]);
      if (P.size === 1) moved = 0;
      else if (P.size === 2) {
        const [a, b] = [...P.values()];
        d0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
        z0 = o.V.zt;
        moved = 99;
      }
    });
    on("pointermove", (e) => {
      const p = P.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p[0];
      moved += Math.abs(dx) + Math.abs(e.clientY - p[1]);
      p[0] = e.clientX;
      p[1] = e.clientY;
      if (P.size === 2) {
        const [a, b] = [...P.values()],
          d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (d0 && d > 0)
          zoomTo(o, (z0 * d0) / d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        return;
      }
      if (moved > 6) o.setRot(o.rot() + dx * 0.01);
    });
    on("pointerup", (e) => {
      if (P.size === 1 && moved <= 6) o.tap(e);
      P.delete(e.pointerId);
    });
    on("pointercancel", (e) => P.delete(e.pointerId));
    cvs.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        zoomTo(o, o.V.zt * (1 + e.deltaY * 0.0015), e.clientX, e.clientY);
      },
      { passive: false },
    );
    const d = document.createElement("div");
    d.className = "vc seg";
    d.innerHTML = `<button data-z="o" title="Thu nhỏ">${IC("minus", 14)}</button><button data-z="i" title="Phóng to">${IC("plus", 14)}</button><button data-z="r" title="Về góc nhìn mặc định">Về mặc định</button>`;
    host.appendChild(d);
    d.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const z = b.dataset.z;
      if (z === "i" || z === "o") zoomTo(o, o.V.zt * (z === "i" ? 0.8 : 1.25));
      if (z === "r") {
        resetV(o);
        o.setRot(o.def);
      }
    };
  }
  ctl(O2);
  ctl(O3);
  const h = document.querySelector(".hint");
  if (h)
    h.textContent = "Kéo xoay · cuộn / chụm để zoom · chạm bộ phận để chọn";
})();

/* ============ PATCH v3: tô màu avatar theo chức vụ (IIFE) ============ */
(() => {
  const tint = (av, role) => {
    if (!av) return;
    av.classList.remove("rg-gray", "rg-pink");
    av.classList.add("rg-" + (ROLES[role] || ROLES.staff)[1]);
  };
  const _rl = renderList;
  renderList = function () {
    _rl.apply(this, arguments);
    document.querySelectorAll("#slist .srow").forEach((r) => {
      const s = StaffRegistry.get(r.dataset.c);
      if (s) tint(r.querySelector(".av"), s.role);
    });
  };
  const _rn = renderNote;
  renderNote = function (s) {
    _rn.apply(this, arguments);
    tint(document.querySelector("#note .av"), s.role);
  };
  renderList();
  if (typeof cur !== "undefined" && cur) {
    const s = StaffRegistry.get(cur.code);
    if (s) tint(document.querySelector("#note .av"), s.role);
  }

  setTimeout(
    () => toast("2 ngón / chuột phải / WASD để trượt quanh cửa hàng"),
    1200,
  );
})();

/* ============ PATCH v4: nâng cấp model nhân viên + logo MAXIDI ngực trái (IIFE) ============
   CÁCH DÙNG: dán toàn bộ khối này xuống CUỐI script.js (sau PATCH v3).
   Không sửa logic cũ: chỉ bọc makeChar() để thêm chi tiết, rồi dựng lại NPC trong cửa hàng. */
(() => {
  /* ---------- Cấu hình logo (chỉnh ở đây nếu muốn đổi cỡ / vị trí) ---------- */
  const LOGO = {
    side: 1 /* +1 = ngực trái của nhân vật (bên phải màn hình khi nhìn chính diện); -1 = ngực phải */,
    w: 0.092 /* bề rộng logo (đơn vị model, tự co theo chiều cao nhân vật) */,
    h: 0.092 /* chiều cao logo */,
    x: 0.105 /* độ lệch ngang so với tâm ngực, nhân với W (thể hình) */,
    y: 0.485 /* độ cao tâm logo trên thân (nằm trên mép tạp dề 0.43) */,
  };

  /* ---------- Vật liệu logo (tạo 1 lần, dùng chung cho mọi nhân vật) ---------- */
  let _logoMat = null;

  /* Vẽ logo bằng canvas: "!M" + "MAXIDI" + "Chợ Kiểu Mới", chữ trắng, nền trong suốt */
  function logoMat() {
    if (_logoMat) return _logoMat;
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const g = cv.getContext("2d");
    g.fillStyle = "#fff";
    g.strokeStyle = "#fff";
    g.lineJoin = "round";
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    /* chọn cỡ chữ để dòng vừa bề rộng maxW (không vượt maxSize) */
    const fit = (txt, spec, maxW, maxSize) => {
      g.font = spec.replace("{s}", 100);
      return Math.min(maxSize, (100 * maxW) / g.measureText(txt).width);
    };
    /* vẽ một dòng chữ trắng đậm tại baseline y */
    const line = (txt, spec, size, y, skew = 0) => {
      g.save();
      g.translate(128, y);
      g.transform(1, 0, -skew, 1, 0, 0); /* nghiêng chữ (italic) */
      g.font = spec.replace("{s}", size);
      g.lineWidth = size * 0.035; /* viền mỏng cho chữ dày hơn */
      g.strokeText(txt, 0, 0);
      g.fillText(txt, 0, 0);
      g.restore();
    };
    const SPEC_M = '900 {s}px "Arial Black","Helvetica Neue",Arial,sans-serif';
    const SPEC_T = "800 {s}px Arial,Helvetica,sans-serif";
    const SPEC_S = "600 {s}px Arial,Helvetica,sans-serif";
    line("!M", SPEC_M, fit("!M", SPEC_M, 200, 150), 118, 0.16);
    line("MAXIDI", SPEC_T, fit("MAXIDI", SPEC_T, 236, 64), 186);
    line("Chợ Kiểu Mới", SPEC_S, fit("Chợ Kiểu Mới", SPEC_S, 220, 36), 234);
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    _logoMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.85,
      depthWrite: false,
      polygonOffset: true /* chống z-fight với mặt áo */,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      emissive: 0xffffff /* giữ chữ luôn sáng trắng dưới bóng đổ */,
      emissiveMap: tex,
      emissiveIntensity: 0.25,
    });
    return _logoMat;
  }

  /* ---------- Helper ---------- */

  /* thêm một mesh vào parent, gắn nhãn bộ phận (part) để chọn/tô sáng trong hồ sơ */
  const add = (parent, geo, color, x, y, z, part, rough = 0.75) => {
    const m = new THREE.Mesh(geo, M(color, rough));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.userData.part = part;
    parent.add(m);
    return m;
  };

  /* làm tối/sáng một màu hex theo hệ số k */
  const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

  /* ---------- Logo ngực trái: dải trụ cong ôm đúng thân áo ---------- */
  function addLogo(c, W) {
    /* bỏ miếng thẻ trắng nhỏ cũ ở ngực (chữ trắng sẽ không nhìn thấy trên nền trắng) */
    const old = c.b.children.find(
      (m) =>
        m.isMesh &&
        m.geometry.type === "BoxGeometry" &&
        Math.abs(m.geometry.parameters.width - 0.1) < 1e-6 &&
        Math.abs(m.geometry.parameters.height - 0.06) < 1e-6 &&
        Math.abs(m.geometry.parameters.depth - 0.01) < 1e-6,
    );
    if (old) {
      c.b.remove(old);
      old.geometry.dispose();
    }
    /* bán kính thân áo tại độ cao logo (thân thon: đáy = 0.92 × đỉnh) */
    const rTop = 0.2 * W,
      rBot = rTop * 0.92,
      t = (LOGO.y - 0.025) / 0.55,
      r = rBot + (rTop - rBot) * t + 0.003;
    const xc = LOGO.side * LOGO.x * W,
      th = Math.asin(THREE.MathUtils.clamp(xc / r, -0.95, 0.95)),
      len = LOGO.w / r;
    const geo = new THREE.CylinderGeometry(
      r,
      r,
      LOGO.h,
      6,
      1,
      true,
      th - len / 2,
      len,
    );
    const m = new THREE.Mesh(geo, logoMat());
    m.position.y = LOGO.y;
    m.renderOrder = 2;
    m.userData.part = "body";
    c.b.add(m);
  }

  /* ---------- Nâng cấp chi tiết model ---------- */
  function upgrade(c, s) {
    const k = { ...LOOK0, ...s.look },
      gray = (ROLES[s.role] || ROLES.staff)[1] === "gray",
      shirt = gray ? 0x9a9aa0 : 0xff8fb1,
      W = 0.8 + k.build * 0.6,
      LEG = 0.82 * k.legRatio,
      ARM = 0.55 * k.armRatio,
      skin = hex(k.skin),
      hair = hex(k.hair),
      shoes = hex(k.shoes),
      A = k.acc || [];

    /* 1) logo ngực trái */
    addLogo(c, W);

    /* 2) cổ áo (trắng nếu có cà vạt) */
    const collar = add(
      c.b,
      new THREE.TorusGeometry(0.07, 0.014, 8, 20),
      A.includes("tie") ? 0xffffff : shade(shirt, 0.85),
      0,
      0.58,
      0,
      "body",
    );
    collar.rotation.x = PI / 2;

    /* 3) vai bo tròn + gấu tay áo cho cả hai tay */
    [c.aL, c.aR].forEach((a) => {
      add(a, new THREE.SphereGeometry(0.066 * W, 12, 8), shirt, 0, 0, 0, "arms");
      add(
        a,
        new THREE.CylinderGeometry(0.066 * W, 0.066 * W, 0.022, 12),
        shade(shirt, 0.88),
        0,
        -0.225,
        0,
        "arms",
      );
    });

    /* 4) thắt lưng + khóa */
    add(
      c.b,
      new THREE.CylinderGeometry(0.19 * W, 0.19 * W, 0.03, 16),
      0x2a2a2e,
      0,
      0.035,
      0,
      "legs",
    );
    add(
      c.b,
      new THREE.BoxGeometry(0.05, 0.032, 0.012),
      0xd4af37,
      0,
      0.035,
      0.19 * W + 0.004,
      "legs",
      0.3,
    );

    /* 5) quản lý / cửa hàng phó: cầu vai có sọc (2 sọc = trưởng, 1 sọc = phó) + đồng hồ đeo tay */
    if (gray) {
      const bars = s.role === "manager" ? 2 : 1;
      [-1, 1].forEach((x) => {
        const ep = add(
          c.b,
          new THREE.BoxGeometry(0.075, 0.012, 0.1),
          shade(shirt, 0.7),
          x * (0.2 * W + 0.05),
          0.594,
          0,
          "body",
        );
        ep.rotation.z = -x * 0.25; /* nghiêng theo dốc vai */
        for (let i = 0; i < bars; i++)
          add(
            ep,
            new THREE.BoxGeometry(0.06, 0.004, 0.012),
            0xd4af37,
            0,
            0.008,
            (i - (bars - 1) / 2) * 0.03,
            "body",
            0.3,
          );
      });
      add(
        c.aR,
        new THREE.CylinderGeometry(0.058 * W, 0.058 * W, 0.025, 12),
        0x2a2a2e,
        0,
        -ARM + 0.08,
        0,
        "arms",
      );
      add(
        c.aR,
        new THREE.BoxGeometry(0.014, 0.022, 0.022),
        0xc9ced6,
        0.058 * W,
        -ARM + 0.08,
        0,
        "arms",
        0.2,
      );
    }

    /* 6) khuôn mặt: tai, lông mày, mũi */
    [-1, 1].forEach((x) => {
      const ear = add(
        c.head,
        new THREE.SphereGeometry(0.032, 10, 8),
        skin,
        x * 0.147,
        -0.005,
        0,
        "head",
      );
      ear.scale.set(0.5, 1, 0.8);
      const brow = add(
        c.head,
        new THREE.BoxGeometry(0.05, 0.009, 0.01),
        hair,
        x * 0.055,
        0.042,
        0.134,
        "face",
      );
      brow.rotation.z = -x * 0.12; /* đuôi mày hơi cụp cho thân thiện */
    });
    const nose = add(
      c.head,
      new THREE.SphereGeometry(0.013, 8, 6),
      shade(skin, 0.92),
      0,
      -0.03,
      0.148,
      "face",
    );
    nose.scale.set(1, 0.9, 1.1);

    /* 7) mái tóc mái (bỏ qua khi đội mũ hoặc không tóc) */
    if (k.hairStyle !== "none" && !A.includes("cap")) {
      const bang = add(
        c.head,
        new THREE.SphereGeometry(0.07, 12, 8),
        hair,
        0,
        0.085,
        0.105,
        "hair",
      );
      bang.scale.set(1.7, 0.5, 0.8);
    }

    /* 8) đế giày */
    [c.lL, c.lR].forEach((l) =>
      add(
        l,
        new THREE.BoxGeometry(0.14 * W, 0.02, 0.25),
        shade(shoes, 0.78),
        0,
        -LEG - 0.045,
        0.045,
        "shoes",
      ),
    );
  }

  /* ---------- Bọc makeChar: mọi nơi dùng makeChar (NPC, sân khấu, xem trước) đều có model mới ---------- */
  const _mk4 = makeChar;
  makeChar = function (s) {
    const c = _mk4(s);
    upgrade(c, s);
    return c;
  };

  /* ---------- Dựng lại NPC đã tạo từ trước (giữ nguyên vị trí, hướng, tiến độ tuần tra) ---------- */
  function rebuildNpcs() {
    const old = npcs.splice(0),
      keep = old.map((o) => ({
        code: o.s.code,
        p: o.g.position.clone(),
        r: o.g.rotation.y,
        i: o.i,
        wait: o.wait,
      }));
    old.forEach((o) => {
      scene.remove(o.g);
      disposeChar(o);
    });
    keep.forEach((q) => {
      const s = StaffRegistry.get(q.code);
      if (!s) return;
      const n = addNpc(s);
      n.g.position.copy(q.p);
      n.g.rotation.y = q.r;
      n.i = q.i;
      n.wait = q.wait;
    });
  }
  rebuildNpcs();
  /* nếu tab Nhân viên đã có nhân vật đang hiển thị thì dựng lại để thấy model mới */
  if (typeof cur !== "undefined" && cur) showChar(cur.code);
})();

/* ============ PATCH v5: hành động mới theo chức vụ (IIFE) ============
   - Nhân viên (staff)            : LAU NHÀ (cầm cây lau, đi chậm và quét qua lại)
   - Quản lý / Cửa hàng phó (gray): CẦM SỔ + CHECK LIST KIỂM KHO (ghi chép, thỉnh thoảng nhìn kệ)
   CÁCH DÙNG: dán toàn bộ khối này xuống CUỐI script.js, SAU PATCH v4.
   Không sửa logic cũ: chỉ bọc makeChar / pose / goal / stepNpc / showChar / rebuildPv. */
(() => {
  /* ---------- Cấu hình ---------- */
  const CFG = {
    /* nhân viên có routine kiểu "station" nhưng vẫn muốn cho đi lau nhà (không đổi dữ liệu đã lưu) */
    mopStaff: ["EMP_0005"],
    /* tốc độ khi lau so với đi bình thường (1 = bằng) */
    mopSpeed: 0.6,
    /* lộ trình lau mặc định (đi tới rồi đi lùi lại, chỉ chạy dọc các lối đi trống) */
    mopRoute: [
      [-3.4, 11.4],
      [3.4, 11.4],
      [3.4, 4],
      [-3.4, 4],
      [-3.4, -3.2],
      [3.4, -3.2],
    ],
  };

  /* ---------- Tiện ích vai trò ---------- */

  /* chức vụ "xám" = quản lý / cửa hàng phó (theo bảng ROLES có sẵn) */
  const isGray = (role) => (ROLES[role] || ROLES.staff)[1] === "gray";

  /* hành động riêng của từng chức vụ: [nhãn nút, mã mode] */
  const roleAct = (role) =>
    isGray(role) ? ["Kiểm kho", "check"] : ["Lau nhà", "mop"];

  /* công việc tự động của NPC trong cửa hàng: 'mop' | 'check' | null */
  function jobOf(n) {
    const s = n.s,
      r = s.routine || {};
    if (isGray(s.role))
      return r.type === "patrol"
        ? "check"
        : null; /* quản lý đi tuần = cầm sổ kiểm kho */
    if (
      CFG.mopStaff.includes(s.code) ||
      r.type === "mop" ||
      r.type === "patrol"
    )
      return "mop"; /* nhân viên đi tuần = lau nhà */
    return null; /* thu ngân / xếp hàng giữ nguyên */
  }

  /* ---------- Vật liệu tờ check list (tạo 1 lần, dùng chung) ---------- */
  let _paper = null;

  /* vẽ tờ "KIỂM KHO": tiêu đề xanh + 6 dòng có ô tích (4 dòng đã tích) */
  function paperMat() {
    if (_paper) return _paper;
    const cv = document.createElement("canvas");
    cv.width = 128;
    cv.height = 160;
    const g = cv.getContext("2d");
    g.fillStyle = "#fffdf6";
    g.fillRect(0, 0, 128, 160);
    g.fillStyle = "#1e5eff";
    g.fillRect(0, 0, 128, 26);
    g.fillStyle = "#fff";
    g.font = "700 15px Arial,sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("KIỂM KHO", 64, 14);
    for (let i = 0; i < 6; i++) {
      const y = 40 + i * 20;
      g.strokeStyle = "#6b6f78";
      g.lineWidth = 2;
      g.strokeRect(10, y, 12, 12);
      if (i < 4) {
        g.strokeStyle = "#1f9d4c";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(12, y + 6);
        g.lineTo(16, y + 10);
        g.lineTo(24, y - 2);
        g.stroke();
      }
      g.fillStyle = "#c9ccd3";
      g.fillRect(32, y + 3, i % 2 ? 70 : 86, 5);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    _paper = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    return _paper;
  }

  /* ---------- Dựng đạo cụ (cây lau / sổ + bút) ---------- */

  /* thêm mesh vào parent; không gắn "part" nên không chặn việc chọn bộ phận */
  const put = (parent, geo, color, x, y, z, rough = 0.75) => {
    const m = new THREE.Mesh(geo, M(color, rough));
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  /* tạo đạo cụ theo chức vụ và tính sẵn góc tay để bàn tay chạm đúng vật cầm */
  function addProps(c, s) {
    const k = { ...LOOK0, ...s.look },
      W = 0.8 + k.build * 0.6,
      LEG = 0.82 * k.legRatio,
      ARM = 0.55 * k.armRatio,
      by = LEG + 0.1,
      L = ARM + 0.01 /* từ vai tới tâm bàn tay */,
      ax = 0.2 * W + 0.05 /* vị trí vai theo trục x */,
      PITCH = 0.8 /* góc đưa tay ra trước */,
      /* góc khép tay vào trong để bàn tay nằm cách tâm hx */
      rzFor = (hx) => Math.asin(THREE.MathUtils.clamp((ax - hx) / L, 0, 0.95)),
      /* toạ độ bàn tay (trong hệ của thân b) khi khép góc rz và đưa ra trước PITCH */
      hand = (rz) => ({
        y: 0.52 - L * Math.cos(rz) * Math.cos(PITCH),
        z: L * Math.cos(rz) * Math.sin(PITCH),
      });
    c.pr = { by };

    if (isGray(s.role)) {
      /* --- Sổ kiểm kho + bút --- */
      const rz = rzFor(0.1),
        h = hand(rz),
        book = new THREE.Group();
      book.position.set(0, h.y + 0.07, h.z + 0.02);
      book.rotation.x = 0.55; /* nghiêng mặt giấy hướng lên và về phía mắt */
      book.visible = false;
      c.b.add(book);
      put(
        book,
        new THREE.BoxGeometry(0.2, 0.27, 0.012),
        0x2f5d50,
        0,
        0,
        0,
        0.6,
      ); /* bìa sổ */
      const paper = new THREE.Mesh(
        new THREE.PlaneGeometry(0.17, 0.22),
        paperMat(),
      );
      paper.position.set(0, -0.005, -0.0075);
      paper.rotation.y = PI; /* mặt giấy quay về phía người cầm */
      book.add(paper);
      put(
        book,
        new THREE.BoxGeometry(0.08, 0.03, 0.02),
        0xc9ced6,
        0,
        0.125,
        -0.012,
        0.3,
      ); /* kẹp sổ */
      const pen = put(
        c.aR,
        new THREE.CylinderGeometry(0.007, 0.007, 0.13, 6),
        0x1e5eff,
        0,
        -(ARM + 0.01) + 0.05 * Math.cos(PITCH),
        0.05 * Math.sin(PITCH),
        0.4,
      );
      pen.rotation.x = PITCH; /* ngòi bút hướng lên về phía tờ giấy */
      pen.visible = false;
      c.pr.check = [book, pen];
      c.pr.rzC = rz;
    } else {
      /* --- Cây lau nhà: cán nối từ hai bàn tay xuống sàn, đầu lau nằm phẳng --- */
      const rz = rzFor(0.03),
        h = hand(rz),
        yt = -by + 0.03 /* tâm đầu lau sát sàn */,
        dz = 0.3 /* đầu lau nằm trước tay 30 cm */,
        dy = h.y - yt,
        Ls = Math.hypot(dy, dz),
        al = Math.atan2(dz, dy),
        piv = new THREE.Group();
      piv.position.set(0, h.y, h.z);
      piv.rotation.x = -al;
      piv.visible = false;
      c.b.add(piv);
      put(
        piv,
        new THREE.CylinderGeometry(0.013, 0.013, Ls, 8),
        0xb08a5a,
        0,
        -Ls / 2,
        0,
        0.6,
      ); /* cán */
      const hd = new THREE.Group();
      hd.position.y = -Ls;
      hd.rotation.x = al; /* bù góc để đầu lau nằm ngang */
      piv.add(hd);
      put(
        hd,
        new THREE.BoxGeometry(0.3, 0.015, 0.1),
        0x6f737b,
        0,
        0.03,
        0,
        0.5,
      ); /* khung kẹp */
      for (let i = 0; i < 7; i++ /* các sợi bông */)
        put(
          hd,
          new THREE.BoxGeometry(0.044, 0.045, 0.13),
          i % 2 ? 0xf4efe0 : 0xe2dcc8,
          -0.15 + i * 0.05,
          0,
          0,
          0.95,
        );
      c.pr.mop = [piv];
      c.pr.piv = piv;
      c.pr.hy = h.y;
      c.pr.rzM = rz;
    }
  }

  /* ---------- Tư thế: lớp phủ lên pose() gốc, có làm mượt ---------- */

  /* góc đích của từng kiểu hành động (chỉ khai báo những khớp cần đổi) */
  function targetsFor(kind, c, walking, t) {
    const P = c.pr;
    if (kind === "mop") {
      const s = Math.sin(t * 3.4),
        push = Math.sin(t * 6.8) * 0.05;
      const T = {
        ar: -0.8 + push,
        al: -0.8 + push,
        arz: -P.rzM + 0.09 * s /* hai tay cùng đưa qua lại */,
        alz: P.rzM + 0.09 * s,
        lean: 0 /* không cúi để đầu lau không lún sàn */,
        hx: 0.25,
      };
      if (walking) {
        const w = Math.sin(t * 4.6) * 0.42; /* bước chậm theo tốc độ lau */
        T.ll = w;
        T.lr = -w;
      }
      return T;
    }
    const still = !walking; /* đang đứng thì mới ghi chép + nhìn kệ */
    return {
      al: -0.8 /* tay giữ sổ */,
      ar: -0.8 + (still ? 0.06 * Math.sin(t * 10) : 0) /* tay cầm bút */,
      alz: P.rzC,
      arz: -P.rzC + (still ? 0.04 * Math.sin(t * 7.3) : 0),
      lean: 0.05,
      hx: 0.3,
      hy: still ? 0.8 * Math.sin(t * 0.8) : 0 /* quay đầu nhìn dọc kệ */,
    };
  }

  /* áp lớp phủ: ov = mức hoà trộn 0..1, ox = góc đã làm mượt */
  function overlay(c, kind, walking, dt, t) {
    const P = c.pr;
    if (!P) return;
    c.ov =
      (c.ov || 0) + ((kind ? 1 : 0) - (c.ov || 0)) * (1 - Math.exp(-dt * 9));
    if (kind) c.lk = kind;
    const cur = {
      ar: c.aR.rotation.x,
      al: c.aL.rotation.x,
      arz: c.aR.rotation.z,
      alz: c.aL.rotation.z,
      lean: c.b.rotation.x,
      hx: c.head.rotation.x,
      hy: c.head.rotation.y,
      ll: c.lL.rotation.x,
      lr: c.lR.rotation.x,
    };
    if (!c.ox || (!kind && c.ov < 0.002))
      c.ox = { ...cur }; /* nghỉ: bám theo pose gốc */
    if (kind) {
      const T = targetsFor(kind, c, walking, t),
        k = 1 - Math.exp(-dt * 10);
      for (const n in cur)
        c.ox[n] += ((T[n] !== undefined ? T[n] : cur[n]) - c.ox[n]) * k;
    }
    c.aR.rotation.x = cur.ar + (c.ox.ar - cur.ar) * c.ov;
    c.aL.rotation.x = cur.al + (c.ox.al - cur.al) * c.ov;
    c.aR.rotation.z = cur.arz + (c.ox.arz - cur.arz) * c.ov;
    c.aL.rotation.z = cur.alz + (c.ox.alz - cur.alz) * c.ov;
    c.b.rotation.x = cur.lean + (c.ox.lean - cur.lean) * c.ov;
    c.head.rotation.x = cur.hx + (c.ox.hx - cur.hx) * c.ov;
    c.head.rotation.y = cur.hy + (c.ox.hy - cur.hy) * c.ov;
    c.lL.rotation.x = cur.ll + (c.ox.ll - cur.ll) * c.ov;
    c.lR.rotation.x = cur.lr + (c.ox.lr - cur.lr) * c.ov;
    /* hiện đạo cụ theo hành động gần nhất; ẩn khi đã thả xong */
    const show = c.ov > 0.02;
    (P.mop || []).forEach((o) => (o.visible = show && c.lk === "mop"));
    (P.check || []).forEach((o) => (o.visible = show && c.lk === "check"));
    if (P.piv) {
      P.piv.rotation.z =
        0.2 * Math.sin(t * 3.4) * c.ov; /* quét cây lau qua lại */
      P.piv.position.y =
        P.hy -
        (c.b.position.y - c.by); /* bù nhịp nhún để đầu lau luôn sát sàn */
    }
  }

  /* ---------- Bọc các hàm gốc ---------- */

  /* makeChar: thêm đạo cụ theo chức vụ (NPC, sân khấu, xem trước đều dùng) */
  const _mk5 = makeChar;
  makeChar = function (s) {
    const c = _mk5(s);
    addProps(c, s);
    return c;
  };

  /* pose: chạy pose gốc rồi phủ hành động mới; chức vụ không hợp thì bỏ qua (staff không "check", quản lý không "mop") */
  const _pose5 = pose;
  pose = function (c, dt, t) {
    _pose5(c, dt, t);
    const m = c.mode;
    let kind =
      m === "mop" || m === "check" ? m : m === "walk" ? c.job || null : null;
    if (kind && !(c.pr && c.pr[kind])) kind = null;
    overlay(c, kind, m === "walk", dt, t);
  };

  /* goal: nhân viên đi tuần → đích là điểm trên lộ trình lau; quản lý dừng ở mỗi điểm thì "check" */
  const _goal5 = goal;
  goal = function (n) {
    const job = jobOf(n);
    if (job === "mop") {
      const q = mopPoint(n);
      return { x: q[0], z: q[1], act: "mop" };
    }
    const g = _goal5(n);
    if (job === "check" && g.act === "idle") g.act = "check";
    return g;
  };

  /* lộ trình lau của một nhân viên: dùng points riêng nếu có, không thì lộ trình mặc định */
  const mopRoute = (n) => {
    const r = n.s.routine || {};
    return r.points && r.points.length > 1 ? r.points : CFG.mopRoute;
  };

  /* điểm lau hiện tại (đi tới rồi đi lùi lại để không cắt chéo qua kệ) */
  function mopPoint(n) {
    const R = mopRoute(n),
      N = R.length,
      per = 2 * (N - 1);
    if (n.mi === undefined) {
      /* bắt đầu từ điểm gần nhất để không đi xuyên kệ */
      let best = 0,
        bd = 1e9;
      R.forEach((p, i) => {
        const d = Math.hypot(p[0] - n.g.position.x, p[1] - n.g.position.z);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      n.mi = best;
    }
    const m = n.mi % per;
    return R[m < N ? m : per - m];
  }

  /* stepNpc: lau thì đi chậm và tự sang điểm kế; quản lý đứng ghi chép lâu hơn ở mỗi điểm */
  const _step5 = stepNpc;
  stepNpc = function (n, dt, t) {
    const job = jobOf(n),
      p = n.g.position,
      x0 = p.x,
      z0 = p.z;
    n.job = job;
    _step5(n, dt, t);
    if (job === "mop") {
      p.x = x0 + (p.x - x0) * CFG.mopSpeed;
      p.z = z0 + (p.z - z0) * CFG.mopSpeed;
      n.wait = 0; /* không dừng chờ như tuần tra */
      const g = goal(n);
      if (Math.hypot(g.x - p.x, g.z - p.z) < 0.12) n.mi++;
    } else if (job === "check" && n.mode === "check") {
      n.wait = Math.max(
        0,
        n.wait - dt * 0.5,
      ); /* kéo dài thời gian đứng ghi chép gấp đôi */
    }
  };

  /* ---------- Giao diện: nút hành động theo chức vụ ---------- */

  /* vẽ lại hàng nút hành động ở sân khấu: 5 nút cũ + nút riêng của chức vụ */
  function refreshActs() {
    const s = cur && StaffRegistry.get(cur.code);
    if (!s) return;
    const list = ACTS.concat([roleAct(s.role)]);
    if (!list.some((a) => a[1] === act)) {
      act = "idle";
      cur.mode = "idle";
    }
    $("#acts").innerHTML = list
      .map(
        (a) =>
          `<button class="${a[1] === act ? "on" : ""}" data-a="${a[1]}">${a[0]}</button>`,
      )
      .join("");
  }
  const _sc5 = showChar;
  showChar = function (c) {
    _sc5(c);
    refreshActs();
  };

  /* vẽ lại nút trong hộp xem trước hồ sơ: Đứng / Đi bộ / Vẫy tay + nút riêng theo chức vụ đang chọn */
  function refreshPvb() {
    if (!draft) return;
    const ra = roleAct(draft.role),
      key = ra[1] + "|" + pvMode,
      el = $("#pvb");
    if (pvMode === "mop" || pvMode === "check")
      if (pvMode !== ra[1]) pvMode = "idle";
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    el.innerHTML = [
      ["Đứng", "idle"],
      ["Đi bộ", "walk"],
      ["Vẫy tay", "wave"],
      ra,
    ]
      .map(
        (a) =>
          `<button class="${a[1] === pvMode ? "on" : ""}" data-a="${a[1]}">${a[0]}</button>`,
      )
      .join("");
  }
  const _rb5 = rebuildPv;
  rebuildPv = function () {
    refreshPvb();
    _rb5();
  };

  /* CSS: 6 nút hành động → lưới 3 cột trên điện thoại cho khỏi chật */
  const css = document.createElement("style");
  css.textContent =
    "/* PATCH v5: hàng nút hành động nhiều hơn 5 nút */" +
    "@media (max-width:720px){#acts{grid-template-columns:repeat(3,1fr)}}";
  document.head.appendChild(css);

  /* ---------- Dựng lại NPC và nhân vật đang hiển thị để có đạo cụ ---------- */

  /* dựng lại toàn bộ NPC trong cửa hàng, giữ nguyên vị trí / hướng / tiến độ tuần tra */
  function rebuildNpcs() {
    const old = npcs.splice(0),
      keep = old.map((o) => ({
        code: o.s.code,
        p: o.g.position.clone(),
        r: o.g.rotation.y,
        i: o.i,
        wait: o.wait,
      }));
    old.forEach((o) => {
      scene.remove(o.g);
      disposeChar(o);
    });
    keep.forEach((q) => {
      const s = StaffRegistry.get(q.code);
      if (!s) return;
      const n = addNpc(s);
      n.g.position.copy(q.p);
      n.g.rotation.y = q.r;
      n.i = q.i;
      n.wait = q.wait;
    });
  }
  rebuildNpcs();
  if (typeof cur !== "undefined" && cur) showChar(cur.code);
})();


/* ============ PATCH v6: nhân viên lấy hàng ở kho rồi fill kệ (IIFE) ============
   Chu trình của nhân viên được giao việc này (lặp mãi):
     1) đi vào KHO, cúi xuống lấy hàng
     2) chọn ngẫu nhiên một quầy trong cửa hàng; loại hàng theo quầy:
          quầy rau → RAU CỦ · tủ thịt/hải sản → THỊT · tủ mát/đông/sữa chua → SỮA · kệ khô/gạo/nước → ĐỒ KHÔ
        (quầy hàng khô / gạo / nước có khả năng cao là KÉO XE NÂNG TAY chở nguyên PALLET thay vì bê thùng)
     3) đi theo lối đi trống tới quầy, đứng trước quầy fill hàng
     4) quay về kho lấy chuyến tiếp theo
   CÁCH DÙNG: dán toàn bộ khối này xuống CUỐI script.js, SAU PATCH v5.
   Không sửa logic cũ: chỉ bọc makeChar / pose / goal / stepNpc / showChar / rebuildPv. */
(() => {
  /* ---------- Cấu hình ---------- */
  const CFG = {
    /* nhân viên (không phải quản lý) được giao việc lấy hàng + fill; cũng có thể đặt routine {type:"restock"} */
    restockStaff: ["EMP_0004"],
    palletChance: 0.45 /* xác suất kéo pallet khi quầy là loại hàng khối lượng lớn */,
    fillSecBox: 4.5 /* giây fill một thùng */,
    fillSecPallet: 6.5 /* giây dỡ một pallet */,
    speedBox: 0.85 /* tốc độ khi bê thùng (1 = đi bình thường) */,
    speedPallet: 0.65 /* tốc độ khi kéo pallet */,
    margin: 0.5 /* khoảng cách tránh kệ khi tìm đường (m) */,
  };

  /* quầy nào thì loại hàng nào */
  const KIND_OF = {
    produce: "veg",
    produce3: "veg",
    chiller: "meat",
    meat: "meat",
    seafood: "meat",
    cold: "milk",
    dairy: "milk",
    ufreezer: "milk",
    freezer: "milk",
    icecream: "milk",
    shelf: "dry",
    noodle: "dry",
    snack: "dry",
    sauce: "dry",
    household: "dry",
    bakeshelf: "dry",
    candy: "dry",
    rice: "dry",
    display: "dry",
    drinks: "dry",
    eggs: "dry",
    bakery: "dry",
  };
  /* các quầy hay được chở bằng pallet */
  const BULK = { shelf: 1, rice: 1, drinks: 1, display: 1, noodle: 1, snack: 1, sauce: 1, household: 1, bakeshelf: 1 };
  const KINDS = ["veg", "meat", "dry", "milk"];

  /* điểm quan trọng quanh cửa kho (tính từ kích thước cửa hàng) */
  const KHO = (() => {
    const cx = (STORE.kho[0] + STORE.kho[1]) / 2,
      zb = -STORE.D / 2;
    return {
      inn: [cx, zb + 1.0] /* ngay trong cửa hàng, trước cửa kho */,
      door: [cx, zb - 0.8] /* vừa qua cửa, trong kho */,
      pick: [cx - 3.1, zb - 2.0] /* chỗ đứng lấy hàng */,
      face: [cx - 4.3, zb - 2.0] /* hướng nhìn vào chồng thùng trong kho */,
    };
  })();

  /* ---------- Tiện ích vai trò ---------- */

  /* quản lý / cửa hàng phó (chức vụ "gray") không làm việc này */
  const isGray = (role) => (ROLES[role] || ROLES.staff)[1] === "gray";

  /* nhân viên nào đang được giao việc lấy hàng + fill */
  const restockOf = (n) => {
    const s = n.s,
      r = s.routine || {};
    return !isGray(s.role) && (CFG.restockStaff.includes(s.code) || r.type === "restock");
  };

  /* ---------- Tìm đường: đồ thị các điểm trên lối đi, tránh mọi quầy ---------- */

  /* đoạn thẳng a→b có cắt hình chữ nhật o không (phương pháp slab) */
  function segBox(a, b, o) {
    let t0 = 0,
      t1 = 1;
    const ax = [
      [a[0], b[0] - a[0], o.x0, o.x1],
      [a[1], b[1] - a[1], o.z0, o.z1],
    ];
    for (const [p, d, lo, hi] of ax) {
      if (Math.abs(d) < 1e-9) {
        if (p < lo || p > hi) return false;
      } else {
        let u = (lo - p) / d,
          v = (hi - p) / d;
        if (u > v) [u, v] = [v, u];
        t0 = Math.max(t0, u);
        t1 = Math.min(t1, v);
        if (t0 > t1) return false;
      }
    }
    return true;
  }

  /* các nút lưới đặt dọc các lối đi chính */
  function gridNodes() {
    const xs = [-5.6, -3.4, -1.7, 0, 1.7, 3.4, KHO.inn[0]],
      zs = [11.4, 4, -3.2, -5, -12],
      out = [];
    xs.forEach((x) => zs.forEach((z) => out.push([x, z])));
    return out;
  }

  /* đường đi ngắn nhất from→to (mảng điểm, không gồm from); không tìm được thì đi thẳng */
  function route(from, to) {
    const m = CFG.margin,
      ob = ShelfRegistry.all().map((it) => {
        const q = bounds(it);
        return { x0: q.x - q.hx - m, x1: q.x + q.hx + m, z0: q.z - q.hz - m, z1: q.z + q.hz + m };
      }),
      inb = (p, o) => p[0] > o.x0 && p[0] < o.x1 && p[1] > o.z0 && p[1] < o.z1,
      /* bỏ qua kệ mà điểm đầu/cuối đang nằm trong vùng đệm (để còn bước ra được) */
      clear = (a, b) => !ob.some((o) => !inb(a, o) && !inb(b, o) && segBox(a, b, o));
    if (clear(from, to)) return [to];
    const nodes = [from, to];
    gridNodes().forEach((q) => {
      if (!ob.some((o) => inb(q, o))) nodes.push(q);
    });
    const N = nodes.length,
      dist = Array(N).fill(1e9),
      prev = Array(N).fill(-1),
      done = Array(N).fill(false);
    dist[0] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < N; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] >= 1e9) break;
      done[u] = true;
      if (u === 1) break;
      for (let v = 0; v < N; v++) {
        if (done[v]) continue;
        const d = dist[u] + Math.hypot(nodes[u][0] - nodes[v][0], nodes[u][1] - nodes[v][1]);
        if (d < dist[v] && clear(nodes[u], nodes[v])) {
          dist[v] = d;
          prev[v] = u;
        }
      }
    }
    if (prev[1] < 0) return [to];
    const out = [];
    for (let i = 1; i !== 0; i = prev[i]) out.unshift(nodes[i]);
    return out;
  }

  /* đường từ vị trí hiện tại vào kho: ra cửa → trong kho → chỗ lấy hàng */
  const pathToKho = (pos) => [...route(pos, KHO.inn), KHO.door, KHO.pick];

  /* ---------- Chọn chuyến hàng ngẫu nhiên ---------- */

  /* chọn quầy cần fill (khác quầy vừa fill), loại hàng theo quầy, và bê thùng hay kéo pallet */
  function pickJob(rs) {
    let its = ShelfRegistry.all().filter((it) => KIND_OF[it.type]);
    if (its.length > 1 && rs.last) its = its.filter((it) => it.code !== rs.last);
    if (!its.length) {
      rs.tg = null;
      return;
    }
    const it = its[Math.floor(Math.random() * its.length)],
      side = it.sides === 2 && Math.random() < 0.5 ? -1 : 1 /* quầy 2 mặt: chọn mặt ngẫu nhiên */,
      lx = side * (it.size[0] / 2 + 0.75),
      c = Math.cos(it.rot),
      s = Math.sin(it.rot),
      hw = STORE.W / 2 - 0.4,
      hd = STORE.D / 2 - 0.4;
    rs.last = it.code;
    rs.kind = KIND_OF[it.type];
    rs.style = BULK[it.type] && Math.random() < CFG.palletChance ? "pallet" : "box";
    rs.tg = {
      it,
      stand: [
        THREE.MathUtils.clamp(it.pos[0] + lx * c, -hw, hw),
        THREE.MathUtils.clamp(it.pos[1] - lx * s, -hd, hd),
      ],
      face: it.pos,
    };
  }

  /* ---------- Máy trạng thái của NPC: init → toKho → load → toShelf → fill → toKho … ---------- */

  /* chạy một nhịp: chuyển điểm, đổi pha, bật/tắt thùng và pallet */
  function advance(n, dt) {
    const rs = n.rs,
      p = n.g.position,
      pos = [p.x, p.z];
    switch (rs.phase) {
      case "init":
        rs.path = pathToKho(pos);
        rs.pi = 0;
        rs.phase = "toKho";
        break;
      case "toKho":
      case "toShelf": {
        const last = rs.pi === rs.path.length - 1,
          w = rs.path[rs.pi];
        if (Math.hypot(w[0] - p.x, w[1] - p.z) < (last ? 0.1 : 0.25)) {
          if (!last) rs.pi++;
          else if (rs.phase === "toKho") {
            rs.phase = "load";
            rs.t = 0;
            pickJob(rs); /* chọn trước chuyến kế tiếp */
          } else {
            rs.phase = "fill";
            rs.t = 0;
            rs.fp = 0;
            if (rs.style === "pallet") rs.carry = true; /* lấy từng thùng nhỏ từ pallet */
          }
        }
        break;
      }
      case "load": {
        rs.t += dt;
        if (!rs.tg) {
          /* chưa có quầy nào cần fill: đợi rồi thử lại */
          if (rs.t > 2.5) {
            rs.t = 0;
            pickJob(rs);
          }
          break;
        }
        if (rs.t > 0.6) {
          if (rs.style === "pallet") {
            if (!rs.pallet) {
              rs.pallet = true;
              rs.prog = 0; /* pallet mới đầy hàng */
            }
          } else rs.pallet = false; /* bỏ pallet cũ lại kho */
        }
        if (rs.t > 0.8 && rs.style === "box") rs.carry = true; /* nhấc thùng lên */
        if (rs.t > 1.9) {
          rs.path = route(pos, rs.tg.stand);
          rs.pi = 0;
          rs.phase = "toShelf";
        }
        break;
      }
      case "fill": {
        rs.t += dt;
        const dur = rs.style === "pallet" ? CFG.fillSecPallet : CFG.fillSecBox;
        rs.fp = Math.min(1, rs.t / dur);
        if (rs.style === "pallet") rs.prog = rs.fp;
        if (rs.t >= dur) {
          rs.carry = false;
          if (rs.style !== "pallet") rs.pallet = false;
          rs.path = pathToKho(pos);
          rs.pi = 0;
          rs.phase = "toKho";
        }
        break;
      }
    }
  }

  /* ---------- Bọc goal / stepNpc ---------- */

  /* goal: NPC đang làm việc này thì đích là điểm hiện tại trên đường đi của nó */
  const _goal6 = goal;
  goal = function (n) {
    if (!n.rj || !n.rs) return _goal6(n);
    const rs = n.rs,
      p = n.g.position;
    if (rs.phase === "toKho" || rs.phase === "toShelf") {
      const last = rs.pi === rs.path.length - 1,
        w = rs.path[rs.pi],
        toK = rs.phase === "toKho";
      return {
        x: w[0],
        z: w[1],
        act: last ? (toK ? "load" : "fill") : "walk",
        face: last ? (toK ? KHO.face : rs.tg.face) : undefined,
      };
    }
    if (rs.phase === "load") return { x: KHO.pick[0], z: KHO.pick[1], act: "load", face: KHO.face };
    if (rs.phase === "fill") return { x: rs.tg.stand[0], z: rs.tg.stand[1], act: "fill", face: rs.tg.face };
    return { x: p.x, z: p.z, act: "idle" };
  };

  /* stepNpc: chạy bước gốc, giảm tốc khi bê/kéo hàng, rồi chạy máy trạng thái */
  const _step6 = stepNpc;
  stepNpc = function (n, dt, t) {
    n.rj = restockOf(n);
    if (!n.rj) {
      n.rs = null;
      return _step6(n, dt, t);
    }
    if (!n.rs) n.rs = { phase: "init", t: 0, pallet: false, carry: false, prog: 0, fp: 0 };
    const p = n.g.position,
      x0 = p.x,
      z0 = p.z;
    _step6(n, dt, t);
    const rs = n.rs,
      f = rs.pallet && rs.style === "pallet" ? CFG.speedPallet : rs.carry ? CFG.speedBox : 1;
    if (f < 1) {
      p.x = x0 + (p.x - x0) * f;
      p.z = z0 + (p.z - z0) * f;
    }
    advance(n, dt);
  };

  /* ---------- Đạo cụ: thùng hàng, xe nâng tay + pallet ---------- */

  /* thêm mesh vào parent (cast=false cho vật nhỏ để đỡ tốn bóng đổ) */
  const put = (parent, geo, color, x, y, z, rough = 0.75, cast = true) => {
    const m = new THREE.Mesh(geo, M(color, rough));
    m.position.set(x, y, z);
    m.castShadow = cast;
    parent.add(m);
    return m;
  };
  const BOX = (x, y, z) => new THREE.BoxGeometry(x, y, z);

  /* ống nối hai điểm (dùng cho cán xe nâng) */
  function link(parent, p1, p2, r, color) {
    const a = new THREE.Vector3(...p1),
      d = new THREE.Vector3(...p2).sub(a),
      m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), M(color, 0.5));
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  /* một thùng hàng: gốc nhóm nằm ở đáy thùng; items = các món bên trong (ẩn dần khi fill) */
  function mkCrate(kind, parent) {
    const g = new THREE.Group(),
      W = 0.36,
      D = 0.28,
      T = 0.02,
      S = {
        veg: { wall: 0xd2b48c, base: 0xc9a678, h: 0.15 } /* sọt gỗ */,
        meat: { wall: 0xf4f4f0, base: 0xe9e9e4, h: 0.17 } /* thùng xốp */,
        dry: { wall: 0xc9a678, base: 0xb8956a, h: 0.13 } /* thùng carton */,
        milk: { wall: 0x1e88e5, base: 0x1565c0, h: 0.15 } /* két nhựa */,
      }[kind],
      items = [];
    g.visible = false;
    parent.add(g);
    put(g, BOX(W, T, D), S.base, 0, T / 2, 0);
    [-1, 1].forEach((s) => {
      put(g, BOX(T, S.h, D), S.wall, (s * (W - T)) / 2, S.h / 2, 0);
      put(g, BOX(W, S.h, T), S.wall, 0, S.h / 2, (s * (D - T)) / 2);
    });
    if (kind === "veg") {
      const col = [0x5cb85c, 0xff8a3d, 0xe53935, 0x7cb342, 0xff8a3d, 0x5cb85c];
      for (let i = 0; i < 6; i++)
        items.push(put(g, new THREE.SphereGeometry(0.06, 8, 6), col[i], (i % 3 - 1) * 0.105, 0.1, (i < 3 ? -1 : 1) * 0.06, 0.8, false));
    } else if (kind === "meat") {
      const col = [0xe58a86, 0xf19a94, 0xc62828, 0xe58a86];
      for (let i = 0; i < 4; i++) items.push(put(g, BOX(0.3, 0.03, 0.2), col[i], 0, 0.035 + i * 0.038, 0, 0.6, false));
    } else if (kind === "dry") {
      const col = [0xf9a825, 0xe53935, 0x43a047, 0x1e88e5, 0xfdd835, 0xef6c00];
      for (let i = 0; i < 6; i++) items.push(put(g, BOX(0.1, 0.17, 0.07), col[i], (i % 3 - 1) * 0.11, 0.1, (i < 3 ? -1 : 1) * 0.07, 0.7, false));
    } else {
      for (let i = 0; i < 6; i++)
        items.push(put(g, BOX(0.075, 0.19, 0.075), i % 2 ? 0x81d4fa : 0xffffff, (i % 3 - 1) * 0.11, 0.11, (i < 3 ? -1 : 1) * 0.07, 0.5, false));
    }
    return { grp: g, items };
  }

  /* xe nâng tay + pallet 12 thùng carton, nằm phía SAU nhân vật (gốc toạ độ = gốc nhân vật); tay cầm khớp với tay phải */
  function mkPallet(c, hand) {
    const g = new THREE.Group(),
      cartons = [],
      col = [0xc9a678, 0xd9b98a, 0xb8956a];
    g.visible = false;
    c.g.add(g);
    put(g, BOX(0.24, 0.2, 0.3), 0xc62828, 0, 0.19, -0.95, 0.5) /* thân xe */;
    [-1, 1].forEach((s) => {
      put(g, BOX(0.1, 0.06, 1.2), 0x8d9199, s * 0.2, 0.05, -1.55, 0.5, false) /* càng nâng */;
      put(g, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 10), 0x2a2a2e, s * 0.2, 0.035, -2.1, 0.6, false).rotation.z = PI / 2;
      put(g, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 10), 0x2a2a2e, s * 0.1, 0.04, -0.95, 0.6, false).rotation.z = PI / 2;
    });
    put(g, BOX(0.8, 0.03, 1.1), 0xcfa979, 0, 0.15, -1.6) /* mặt pallet */;
    [-0.35, 0, 0.35].forEach((x) => put(g, BOX(0.1, 0.07, 1.1), 0xb08a5a, x, 0.1, -1.6, 0.8, false));
    for (let L = 0; L < 3; L++)
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++)
          cartons.push(put(g, BOX(0.37, 0.25, 0.49), col[(L + i + j) % 3], (i - 0.5) * 0.38, 0.165 + 0.13 + L * 0.26, -1.6 + (j - 0.5) * 0.5, 0.85));
    link(g, [0, 0.3, -0.95], hand, 0.014, 0x55595f) /* cán xe */;
    put(g, new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), 0x222226, hand[0], hand[1], hand[2], 0.5, false).rotation.z = PI / 2 /* tay nắm */;
    return { grp: g, cartons };
  }

  /* dựng đạo cụ lần đầu cần dùng (NPC chưa làm việc này thì không tốn gì) */
  function build(c) {
    const P = c.pr,
      v = { crates: {}, pal: null };
    KINDS.forEach((k) => (v.crates[k] = mkCrate(k, c.b)));
    v.pal = mkPallet(c, [P.ax, P.by + 0.52 - P.L * Math.cos(0.5), -P.L * Math.sin(0.5)]);
    P.b6 = v;
  }

  /* ---------- Tư thế ---------- */

  /* hành động hiện tại của nhân vật (NPC: theo pha; xem trước: theo nút bấm); null = không có */
  function spec(c, t) {
    const r = c.rs;
    if (c.rj && r) {
      const base = { style: r.style, kind: r.style === "pallet" ? "dry" : r.kind, carry: r.carry, pallet: r.pallet, prog: r.prog || 0, fp: 0 };
      if (r.phase === "load") return { ph: "load", ...base };
      if (r.phase === "toShelf") return { ph: "carry", ...base };
      if (r.phase === "fill") return { ph: "fill", ...base, fp: r.fp };
      if (r.phase === "toKho" && r.pallet) return { ph: "carry", ...base, carry: false }; /* kéo pallet rỗng về kho */
      return null;
    }
    if (c.mode === "box")
      return { ph: "fill", style: "box", kind: c.rk || "veg", carry: true, pallet: false, prog: 0, fp: (t % 5) / 5 };
    if (c.mode === "pallet")
      return { ph: "carry", style: "pallet", kind: "dry", carry: false, pallet: true, prog: 0, fp: 0, inPlace: true };
    return null;
  }

  /* góc đích của từng khớp theo hành động (khớp không nhắc tới sẽ giữ theo pose gốc) */
  function targets(sp, c, t) {
    const P = c.pr,
      T = {};
    if (sp.ph === "load") {
      /* cúi gập người nhặt hàng, chân giữ thẳng */
      Object.assign(T, { lean: 0.45, ar: -0.7, al: -0.7, arz: -P.rzH, alz: P.rzH, hx: 0.3, ll: -0.45, lr: -0.45 });
    } else if (sp.ph === "fill") {
      /* đưa thùng lên xuống như đang xếp hàng vào kệ */
      const q = 0.25 * Math.sin(t * 2.2);
      Object.assign(T, { lean: 0.12, ar: -0.95 + q, al: -0.95 + q, arz: -P.rzH, alz: P.rzH, hx: 0.22, ll: -0.12, lr: -0.12 });
    } else if (sp.style === "pallet") {
      /* tay phải ra sau nắm cán xe nâng, ngả người nhẹ khi kéo */
      Object.assign(T, { ar: 0.5, arz: 0, lean: -0.04, hx: 0 });
    } else {
      /* bê thùng bằng hai tay trước bụng */
      Object.assign(T, { lean: 0.04, ar: -0.95, al: -0.95, arz: -P.rzH, alz: P.rzH, hx: 0.12 });
    }
    if (sp.inPlace) {
      /* xem trước: bước tại chỗ để thấy dáng kéo */
      const w = Math.sin(t * 5) * 0.45;
      T.ll = w;
      T.lr = -w;
      T.al = -w * 0.6;
    }
    return T;
  }

  /* áp hành động lên nhân vật: hoà trộn mượt, đặt thùng vào tay, bật/tắt pallet, ẩn dần hàng đã fill */
  function overlay(c, sp, dt, t) {
    const P = c.pr;
    if (!P || !P.mk6) return; /* quản lý không có đạo cụ này */
    if (!P.b6) {
      if (!sp) return;
      build(c);
    }
    c.ov6 = (c.ov6 || 0) + ((sp ? 1 : 0) - (c.ov6 || 0)) * (1 - Math.exp(-dt * 9));
    if (sp) c.sp6 = sp;
    const cur = {
      ar: c.aR.rotation.x,
      al: c.aL.rotation.x,
      arz: c.aR.rotation.z,
      alz: c.aL.rotation.z,
      lean: c.b.rotation.x,
      hx: c.head.rotation.x,
      ll: c.lL.rotation.x,
      lr: c.lR.rotation.x,
    };
    if (!c.ox6 || (!sp && c.ov6 < 0.002)) c.ox6 = { ...cur }; /* nghỉ: bám theo pose gốc */
    if (sp) {
      const T = targets(sp, c, t),
        k = 1 - Math.exp(-dt * 10);
      for (const n in cur) c.ox6[n] += ((T[n] !== undefined ? T[n] : cur[n]) - c.ox6[n]) * k;
    }
    const o = c.ox6,
      w = c.ov6,
      mix = (n) => cur[n] + (o[n] - cur[n]) * w;
    c.aR.rotation.x = mix("ar");
    c.aL.rotation.x = mix("al");
    c.aR.rotation.z = mix("arz");
    c.aL.rotation.z = mix("alz");
    c.b.rotation.x = mix("lean");
    c.head.rotation.x = mix("hx");
    c.lL.rotation.x = mix("ll");
    c.lR.rotation.x = mix("lr");
    /* hiện đạo cụ theo hành động gần nhất; ẩn khi đã thả xong */
    const S = c.sp6,
      show = w > 0.02 && !!S,
      v = P.b6,
      q = -c.aR.rotation.x /* góc đưa tay ra trước → vị trí bàn tay */,
      hy = 0.52 - P.L * Math.cos(P.rzH) * Math.cos(q),
      hz = P.L * Math.cos(P.rzH) * Math.sin(q);
    KINDS.forEach((k) => {
      const cr = v.crates[k],
        on = show && S.carry && S.kind === k;
      cr.grp.visible = on;
      if (!on) return;
      const vis = S.ph === "fill" && S.style === "box" ? Math.ceil(cr.items.length * (1 - S.fp)) : cr.items.length;
      cr.items.forEach((m, i) => (m.visible = i < vis)); /* hàng vơi dần khi fill */
      cr.grp.position.set(0, hy - 0.1, hz);
    });
    v.pal.grp.visible = show && S.pallet;
    if (v.pal.grp.visible) {
      const vis = Math.round(v.pal.cartons.length * (1 - S.prog));
      v.pal.cartons.forEach((m, i) => (m.visible = i < vis)); /* dỡ từ trên xuống */
    }
  }

  /* ---------- Bọc makeChar / pose ---------- */

  /* makeChar: nhân viên thường được gắn thông số tay/vai để dựng đạo cụ khi cần */
  const _mk6 = makeChar;
  makeChar = function (s) {
    const c = _mk6(s);
    if (!isGray(s.role)) {
      const k = { ...LOOK0, ...s.look },
        W = 0.8 + k.build * 0.6,
        L = 0.55 * k.armRatio + 0.01,
        ax = 0.2 * W + 0.05;
      Object.assign(c.pr, {
        mk6: true,
        L,
        ax,
        /* góc khép tay để hai bàn tay nằm sát hai bên thùng (cách tâm 0.2 m) */
        rzH: Math.asin(THREE.MathUtils.clamp((ax - 0.2) / L, 0, 0.95)),
      });
    }
    return c;
  };

  /* pose: chạy pose gốc (gồm các lớp v5) rồi phủ hành động lấy hàng / fill */
  const _pose6 = pose;
  pose = function (c, dt, t) {
    _pose6(c, dt, t);
    if (c.mode === "box" && c.pm !== "box") c.rk = KINDS[Math.floor(Math.random() * KINDS.length)]; /* mỗi lần bấm: loại hàng ngẫu nhiên */
    c.pm = c.mode;
    overlay(c, spec(c, t), dt, t);
  };

  /* ---------- Giao diện: nút hành động theo chức vụ ---------- */

  /* các hành động riêng của chức vụ: [nhãn, mode] */
  const roleActs = (role) =>
    isGray(role)
      ? [["Kiểm kho", "check"]]
      : [
          ["Lau nhà", "mop"],
          ["Fill hàng", "box"],
          ["Kéo pallet", "pallet"],
        ];

  /* vẽ lại hàng nút ở sân khấu: 5 nút cũ + các nút riêng của chức vụ */
  function refreshActs() {
    const s = cur && StaffRegistry.get(cur.code);
    if (!s) return;
    const list = ACTS.concat(roleActs(s.role));
    if (!list.some((a) => a[1] === act)) {
      act = "idle";
      cur.mode = "idle";
    }
    $("#acts").innerHTML = list
      .map((a) => `<button class="${a[1] === act ? "on" : ""}" data-a="${a[1]}">${a[0]}</button>`)
      .join("");
  }
  const _sc6 = showChar;
  showChar = function (c) {
    _sc6(c);
    refreshActs();
  };

  /* vẽ lại nút trong hộp xem trước hồ sơ theo chức vụ đang chỉnh */
  function refreshPvb() {
    if (!draft) return;
    const ra = roleActs(draft.role),
      el = $("#pvb"),
      list = [["Đứng", "idle"], ["Đi bộ", "walk"], ["Vẫy tay", "wave"], ...ra],
      key = draft.role + "|" + pvMode;
    if (!list.some((a) => a[1] === pvMode)) pvMode = "idle";
    if (el.dataset.key6 === key && el.children.length === list.length) return;
    el.dataset.key6 = key;
    el.innerHTML = list
      .map((a) => `<button class="${a[1] === pvMode ? "on" : ""}" data-a="${a[1]}">${a[0]}</button>`)
      .join("");
  }
  const _rb6 = rebuildPv;
  rebuildPv = function () {
    _rb6();
    refreshPvb();
    if (pv) pv.mode = pvMode;
  };

  /* CSS: nhiều nút hành động hơn → tự xuống dòng (PC) / lưới 4 cột (điện thoại) */
  const css = document.createElement("style");
  css.textContent =
    "/* PATCH v6: hàng nút hành động nhiều nút */" +
    "#acts{flex-wrap:wrap;justify-content:center;border-radius:22px;max-width:calc(100% - 24px)}" +
    "@media (max-width:720px){#acts{grid-template-columns:repeat(4,1fr)}}";
  document.head.appendChild(css);

  /* ---------- Dựng lại NPC và nhân vật đang hiển thị để có đạo cụ mới ---------- */

  /* dựng lại toàn bộ NPC trong cửa hàng, giữ nguyên vị trí / hướng / tiến độ tuần tra */
  function rebuildNpcs() {
    const old = npcs.splice(0),
      keep = old.map((o) => ({
        code: o.s.code,
        p: o.g.position.clone(),
        r: o.g.rotation.y,
        i: o.i,
        wait: o.wait,
      }));
    old.forEach((o) => {
      scene.remove(o.g);
      disposeChar(o);
    });
    keep.forEach((q) => {
      const s = StaffRegistry.get(q.code);
      if (!s) return;
      const n = addNpc(s);
      n.g.position.copy(q.p);
      n.g.rotation.y = q.r;
      n.i = q.i;
      n.wait = q.wait;
    });
  }
  rebuildNpcs();
  if (typeof cur !== "undefined" && cur) showChar(cur.code);
})();

/* ============ PATCH: sửa thanh tab của modal hồ sơ bị lún lên mép ============ */
(() => {
  const css = document.createElement("style");
  css.textContent = `
#form{padding-top:0!important}
#form .nav2{
  position:sticky;top:0;z-index:6;
  margin:0 0 12px!important;
  padding:12px 2px 8px!important;
  display:flex;justify-content:center;
  background:rgba(248,248,250,.72);
  -webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);
}
#form .nav2 .seg{display:flex;width:100%;max-width:100%;overflow-x:auto;scrollbar-width:none}
#form .nav2 .seg::-webkit-scrollbar{display:none}
#form .nav2 .seg button{flex:1 0 auto;white-space:nowrap;padding:7px 12px}
@media (prefers-color-scheme:dark){
  #form .nav2{background:rgba(44,44,50,.62)}
}`;
  document.head.appendChild(css);
})();


/* ============ PATCH: CHỌN KỆ → NHẤC LÊN + 2 NÚT KÍNH LỎNG (liquid glass), xếp dọc sát kệ ============ */
(() => {
  const LIFT = 0.18, SPRING = 140, DAMP = 15;
  let moveCode = null;
  const isMoving = () => !!moveCode && moveCode === selected && mode === "edit";

  Object.assign(ICONS, {
    dxMove: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
    dxSwap: '<path d="M4 8h13M13.5 4.5L17 8l-3.5 3.5M20 16H7M10.5 12.5L7 16l3.5 3.5"/>',
  });

  /* ---------- CSS: viên thuốc kính dọc ---------- */
  const css = document.createElement("style");
  css.textContent = `
.dx-layer{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden}
.dx-pill{--b:36px;position:absolute;left:0;top:0;display:flex;flex-direction:column;gap:2px;padding:3px;border-radius:999px;
 background:rgba(255,255,255,.26);
 -webkit-backdrop-filter:blur(22px) saturate(190%);backdrop-filter:blur(22px) saturate(190%);
 border:.5px solid rgba(255,255,255,.6);
 box-shadow:0 6px 18px rgba(0,0,0,.14),0 1px 3px rgba(0,0,0,.08),inset 0 1px 0 rgba(255,255,255,.75),inset 0 -1px 0 rgba(255,255,255,.18);
 opacity:0;pointer-events:none;will-change:transform,opacity;transition:opacity .22s ease}
.dx-pill.dx-show{opacity:1;pointer-events:auto}
.dx-b{position:relative;display:grid;place-items:center;width:var(--b);height:var(--b);padding:0;border:0;border-radius:50%;
 background:transparent;color:var(--ink,#1d1d1f);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
 transform:scale(.55);opacity:0;
 transition:transform .42s cubic-bezier(.2,1.5,.4,1),opacity .22s ease,background .18s ease,color .18s ease,box-shadow .18s ease}
.dx-b::after{content:"";position:absolute;inset:-4px}
.dx-pill.dx-show .dx-b{transform:scale(1);opacity:1}
.dx-pill.dx-show .dx-b:nth-child(2){transition-delay:.05s}
.dx-pill.dx-show .dx-b:active{transform:scale(.88);transition-delay:0s}
.dx-b svg{width:18px;height:18px;stroke-width:1.6;color:inherit}
@media (hover:hover){.dx-b:hover{background:rgba(255,255,255,.38)}}
.dx-b.dx-act{background:var(--acc,#0a84ff);color:#fff;box-shadow:0 2px 8px rgba(10,132,255,.45),inset 0 1px 0 rgba(255,255,255,.35)}
@media (max-width:720px){.dx-pill{--b:31px;padding:2px;gap:1px}.dx-b svg{width:16px;height:16px}}
@media (prefers-color-scheme:dark){
 .dx-pill{background:rgba(58,58,66,.34);border-color:rgba(255,255,255,.2);
  box-shadow:0 6px 20px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.22),inset 0 -1px 0 rgba(255,255,255,.04)}
 .dx-b{color:#f5f5f7}
 @media (hover:hover){.dx-b:hover{background:rgba(255,255,255,.14)}}
}`;
  document.head.appendChild(css);

  const layer = document.createElement("div");
  layer.className = "dx-layer";
  $("#store").appendChild(layer);
  const pill = document.createElement("div");
  pill.className = "dx-pill";
  layer.appendChild(pill);
  const mkb = (ic, lb) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dx-b";
    b.title = b.ariaLabel = lb;
    b.innerHTML = IC(ic, 18);
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    pill.appendChild(b);
    return b;
  };
  const elMv = mkb("dxMove", "Di chuyển kệ"),
    elSw = mkb("dxSwap", "Chọn kệ khác");

  elMv.onclick = () => {
    if (mode !== "edit" || !selected) return;
    moveCode = isMoving() ? null : selected;
  };
  elSw.onclick = () => {
    if (mode === "edit" && selected && window.dxOpenPick) window.dxOpenPick();
  };
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") moveCode = null;
  });

  /* ---------- Chặn kéo kệ tự do (giữ nguyên logic cũ) ---------- */
  const _pick = pickItem;
  pickItem = function (e) {
    /* chỉ bắt kéo khi ngón tay / chuột nằm đúng trên kệ đang chọn; chạm chỗ khác → xoay camera như bình thường */
    if (!isMoving()) return null;
    return _pick(e) === selected ? selected : null;
  };
  cv.parentElement.addEventListener(
    "pointerup",
    (e) => {
      if (e.target !== cv || mode !== "edit") return;
      if (!(ptrs.size === 1 && ptrs.has(e.pointerId) && moved < 6 && !panning)) return;
      const c = _pick(e);
      tapC = isMoving() ? (c && c !== selected ? c : selected) : c;
    },
    true,
  );
  const _sel = select;
  select = function (c, f) {
    if (f && c && c === selected && isMoving()) return;
    return _sel.apply(this, arguments);
  };

  /* ---------- Nhấc kệ: lò xo giảm chấn (giữ nguyên) ---------- */
  const sp = {};
  function stepLift(dt) {
    const want = mode === "edit" && tab === "store" ? selected : null;
    if (want && groups[want] && !sp[want]) sp[want] = { v: 0, vel: 0 };
    for (const c in sp) {
      const o = sp[c], g = groups[c];
      if (!g) { delete sp[c]; continue; }
      const tgt = c === want ? LIFT : 0, h = dt / 4;
      for (let i = 0; i < 4; i++) {
        o.vel += (SPRING * (tgt - o.v) - DAMP * o.vel) * h;
        o.v += o.vel * h;
        if (tgt === 0 && o.v < 0) { o.v = 0; o.vel = 0; }
      }
      if (tgt === 0 && o.v < 0.0005 && Math.abs(o.vel) < 0.005) { o.v = 0; delete sp[c]; }
      g.position.y = o.v;
      if (labels[c]) labels[c].position.y = 2.7 + o.v;
    }
  }

  /* ---------- Đặt viên thuốc: sát đầu kệ phía bên phải màn hình ---------- */
  const V = new THREE.Vector3();
  let lastSel = null, showAt = 0, shown = false;
  const setShow = (b) => {
    if (b === shown) return;
    shown = b;
    pill.classList.toggle("dx-show", b);
  };
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  function placeIcons(n) {
    const it = mode === "edit" && selected && !elAModal.classList.contains("on") ? ShelfRegistry.get(selected) : null;
    if (!it || !groups[it.code]) { lastSel = null; setShow(false); return; }
    if (selected !== lastSel) { lastSel = selected; showAt = n + 140; setShow(false); }
    elMv.classList.toggle("dx-act", isMoving());
    const r = cv.getBoundingClientRect(),
      o = layer.getBoundingClientRect(),
      u = [Math.sin(it.rot), Math.cos(it.rot)],
      half = it.size[1] / 2 + 0.15,
      yy = 0.9 + (sp[it.code] ? sp[it.code].v : 0);
    let ok = true;
    const pr = (k) => {
      V.set(it.pos[0] + u[0] * half * k, yy, it.pos[1] + u[1] * half * k).project(camera);
      if (V.z >= 1) ok = false;
      return { x: (V.x * 0.5 + 0.5) * r.width + r.left - o.left, y: (-V.y * 0.5 + 0.5) * r.height + r.top - o.top };
    };
    const a = pr(1), b = pr(-1), p = a.x >= b.x ? a : b; /* đầu kệ nằm bên phải màn hình */
    const W = pill.offsetWidth || 42, H = pill.offsetHeight || 84, MG = 8;
    const x = clampN(p.x + 10, MG, o.width - W - MG),
      y = clampN(p.y - H / 2, MG, o.height - H - MG);
    pill.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    setShow(ok && n >= showAt);
  }

  /* ---------- Móc vào vòng render ---------- */
  const _r = ren.render.bind(ren);
  let t0 = performance.now();
  ren.render = (s, c) => {
    const n = performance.now(), dt = Math.min(0.05, (n - t0) / 1000);
    t0 = n;
    if (moveCode && !isMoving()) moveCode = null;
    stepLift(dt);
    _r(s, c);
    placeIcons(n);
  };
})();

/* ============ PATCH: MODAL CHỌN KỆ KHÁC (3D xoay 360° + danh sách + tìm kiếm) ============ */
(() => {
  ICONS.search = '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>';

  const css = document.createElement("style");
  css.textContent = `
.dxp{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.28);
 -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .25s ease}
.dxp.on{opacity:1;pointer-events:auto}
.dxp-card{position:relative;display:grid;grid-template-columns:1.1fr 1fr;gap:10px;width:min(780px,100%);height:min(520px,86vh);padding:10px;border-radius:28px;
 color:var(--ink,#1d1d1f);background:rgba(248,248,250,.72);
 -webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%);
 border:.5px solid rgba(255,255,255,.65);
 box-shadow:0 24px 60px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.8);
 transform:translateY(14px) scale(.96);transition:transform .4s cubic-bezier(.2,1.2,.4,1)}
.dxp.on .dxp-card{transform:none}
.dxp-x{position:absolute;top:12px;right:12px;z-index:2;display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;border-radius:50%;
 color:inherit;background:rgba(127,127,127,.18);cursor:pointer}
.dxp-pv{position:relative;border-radius:20px;overflow:hidden;background:rgba(127,127,127,.1);min-height:0}
.dxp-pv canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}
.dxp-cap{position:absolute;left:12px;right:12px;bottom:10px;display:flex;flex-direction:column;gap:1px;pointer-events:none}
.dxp-cap b{font:600 15px/1.2 -apple-system,"Segoe UI",sans-serif}
.dxp-cap span{font:500 12px/1.2 -apple-system,"Segoe UI",sans-serif;opacity:.6}
.dxp-side{display:flex;flex-direction:column;gap:8px;min-width:0;min-height:0;padding:6px 4px 0 2px}
.dxp-h{font:700 17px/1.2 -apple-system,"Segoe UI",sans-serif;padding:4px 40px 0 6px}
.dxp-s{display:flex;align-items:center;gap:8px;padding:0 12px;height:36px;border-radius:12px;background:rgba(127,127,127,.14)}
.dxp-s input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:inherit;font:500 14px -apple-system,"Segoe UI",sans-serif}
.dxp-l{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:2px;overscroll-behavior:contain}
.dxp-it{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:10px 12px;border:0;border-radius:14px;
 background:transparent;color:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.dxp-it .n{font:600 14px/1.25 -apple-system,"Segoe UI",sans-serif}
.dxp-it .c{font:500 11px/1.2 ui-monospace,Menlo,monospace;opacity:.55;white-space:nowrap}
.dxp-it .t{margin-left:6px;padding:2px 7px;border-radius:999px;font:600 10px/1.4 -apple-system,sans-serif;color:#fff;background:var(--acc,#0a84ff)}
@media (hover:hover){.dxp-it:hover{background:rgba(127,127,127,.14)}}
.dxp-it.on{background:rgba(10,132,255,.16);box-shadow:inset 0 0 0 1px rgba(10,132,255,.45)}
.dxp-ok{display:flex;align-items:center;justify-content:center;gap:8px;height:44px;border:0;border-radius:14px;color:#fff;background:var(--acc,#0a84ff);
 font:600 15px -apple-system,"Segoe UI",sans-serif;cursor:pointer;box-shadow:0 6px 16px rgba(10,132,255,.35),inset 0 1px 0 rgba(255,255,255,.3);transition:transform .15s ease,opacity .2s ease}
.dxp-ok:active{transform:scale(.97)}
.dxp-ok:disabled{opacity:.45;box-shadow:none;cursor:default}
@media (max-width:720px){
 .dxp{padding:10px;align-items:end}
 .dxp-card{grid-template-columns:1fr;grid-template-rows:minmax(170px,34vh) 1fr;height:min(640px,92vh);border-radius:24px}
 .dxp-ok{height:42px}
}
@media (prefers-color-scheme:dark){
 .dxp-card{background:rgba(44,44,50,.62);border-color:rgba(255,255,255,.18);color:#f5f5f7;box-shadow:0 24px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.18)}
}`;
  document.head.appendChild(css);

  const ov = document.createElement("div");
  ov.className = "dxp";
  ov.innerHTML = `<div class="dxp-card" role="dialog" aria-label="Chọn kệ khác">
 <button class="dxp-x" type="button" aria-label="Đóng">${IC("x", 14)}</button>
 <div class="dxp-pv"><canvas></canvas><div class="dxp-cap"><b></b><span></span></div></div>
 <div class="dxp-side"><div class="dxp-h">Chọn kệ khác</div>
  <label class="dxp-s">${IC("search", 15)}<input type="text" placeholder="Tìm theo tên hoặc mã"></label>
  <div class="dxp-l"></div><button class="dxp-ok" type="button"></button></div></div>`;
  document.body.appendChild(ov);

  const q = (s) => ov.querySelector(s),
    cvP = q("canvas"),
    capB = q(".dxp-cap b"),
    capS = q(".dxp-cap span"),
    list = q(".dxp-l"),
    inp = q("input"),
    okB = q(".dxp-ok");

  let st = null, pivot = null, view = null, ryP = -PI / 2 + 0.5, isOpen = false, raf = 0, last = 0, Z = null;
  
  function init() {
    st = mkStage(cvP);
        Z = dxZoom({
      cvs: cvP, cam: st.c,
      front: -Math.PI / 2,
      base: () => {
        const c = st.c, t = 2 * Math.tan(THREE.MathUtils.degToRad(c.fov / 2)), d = Math.max(3.1 / t, 2.1 / (t * c.aspect));
        return { pos: new THREE.Vector3(0, 1.2, d), tgt: new THREE.Vector3(0, 0.95, 0) };
      },
      obj: () => pivot,
      rot: () => ryP,
      setRot: (v) => { ryP = v; },
    });
    new ResizeObserver(size).observe(q(".dxp-pv"));
  }
  function size() {
    if (!st) return;
    const w = cvP.clientWidth, h = cvP.clientHeight;
    if (!w || !h) return;
    st.r.setSize(w, h, false);
    st.c.aspect = w / h;
    frame(st.c, w / h, 3.1, 0.95);
    st.c.updateProjectionMatrix();
  }

  /* dựng mô hình kệ vào sân khấu, tự co để lọt khung */
  function show(code) {
    const it = ShelfRegistry.get(code);
    if (!it || !st) return;
    view = code;
        if (Z) Z.reset();
    if (pivot) { st.s.remove(pivot); disposeGroup(pivot); pivot = null; }
    if (typeof BUILD[it.type] === "function") {
      const g = new THREE.Group();
      BUILD[it.type](it, g);
      mergeGroup(g);
      g.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(g), sz = b.getSize(new THREE.Vector3()), ct = b.getCenter(new THREE.Vector3());
      const k = Math.min(2.0 / Math.max(sz.x, sz.z, 0.1), 2.4 / Math.max(sz.y, 0.1), 1.3);
      g.position.set(-ct.x, -b.min.y, -ct.z);
      pivot = new THREE.Group();
      pivot.add(g);
      pivot.scale.setScalar(k);
      st.s.add(pivot);
    }
    capB.textContent = it.name;
    capS.textContent = it.code + " · " + it.size[0] + " × " + it.size[1] + " m";
    const same = code === selected;
    okB.disabled = same;
    okB.innerHTML = same ? "Đang chọn kệ này" : IC("check", 16) + "<span>Chuyển sang kệ này</span>";
    list.querySelectorAll(".dxp-it").forEach((b) => b.classList.toggle("on", b.dataset.c === code));
  }

  function renderList() {
    const t = inp.value.trim().toLowerCase();
    list.innerHTML = ShelfRegistry.all()
      .filter((s) => !t || (s.name + " " + s.code).toLowerCase().includes(t))
      .map((s) => `<button type="button" class="dxp-it${s.code === view ? " on" : ""}" data-c="${esc(s.code)}"><span class="n">${esc(s.name)}${s.code === selected ? '<span class="t">Đang chọn</span>' : ""}</span><span class="c">${esc(s.code)}</span></button>`)
      .join("") || '<div style="padding:14px;opacity:.55;font-size:13px">Không có kệ phù hợp</div>';
  }

  function loop(now) {
    if (!isOpen) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
        if (!Z.zoomed()) ryP += dt * 0.4;
    if (pivot) pivot.rotation.y = ryP;
    Z.apply();
    st.r.render(st.s, st.c);
  }

  function open() {
    if (!st) init();
    isOpen = true;
    inp.value = "";
    view = selected;
    renderList();
    ov.classList.add("on");
    requestAnimationFrame(() => { size(); show(selected); });
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function close() {
    isOpen = false;
    ov.classList.remove("on");
    cancelAnimationFrame(raf);
  }
  window.dxOpenPick = open;

  list.addEventListener("click", (e) => {
    const b = e.target.closest(".dxp-it");
    if (b) show(b.dataset.c);
  });
  inp.addEventListener("input", renderList);
  okB.addEventListener("click", () => {
    if (!view || view === selected) return;
    const c = view;
    close();
    select(c, true);
  });
  q(".dxp-x").addEventListener("click", close);
  ov.addEventListener("pointerdown", (e) => { if (e.target === ov) close(); });

  /* khi modal mở: chặn mọi phím lọt xuống app (Delete / R / WASD...) để không xoá hay xoay nhầm kệ; Esc để đóng */
  addEventListener("keydown", (e) => {
    if (!isOpen) return;
    if (e.key === "Escape") close();
    e.stopPropagation();
  }, true);
})();

/* ============ PATCH: ZOOM CHI TIẾT CHO MODAL 3D (dùng chung) ============ */
(() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  ICONS.minus = ICONS.minus || '<path d="M5 12h14"/>';

  const css = document.createElement("style");
  css.textContent = `
.dxz{position:absolute;left:10px;top:10px;z-index:3;display:flex;flex-direction:column;gap:2px;padding:3px;border-radius:999px;
 background:rgba(255,255,255,.26);-webkit-backdrop-filter:blur(20px) saturate(190%);backdrop-filter:blur(20px) saturate(190%);
 border:.5px solid rgba(255,255,255,.6);
 box-shadow:0 6px 18px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.75),inset 0 -1px 0 rgba(255,255,255,.18)}
.dxz button{position:relative;display:grid;place-items:center;width:32px;height:32px;padding:0;border:0;border-radius:50%;
 background:transparent;color:var(--ink,#1d1d1f);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
 transition:transform .2s cubic-bezier(.2,1.4,.4,1),background .18s ease}
.dxz button::after{content:"";position:absolute;inset:-3px}
.dxz button:active{transform:scale(.88)}
.dxz svg{width:16px;height:16px;stroke-width:1.6}
@media (hover:hover){.dxz button:hover{background:rgba(255,255,255,.38)}}
@media (max-width:720px){.dxz{left:8px;top:8px}.dxz button{width:29px;height:29px}.dxz svg{width:15px;height:15px}}
@media (prefers-color-scheme:dark){
 .dxz{background:rgba(58,58,66,.34);border-color:rgba(255,255,255,.2);box-shadow:0 6px 20px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.22)}
 .dxz button{color:#f5f5f7}
 @media (hover:hover){.dxz button:hover{background:rgba(255,255,255,.14)}}
}`;
  document.head.appendChild(css);

  /* o: {cvs, cam, base():{pos,tgt}, obj():Object3D, rot(), setRot(v), onZoom(bool)} */
  window.dxZoom = function (o) {
    const cvs = o.cvs, host = o.host || cvs.parentElement, cam = o.cam;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
const S = { z: 1, zt: 1, fy: null, ft: null, raw: null, px: 0, t: 0, on: false },
      rc = new THREE.Raycaster(), mv = new THREE.Vector2(), ZMIN = 0.18, ZMAX = 1.5;

    const focusY = (b) => {
      const raw = S.raw == null ? b.tgt.y : S.raw;
      return b.tgt.y + (raw - b.tgt.y) * clamp((1 - S.zt) / 0.4, 0, 1);
    };
    const flag = () => {
  const on = S.zt < 0.97;
  if (!on) S.px = 0;
  if (on !== S.on) { S.on = on; o.onZoom && o.onZoom(on); }
};
    function zoomTo(z, x, y) {
      S.zt = clamp(z, ZMIN, ZMAX);
      if (S.zt < 1 && x != null) {
        const ob = o.obj && o.obj();
        if (ob) {
          const r = cvs.getBoundingClientRect();
          mv.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
          rc.setFromCamera(mv, cam);
          const h = rc.intersectObject(ob, true)[0];
          if (h) S.raw = clamp(h.point.y, 0.05, 2.8);
        }
      }
      S.ft = focusY(o.base());
      flag();
    }
    function reset() {
      S.zt = 1; S.raw = null; S.ft = null; flag();
    }
    const wrapA = (a) => ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
function apply() {
  const b = o.base(), n = performance.now(), dt = Math.min(0.05, (n - (S.t || n)) / 1000);
  S.t = n;
  if (S.fy == null) S.fy = b.tgt.y;
  if (S.ft == null) S.ft = b.tgt.y;
  const k = 1 - Math.exp(-dt * 12);
  S.z += (S.zt - S.z) * k;
  S.fy += (S.ft - S.fy) * k;
  /* đang zoom → tự xoay về mặt chính diện (đi theo hướng ngắn nhất) */
  if (S.zt < 0.97 && !P.size && o.front != null) {
    const c = o.rot(), d = wrapA(o.front - c);
    if (Math.abs(d) > 0.002) o.setRot(c + d * (1 - Math.exp(-dt * 7)));
  }
  const off = b.pos.clone().sub(b.tgt).multiplyScalar(S.z);
  cam.position.set(b.tgt.x + off.x + S.px, S.fy + off.y, b.tgt.z + off.z);
  cam.lookAt(b.tgt.x + S.px, S.fy, b.tgt.z);
}

    /* ----- điều khiển: kéo = xoay (+ kéo dọc khi đã zoom = lên/xuống) · chụm / cuộn = zoom · nhấp đúp ----- */
    const P = new Map();
    let moved = 0, d0 = 0, z0 = 1;
    const on = (t, f) => host.addEventListener(t, (e) => { if (e.target !== cvs) return; e.stopPropagation(); f(e); }, true);
    on("pointerdown", (e) => {
      cvs.setPointerCapture(e.pointerId);
      P.set(e.pointerId, [e.clientX, e.clientY]);
      if (P.size === 1) moved = 0;
      else if (P.size === 2) {
        const [a, b] = [...P.values()];
        d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); z0 = S.zt; moved = 99;
      }
    });
    on("pointermove", (e) => {
      const p = P.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p[0], dy = e.clientY - p[1];
      moved += Math.abs(dx) + Math.abs(dy);
      p[0] = e.clientX; p[1] = e.clientY;
      if (P.size === 2) {
        const [a, b] = [...P.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (d0 && d > 0) zoomTo((z0 * d0) / d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        return;
      }
      if (moved > 6) {
  if (S.zt < 0.9) {
    /* đang zoom: giữ mặt chính diện, kéo ngang = trượt dọc kệ, kéo dọc = lên/xuống tầng */
    S.px = clamp(S.px - dx * 0.004 * S.z, -1.3, 1.3);
    S.raw = clamp((S.raw == null ? o.base().tgt.y : S.raw) + dy * 0.003 * S.z, 0.05, 2.8);
    S.ft = focusY(o.base());
  } else o.setRot(o.rot() + dx * 0.01);
}
    });
    on("pointerup", (e) => P.delete(e.pointerId));
    on("pointercancel", (e) => P.delete(e.pointerId));
    on("dblclick", (e) => (S.zt > 0.7 ? zoomTo(0.3, e.clientX, e.clientY) : reset()));
    cvs.addEventListener("wheel", (e) => {
      e.preventDefault();
      zoomTo(S.zt * (1 + e.deltaY * 0.0015), e.clientX, e.clientY);
    }, { passive: false });

    const bar = document.createElement("div");
    bar.className = "dxz";
    bar.innerHTML = `<button type="button" data-z="i" title="Phóng to">${IC("plus", 16)}</button><button type="button" data-z="o" title="Thu nhỏ">${IC("minus", 16)}</button><button type="button" data-z="r" title="Về mặc định">${IC("fit", 16)}</button>`;
    host.appendChild(bar);
    bar.addEventListener("pointerdown", (e) => e.stopPropagation());
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const z = b.dataset.z, r = cvs.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (z === "i") zoomTo(S.zt * 0.7, cx, cy);
      if (z === "o") zoomTo(S.zt * 1.4);
      if (z === "r") reset();
    });
    return { apply, reset, zoomed: () => S.zt < 0.97 };
  };

  /* ----- modal THÊM KỆ (#amodal / cv4): bọc render, giữ nguyên luồng cũ ----- */
  const V = THREE.Vector3;
  let prevSpin;
  const Z4 = dxZoom({
    cvs: $("#cv4"), cam: cam4,
    front: -Math.PI / 2,
    base: () => ({ pos: new V(0, 1.7, 5.4), tgt: new V(0, 0.7, 0) }),
    obj: () => aMod,
    rot: () => aRy,
    setRot: (v) => { aRy = v; if (aMod) aMod.rotation.y = v; },
    onZoom: (z) => {
      if (z) { prevSpin = window.aSpin; window.aSpin = false; }
      else window.aSpin = prevSpin;
    },
  });
  const _r4 = ren4.render.bind(ren4);
  ren4.render = (s, c) => { Z4.apply(); _r4(s, c); };
  new MutationObserver(() => { if (!$("#amodal").classList.contains("on")) Z4.reset(); })
    .observe($("#amodal"), { attributes: true, attributeFilter: ["class"] });
})();

/* ============ PATCH: CHẾ ĐỘ CHỈNH SỬA ẨN NHÂN VIÊN + KHÁCH, CHẾ ĐỘ XEM HIỆN LẠI (mượt) ============
   Chỉ thêm mới, không đụng core. Cách làm: ngay trước mỗi lần render, thu nhỏ nhân vật theo hệ số f
   (f giảm dần về 0 khi "edit", tăng dần về 1 khi "view"), render xong thì trả lại đúng như cũ.
   Nên các logic đang chạy (đi lại, tạo khách, lên/xuống xe, cửa tự động...) không bị ảnh hưởng. */
(() => {
  const SPEED = 5; /* tốc độ mờ/hiện: lớn = nhanh (≈ 0.4s) */
  const CH = new WeakSet(); /* mọi nhân vật 3D: nhân viên + khách */

  /* ghi nhận mọi nhân vật được tạo từ giờ về sau (khách mới, nhân viên mới/sửa) */
  const _mk = makeChar;
  makeChar = function (s) {
    const c = _mk(s);
    CH.add(c.g);
    return c;
  };
  npcs.forEach((n) => CH.add(n.g)); /* nhân viên đã có sẵn */

  let f = mode === "edit" ? 0 : 1,
    last = performance.now();
  const saved = [];

  const _before = scene.onBeforeRender,
    _after = scene.onAfterRender;

  scene.onBeforeRender = function () {
    if (_before) _before.apply(this, arguments);
    const now = performance.now(),
      dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const goal = mode === "edit" ? 0 : 1;
    f += (goal - f) * (1 - Math.exp(-dt * SPEED));
    if (Math.abs(goal - f) < 0.003) f = goal;
    saved.length = 0;
    if (f >= 1) return; /* chế độ xem: để nguyên 100% */
    const e = f * f * (3 - 2 * f); /* mượt đầu/cuối */
    const kids = scene.children;
    for (let i = 0; i < kids.length; i++) {
      const g = kids[i];
      if (!CH.has(g)) continue;
      saved.push([g, g.scale.x, g.scale.y, g.scale.z, g.visible]);
      if (e < 0.02) g.visible = false;
      else g.scale.multiplyScalar(e);
    }
  };

  scene.onAfterRender = function () {
    if (_after) _after.apply(this, arguments);
    for (let i = 0; i < saved.length; i++) {
      const s = saved[i];
      s[0].scale.set(s[1], s[2], s[3]);
      s[0].visible = s[4];
    }
    saved.length = 0;
  };
})();

/* ============ PATCH: BẢNG HIỆU MAXIDI v2 (IIFE, chỉ thêm mới) ============
   - Mờ nhẹ hơn: zoom chỉ mờ khi rất gần (còn ~45%), chế độ Chỉnh sửa mờ còn ~30%.
   - Chế độ Chỉnh sửa (khi không chọn quầy) hiện bảng "BẢNG HIỆU": tăng/giảm cỡ
     bảng chính + bảng phụ, đổi vị trí bảng phụ: Trước sân / Góc mái.
   - Lưu riêng trong localStorage "store-sign-v1", không đụng undo / xuất JSON. */
(() => {
  const { W, D } = STORE,
    hw = W / 2,
    hd = D / 2,
    FW = W + 0.6;
  const MAG = 0xa81f7f,
    MAGS = "#a81f7f";
  const FADE_EDIT = 0.3; /* độ đục khi đang chỉnh sửa */
  const FADE_ZOOM = 0.45; /* độ đục tối thiểu khi zoom sát */
  const ZOOM_START = 0.55,
    ZOOM_END = 0.3; /* tỉ lệ cam.r/cam.fit bắt đầu / hết mờ */
  const SMIN = 0.5,
    SMAX = 2.2,
    STEP = 0.1;

  /* trạng thái lưu được */
  const KEY = "store-sign-v1";
  let st = { m: 1, s: 1, pos: "yard" };
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    if (o && typeof o === "object") st = { ...st, ...o };
  } catch (e) {}
  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) {}
  };

  const mats = [];
  const mat = (o) => {
    const m = new THREE.MeshStandardMaterial({
      roughness: 0.55,
      transparent: true,
      ...o,
    });
    mats.push(m);
    return m;
  };
  const mMag = mat({ color: MAG }),
    mWhite = mat({ color: 0xf7f7f9 }),
    mDark = mat({ color: 0x2b2d33 }),
    mGray = mat({ color: 0x8a8d94, metalness: 0.4, roughness: 0.4 });
  const root = new THREE.Group();
  scene.add(root);

  function logoTex(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.fillStyle = MAGS;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = "#fff";
    x.lineWidth = w * 0.022;
    x.strokeRect(w * 0.04, w * 0.04, w * 0.92, h - w * 0.08);
    x.fillStyle = "#fff";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = `900 ${h * 0.36}px "Arial Black", Arial, sans-serif`;
    x.fillText("!M", w / 2, h * 0.36);
    x.font = `800 ${h * 0.13}px Arial, sans-serif`;
    x.fillText("MAXIDI", w / 2, h * 0.64);
    x.font = `600 ${h * 0.082}px Arial, sans-serif`;
    x.fillText("Chợ Kiểu Mới", w / 2, h * 0.79);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  const face = (p, tex, w, h, x, y, z, ry) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      mat({
        map: tex,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.22,
      }),
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    p.add(m);
  };

  /* 1) mặt dựng cố định (không đổi cỡ) */
  rb(FW, 0.86, 0.5, mWhite, 0, 3.14, hd + 0.13, root, 0.02);
  rb(FW, 0.14, 0.62, mWhite, 0, 3.0, hd + 0.19, root, 0.02);
  rb(FW, 0.14, 0.62, mWhite, 0, 4.0, hd + 0.19, root, 0.02);
  rb(W + 0.4, 0.86, 0.04, mMag, 0, 3.14, hd + 0.4, root, 0.01);

  /* 2) bảng chính: nhóm đặt ở đáy-giữa nên phóng to sẽ lớn lên phía trên */
  const mainG = new THREE.Group();
  mainG.position.set(0, 2.85, hd + 0.5);
  root.add(mainG);
  rb(1.45, 1.45, 0.16, mMag, 0, 0, 0, mainG, 0.03);
  face(mainG, logoTex(512, 512), 1.37, 1.37, 0, 0.725, 0.081, 0);

  /* 3) bảng phụ (hộp dọc): sideG + box + 2 trụ (chỉ hiện khi đặt trước sân) */
  const sideG = new THREE.Group(),
    box = new THREE.Group(),
    posts = new THREE.Group();
  sideG.add(box, posts);
  root.add(sideG);
  rb(0.24, 2.1, 1.4, mMag, 0, 0, 0, box, 0.03);
  const bt = logoTex(300, 440);
  face(box, bt, 1.32, 2.0, -0.121, 1.05, 0, -PI / 2);
  face(box, bt, 1.32, 2.0, 0.121, 1.05, 0, PI / 2);
  [-0.5, 0.5].forEach((z) => {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 1.05, 10),
      mGray,
    );
    c.position.set(0, 0.525, z);
    posts.add(c);
  });
  rb(0.5, 0.06, 1.4, mDark, 0, 0, 0, posts, 0.01); /* bệ chân */

  /* tay đỡ (treo hông) + chân đế (trên mái) */
  const arms = new THREE.Group(),
    foot = new THREE.Group();
  sideG.add(arms, foot);
  [-0.28, 0.22].forEach((y) =>
    rb(0.06, 0.06, 0.34, mDark, 0, y, 0.03, arms, 0.01),
  );
  rb(0.5, 0.06, 1.0, mDark, 0, -0.06, 0, foot, 0.01);

  /* 4) đèn rọi trên nóc */
  const TILT = 0.3;
  [-5.6, -2.8, 0, 2.8, 5.6].forEach((x) => {
    const y0 = 4.14,
      z0 = hd + 0.2,
      L = 0.5;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, L, 6),
      mGray,
    );
    pole.position.set(
      x,
      y0 + (Math.cos(TILT) * L) / 2,
      z0 + (Math.sin(TILT) * L) / 2,
    );
    pole.rotation.x = TILT;
    root.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.12), mDark);
    head.position.set(x, y0 + Math.cos(TILT) * L, z0 + Math.sin(TILT) * L);
    head.rotation.x = 0.6;
    root.add(head);
  });
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });

  /* 5) áp trạng thái lên cảnh */
  const clampS = (v) =>
    Math.round(Math.min(SMAX, Math.max(SMIN, v)) * 100) / 100;
  function apply() {
    mainG.scale.setScalar(st.m);
    sideG.scale.setScalar(st.s);
    posts.visible = arms.visible = foot.visible = false;
    box.position.set(0, 0, 0);
    if (st.pos === "yard") {
      /* trước sân, trên 2 trụ */
      sideG.position.set(-hw + 0.35, 0, hd + 2.4);
      box.position.y = 1.05;
      posts.visible = true;
    } else if (st.pos === "roof") {
      /* treo hông: nhô ra trước mặt dựng, có tay đỡ, không chạm mái */
      sideG.position.set(-FW / 2 + 0.25, 3.57, hd + 0.42);
      box.position.set(0, -1.05, 0.22);
      arms.visible = true;
    } else {
      /* trên mái: đứng trên gờ, cạnh dãy đèn */
      sideG.position.set(-FW / 2 + 0.9, 4.14, hd + 0.19);
      foot.visible = true;
    }
  }
  apply();

  /* 6) bảng điều khiển: thu gọn thành nút "Sửa bảng hiệu", bấm để mở / thu lại */
  const css = document.createElement("style");
  css.textContent = `#signp{left:50%;top:128px;transform:translateX(-50%);width:244px;display:none;z-index:4}
#signp .r{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}
#signp .r>span{color:var(--mute);font-size:12px}
#signp .stp{margin-left:0}
#signp .stp button{font-size:16px;line-height:1}
#signp b{font-variant-numeric:tabular-nums;min-width:42px;text-align:center;display:inline-block}
@media (max-width:1180px){#signp{left:auto;right:12px;transform:none}}
@media (max-width:720px){#signp{left:8px;right:8px;top:auto;transform:none;width:auto;bottom:calc(52px + env(safe-area-inset-bottom,0px))}}

#signp .r.c{flex-direction:column;align-items:stretch}
#signp .r.c .seg{display:flex}
#signp .r.c .seg button{flex:1;padding:6px 4px;font-size:12px}

/* nút thu gọn + đầu bảng có nút thu về */
#signp .hd{display:flex;align-items:center;justify-content:space-between;gap:8px}
#signp .hd h4{margin:0}
#signp .hd .cls,#signp .tgl{-webkit-appearance:none;appearance:none;background:transparent;border:0;outline:0;box-shadow:none;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .2s ease}
#signp .hd .cls{padding:2px 6px;font-size:12px;line-height:1.4;color:var(--mute);opacity:.85}
#signp .hd .cls:hover,#signp .tgl:hover{opacity:.65}
#signp .tgl{display:none;width:100%;padding:2px 4px;font-size:13px;font-weight:500;line-height:1.4;white-space:nowrap}
#signp.min{width:auto}
#signp.min .body,#signp.min .hd{display:none}
#signp.min .tgl{display:block}
@media (max-width:720px){#signp.min{left:auto;right:8px;width:auto}}`;
  document.head.appendChild(css);
  const pnl = document.createElement("div");
  pnl.className = "panel";
  pnl.id = "signp";
  $("#store").appendChild(pnl);

  /* mặc định thu gọn mỗi lần vào chỉnh sửa; bấm nút để mở */
  let open = false;
  const syncOpen = () => pnl.classList.toggle("min", !open);

  function drawPanel() {
    const row = (l, k) =>
      `<div class="r"><span>${l}</span><span class="stp"><button data-k="${k}" data-d="-1" title="Nhỏ lại">−</button><b>${Math.round(st[k] * 100)}%</b><button data-k="${k}" data-d="1" title="Lớn hơn">+</button></span></div>`;
    pnl.innerHTML = `<button class="tgl" data-t="open">Sửa bảng hiệu</button>
<div class="hd"><h4>BẢNG HIỆU</h4><button class="cls" data-t="close" title="Thu về nút &quot;Sửa bảng hiệu&quot;">Thu gọn</button></div>
<div class="body">${row("Bảng chính", "m")}${row("Bảng phụ", "s")}
<div class="r c"><span>Vị trí bảng phụ</span><span class="seg"><button data-p="yard" class="${st.pos === "yard" ? "on" : ""}">Trước sân</button><button data-p="roof" class="${st.pos === "roof" ? "on" : ""}">Treo hông</button><button data-p="top" class="${st.pos === "top" ? "on" : ""}">Trên mái</button></span></div></div>`;
    syncOpen();
  }
  drawPanel();
  pnl.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.t) {
      if (b.dataset.t === "close" && window.EditDial) EditDial.closePanel();
      return;
    }
    if (b.dataset.k)
      st[b.dataset.k] = clampS(st[b.dataset.k] + b.dataset.d * STEP);
    if (b.dataset.p) st.pos = b.dataset.p;
    apply();
    persist();
    drawPanel();
  });
  /* chặn kéo/chụm trên bảng lọt xuống canvas */
  pnl.addEventListener("pointerdown", (e) => e.stopPropagation());

  /* 7) mờ có kiểm soát */
  let f = 1,
    last = performance.now(),
    shown = false;
  const _render = ren.render.bind(ren);
  ren.render = (s, c) => {
    const n = performance.now(),
      dt = Math.min(0.05, (n - last) / 1000);
    last = n;
    const k = Math.min(
      1,
      Math.max(0, (cam.r / cam.fit - ZOOM_END) / (ZOOM_START - ZOOM_END)),
    );
    let goal = FADE_ZOOM + (1 - FADE_ZOOM) * k; /* zoom: chỉ mờ khi sát */
    if (mode === "edit")
      goal = Math.min(goal, FADE_EDIT); /* chỉnh sửa: mờ để bao quát */
    f += (goal - f) * (1 - Math.exp(-dt * 6));
    if (Math.abs(goal - f) < 0.004) f = goal;
    mats.forEach((m) => {
      m.opacity = f;
      m.transparent = f < 0.999;
      m.depthWrite = f > 0.98;
    });
    root.visible = f > 0.03;
    const want =
      tab === "store" && !!window.EditDial && EditDial.panel === "sign";
    if (want !== shown) {
      shown = want;
      pnl.style.display = want ? "block" : "none";
      open = want; /* mở từ menu Chỉnh sửa thì bung sẵn */
      syncOpen();
    }
    _render(s, c);
  };
})();

/* ============ PATCH: BẤM "Sửa bảng hiệu" → CAMERA BAY TỚI BẢNG HIỆU (IIFE, chỉ thêm mới) ============
   - Mở panel  → đặt cam.T tới mặt tiền (bảng chính + bảng phụ), dùng stepCam có sẵn để bay mượt.
   - Thu gọn / ẩn panel → bay về góc nhìn trước đó (nếu bạn chưa tự kéo/zoom/chọn quầy khác).
   - Kéo, cuộn, WASD, nhấp đúp... đều đã tự hủy cam.T trong code gốc nên không bị giành quyền. */
(() => {
  const pnl = document.querySelector("#signp");
  if (!pnl) return;
  const hd = STORE.D / 2;

  /* điểm nhìn & độ gần: chỉnh ở đây nếu muốn */
  const FOCUS = {
    x: -2.5,
    y: 2.8,
    z: hd + 1.2,
  }; /* giữa bảng chính và bảng phụ */
  const EXT = 7; /* bề ngang cần thấy (m); nhỏ hơn = zoom gần hơn */
  const PH = 1.2; /* góc nhìn: lớn = nhìn ngang hơn, nhỏ = nhìn từ trên xuống */

  let ours = null /* cam.T do patch này đặt */,
    saved = null /* góc nhìn trước khi bay tới bảng */,
    active = false;

  const near = (a, b) =>
    Math.abs(cam.r - b.r) < 0.6 &&
    Math.abs(cam.tx - b.tx) < 0.3 &&
    Math.abs(cam.tz - b.tz) < 0.3 &&
    Math.abs(wrap(cam.th - b.th)) < 0.1;

  function flyIn() {
    saved = {
      th: cam.th,
      ph: cam.ph,
      r: cam.r,
      tx: cam.tx,
      ty: cam.ty,
      tz: cam.tz,
    };
    const t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
      a = Math.min(1, camera.aspect || 1),
      r = THREE.MathUtils.clamp(EXT / (t * a), 6, cam.fit);
    cam.vth = 0;
    ours = {
      th: cam.th + wrap(0 - cam.th) /* th = 0: nhìn thẳng vào mặt tiền */,
      ph: PH,
      r,
      tx: FOCUS.x,
      ty: FOCUS.y,
      tz: FOCUS.z,
    };
    cam.T = ours;
  }

  function flyBack() {
    /* chỉ trả về nếu camera vẫn đang bay tới bảng, hoặc đã tới nơi mà chưa bị ai đụng vào */
    const mine = cam.T === ours || (!cam.T && ours && near(cam, ours));
    if (saved && mine) {
      cam.vth = 0;
      cam.T = { ...saved, th: cam.th + wrap(saved.th - cam.th) };
    }
    saved = ours = null;
  }

  const _r = ren.render.bind(ren);
  ren.render = (s, c) => {
    const now = pnl.style.display === "block" && !pnl.classList.contains("min");
    if (now !== active) {
      active = now;
      active ? flyIn() : flyBack();
    }
    _r(s, c);
  };
})();


/* ============ PATCH: NHÃN TÊN KỆ · LIQUID GLASS THUẦN (DOM overlay, luôn thẳng đứng, tự tránh chồng) ============ */
(() => {
  const css = document.createElement("style");
  css.textContent = `
.dxl-layer{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.dxl{--s:12px;position:absolute;left:0;top:0;opacity:0;transition:opacity .3s ease;will-change:transform}
.dxl.v{opacity:1}
/* hạt kính nhỏ: chỉ hiện khi nhãn đang thu gọn */
.dxl-dot{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;
 background:rgba(255,255,255,.55);border:.5px solid rgba(255,255,255,.95);
 -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
 box-shadow:0 1px 4px rgba(0,0,0,.28);transition:opacity .25s ease,transform .35s cubic-bezier(.2,1.4,.4,1)}
.dxl.p .dxl-dot{opacity:0;transform:scale(.4)}
/* cọng nối: sợi kính mảnh */
.dxl-st{position:absolute;left:-.5px;bottom:0;width:1px;height:var(--s);
 background:linear-gradient(to top,rgba(255,255,255,.85),rgba(255,255,255,.1));
 transform:scaleY(0);transform-origin:50% 100%;transition:transform .35s cubic-bezier(.2,1,.3,1),height .3s ease}
.dxl.p .dxl-st{transform:scaleY(1)}
/* viên kính */
.dxl-pill{position:absolute;left:0;bottom:calc(var(--s) + 1px);margin:0;overflow:hidden;isolation:isolate;
 display:flex;align-items:center;height:24px;padding:0 12px;border:0;border-radius:999px;
 color:var(--ink,#1d1d1f);background:rgba(255,255,255,.3);
 -webkit-backdrop-filter:blur(18px) saturate(210%) brightness(1.06);backdrop-filter:blur(18px) saturate(210%) brightness(1.06);
 box-shadow:
  inset 0 0 0 .5px rgba(255,255,255,.55),
  inset 1.5px 1.5px 1px -1px rgba(255,255,255,.95),
  inset -1.5px -1.5px 1px -1px rgba(255,255,255,.6),
  0 10px 26px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06);
 font:600 11.5px/1 -apple-system,"SF Pro Text","Segoe UI",Roboto,sans-serif;letter-spacing:-.005em;white-space:nowrap;
 cursor:pointer;-webkit-tap-highlight-color:transparent;
 opacity:0;pointer-events:none;transform:translate(-50%,10px) scale(.78);transform-origin:50% 100%;
 transition:opacity .3s ease,transform .5s cubic-bezier(.2,1.35,.35,1),background .3s ease,box-shadow .3s ease,bottom .3s ease}
/* ánh sáng bề mặt, chạy theo con trỏ */
.dxl-pill::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;
 background:radial-gradient(130% 160% at var(--mx,28%) var(--my,-10%),rgba(255,255,255,.7),rgba(255,255,255,0) 58%);
 opacity:.55;transition:opacity .3s ease}
.dxl-pill:hover::before{opacity:.95}
.dxl.p .dxl-pill{opacity:var(--o,1);pointer-events:auto;transform:translate(-50%,0) scale(var(--sc,1))}
.dxl-t{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0}
.dxl-n{max-width:150px;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.dxl-m{display:none;font:500 10px/1 ui-monospace,"SF Mono",Menlo,monospace;font-style:normal;opacity:.55}
/* kệ đang chọn: kính đậm hơn, hiện mã và kích thước; không màu, không phát sáng */
.dxl.sel .dxl-pill{height:auto;padding:8px 14px;border-radius:18px;background:rgba(255,255,255,.52);
 box-shadow:
  inset 0 0 0 .5px rgba(255,255,255,.8),
  inset 1.5px 1.5px 1px -1px #fff,
  inset -1.5px -1.5px 1px -1px rgba(255,255,255,.7),
  0 14px 34px rgba(0,0,0,.16),0 2px 4px rgba(0,0,0,.08)}
.dxl.sel .dxl-m{display:block}
.dxl.sel .dxl-n{max-width:200px}
.dxl.sel .dxl-st{background:linear-gradient(to top,#fff,rgba(255,255,255,.25))}
@media (max-width:720px){.dxl-pill{height:22px;padding:0 10px;font-size:11px}.dxl-n{max-width:105px}.dxl.sel .dxl-pill{height:auto;padding:7px 12px}}
@media (prefers-color-scheme:dark){
 .dxl-pill{color:#f5f5f7;background:rgba(40,40,46,.34);
  box-shadow:inset 0 0 0 .5px rgba(255,255,255,.2),inset 1.5px 1.5px 1px -1px rgba(255,255,255,.5),inset -1.5px -1.5px 1px -1px rgba(255,255,255,.18),0 10px 28px rgba(0,0,0,.45)}
 .dxl-pill::before{background:radial-gradient(130% 160% at var(--mx,28%) var(--my,-10%),rgba(255,255,255,.28),rgba(255,255,255,0) 58%)}
 .dxl.sel .dxl-pill{background:rgba(70,70,80,.5);
  box-shadow:inset 0 0 0 .5px rgba(255,255,255,.32),inset 1.5px 1.5px 1px -1px rgba(255,255,255,.7),inset -1.5px -1.5px 1px -1px rgba(255,255,255,.25),0 14px 34px rgba(0,0,0,.55)}
 .dxl-dot{background:rgba(255,255,255,.4);border-color:rgba(255,255,255,.7)}
 .dxl-st{background:linear-gradient(to top,rgba(255,255,255,.6),rgba(255,255,255,.05))}
}`;
  document.head.appendChild(css);

  const layer = document.createElement("div");
  layer.className = "dxl-layer";
  $("#store").appendChild(layer);

  const L = new Map(), V = new THREE.Vector3(), V2 = new THREE.Vector3();
  let px = -1e4, py = -1e4;
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

  cv.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && e.buttons === 0) {
      const r = layer.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
    } else px = py = -1e4;
  });
  cv.addEventListener("pointerleave", () => (px = py = -1e4));
  cv.addEventListener("pointerdown", () => (px = py = -1e4));

  layer.addEventListener("click", (e) => {
    const p = e.target.closest(".dxl-pill");
    if (!p) return;
    const c = p.parentNode.dataset.c;
    select(c, true);
    if (mode !== "edit") focusItem(c);
  });
  /* ánh sáng trượt theo con trỏ trên mặt kính */
  layer.addEventListener("pointermove", (e) => {
    const p = e.target.closest(".dxl-pill");
    if (!p) return;
    const r = p.getBoundingClientRect();
    p.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 100).toFixed(0) + "%");
    p.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 100).toFixed(0) + "%");
  });

  function make(code) {
    const el = document.createElement("div");
    el.className = "dxl";
    el.dataset.c = code;
    el.innerHTML = '<i class="dxl-st"></i><i class="dxl-dot"></i><button type="button" class="dxl-pill"><span class="dxl-t"><b class="dxl-n"></b><em class="dxl-m"></em></span></button>';
    layer.appendChild(el);
    const o = {
      el, pill: el.querySelector(".dxl-pill"), n: el.querySelector(".dxl-n"), m: el.querySelector(".dxl-m"),
      key: "", w: 80, h: 24, sx: 0, sy: 0, ok: false, on: false, s: 12, sp: -1, sel: false, sc: 0, dist: 0, q: "",
    };
    L.set(code, o);
    return o;
  }

  function update() {
    for (const c in labels) labels[c].visible = false;
    const items = ShelfRegistry.all(), r = cv.getBoundingClientRect(), lo = layer.getBoundingClientRect(),
      W = lo.width, H = lo.height, live = new Set(items.map((i) => i.code)), list = [];
    L.forEach((v, c) => { if (!live.has(c)) { v.el.remove(); L.delete(c); } });

    items.forEach((it) => {
      const g = groups[it.code];
      if (!g) return;
      const a = L.get(it.code) || make(it.code),
        sel = it.code === selected,
        key = it.name + "|" + it.code + "|" + it.size + "|" + sel + "|" + (innerWidth > 720);
      if (key !== a.key) {
        a.key = key;
        a.sel = sel;
        a.el.classList.toggle("sel", sel);
        a.n.textContent = it.name;
        a.m.textContent = it.code + " · " + it.size[0] + " × " + it.size[1] + " m";
        a.w = a.pill.offsetWidth;
        a.h = a.pill.offsetHeight;
      }
      V.set(it.pos[0], 2.35 + g.position.y, it.pos[1]).project(camera);
      a.sx = (V.x * 0.5 + 0.5) * r.width + r.left - lo.left;
      a.sy = (-V.y * 0.5 + 0.5) * r.height + r.top - lo.top;
      a.ok = V.z < 1 && a.sx > -30 && a.sx < W + 30 && a.sy > -10 && a.sy < H + 40;
      a.dist = camera.position.distanceTo(V2.set(it.pos[0], 1, it.pos[1]));
      list.push(a);
    });

    let hov = null, hd = 26;
    list.forEach((a) => {
      if (!a.ok) return;
      let d = Math.hypot(a.sx - px, a.sy - py);
      if (a.on) {
        const y1 = a.sy - a.s - 2;
        if (px >= a.sx - a.w / 2 && px <= a.sx + a.w / 2 && py >= y1 - a.h && py <= y1) d = 0;
      }
      if (d < hd) { hd = d; hov = a; }
    });

    const cx = W / 2, cy = H / 2, diag = Math.hypot(W, H);
    list.forEach((a) => {
      a.sc = (a.sel ? 1e6 : 0) + (a === hov ? 1e5 : 0) + (a.on ? 0.35 : 0) +
        (1 - Math.hypot(a.sx - cx, a.sy - cy) / diag) + (1 - Math.min(1, a.dist / 120)) * 0.3;
    });
    list.sort((p, q) => q.sc - p.sc);

    const placed = [];
    list.forEach((a) => {
      a.on = false;
      if (!a.ok) return;
      for (let k = 0; k < 3; k++) {
        const s = 12 + k * (a.h + 6), x0 = a.sx - a.w / 2 - 4, x1 = a.sx + a.w / 2 + 4,
          y1 = a.sy - s + 1, y0 = y1 - a.h - 6;
        if (a.sel || !placed.some((p) => x0 < p[2] && x1 > p[0] && y0 < p[3] && y1 > p[1])) {
          placed.push([x0, y0, x1, y1]);
          a.on = true;
          a.s = s;
          break;
        }
      }
      if (!a.on && a === hov) {
        a.on = true;
        a.s = 12;
        placed.push([a.sx - a.w / 2 - 4, a.sy - 12 - a.h - 5, a.sx + a.w / 2 + 4, a.sy - 11]);
      }
    });

    list.forEach((a) => {
      const e = a.el;
      e.style.transform = `translate(${a.sx.toFixed(1)}px,${a.sy.toFixed(1)}px)`;
      e.classList.toggle("v", a.ok);
      e.classList.toggle("p", a.on);
      if (a.on && a.sp !== a.s) { e.style.setProperty("--s", a.s + "px"); a.sp = a.s; }
      /* chiều sâu: kệ xa thì nhỏ và mờ hơn một chút, kệ đang chọn / đang trỏ luôn rõ nhất */
      const near = a.sel || a === hov,
        sc = near ? 1 : clampN(1.08 - (a.dist - 14) / 170, 0.84, 1),
        op = near ? 1 : clampN(1.12 - (a.dist - 14) / 120, 0.6, 1),
        q = sc.toFixed(2) + "|" + op.toFixed(2);
      if (q !== a.q) {
        a.q = q;
        a.pill.style.setProperty("--sc", sc.toFixed(2));
        a.pill.style.setProperty("--o", op.toFixed(2));
      }
      e.style.zIndex = a.sel ? 3 : a === hov ? 2 : a.on ? 1 : 0;
    });
  }

  const _r = ren.render.bind(ren);
  ren.render = (s, c) => { _r(s, c); update(); };
})();

/* ============ PATCH: KỆ CỨNG · nhân viên không đi xuyên (lưới điều hướng + A* + đẩy ra) ============ */
(() => {
  const CS = 0.25,       /* kích thước ô lưới (m) */
    R_GRID = 0.3,        /* bán kính an toàn khi tìm đường */
    R_LINE = 0.26,       /* bán kính kiểm tra đường thẳng */
    R_HARD = 0.2,        /* bán kính đẩy cứng (chống xuyên) */
    MARGIN = 0.3;        /* chừa mép tường */
  const HW = STORE.W / 2, HD = STORE.D / 2, NX = Math.ceil(STORE.W / CS), NZ = Math.ceil(STORE.D / CS);
  const grid = new Uint8Array(NX * NZ);
  let obs = [], sig = "", ver = 0;

  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const cellI = (x) => clampN(Math.floor((x + HW) / CS), 0, NX - 1),
    cellJ = (z) => clampN(Math.floor((z + HD) / CS), 0, NZ - 1),
    cx = (i) => -HW + (i + 0.5) * CS,
    cz = (j) => -HD + (j + 0.5) * CS;

  /* ---------- chướng ngại vật: mỗi kệ = hình chữ nhật xoay ---------- */
  const toObs = (it) => {
    const c = Math.cos(it.rot), s = Math.sin(it.rot), hx = it.size[0] / 2, hz = it.size[1] / 2;
    return { x: it.pos[0], z: it.pos[1], c, s, hx, hz, ex: Math.abs(c) * hx + Math.abs(s) * hz, ez: Math.abs(s) * hx + Math.abs(c) * hz };
  };
  const inObs = (o, x, z, r) => {
    const dx = x - o.x, dz = z - o.z, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
    return Math.abs(lx) < o.hx + r && Math.abs(lz) < o.hz + r;
  };
  const blockedAt = (x, z, r) => {
    if (Math.abs(x) > HW - MARGIN || Math.abs(z) > HD - MARGIN) return true;
    for (const o of obs) if (inObs(o, x, z, r)) return true;
    return false;
  };
  const clearLine = (x0, z0, x1, z1, r = R_LINE) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(len / 0.1));
    for (let k = 1; k <= n; k++) if (blockedAt(x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n, r)) return false;
    return true;
  };

  /* ---------- dựng lại lưới khi bố cục thay đổi (thêm / xoá / dời / xoay / đổi cỡ / undo) ---------- */
  const signature = () => {
    let s = 0, n = 0;
    ShelfRegistry.all().forEach((it) => {
      n++;
      s += n * (it.pos[0] * 13.1 + it.pos[1] * 7.7 + it.rot * 3.3 + it.size[0] * 5.1 + it.size[1] * 2.9);
    });
    return s.toFixed(4) + "|" + n;
  };
  function rebuild() {
    obs = ShelfRegistry.all().map(toObs);
    grid.fill(0);
    for (let j = 0; j < NZ; j++)
      for (let i = 0; i < NX; i++)
        if (Math.abs(cx(i)) > HW - MARGIN || Math.abs(cz(j)) > HD - MARGIN) grid[j * NX + i] = 1;
    obs.forEach((o) => {
      const i0 = cellI(o.x - o.ex - R_GRID), i1 = cellI(o.x + o.ex + R_GRID),
        j0 = cellJ(o.z - o.ez - R_GRID), j1 = cellJ(o.z + o.ez + R_GRID);
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) if (inObs(o, cx(i), cz(j), R_GRID)) grid[j * NX + i] = 1;
    });
    ver++;
  }
  function ensure() {
    const s = signature();
    if (s !== sig) { sig = s; rebuild(); }
  }
  ensure();

  /* ô trống gần nhất (khi điểm đích / điểm đứng nằm trong vùng cấm) */
  function nearestFree(i, j) {
    if (!grid[j * NX + i]) return [i, j];
    let best = null, bd = 1e9;
    for (let r = 1; r <= 24 && !best; r++) {
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const a = i + di, b = j + dj;
          if (a < 0 || b < 0 || a >= NX || b >= NZ || grid[b * NX + a]) continue;
          const d = di * di + dj * dj;
          if (d < bd) { bd = d; best = [a, b]; }
        }
    }
    return best;
  }
  const snapFree = (x, z) => {
    const f = nearestFree(cellI(x), cellJ(z));
    return f ? [cx(f[0]), cz(f[1])] : null;
  };

  /* ---------- A* trên lưới, 8 hướng, không cắt góc, rồi kéo thẳng đường đi ---------- */
  function findPath(x0, z0, x1, z1) {
    const s = nearestFree(cellI(x0), cellJ(z0)), g = nearestFree(cellI(x1), cellJ(z1));
    if (!s || !g) return null;
    const N = NX * NZ, G = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), done = new Uint8Array(N),
      si = s[1] * NX + s[0], gi = g[1] * NX + g[0], H = [];
    const push = (f, id) => {
      H.push([f, id]);
      let k = H.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (H[p][0] <= H[k][0]) break;
        [H[p], H[k]] = [H[k], H[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = H[0], last = H.pop();
      if (H.length) {
        H[0] = last;
        let k = 0;
        for (;;) {
          let l = 2 * k + 1, r = l + 1, m = k;
          if (l < H.length && H[l][0] < H[m][0]) m = l;
          if (r < H.length && H[r][0] < H[m][0]) m = r;
          if (m === k) break;
          [H[m], H[k]] = [H[k], H[m]];
          k = m;
        }
      }
      return top;
    };
    const hf = (i, j) => {
      const dx = Math.abs(i - g[0]), dz = Math.abs(j - g[1]);
      return dx + dz + (1.414 - 2) * Math.min(dx, dz);
    };
    G[si] = 0;
    push(hf(s[0], s[1]), si);
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false;
    while (H.length) {
      const id = pop()[1];
      if (done[id]) continue;
      done[id] = 1;
      if (id === gi) { found = true; break; }
      const i = id % NX, j = (id / NX) | 0;
      for (const [di, dj, c] of D) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
        const nid = b * NX + a;
        if (grid[nid] || done[nid]) continue;
        if (di && dj && (grid[j * NX + a] || grid[b * NX + i])) continue;
        const ng = G[id] + c;
        if (ng < G[nid]) { G[nid] = ng; from[nid] = id; push(ng + hf(a, b), nid); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let id = gi; id !== -1; id = from[id]) cells.push([cx(id % NX), cz((id / NX) | 0)]);
    cells.reverse();
    if (!blockedAt(x1, z1, R_LINE)) cells[cells.length - 1] = [x1, z1];
    const pts = [[x0, z0], ...cells], out = [];
    let a = 0;
    while (a < pts.length - 1) {
      let b = pts.length - 1;
      while (b > a + 1 && !clearLine(pts[a][0], pts[a][1], pts[b][0], pts[b][1])) b--;
      out.push(pts[b]);
      a = b;
    }
    return out;
  }

  /* ---------- đẩy ra khỏi kệ (lưới an toàn: kệ bị kéo đè lên người, góc kẹt…) ---------- */
  function pushOut(p, r = R_HARD) {
    for (let k = 0; k < 2; k++)
      for (const o of obs) {
        const dx = p.x - o.x, dz = p.z - o.z, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c,
          ox = o.hx + r - Math.abs(lx), oz = o.hz + r - Math.abs(lz);
        if (ox > 0 && oz > 0) {
          let nx = lx, nz = lz;
          if (ox < oz) nx = (lx < 0 ? -1 : 1) * (o.hx + r);
          else nz = (lz < 0 ? -1 : 1) * (o.hz + r);
          p.x = o.x + nx * o.c + nz * o.s;
          p.z = o.z - nx * o.s + nz * o.c;
        }
      }
    p.x = clampN(p.x, -HW + 0.25, HW - 0.25);
    p.z = clampN(p.z, -HD + 0.25, HD - 0.25);
  }

  /* ---------- gắn vào NPC: đích không đi thẳng được thì đi theo đường vòng ---------- */
  const _goal = goal;
  goal = function (n) {
    const g0 = _goal(n);
    ensure();
    const p = n.g.position;
    let gx = g0.x, gz = g0.z;
    if (blockedAt(gx, gz, R_LINE)) {
      const s = snapFree(gx, gz);
      if (s) { gx = s[0]; gz = s[1]; }
    }
    const g = gx === g0.x && gz === g0.z ? g0 : { ...g0, x: gx, z: gz };
    if (clearLine(p.x, p.z, g.x, g.z)) { n.nv = null; return g; }
    const now = performance.now();
    let st = n.nv;
    if (!st || st.ver !== ver || Math.hypot(st.gx - g.x, st.gz - g.z) > 0.3 || now - st.t > 2000) {
      st = n.nv = { ver, gx: g.x, gz: g.z, t: now, path: findPath(p.x, p.z, g.x, g.z) || [], i: 0 };
    }
    while (st.i < st.path.length && Math.hypot(st.path[st.i][0] - p.x, st.path[st.i][1] - p.z) < 0.25) st.i++;
    if (st.i >= st.path.length) return g;
    const w = st.path[st.i];
    return { x: w[0], z: w[1], act: "walk" }; /* điểm trung gian: chưa tới đích thật nên chưa làm việc */
  };

  const _step = stepNpc;
  stepNpc = function (n, dt, t) {
    _step(n, dt, t);
    pushOut(n.g.position);
  };

  const _r = ren.render.bind(ren);
  ren.render = (s, c) => { ensure(); _r(s, c); };

  /* API dùng chung cho khách hàng / nhân vật khác sau này */
  window.dxNav = {
    blocked: (x, z, r = R_LINE) => { ensure(); return blockedAt(x, z, r); },
    clear: (x0, z0, x1, z1, r = R_LINE) => { ensure(); return clearLine(x0, z0, x1, z1, r); },
    path: (x0, z0, x1, z1) => { ensure(); return findPath(x0, z0, x1, z1); },
    pushOut: (pos, r = R_HARD) => { ensure(); pushOut(pos, r); },
  };
})();


/* ============ PATCH: NHÃN "CỬA VÀO" · LIQUID GLASS (DOM overlay, IIFE, chỉ thêm mới) ============
   - Nằm trên nền sân trước cửa → không che tầm nhìn vào trong cửa hàng
   - Không đường line, không chấm tròn; pointer-events: none nên không chặn thao tác
   - Tự mờ khi zoom sát / khi chuột lại gần; tự đi theo cửa khi đổi vị trí cửa (đọc STORE.door mỗi khung) */
(() => {
  /* ---------- CSS: viên kính nhỏ, thanh mảnh, hỗ trợ sáng / tối ---------- */
  const css = document.createElement("style");
  css.textContent = `
/* lớp phủ chứa nhãn cửa: không nhận chuột */
.dxd-layer{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}

/* vị trí nhãn (được JS đặt bằng transform), opacity làm mượt khi mờ / hiện */
.dxd{position:absolute;left:0;top:0;opacity:0;transition:opacity .35s ease;will-change:transform,opacity}

/* viên kính lỏng: blur + saturate, viền sáng mảnh, bóng đổ mềm */
.dxd-pill{display:flex;align-items:center;gap:6px;height:24px;padding:0 12px 0 9px;border-radius:999px;
 transform:translate(-50%,-50%) scale(var(--sc,1));transform-origin:50% 50%;
 color:var(--ink,#1d1d1f);background:rgba(255,255,255,.28);
 -webkit-backdrop-filter:blur(18px) saturate(210%) brightness(1.06);backdrop-filter:blur(18px) saturate(210%) brightness(1.06);
 box-shadow:
  inset 0 0 0 .5px rgba(255,255,255,.55),
  inset 1.5px 1.5px 1px -1px rgba(255,255,255,.95),
  inset -1.5px -1.5px 1px -1px rgba(255,255,255,.6),
  0 8px 22px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06);
 font:600 11.5px/1 -apple-system,"SF Pro Text","Segoe UI",Roboto,sans-serif;letter-spacing:-.005em;white-space:nowrap}

/* biểu tượng mũi tên nhỏ, nhún nhẹ như đang mời vào */
.dxd-ic{display:grid;place-items:center;width:14px;height:14px;opacity:.7;animation:dxdBob 2.4s ease-in-out infinite}
.dxd-ic svg{width:14px;height:14px;display:block}
@keyframes dxdBob{0%,100%{transform:translateY(1px)}50%{transform:translateY(-1.5px)}}

/* điện thoại: nhỏ gọn hơn */
@media (max-width:720px){.dxd-pill{height:22px;padding:0 10px 0 8px;font-size:11px}}

/* chế độ tối */
@media (prefers-color-scheme:dark){
 .dxd-pill{color:#f5f5f7;background:rgba(40,40,46,.34);
  box-shadow:inset 0 0 0 .5px rgba(255,255,255,.2),inset 1.5px 1.5px 1px -1px rgba(255,255,255,.5),inset -1.5px -1.5px 1px -1px rgba(255,255,255,.18),0 8px 24px rgba(0,0,0,.45)}
}

/* người dùng giảm chuyển động: tắt nhún */
@media (prefers-reduced-motion:reduce){.dxd-ic{animation:none}}`;
  document.head.appendChild(css);

  /* ---------- DOM: lớp phủ + nhãn ---------- */
  const layer = document.createElement("div");
  layer.className = "dxd-layer";
  layer.innerHTML =
    '<div class="dxd"><div class="dxd-pill"><span class="dxd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 14.5L12 9l5.5 5.5"/></svg></span><span>Cửa vào</span></div></div>';
  $("#store").appendChild(layer);
  const el = layer.querySelector(".dxd"),
    pill = layer.querySelector(".dxd-pill");

  /* ---------- Trạng thái ---------- */
  const V = new THREE.Vector3(), V2 = new THREE.Vector3();
  let px = -1e4, py = -1e4, lastOp = -1, lastSc = -1;
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

  /* theo dõi chuột (chỉ chuột thật) để nhãn tự lánh khi con trỏ tới gần */
  cv.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && e.buttons === 0) {
      const r = layer.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
    } else px = py = -1e4;
  });
  cv.addEventListener("pointerleave", () => (px = py = -1e4));
  cv.addEventListener("pointerdown", () => (px = py = -1e4));

  /* ---------- Cập nhật vị trí + độ mờ mỗi khung hình ---------- */
  function update() {
    /* tâm cửa hiện tại (đọc mỗi khung nên dời cửa vẫn đúng) */
    const dm = (STORE.door[0] + STORE.door[1]) / 2,
      r = cv.getBoundingClientRect(),
      lo = layer.getBoundingClientRect();

    /* điểm neo: nền sân ngay trước cửa → nằm dưới cửa trên màn hình, không đè nội thất */
    V.set(dm, 0.04, STORE.D / 2 + 1.5).project(camera);
    const sx = (V.x * 0.5 + 0.5) * r.width + r.left - lo.left,
      sy = (-V.y * 0.5 + 0.5) * r.height + r.top - lo.top,
      ok = V.z < 1 && sx > -60 && sx < lo.width + 60 && sy > -20 && sy < lo.height + 40;

    el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;

    /* độ mờ: zoom sát thì ẩn dần, chỉnh sửa thì nhạt hơn, chuột lại gần thì lánh */
    const zk = clampN((cam.r / cam.fit - 0.28) / 0.3, 0, 1),
      dodge = clampN((Math.hypot(sx - px, sy - py) - 30) / 60, 0.12, 1);
    let op = ok ? zk * dodge * (mode === "edit" ? 0.55 : 0.95) : 0;
    if (tab !== "store") op = 0;

    /* thu nhỏ nhẹ khi ở xa để có chiều sâu */
    const dist = camera.position.distanceTo(V2.set(dm, 0.04, STORE.D / 2 + 1.5)),
      sc = clampN(1.08 - (dist - 14) / 170, 0.82, 1);

    if (Math.abs(op - lastOp) > 0.01) { el.style.opacity = op.toFixed(2); lastOp = op; }
    if (Math.abs(sc - lastSc) > 0.01) { pill.style.setProperty("--sc", sc.toFixed(2)); lastSc = sc; }
  }

  /* ---------- Móc vào vòng render ---------- */
  const _r = ren.render.bind(ren);
  ren.render = (s, c) => { _r(s, c); update(); };
})();