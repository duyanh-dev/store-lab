/* ============ PATCH: SÂN TRƯỚC (thềm dài) + 2 HÀNG XE MÁY + ĐƯỜNG LỚN + CỬA KÍNH TỰ ĐỘNG + KHÁCH HÀNG ============
   NÂNG CẤP: khách LÁI XE từ đường lớn quẹo vào sân, lùi xe vào ô trống, xuống xe đi mua hàng;
             mua xong ra lấy xe, chạy ra, quẹo ra đường -> ô đó TRỐNG cho khách sau.
   Cách dùng: XÓA toàn bộ patch sân/xe máy cũ, rồi dán file này vào cuối script.js
   (hoặc thêm <script src="./yard-patch.js"></script> SAU shelf-ui.js trong index.html).
   Chỉ thêm mới, không sửa logic cũ. Dựa vào các hàm sẵn có: rb, M, cyl, cylX, sph, glowMat,
   mergeGroup, makeChar, pose, turn, disposeChar, tag, STORE, scene, ren, npcs, showStaff. */
(() => {
  const { W, D } = STORE, hw = W / 2, hd = D / 2;
      let DX = (STORE.door[0] + STORE.door[1]) / 2; /* tâm cửa hiện tại, đổi được lúc chạy */
  const BASE = 3.5;                              /* bố cục gốc dựng ở cửa x=3.5 */
  const SW = 20.4, Z0 = hd + 0.12, Z1 = hd + 7, SD = Z1 - Z0, ZC = (Z0 + Z1) / 2;
  const Y = new THREE.Group();                   /* phần cố định */
  const YD = new THREE.Group();                  /* phần dời theo cửa */

  /* ---------- tiện ích ---------- */
  const GC = {};
  const G = (k, f) => GC[k] || (GC[k] = f());
  const bx = (w, h, d) => G("b" + w + "|" + h + "|" + d, () => new THREE.BoxGeometry(w, h, d));
  const UP = new THREE.Vector3(0, 1, 0);
  const mk = (geo, mat, p, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = m.receiveShadow = true;
    p.add(m);
    return m;
  };
  /* trụ nối 2 điểm bất kỳ (càng, giảm xóc, ống pô, tay lái, gương…) */
  function strut(p, x1, y1, z1, x2, y2, z2, r, mat, seg = 8) {
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, L = Math.hypot(dx, dy, dz);
    const m = new THREE.Mesh(
      G("s" + r + "|" + seg + "|" + L.toFixed(3), () => new THREE.CylinderGeometry(r, r, L, seg)),
      mat,
    );
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    m.quaternion.setFromUnitVectors(UP, new THREE.Vector3(dx, dy, dz).normalize());
    m.castShadow = true;
    p.add(m);
    return m;
  }
  const emi = (c, e, i) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: i, roughness: 0.3 });
  const MT = {
    rubber: M(0x141416, 0.95), black: M(0x232428, 0.6, 0.2), dark: M(0x2a2b30, 0.5, 0.3),
    seat: M(0x1a1a1c, 0.85), chrome: M(0xd0d3d9, 0.25, 0.85), alloy: M(0xa9adb4, 0.4, 0.7),
    disc: M(0x8d9097, 0.35, 0.8), eng: M(0x80838a, 0.5, 0.6), exh: M(0x6e7178, 0.35, 0.8),
    exh2: M(0x2d2e33, 0.6, 0.4), mag: M(0x1f2024, 0.5, 0.4), visor: M(0x15181d, 0.1, 0.5),
    head: emi(0xffffff, 0xfff3c8, 0.9), tail: emi(0xb71c1c, 0xff1a1a, 0.8),
    amber: emi(0xffa000, 0xff9100, 0.6), disp: emi(0x0a2a4a, 0x2a8cff, 0.7),
  };
  const bodyM = (c) => M(c, 0.32, 0.2);

  /* ---------- biển số (6 mẫu, dùng chung vật liệu) ---------- */
  const PL1 = ["59-X1", "59-P3", "50-H2", "59-C1", "51-F8", "59-S2"],
    PL2 = ["123.45", "456.78", "234.56", "987.65", "345.67", "678.90"],
    PLM = {};
  function plate(B, y, z, n) {
    const k = n % 6;
    let m = PLM[k];
    if (!m) {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 188;
      const x = c.getContext("2d");
      x.fillStyle = "#f4f4f0"; x.fillRect(0, 0, 256, 188);
      x.strokeStyle = "#222"; x.lineWidth = 6; x.strokeRect(5, 5, 246, 178);
      x.fillStyle = "#16181c"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "700 62px Arial"; x.fillText(PL1[k], 128, 62);
      x.font = "700 74px Arial"; x.fillText(PL2[k], 128, 132);
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      m = PLM[k] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.45 });
    }
    const p = new THREE.Mesh(G("plate", () => new THREE.PlaneGeometry(0.18, 0.13)), m);
    p.position.set(0, y, z);
    p.rotation.y = PI; /* mặt biển quay ra sau xe (-z) */
    B.add(p);
  }

  /* ---------- bộ phận dùng chung ---------- */
  /* bánh xe: trục theo x. cast = mâm đúc, disc = phanh đĩa */
  function wheel(p, z, R, cast, disc) {
    const g = new THREE.Group();
    g.position.set(0, R, z);
    g.rotation.y = PI / 2;
    p.add(g);
    const tire = mk(G("tire" + R, () => new THREE.TorusGeometry(R - 0.05, 0.05, 10, 26)), MT.rubber, g, 0, 0, 0);
    tire.scale.z = 0.85;
    mk(G("rim" + R, () => new THREE.TorusGeometry(R - 0.085, 0.014, 6, 22)), MT.chrome, g, 0, 0, 0);
    if (cast) mk(G("cf" + R, () => new THREE.CylinderGeometry(R - 0.09, R - 0.09, 0.012, 20)), MT.mag, g, 0, 0, 0, PI / 2);
    const n = cast ? 5 : 8;
    for (let k = 0; k < n; k++)
      mk(bx(2 * (R - 0.09), cast ? 0.034 : 0.008, cast ? 0.03 : 0.012), cast ? MT.alloy : MT.chrome, g, 0, 0, 0, 0, 0, (k * PI) / n);
    mk(G("hub", () => new THREE.CylinderGeometry(0.04, 0.04, 0.11, 12)), MT.alloy, g, 0, 0, 0, PI / 2);
    if (disc) {
      mk(G("disc", () => new THREE.CylinderGeometry(0.095, 0.095, 0.006, 16)), MT.disc, g, 0, 0, 0.045, PI / 2);
      mk(bx(0.06, 0.04, 0.035), MT.black, g, -0.09, 0, 0.05);
    }
  }
  /* chắn bùn dạng cung tròn quanh bánh */
  function fender(p, y, z, rad, arc, ang, sz, mat) {
    const g = new THREE.Group();
    g.position.set(0, y, z);
    g.rotation.y = PI / 2;
    p.add(g);
    const m = mk(G("fd" + rad + "|" + arc, () => new THREE.TorusGeometry(rad, 0.018, 6, 14, arc)), mat, g, 0, 0, 0);
    m.rotation.z = ang - arc / 2;
    m.scale.z = sz;
  }
  function fork(p, topY, topZ, R, axZ) {
    [-1, 1].forEach((s) => {
      const lx = (t) => s * (0.075 - 0.015 * t),
        ly = (t) => topY + (R - topY) * t,
        lz = (t) => topZ + (axZ - topZ) * t;
      strut(p, lx(0), ly(0), lz(0), lx(1), ly(1), lz(1), 0.017, MT.black);
      strut(p, lx(0.5), ly(0.5), lz(0.5), lx(1), ly(1), lz(1), 0.021, MT.chrome);
    });
  }
  function bars(p, y, z) {
    strut(p, -0.31, y, z, 0.31, y, z, 0.011, MT.chrome);
    [-1, 1].forEach((s) => {
      strut(p, s * 0.22, y, z, s * 0.37, y, z, 0.02, MT.rubber);
      const l = rb(0.012, 0.014, 0.13, MT.black, s * 0.24, y - 0.015, z + 0.07, p, 0.004);
      l.rotation.y = -s * 0.15;
    });
  }
  function mirror(p, s, y0, z0) {
    strut(p, s * 0.24, y0, z0, s * 0.3, y0 + 0.2, z0 - 0.03, 0.005, MT.black);
    [[MT.black, 0.09, 0.06, 0.014, 0], [MT.chrome, 0.075, 0.048, 0.004, -0.009]].forEach((a) => {
      const m = rb(a[1], a[2], a[3], a[0], s * 0.31, y0 + 0.19, z0 - 0.035 + a[4], p, 0.004);
      m.rotation.z = -s * 0.35;
      m.rotation.x = -0.25;
    });
  }
  function shock(p, x, top, bot, col) {
    const L = (a, b, t) => a + (b - a) * t;
    strut(p, x, top[0], top[1], x * 0.9, bot[0], bot[1], 0.013, MT.black);
    strut(p, x, L(top[0], bot[0], 0.1), L(top[1], bot[1], 0.1), x * 0.95, L(top[0], bot[0], 0.7), L(top[1], bot[1], 0.7), 0.021, col);
  }
  function stand(B, s) {
    strut(B, -s * 0.06, 0.24, -0.12, -s * 0.23, 0.025, -0.14, 0.01, MT.black);
    rb(0.07, 0.012, 0.04, MT.black, -s * 0.23, 0.018, -0.14, B, 0.004);
  }
  function helmet(p, x, y, z, col, ry) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry || 0;
    p.add(g);
    mk(G("hs", () => new THREE.SphereGeometry(0.11, 14, 10)), M(col, 0.35, 0.1), g, 0, 0, 0).scale.set(1, 0.88, 1.12);
    rb(0.15, 0.05, 0.04, MT.visor, 0, -0.03, 0.095, g, 0.01);
    rb(0.2, 0.014, 0.2, MT.black, 0, -0.1, 0, g, 0.004);
  }
  function basket(fr, col) {
    const ch = MT.chrome, t = 0.008;
    for (let i = -2; i <= 2; i++) rb(t, t, 0.3, ch, i * 0.07, 0.56, 0.26, fr, 0.002);
    for (let j = 0; j < 4; j++) rb(0.3, t, t, ch, 0, 0.56, 0.11 + j * 0.1, fr, 0.002);
    [-1, 1].forEach((a) => [-1, 1].forEach((b) => rb(t, 0.22, t, ch, a * 0.15, 0.56, 0.26 + b * 0.15, fr, 0.002)));
    [0.67, 0.77].forEach((y) => {
      [-1, 1].forEach((s) => {
        rb(0.3, t, t, ch, 0, y, 0.26 + s * 0.15, fr, 0.002);
        rb(t, t, 0.3, ch, s * 0.15, y, 0.26, fr, 0.002);
      });
    });
    rb(0.22, 0.2, 0.2, M(col, 0.7), 0, 0.57, 0.26, fr, 0.05);
    rb(0.14, 0.012, 0.012, MT.black, 0, 0.78, 0.26, fr, 0.003);
  }
  /* thùng sau / túi giao hàng */
  function cargo(B, sp, y0, z0) {
    if (sp.top) {
      rb(0.34, 0.025, 0.4, MT.black, 0, y0, z0, B, 0.01);
      rb(0.36, 0.28, 0.4, bodyM(sp.top), 0, y0 + 0.025, z0, B, 0.05);
      rb(0.364, 0.006, 0.404, MT.black, 0, y0 + 0.15, z0, B, 0.002);
      rb(0.05, 0.035, 0.012, MT.chrome, 0, y0 + 0.12, z0 + 0.204, B, 0.004);
      rb(0.12, 0.04, 0.012, MT.tail, 0, y0 + 0.2, z0 - 0.206, B, 0.004);
    } else if (sp.bag) {
      rb(0.46, 0.42, 0.46, bodyM(sp.bag), 0, y0, z0, B, 0.04);
      rb(0.468, 0.045, 0.468, M(0xf2f2f2, 0.6), 0, y0 + 0.2, z0, B, 0.01);
      rb(0.05, 0.04, 0.012, MT.chrome, 0, y0 + 0.3, z0 + 0.236, B, 0.004);
    }
  }

  /* ============ XE GA (kiểu Vision / Lead) ============ */
  function scooter(B, sp, n) {
    const R = 0.27, c = bodyM(sp.c), c2 = bodyM(sp.c2 || 0x2a2b30);
    wheel(B, -0.6, R, true, false);
    /* gầm + hộp số CVT + sàn để chân */
    rb(0.2, 0.16, 0.5, MT.black, 0, 0.12, -0.12, B, 0.03);
    rb(0.06, 0.18, 0.42, MT.dark, -0.15, 0.1, -0.38, B, 0.02);
    rb(0.44, 0.04, 0.5, c, 0, 0.26, 0.12, B, 0.02);
    rb(0.36, 0.012, 0.44, MT.rubber, 0, 0.3, 0.12, B, 0.004);
    [-1, 1].forEach((s) => rb(0.03, 0.09, 0.5, c, s * 0.225, 0.22, 0.12, B, 0.012));
    /* thân sau + yên */
    rb(0.28, 0.2, 0.2, c, 0, 0.3, -0.02, B, 0.05);
    rb(0.34, 0.4, 0.64, c, 0, 0.3, -0.4, B, 0.07);
    rb(0.3, 0.1, 0.18, c, 0, 0.4, -0.8, B, 0.05);
    rb(0.32, 0.07, 0.66, MT.seat, 0, 0.7, -0.44, B, 0.035);
    rb(0.3, 0.03, 0.3, MT.seat, 0, 0.77, -0.62, B, 0.015);
    /* đèn hậu, biển số, tay dắt sau */
    rb(0.2, 0.05, 0.025, MT.tail, 0, 0.5, -0.895, B, 0.01);
    rb(0.2, 0.15, 0.012, MT.black, 0, 0.27, -0.905, B, 0.004);
    plate(B, 0.345, -0.9135, n);
    [-1, 1].forEach((s) => rb(0.03, 0.03, 0.2, MT.black, s * 0.14, 0.68, -0.8, B, 0.008));
    rb(0.31, 0.03, 0.04, MT.black, 0, 0.68, -0.9, B, 0.008);
    /* yếm (tấm chắn chân) */
    rb(0.3, 0.66, 0.07, c, 0, 0.3, 0.27, B, 0.035).rotation.x = -0.12;
    /* giảm xóc sau + pô + chân chống */
    [-1, 1].forEach((s) => shock(B, s * 0.19, [0.62, -0.76], [0.27, -0.62], M(0xd32f2f, 0.5)));
    strut(B, 0.12, 0.12, -0.1, 0.2, 0.18, -0.3, 0.02, MT.chrome);
    strut(B, 0.2, 0.2, -0.3, 0.2, 0.22, -0.84, 0.05, MT.exh);
    strut(B, 0.2, 0.215, -0.32, 0.2, 0.225, -0.62, 0.057, MT.exh2);
    strut(B, 0.2, 0.22, -0.84, 0.2, 0.22, -0.87, 0.032, MT.chrome);
    stand(B, sp.s);
    cargo(B, sp, 0.8, -0.7);
    if (sp.seatHelm) helmet(B, 0, 0.88, -0.3, sp.seatHelm, PI);
    /* cụm tay lái – quay theo góc đánh lái */
    const fr = new THREE.Group();
    fr.position.set(0, 0, 0.4);
    fr.rotation.y = sp.steer || 0;
    B.add(fr);
    rb(0.28, 0.3, 0.2, c, 0, 0.6, -0.1, fr, 0.06);
    rb(0.17, 0.08, 0.02, MT.head, 0, 0.78, 0.1, fr, 0.01);
    [-1, 1].forEach((s) => rb(0.07, 0.035, 0.035, MT.amber, s * 0.14, 0.68, 0.06, fr, 0.01));
    rb(0.52, 0.1, 0.24, c2, 0, 0.92, -0.24, fr, 0.05);
    rb(0.12, 0.008, 0.08, MT.disp, 0, 1.02, -0.24, fr, 0.002);
    bars(fr, 0.98, -0.18);
    [-1, 1].forEach((s) => mirror(fr, s, 0.98, -0.18));
    fork(fr, 0.75, -0.02, R, 0.22);
    wheel(fr, 0.22, R, true, true);
    fender(fr, R, 0.22, R + 0.035, 1.4, PI / 2 + 0.5, 4.5, c);
    if (sp.basket) basket(fr, sp.basket);
    if (sp.hang) helmet(fr, -0.34, 0.88, -0.18, sp.hang, 0.3);
  }

  /* ============ XE SỐ / XE THỂ THAO (kiểu Wave / Exciter) ============ */
  function cub(B, sp, n) {
    const sport = !!sp.sport, R = sport ? 0.29 : 0.28, c = bodyM(sp.c);
    wheel(B, -0.6, R, sport, false);
    [-1, 1].forEach((s) => strut(B, s * 0.075, R, -0.6, s * 0.075, 0.26, -0.1, 0.017, MT.dark));
    /* động cơ, nắp lốc máy, đầu xy-lanh, hộp lọc gió */
    rb(0.2, 0.22, 0.32, MT.eng, 0, 0.12, 0, B, 0.04);
    [-1, 1].forEach((s) => mk(G("cc", () => new THREE.CylinderGeometry(0.075, 0.075, 0.03, 14)), MT.alloy, B, s * 0.115, 0.2, 0.04, 0, 0, PI / 2));
    mk(G("hd", () => new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12)), MT.eng, B, 0, 0.42, 0.14, 1.0);
    rb(0.2, 0.2, 0.3, MT.black, 0, 0.3, -0.28, B, 0.03);
    /* sườn, yên, đuôi */
    rb(0.25, 0.2, 0.46, c, 0, 0.5, -0.36, B, 0.05);
    rb(0.27, 0.09, sport ? 0.6 : 0.82, MT.seat, 0, 0.67, sport ? -0.42 : -0.3, B, 0.04);
    if (sport) rb(0.24, 0.2, 0.36, c, 0, 0.58, 0, B, 0.07);
    else rb(0.16, 0.22, 0.26, c, 0, 0.44, 0.06, B, 0.04);
    rb(0.2, 0.07, 0.26, c, 0, 0.58, -0.77, B, 0.04);
    fender(B, R, -0.6, R + 0.03, 1.5, PI / 2 - 0.5, 4.5, c);
    rb(0.18, 0.05, 0.025, MT.tail, 0, 0.6, -0.905, B, 0.01);
    rb(0.06, 0.16, 0.02, MT.black, 0, 0.44, -0.865, B, 0.005);
    rb(0.2, 0.15, 0.012, MT.black, 0, 0.285, -0.87, B, 0.004);
    plate(B, 0.36, -0.8765, n);
    /* tay dắt chrome */
    [-1, 1].forEach((s) => {
      rb(0.025, 0.03, 0.46, MT.chrome, s * 0.12, 0.78, -0.62, B, 0.006);
      rb(0.02, 0.1, 0.025, MT.chrome, s * 0.12, 0.7, -0.84, B, 0.005);
    });
    rb(0.26, 0.03, 0.03, MT.chrome, 0, 0.78, -0.84, B, 0.006);
    /* yếm, gác chân, cần số, nhông xích */
    rb(0.25, 0.46, 0.07, c, 0, 0.36, 0.3, B, 0.035).rotation.x = -0.1;
    [-1, 1].forEach((s) => {
      rb(0.07, 0.025, 0.15, MT.black, s * 0.2, 0.28, -0.02, B, 0.01);
      rb(0.05, 0.02, 0.1, MT.black, s * 0.2, 0.32, -0.42, B, 0.01);
      shock(B, s * 0.15, [0.67, -0.74], [0.3, -0.62], M(sport ? 0xf2b705 : 0xd32f2f, 0.5));
    });
    strut(B, -0.14, 0.22, 0.1, -0.2, 0.2, 0.28, 0.007, MT.chrome);
    rb(0.016, 0.06, 0.5, MT.chrome, -0.085, 0.27, -0.38, B, 0.005);
    /* ống pô */
    strut(B, 0.09, 0.17, 0.14, 0.15, 0.17, -0.2, 0.016, MT.chrome);
    strut(B, 0.15, 0.2, -0.22, 0.15, 0.24, -0.86, 0.047, MT.exh);
    strut(B, 0.15, 0.215, -0.24, 0.15, 0.245, -0.5, 0.055, MT.exh2);
    strut(B, 0.15, 0.24, -0.86, 0.15, 0.24, -0.89, 0.036, MT.black);
    stand(B, sp.s);
    cargo(B, sp, 0.82, -0.7);
    if (sp.seatHelm) helmet(B, 0, 0.86, -0.38, sp.seatHelm, PI);
    /* cụm tay lái */
    const fr = new THREE.Group();
    fr.position.set(0, 0, 0.4);
    fr.rotation.y = sp.steer || 0;
    B.add(fr);
    strut(fr, 0, 0.78, 0, 0, 1.0, -0.1, 0.02, MT.black);
    fork(fr, 0.8, 0, R, 0.22);
    wheel(fr, 0.22, R, sport, sport);
    fender(fr, R, 0.22, R + 0.035, 1.4, PI / 2 + 0.5, 4.5, c);
    bars(fr, 1.03, -0.12);
    rb(0.18, 0.06, 0.14, MT.black, 0, 1.0, -0.17, fr, 0.03);
    mk(G("sp", () => new THREE.CylinderGeometry(0.055, 0.055, 0.05, 14)), MT.black, fr, 0, 1.075, -0.17);
    mk(G("sg", () => new THREE.CylinderGeometry(0.045, 0.045, 0.004, 14)), MT.disp, fr, 0, 1.102, -0.17);
    [-1, 1].forEach((s) => mirror(fr, s, 1.03, -0.12));
    if (sport) {
      rb(0.28, 0.16, 0.2, c, 0, 0.78, -0.04, fr, 0.06);
      [-1, 1].forEach((s) => {
        rb(0.1, 0.025, 0.02, MT.head, s * 0.07, 0.86, 0.065, fr, 0.006);
        rb(0.05, 0.03, 0.03, MT.amber, s * 0.15, 0.8, 0.03, fr, 0.008);
      });
      rb(0.2, 0.12, 0.012, M(0x7fa6c9, 0.1, 0.3), 0, 0.94, -0.02, fr, 0.003).rotation.x = -0.5;
    } else {
      rb(0.16, 0.1, 0.08, MT.black, 0, 0.78, -0.02, fr, 0.02);
      mk(G("hr", () => new THREE.CylinderGeometry(0.09, 0.09, 0.08, 18)), MT.chrome, fr, 0, 0.88, 0.04, PI / 2);
      mk(G("hl", () => new THREE.CylinderGeometry(0.075, 0.075, 0.02, 18)), MT.head, fr, 0, 0.88, 0.085, PI / 2);
      [-1, 1].forEach((s) => rb(0.05, 0.035, 0.035, MT.amber, s * 0.16, 0.82, 0.02, fr, 0.01));
    }
    if (sp.hang) helmet(fr, -0.34, 0.93, -0.16, sp.hang, 0.3);
  }

  /* ============ SÂN (thềm dài) ============ */

    rb(SW, 0.08, SD, 0xb9bcc3, 0, -0.08, ZC, Y, 0.02);
  const pc = document.createElement("canvas");
  pc.width = pc.height = 128;
  const px = pc.getContext("2d");
  px.fillStyle = "#cfd1d7"; px.fillRect(0, 0, 128, 128);
  px.strokeStyle = "#b3b6bd"; px.lineWidth = 3; px.strokeRect(0, 0, 128, 128);
  const ptx = new THREE.CanvasTexture(pc);
  ptx.wrapS = ptx.wrapT = THREE.RepeatWrapping;
  ptx.repeat.set(SW / 0.8, SD / 0.8);
  ptx.anisotropy = 4;
  const ptop = new THREE.Mesh(new THREE.PlaneGeometry(SW, SD), new THREE.MeshStandardMaterial({ map: ptx, roughness: 0.85 }));
  ptop.rotation.x = -PI / 2;
  ptop.position.set(0, 0.003, ZC);
  ptop.receiveShadow = true;
  Y.add(ptop);
  /* lối đi + 2 vạch vàng: dời theo cửa */
  rb(6.4, 0.008, SD, 0xe3e5ea, BASE, 0.003, ZC, YD, 0.002);
  [BASE - 3.2, BASE + 3.2].forEach((x) => rb(0.07, 0.012, SD, 0xf2c200, x, 0.003, ZC, YD, 0.002));
  /* lề vỉa hè: 2 đoạn co giãn, chừa lối cho xe (cập nhật trong layout) */
  const curbs = [0, 1].map(() => {
    const m = rb(1, 0.16, 0.2, 0xb7bbc3, 0, -0.08, Z1 - 0.1, scene, 0.02);
    m.castShadow = false;
    return m;
  });
  /* chậu cây ở 2 đầu thềm (cố định) */
  [-9.8, 9.8].forEach((x) => {
    rb(0.7, 0.35, 0.7, 0x8a8d94, x, 0, 15.55, Y, 0.05);
    rb(0.6, 0.02, 0.6, 0x4e342e, x, 0.35, 15.55, Y, 0.005);
    [[0, 0.62, 0, 0.27], [0.15, 0.55, 0.1, 0.18], [-0.15, 0.55, -0.1, 0.18]].forEach((q) =>
      mk(G("bush" + q[3], () => new THREE.SphereGeometry(q[3], 12, 9)), M(0x4f9d5b, 0.9), Y, x + q[0], q[1], 15.55 + q[2]),
    );
  });
  /* thùng rác cạnh cửa: dời theo cửa */
  mk(G("bin", () => new THREE.CylinderGeometry(0.2, 0.17, 0.7, 14)), M(0x3f7d4e, 0.7), YD, BASE + 3.6, 0.35, 15.55);
  mk(G("binl", () => new THREE.CylinderGeometry(0.21, 0.21, 0.04, 14)), M(0x2e5d3a, 0.7), YD, BASE + 3.6, 0.72, 15.55);

  /* ---------- 2 hàng ô xe dọc: hàng trái x=-1.3 (đầu xe hướng vào lối đi), hàng phải x=8.5 ----------
     Mỗi cột có: sx = hướng đầu xe, xin = làn xe VÀO, xm = miệng ô, xout = làn xe RA.
     Xe vào: quẹo phải từ làn gần -> chạy dọc làn xin -> dừng -> LÙI cung tròn r=1 -> lùi thẳng vào ô.
     Xe ra : chạy thẳng ra miệng ô -> quẹo phải vào làn xout -> ra đường -> quẹo phải vào làn gần. */
  const ZB = (i) => 16.3 + 0.85 * i;
  const COLS = [
    { x: -1.3, yaw: PI / 2, ex: 0.0, sx: 1, xin: 1.9, xm: 0.9, xout: 2.9, list: [      { k: "cub", c: 0x1e5aa8, steer: -0.15, s: -1, hang: 0xf2b705 },
      { k: "sc", c: 0xf0f0f0, c2: 0x30343a, steer: 0.1, s: 1, top: 0x2b2d33 },
      { k: "cub", sport: true, c: 0xf2b705, steer: 0.3, s: -1 },
      { k: "sc", c: 0xe58aa5, steer: -0.2, s: 1, basket: 0x43a047, hang: 0xe53935 },
      { k: "sc", c: 0x2a2b30, steer: 0.18, s: -1, bag: 0x2e7d32 },
    ] },
    { x: 8.5, yaw: -PI / 2, ex: 7.4, sx: -1, xin: 5.1, xm: 6.1, xout: 4.1, list: [      { k: "sc", c: 0x1e5aa8, steer: -0.22, s: -1, basket: 0xfdd835 },
      { k: "sc", c: 0x2e7d5b, steer: 0.1, s: 1, top: 0xe8e8ea, seatHelm: 0x1e5aa8 },
      { k: "cub", sport: true, c: 0xc62828, c2: 0x2a2b30, steer: -0.28, s: -1 },
      { k: "sc", c: 0x7b1fa2, steer: 0.15, s: 1, bag: 0xe65100 },
      { k: "cub", c: 0x2e7d32, steer: -0.1, s: -1, hang: 0xffffff },
    ] },
  ];
  /* SLOT: state = "parked" (có xe) | "reserved" (xe đang chạy tới) | "leaving" (xe vừa rời) | "empty" (trống) */
  const SLOTS = [];
  COLS.forEach((col, ci) => {
    for (let i = 0; i <= 6; i++) rb(1.9, 0.006, 0.05, 0xf5f5f5, col.x, 0.004, 15.875 + 0.85 * i, YD, 0.002);    col.list.forEach((sp, i) => {
      SLOTS.push({
        col, ex: col.ex, z: ZB(i), sp, n: i + ci * 6,
        jit: (((i * 37 + ci * 11) % 5) - 2) * 0.02,
        state: "parked", owner: null, H: null, B: null,
      });
    });
  });
    COLS.forEach((c) => (c.b = { x: c.x, ex: c.ex, xin: c.xin, xm: c.xm, xout: c.xout })); /* lưu tọa độ gốc */
  const TG = [-1.3, 8.5].map((x) => [tag("KHU ĐỂ XE", x, 1.1, Z1 - 0.3, 2.2, 1), x]);
  /* ---------- đường lớn trải dài trước bãi xe ---------- */
  const ZR = Z1 + 3.8, ZS = ZR + 3.6 + 1.3;
  const ZL = ZR - 1.7; /* tâm làn gần sân (xe chạy theo chiều -x) */
  rb(130, 0.12, 7.2, 0x383b42, 0, -0.2, ZR, Y, 0.02); /* mặt đường */
  rb(130, 0.16, 2.6, 0xb7bbc3, 0, -0.2, ZS, Y, 0.02); /* vỉa hè bên kia đường */
  [-1, 1].forEach((s) => rb(130, 0.008, 0.12, 0xf5f5f5, 0, -0.082, ZR + s * 3.3, Y, 0.002)); /* vạch mép đường */
  for (let x = -62; x < 62; x += 3.2) rb(1.6, 0.008, 0.14, 0xf5d142, x, -0.082, ZR, Y, 0.002); /* vạch giữa đứt */
  for (let i = 0; i < 9; i++) rb(0.4, 0.008, 6.8, 0xf2f2f2, 0.5 + i * 0.8, -0.082, ZR, Y, 0.002); /* vạch qua đường */
  [-16, -5, 6, 17].forEach((x) => { /* cột đèn đường */
    cyl(0.05, 0.07, 4.6, 0x555a63, x, -0.04, ZS, Y, 8);
    rb(0.9, 0.1, 0.28, 0x3a3d44, x, 4.5, ZS - 0.35, Y, 0.02);
    rb(0.7, 0.03, 0.2, glowMat(0xffffff, 0xfff3c8, 1), x, 4.47, ZS - 0.35, Y, 0.005);
  });
  [-20, -9, 1.5, 12, 23].forEach((x, i) => { /* cây bên kia đường */
    cyl(0.1, 0.12, 1.4, 0x8a6d4f, x, -0.04, ZS + 0.5, Y, 8);
    sph(0.9 + (i % 2) * 0.15, 0x5fae6b, x, 2.0, ZS + 0.5, Y, 1, 0.95, 1, 0.9);
    sph(0.6, 0x4f9d5b, x + 0.5, 1.7, ZS + 0.3, Y, 1, 0.9, 1, 0.9);
  });

  /* ---------- gỡ cây cũ nằm trong phạm vi sân, gộp mesh ---------- */
  scene.children.slice().forEach((o) => {
    if (o.isGroup && o.children.length === 4 && o.position.z > 14.5 && o.position.z < 21) scene.remove(o);
  });
  mergeGroup(Y);
  Y.traverse((o) => { if (o.isMesh) o.castShadow = false; }); /* sân nằm ngoài vùng bóng → bỏ để nhẹ máy */
  scene.add(Y);

    mergeGroup(YD);
  YD.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  scene.add(YD);

  /* ---------- xe máy: mỗi chiếc là 1 nhóm riêng (đã gộp mesh) để ẩn/hiện/chạy được ---------- */
  const RN = Math.random, PICK = (a) => a[Math.floor(RN() * a.length)], J = () => (RN() - 0.5) * 0.5;
  function buildBike(sp, n) {
    const H = new THREE.Group(), B = new THREE.Group();
    (sp.k === "cub" ? cub : scooter)(B, sp, n);
    mergeGroup(B);
    B.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    H.add(B);
    scene.add(H);
    return { H, B };
  }
  const disposeObj = (o) => o.traverse((m) => { if (m.isMesh && m.geometry) m.geometry.dispose(); });
  function parkAt(s, bike) { /* đặt xe vào ô ở tư thế đỗ (chân chống nghiêng) */
    s.H = bike.H; s.B = bike.B;
    s.H.position.set(s.col.x, 0, s.z);
    s.H.rotation.y = s.col.yaw + s.jit;
    s.B.rotation.z = s.sp.s * 0.1;
    s.state = "parked";
  }
  /* lúc mới vào chỉ có vài xe đỗ lác đác, còn lại ô trống */
  const OCC = new Set(SLOTS.map((_, i) => i).sort(() => RN() - 0.5).slice(0, 5));
  SLOTS.forEach((s, i) => { if (OCC.has(i)) parkAt(s, buildBike(s.sp, s.n)); else s.state = "empty"; });

  /* ---------- xe chạy trên đường ---------- */
  function carBody(g, col) {
    const bm = M(col, 0.3, 0.3);
    rb(1.8, 0.5, 4.3, bm, 0, 0.32, 0, g, 0.15);
    rb(1.55, 0.5, 2.3, bm, 0, 0.82, -0.25, g, 0.15);
    rb(1.58, 0.34, 2.0, 0x26384b, 0, 0.9, -0.25, g, 0.04);
    [-1, 1].forEach((a) => [-1, 1].forEach((b) => {
      cylX(0.33, 0.25, 0x1a1a1c, a * 0.88, 0.33, b * 1.4, g, 14);
      cylX(0.18, 0.26, 0xc9ccd2, a * 0.88, 0.33, b * 1.4, g, 10);
    }));
    [-1, 1].forEach((a) => {
      rb(0.45, 0.14, 0.05, MT.head, a * 0.55, 0.6, 2.16, g, 0.01);
      rb(0.4, 0.12, 0.05, MT.tail, a * 0.6, 0.6, -2.16, g, 0.01);
    });
  }
  function rider(B, col) {
    const sk = M(0xe8b88f, 0.7);
    rb(0.3, 0.5, 0.22, col, 0, 0.62, -0.38, B, 0.05);
    [-1, 1].forEach((s) => {
      rb(0.1, 0.1, 0.42, 0x2c3140, s * 0.11, 0.55, -0.1, B, 0.03);
      strut(B, s * 0.17, 1.05, -0.38, s * 0.3, 0.98, 0.22, 0.04, M(col, 0.7));
    });
    mk(G("rh", () => new THREE.SphereGeometry(0.1, 12, 9)), sk, B, 0, 1.28, -0.36);
    helmet(B, 0, 1.3, -0.36, 0xf2f2f2, 0);
  }
  const traffic = [];
  function addTraffic(kind, col, x, dir, v) {
    const B = new THREE.Group();
    if (kind === "car") carBody(B, col);
    else { scooter(B, { c: col, s: 1 }, x | 0); rider(B, 0x1e88e5); }
    mergeGroup(B);
    const H = new THREE.Group();
    H.add(B);
    H.rotation.y = dir > 0 ? PI / 2 : -PI / 2;
    H.position.set(x, -0.08, ZR + (dir > 0 ? 1.7 : -1.7));
    scene.add(H);
    traffic.push({ H, dir, v, r: kind === "car" ? 1.2 : 0.5 });
  }
  addTraffic("car", 0xc62828, -40, 1, 5.5);
  addTraffic("car", 0xe8e8ea, 18, 1, 4.5);
  addTraffic("car", 0x1e5aa8, 30, -1, 5);
  addTraffic("sc", 0xf2b705, -10, 1, 4);
  addTraffic("sc", 0x2e7d5b, 45, -1, 3.6);
  addTraffic("sc", 0xc62828, -30, -1, 4.2);

  /* ---------- cửa kính tự động ---------- */
  const DOORZ = hd + 0.15, PW = 3.0, PH = 2.38;
  const doorGlass = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false });
  const frost = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true, opacity: 0.55, depthWrite: false });
  const fm = M(0xb8bcc4, 0.35, 0.7), hm = M(0x8a8d94, 0.3, 0.8);

  const DG = new THREE.Group(); /* nhóm cửa kính, dời theo DX */
  DG.position.x = DX;
  scene.add(DG);

  function panel(cx, dir) {
    const g = new THREE.Group();
    g.position.set(cx, 0, DOORZ);
    DG.add(g);
    rb(PW, 0.1, 0.06, fm, 0, 0, 0, g, 0.01);
    rb(PW, 0.08, 0.06, fm, 0, PH - 0.08, 0, g, 0.01);
    rb(0.08, PH, 0.06, fm, -PW / 2 + 0.04, 0, 0, g, 0.01);
    rb(0.08, PH, 0.06, fm, PW / 2 - 0.04, 0, 0, g, 0.01);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(PW - 0.16, PH - 0.18, 0.015), doorGlass);
    gl.position.set(0, 0.1 + (PH - 0.18) / 2, 0);
    g.add(gl);
    const fb = new THREE.Mesh(new THREE.BoxGeometry(PW - 0.16, 0.22, 0.02), frost);
    fb.position.set(0, 1.0, 0);
    g.add(fb);
    rb(0.03, 0.7, 0.05, hm, dir < 0 ? PW / 2 - 0.16 : -PW / 2 + 0.16, 0.9, 0.05, g, 0.005);
    return g;
  }
    const pL = panel(-PW / 2, -1), pR = panel(PW / 2, 1);
  rb(PW * 2 + 0.3, 0.1, 0.14, fm, 0, 2.38, DOORZ, DG, 0.01);
  rb(0.5, 0.1, 0.1, 0x2b2d33, 0, 2.28, DOORZ + 0.05, DG, 0.01);
  rb(0.06, 0.06, 0.02, glowMat(0x00c853, 0x00e676, 1), 0, 2.3, DOORZ + 0.105, DG, 0.005);
  let doorO = 0;

  /* ---------- khách hàng (đi bộ trong cửa hàng – logic giữ nguyên) ---------- */
  const NODE = {
    E: [3.4, 14], A1: [3.4, 11.6], AS1: [3.4, 7.5], A2: [3.4, 4], AS2: [3.4, 0.5], A3: [3.4, -4.2],
    B1: [-3.4, 11.6], BS1: [-3.4, 7.5], B2: [-3.4, 4], BS2: [-3.4, 0.5], B3: [-3.4, -4.2],
    C1: [-4.8, 11.5], C2: [-2, 11.5],
  };
   const EDGES_BASE = [["A1", "AS1"], ["AS1", "A2"], ["A2", "AS2"], ["AS2", "A3"], ["B1", "BS1"], ["BS1", "B2"], ["B2", "BS2"], ["BS2", "B3"], ["A2", "B2"], ["A3", "B3"], ["A1", "C2"], ["C2", "B1"], ["B1", "C1"]];
  const ADJ = {};
  function buildGraph() { /* điểm vào E đi theo cửa, nối vào lối đi gần cửa nhất */
    NODE.E = [DX, 14];
    Object.keys(ADJ).forEach((k) => delete ADJ[k]);
    EDGES_BASE.concat([["E", DX >= 0 ? "A1" : "B1"]]).forEach(([a, b]) => {
      (ADJ[a] = ADJ[a] || []).push(b);
      (ADJ[b] = ADJ[b] || []).push(a);
    });
  }
  buildGraph();
  function bfs(a, b) {
    if (a === b) return [a];
    const prev = { [a]: null }, q = [a];
    while (q.length) {
      const u = q.shift();
      if (u === b) break;
      (ADJ[u] || []).forEach((v) => { if (!(v in prev)) { prev[v] = u; q.push(v); } });
    }
    const p = [];
    for (let u = b; u != null; u = prev[u]) p.unshift(u);
    return p;
  }
  const BR = ["AS1", "AS2", "A3", "BS1", "BS2", "B3"];
  const SKIN = ["#f6d7bd", "#f0c8a4", "#e3b894", "#dcab88", "#c48c66", "#8d5a3b"],
    HAIR = ["#151515", "#2b2220", "#4a2c2a", "#6b3f2a", "#b5651d", "#d9d9d9"],
    SHIRT = [0x1e88e5, 0xe53935, 0x43a047, 0xfb8c00, 0x8e24aa, 0xfdd835, 0x00acc1, 0xf5f5f5, 0x6d4c41, 0x26a69a],
    PANTS = ["#2c3140", "#3b4a6b", "#5d4e37", "#1f1f23", "#6b7280", "#8a6d3b"],
    ACCS2 = [[], [], [], ["glasses"], ["cap"], ["glasses", "cap"]];
  function go(q, cur, to, props) {
    const p = bfs(cur, to).slice(1);
    p.forEach((k, i) => {
      const o = { x: NODE[k][0] + J(), z: NODE[k][1] + J() * 0.6 };
      if (i === p.length - 1 && props) Object.assign(o, props);
      q.push(o);
    });
    if (!p.length && props) q.push({ x: NODE[to][0] + J(), z: NODE[to][1], ...props });
    return to;
  }
  const faceOf = (k) => {
    const [x, z] = NODE[k], d = k === "A3" || k === "B3" ? [0, -1] : [RN() < 0.5 ? 1 : -1, 0];
    return [x + d[0] * 3, z + d[1] * 3];
  };
  const custs = [];

  /* tạo 1 khách (ngoại hình + màu áo ngẫu nhiên; shirt có thể truyền vào để khớp với người lái xe) */
  function newCust(shirt) {
    const look = {
      height: 1.5 + RN() * 0.35, build: RN(), headSize: 0.95 + RN() * 0.15,
      skin: PICK(SKIN), hair: PICK(HAIR), pants: PICK(PANTS),
      hairStyle: PICK(["short", "long", "bun", "pony", "bob"]), eyes: PICK(["dot", "happy", "big"]),
      face: PICK(["oval", "round", "square"]), acc: PICK(ACCS2), blush: RN() < 0.6,
    };
    const c = makeChar({ code: "CUS", role: "manager", look }), sh = shirt || PICK(SHIRT);
    c.shirt = sh;
    c.g.traverse((o) => { /* đổi màu áo xám mặc định */
      if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x9a9aa0) o.material = M(sh, 0.75);
    });
    c.pop = 0; c.out = 0; c.wait = 0; c.v = 1.4 + RN() * 0.5; c.q = []; c.slot = null;
    return c;
  }
  /* lập lịch đi của khách: tới cửa -> chọn hàng -> thanh toán -> ra về (về lại xe của mình nếu có) */
 

  /* ============ XE CỦA KHÁCH: VÀO / RA ============ */
  const veh = [];
  let VID = 0, bikeSeq = 20;
  const ad = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const gy = (z) => -0.08 * Math.max(0, Math.min(1, (z - Z1) / 1.0)); /* dốc nhẹ từ sân xuống mặt đường */
  const BCOL = [0xc62828, 0x1e5aa8, 0xf0f0f0, 0xf2b705, 0xe58aa5, 0x2a2b30, 0xaab0b8, 0x2e7d5b, 0x7b1fa2, 0x2e7d32, 0x1565c0, 0xff6f00];
  function randSpec() {
    const isCub = RN() < 0.45;
    const sp = { k: isCub ? "cub" : "sc", c: PICK(BCOL), s: RN() < 0.5 ? 1 : -1, steer: (RN() - 0.5) * 0.24 };
    if (isCub && RN() < 0.4) sp.sport = true;
    if (!isCub && RN() < 0.5) sp.c2 = PICK([0x2a2b30, 0x30343a, 0xf0f0f0]);
    const r = RN();
    if (r < 0.2) sp.top = PICK([0x2b2d33, 0xe8e8ea, 0x1e5aa8]);
    else if (r < 0.34) sp.bag = PICK([0x2e7d32, 0xe65100, 0x1e5aa8]);
    if (!isCub && RN() < 0.2) sp.basket = PICK([0x43a047, 0xfdd835]);
    if (RN() < 0.2) sp.hang = PICK([0xf2b705, 0xe53935, 0xffffff]);
    return sp;
  }

  /* ---- đường đi: polyline bo góc + cung lùi ---- */
  function round(poly, rads) { /* bo góc bằng Bezier bậc 2 */
    const out = [poly[0]];
    for (let k = 1; k < poly.length - 1; k++) {
      const A = poly[k - 1], C = poly[k], B = poly[k + 1];
      let r = rads[k] || 0;
      if (!r) { out.push(C); continue; }
      const la = Math.hypot(A[0] - C[0], A[1] - C[1]), lb = Math.hypot(B[0] - C[0], B[1] - C[1]);
      r = Math.min(r, la * 0.5, lb * 0.5);
      const T1 = [C[0] + ((A[0] - C[0]) / la) * r, C[1] + ((A[1] - C[1]) / la) * r];
      const T2 = [C[0] + ((B[0] - C[0]) / lb) * r, C[1] + ((B[1] - C[1]) / lb) * r];
      for (let j = 0; j <= 10; j++) {
        const t = j / 10, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
        out.push([a * T1[0] + b * C[0] + c * T2[0], a * T1[1] + b * C[1] + c * T2[1]]);
      }
    }
    out.push(poly[poly.length - 1]);
    return out;
  }
  function mkPath(pts) { /* pts: {x,z,rev} — rev = đoạn kế tiếp là đi LÙI */
    const P = [];
    pts.forEach((p) => { const l = P[P.length - 1]; if (!l || Math.hypot(p.x - l.x, p.z - l.z) > 1e-3) P.push(p); else l.rev = l.rev || p.rev; });
    const d = [0];
    for (let k = 1; k < P.length; k++) d[k] = d[k - 1] + Math.hypot(P[k].x - P[k - 1].x, P[k].z - P[k - 1].z);
    const fr = P.findIndex((p) => p.rev);
    return { pts: P, d, L: d[d.length - 1], stopS: fr >= 0 ? d[fr] : null };
  }
  const segAt = (P, s) => { let k = 0; const n = P.pts.length - 2; while (k < n && s >= P.d[k + 1]) k++; return k; };
  const tanK = (P, k) => { const a = P.pts[k], b = P.pts[k + 1], l = P.d[k + 1] - P.d[k] || 1; return [(b.x - a.x) / l, (b.z - a.z) / l]; };

  function inPath(s, x0 = 56) { /* từ làn gần ngoài đường -> quẹo phải -> dừng -> lùi vào ô */
    const c = s.col, zs = s.z, sx = c.sx;
    const F = round([[x0, ZL], [c.xin, ZL], [c.xin, zs - 1]], [0, 1.5]);
    const pts = F.map((q) => ({ x: q[0], z: q[1], rev: false }));
    pts[pts.length - 1].rev = true;
    const cx = c.xin - sx;
    for (let j = 1; j <= 10; j++) {
      const f = ((j / 10) * PI) / 2;
      pts.push({ x: cx + sx * Math.cos(f), z: zs - 1 + Math.sin(f), rev: true });
    }
    pts.push({ x: c.x, z: zs, rev: true });
    return mkPath(pts);
  }
  function outPath(s) { /* từ ô -> miệng ô -> làn ra -> đường -> quẹo phải vào làn gần */
    const c = s.col, zs = s.z;
    const poly = round([[c.x, zs], [c.xout, zs], [c.xout, ZL], [-76, ZL]], [0, 0.9, 1.2]);
    return mkPath(poly.map((q) => ({ x: q[0], z: q[1], rev: false })));
  }

  /* ---- tránh va chạm ---- */
  function busy(x, win, self) { /* làn gần ngoài đường có xe sắp tới? */
    if (traffic.some((t) => t.dir < 0 && t.H.position.x > x - 2 && t.H.position.x < x + win)) return true;
    return veh.some((o) => o !== self && o.H.position.z > Z1 + 0.5 && o.H.position.x > x - 2 && o.H.position.x < x + win);
  }
  function blocker(v) { /* vật cản phía trước theo hướng DI CHUYỂN (kể cả khi lùi) */
    const p = v.H.position, mx = v.mx, mz = v.mz;
    let best = null;
    const test = (o, r, spd, reach) => {
      const dx = o.x - p.x, dz = o.z - p.z, al = dx * mx + dz * mz;
      if (al <= 0.05) return;
      const lat = Math.abs(dx * mz - dz * mx);
      if (al > reach + r || lat > 0.55 + r) return;
      if (!best || al - r < best.d) best = { d: al - r, s: spd };
    };
    traffic.forEach((a) => test(a.H.position, a.r, Math.max(0, a.dir * a.v * mx), 3.6));
    veh.forEach((o) => {
      if (o === v) return;
      test(o.H.position, 0.45, Math.max(0, o.speed * (o.mx * mx + o.mz * mz)), o.id < v.id ? 3.2 : 1.9); /* xe đến trước được ưu tiên */
    });
    custs.forEach((c) => { if (!c.leaving && c.pop > 0.5) test(c.g.position, 0.25, 0, 2.2); }); /* nhường người đi bộ */
    return best;
  }

  /* ---- cập nhật 1 xe ---- */
  function updVeh(v, dt) {
    const P = v.path, p = v.H.position;
    if (v.RG) v.RG.visible = showStaff;
    if (v.hold > 0) { v.hold -= dt; v.speed = 0; return; }
    /* xe ra: chờ làn đường vắng rồi mới xuất phát */
    if (v.kind === "out" && !v.released) {
      if (busy(v.slot.col.xout, 22, v)) { v.speed = 0; return; }
      v.released = true;
    }
    const k = segAt(P, v.s), tk = tanK(P, k), rev = P.pts[k].rev;
    v.mx = tk[0]; v.mz = tk[1];
    /* tốc độ mục tiêu: đường 5.8, sân 2.6, lùi 1.4, chậm khi vào cua */
    let vt = rev ? 1.9 : p.z > Z1 + 0.9 ? 7 : 3.4;
    if (!rev) {
      const t2 = tanK(P, segAt(P, Math.min(P.L - 0.01, v.s + 1.6)));
      vt = Math.min(vt, Math.max(2.2, 7 - Math.abs(ad(Math.atan2(tk[0], tk[1]), Math.atan2(t2[0], t2[1]))) * 5.5));
    }
    const rem = P.L - v.s;
    if (v.kind === "in") vt = Math.min(vt, 0.25 + rem * 1.4);
    /* dừng ngắn trước khi lùi */
    if (v.kind === "in" && !v.stopDone) {
      const rs = P.stopS - v.s;
      if (rs < 0.06 && v.speed < 0.6) { v.stopDone = true; v.hold = 0.25; v.speed = 0; v.s = P.stopS; return; }
      vt = Math.min(vt, 0.2 + Math.max(0, rs) * 1.6);
    }
    /* cổng ra đường: chờ nếu có xe tới (các hàng phía trong còn đủ chỗ phanh) */
    if (v.kind === "out" && !v.cleared) {
      const zStop = Z1 - 0.3;
      if (p.z > zStop + 0.4) v.cleared = true;
      else if (v.mz > 0.5 && p.z < zStop - 0.3 && busy(v.slot.col.xout, 14, v)) vt = Math.min(vt, Math.max(0, zStop - p.z) * 1.8);
    }
    /* vật cản */
    let b = null;
    if (v.ghost > 0) v.ghost -= dt; else b = blocker(v);
    if (b) vt = Math.min(vt, Math.max(0, b.d - 1.0) * 1.6 + b.s * 0.9);
    v.speed += Math.max(-7 * dt, Math.min(4.5 * dt, vt - v.speed));
    v.bt = b && v.speed < 0.05 ? v.bt + dt : 0;
    if (v.bt > 4) { v.ghost = 2.5; v.bt = 0; } /* chống kẹt vĩnh viễn */
    v.s = Math.min(P.L, v.s + v.speed * dt);
    if (v.kind === "in" && !v.stopDone && v.s > P.stopS) v.s = P.stopS;
    /* vị trí + hướng */
    const k3 = segAt(P, v.s), a = P.pts[k3], bb = P.pts[k3 + 1], sl = P.d[k3 + 1] - P.d[k3] || 1, u = Math.min(1, (v.s - P.d[k3]) / sl);
    p.x = a.x + (bb.x - a.x) * u;
    p.z = a.z + (bb.z - a.z) * u;
    p.y = gy(p.z);
    const t3 = tanK(P, k3), r3 = P.pts[k3].rev;
    const ty = r3 ? Math.atan2(-t3[0], -t3[1]) : Math.atan2(t3[0], t3[1]);
    const y0 = v.yaw;
    v.yaw = turn(v.yaw, ty, Math.min(1, dt * 10));
    const w = ad(y0, v.yaw) / Math.max(dt, 1e-4);
    v.H.rotation.y = v.yaw;
    /* nghiêng xe khi cua; khi lùi vào ô thì dần tựa chân chống */
    let lt = 0;
    if (!r3) lt = Math.max(-0.28, Math.min(0.28, -w * 0.05 * Math.min(1, v.speed / 3)));
    else if (v.kind === "in") lt = v.sp.s * 0.1 * Math.max(0, 1 - (P.L - v.s) / 2.2);
    v.lean += (lt - v.lean) * Math.min(1, dt * 5);
    v.B.rotation.z = v.lean;
    /* kết thúc */
    if (v.kind === "out") {
      if (v.s > 3.2 && v.slot.state === "leaving") { v.slot.state = "empty"; v.slot.H = null; v.slot.B = null; }
      if (v.s >= P.L - 0.01) { v.dead = true; scene.remove(v.H); disposeObj(v.H); }
    } else if (v.s >= P.L - 0.02) {
      v.dead = true;
      park(v);
    }
  }

  /* xe vào đỗ xong: người lái xuống xe -> thành khách đi mua hàng */
  function park(v) {
    const s = v.slot;
    v.B.remove(v.RG);
    disposeObj(v.RG);
    s.jit = (RN() - 0.5) * 0.08;
    parkAt(s, { H: v.H, B: v.B });
    const c = newCust(v.shirt);
    s.owner = c;
    plan(c, s.ex, s.z, s);
  }
  /* khách quay lại xe: lên xe, chạy ra */
  function mount(s, c) {
    const RG = new THREE.Group();
    rider(RG, c.shirt);
    s.B.add(RG);
    s.state = "leaving";
    s.owner = null;
    veh.push({
      id: ++VID, kind: "out", H: s.H, B: s.B, RG, sp: s.sp, slot: s, path: outPath(s),
      s: 0, speed: 0, hold: 0.3, yaw: s.H.rotation.y, lean: s.B.rotation.z, mx: 0, mz: 0,
      bt: 0, ghost: 0, released: false, cleared: false, shirt: c.shirt,
    });
  }
  /* xe mới chạy từ đường lớn vào ô trống */
  function ride(s, x0) {
    s.state = "reserved";
    const sp = randSpec(), bike = buildBike(sp, bikeSeq++), shirt = PICK(SHIRT);
    const RG = new THREE.Group();
    rider(RG, shirt);
    bike.B.add(RG);
    s.sp = sp;
    const path = inPath(s, x0);
    bike.H.position.set(path.pts[0].x, gy(ZL), ZL);
    bike.H.rotation.y = -PI / 2;
    veh.push({
      id: ++VID, kind: "in", H: bike.H, B: bike.B, RG, sp, slot: s, path,
      s: 0, speed: 7, hold: 0, yaw: -PI / 2, lean: 0, mx: -1, mz: 0,
      bt: 0, ghost: 0, stopDone: false, shirt,
    });
  }
  const roadOK = () =>
    veh.length < 5 &&
    !traffic.some((t) => t.dir < 0 && t.H.position.x > 46 && t.H.position.x < 66) &&
    !veh.some((v) => v.H.position.x > 44 && v.H.position.z > Z1 + 1);

  /* ---------- sinh khách: lái xe tới / lấy xe đang đỗ ra về / đi bộ ---------- */
  function spawn() {
    const free = SLOTS.filter((s) => s.state === "empty");
    const idle = SLOTS.filter((s) => s.state === "parked" && !s.owner);
    const r = RN();
    if (free.length && r < 0.78 && roadOK()) return ride(PICK(free));
    if (idle.length && r < 0.95) {
      const s = PICK(idle), c = newCust();
      s.owner = c;
      return plan(c, s.ex, s.z, s);
    }
    plan(newCust(), DX + (RN() - 0.5) * 5, Z1 - 0.5, null);
  }

   /* ============ NÃO KHÁCH HÀNG (thay plan + stepCust cũ) ============ */
  const NAV = () => window.dxNav;
  const rnd = (a, b) => a + RN() * (b - a);
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  const wpick = (a, f) => {
    let r = RN() * a.reduce((s, x) => s + f(x), 0);
    for (const x of a) if ((r -= f(x)) <= 0) return x;
    return a[a.length - 1];
  };
  let CID = 0;
  const CQ = {}; /* mã quầy thu ngân → hàng chờ */
  const alive = (c) => custs.indexOf(c) >= 0;
  const SPOT_W = { shelf: 1.3, produce: 1.2, cold: 1, freezer: 0.8, rice: 0.6, display: 0.5 };
  const MISS = [
    { k: "quick", w: 3, n: [1, 2], pace: 1.15, dw: [0.5, 1.1], pat: [9, 16] },
    { k: "normal", w: 4, n: [3, 5], pace: 1.0, dw: [0.9, 1.8], pat: [16, 28] },
    { k: "browse", w: 2, n: [2, 4], pace: 0.82, dw: [1.6, 3.0], pat: [14, 24] },
  ];
  const W2 = (it, lx, lz) => {
    const c = Math.cos(it.rot), s = Math.sin(it.rot);
    return [it.pos[0] + lx * c + lz * s, it.pos[1] - lx * s + lz * c];
  };
  const armOf = (n) => 0.55 * ((n.s.look && n.s.look.armRatio) || 1) + 0.01;
  const prop = (p, w, h, d, m, x, y, z) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.castShadow = true;
    p.add(o);
    return o;
  };
  const faceTo = (n, f, dt) => {
    const p = n.g.position;
    n.g.rotation.y = turn(n.g.rotation.y, Math.atan2(f[0] - p.x, f[1] - p.z), Math.min(1, dt * 6));
  };

  /* ---- giỏ / túi ---- */
  function mkBasket(n) {
    const g = new THREE.Group(), a = armOf(n), bm = M(0xe53935, 0.6), hm = M(0xdddddd, 0.4);
    prop(g, 0.3, 0.02, 0.2, bm, 0, -0.07, 0);
    [-1, 1].forEach((s) => {
      prop(g, 0.3, 0.14, 0.015, bm, 0, 0, s * 0.1);
      prop(g, 0.015, 0.14, 0.2, bm, s * 0.15, 0, 0);
      prop(g, 0.012, 0.1, 0.012, hm, s * 0.1, 0.1, 0);
    });
    prop(g, 0.2, 0.012, 0.012, hm, 0, 0.15, 0);
    g.position.set(0, -a - 0.12, 0.03);
    g.rotation.x = 0.28;
    g.visible = false;
    n.aL.add(g);
    n.bk = g;
    n.bki = 0;
  }
  function mkBag(n) {
    const g = new THREE.Group(), a = armOf(n);
    prop(g, 0.2, 0.28, 0.12, M(0xd7b98a, 0.85), 0, 0, 0);
    prop(g, 0.08, 0.02, 0.125, M(0xc2a173, 0.85), 0, 0.15, 0);
    g.position.set(0, -a - 0.16, 0.03);
    g.rotation.x = 0.28;
    g.visible = false;
    n.aL.add(g);
    n.bag = g;
  }
  function addItem(n) {
    if (!n.bk) return;
    n.items++;
    if (n.bki >= 9) return;
    const o = prop(n.bk, 0.07, 0.1, 0.06, M(PICK(SHIRT), 0.6), -0.08 + (n.bki % 3) * 0.08, 0.02 + Math.floor(n.bki / 3) * 0.06, (RN() - 0.5) * 0.06);
    o.rotation.y = RN() * 3;
    n.bki++;
  }

  /* ---- bong bóng lời nói (dùng tag() có sẵn, gắn vào đầu nhân vật) ---- */
  function killBub(n) {
    if (!n.bub) return;
    n.g.remove(n.bub);
    if (n.bub.material.map) n.bub.material.map.dispose();
    n.bub.material.dispose();
    n.bub = null;
  }
  function say(n, txt, dur = 2.4) {
    killBub(n);
    const s = tag(txt, 0, 0, 0, 1.3, 0);
    scene.remove(s);
    n.g.add(s);
    s.position.set(0, 2.15, 0);
    n.bub = s;
    n.sayT = dur;
  }

  /* ---- kệ → chỗ đứng ---- */
  function spotsOf(it) {
    const out = [], sides = it.sides === 2 ? [1, -1] : [1], half = Math.max(0.2, it.size[1] / 2 - 0.45);
    sides.forEach((s) => [-0.7, 0, 0.7].forEach((f) => {
      const p = W2(it, s * (it.size[0] / 2 + 0.7), f * half), q = W2(it, s * (it.size[0] / 2 - 0.05), f * half);
      out.push({ x: p[0], z: p[1], face: q });
    }));
    return out;
  }
  function taken(n, x, z) {
    return custs.some((o) => o !== n && !o.leaving && (dist(o.g.position.x, o.g.position.z, x, z) < 0.7 || (o.res && dist(o.res.x, o.res.z, x, z) < 0.8))) ||
      npcs.some((o) => dist(o.g.position.x, o.g.position.z, x, z) < 0.7);
  }
  function chooseSpot(n, sh) {
    const p = n.g.position, N = NAV();
    let best = null, bd = 1e9;
    spotsOf(sh).forEach((s) => {
      if (Math.abs(s.x) > hw - 0.5 || Math.abs(s.z) > hd - 0.9) return;
      if (N && N.blocked(s.x, s.z, 0.24)) return;
      if (taken(n, s.x, s.z)) return;
      const d = dist(s.x, s.z, p.x, p.z);
      if (d < bd) { bd = d; best = s; }
    });
    n.res = best ? { x: best.x, z: best.z } : null;
    return best;
  }

  /* ---- danh sách mua sắm ---- */
  function buildList(n) {
    const its = ShelfRegistry.all().filter((i) => SPOT_W[i.type]);
    if (!its.length) return [];
    const k = Math.min(its.length, n.ms.n[0] + Math.floor(RN() * (n.ms.n[1] - n.ms.n[0] + 1))),
      pool = its.slice(), pick = [];
    while (pick.length < k && pool.length) {
      const ws = pool.map((i) => SPOT_W[i.type] * (n.pref[i.type] || 1));
      let r = RN() * ws.reduce((a, b) => a + b, 0), j = 0;
      while (j < ws.length - 1 && (r -= ws[j]) > 0) j++;
      pick.push(pool.splice(j, 1)[0]);
    }
    const nn = (arr, st) => { /* gần nhất trước */
      const a = arr.slice(), r = [];
      let cur = st;
      while (a.length) {
        let bi = 0, bd = 1e9;
        a.forEach((i, x) => { const d = dist(i.pos[0], i.pos[1], cur[0], cur[1]); if (d < bd) { bd = d; bi = x; } });
        const i = a.splice(bi, 1)[0];
        r.push(i);
        cur = i.pos;
      }
      return r;
    };
    const isCold = (i) => i.type === "cold" || i.type === "freezer",
      A = nn(pick.filter((i) => !isCold(i)), [DX, hd - 1]),
      B = nn(pick.filter(isCold), A.length ? A[A.length - 1].pos : [DX, hd - 1]); /* hàng mát/đông lấy cuối */
    return A.concat(B).map((i) => ({ code: i.code, tries: 0 }));
  }

  /* ---- thu ngân ---- */
  const manned = (it) => StaffRegistry.all().some((s) => s.routine && s.routine.type === "station" && s.routine.code === it.code);
  function queSpot(it, k) {
    const p = W2(it, it.size[0] / 2 + 0.55 + k * 0.62, -it.size[1] * 0.1), f = W2(it, 0, -it.size[1] * 0.1);
    return { x: p[0], z: p[1], face: f };
  }
  function qcap(it) {
    const N = NAV();
    let k = 0;
    while (k < 6) {
      const s = queSpot(it, k);
      if (N && N.blocked(s.x, s.z, 0.22)) break;
      k++;
    }
    return Math.max(1, k);
  }
  const est = (c) => 2.4 + (c.items || 0) * 0.45;
  function qWait(code, until) {
    let w = 0;
    for (const c of (CQ[code] || []).filter(alive)) { if (c === until) break; w += est(c); }
    return w;
  }
  function pickCashier(n, skip) {
    let best = null;
    ShelfRegistry.all().forEach((it) => {
      if (it.type !== "cashier" || it.code === skip) return;
      const sp = queSpot(it, Math.min((CQ[it.code] || []).filter(alive).length, qcap(it) - 1)),
        e = qWait(it.code) + dist(n.g.position.x, n.g.position.z, sp.x, sp.z) / n.spd + (manned(it) ? 0 : 12);
      if (!best || e < best.e) best = { it, e };
    });
    return best;
  }
  function joinQ(n, it) {
    n.qc = it.code;
    (CQ[it.code] = (CQ[it.code] || []).filter(alive)).push(n);
    n.nv = null;
  }
  function leaveQ(n) {
    const Q = CQ[n.qc];
    if (Q) { const i = Q.indexOf(n); if (i >= 0) Q.splice(i, 1); }
    n.qc = null;
  }

  /* ---- di chuyển: đường vòng qua kệ + né người ---- */
  function step(n, wx, wz, dt, dT) {
    const p = n.g.position, ox = p.x, oz = p.z, dx = wx - p.x, dz = wz - p.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    let sx = 0, sz = 0, fr = 1;
    const probe = (q) => {
      const rx = p.x - q.x, rz = p.z - q.z, dd = Math.hypot(rx, rz);
      if (dd < 0.01 || dd > 0.8) return;
      const w = (0.8 - dd) / 0.8;
      sx += (rx / dd) * w;
      sz += (rz / dd) * w;
      if ((-rx * ux - rz * uz) / dd > 0.55 && dd < 0.85) fr = Math.min(fr, Math.max(0.15, (dd - 0.38) / 0.45)); /* có người phía trước */
    };
    if (n.ghost > 0) n.ghost -= dt;
    else {
      custs.forEach((o) => { if (o !== n && !o.leaving && o.pop > 0.4) probe(o.g.position); });
      npcs.forEach((o) => probe(o.g.position));
    }
    const sk = Math.min(1, dT / 0.6), sd = fr < 0.75 ? 0.9 : 0; /* sd: lách sang bên phải, mọi người cùng quy ước nên không đối đầu */
    let vx = ux + sx * 1.3 * sk - uz * sd, vz = uz + sz * 1.3 * sk + ux * sd;
    const vl = Math.hypot(vx, vz) || 1;
    vx /= vl;
    vz /= vl;
    const sp = n.spd * fr * (0.3 + 0.7 * Math.min(1, dT / 0.8)), len = Math.min(sp * dt, d);
    p.x += vx * len;
    p.z += vz * len;
    if (p.z < hd - 0.8 && NAV()) NAV().pushOut(p, 0.2);
    n.g.rotation.y = turn(n.g.rotation.y, Math.atan2(vx, vz), Math.min(1, dt * 8));
    const mv = Math.hypot(p.x - ox, p.z - oz);
    n.mode = mv > 0.004 ? "walk" : "idle";
    if (dT > 0.45 && mv < n.spd * dt * 0.12) n.stk += dt; else n.stk = Math.max(0, n.stk - dt);
    if (n.stk > 1.8) { n.stk = 0; n.rep = true; n.ghost = 0.9; } /* kẹt → tìm đường mới, tạm thời xuyên qua người */
  }
  /* trả về true khi tới nơi (hoặc không có đường tới) */
  function go(n, tx, tz, dt, nav = true, tol = 0.14) {
    const p = n.g.position, d0 = dist(tx, tz, p.x, p.z), N = NAV();
    if (d0 < tol) return true;
    let wx = tx, wz = tz;
    if (nav && N && p.z < hd - 0.45 && tz < hd - 0.45 && !N.clear(p.x, p.z, tx, tz, 0.24)) {
      const now = performance.now();
      let s = n.nv;
      if (!s || dist(s.gx, s.gz, tx, tz) > 0.3 || now - s.t > 2200 || n.rep) {
        s = n.nv = { gx: tx, gz: tz, t: now, path: N.path(p.x, p.z, tx, tz) || [], i: 0 };
        n.rep = false;
      }
      if (!s.path.length) return true; /* bị bịt kín hoàn toàn */
      while (s.i < s.path.length && dist(s.path[s.i][0], s.path[s.i][1], p.x, p.z) < 0.22) s.i++;
      if (s.i < s.path.length) { wx = s.path[s.i][0]; wz = s.path[s.i][1]; }
    } else n.nv = null;
    step(n, wx, wz, dt, d0);
    return dist(tx, tz, p.x, p.z) < tol;
  }

  /* ---- lập kế hoạch: khách mới bước vào đời ---- */
  function plan(c, sx, sz, slot) {
    c.id = ++CID;
    c.slot = slot || null;
    c.ms = wpick(MISS, (m) => m.w);
    c.spd = c.v * c.ms.pace * rnd(0.92, 1.08);
    c.pat = rnd(c.ms.pat[0], c.ms.pat[1]);
    c.pref = {};
    Object.keys(SPOT_W).forEach((k) => (c.pref[k] = rnd(0.35, 1.8)));
    c.noBuy = c.ms.k === "browse" && RN() < 0.15;
    c.items = 0; c.qt = 0; c.sw = 0; c.rk = 0; c.hy = 0; c.hyT = 0; c.reachT = 0; c.stk = 0; c.cool = 0; c.ghost = 0; c.sayT = 0; c.chk = 0; c.wait = 0;
    c.list = buildList(c);
    const gx = DX + rnd(-0.9, 0.9);
    if (slot) {
      c.g.position.set(slot.ex, 0, slot.z);
      c.wp = [[slot.ex, hd + 0.6], [gx, hd + 0.6], [gx, hd - 1.0]]; /* đi dọc lối giữa hai hàng xe, không xuyên xe đỗ */
    } else {
      c.g.position.set(DX + rnd(-1.2, 1.2), 0, sz);
      c.wp = [[gx, hd + 0.6], [gx, hd - 1.0]];
    }
    c.g.rotation.y = Math.atan2(c.wp[0][0] - c.g.position.x, c.wp[0][1] - c.g.position.z);
    mkBasket(c);
    mkBag(c);
    c.st = "enter";
    c.g.scale.setScalar(c.sc * 0.01);
    scene.add(c.g);
    custs.push(c);
  }

  /* ---- bộ não: máy trạng thái ---- */
  function think(n, dt, t) {
    const p = n.g.position;
    switch (n.st) {
      case "enter": {
        const w = n.wp[0];
        if (!w) { n.st = "next"; if (n.bk) n.bk.visible = true; break; } /* cầm giỏ ở cửa */
        if (go(n, w[0], w[1], dt, false)) n.wp.shift();
        break;
      }
      case "next": {
        if (n.cool > 0) { n.cool -= dt; n.hyT = Math.sin(t * 1.3 + n.id) * 0.4; break; }
        const it = n.list.shift();
        if (!it) { n.st = n.items > 0 ? "toq" : "leave"; break; }
        const sh = ShelfRegistry.get(it.code);
        if (!sh) break; /* kệ đã bị xoá → bỏ qua */
        const sp = chooseSpot(n, sh);
        if (!sp) { if (it.tries++ < 2) { n.list.push(it); n.cool = 1.2; } break; } /* kệ đang chen chúc → ghé lại sau */
        n.tgt = { sh, sp, it };
        n.st = "goto";
        n.nv = null;
        break;
      }
      case "goto": {
        const T = n.tgt, sh = ShelfRegistry.get(T.it.code);
        if (!sh) { n.res = null; n.st = "next"; break; }
        if (dist(p.x, p.z, T.sp.x, T.sp.z) < 2.2 && taken(n, T.sp.x, T.sp.z)) { /* chỗ đứng bị người khác chiếm → đổi chỗ */
          const s2 = chooseSpot(n, sh);
          if (s2) { T.sp = s2; n.nv = null; }
          else { n.res = null; if (T.it.tries++ < 2) n.list.push(T.it); n.cool = 1; n.st = "next"; }
          break;
        }
        if (go(n, T.sp.x, T.sp.z, dt, true, 0.12)) {
          if (dist(p.x, p.z, T.sp.x, T.sp.z) > 0.7) { n.res = null; n.st = "next"; break; }
          n.st = "look";
          n.wait = 0;
          n.dur = rnd(n.ms.dw[0], n.ms.dw[1]);
          n.willPick = !n.noBuy && RN() < (n.ms.k === "browse" ? 0.75 : 0.96);
          n.picked = false;
        }
        break;
      }
      case "look": {
        faceTo(n, n.tgt.sp.face, dt);
        n.wait += dt;
        const u = n.wait / n.dur;
        n.hyT = Math.sin(t * 1.2 + n.id) * 0.5 * (u < 0.5 ? 1 : 0.3); /* đảo mắt dọc kệ */
        if (u > 0.5 && u < 0.9) n.reachT = 1; /* với tay lấy hàng */
        if (u > 0.68 && !n.picked) { n.picked = true; if (n.willPick) addItem(n); }
        if (u >= 1) { n.res = null; n.st = "next"; n.cool = 0.15; }
        break;
      }
      case "toq": {
        const b = pickCashier(n);
        if (!b) { n.st = "leave"; break; }
        joinQ(n, b.it);
        n.st = "queue";
        break;
      }
      case "queue": {
        const it = ShelfRegistry.get(n.qc);
        if (!it) { n.qc = null; n.st = "toq"; break; }
        const Q = (CQ[n.qc] = (CQ[n.qc] || []).filter(alive));
        let idx = Q.indexOf(n);
        if (idx < 0) { Q.push(n); idx = Q.length - 1; }
        const sp = queSpot(it, Math.min(idx, qcap(it) - 1)), arrived = go(n, sp.x, sp.z, dt, true, idx === 0 ? 0.1 : 0.2);
        n.qt += dt;
        if (arrived) { faceTo(n, sp.face, dt); n.hyT = Math.sin(t * 0.7 + n.id) * 0.35; }
        if (idx === 0 && arrived) { n.st = "serve"; n.wait = 0; break; }
        if (idx > 0 && n.qt > n.pat * 0.45 && n.sw < 2 && (n.chk += dt) > 1.5) { /* quầy khác nhanh hơn rõ rệt → đổi hàng */
          n.chk = 0;
          const alt = pickCashier(n, n.qc);
          if (alt && alt.e + 3 < qWait(n.qc, n)) { leaveQ(n); joinQ(n, alt.it); n.sw++; say(n, "Đổi quầy"); break; }
        }
        if (idx > 0 && n.qt > n.pat && !n.said) { n.said = true; say(n, "Đợi lâu quá…"); }
        if (n.qt > n.pat * 1.6) { /* hết kiên nhẫn → bỏ giỏ ra về */
          leaveQ(n);
          if (n.bk) n.bk.visible = false;
          n.items = 0;
          say(n, "Thôi để lần sau");
          n.st = "leave";
        }
        break;
      }
      case "serve": {
        const it = ShelfRegistry.get(n.qc);
        if (!it) { n.st = "toq"; break; }
        faceTo(n, [it.pos[0], it.pos[1]], dt);
        n.wait += dt;
        const k = manned(it) ? 1 : 1.8, place = (0.7 + 0.22 * n.items) * k, pay = 1.5 * k;
        if (n.wait < place) n.reachT = 1; /* đặt hàng lên băng chuyền */
        else if (n.wait < place + pay) n.reachT = 0.6; /* quẹt thẻ */
        else {
          leaveQ(n);
          if (n.bk) n.bk.visible = false;
          if (n.bag) n.bag.visible = n.items > 0; /* giỏ → túi giấy */
          if (RN() < 0.3) say(n, "Cảm ơn!");
          n.st = "leave";
        }
        break;
      }
      case "leave": {
        if (!n.lw) {
          const gx = DX + rnd(-0.8, 0.8);
          n.res = null;
          n.lw = [[gx, hd - 1.0, true], [gx, hd + 0.6, false]];
          if (n.slot) n.lw.push([n.slot.ex, hd + 0.6, false], [n.slot.ex, n.slot.z, false, true]);
          else n.lw.push([DX + rnd(-1.2, 1.2), Z1 - 0.4, false, true]);
        }
        const w = n.lw[0];
        if (!w) break;
        if (go(n, w[0], w[1], dt, w[2])) {
          if (w[3]) { n.leaving = true; n.mode = "idle"; if (n.slot) mount(n.slot, n); } /* tới xe: lên xe chạy ra */
          else n.lw.shift();
        }
        break;
      }
    }
  }
  /* sau pose(): tay cầm giỏ/túi, với tay, quay đầu nhìn quanh */
  function upper(n, dt, t) {
    n.rk += (n.reachT - n.rk) * (1 - Math.exp(-dt * 9));
    n.hy += (n.hyT - n.hy) * (1 - Math.exp(-dt * 5));
    if ((n.bk && n.bk.visible) || (n.bag && n.bag.visible)) { n.aL.rotation.x = -0.28; n.aL.rotation.z = 0.05; }
    if (n.rk > 0.01) {
      n.aR.rotation.x = -1.25 * n.rk + Math.sin(t * 9) * 0.05 * n.rk;
      n.b.rotation.x += 0.1 * n.rk;
    }
    n.head.rotation.y = n.hy;
  }
  function stepCust(n, dt, t) {
    if (n.pop < 1 && !n.leaving) { n.pop = Math.min(1, n.pop + dt * 3); n.g.scale.setScalar(n.sc * Math.max(0.01, n.pop)); }
    if (n.sayT > 0 && (n.sayT -= dt) <= 0) killBub(n);
    n.reachT = 0;
    n.hyT = 0;
    n.mode = "idle";
    if (n.leaving) {
      n.out += dt * 3;
      n.g.scale.setScalar(n.sc * Math.max(0.01, 1 - n.out));
      if (n.out >= 0.9) killBub(n);
    } else think(n, dt, t);
    pose(n, dt, t);
    upper(n, dt, t);
  }

    /* ============ DỜI CỬA ============ */
  function layout() {
        buildGraph();   /* <-- thêm dòng này */

    const off = DX - BASE;
    veh.splice(0).forEach((v) => {
      scene.remove(v.H);
      disposeObj(v.H);
      v.slot.state = "empty";
      if (v.kind === "out") { v.slot.H = null; v.slot.B = null; }
    });
    custs.splice(0).forEach((c) => { scene.remove(c.g); disposeChar(c); });
    SLOTS.forEach((s) => (s.owner = null));
    COLS.forEach((c) => ["x", "ex", "xin", "xm", "xout"].forEach((k) => (c[k] = c.b[k] + off)));
    SLOTS.forEach((s) => {
      s.ex = s.col.ex;
      if (s.state === "parked" && s.H) s.H.position.x = s.col.x;
    });
    YD.position.x = off;
    TG.forEach(([t, bx]) => (t.position.x = bx + off));
    DG.position.x = DX;
    const seg = (m, a, b) => {
      m.visible = b - a > 0.2;
      m.scale.x = Math.max(0.01, b - a);
      m.position.x = (a + b) / 2;
    };
    seg(curbs[0], -10.2, off - 2.5);
    seg(curbs[1], off + 8, 10.2);
  }
  window.moveDoor = (x) => {
    const dx = clampDoor(x);
    STORE.door = [dx - DOOR_W / 2, dx + DOOR_W / 2];
    DX = dx;
    try { localStorage.setItem(DOOR_KEY, JSON.stringify({ dx })); } catch (e) {}
    window.rebuildFront && window.rebuildFront();
    layout();
    spawnT = 1;
  };
  layout(); /* áp vị trí cửa đã lưu */

  /* ---------- vòng cập nhật (bọc ren.render như các patch trước) ---------- */
  /* 2 xe đến ngay từ đầu (xuất phát gần hơn) để thấy hành động lái xe vào sớm */
  SLOTS.filter((s) => s.state === "empty").sort(() => RN() - 0.5).slice(0, 2).forEach((s, i) => ride(s, 12 + i * 10));
  let last = performance.now(), spawnT = 1.5;
  const _render = ren.render.bind(ren);
  ren.render = (s, c) => {
    const nw = performance.now(), dt = Math.min(0.05, (nw - last) / 1000), t = nw / 1000;
    last = nw;
    traffic.forEach((v) => {
      v.H.position.x += v.dir * v.v * dt;
      if (v.dir > 0 && v.H.position.x > 70) v.H.position.x = -70;
      if (v.dir < 0 && v.H.position.x < -70) v.H.position.x = 70;
    });
    if ((spawnT -= dt) <= 0 && custs.length + veh.filter((v) => v.kind === "in").length < 12) { spawn(); spawnT = 1 + RN() * 2; }
    for (let i = veh.length - 1; i >= 0; i--) {
      updVeh(veh[i], dt);
      if (veh[i].dead) veh.splice(i, 1);
    }
    let near = false;
    const chk = (q) => { if (Math.abs(q.x - DX) < 3.3 && q.z > hd - 2.6 && q.z < hd + 3) near = true; };
    for (let i = custs.length - 1; i >= 0; i--) {
      const n = custs[i];
      n.g.visible = showStaff;
      stepCust(n, dt, t);
      if (n.leaving && n.out >= 1) { scene.remove(n.g); disposeChar(n); custs.splice(i, 1); }
      else if (!n.leaving) chk(n.g.position);
    }
    npcs.forEach((n) => chk(n.g.position));
    doorO = Math.min(1, Math.max(0, doorO + (near ? 1 : -1) * dt * 0.9));
    const e = doorO * doorO * (3 - 2 * doorO); /* mượt đầu/cuối */
        pL.position.x = -PW / 2 - e * PW;
    pR.position.x = PW / 2 + e * PW;
    _render(s, c);
  };
})();

/* ============ PATCH: SỬA VỊ TRÍ CỬA + CAMERA BAY TỚI CỬA (IIFE, chỉ thêm mới) ============ */
(() => {
  const sp = document.querySelector("#signp"); /* bảng bảng hiệu (loại trừ lẫn nhau) */
  const hd = STORE.D / 2;
  const EXT = 16;  /* bề ngang cần thấy (m) */
  const PH = 1.0;  /* góc nhìn */
  const STEP = 0.5;

  const css = document.createElement("style");
    css.textContent = `#doorp{left:calc(50% + 100px);top:128px;transform:translateX(0);width:244px;display:none;z-index:4}
#doorp .r{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}
#doorp .r>span{color:var(--mute);font-size:12px}
#doorp .stp{margin-left:0}
#doorp .stp button{font-size:16px;line-height:1}
#doorp b{font-variant-numeric:tabular-nums;min-width:52px;text-align:center;display:inline-block}
#doorp .r.c{flex-direction:column;align-items:stretch}
#doorp .r.c .seg{display:flex}
#doorp .r.c .seg button{flex:1;padding:6px 4px;font-size:12px}
#doorp .hd{display:flex;align-items:center;justify-content:space-between;gap:8px}
#doorp .hd h4{margin:0}
#doorp .hd .cls,#doorp .tgl{-webkit-appearance:none;appearance:none;border:0;outline:0;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s ease,box-shadow .15s ease,background .15s ease}
/* nút Thu gọn: nổi khối rõ ràng */
#doorp .hd .cls{padding:5px 12px;font-size:12px;font-weight:600;line-height:1.3;color:var(--ink,#1d1d1f);background:rgba(255,255,255,.92);border-radius:999px;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 0 0 1px rgba(0,0,0,.12),0 3px 8px rgba(0,0,0,.18)}
#doorp .hd .cls:hover{background:#fff;transform:translateY(-1px);box-shadow:0 1px 0 #fff inset,0 0 0 1px rgba(0,0,0,.14),0 5px 12px rgba(0,0,0,.22)}
#doorp .hd .cls:active{transform:translateY(0);box-shadow:0 0 0 1px rgba(0,0,0,.14),0 1px 3px rgba(0,0,0,.2)}
@media (prefers-color-scheme:dark){#doorp .hd .cls{color:#f5f5f7;background:rgba(255,255,255,.16);box-shadow:0 1px 0 rgba(255,255,255,.18) inset,0 0 0 1px rgba(255,255,255,.22),0 3px 8px rgba(0,0,0,.5)}#doorp .hd .cls:hover{background:rgba(255,255,255,.24)}}
/* nút mở (khi thu gọn): cũng nổi khối */
#doorp .tgl{display:none;width:100%;padding:2px 4px;font-size:13px;font-weight:600;line-height:1.4;white-space:nowrap;background:transparent}
#doorp.min{width:auto}
#doorp.min .body,#doorp.min .hd{display:none}
#doorp.min .tgl{display:block}
@media (max-width:1180px){#doorp{left:auto;right:12px;top:172px;transform:none}}
@media (max-width:720px){
#doorp{left:8px;right:8px;top:auto;width:auto;bottom:calc(52px + env(safe-area-inset-bottom,0px))}
#doorp.min{left:auto;right:8px;width:auto;bottom:calc(100px + env(safe-area-inset-bottom,0px))}}`;
  document.head.appendChild(css);

  const pnl = document.createElement("div");
  pnl.className = "panel";
  pnl.id = "doorp";
  $("#store").appendChild(pnl);

  let open = false;
  const syncOpen = () => pnl.classList.toggle("min", !open);
  const curX = () => (STORE.door[0] + STORE.door[1]) / 2;

  function drawPanel() {
    const x = curX(),
      on = (v) => (Math.abs(x - v) < 0.01 ? "on" : "");
    pnl.innerHTML = `<button class="tgl" data-t="open">Sửa vị trí cửa</button>
<div class="hd"><h4>VỊ TRÍ CỬA</h4><button class="cls" data-t="close" title="Thu về nút &quot;Sửa vị trí cửa&quot;">Thu gọn</button></div>
<div class="body">
<div class="r c"><span>Chọn nhanh</span><span class="seg"><button data-p="${-DOOR_LIM}" class="${on(-DOOR_LIM)}">Bên trái</button><button data-p="0" class="${on(0)}">Ở giữa</button><button data-p="${DOOR_LIM}" class="${on(DOOR_LIM)}">Bên phải</button></span></div>
<div class="r"><span>Dịch cửa</span><span class="stp"><button data-d="-1" title="Sang trái">−</button><b>x = ${x.toFixed(1)} m</b><button data-d="1" title="Sang phải">+</button></span></div></div>`;
    syncOpen();
  }
  drawPanel();

  /* camera bay tới cửa; thu gọn thì bay về chỗ cũ (nếu chưa tự kéo/zoom) */
  let ours = null, saved = null, active = false;
  const near = (b) =>
    Math.abs(cam.r - b.r) < 0.6 && Math.abs(cam.tx - b.tx) < 0.3 &&
    Math.abs(cam.tz - b.tz) < 0.3 && Math.abs(wrap(cam.th - b.th)) < 0.1;
  function target() {
    const t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
      a = Math.min(1, camera.aspect || 1);
    return {
      th: cam.th + wrap(0 - cam.th), /* nhìn thẳng vào mặt tiền */
      ph: PH,
      r: THREE.MathUtils.clamp(EXT / (t * a), 8, cam.fit),
      tx: curX(), ty: 0.8, tz: hd + 2.5,
    };
  }
  function flyIn() {
    saved = { th: cam.th, ph: cam.ph, r: cam.r, tx: cam.tx, ty: cam.ty, tz: cam.tz };
    cam.vth = 0;
    cam.T = ours = target();
  }
  function flyBack() {
    const mine = cam.T === ours || (!cam.T && ours && near(ours));
    if (saved && mine) {
      cam.vth = 0;
      cam.T = { ...saved, th: cam.th + wrap(saved.th - cam.th) };
    }
    saved = ours = null;
  }

  pnl.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.t) { if (b.dataset.t === "close" && window.EditDial) EditDial.closePanel(); return; }
    if (b.dataset.p != null) window.moveDoor(+b.dataset.p);
    if (b.dataset.d) window.moveDoor(curX() + b.dataset.d * STEP);
    drawPanel();
    if (active) { cam.vth = 0; cam.T = ours = target(); } /* bay theo cửa mới */
  });
  pnl.addEventListener("pointerdown", (e) => e.stopPropagation());

  let shown = false;
  const _r = ren.render.bind(ren);
  ren.render = (s, c) => {
    const want = tab === "store" && !!window.EditDial && EditDial.panel === "door",
      signOpen = sp && sp.style.display === "block" && !sp.classList.contains("min");
    if (want !== shown) {
      shown = want;
      pnl.style.display = want ? "block" : "none";
      open = want;
      syncOpen();
    }
    const now = shown && open;
    if (now !== active) {
      active = now;
      active ? flyIn() : flyBack();
      if (sp) sp.style.visibility = active ? "hidden" : "";
    }
    pnl.style.visibility = signOpen ? "hidden" : ""; /* 2 bảng không đè nhau */
    _r(s, c);
  };
})();