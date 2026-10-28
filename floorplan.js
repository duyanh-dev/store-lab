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
        { a: [-7, -15], b: [7, -15], key: "b", open: [SH((STORE.kho[0] + STORE.kho[1]) / 2, STORE.kho[1] - STORE.kho[0])] },
        { a: [-7.5, -15], b: [-7.5, -20], key: "l" },
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
  function shutter(G, hz, c0, c, w) {
    const g = new THREE.Group();
    g.position.set(hz ? c : c0, 0, hz ? c0 : c);
    if (!hz) g.rotation.y = PI / 2;
    G.add(g);
    /* Cửa sắt trắng mở ngang như cửa đi thường (1 cánh, hoặc 2 cánh nếu rộng > 1,5 m), đang đóng */
    const white = M(0xf7f8fa, 0.35, 0.5),
      pan = M(0xe6e9ee, 0.4, 0.5),
      frame = M(0xc4c9d1, 0.4, 0.6),
      dark = M(0x3a3d44, 0.5, 0.3),
      n = w > 1.5 ? 2 : 1,
      lw = (w - 0.12) / n;
    /* khung: 2 thanh đứng + thanh ngang trên + ngưỡng */
    [-1, 1].forEach((s) =>
      rb(0.06, 2.4, 0.16, frame, s * (w / 2 - 0.03), 0, 0, g, 0.005),
    );
    rb(w, 0.35, 0.16, frame, 0, 2.05, 0, g, 0.01);
    rb(w - 0.1, 0.03, 0.18, dark, 0, 0, 0, g, 0.005);
    for (let k = 0; k < n; k++) {
      const x = -w / 2 + 0.06 + lw * (k + 0.5),
        hl = n === 2 ? (k === 0 ? -1 : 1) : -1; /* phía bản lề */
      rb(lw - 0.01, 2.0, 0.05, white, x, 0.03, 0, g, 0.01);
      /* gân dập nổi 2 mặt */
      [-1, 1].forEach((s) => {
        rb(lw - 0.22, 0.7, 0.012, pan, x, 1.15, s * 0.03, g, 0.004);
        rb(lw - 0.22, 0.7, 0.012, pan, x, 0.3, s * 0.03, g, 0.004);
        rb(lw - 0.22, 0.22, 0.012, pan, x, 1.9, s * 0.03, g, 0.004);
      });
      /* bản lề */
      [0.25, 1.0, 1.75].forEach((y) =>
        [-1, 1].forEach((s) =>
          rb(0.03, 0.12, 0.03, dark, x + hl * (lw / 2 - 0.01), y, s * 0.04, g, 0.004),
        ),
      );
      /* tay nắm + ổ khóa phía đối diện bản lề */
      const hx = x - hl * (lw / 2 - 0.1);
      [-1, 1].forEach((s) => {
        rb(0.04, 0.04, 0.03, dark, hx, 1.0, s * 0.05, g, 0.004);
        rb(0.13, 0.025, 0.025, dark, hx - hl * 0.045, 1.0, s * 0.07, g, 0.004);
        rb(0.035, 0.07, 0.02, dark, hx, 0.88, s * 0.045, g, 0.004);
      });
    }
    sign(g, "KHO", "#eceff1", "#b71c1c", 0.5, 0.15, 0, 2.2, 0.085, 0, 0.1);
    sign(g, "KHO", "#eceff1", "#b71c1c", 0.5, 0.15, 0, 2.2, -0.085, PI, 0.1);
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
    lab(G, "CỬA VÀO", fd.c, HD + 0.9, 3);
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
  shutter(
    DSH,
    true,
    -HD,
    (STORE.kho[0] + STORE.kho[1]) / 2,
    STORE.kho[1] - STORE.kho[0],
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
@media(max-width:720px){#fpBtn{left:8px;bottom:calc(10px + env(safe-area-inset-bottom,0px))}#fmodal{align-items:flex-end;padding:0}#fmodal .pv{width:100%;height:40dvh;min-height:220px}}`;
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

  /* khôi phục mặt bằng đã chọn lần trước */
  try {
    const sv = localStorage.getItem(KEY);
    if (sv && sv !== "default") applyPlan(sv, true);
  } catch (e) {}
})();