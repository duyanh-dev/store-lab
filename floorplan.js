/* =====================================================================
   floorplan.js  –  nạp SAU script.js / shelf-ui.js / front-yard.js
   1) Tắt hoàn toàn double-tap / double-click zoom
   2) Chỉnh sửa kiểu mặt bằng cửa hàng + sơ đồ mẫu (tường ngăn, kho cửa sắt trắng)
   Không sửa logic cũ: chỉ ẩn/hiện nhóm tường gốc và thêm nhóm tường mới.
   ===================================================================== */
(() => {
  "use strict";

  /* ================= 1. TẮT DOUBLE-TAP ZOOM ================= */
  (() => {
    const st = document.createElement("style");
    st.textContent =
      "html,body,button,.btn,.chip,.seg button,.srow,.ai,.dot,.stp button,label,select,summary{touch-action:manipulation}";
    document.head.appendChild(st);
    /* meta viewport: chặn thu/phóng cả trang */
    const mv = document.querySelector('meta[name="viewport"]');
    if (mv && !/maximum-scale/.test(mv.content))
      mv.content += ", maximum-scale=1, user-scalable=no";
    /* chặn dblclick trên mọi canvas: vô hiệu handler "nhấp đúp = zoom tới quầy / bay tới điểm" */
    ["cv", "cv2", "cv3", "cv4"].forEach((id) => {
      const c = document.getElementById(id);
      if (c)
        c.addEventListener(
          "dblclick",
          (e) => {
            e.stopImmediatePropagation();
            e.preventDefault();
          },
          true,
        );
    });
    document.addEventListener(
      "dblclick",
      (e) => {
        if (!["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName))
          e.preventDefault();
      },
      true,
    );
    /* Safari iOS: chặn zoom cả trang bằng cử chỉ (pointer-events của canvas không bị ảnh hưởng) */
    ["gesturestart", "gesturechange", "gestureend"].forEach((n) =>
      document.addEventListener(n, (e) => e.preventDefault(), {
        passive: false,
      }),
    );
  })();

  /* ================= 2. MẶT BẰNG CỬA HÀNG ================= */
  const HD = STORE.D / 2,
    H = 3,
    T = 0.24,
    KEY = "store-plan-v1",
    FD = { c: (STORE.door[0] + STORE.door[1]) / 2, w: DOOR_W, kind: "door" },
    SH = (c, w = 1.2) => ({ c, w, kind: "shutter" });

  ICONS.plan =
    '<path d="M4 4h16v16H4zM4 13h9V4M13 13v7M13 17h7"/>';

  /* --- Dữ liệu sơ đồ: zones = vùng sàn; walls = tường (trục x hoặc z), open = ô cửa --- */
  const PLANS = [
    {
      id: "default",
      orig: true,
      name: "Chữ nhật + kho phía sau (gốc)",
      desc: "Mặt bằng hiện tại: khu trưng bày hình chữ nhật, kho nằm sau tường cuối, cửa sắt trắng đóng kín.",
      zones: [
        { n: "KHU TRƯNG BÀY", k: "shop", lp: [0, 0], poly: [[-7, 15], [7, 15], [7, -15], [-7, -15]] },
        { n: "KHO", k: "kho", lp: [0, -17.5], poly: [[-7.5, -15], [7.5, -15], [7.5, -20], [-7.5, -20]] },
      ],
      walls: [
        { a: [-7, 15], b: [7, 15], key: "f", open: [FD] },
        { a: [7, 15], b: [7, -15], key: "r" },
        { a: [-7, -15], b: [-7, 15], key: "l" },
        { a: [-7.5, -15], b: [7.5, -15], key: "b", open: [SH((STORE.kho[0] + STORE.kho[1]) / 2, STORE.kho[1] - STORE.kho[0])] },        { a: [-7.5, -15], b: [-7.5, -20], key: "l" },
        { a: [7.5, -15], b: [7.5, -20], key: "r" },
        { a: [-7.5, -20], b: [7.5, -20], key: "b" },
      ],
    },
    {
      id: "L-kho",
      name: "Chữ L ngược + kho dọc bên phải",
      W: 16,
      desc: "Cửa hàng rộng 16 m. Khu trưng bày chữ L ngược: chân L nhô sang phải ở cuối (khu đồ lạnh). Kho chữ nhật chạy dọc bên phải lên tới ngang mặt tiền, tường kín với khu khách. Kho có 2 cửa sắt trắng mở ngang (đóng): 1 cửa ra đường ở mặt tiền, 1 cửa thông vào khu đồ lạnh.",
      zones: [
        { n: "KHU TRƯNG BÀY (chữ L)", k: "shop", lp: [-3, 4], poly: [[-8, 15], [2, 15], [2, -6], [8, -6], [8, -15], [-8, -15]] },
        { n: "KHO (nhân viên)", k: "kho", lp: [5, 4.5], poly: [[2, 15], [8, 15], [8, -6], [2, -6]] },
        { n: "KHU ĐỒ LẠNH", k: "cold", lp: [5, -10.5], poly: [[2, -6], [8, -6], [8, -15], [2, -15]] },
      ],
      walls: [
        { a: [-8, 15], b: [2, 15], key: "f", glass: true, open: [FD] },
        { a: [2, 15], b: [8, 15], key: "f", open: [SH(5)] },
        { a: [8, 15], b: [8, -15], key: "r" },
        { a: [-8, -15], b: [8, -15], key: "b" },
        { a: [-8, -15], b: [-8, 15], key: "l" },
        { a: [2, 15], b: [2, -6], key: "i" },
        { a: [2, -6], b: [8, -6], key: "i", open: [SH(5)] },
      ],
    },
    {
      id: "kho-goc",
      name: "Kho góc sau phải",
      desc: "Kho nhỏ ở góc sau bên phải, tường ngăn hai mặt; phần còn lại là khu trưng bày liền khối.",
      zones: [
        { n: "KHU TRƯNG BÀY", k: "shop", lp: [-1, 3], poly: [[-7, 15], [7, 15], [7, -8], [2, -8], [2, -15], [-7, -15]] },
        { n: "KHO", k: "kho", lp: [4.5, -11.5], poly: [[2, -8], [7, -8], [7, -15], [2, -15]] },
      ],
      walls: [
        { a: [-7, 15], b: [7, 15], key: "f", glass: true, open: [FD] },
        { a: [7, 15], b: [7, -15], key: "r" },
        { a: [-7, -15], b: [7, -15], key: "b" },
        { a: [-7, -15], b: [-7, 15], key: "l" },
        { a: [2, -8], b: [7, -8], key: "i", open: [SH(4.5)] },
        { a: [2, -8], b: [2, -15], key: "i" },
      ],
    },
    {
      id: "U-kho",
      name: "Chữ U + kho ở giữa",
      desc: "Kho chữ nhật nằm giữa cửa hàng, khu trưng bày bao quanh thành hình chữ U; cửa kho quay về phía lối vào.",
      zones: [
        { n: "KHU TRƯNG BÀY (chữ U)", k: "shop", lp: [0, 9], poly: [[-7, 15], [7, 15], [7, -15], [2, -15], [2, 3], [-2, 3], [-2, -15], [-7, -15]] },
        { n: "KHO", k: "kho", lp: [0, -6], poly: [[-2, 3], [2, 3], [2, -15], [-2, -15]] },
      ],
      walls: [
        { a: [-7, 15], b: [7, 15], key: "f", glass: true, open: [FD] },
        { a: [7, 15], b: [7, -15], key: "r" },
        { a: [-7, -15], b: [7, -15], key: "b" },
        { a: [-7, -15], b: [-7, 15], key: "l" },
        { a: [-2, 3], b: [2, 3], key: "i", open: [SH(0)] },
        { a: [-2, 3], b: [-2, -15], key: "i" },
        { a: [2, 3], b: [2, -15], key: "i" },
      ],
    },
    {
      id: "hep-dai",
      name: "Hẹp dài + kho cuối",
      desc: "Mặt bằng nhà phố hẹp (7 m): khu trưng bày hình ống, kho ở cuối cửa hàng ngăn bằng tường ngang.",
      zones: [
        { n: "KHU TRƯNG BÀY", k: "shop", lp: [0, 3], poly: [[-3.5, 15], [3.5, 15], [3.5, -9], [-3.5, -9]] },
        { n: "KHO", k: "kho", lp: [0, -12], poly: [[-3.5, -9], [3.5, -9], [3.5, -15], [-3.5, -15]] },
      ],
      walls: [
        { a: [-3.5, 15], b: [3.5, 15], key: "f", glass: true, open: [{ c: 0, w: 3, kind: "door" }] },
        { a: [3.5, 15], b: [3.5, -15], key: "r" },
        { a: [-3.5, -15], b: [3.5, -15], key: "b" },
        { a: [-3.5, -15], b: [-3.5, 15], key: "l" },
        { a: [-3.5, -9], b: [3.5, -9], key: "i", open: [SH(0)] },
      ],
    },
  ];

  /* --- Nhận diện nhóm tường/sàn gốc (được thêm vào scene trước mặt đất `gmat`) --- */
  const gi = scene.children.findIndex((o) => o.material === gmat);
  const SHELL = scene.children
    .slice(0, gi < 0 ? 0 : gi)
    .filter((o) => !o.isLight);

  /* tường trong: hơi trong suốt để vẫn nhìn xuyên được vào bên trong */
  const WI = wallSet("i");
  WI.o.w = 0.6;
  WI.o.g = GLASS.opacity;

  /* --- Cửa sắt trắng (cuốn, đóng kín) --- */
    const DOORS = []; /* mọi cửa sắt kho: {hz,c0,c,w,P:[{p,hl}],o:0..1 (độ mở),idle,lock} */
  function shutter(G, hz, c0, c, w) {
    const g = new THREE.Group();
    g.position.set(hz ? c : c0, 0, hz ? c0 : c);
    if (!hz) g.rotation.y = PI / 2;
    G.add(g);
    const white = M(0xf7f8fa, 0.35, 0.5),
      pan = M(0xe6e9ee, 0.4, 0.5),
      frame = M(0xc4c9d1, 0.4, 0.6),
      dark = M(0x3a3d44, 0.5, 0.3),
      n = w > 1.5 ? 2 : 1,
      lw = (w - 0.12) / n;
    [-1, 1].forEach((s) => rb(0.06, 2.4, 0.16, frame, s * (w / 2 - 0.03), 0, 0, g, 0.005));
    rb(w, 0.35, 0.16, frame, 0, 2.05, 0, g, 0.01);
    rb(w - 0.1, 0.03, 0.18, dark, 0, 0, 0, g, 0.005);
    const rec = { hz, c0, c, w, P: [], o: 0, idle: 9, lock: null };
    for (let k = 0; k < n; k++) {
      const xc = -w / 2 + 0.06 + lw * (k + 0.5),
        hl = n === 2 ? (k === 0 ? -1 : 1) : -1, /* phía bản lề */
        P = new THREE.Group(),
        x = (-hl * lw) / 2; /* tâm cánh, tính từ trục bản lề */
      P.position.set(xc + (hl * lw) / 2, 0, 0);
      g.add(P);
      rec.P.push({ p: P, hl });
      rb(lw - 0.01, 2.0, 0.05, white, x, 0.03, 0, P, 0.01);
      [-1, 1].forEach((s) => {
        rb(lw - 0.22, 0.7, 0.012, pan, x, 1.15, s * 0.03, P, 0.004);
        rb(lw - 0.22, 0.7, 0.012, pan, x, 0.3, s * 0.03, P, 0.004);
        rb(lw - 0.22, 0.22, 0.012, pan, x, 1.9, s * 0.03, P, 0.004);
      });
      [0.25, 1.0, 1.75].forEach((y) =>
        [-1, 1].forEach((s) =>
          rb(0.03, 0.12, 0.03, dark, x + hl * (lw / 2 - 0.01), y, s * 0.04, P, 0.004),
        ),
      );
      const hx = x - hl * (lw / 2 - 0.1);
      [-1, 1].forEach((s) => {
        rb(0.04, 0.04, 0.03, dark, hx, 1.0, s * 0.05, P, 0.004);
        rb(0.13, 0.025, 0.025, dark, hx - hl * 0.045, 1.0, s * 0.07, P, 0.004);
        rb(0.035, 0.07, 0.02, dark, hx, 0.88, s * 0.045, P, 0.004);
      });
    }
    sign(g, "KHO", "#eceff1", "#b71c1c", 0.5, 0.15, 0, 2.2, 0.085, 0, 0.1);
    sign(g, "KHO", "#eceff1", "#b71c1c", 0.5, 0.15, 0, 2.2, -0.085, PI, 0.1);
    DOORS.push(rec);
    return rec;
  }

  /* --- Một bức tường (trục x hoặc z) có thể có ô cửa --- */
  function wall(G, w) {
    const hz = Math.abs(w.a[1] - w.b[1]) < 1e-6,
      s0 = (hz ? Math.min(w.a[0], w.b[0]) : Math.min(w.a[1], w.b[1])) - T / 2,
      s1 = (hz ? Math.max(w.a[0], w.b[0]) : Math.max(w.a[1], w.b[1])) + T / 2,
      c0 = hz ? w.a[1] : w.a[0],
      S = wallSet(w.key);
    const mk = (a, b, lint) => {
      const len = b - a;
      if (len < 0.03) return;
      const g = new THREE.Group();
      g.position.set(hz ? (a + b) / 2 : c0, 0, hz ? c0 : (a + b) / 2);
      if (!hz) g.rotation.y = PI / 2;
      G.add(g);
      if (lint) rb(len, H - 2.4, T, S.m.w, 0, 2.4, 0, g, 0.03);
      else if (w.glass) {
        rb(len, 0.9, T, S.m.w, 0, 0, 0, g, 0.03);
        const gh = H - 0.98,
          gl = new THREE.Mesh(new THREE.BoxGeometry(len, gh, 0.05), S.m.g);
        gl.position.set(0, 0.9 + gh / 2, 0);
        g.add(gl);
      } else rb(len, H, T, S.m.w, 0, 0, 0, g, 0.03);
      rb(len + 0.02, 0.08, T + 0.06, S.m.c, 0, H - 0.08, 0, g, 0.02);
      if (!lint) rb(len + 0.02, 0.12, T + 0.04, S.m.b, 0, 0, 0, g, 0.02);
    };
    let cur = s0;
    (w.open || [])
      .slice()
      .sort((a, b) => a.c - b.c)
      .forEach((o) => {
        const o0 = o.c - o.w / 2,
          o1 = o.c + o.w / 2;
        mk(cur, o0);
        mk(o0, o1, true);
        if (o.kind === "shutter") shutter(G, hz, c0, o.c, o.w);
        cur = o1;
      });
    mk(cur, s1);
  }

  const mkTex = () => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = "#ececef";
    x.fillRect(0, 0, 128, 128);
    x.strokeStyle = "#dcdce0";
    x.lineWidth = 3;
    x.strokeRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 1.5, 1 / 1.5);
    t.anisotropy = 4;
    return t;
  };
  function floor(poly, mat, y) {
    const sh = new THREE.Shape(poly.map((p) => new THREE.Vector2(p[0], -p[1]))),
      g = new THREE.ShapeGeometry(sh);
    g.rotateX(-PI / 2);
    g.userData.own = 1;
    const m = new THREE.Mesh(g, mat);
    m.position.y = y;
    m.receiveShadow = true;
    return m;
  }
  const bb = (poly) => {
    const xs = poly.map((p) => p[0]),
      zs = poly.map((p) => p[1]);
    return [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...zs) + Math.max(...zs)) / 2,
    ];
  };
  function lab(G, text, x, z, w) {
    const s = tag(text, x, 0.9, z, w, 1);
    scene.remove(s);
    G.add(s);
  }
  function buildPlan(P) {
    const G = new THREE.Group();
    G.userData.fp = 1;
    const tex = mkTex(),
      mShop = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.35,
        side: THREE.DoubleSide,
      }),
      mKho = new THREE.MeshStandardMaterial({
        color: 0xb9bcc2,
        roughness: 0.9,
        side: THREE.DoubleSide,
      });
    P.zones
      .filter((z) => z.k !== "cold")
      .forEach((z) =>
        G.add(floor(z.poly, z.k === "kho" ? mKho : mShop, z.k === "kho" ? 0.006 : 0)),
      );
    P.zones
      .filter((z) => z.k === "cold")
      .forEach((z) => {
        const c = bb(z.poly);
        lab(G, z.n, c[0], c[1], 3);
      });
    P.walls.forEach((w) => wall(G, w));
    const fd = P.walls.find((w) => w.key === "f").open[0];
    rb(fd.w, 0.03, 1.5, 0x3a3a40, fd.c, 0, HD - 0.8, G, 0.01);
    P.zones
      .filter((z) => z.k === "kho")
      .forEach((z) => {
        const c = bb(z.poly);
        lab(G, "KHO", c[0], c[1], 2);
      });
    return G;
  }

  /* --- cửa sắt trắng cho kho của mặt bằng gốc (kho gốc vốn chỉ có ô trống) --- */
  const DSH = new THREE.Group();
  const DDEF = shutter(
    DSH, true, -HD, (STORE.kho[0] + STORE.kho[1]) / 2, STORE.kho[1] - STORE.kho[0],
  );
  scene.add(DSH);
  const inPoly = (p, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i],
        [xj, zj] = poly[j];
      if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi)
        c = !c;
    }
    return c;
  };

  let FPG = null,
    curId = "default";
  function applyPlan(id, silent) {
    const P = PLANS.find((p) => p.id === id) || PLANS[0];
    if (FPG) {
      scene.remove(FPG);
      FPG.traverse((o) => {
        if (o.geometry && o.geometry.userData.own) o.geometry.dispose();
      });
      FPG = null;
    }
        DOORS.length = 0; if (P.orig) DOORS.push(DDEF); /* danh sách cửa theo mặt bằng mới */
    CUR = P; navKey = "";                            /* buộc dựng lại tường va chạm */
    STORE.W = P.W || 14; /* một số mặt bằng rộng hơn: giới hạn kéo thả, camera dùng chung STORE.W */
    try { fit(); } catch (e) {}
    SHELL.forEach((o) => (o.visible = !!P.orig));
    DSH.visible = !!P.orig;
    if (!P.orig) scene.add((FPG = buildPlan(P)));
    curId = P.id;
    try {
      localStorage.setItem(KEY, P.id);
    } catch (e) {}
    ren.shadowMap.needsUpdate = true;
    if (!silent) {
      const shop = P.zones[0].poly,
        out = ShelfRegistry.all().filter((it) => !inPoly(it.pos, shop)).length;
      toast(
        "Đã áp dụng: " +
          P.name +
          (out ? " · " + out + " quầy nằm ngoài khu trưng bày, hãy dời lại" : ""),
      );
    }
  }

  /* --- Sơ đồ xem trước (SVG nhìn từ trên xuống, phía dưới = cửa vào) --- */
  function svg(P) {
    const pts = (a) => a.map((p) => p[0] + "," + p[1]).join(" ");
    let s =
      '<svg viewBox="-9 -22 18 40" preserveAspectRatio="xMidYMid meet" style="color:var(--ink)" xmlns="http://www.w3.org/2000/svg">';
    P.zones.forEach((z) => {
      s += `<polygon points="${pts(z.poly)}" fill="${z.k === "kho" ? "rgba(120,120,128,.38)" : z.k === "cold" ? "rgba(48,168,216,.32)" : "rgba(10,132,255,.17)"}"/>`;
    });
    P.walls.forEach((w) => {
      const hz = Math.abs(w.a[1] - w.b[1]) < 1e-6,
        s0 = hz ? Math.min(w.a[0], w.b[0]) : Math.min(w.a[1], w.b[1]),
        s1 = hz ? Math.max(w.a[0], w.b[0]) : Math.max(w.a[1], w.b[1]),
        c0 = hz ? w.a[1] : w.a[0],
        L = (a, b, col, wd, cap) =>
          `<line ${hz ? `x1="${a}" x2="${b}" y1="${c0}" y2="${c0}"` : `x1="${c0}" x2="${c0}" y1="${a}" y2="${b}"`} stroke="${col}" stroke-width="${wd}" stroke-linecap="${cap || "butt"}"/>`;
      let cur = s0;
      (w.open || [])
        .slice()
        .sort((a, b) => a.c - b.c)
        .forEach((o) => {
          const o0 = o.c - o.w / 2,
            o1 = o.c + o.w / 2;
          if (o0 > cur) s += L(cur, o0, "currentColor", 0.36, "square");
          if (o.kind === "shutter")
            s += L(o0, o1, "#4a4d55", 0.62) + L(o0, o1, "#ffffff", 0.4);
          else s += L(o0, o1, "#34c759", 0.36);
          cur = o1;
        });
      if (s1 > cur) s += L(cur, s1, "currentColor", 0.36, "square");
    });
    P.zones.forEach((z) => {
      s += `<text x="${z.lp[0]}" y="${z.lp[1]}" font-size="1.25" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="currentColor" opacity=".75">${z.n}</text>`;
    });
    s += `<text x="0" y="17" font-size="1.1" text-anchor="middle" fill="currentColor" opacity=".55">▲ MẶT TIỀN / LỐI VÀO</text></svg>`;
    return s;
  }

  /* --- Giao diện --- */
  const css = document.createElement("style");
  css.textContent = `
#fpBtn{left:12px;bottom:14px;padding:5px;border-radius:999px;display:none}
#fmodal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:16px;z-index:9;background:rgba(20,20,34,.3);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#fmodal.on{display:flex}
#fmodal .pv{width:min(400px,44%)}
#fmodal .pv svg{position:absolute;inset:0;width:100%;height:100%}
#fmodal .pvb{white-space:normal;width:94%;text-align:center;line-height:1.5}
#flist{flex:1;min-width:0;overflow:auto}
#flist .ai small{white-space:normal}
@media(max-width:720px){#fpBtn{:8px;bottom:calc(10px + env(safe-area-inset-bottom,0px))}#fmodal{align-items:flex-end;padding:0}#fmodal .pv{width:100%;height:40dvh;min-height:220px}}`;
  document.head.appendChild(css);

  const fpBtn = document.createElement("div");
  fpBtn.className = "panel";
  fpBtn.id = "fpBtn";
  fpBtn.innerHTML = `<button class="btn" title="Kiểu mặt bằng cửa hàng">${IC("plan", 16)}<span class="lbl">Mặt bằng</span></button>`;
  $("#store").appendChild(fpBtn);

  const fm = document.createElement("div");
  fm.id = "fmodal";
  fm.innerHTML = `<div class="box wide"><button class="x" id="fx">${IC("x", 14)}</button>
<div class="mh"><h2>Kiểu mặt bằng cửa hàng</h2></div>
<div class="ed"><div class="pv" id="fpv"></div><div id="flist"></div></div>
<div class="foot" style="justify-content:flex-end"><button class="btn pri" id="fok" style="flex:1 1 auto">${IC("check", 15)}<span>Áp dụng mặt bằng này</span></button></div></div>`;
  document.body.appendChild(fm);

  let sel = "default";
  function render() {
    const P = PLANS.find((p) => p.id === sel);
    $("#fpv").innerHTML =
      svg(P) +
      '<div class="pvb txt"><span style="color:#0a84ff">■</span> Trưng bày · <span style="color:#8a8a90">■</span> Kho · <span style="color:#30a8d8">■</span> Khu đồ lạnh ·<b>▬</b> Cửa sắt trắng (đóng) · <span style="color:#34c759">▬</span> Cửa vào</div>';
    $("#flist").innerHTML = PLANS.map(
      (p) =>
        `<button class="ai${p.id === sel ? " on" : ""}" data-p="${p.id}"><b>${esc(p.name)}</b>${p.id === curId ? " · đang dùng" : ""}<small>${esc(p.desc)}</small></button>`,
    ).join("");
  }
  const open = () => {
    sel = curId;
    render();
    fm.classList.add("on");
  };
  const close = () => fm.classList.remove("on");
  fpBtn.onclick = open;
  fm.onclick = (e) => {
    if (e.target === fm || e.target.closest("#fx")) return close();
    const b = e.target.closest("[data-p]");
    if (b) {
      sel = b.dataset.p;
      render();
    }
  };
  $("#fok").onclick = () => {
    applyPlan(sel);
    close();
  };
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  $("#tools").addEventListener("click", () => {
    fpBtn.style.display = mode === "edit" ? "block" : "none";
  });

  /* ================= 3. TƯỜNG = VẬT CẢN THẬT · CỬA KHO ĐÓNG/MỞ · ĐIỀU HƯỚNG ================= */
  const RC = 0.3,          /* bán kính chặn quanh tường (thân nhân vật + nửa bề dày tường) */
    CLR = 0.22,            /* khoảng hở tối thiểu khi vạch đường */
    OPEN_AT = 0.5,         /* cửa mở ≥ 50% mới cho nhân sự đi qua */
    KHO_TRIPS = true;      /* nhân sự tự vào kho định kỳ; đổi false để tắt */
  const hyp = Math.hypot;
  let CUR = PLANS[0], SOL = [], GAP = [], NODES = [], ADJ2 = [], KHOPTS = [], navKey = "", DT = 0.016;

  /* ---- hình học ---- */
  const orient = (ax, az, bx, bz, cx, cz) => (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
  const ptSeg = (px, pz, s) => {
    const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz,
      t = l2 ? Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / l2)) : 0,
      qx = s.ax + t * dx, qz = s.az + t * dz;
    return [hyp(px - qx, pz - qz), qx, qz];
  };
  const crosses = (ax, az, bx, bz, s) =>
    orient(s.ax, s.az, s.bx, s.bz, ax, az) * orient(s.ax, s.az, s.bx, s.bz, bx, bz) < 0 &&
    orient(ax, az, bx, bz, s.ax, s.az) * orient(ax, az, bx, bz, s.bx, s.bz) < 0;
  const segSeg = (ax, az, bx, bz, s) => {
    if (crosses(ax, az, bx, bz, s)) return 0;
    const m = { ax, az, bx, bz };
    return Math.min(ptSeg(ax, az, s)[0], ptSeg(bx, bz, s)[0], ptSeg(s.ax, s.az, m)[0], ptSeg(s.bx, s.bz, m)[0]);
  };
  const inKho = (x, z) => CUR.zones.some((q) => q.k === "kho" && inPoly([x, z], q.poly));

  /* ---- tường → các đoạn đặc (SOL) + các ô cửa (GAP) ---- */
  function wallPieces(P) {
    const sol = [], gap = [];
    P.walls.forEach((w) => {
      const hz = Math.abs(w.a[1] - w.b[1]) < 1e-6,
        s0 = hz ? Math.min(w.a[0], w.b[0]) : Math.min(w.a[1], w.b[1]),
        s1 = hz ? Math.max(w.a[0], w.b[0]) : Math.max(w.a[1], w.b[1]),
        c0 = hz ? w.a[1] : w.a[0];
      let opens = w.open || [];
      if (P.orig && w.key === "f") /* cửa vào mặt bằng gốc đi theo vị trí cửa đang chỉnh */
        opens = [{ c: (STORE.door[0] + STORE.door[1]) / 2, w: STORE.door[1] - STORE.door[0], kind: "door" }];
      const seg = (a, b) => {
        if (b - a > 0.02) sol.push(hz ? { ax: a, az: c0, bx: b, bz: c0 } : { ax: c0, az: a, bx: c0, bz: b });
      };
      let cur = s0;
      opens.slice().sort((a, b) => a.c - b.c).forEach((o) => {
        const o0 = o.c - o.w / 2, o1 = o.c + o.w / 2;
        seg(cur, o0);
        const g = hz ? { ax: o0, az: c0, bx: o1, bz: c0 } : { ax: c0, az: o0, bx: c0, bz: o1 };
        Object.assign(g, { kind: o.kind, hz, c0, c: o.c, w: o.w });
        g.door = o.kind === "shutter"
          ? DOORS.find((d) => d.hz === hz && Math.abs(d.c0 - c0) < 1e-3 && Math.abs(d.c - o.c) < 1e-3) || { o: 0 }
          : null;
        gap.push(g);
        cur = o1;
      });
      seg(cur, s1);
    });
    return { sol, gap };
  }
  /* ô cửa chặn ai? cửa kho (shutter): khách luôn bị chặn; nhân sự chỉ qua khi cửa đã mở. Cửa vào: không chặn. */
  const blocks = (s, cust) => s.kind === "shutter" && (cust || !s.door || s.door.o < OPEN_AT);

  /* ---- tầm nhìn + đường đi (đồ thị góc tường & cửa, dựng lại khi đổi mặt bằng / cửa) ---- */
  const nearGaps = (x, z, r) => GAP.filter((g) => ptSeg(x, z, g)[0] < (r || 0.5));
  function los(ax, az, bx, bz, ig) {
    for (const s of SOL) if (segSeg(ax, az, bx, bz, s) < CLR) return false;
    for (const g of GAP) if (!(ig && ig.includes(g)) && segSeg(ax, az, bx, bz, g) < CLR) return false;
    return true;
  }
  function buildNav() {
    const r = wallPieces(CUR);
    SOL = r.sol; GAP = r.gap; NODES = []; ADJ2 = [];
    const inZ = (x, z) => CUR.zones.some((q) => inPoly([x, z], q.poly)),
      push = (x, z) => NODES.push({ x, z, k: inKho(x, z) }) - 1;
    SOL.forEach((s) => [[s.ax, s.az], [s.bx, s.bz]].forEach(([x, z]) =>
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([i, j]) => {
        const a = x + i * 0.55, b = z + j * 0.55;
        if (inZ(a, b) && SOL.every((t) => ptSeg(a, b, t)[0] >= RC + 0.12) && !NODES.some((q) => hyp(q.x - a, q.z - b) < 0.3))
          push(a, b);
      }),
    ));
    const bridges = GAP.map((g) => {
      const cx = g.hz ? g.c : g.c0, cz = g.hz ? g.c0 : g.c;
      return g.hz
        ? [push(cx, cz - 0.9), push(cx, cz + 0.9), g.kind === "shutter"]
        : [push(cx - 0.9, cz), push(cx + 0.9, cz), g.kind === "shutter"];
    });
    NODES.forEach(() => ADJ2.push([]));
    for (let i = 0; i < NODES.length; i++)
      for (let j = i + 1; j < NODES.length; j++)
        if (los(NODES[i].x, NODES[i].z, NODES[j].x, NODES[j].z, null)) {
          const w = hyp(NODES[i].x - NODES[j].x, NODES[i].z - NODES[j].z);
          ADJ2[i].push({ j, w }); ADJ2[j].push({ j: i, w });
        }
    bridges.forEach(([a, b, st]) => { /* lối qua cửa: nối 2 phía của ô cửa; cửa kho chỉ nhân sự dùng */
      const w = hyp(NODES[a].x - NODES[b].x, NODES[a].z - NODES[b].z);
      ADJ2[a].push({ j: b, w, st }); ADJ2[b].push({ j: a, w, st });
    });
    /* điểm đứng trong kho (tránh hàng thùng của kho gốc) */
    KHOPTS = [];
    const obst = CUR.orig ? [[-6, 2.4, -17.9, -16.1]] : [];
    CUR.zones.filter((z) => z.k === "kho").forEach((z) => {
      const xs = z.poly.map((q) => q[0]), zs = z.poly.map((q) => q[1]);
      for (let x = Math.min(...xs) + 1; x <= Math.max(...xs) - 1; x++)
        for (let zz = Math.min(...zs) + 1; zz <= Math.max(...zs) - 1; zz++)
          if (inPoly([x, zz], z.poly) && SOL.every((s) => ptSeg(x, zz, s)[0] > 0.9) &&
              !obst.some((o) => x > o[0] && x < o[1] && zz > o[2] && zz < o[3]))
            KHOPTS.push([x, zz]);
    });
  }
  /* [] = đi thẳng được · null = không có đường · còn lại = danh sách điểm cần ghé */
function findPath(px, pz, qx, qz, staff) {
  const R = staff ? 1.3 : 0.5,
    ig = nearGaps(px, pz, R).concat(nearGaps(qx, qz, R));
  if (los(px, pz, qx, qz, ig)) return [];
    const V = NODES.length, d = Array(V).fill(Infinity), pr = Array(V).fill(-1), dn = Array(V).fill(false),
      ok = (i) => staff || !NODES[i].k;
    for (let i = 0; i < V; i++)
      if (ok(i) && los(px, pz, NODES[i].x, NODES[i].z, ig)) d[i] = hyp(NODES[i].x - px, NODES[i].z - pz);
    for (;;) {
      let u = -1;
      for (let i = 0; i < V; i++) if (!dn[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
      if (u < 0) break;
      dn[u] = true;
      ADJ2[u].forEach((e) => {
        if (!ok(e.j) || (e.st && !staff)) return;
        if (d[u] + e.w < d[e.j]) { d[e.j] = d[u] + e.w; pr[e.j] = u; }
      });
    }
    let best = -1, bc = Infinity;
    for (let i = 0; i < V; i++)
      if (d[i] < Infinity && ok(i) && los(NODES[i].x, NODES[i].z, qx, qz, ig)) {
        const c = d[i] + hyp(NODES[i].x - qx, NODES[i].z - qz);
        if (c < bc) { bc = c; best = i; }
      }
    if (best < 0) return null;
    const out = [];
    for (let i = best; i >= 0; i = pr[i]) out.unshift(NODES[i]);
    return out;
  }
  function fixPt(x, z) { /* kéo điểm đích ra khỏi vùng sát tường */
    for (let k = 0; k < 3; k++)
      for (const s of SOL) {
        const r = ptSeg(x, z, s);
        if (r[0] < RC + 0.08) {
          const dx = s.bx - s.ax, dz = s.bz - s.az, L = hyp(dx, dz) || 1;
          const nx = r[0] > 1e-6 ? (x - r[1]) / r[0] : -dz / L, nz = r[0] > 1e-6 ? (z - r[2]) / r[0] : dx / L;
          x = r[1] + nx * (RC + 0.08); z = r[2] + nz * (RC + 0.08);
        }
      }
    return [x, z];
  }

  /* ---- va chạm: kiểm tra cả quãng đường vừa đi nên chạy nhanh / đi chéo vẫn không xuyên ---- */
  const PREV = new WeakMap();
  function collide(g, cust) {
    const p = g.position, pv = PREV.get(g);
    if (!pv) { PREV.set(g, { x: p.x, z: p.z }); return; }
    let x = p.x, z = p.z;
    const px = pv.x, pz = pv.z;
    for (let it = 0; it < 4; it++) {
      let hit = false;
      for (const list of [SOL, GAP])
        for (const s of list) {
          if (list === GAP && !blocks(s, cust)) continue;
          const r = ptSeg(x, z, s), cr = crosses(px, pz, x, z, s);
          if (!cr && r[0] >= RC) continue;
          const dx = s.bx - s.ax, dz = s.bz - s.az, L = hyp(dx, dz) || 1, nx = -dz / L, nz = dx / L;
          let side = Math.sign((px - s.ax) * nx + (pz - s.az) * nz);
          if (!side) side = Math.sign((x - s.ax) * nx + (z - s.az) * nz) || 1;
          if (cr || r[0] < 1e-6) { x = r[1] + nx * side * RC; z = r[2] + nz * side * RC; }
          else { x = r[1] + ((x - r[1]) / r[0]) * RC; z = r[2] + ((z - r[2]) / r[0]) * RC; }
          hit = true;
        }
      if (!hit) break;
    }
    p.x = x; p.z = z;
    PREV.set(g, { x, z });
  }

  /* ---- cửa kho: tự mở khi nhân sự lại gần, tự đóng sau 1,2 s; d.lock = "open" | "closed" | null ---- */
  function doorsStep(dt) {
    DOORS.forEach((d) => {
      const cx = d.hz ? d.c : d.c0, cz = d.hz ? d.c0 : d.c;
      let near = false;
      for (const n of npcs) if (hyp(n.g.position.x - cx, n.g.position.z - cz) < 1.7) { near = true; break; }
      d.idle = near ? 0 : d.idle + dt;
      const want = d.lock === "open" ? 1 : d.lock === "closed" ? 0 : near || d.idle < 1.2 ? 1 : 0;
      d.o += Math.max(-dt * 2.2, Math.min(dt * 2.2, want - d.o));
      const e = d.o * d.o * (3 - 2 * d.o);
      d.P.forEach((q) => (q.p.rotation.y = -q.hl * 1.75 * e));
    });
  }
  window.khoDoor = (s) => DOORS.forEach((d) => (d.lock = s || null)); /* khoDoor('closed') / ('open') / () = tự động */

  /* ---- nhân sự: đi đường hợp lệ (qua cửa kho), thỉnh thoảng vào kho ---- */
  const _goal = goal;
  goal = function (n) {
    const t = tripGoal(n) || _goal(n);
    if (!SOL.length) return t;
    const tp = fixPt(t.x, t.z), p = n.g.position, path = findPath(p.x, p.z, tp[0], tp[1], true);
    if (path && path.length) {
      while (path.length && hyp(path[0].x - p.x, path[0].z - p.z) < 0.25) path.shift();
      if (path.length) return { x: path[0].x, z: path[0].z, act: "idle" };
    }
    return Object.assign({}, t, { x: tp[0], z: tp[1] });
  };
  function tripGoal(n) {
    const k = n._kho;
    if (!k) return null;
    const p = n.g.position;
    k.t += DT;
    if (k.stage === "go") {
      if (hyp(k.pt.x - p.x, k.pt.z - p.z) < 0.3) { k.stage = "stay"; k.t = 0; }
      else if (k.t > 45) { n._kho = null; return null; } /* kẹt (vd cửa bị khóa) thì bỏ chuyến */
    } else if (k.t > 6) { n._kho = null; return null; }
    return { x: k.pt.x, z: k.pt.z, act: "stock", face: [k.pt.x, k.pt.z - 1] };
  }
  window.sendToKho = (code) => { /* gửi 1 nhân sự (theo mã EMP_xxxx, hoặc ngẫu nhiên) vào kho */
    const pool = npcs.filter((q) => !q._kho),
      n = code ? npcs.find((q) => q.s.code === code) : pool[Math.floor(Math.random() * pool.length)];
    if (!n || !KHOPTS.length) return false;
    const pts = KHOPTS.slice().sort(() => Math.random() - 0.5).slice(0, 6);
    for (const q of pts)
      if (findPath(n.g.position.x, n.g.position.z, q[0], q[1], true) !== null) {
        n._kho = { stage: "go", pt: { x: q[0], z: q[1] }, t: 0 };
        return true;
      }
    return false;
  };
  let tripT = 12;
  function tripTick(dt) {
    if (!KHO_TRIPS || (tripT -= dt) > 0) return;
    tripT = 25 + Math.random() * 20;
    window.sendToKho();
  }

  /* ---- khách: bỏ điểm đến trong kho, tự vòng qua tường / qua cửa vào ---- */
  const ALLC = new Set(), _mk0 = makeChar;
  makeChar = function (s) { const c = _mk0(s); ALLC.add(c); return c; };
  function steer(c) {
    const p = c.g.position, w = c.q[0];
    const m = c._m || (c._m = { x: p.x, z: p.z, t: 0 }); /* chống kẹt: đứng yên khi đang đi > 4 s thì bỏ điểm đó */
    if (c.mode === "walk" && hyp(p.x - m.x, p.z - m.z) < 0.03) {
      m.t += DT;
      if (m.t > 4) { m.t = 0; if (w && !w.gone) c.q.shift(); }
    } else { m.x = p.x; m.z = p.z; m.t = 0; }
    if (!w || c.leaving || w._ok) return;
    if (!w.gone && inKho(w.x, w.z)) { c.q.shift(); return; } /* khách không có việc trong kho */
    if (!w.gone) { const f = fixPt(w.x, w.z); w.x = f[0]; w.z = f[1]; }
    const path = findPath(p.x, p.z, w.x, w.z, false);
    w._ok = 1;
    if (path && path.length) for (let i = path.length - 1; i >= 0; i--) c.q.unshift({ x: path[i].x, z: path[i].z, _ok: 1 });
    else if (path === null && !w.gone) c.q.shift();
  }

  /* ---- móc vào mỗi khung hình, SAU khi mọi logic di chuyển cũ đã chạy, TRƯỚC khi vẽ ---- */
  let lastT = performance.now();
  const _ob = scene.onBeforeRender;
  scene.onBeforeRender = function () {
    if (_ob) _ob.apply(this, arguments);
    const now = performance.now();
    DT = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const key = CUR.id + "|" + STORE.W + "|" + STORE.door.join(",");
    if (key !== navKey) { navKey = key; buildNav(); }
    tripTick(DT);
    doorsStep(DT);
    npcs.forEach((n) => collide(n.g, false));
    ALLC.forEach((c) => {
      if (!c.g.parent) { ALLC.delete(c); return; }
      if (c.g.parent !== scene || !c.q || !c.s || c.s.code !== "CUS" || c.leaving) return;
      steer(c);
      collide(c.g, true);
    });
  };

  window.FloorPlan = {
  plans: PLANS,
  get id() { return curId; },
  apply: (id) => applyPlan(id, true),
  ops: () => {
    const locks = DOORS.map((d) => d.lock || null);
    return {
      collision: { bodyRadius: RC, clearance: CLR },
      khoDoorOpenThreshold: OPEN_AT,
      staffKhoTrips: KHO_TRIPS,
      khoDoorLock: locks.length && locks.every((l) => l === locks[0]) ? locks[0] : null,
      khoDoors: DOORS.map((d) => ({ horizontal: d.hz, axis: +d.c0.toFixed(3), center: +d.c.toFixed(3), width: +d.w.toFixed(3), lock: d.lock || null })),
    };
  },
};

  /* khôi phục mặt bằng đã chọn lần trước */
  try {
    const sv = localStorage.getItem(KEY);
    if (sv && sv !== "default") applyPlan(sv, true);
  } catch (e) {}
})();