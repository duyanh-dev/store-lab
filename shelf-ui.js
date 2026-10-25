/* ============ shelf-ui.js — làm lại UI quầy: Liquid Glass, không viền, nổi khối, tối ưu điện thoại ============
   Cách dùng: thêm 1 dòng SAU script.js trong index.html:
   <script src="./script.js"></script>
   <script src="./shelf-ui.js"></script>
   Không sửa logic gốc: file này chỉ thay legend(), inspector(), openAdd(), showPre() và thêm CSS. */
(() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mq = matchMedia("(max-width:720px)");
  /* xem trước tủ: tự xoay 360° bật/tắt (script.js đọc window.aSpin) */
  try {
    window.aSpin = localStorage.getItem("store-aspin") !== "0";
  } catch (e) {
    window.aSpin = true;
  }

  /* ---------- Icon bổ sung ---------- */
  Object.assign(ICONS, {
    t_shelf:
      '<path d="M4 4v16M20 4v16M4 9.5h16M4 15.5h16"/><path d="M7 9.5V6.5h3.2v3M13 15.5v-3.5h4v3.5"/>',
    t_produce:
      '<path d="M3 10h18l-1.6 8.8a1.6 1.6 0 01-1.6 1.2H6.2a1.6 1.6 0 01-1.6-1.2zM8 10l2.5-5.5M16 10l-2.5-5.5"/>',
    t_cold:
      '<rect x="6" y="3" width="12" height="18" rx="2.6"/><path d="M6 10.5h12M9.2 6.5v1.8M9.2 13.5v3"/>',
    t_freezer:
      '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5L4.2 16.5M9.5 4.6L12 7l2.5-2.4M9.5 19.4L12 17l2.5 2.4"/>',
    t_rice:
      '<path d="M7 7.5h10l1.6 12.5H5.4zM9 7.5l1-3.5h4l1 3.5M8.5 12.5h7"/>',
    t_cashier:
      '<rect x="4" y="9" width="16" height="11" rx="2.2"/><path d="M7 9V5h10v4M8 13h2M12 13h2M8 16.5h8"/>',
    t_display:
      '<path d="M4 15.5h16V19H4zM6 19v1.5M12 19v1.5M18 19v1.5M6 15.5v-4.5h5v4.5M13 15.5V8h5v7.5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6v.01M4.5 12v.01M4.5 18v.01"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    ruler:
      '<path d="M3.5 15L15 3.5 20.5 9 9 20.5zM8 10.5l2 2M11 7.5l2 2M5.5 13l1.6 1.6"/>',
    pin: '<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0113 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5zM3 12.5l9 5 9-5"/>',
  });

  /* màu nhấn theo loại quầy (phẳng, không gradient) */
  const TC = {
    shelf: "#0a84ff",
    produce: "#34c759",
    cold: "#32ade6",
    freezer: "#5e5ce6",
    rice: "#ff9f0a",
    cashier: "#af52de",
    display: "#ff6b9d",
  };
  const tcs = () => "";

  /* ---------- Loại quầy mới (v2): icon, màu, đăng ký TYPES / PRESETS / DESC ---------- */
  Object.assign(ICONS, {
    t_noodle:
      '<path d="M4 11h16a8 8 0 01-16 0zM9 20.5h6M8 3.5c1 1 1 2.2 0 3.2M12 3c1 1 1 2.2 0 3.2M16 3.5c1 1 1 2.2 0 3.2"/>',
    t_snack: '<path d="M6 4h12l-1 16H7zM6 7.5h12M10 12h4M10 15h4"/>',
    t_sauce:
      '<path d="M10 3h4v3l2 3v11a1 1 0 01-1 1H9a1 1 0 01-1-1V9l2-3zM8 13.5h8"/>',
    t_household:
      '<path d="M8 10h8v10a1 1 0 01-1 1H9a1 1 0 01-1-1zM10 10V6h4v4M14 6h3l1-2"/>',
    t_ufreezer:
      '<rect x="6" y="3" width="12" height="18" rx="2.6"/><path d="M12 7v10M8.5 9l7 6M15.5 9l-7 6"/>',
    t_icecream: '<path d="M8 11a4 4 0 118 0M7 11h10l-5 10zM10.5 14.5l1.5 3"/>',
    t_drinks:
      '<path d="M4 20.5h16M7 20.5V10l2-2V4h2v4l2 2v10.5M15.5 20.5v-8h3v8"/>',
    t_eggs: '<path d="M12 3c3.5 0 6 5 6 9a6 6 0 01-12 0c0-4 2.5-9 6-9z"/>',
    t_bakery:
      '<path d="M5 12a4 4 0 014-4h6a4 4 0 014 4v7H5zM9 8V6M12 8V5M15 8V6"/>',
    t_meat:
      '<path d="M7 7.5c3-3 10-2 11 3s-5 9-9 9-6-4-2-12zM14 11.5v.01"/>',
    t_seafood: '<path d="M3 12c3-4 7-5 11-3l5-3v12l-5-3c-4 2-8 1-11-3zM15 11v.01"/>',
    t_cart: '<path d="M3 4h2.5l2 10h10l2-7H7M9 19v.01M17 19v.01"/>',
    t_candy: '<path d="M9 9h6v6H9zM9 12l-4-3v6zM15 12l4-3v6z"/>',
    spin: '<path d="M20 12a8 8 0 11-2.4-5.7M20 4v4.5h-4.5"/>',
    t_chiller:
      '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M4 9h16M4 14.5h16M8 6.2h3M13 11.7h3M8 17.2h3"/>',
    /* === quầy thêm mới === */
    t_produce3:
      '<path d="M3 8h18M3 13h18M3 18h18M5 8L4 20M19 8l1 12M8 8V5M12 8V4M16 8V5"/>',
    t_dairy:
      '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M4 9h16M4 14.5h16M7.5 6.3v.01M10.5 6.3v.01M13.5 6.3v.01M7.5 11.8v.01M10.5 11.8v.01M7.5 17.3h9"/>',
    t_bakeshelf:
      '<path d="M4 4v16M20 4v16M4 9.5h16M4 15.5h16M7 9.5a2.5 2.5 0 015 0M13 15.5a2.5 2.5 0 015 0"/>',
  });
  Object.assign(TC, {
    noodle: "#ff453a",
    snack: "#bf5af2",
    sauce: "#ff9500",
    household: "#00c7be",
    ufreezer: "#3f8cff",
    icecream: "#ff6b9d",
    drinks: "#64d2ff",
    eggs: "#ffd60a",
    bakery: "#a2845e",
    meat: "#ff3b30",
    seafood: "#30b0c7",
    cart: "#8e8e93",
    candy: "#ff2d95",
    chiller: "#00b8d9",
    /* === quầy thêm mới === */
    produce3: "#30d158",
    dairy: "#00b8d9",
    bakeshelf: "#e07b39",
  });
  /* thứ tự key của TYPES = thứ tự nhóm trong danh sách quầy */
  TYPES.cold[0] = "Tủ mát đứng";
  TYPES.freezer[0] = "Tủ đông nằm";
  Object.assign(TYPES, {
    noodle: ["Kệ mì – phở", "NOODLE"],
    snack: ["Kệ bánh kẹo", "SNACK"],
    sauce: ["Kệ gia vị – dầu ăn", "SAUCE"],
    household: ["Kệ hóa mỹ phẩm", "HOUSEHOLD"],
    ufreezer: ["Tủ đông đứng", "UFREEZER"],
    icecream: ["Tủ kem", "ICECREAM"],
    drinks: ["Pallet nước", "DRINKS"],
    eggs: ["Bàn trứng", "EGGS"],
    bakery: ["Quầy bánh mì", "BAKERY"],
    meat: ["Quầy thịt tươi", "MEAT"],
    seafood: ["Quầy hải sản", "SEAFOOD"],
    cart: ["Khu xe đẩy", "CART"],
    candy: ["Giá kẹo – sô cô la", "CANDY"],
    chiller: ["Tủ mát hở", "CHILLER"],
    /* === quầy thêm mới === */
    produce3: ["Quầy rau 3 tầng", "PRODUCE3"],
    dairy: ["Tủ mát sữa chua", "DAIRY"],
    bakeshelf: ["Kệ bánh nướng", "BAKESHELF"],
  });
  /* PRESETS và DESC phải cùng thứ tự (DESC[i] mô tả PRESETS[i]) */
  [
    ["Kệ mì – phở", "noodle", 2, [0.9, 2.4], "Kệ 2 mặt: mì gói, ly mì, phở, cháo"],
    ["Kệ bánh kẹo", "snack", 2, [0.9, 2.4], "Kệ 2 mặt: snack, bánh, kẹo, hộp"],
    ["Kệ gia vị", "sauce", 2, [0.9, 2.4], "Kệ 2 mặt: nước mắm, dầu ăn, hũ gia vị"],
    ["Kệ hóa mỹ phẩm", "household", 2, [0.9, 2.4], "Kệ 2 mặt: nước giặt, nước rửa, hộp"],
    ["Tủ đông đứng", "ufreezer", 1, [0.8, 2.2], "Tủ đông đứng cửa kính, 5 tầng"],
    ["Tủ kem", "icecream", 1, [0.9, 1.6], "Tủ kem nằm, nắp kính trượt"],
    ["Pallet nước", "drinks", 1, [1.2, 1.2], "Pallet thùng nước và lốc chai"],
    ["Bàn trứng", "eggs", 1, [1.1, 1.3], "Bàn bày khay trứng"],
    ["Quầy bánh mì", "bakery", 1, [0.8, 1.8], "Tủ kính bánh mì, bánh ngọt hai tầng"],
    ["Quầy thịt", "meat", 1, [1.0, 2.4], "Quầy thịt tươi, khay bọc màng, đèn hồng"],
    ["Quầy hải sản", "seafood", 1, [1.0, 3.0], "Khay đá hải sản, bể nuôi cá (dài trên 2 m)"],
    ["Xe đẩy", "cart", 1, [0.7, 1.4], "Dãy xe đẩy hàng lồng nhau"],
    ["Giá kẹo", "candy", 1, [0.6, 1.0], "Giá kẹo sô cô la cạnh thu ngân"],
    ["Tủ mát hở", "chiller", 1, [0.9, 2.5], "Tủ mát hở 4 tầng: thịt bọc màng, xúc xích, hàng đông mát, thẻ giá"],
    /* === quầy thêm mới === */
    ["Quầy rau 3 tầng", "produce3", 1, [1.6, 2.7], "Quầy rau củ quả 3 tầng, rổ nghiêng, phun sương"],
    ["Tủ mát sữa chua", "dairy", 1, [0.9, 2.5], "Tủ mát hở 4 tầng: Yakult, sữa chua, trà sữa chai, banner dưới"],
    ["Kệ bánh nướng", "bakeshelf", 1, [0.9, 2.4], "Kệ bánh nướng mỗi ngày: 3 tầng, banner, thẻ giá"],
  ].forEach((p) => {
    if (PRESETS.some((q) => q[1] === p[1])) return; /* tránh thêm trùng */
    PRESETS.push(p.slice(0, 4));
    DESC.push(p[4]);
  });
  /* an toàn: mọi preset phải có TYPES / TC / ICON để modal không vỡ */
  PRESETS.forEach((p) => {
    if (!TYPES[p[1]]) TYPES[p[1]] = [p[0], String(p[1]).toUpperCase()];
    if (!TC[p[1]]) TC[p[1]] = "#0a84ff";
    if (!ICONS["t_" + p[1]]) ICONS["t_" + p[1]] = ICONS.t_shelf;
  });
  /* loại quầy cho phép chọn 1 mặt / 2 mặt */
  const SIDED = ["shelf", "produce", "produce3", "noodle", "snack", "sauce", "household", "bakeshelf"];
  const fnum = (x) => String(+(+x).toFixed(2));

  /* ---------- CSS ---------- */
  const css = document.createElement("style");
  css.textContent = `
:root{--sx-panel:rgba(248,248,250,.8);--sx-grp:rgba(255,255,255,.88);--sx-fill:rgba(120,120,128,.12);--sx-fill2:rgba(120,120,128,.2);--sx-sub:#6c6c72;--sx-hi:rgba(255,255,255,.9);--sx-seg:#fff}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--sx-panel:rgba(30,30,33,.82);--sx-grp:rgba(255,255,255,.07);--sx-fill:rgba(255,255,255,.09);--sx-fill2:rgba(255,255,255,.16);--sx-sub:#a1a1a8;--sx-hi:rgba(255,255,255,.14);--sx-seg:rgba(255,255,255,.2)}}

/* ===== nền: kính nhẹ, một lớp bóng, không viền ===== */
#legend,#insp{padding:0;display:flex;flex-direction:column;overflow:hidden;border-radius:26px;font-size:13px;color:var(--ink);background:var(--sx-panel);
 -webkit-backdrop-filter:blur(22px) saturate(160%);backdrop-filter:blur(22px) saturate(160%);box-shadow:0 12px 36px rgba(0,0,0,.14),inset 0 1px 0 var(--sx-hi)}
#amodal .box{background:var(--sx-panel);box-shadow:0 30px 80px rgba(10,10,30,.28),inset 0 1px 0 var(--sx-hi)}
#amodal .pv{background:var(--sx-grp);box-shadow:none}
.sx-body{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.sx-it,.sx-tile,.sx-row,.sx-ch,.sx-al button,.sx-nr>button,.sx-pr button,.sx-sg button,.sx-lb,#add .btn{white-space:nowrap}
.sx-ti{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--sx-fill);color:var(--ink)}
.sx-ti.lg{width:42px;height:42px;border-radius:13px}
.sx-ib{flex:none;display:grid;place-items:center;width:32px;height:32px;padding:0;border:0;border-radius:50%;background:var(--sx-fill);color:var(--sx-sub);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.sx-ib:active{transform:scale(.92);background:var(--sx-fill2)}
.sx-sec{background:var(--sx-grp);border-radius:18px;padding:14px;margin:0 0 10px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.sx-sec>h6{display:flex;align-items:center;gap:6px;margin:0 0 10px;font-size:12px;font-weight:500;color:var(--sx-sub);white-space:nowrap}
.sx-sec>h6 svg{color:var(--sx-sub)}
.sx-mt{margin-top:8px}
.sx-hint{margin:10px 2px 0;font-size:12px;color:var(--sx-sub);line-height:1.4}

/* ===== danh sách quầy ===== */
#legend{z-index:4;transition:opacity .2s,transform .3s cubic-bezier(.2,.9,.2,1),visibility 0s}
#legend.shut{opacity:0;visibility:hidden;pointer-events:none;transform:translateX(-14px);transition:opacity .2s,transform .3s cubic-bezier(.2,.9,.2,1),visibility 0s .3s}
.sx-lh{display:flex;align-items:center;gap:8px;padding:16px 12px 8px 18px;flex:none}
.sx-lh h3{margin:0;flex:1;min-width:0;display:flex;align-items:baseline;gap:8px;font-size:18px;font-weight:700;letter-spacing:-.02em;white-space:nowrap}
.sx-lh h3 span{font-size:13px;font-weight:500;color:var(--sx-sub)}
.sx-sr{position:relative;display:block;margin:2px 12px 8px;flex:none}
.sx-sr svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--sx-sub)}
.sx-sr input{width:100%;height:36px;border:0;border-radius:10px;padding:0 12px 0 34px;background:var(--sx-fill);color:var(--ink);font:inherit;outline:none}
.sx-sr input::placeholder{color:var(--sx-sub)}
.sx-sr input:focus{background:var(--sx-fill2)}
.sx-cs{display:flex;gap:6px;overflow-x:auto;padding:2px 12px 8px;flex:none}
.sx-ch{flex:none;display:inline-flex;flex-direction:row;align-items:center;gap:5px;height:30px;padding:0 12px;border:0;border-radius:999px;background:var(--sx-fill);color:var(--ink);font:inherit;font-size:12px;font-weight:500;cursor:pointer;-webkit-tap-highlight-color:transparent}
.sx-ch svg{color:var(--sx-sub)}
.sx-ch i{font-style:normal;font-size:11px;color:var(--sx-sub)}
.sx-ch:active{background:var(--sx-fill2)}
.sx-ch.act{background:var(--ink);color:var(--bg)}
.sx-ch.act svg,.sx-ch.act i{color:inherit;opacity:.7}
#legend .sx-body{padding:0 10px 14px}
.sx-gl{display:flex;align-items:center;margin:14px 10px 6px;font-size:12px;font-weight:500;color:var(--sx-sub);white-space:nowrap}
.sx-gl svg{display:none}
.sx-gl i{font-style:normal;margin-left:auto}
.sx-grp{background:var(--sx-grp);border-radius:18px;padding:4px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.sx-it{display:flex;flex-direction:row;align-items:center;gap:10px;width:100%;min-height:52px;margin:0;padding:8px 10px;border:0;border-radius:14px;background:transparent;color:var(--ink);font:inherit;text-align:left;cursor:pointer;box-shadow:none;transform:none;-webkit-tap-highlight-color:transparent}
.sx-it:active{background:var(--sx-fill2)}
@media(hover:hover){.sx-it:hover{background:var(--sx-fill)}}
.sx-it.on,.sx-it.on:hover,.sx-it.on:active{background:var(--acc);color:#fff;box-shadow:none;transform:none}
.sx-it.on .sx-ti{background:rgba(255,255,255,.22);color:#fff}
.sx-it.on .sx-tx small,.sx-it.on .sx-mt2{color:rgba(255,255,255,.78)}
.sx-tx{flex:1;min-width:0}
.sx-tx b,#legend .sx-tx b{display:block;font:500 14px/1.3 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;letter-spacing:-.005em;color:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sx-tx small{display:block;font:400 11.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--sx-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sx-mt2{flex:none;font-size:12px;font-weight:400;color:var(--sx-sub);white-space:nowrap}
.sx-none{padding:26px 10px;text-align:center;color:var(--sx-sub)}
.sx-scrim{position:absolute;inset:0;z-index:7;background:rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:opacity .25s}
.sx-scrim.on{opacity:1;pointer-events:auto}

/* ===== nút Xem / Chỉnh sửa / Danh sách ===== */
#tools{display:flex;align-items:center;gap:6px}
.sx-lb{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border:0;border-radius:999px;background:var(--btn);color:var(--ink);font:inherit;font-weight:500;cursor:pointer;box-shadow:none}
.sx-lb svg{color:var(--sx-sub)}
.sx-lb:active{transform:scale(.96)}
.sx-lb.act{background:var(--ink);color:var(--bg);box-shadow:none}
.sx-lb.act svg{color:inherit}

/* ===== thanh công cụ chỉnh sửa ===== */
#add{padding:6px;gap:4px;border-radius:999px}
#add .btn{min-height:40px}
#add .btn.pri{box-shadow:none}
#add .ib{width:40px;padding:0}
#add .ib svg{color:inherit}
#add .ib.on{background:var(--ink);color:var(--bg)}
.sx-cap{display:none}

/* ===== bảng chi tiết / chỉnh sửa ===== */
.sx-head{position:relative;display:flex;align-items:center;gap:10px;padding:14px 12px 10px 14px;flex:none}
.sx-ht{flex:1;min-width:0}
.sx-ht small{display:block}
.sx-ht b{display:block;font-size:16px;font-weight:700;letter-spacing:-.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#insp .sx-body{padding:2px 12px 14px}
#insp.fold .sx-body{display:none}
#insp.fold .sx-head{padding-bottom:14px}
#insp.fold [data-a=fold] svg{transform:rotate(180deg)}
.sx-empty{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding:24px 20px;color:var(--sx-sub);line-height:1.45}
.sx-empty b{color:var(--ink);font-size:15px}
.sx-kv{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sx-kv>div{min-width:0;background:var(--sx-fill);border-radius:12px;padding:8px 10px}
.sx-kv em{display:block;font-style:normal;font-size:11px;text-transform:none;letter-spacing:0;color:var(--sx-sub);white-space:nowrap}
.sx-kv b{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sx-dock{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:0 0 10px}
.sx-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:58px;min-width:0;padding:8px 2px;border:0;border-radius:14px;background:var(--sx-grp);color:var(--ink);font:inherit;font-size:10.5px;font-weight:500;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.05);transition:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.sx-tile svg{color:var(--ink)}
.sx-tile span{max-width:100%;overflow:hidden;text-overflow:ellipsis}
.sx-tile:hover{transform:none;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.sx-tile:active{transform:scale(.95)}
.sx-tile.danger,.sx-tile.danger svg{color:#ff453a}
.sx-tile.arm{background:#ff453a;color:#fff;box-shadow:none}
.sx-tile.arm svg{color:#fff}
.sx-f,#insp .sx-f{display:flex;align-items:center;gap:10px;margin:0;min-height:42px;padding:0 12px;border-radius:12px;background:var(--sx-fill);color:var(--ink);font-size:13px;box-shadow:none}
.sx-f>span{flex:none;color:var(--sx-sub);font-size:12px;white-space:nowrap}
.sx-f:focus-within{background:var(--sx-fill2);box-shadow:none}
.sx-f input,#insp .sx-f input[type=text]{flex:1;width:auto;min-width:0;height:40px;border:0;border-radius:0;padding:0;background:transparent;color:inherit;font:inherit;text-align:right;outline:none;box-shadow:none}
#insp .sx-f input[type=text]:focus{background:transparent!important;box-shadow:none!important}
.sx-n+.sx-n{margin-top:16px}
.sx-nl{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px;white-space:nowrap}
.sx-nl span{display:inline-flex;align-items:center;gap:6px;color:var(--sx-sub)}
.sx-nl svg{color:var(--sx-sub)}
.sx-nl b{font-size:14px;font-variant-numeric:tabular-nums}
.sx-nr{display:flex;gap:6px;align-items:center}
.sx-nr>button{flex:none;min-width:40px;height:44px;padding:0 6px;border:0;border-radius:12px;background:var(--sx-fill);color:var(--ink);font:500 19px/1 -apple-system,"Segoe UI",sans-serif;cursor:pointer;box-shadow:none;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;transition:none}
.sx-nr>button.bg{min-width:46px;font-size:13px;color:var(--sx-sub)}
.sx-nr>button:active{transform:scale(.93);background:var(--acc);color:#fff}
.sx-vi{flex:1;min-width:0;position:relative}
.sx-vi input,#insp .sx-vi input[type=text]{width:100%;height:44px;border:0;border-radius:12px;padding:0 20px 0 6px;background:var(--sx-fill);color:var(--ink);text-align:center;font:600 17px -apple-system,"Segoe UI",sans-serif;outline:none;box-shadow:none}
#insp .sx-vi input[type=text]:focus{background:var(--sx-fill2)!important;box-shadow:none!important}
.sx-vi em{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-style:normal;font-size:12px;color:var(--sx-sub);pointer-events:none}
.sx-pr{display:flex;gap:6px;margin-top:8px}
.sx-pr button{flex:1;height:34px;border:0;border-radius:10px;background:var(--sx-fill);color:var(--ink);font:500 12px -apple-system,"Segoe UI",sans-serif;cursor:pointer;touch-action:manipulation;transition:none}
.sx-pr button.act{background:var(--acc);color:#fff;box-shadow:none}
.sx-sg{display:flex;gap:2px;padding:2px;border-radius:10px;background:var(--sx-fill)}
.sx-sg button{flex:1;height:34px;border:0;border-radius:8px;background:none;color:var(--ink);font:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:none;touch-action:manipulation}
.sx-sg button.act{background:var(--sx-seg);box-shadow:0 1px 3px rgba(0,0,0,.14)}
.sx-al{display:grid;grid-template-columns:repeat(auto-fit,minmax(98px,1fr));gap:6px}
.sx-al button{min-width:0;height:38px;padding:0 6px;border:0;border-radius:12px;background:var(--sx-fill);color:var(--ink);font:inherit;font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;cursor:pointer;touch-action:manipulation}
.sx-al button:hover{background:var(--sx-fill2)}
.sx-al button:active{transform:scale(.95);background:var(--acc);color:#fff}
.sx-rows{display:flex;flex-direction:column;gap:8px}
.sx-row{display:flex;align-items:center;gap:10px;width:100%;height:46px;padding:0 14px;border:0;border-radius:14px;background:var(--sx-fill);color:var(--ink);font:inherit;font-weight:500;cursor:pointer;touch-action:manipulation}
.sx-row svg{color:var(--sx-sub)}
.sx-row span{overflow:hidden;text-overflow:ellipsis}
.sx-row:active{transform:scale(.98)}
.sx-row.pri{background:var(--acc);color:#fff;box-shadow:none}
.sx-row.pri svg{color:#fff}

/* ===== modal thêm quầy ===== */
#alist{padding:2px 2px 8px}
.sx-sel{display:flex;align-items:center;gap:14px}
.sx-sel .sx-ti{width:52px;height:52px;border-radius:16px;background:rgba(10,132,255,.14);color:var(--acc)}
.sx-sel b{display:block;font-size:17px;letter-spacing:-.015em}
.sx-sel p{margin:3px 0 0;font-size:12px;color:var(--sx-sub);line-height:1.4}
.sx-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.sx-tiles .sx-it{margin:0;background:var(--sx-fill)}
.sx-tiles .sx-it.on{background:var(--acc)}
.sx-note{display:flex;gap:8px;align-items:flex-start;margin:0 4px 6px;font-size:12px;color:var(--sx-sub);line-height:1.4}
.sx-note svg{margin-top:1px;flex:none;color:var(--sx-sub)}
.sx-spec{position:absolute;left:10px;top:10px;z-index:3;padding:6px 12px;border-radius:999px;background:var(--sx-panel);color:var(--ink);font-size:12px;font-weight:500;white-space:nowrap;box-shadow:none}

@media(min-width:721px){
 #legend{left:12px;top:78px;bottom:auto;width:280px;max-height:calc(100% - 156px)}
 #insp{right:12px;top:78px;width:316px;max-height:calc(100% - 156px)}
 #amodal .box.wide{width:min(980px,100%);height:min(86dvh,720px)}
 #amodal .pv{width:min(380px,42%)}
 .sx-scrim{display:none}
}
@media(max-width:720px){
 #legend{left:0!important;right:0!important;top:auto!important;bottom:0!important;width:auto!important;max-height:72%!important;display:flex!important;z-index:8;border-radius:26px 26px 0 0;padding-bottom:env(safe-area-inset-bottom,0px)}
 #legend.shut{transform:translateY(108%)}
 #legend::before{content:"";align-self:center;flex:none;width:36px;height:5px;margin:8px 0 0;border-radius:5px;background:rgba(120,120,128,.4)}
 .sx-lh{padding-top:10px}
 .sx-ib{width:38px;height:38px}
 .sx-it{min-height:56px;padding:9px 12px 9px 10px}
 #insp{left:8px;right:8px;top:auto;bottom:calc(66px + env(safe-area-inset-bottom,0px));width:auto;max-height:52%;border-radius:24px}
 .sx-tile{min-height:64px}
 .sx-nr>button{min-width:44px;height:48px}
 .sx-al button{height:42px}
 .sx-row{height:50px}
 #add{padding:5px;gap:2px}
 #add .ib{width:auto;min-width:52px;height:48px;flex:none;flex-direction:column;gap:3px;padding:4px 8px;border-radius:18px}
 #add #openAdd{height:48px;border-radius:18px}
 #add .sx-cap{display:block;font-size:10px;font-weight:500;line-height:1;white-space:nowrap}
 .sx-lb{height:40px}
 #amodal .box.wide{height:auto}
}

/* ===== v2: icon-only dock + toolbar gọn + chế độ sửa rộng chỗ ===== */
.sx-dock{gap:6px}
.sx-tile{min-height:44px;padding:0;gap:0}
.sx-tile.arm{background:#ff453a}
@media(max-width:720px){
 /* thanh công cụ: 1 hàng, chia đều, bỏ chữ chú thích */
 #add{overflow:visible;gap:3px;padding:4px}
 #add .sep{display:none}
 #add .btn{flex:1 1 0;min-width:0;height:40px;min-height:40px;padding:0 6px}
 #add #openAdd{flex:2 1 0;height:40px;border-radius:999px}
 #add .ib{width:auto;min-width:0;height:40px;flex:1 1 0;flex-direction:row;gap:0;padding:0;border-radius:999px}
 #add .sx-cap{display:none}

 /* đang sửa quầy: ẩn Xem/Chỉnh sửa, bảng xuống sát đáy và cao hơn */
 #store.sx-ed #tools{display:none}
 #store.sx-ed #insp{bottom:calc(8px + env(safe-area-inset-bottom,0px));max-height:60%}

 /* gọn hơn */
 .sx-tile{min-height:44px}
 .sx-sec{padding:12px;margin-bottom:8px}
 .sx-head{padding:10px 10px 8px 12px}
 .sx-nr>button{height:44px}
}

/* ===== v3: SP tinh gọn, nhường chỗ cho khung nhìn ===== */
@media(max-width:720px){
  /* toolbar chỉnh sửa */
 #add{top:66px;padding:4px;gap:3px;border-radius:18px}
 #add .btn,#add #openAdd,#add .ib{height:36px;min-height:36px;font-size:13px}
 #add #openAdd{flex:0 0 auto;width:auto;padding:0 16px 0 12px;gap:6px;white-space:nowrap;border-radius:999px}
 #add .ib{flex:1 1 0;min-width:0;padding:0;border-radius:999px}
 #add svg{width:16px;height:16px}

 /* thanh Xem / Chỉnh sửa / Danh sách */
 #tools{bottom:calc(8px + env(safe-area-inset-bottom,0px));padding:3px;gap:3px}
 #tools .seg{padding:2px}
 #tools .seg button{padding:5px 12px;font-size:12.5px}
 .sx-lb{height:32px;padding:0 11px;font-size:12.5px;gap:4px}
 .sx-lb svg{width:15px;height:15px}

 /* bảng chi tiết / chỉnh sửa: thấp hơn, sát đáy */
 #insp{left:6px;right:6px;bottom:calc(52px + env(safe-area-inset-bottom,0px));max-height:44%;border-radius:20px}
 #store.sx-ed #insp{bottom:calc(6px + env(safe-area-inset-bottom,0px));max-height:46%}
 .sx-head{padding:8px 8px 4px 10px;gap:8px}
 .sx-ti.lg{width:32px;height:32px;border-radius:10px}
 .sx-ti.lg svg{width:18px;height:18px}
 .sx-ht b{font-size:14px}
 .sx-ht small{font-size:11px}
 .sx-ib{width:30px;height:30px}
 #insp .sx-body{padding:2px 8px 10px}

 /* khối nội dung */
 .sx-sec{padding:10px;margin-bottom:6px;border-radius:14px}
 .sx-sec>h6{margin-bottom:6px;font-size:11px}
 .sx-hint{display:none}
 .sx-kv{gap:5px}
 .sx-kv>div{padding:5px 8px;border-radius:10px}
 .sx-kv em{font-size:10px}
 .sx-kv b{font-size:12.5px}

 /* dock icon */
 .sx-dock{gap:5px;margin-bottom:6px}
 .sx-tile{min-height:36px;border-radius:12px}
 .sx-tile svg{width:17px;height:17px}

 /* ô nhập, bước ±, preset */
 #insp .sx-f{min-height:36px;padding:0 10px;border-radius:10px}
 #insp .sx-f input[type=text]{height:34px}
 .sx-n+.sx-n{margin-top:10px}
 .sx-nl{margin-bottom:5px;font-size:12px}
 .sx-nl b{font-size:13px}
 .sx-nr{gap:4px}
 .sx-nr>button{min-width:38px;height:38px;border-radius:10px;font-size:17px}
 .sx-nr>button.bg{min-width:40px;font-size:11.5px}
 #insp .sx-vi input[type=text]{height:38px;border-radius:10px}
 .sx-pr{margin-top:5px;gap:4px}
 .sx-pr button{height:28px;border-radius:8px;font-size:11.5px}
 .sx-sg button{height:28px;font-size:12px}
 .sx-al{grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:4px}
 .sx-al button{height:32px;border-radius:10px;font-size:11.5px}
 .sx-row{height:40px;border-radius:12px;font-size:13px}
 .sx-rows{gap:6px}

 /* danh sách quầy (bottom sheet) */
 #legend{max-height:62%!important}
 .sx-lh{padding:6px 8px 4px 14px}
 .sx-lh h3{font-size:16px}
 .sx-sr{margin:0 10px 6px}
 .sx-sr input{height:32px}
 .sx-cs{padding:0 10px 6px}
 .sx-ch{height:28px;padding:0 10px;font-size:11.5px}
 .sx-it{min-height:46px;padding:6px 10px 6px 8px}
 .sx-ti{width:30px;height:30px;border-radius:9px}
 .sx-tx b{font-size:13px}
 .sx-gl{margin:8px 8px 4px}

 /* modal thêm quầy */
 #amodal .pv{height:24dvh;min-height:140px}
 #amodal .box.wide{padding:12px 12px calc(10px + env(safe-area-inset-bottom,0px))}
 .sx-sel .sx-ti{width:42px;height:42px;border-radius:13px}
 .sx-sel b{font-size:15px}
 .sx-tiles{gap:4px}
}


/* ===== v4: danh sách quầy chi tiết + bộ lọc gọn ===== */
.sx-tb{display:flex;gap:6px;align-items:center;margin:2px 12px 8px;flex:none}
.sx-tb .sx-sr{flex:1;min-width:0;margin:0}
.sx-fb{position:relative;flex:none;display:grid;place-items:center;width:36px;height:36px;padding:0;border:0;border-radius:10px;background:var(--sx-fill);color:var(--sx-sub);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.sx-fb:active{background:var(--sx-fill2)}
.sx-fb.open{background:var(--ink);color:var(--bg)}
.sx-fb.act::after{content:"";position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--acc)}

/* bảng lọc: xổ mượt, mặc định đóng */
.sx-fp{display:grid;grid-template-rows:0fr;transition:grid-template-rows .25s ease;flex:none}
.sx-fp.on{grid-template-rows:1fr}
.sx-fi{min-height:0;overflow:hidden}
.sx-fx{margin:0 12px 8px;padding:10px 12px 12px;background:var(--sx-grp);border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.sx-fs+.sx-fs{margin-top:10px}
.sx-fs>em{display:block;margin:0 0 6px;font-style:normal;font-size:11px;font-weight:500;color:var(--sx-sub)}
.sx-fc{display:flex;flex-wrap:wrap;gap:5px}
.sx-fc .sx-ch{height:28px;padding:0 10px;font-size:12px}

/* tiêu đề nhóm: chấm màu theo loại + số lượng dạng viên */
.sx-gl{gap:7px;margin:12px 10px 6px}
.sx-gl .sx-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--tc)}
.sx-gl span:not(.sx-dot){font-size:12px;font-weight:600;color:var(--ink)}
.sx-gl i{margin-left:auto;padding:1px 8px;border-radius:999px;background:var(--sx-fill);font-size:11px;font-weight:500;color:var(--sx-sub)}

/* dòng quầy: icon tô màu loại, tên đậm, mã mono, các thông số dạng viên nhỏ */
#legend .sx-it{position:relative;align-items:flex-start;gap:11px;min-height:0;padding:10px}
#legend .sx-it .sx-ti{width:36px;height:36px;border-radius:11px;background:var(--sx-fill);color:var(--tc,var(--ink))}
@supports(background:color-mix(in srgb,red 10%,transparent)){#legend .sx-it .sx-ti{background:color-mix(in srgb,var(--tc) 15%,transparent)}}
#legend .sx-it.on .sx-ti{background:rgba(255,255,255,.22);color:#fff}
#legend .sx-it+.sx-it::before{content:"";position:absolute;left:57px;right:10px;top:0;height:1px;background:rgba(120,120,128,.18)}
#legend .sx-it.on::before,#legend .sx-it.on+.sx-it::before{display:none}
#legend .sx-tx{display:flex;flex-direction:column;gap:2px}
#legend .sx-tx b{font-size:14px;font-weight:600}
#legend .sx-tx small{font-size:11px;letter-spacing:.01em}
.sx-ps{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.sx-p{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:6px;background:var(--sx-fill);color:var(--sx-sub);font-size:10.5px;font-weight:500;white-space:nowrap;font-variant-numeric:tabular-nums}
#legend .sx-it.on .sx-p{background:rgba(255,255,255,.2);color:#fff}
@media(max-width:720px){
 .sx-tb{margin:0 10px 6px}
 .sx-fb{width:32px;height:32px}
 .sx-fx{margin:0 10px 6px}
}

/* ===== v5: mỗi quầy là một thẻ bo riêng ===== */
.sx-grp{display:flex;flex-direction:column;gap:6px;background:none;padding:0;border-radius:0;box-shadow:none}
#legend .sx-it{background:var(--sx-grp);border-radius:16px;padding:10px 12px 10px 10px;box-shadow:0 1px 2px rgba(0,0,0,.06),inset 0 0 0 .5px rgba(120,120,128,.14)}
#legend .sx-it+.sx-it::before{display:none}
@media(hover:hover){#legend .sx-it:hover{background:var(--sx-grp);box-shadow:0 3px 10px rgba(0,0,0,.1),inset 0 0 0 .5px rgba(120,120,128,.2)}}
#legend .sx-it:active{background:var(--sx-fill2)}
#legend .sx-it.on,#legend .sx-it.on:hover,#legend .sx-it.on:active{background:var(--acc);box-shadow:0 6px 16px rgba(10,132,255,.32),inset 0 1px 0 rgba(255,255,255,.3)}
#legend .sx-body{padding:0 10px 14px}
.sx-gl{margin:14px 6px 6px}
@media(max-width:720px){
 .sx-grp{gap:5px}
 #legend .sx-it{border-radius:14px;padding:9px 10px 9px 9px}
}

/* ===== xem trước tủ: nút tự xoay ===== */
.sx-spin{position:absolute;right:10px;top:10px;z-index:3;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:0;border-radius:999px;background:var(--sx-panel);color:var(--ink);font:500 12px -apple-system,"Segoe UI",sans-serif;white-space:nowrap;cursor:pointer;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.sx-spin svg{color:var(--sx-sub)}
.sx-spin.on{background:var(--ink);color:var(--bg)}
.sx-spin.on svg{color:inherit}
.sx-spin:active{transform:scale(.95)}
`;
  document.head.appendChild(css);
  /* gỡ rule cũ của #legend button / #legend b (nguyên nhân thẻ xếp dọc, chữ mono xanh) */
  for (const sh of document.styleSheets) {
    try {
      const r = sh.cssRules;
      for (let i = r.length - 1; i >= 0; i--) {
        const t = r[i].selectorText;
        if (t && /^#legend (button|b)\b/.test(t)) sh.deleteRule(i);
      }
    } catch (e) {}
  }

  /* ---------- Bộ nút giữ để lặp nhanh ---------- */
  function holdRepeat(b, go, fast) {
    let h = null;
    const stop = () => {
      if (h) {
        clearTimeout(h.t);
        clearInterval(h.i);
        h = null;
      }
    };
    b.onpointerdown = (e) => {
      e.preventDefault();
      stop();
      go();
      h = {
        t: setTimeout(() => {
          h.i = setInterval(go, fast);
        }, 380),
      };
    };
    b.onpointerup = b.onpointerleave = b.onpointercancel = stop;
    b.oncontextmenu = (e) => e.preventDefault();
  }
  /* khối chỉnh số: « −big · − · [ô nhập] · + · +big » (+ preset góc) */
  function nb(k, label, ic, val, unit, c, pre) {
    return `<div class="sx-n"><div class="sx-nl"><span>${IC(ic, 14)}${label}</span><b data-lv="${k}">${val}${unit}</b></div>
<div class="sx-nr"><button class="bg" data-st="${k}:-2">−${fnum(c.bg)}</button><button data-st="${k}:-1">−</button><span class="sx-vi"><input type="text" inputmode="decimal" data-in="${k}" value="${val}"><em>${unit}</em></span><button data-st="${k}:1">+</button><button class="bg" data-st="${k}:2">+${fnum(c.bg)}</button></div>
${pre ? `<div class="sx-pr">${pre.map((p) => `<button data-sv="${k}:${p}" class="${+p === +val ? "act" : ""}">${p}°</button>`).join("")}</div>` : ""}</div>`;
  }
  function wireNum(root, CFG, apply) {
    root.querySelectorAll("[data-st]").forEach((b) => {
      const [k, d] = b.dataset.st.split(":"),
        c = CFG[k];
      holdRepeat(
        b,
        () =>
          apply(
            k,
            c.get() + Math.sign(+d) * (Math.abs(+d) === 2 ? c.bg : c.sm),
          ),
        k === "r" ? 110 : 70,
      );
    });
    root.querySelectorAll("[data-sv]").forEach(
      (b) =>
        (b.onclick = () => {
          const [k, v] = b.dataset.sv.split(":");
          apply(k, +v);
        }),
    );
    root.querySelectorAll("[data-in]").forEach((i) => {
      i.onchange = () => apply(i.dataset.in, String(i.value).replace(",", "."));
      i.onfocus = () => i.select();
    });
  }

  /* ================= DANH SÁCH QUẦY ================= */
  let legQ = "",
    legT = "all",
    open = !mq.matches;
  const leg = $("#legend"),
    scrim = document.createElement("div");
  scrim.className = "sx-scrim";
  $("#store").appendChild(scrim);
  $("#tools").insertAdjacentHTML(
    "afterbegin",
    `<button class="sx-lb" id="lbtn" title="Danh sách quầy">${IC("list", 17)}<span>Danh sách</span></button>`,
  );
  const lbtn = $("#lbtn");
  function applyLeg() {
    leg.classList.toggle("shut", !open);
    scrim.classList.toggle("on", open && mq.matches);
    lbtn.classList.toggle("act", open);
  }
  lbtn.onclick = () => {
    open = !open;
    applyLeg();
  };
  scrim.onclick = () => {
    open = false;
    applyLeg();
  };
  mq.addEventListener("change", () => {
    open = !mq.matches;
    applyLeg();
  });
  /* đổi chế độ Xem / Chỉnh sửa: danh sách luôn dùng được; màn hình hẹp tự thu gọn để chừa chỗ */
  $("#tools").addEventListener("click", (e) => {
    const m = e.target.dataset && e.target.dataset.m;
    if (!m) return;
    leg.style.display = "";
    open = mq.matches ? false : !(m === "edit" && innerWidth < 1180);
    applyLeg();
  });

  ICONS.sliders =
    '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>';
  let legS = "code",
    legF = false;
  const SORTS = { code: "Mã quầy", name: "Tên", len: "Chiều dài" };
  const SORTF = {
    code: (a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }),
    name: (a, b) => a.name.localeCompare(b.name, "vi"),
    len: (a, b) =>
      b.size[1] - a.size[1] ||
      a.code.localeCompare(b.code, undefined, { numeric: true }),
  };
  function sxFlt() {
    $("#lgp").classList.toggle("on", legF);
    $("#lgb").classList.toggle("open", legF);
  }
  function sxShell() {
    if (leg.querySelector(".sx-list")) return;
    leg.innerHTML = `<div class="sx-lh"><h3>Danh sách quầy<span id="lgn">0</span></h3><button class="sx-ib" data-g="ov" title="Xem toàn cảnh">${IC("fit", 16)}</button><button class="sx-ib" data-g="x" title="Đóng">${IC("x", 14)}</button></div>
<div class="sx-tb"><label class="sx-sr">${IC("search", 16)}<input type="text" id="lgq" placeholder="Tìm tên hoặc mã quầy" autocomplete="off" enterkeyhint="search"></label><button class="sx-fb" id="lgb" data-g="flt" title="Lọc & sắp xếp" aria-label="Lọc và sắp xếp">${IC("sliders", 17)}</button></div>
<div class="sx-fp" id="lgp"><div class="sx-fi"><div class="sx-fx" id="lgfx"></div></div></div>
<div class="sx-body sx-list" id="lgl"></div>`;
    $("#lgq").oninput = (e) => {
      legQ = e.target.value;
      sxPaint();
    };
    leg.onclick = (e) => {
      const g = e.target.closest("[data-g]");
      if (g) {
        const k = g.dataset.g;
        if (k === "flt") {
          legF = !legF;
          sxFlt();
          return;
        }
        if (k === "ov") overview();
        if (k === "x" || mq.matches) {
          open = false;
          applyLeg();
        }
        return;
      }
      const ch = e.target.closest(".sx-ch");
      if (ch) {
        legT = ch.dataset.t;
        sxPaint();
        return;
      }
      const sb = e.target.closest("[data-s]");
      if (sb) {
        legS = sb.dataset.s;
        sxPaint();
        return;
      }
      const it = e.target.closest(".sx-it");
      if (!it) return;
      const c = it.dataset.c;
      select(c, true);
      if (mode === "view") focusItem(c);
      if (mq.matches) {
        open = false;
        applyLeg();
      }
    };
  }
  const pill = (t) => `<span class="sx-p">${t}</span>`;
  const itemHtml = (s) => {
    const tc = TC[s.type] || "#0a84ff",
      T = s.details && s.details.soTang;
    return `<button class="sx-it${s.code === selected ? " on" : ""}" data-c="${esc(s.code)}" style="--tc:${tc}"><span class="sx-ti">${IC("t_" + s.type, 19)}</span><span class="sx-tx"><b>${esc(s.name)}</b><small>${esc(s.code)}</small><span class="sx-ps">${pill(s.sides + " mặt")}${pill(fnum(s.size[1]) + "×" + fnum(s.size[0]) + " m")}${T ? pill(T + " tầng") : ""}${pill(deg(s.rot) + "°")}</span></span></button>`;
  };
  function sxPaint() {
    sxShell();
    const all = ShelfRegistry.all(),
      q = legQ.trim().toLowerCase(),
      cnt = {};
    all.forEach((s) => (cnt[s.type] = (cnt[s.type] || 0) + 1));
    if (legT !== "all" && !cnt[legT]) legT = "all";
    const vis = all.filter(
      (s) =>
        (legT === "all" || s.type === legT) &&
        (!q || (s.name + " " + s.code).toLowerCase().includes(q)),
    );
    $("#lgn").textContent =
      legT !== "all" || q ? vis.length + "/" + all.length : all.length;
    $("#lgb").classList.toggle("act", legT !== "all");
    const chip = (k, lb, n, ic) =>
      `<button class="sx-ch${legT === k ? " act" : ""}" data-t="${k}">${IC(ic, 13)}<span>${lb}</span><i>${n}</i></button>`;
    $("#lgfx").innerHTML =
      `<div class="sx-fs"><em>Loại quầy</em><div class="sx-fc">${
        chip("all", "Tất cả", all.length, "list") +
        Object.keys(TYPES)
          .filter((t) => cnt[t])
          .map((t) => chip(t, TYPES[t][0], cnt[t], "t_" + t))
          .join("")
      }</div></div>
<div class="sx-fs"><em>Sắp xếp theo</em><div class="sx-sg">${Object.entries(
        SORTS,
      )
        .map(
          ([k, v]) =>
            `<button data-s="${k}" class="${legS === k ? "act" : ""}">${v}</button>`,
        )
        .join("")}</div></div>`;
    let h = "";
    Object.keys(TYPES).forEach((t) => {
      const g = vis.filter((s) => s.type === t).sort(SORTF[legS]);
      if (!g.length) return;
      h +=
        `<div class="sx-gl" style="--tc:${TC[t] || "#0a84ff"}"><span>${TYPES[t][0]}</span><i>${g.length}</i></div><div class="sx-grp">` +
        g.map(itemHtml).join("") +
        "</div>";
    });
    $("#lgl").innerHTML =
      h || '<div class="sx-none">Không tìm thấy quầy nào.</div>';
  }
  legend = function () {
    sxPaint();
  };

  /* chọn quầy từ bản đồ → cuộn danh sách tới đúng quầy */
  const _sel = select;
  select = function (c, f) {
    _sel(c, f);
    const L = $("#lgl");
    if (!L || !c) return;
    const it = L.querySelector(`.sx-it[data-c="${CSS.escape(c)}"]`);
    if (!it) return;
    const r = it.getBoundingClientRect(),
      lr = L.getBoundingClientRect();
    if (!lr.height) return;
    if (r.top < lr.top + 8 || r.bottom > lr.bottom - 8)
      L.scrollTo({
        top: L.scrollTop + (r.top - lr.top) - (lr.height - r.height) / 2,
        behavior: "smooth",
      });
  };

  /* ================= THANH CÔNG CỤ CHỈNH SỬA ================= */
  const cap = (t) => `<span class="sx-cap">${t}</span>`;
  $("#add").innerHTML =
    `<button class="btn pri" id="openAdd">${IC("plus", 16)}<span class="l3">Thêm quầy</span></button><i class="sep"></i>
<button class="btn ib" id="hu" title="Hoàn tác (Ctrl+Z)">${IC("undo", 17)}${cap("Hoàn tác")}</button>
<button class="btn ib" id="hr" title="Làm lại (Ctrl+Y)">${IC("redo", 17)}${cap("Làm lại")}</button>
<button class="btn ib${snapOn ? " on" : ""}" id="sn" title="Tự hít vào tường / quầy bên cạnh">${IC("magnet", 17)}${cap("Tự hít")}</button>
<button class="btn ib" id="ov" title="Xem toàn cảnh cửa hàng">${IC("fit", 17)}${cap("Toàn cảnh")}</button>
<button class="btn ib" id="rs" title="Khôi phục bố cục mặc định">${IC("rotL", 17)}${cap("Mặc định")}</button>`;
  updHist();

  /* ================= BẢNG CHI TIẾT / CHỈNH SỬA ================= */
  let sxFold = false,
    sxLast = null,
    sxG = 0,
    sxArm = 0;
  const tile = (a, ic, lb, cls = "", tt = lb) =>
    `<button class="sx-tile ${cls}" data-a="${a}" title="${tt}" aria-label="${tt}">${IC(ic, 20)}</button>`;
  inspector = function () {
    const el = $("#insp"),
      it = selected && ShelfRegistry.get(selected);
    el.classList.toggle("empty", !it);
    if (!it) {
      $("#store").classList.remove("sx-ed");
      el.onclick = null;
      el.innerHTML = `<div class="sx-empty"><span class="sx-ti lg">${IC("list", 22)}</span><b>Chưa chọn quầy</b><span>${mode === "edit" ? "Chạm vào quầy trên bản đồ hoặc trong danh sách để chỉnh sửa. Kéo quầy để di chuyển." : "Chạm vào một quầy trên bản đồ hoặc trong danh sách để xem chi tiết."}</span></div>`;
      return;
    }
    const keep =
      sxLast === it.code
        ? (el.querySelector(".sx-body") || {}).scrollTop || 0
        : 0;
    if (sxLast !== it.code) {
      sxLast = it.code;
      sxFold = false;
    }
    el.classList.toggle("fold", sxFold);
    const edit = mode === "edit",
      tc = TC[it.type] || "#0a84ff",
      canSides = SIDED.includes(it.type);
    $("#store").classList.toggle("sx-ed", edit);
    const head = `<div class="sx-head" style="${tcs(tc)}"><span class="sx-ti lg">${IC("t_" + it.type, 23)}</span><div class="sx-ht"><small class="code">${esc(it.code)}</small><b id="sxn">${esc(it.name)}</b></div><button class="sx-ib" data-a="fold" title="Thu gọn / mở rộng">${IC("chev", 16)}</button><button class="sx-ib" data-a="close" title="Bỏ chọn">${IC("x", 14)}</button></div>`;
    const kv = (a) =>
      `<div class="sx-kv">${a.map((c) => `<div><em>${c[0]}</em><b>${esc(c[1])}</b></div>`).join("")}</div>`;
    let body;
    if (!edit) {
      const cells = [
        ["Loại", TYPES[it.type][0]],
        ["Số mặt", it.sides + " mặt"],
        ["Chiều dài", it.size[1] + " m"],
        ["Độ sâu", it.size[0] + " m"],
        ["Hướng", deg(it.rot) + "°"],
        ["Vị trí", (+it.pos[0]).toFixed(1) + " · " + (+it.pos[1]).toFixed(1)],
      ];
      if (it.details && it.details.soTang)
        cells.push(["Số tầng", it.details.soTang]);
      body = `<div class="sx-sec"><h6>${IC("tag", 13)}Thông tin</h6>${kv(cells)}</div>
<div class="sx-sec"><h6>${IC("zoomin", 13)}Thao tác</h6><div class="sx-rows"><button class="sx-row pri" data-a="edit">${IC("edit", 16)}<span>Chỉnh sửa quầy này</span></button><button class="sx-row" data-a="f">${IC("zoomin", 16)}<span>Zoom tới quầy</span></button><button class="sx-row" data-a="e">${IC("download", 16)}<span>Xuất JSON</span></button></div></div>`;
    } else {
      body = `<div class="sx-dock">${tile("l", "rotL", "Trái", "", "Xoay trái 90°")}${tile("r", "rotR", "Phải", "", "Xoay phải 90°")}${tile("f", "zoomin", "Zoom", "", "Zoom tới quầy")}${tile("c", "copy", "Nhân bản")}${tile("x", "trash", "Xóa", "danger", "Xóa quầy")}</div>
<div class="sx-sec"><h6>${IC("edit", 13)}Thông tin</h6><label class="sx-f"><span>Tên quầy</span><input type="text" id="fn" value="${esc(it.name)}"></label>
<div class="sx-mt">${kv([
        ["Loại", TYPES[it.type][0]],
        ["Vị trí", (+it.pos[0]).toFixed(1) + " · " + (+it.pos[1]).toFixed(1)],
      ])}</div>
${canSides ? `<div class="sx-n sx-mt"><div class="sx-nl"><span>${IC("layers", 14)}Số mặt hàng</span></div><div class="sx-sg"><button data-sd="1" class="${it.sides === 1 ? "act" : ""}">1 mặt</button><button data-sd="2" class="${it.sides === 2 ? "act" : ""}">2 mặt</button></div></div>` : ""}</div>
<div class="sx-sec"><h6>${IC("rotR", 13)}Hướng quầy</h6>${nb("r", "Góc xoay", "rotR", deg(it.rot), "°", STP.r, [0, 90, 180, 270])}</div>
<div class="sx-sec"><h6>${IC("ruler", 13)}Kích thước</h6>${nb("d", "Chiều dài", "ruler", it.size[1], "m", STP.d)}${nb("w", "Độ sâu", "ruler", it.size[0], "m", STP.w)}</div>
<div class="sx-sec"><h6>${IC("magnet", 13)}Căn chỉnh nhanh</h6><div class="sx-al">${[
        ["wall", "Sát tường"],
        ["mid", "Giữa ngang"],
        ["midz", "Giữa dọc"],
        ["row", "Thẳng hàng"],
        ["next", "Sát quầy bên"],
        ["sq", "Góc vuông"],
        ["corner", "Vào góc"],
      ]
        .map((a) => `<button data-al="${a[0]}">${a[1]}</button>`)
        .join(
          "",
        )}</div><p class="sx-hint">Mẹo: kéo quầy trên bản đồ, đường xanh / cam sẽ báo khi thẳng hàng với tường hoặc quầy khác.</p></div>
<div class="sx-sec"><h6>${IC("data", 13)}Dữ liệu</h6><div class="sx-rows"><button class="sx-row" data-a="e">${IC("download", 16)}<span>Xuất JSON quầy này</span></button></div></div>`;
    }
    el.innerHTML = head + `<div class="sx-body">${body}</div>`;
    const bd = el.querySelector(".sx-body");
    if (keep) bd.scrollTop = keep;

    el.onclick = (e) => {
      const al = e.target.closest("[data-al]");
      if (al) {
        alignItem(it, al.dataset.al);
        return;
      }
      const sd = e.target.closest("[data-sd]");
      if (sd) {
        const n = +sd.dataset.sd;
        if (it.sides !== n) {
          pushHist();
          it.sides = n;
          build(it);
          save();
          inspector();
        }
        return;
      }
      const bt = e.target.closest("[data-a]");
      if (!bt) return;
      const a = bt.dataset.a;
      if (a === "fold") {
        sxFold = !sxFold;
        el.classList.toggle("fold", sxFold);
        return;
      }
      if (a === "close") {
        select(null);
        return;
      }
      if (a === "edit") {
        document.querySelector('#tools [data-m="edit"]').click();
        return;
      }
      if (a === "l") rot(-PI / 2);
      if (a === "r") rot(PI / 2);
      if (a === "f") focusItem(it.code);
      if (a === "e") exportShelf(it);
      if (a === "c")
        addItem(
          it.type,
          it.sides,
          [...it.size],
          [it.pos[0] + 1.5, it.pos[1]],
          it.rot,
          it.name,
        );
      if (a === "x") {
        if (bt.classList.contains("arm")) {
          del();
          return;
        }
        bt.classList.add("arm");
        bt.querySelector("span").textContent = "Chạm lại";
        bt.classList.add("arm");
        bt.title = "Chạm lại để xóa";
        toast("Chạm lại để xóa quầy");
        clearTimeout(sxArm);
        sxArm = setTimeout(() => {
          if (bt.isConnected) {
            bt.classList.remove("arm");
            bt.title = "Xóa quầy";
          }
        }, 2600);
      }
    };
    if (!edit) return;

    const CFG = {
      r: {
        get: () => deg(it.rot),
        set: (v) => (it.rot = (v * PI) / 180),
        min: 0,
        max: 360,
        sm: STP.r.sm,
        bg: STP.r.bg,
        dec: 0,
      },
      d: {
        get: () => it.size[1],
        set: (v) => (it.size = [it.size[0], v]),
        min: 1,
        max: 8,
        sm: STP.d.sm,
        bg: STP.d.bg,
        dec: 2,
      },
      w: {
        get: () => it.size[0],
        set: (v) => (it.size = [v, it.size[1]]),
        min: 0.6,
        max: 2,
        sm: STP.w.sm,
        bg: STP.w.bg,
        dec: 2,
      },
    };
    const fmt = (k, v) => String(+(+v).toFixed(CFG[k].dec));
    const sync = (k, v) => {
      const i = el.querySelector(`[data-in="${k}"]`);
      if (i) i.value = fmt(k, v);
      const l = el.querySelector(`[data-lv="${k}"]`);
      if (l) l.textContent = fmt(k, v) + (k === "r" ? "°" : "m");
      if (k === "r")
        el.querySelectorAll("[data-sv]").forEach((b) =>
          b.classList.toggle("act", +b.dataset.sv.split(":")[1] === +v),
        );
    };
    const apply = (k, v) => {
      const c = CFG[k];
      v = +v;
      if (!isFinite(v)) return;
      v =
        k === "r"
          ? ((Math.round(v) % 360) + 360) % 360
          : clamp(+v.toFixed(2), c.min, c.max);
      pushHistDeb();
      c.set(v);
      build(it);
      place();
      save();
      sync(k, v);
      showResizeGuides(it);
      clearTimeout(sxG);
      sxG = setTimeout(() => guides(null), 1400);
    };
    wireNum(el, CFG, apply);
    $("#fn").oninput = (e) => {
      it.name = e.target.value;
      const n = $("#sxn");
      if (n) n.textContent = it.name;
      legend();
      save();
    };
  };
  inspector();

  /* ================= MODAL THÊM QUẦY ================= */
  let aCfg = null,
    aSpec = null,
    aSpinBtn = null,
    aGrid = null,
    aSz = { x: 1, y: 1, z: 1 };
  const ACFG = {
    len: { get: () => aCfg.len, min: 1, max: 8, sm: STP.d.sm, bg: STP.d.bg },
    dep: { get: () => aCfg.dep, min: 0.6, max: 2, sm: STP.w.sm, bg: STP.w.bg },
  };
  const aInit = (i) => {
    const p = PRESETS[i];
    aPre = i;
    aCfg = { type: p[1], name: "", sides: p[2], dep: p[3][0], len: p[3][1] };
  };
  const specUpd = () => {
    if (!aSpec) {
      aSpec = document.createElement("div");
      aSpec.className = "sx-spec";
      $("#cv4").parentElement.appendChild(aSpec);
    }
    if (!aSpinBtn) {
      aSpinBtn = document.createElement("button");
      aSpinBtn.className = "sx-spin";
      aSpinBtn.onclick = () => {
        window.aSpin = window.aSpin === false;
        try {
          localStorage.setItem("store-aspin", window.aSpin ? "1" : "0");
        } catch (e) {}
        paintSpin();
      };
      $("#cv4").parentElement.appendChild(aSpinBtn);
    }
    paintSpin();
    aSpec.textContent = `${fnum(aCfg.len)} × ${fnum(aCfg.dep)} m · cao ${fnum(aSz.y)} m · ${aCfg.sides} mặt`;
  };
  function paintSpin() {
    if (!aSpinBtn) return;
    const on = window.aSpin !== false;
    aSpinBtn.classList.toggle("on", on);
    aSpinBtn.innerHTML = IC("spin", 15) + "<span>Tự xoay</span>";
    aSpinBtn.title = on ? "Đang tự xoay 360° – chạm để dừng (vẫn kéo tay để xoay)" : "Đã dừng – chạm để tự xoay";
  }
  /* lưới sàn ô 0,5 m: thấy được tủ lớn / nhỏ thế nào so với nhau */
  function sxGrid(k) {
    if (!aGrid) {
      aGrid = new THREE.GridHelper(6, 12, 0x8e8e93, 0xb4b4ba);
      [].concat(aGrid.material).forEach((m) => {
        m.transparent = true;
        m.opacity = 0.35;
      });
      aGrid.position.y = 0.002;
      stage4.add(aGrid);
    }
    aGrid.scale.setScalar(k);
  }
  function aModel() {
    const c = aCfg;
    if (aMod) {
      stage4.remove(aMod);
      aMod.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
    }
    const g = new THREE.Group();
    BUILD[c.type](
      {
        code: "PRE_" + c.type,
        type: c.type,
        sides: c.sides,
        size: [c.dep, c.len],
        details: { soTang: 3 },
      },
      g,
    );
    if (typeof mergeGroup === "function") mergeGroup(g); /* gộp mesh cho bản xem trước mượt */
    const sz = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
    aSz = sz;
    /* tỉ lệ cố định cho mọi tủ ≤ 3,2 m (tủ nhỏ hiện nhỏ, tủ lớn hiện lớn); chỉ thu nhỏ khi vượt 3,2 m */
    const k = 2.4 / Math.max(3.2, sz.x, sz.y, sz.z);
    g.scale.setScalar(k);
    sxGrid(k);
    aMod = new THREE.Group();
    aMod.add(g);
    aMod.rotation.y = aRy;
    stage4.add(aMod);
  }
  function aRender() {
    const c = aCfg,
      p = PRESETS[aPre],
      tc = TC[c.type] || "#0a84ff",
      canSides = SIDED.includes(c.type);
    $("#alist").innerHTML =
      `<div class="sx-sec sx-sel" style="${tcs(tc)}"><span class="sx-ti">${IC("t_" + c.type, 28)}</span><div><b>${esc(p[0])}</b><p>${esc(DESC[aPre])}</p></div></div>
<div class="sx-sec"><h6>${IC("list", 13)}Chọn loại quầy</h6><div class="sx-tiles">${PRESETS.map((q, i) => `<button class="sx-it${i === aPre ? " on" : ""}" data-i="${i}" style="${tcs(TC[q[1]] || "#0a84ff")}"><span class="sx-ti">${IC("t_" + q[1], 19)}</span><span class="sx-tx"><b>${esc(q[0])}</b><small>${q[3][1]}×${q[3][0]} m</small></span></button>`).join("")}</div></div>
<div class="sx-sec"><h6>${IC("edit", 13)}Tùy chỉnh trước khi thêm</h6>
<label class="sx-f"><span>Tên quầy</span><input type="text" id="an" placeholder="${esc(TYPES[c.type][0])} mới" value="${esc(c.name)}"></label>
${canSides ? `<div class="sx-n sx-mt"><div class="sx-nl"><span>${IC("layers", 14)}Số mặt hàng</span></div><div class="sx-sg"><button data-sd="1" class="${c.sides === 1 ? "act" : ""}">1 mặt</button><button data-sd="2" class="${c.sides === 2 ? "act" : ""}">2 mặt</button></div></div>` : ""}
<div class="sx-mt"></div>${nb("len", "Chiều dài", "ruler", fnum(c.len), "m", ACFG.len)}${nb("dep", "Độ sâu", "ruler", fnum(c.dep), "m", ACFG.dep)}</div>
<div class="sx-note">${IC("pin", 14)}<span>Quầy được đặt vào chỗ trống gần giữa cửa hàng. Thêm xong, kéo để đặt đúng vị trí.</span></div>`;
    const root = $("#alist");
    const sync = (k, v) => {
      const i = root.querySelector(`[data-in="${k}"]`);
      if (i) i.value = fnum(v);
      const l = root.querySelector(`[data-lv="${k}"]`);
      if (l) l.textContent = fnum(v) + "m";
    };
    wireNum(root, ACFG, (k, v) => {
      const c2 = ACFG[k];
      v = +v;
      if (!isFinite(v)) return;
      v = clamp(+v.toFixed(2), c2.min, c2.max);
      aCfg[k] = v;
      sync(k, v);
      aModel();
      specUpd();
    });
    $("#an").oninput = (e) => {
      aCfg.name = e.target.value;
    };
  }
  showPre = function (i) {
    aInit(i);
    aRender();
    aModel();
    specUpd();
  };
  openAdd = function () {
    $("#amodal").classList.add("on");
    size4();
    if (!aCfg) aInit(aPre || 0);
    aRender();
    aModel();
    specUpd();
  };
  $("#alist").onclick = (e) => {
    const t = e.target.closest(".sx-it[data-i]");
    if (t) {
      showPre(+t.dataset.i);
      return;
    }
    const sd = e.target.closest("[data-sd]");
    if (sd) {
      aCfg.sides = +sd.dataset.sd;
      $("#alist")
        .querySelectorAll("[data-sd]")
        .forEach((b) => b.classList.toggle("act", b === sd));
      aModel();
      specUpd();
    }
  };
  $("#aok").onclick = () => {
    const c = aCfg,
      size = [c.dep, c.len];
    addItem(c.type, c.sides, size, freeSpot(size), 0, c.name.trim());
    $("#amodal").classList.remove("on");
    toast("Đã thêm quầy – kéo để đặt đúng chỗ");
  };

  /* ---------- khởi động ---------- */
  legend();
  applyLeg();
})();