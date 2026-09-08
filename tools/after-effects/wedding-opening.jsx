/*
 * wedding-opening.jsx  —  After Effects
 * ---------------------------------------------------------------------------
 * 結婚式オープニングムービーを組み立てる。
 *
 * 写真フォルダを選ぶと、コンポジションを作り、以下をすべてレイヤーとして生成する。
 *
 *   ・全編に乗る白いグリッド線と外枠
 *   ・写真のゆっくりズーム（Ken Burns）
 *   ・階段状に組んだベタ面（マゼンタ／紫／オレンジ）
 *   ・1字ずつ飛び込むキネティックタイポ（テキストアニメーター）
 *   ・漢字の姓名を散らして配置
 *   ・写真を 4×4 のタイルに分割
 *   ・四隅のコーナーブラケット
 *   ・エンドカード
 *
 * テキストはすべて本物のテキストレイヤーなので、AE 上で打ち直せる。
 *
 * 実行: ファイル > スクリプト > スクリプトファイルを実行...
 * ---------------------------------------------------------------------------
 */

// ===========================================================================
//  設定
// ===========================================================================
var CONFIG = {
    compName: "オープニングムービー",
    width: 1920,
    height: 1080,
    fps: 30,

    // お名前（漢字の姓名が中盤の主役になる）
    // kanji の空白は姓と名の間隔として扱われる（レイヤーは作られない）。
    // 新郎・新婦が逆なら、この2行を入れ替えるだけでよい。
    groom: { romaji: "HIGUCHI TSUKASA",  kanji: "樋口 司",   label: "Groom", given: "TSUKASA" },
    bride: { romaji: "YAMAMOTO NODOKA", kanji: "山本 和界", label: "Bride", given: "NODOKA" },
    date: "2027.11.20",

    welcome:  ["Welcome to", "our", "wedding reception"],
    journey:  "We begin our journey together",
    endcard:  ["Thank you for coming today", "このあともゆっくりお楽しみください"],

    // 書体（PostScript 名）。入っていなければ順に代替を試す。
    fontRound:  ["Quicksand-Light", "Quicksand-Regular", "Futura-Light", "Helvetica"],
    fontRoundM: ["Quicksand-Medium", "Quicksand-Bold", "Futura-Medium", "Helvetica-Bold"],
    fontScript: ["Sacramento-Regular", "Parisienne-Regular", "SnellRoundhand"],
    fontJP:     ["ZenKakuGothicNew-Light", "HiraginoSans-W2", "YuGothic-Light", "MS-Gothic"],

    gridOpacity: 30,      // 全編に乗るグリッド線の濃さ
    kenBurns: 8,          // 写真のズーム量（%）
    monoSections: true,   // 中盤の写真をモノクロにする

    // 写真のカットごとに動きを変える。同じズームの繰り返しだと飽きるため。
    // 下の MOTION_CYCLE の順に自動で切り替わる。
    varyMotion: true,

    // カットの切り替わりに入れる演出。TRANS_CYCLE の順に回る。
    transitions: true,

    // ベタ面が画面を覆う割合の目安（写真が見えなくならないように）
    blockCoverage: 0.36
};

// 写真の動きの型。順に切り替えて単調さを避ける。
//   zoomIn  寄る / zoomOut  引く / slideL 横に流す / slideU 縦に流す
//   punch   勢いよく入って着地 / tilt わずかに傾けながら寄る
var MOTION_CYCLE = ["zoomIn", "slideL", "zoomOut", "punch", "slideU", "tilt"];

// カットの切り替わりに入れる演出。
//   flash 白フラッシュ / blockWipe 色面が横切る / lineSweep 線が走る / none 素直に切る
var TRANS_CYCLE = ["blockWipe", "flash", "lineSweep", "blockWipe", "none", "flash"];

// スクショから拾った色（0〜1）
var C = {
    magenta: [0.886, 0.282, 0.549],
    purple:  [0.541, 0.176, 0.839],
    coral:   [0.961, 0.514, 0.310],
    gold:    [0.878, 0.643, 0.290],
    white:   [1, 1, 1],
    ink:     [0.23, 0.23, 0.23]
};

// ===========================================================================
//  構成 — 参考動画と同じ 1分26秒の流れ
//  type: photo / welcome / nameblock / tiles / climax / endcard
// ===========================================================================
var SCENES = [
    { type: "opening",   start:  0.0, dur:  2.0 },

    { type: "photo", file: "0.jpg",  start:  2.0, dur: 7.0 },              // キービジュアル
    { type: "welcome",   file: "6.jpg",  start:  9.0, dur: 5.0 },

    // ---- 新郎：小さい頃 → 今 -------------------------------------------
    { type: "photo", file: "2.jpg",  start: 14.0, dur: 3.0,
      label: CONFIG.groom.given, mono: true },                             // 幼少期はモノクロで
    { type: "nameblock", who: "groom", file: "4.jpg", start: 17.0, dur: 5.0,
      side: "right", mono: false },                                        // 今はカラーで受ける

    { type: "photo", file: "5.jpg",  start: 22.0, dur: 3.0 },
    { type: "photo", file: "7.jpg",  start: 25.0, dur: 3.0 },
    { type: "photo", file: "8.jpg",  start: 28.0, dur: 3.0 },
    { type: "photo", file: "9.jpg",  start: 31.0, dur: 3.0 },

    // ---- 新婦：小さい頃 → 今 -------------------------------------------
    { type: "photo", file: "1.jpg",  start: 34.0, dur: 3.0,
      label: CONFIG.bride.given, mono: true },
    { type: "nameblock", who: "bride", file: "3.jpg", start: 37.0, dur: 5.0,
      side: "left", mono: false },

    // ---- 大サビ ----------------------------------------------------------
    { type: "photo", file: "10.jpg", start: 42.0, dur: 3.2 },
    { type: "photo", file: "11.jpg", start: 45.2, dur: 3.2 },
    { type: "photo", file: "12.jpg", start: 48.4, dur: 3.2 },
    { type: "photo", file: "13.jpg", start: 51.6, dur: 3.2 },
    { type: "photo", file: "14.jpg", start: 54.8, dur: 3.2 },
    { type: "photo", file: "15.jpg", start: 58.0, dur: 3.2 },

    { type: "tiles", file: "16.jpg", start: 61.2, dur: 5.8 },

    { type: "photo", file: "17.jpg", start: 67.0, dur: 2.4 },
    { type: "split", files: ["19.jpg", "20.jpg"], start: 69.4, dur: 4.6 },

    { type: "climax", file: "0.jpg", start: 74.0, dur: 5.0 },              // 冒頭に戻す
    { type: "endcard", start: 79.0, dur: 7.0 }
];

var TOTAL = 86.0;


// ===========================================================================
//  以下は通常さわらなくて大丈夫です
// ===========================================================================

var W = CONFIG.width, H = CONFIG.height;
var report = { photos: 0, texts: 0, shapes: 0, transitions: 0, missing: [] };


function main() {
    if (!app.project) { app.newProject(); }

    var dir = Folder.selectDialog("写真フォルダを選んでください");
    if (!dir) { return; }

    app.beginUndoGroup("オープニングムービーを組み立て");
    try {
        var footage = importPhotos(dir);
        var comp = makeComp();

        buildScenes(comp, footage);
        report.transitions = buildTransitions(comp, SCENES);
        buildGridOverlay(comp);          // グリッドは全編、いちばん上

        comp.openInViewer();
        alert(buildReport());
    } catch (e) {
        alert("エラー: " + e.toString() + "\n(行 " + e.line + ")");
    }
    app.endUndoGroup();
}


// ---------------------------------------------------------------------------
//  素材とコンポジション
// ---------------------------------------------------------------------------

function importPhotos(dir) {
    var bin = app.project.items.addFolder("写真");
    var files = dir.getFiles(function (f) {
        return (f instanceof File) && /\.(jpe?g|png|tiff?)$/i.test(f.name);
    });
    var map = {};
    for (var i = 0; i < files.length; i++) {
        var io = new ImportOptions(files[i]);
        io.importAs = ImportAsType.FOOTAGE;
        var item = app.project.importFile(io);
        item.parentFolder = bin;
        map[files[i].name] = item;
    }
    return map;
}

function makeComp() {
    var comp = app.project.items.addComp(CONFIG.compName, W, H, 1.0, TOTAL, CONFIG.fps);
    var bg = comp.layers.addSolid(C.white, "白ベース", W, H, 1.0);
    bg.moveToEnd();
    bg.locked = true;
    return comp;
}


// ---------------------------------------------------------------------------
//  シーンを組み立てる
// ---------------------------------------------------------------------------

function buildScenes(comp, footage) {
    var photoIndex = 0;
    for (var i = SCENES.length - 1; i >= 0; i--) {   // 下から積むと重なり順が自然になる
        var s = SCENES[i];
        switch (s.type) {
            case "opening":   buildOpening(comp, s); break;
            case "photo":     buildPhoto(comp, footage, s, photoIndex++,
                                          { mono: s.mono, label: s.label }); break;
            case "welcome":   buildWelcome(comp, footage, s); break;
            case "nameblock": buildNameBlock(comp, footage, s); break;
            case "tiles":     buildTiles(comp, footage, s); break;
            case "split":     buildSplit(comp, footage, s); break;
            case "climax":    buildClimax(comp, footage, s); break;
            case "endcard":   buildEndcard(comp, s); break;
        }
    }
}

// --- 写真1枚 + ゆっくりズーム ---------------------------------------------
function buildPhoto(comp, footage, s, idx, opts) {
    opts = opts || {};
    var item = footage[s.file];
    if (!item) { report.missing.push(s.file); return null; }

    var L = comp.layers.add(item);
    L.name = "写真 " + s.file;
    L.startTime = s.start;
    L.inPoint = s.start;
    L.outPoint = s.start + s.dur;

    var base = fillScale(item);            // 画面いっぱいに覆う倍率
    var variant = opts.motion ||
                  (CONFIG.varyMotion ? MOTION_CYCLE[idx % MOTION_CYCLE.length] : "zoomIn");
    applyPhotoMotion(L, s, variant, base, idx);

    if (opts.mono) { addEffect(L, ["ADBE Black&White", "ADBE Tint"]); }
    if (opts.wash) { washOut(comp, L, s, opts.wash); }
    if (opts.label) { addPhotoLabel(comp, s, opts.label); }

    report.photos++;
    return L;
}

// 漢字を1字ずつに分解し、それぞれの横位置を決める。
// 半角・全角どちらの空白も、姓と名を離すための間隔として扱う。
function layoutKanji(str) {
    var STEP = 190, GAP = 100;
    var out = [], x = 0;
    for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        if (ch === " " || ch === "\u3000" || ch === "\t") { x += GAP; continue; }
        out.push({ ch: ch, dx: x });
        x += STEP;
    }
    return out;
}

// カットごとに動きを変える。
// ずっと同じ寄り引きだと見ている側が飽きるので、6種類を順に回す。
// どの型でも「止まって見える瞬間」を作らないのが狙い。
function applyPhotoMotion(L, s, variant, base, idx) {
    var tr = L.property("ADBE Transform Group");
    var sc = tr.property("ADBE Scale");
    var po = tr.property("ADBE Position");
    var t0 = s.start, t1 = s.start + s.dur;
    var z = CONFIG.kenBurns / 100;
    var dir = (idx % 2 === 0) ? 1 : -1;     // 1カットおきに向きを反転
    var cx = W / 2, cy = H / 2;

    switch (variant) {

        case "slideL":   // 拡大したまま横に流す。寄り引きより動きが分かりやすい
            sc.setValue([base * (1 + z), base * (1 + z)]);
            setEased(po, t0, [cx + W * 0.045 * dir, cy]);
            setEased(po, t1, [cx - W * 0.045 * dir, cy]);
            break;

        case "slideU":   // 縦に流す
            sc.setValue([base * (1 + z), base * (1 + z)]);
            setEased(po, t0, [cx, cy + H * 0.05 * dir]);
            setEased(po, t1, [cx, cy - H * 0.05 * dir]);
            break;

        case "punch":    // 勢いよく入ってすぐ着地。カット頭に力が出る
            po.setValue([cx, cy]);
            sc.setValueAtTime(t0, [base * (1 + z * 1.9), base * (1 + z * 1.9)]);
            sc.setValueAtTime(t0 + 0.45, [base * (1 + z * 0.35), base * (1 + z * 0.35)]);
            sc.setValueAtTime(t1, [base * (1 + z * 0.6), base * (1 + z * 0.6)]);
            easeKeys(sc);
            break;

        case "tilt":     // わずかに傾けながら寄る
            setEased(sc, t0, [base, base]);
            setEased(sc, t1, [base * (1 + z * 1.2), base * (1 + z * 1.2)]);
            po.setValue([cx, cy]);
            var rot = tr.property("ADBE Rotate Z");
            setEased(rot, t0, -0.9 * dir);
            setEased(rot, t1,  0.9 * dir);
            break;

        case "zoomOut":
            setEased(sc, t0, [base * (1 + z), base * (1 + z)]);
            setEased(sc, t1, [base, base]);
            setEased(po, t0, [cx - W * 0.012 * dir, cy]);
            setEased(po, t1, [cx + W * 0.012 * dir, cy]);
            break;

        default:         // zoomIn
            setEased(sc, t0, [base, base]);
            setEased(sc, t1, [base * (1 + z), base * (1 + z)]);
            setEased(po, t0, [cx + W * 0.012 * dir, cy]);
            setEased(po, t1, [cx - W * 0.012 * dir, cy]);
            break;
    }
    return variant;
}

// 幼少期の写真に小さく名前を添える。
// このあとの姓名の場面と対にすることで「この子が育って今この人」と読ませる。
function addPhotoLabel(comp, s, text) {
    var t = makeText(comp, text, {
        font: CONFIG.fontRound, size: 40, color: C.white, tracking: 420, justify: "left"
    });
    t.name = "ラベル " + text;
    t.startTime = s.start; t.inPoint = s.start; t.outPoint = s.start + s.dur;
    t.property("ADBE Transform Group").property("ADBE Position").setValue([W * 0.09, H * 0.86]);
    kineticIn(t, s.start + 0.25, 0.7);
    return t;
}

// 写真を画面いっぱいに覆う倍率（％）
function fillScale(item) {
    return Math.max(W / item.width, H / item.height) * 100;
}

// 写真の上に白を重ねて明るく飛ばす（参考動画の低コントラストな見え方）
function washOut(comp, under, s, amount) {
    var v = comp.layers.addSolid(C.white, "白ベール", W, H, 1.0);
    v.startTime = s.start; v.inPoint = s.start; v.outPoint = s.start + s.dur;
    v.property("ADBE Transform Group").property("ADBE Opacity").setValue(amount);
    v.moveBefore(under);
    report.shapes++;
    return v;
}


// --- 0:00-0:02 オープニング：白い帯が角度を変えて横切る ---------------------
function buildOpening(comp, s) {
    var angles = [-28, 34, -16, 22];
    for (var i = 0; i < angles.length; i++) {
        var band = makeRect(comp, W * 2, H * 2.2, C.white, "ワイプ " + (i + 1));
        band.startTime = s.start; band.inPoint = s.start; band.outPoint = s.start + s.dur;
        band.property("ADBE Transform Group").property("ADBE Rotate Z").setValue(angles[i]);

        var t0 = s.start + i * 0.14, t1 = t0 + 0.5;
        var pos = band.property("ADBE Transform Group").property("ADBE Position");
        setEased(pos, t0, [W / 2, H / 2]);
        setEased(pos, t1, [W * 2.4, H / 2]);
    }
}


// --- 0:14 Welcome to our wedding reception ---------------------------------
function buildWelcome(comp, footage, s) {
    buildPhoto(comp, footage, s, 0, { wash: 30 });

    for (var i = 0; i < CONFIG.welcome.length; i++) {
        var t = makeText(comp, CONFIG.welcome[i], {
            font: CONFIG.fontRound, size: 108, color: C.white,
            tracking: 30, justify: "center"
        });
        t.name = "Welcome " + (i + 1);
        t.startTime = s.start; t.inPoint = s.start; t.outPoint = s.start + s.dur;
        t.property("ADBE Transform Group").property("ADBE Position")
         .setValue([W / 2, H * 0.36 + i * 138]);
        kineticIn(t, s.start + 0.15 + i * 0.18, 0.9);   // 1字ずつ下から立ち上げる
    }
}


// --- 0:19 / 0:43 面で割る＋漢字の姓名 --------------------------------------
function buildNameBlock(comp, footage, s) {
    var who = CONFIG[s.who];
    var wantMono = (s.mono === undefined) ? CONFIG.monoSections : s.mono;
    buildPhoto(comp, footage, s, 0, { mono: wantMono });

    var right = (s.side === "right");
    var bx = right ? W * 0.40 : 0;

    // 階段状のベタ面。時間差で滑り込ませる。
    // 画面の 1/3 強しか覆わない。写真の主役が隠れると何の場面か分からなくなるため。
    var blocks = right ? [
        { w: W * 0.34, h: H * 0.62, x: W * 0.83, y: H * 0.31, col: C.purple,  d: 0.00 },
        { w: W * 0.20, h: H * 0.22, x: W * 0.90, y: H * 0.73, col: C.purple,  d: 0.10 },
        { w: W * 0.26, h: H * 0.30, x: W * 0.13, y: H * 0.15, col: C.coral,   d: 0.18 },
        { w: W * 0.11, h: H * 0.24, x: W * 0.055,y: H * 0.42, col: C.magenta, d: 0.26 }
    ] : [
        { w: W * 0.34, h: H * 0.62, x: W * 0.17, y: H * 0.31, col: C.purple,  d: 0.00 },
        { w: W * 0.20, h: H * 0.22, x: W * 0.10, y: H * 0.73, col: C.purple,  d: 0.10 },
        { w: W * 0.26, h: H * 0.30, x: W * 0.87, y: H * 0.15, col: C.coral,   d: 0.18 },
        { w: W * 0.11, h: H * 0.24, x: W * 0.945,y: H * 0.42, col: C.magenta, d: 0.26 }
    ];
    for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        var L = makeRect(comp, b.w, b.h, b.col, "面 " + (i + 1));
        L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        var from = (b.x > W / 2) ? [b.x + W * 0.75, b.y] : [b.x - W * 0.75, b.y];
        setEased(pos, s.start + b.d,        from);
        setEased(pos, s.start + b.d + 0.55, [b.x, b.y]);
    }

    // ローマ字（字間を大きく取る）
    var rt = makeText(comp, who.romaji, {
        font: CONFIG.fontRoundM, size: 46, color: C.white, tracking: 320, justify: "left"
    });
    rt.name = "ローマ字 " + s.who;
    rt.startTime = s.start; rt.inPoint = s.start; rt.outPoint = s.start + s.dur;
    rt.property("ADBE Transform Group").property("ADBE Position")
      .setValue([right ? W * 0.07 : W * 0.42, H * 0.60]);
    addShadow(rt);
    kineticIn(rt, s.start + 0.35, 0.8);

    // 漢字を1字ずつ散らして置く。
    // 空白は姓と名の間隔として使い、その位置にレイヤーは作らない。
    var glyphs = layoutKanji(who.kanji);
    var span = glyphs.length ? glyphs[glyphs.length - 1].dx : 0;
    var baseX = (right ? W * 0.09 : W * 0.91 - span);   // 面のない側に寄せる
    for (var k = 0; k < glyphs.length; k++) {
        var jt = makeText(comp, glyphs[k].ch, {
            font: CONFIG.fontJP, size: 210, color: C.white, tracking: 0, justify: "center"
        });
        jt.name = "漢字 " + glyphs[k].ch;
        jt.startTime = s.start; jt.inPoint = s.start; jt.outPoint = s.start + s.dur;
        var jx = baseX + glyphs[k].dx;
        var jy = H * 0.76 + ((k % 2 === 0) ? -46 : 46);       // 上下に振ってリズムを出す
        jt.property("ADBE Transform Group").property("ADBE Position").setValue([jx, jy]);
        addShadow(jt);                                        // 写真の上でも読めるように
        fadeSlide(jt, s.start + 0.45 + k * 0.09, 0.5, [jx, jy + 60], [jx, jy]);
    }
}


// --- 1:01 写真を 4×4 のタイルに割る ----------------------------------------
function buildTiles(comp, footage, s) {
    var item = footage[s.file];
    if (!item) { report.missing.push(s.file); return; }

    var cols = 4, rows = 4, gap = 4;
    var boxW = W * 0.50, boxH = H * 0.80;
    var tw = boxW / cols, th = boxH / rows;
    var ox = (W - boxW) / 2, oy = (H - boxH) / 2 - H * 0.03;
    var sc = Math.max(boxW / item.width, boxH / item.height) * 100;

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var L = comp.layers.add(item);
            L.name = "タイル " + r + "-" + c;
            L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
            L.property("ADBE Transform Group").property("ADBE Scale").setValue([sc, sc]);
            L.property("ADBE Transform Group").property("ADBE Position")
             .setValue([W / 2, H / 2 - H * 0.03]);

            // タイル1枚ぶんだけを見せるマスク
            var x0 = ox + c * tw + gap / 2, y0 = oy + r * th + gap / 2;
            var x1 = x0 + tw - gap,        y1 = y0 + th - gap;
            rectMask(L, x0, y0, x1, y1);

            // 中央から外側へ、遅れて立ち上がる
            var dist = Math.abs(c - 1.5) + Math.abs(r - 1.5);
            var t0 = s.start + 0.05 + dist * 0.07;
            var op = L.property("ADBE Transform Group").property("ADBE Opacity");
            op.setValueAtTime(t0, 0);
            op.setValueAtTime(t0 + 0.28, 100);
            report.photos++;
        }
    }

    cornerBrackets(comp, s, ox - 70, oy - 40, ox + boxW + 70, oy + boxH + 40);

    var g = makeText(comp, CONFIG.groom.label + " and " + CONFIG.bride.label, {
        font: CONFIG.fontScript, size: 92, color: C.gold, tracking: 0, justify: "center"
    });
    g.name = "Groom and Bride";
    g.startTime = s.start; g.inPoint = s.start; g.outPoint = s.start + s.dur;
    g.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H * 0.80]);
    fadeIn(g, s.start + 0.9, 0.5);

    var j = makeText(comp, CONFIG.journey, {
        font: CONFIG.fontRound, size: 74, color: C.white, tracking: 20, justify: "center"
    });
    j.name = "journey";
    j.startTime = s.start; j.inPoint = s.start; j.outPoint = s.start + s.dur;
    j.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H * 0.885]);
    kineticIn(j, s.start + 1.1, 0.9);
}


// --- 1:09 縦写真2枚を左右half ----------------------------------------------
function buildSplit(comp, footage, s) {
    for (var i = 0; i < 2; i++) {
        var item = footage[s.files[i]];
        if (!item) { report.missing.push(s.files[i]); continue; }
        var L = comp.layers.add(item);
        L.name = "2分割 " + s.files[i];
        L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;

        var sc = Math.max((W / 2) / item.width, H / item.height) * 100;
        L.property("ADBE Transform Group").property("ADBE Scale").setValue([sc, sc]);
        var cx = (i === 0) ? W * 0.25 : W * 0.75;
        L.property("ADBE Transform Group").property("ADBE Position").setValue([cx, H / 2]);
        rectMask(L, (i === 0) ? 0 : W / 2, 0, (i === 0) ? W / 2 : W, H);

        // 外側から滑り込ませる
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        setEased(pos, s.start,        [(i === 0) ? cx - W * 0.5 : cx + W * 0.5, H / 2]);
        setEased(pos, s.start + 0.55, [cx, H / 2]);
        report.photos++;
    }
}


// --- 1:14 クライマックス：色が変わる枠 --------------------------------------
function buildClimax(comp, footage, s) {
    buildPhoto(comp, footage, s, 0, {});

    var f = comp.layers.addShape();
    f.name = "カラーフレーム";
    f.startTime = s.start; f.inPoint = s.start; f.outPoint = s.start + s.dur;
    var grp = f.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var vec = grp.property("ADBE Vectors Group");
    var rc = vec.addProperty("ADBE Vector Shape - Rect");
    rc.property("ADBE Vector Rect Size").setValue([W - 92, H - 92]);
    var st = vec.addProperty("ADBE Vector Graphic - Stroke");
    st.property("ADBE Vector Stroke Width").setValue(16);
    var col = st.property("ADBE Vector Stroke Color");
    col.setValueAtTime(s.start,             C.coral.concat([1]).slice(0, 4));
    col.setValueAtTime(s.start + s.dur / 2, C.magenta.concat([1]).slice(0, 4));
    col.setValueAtTime(s.start + s.dur,     C.purple.concat([1]).slice(0, 4));
    report.shapes++;
}


// --- 1:19 エンドカード -----------------------------------------------------
function buildEndcard(comp, s) {
    var bg = comp.layers.addSolid(C.white, "エンド背景", W, H, 1.0);
    bg.startTime = s.start; bg.inPoint = s.start; bg.outPoint = s.start + s.dur;

    var a = makeText(comp, CONFIG.endcard[0], {
        font: CONFIG.fontScript, size: 96, color: C.ink, tracking: 0, justify: "center"
    });
    a.name = "エンド1"; a.startTime = s.start; a.inPoint = s.start; a.outPoint = s.start + s.dur;
    a.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H * 0.45]);
    fadeIn(a, s.start + 0.3, 0.6);

    var b = makeText(comp, CONFIG.endcard[1], {
        font: CONFIG.fontJP, size: 44, color: C.ink, tracking: 40, justify: "center"
    });
    b.name = "エンド2"; b.startTime = s.start; b.inPoint = s.start; b.outPoint = s.start + s.dur;
    b.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H * 0.60]);
    fadeIn(b, s.start + 0.7, 0.6);

    var d = makeText(comp, CONFIG.date, {
        font: CONFIG.fontRound, size: 38, color: C.ink, tracking: 200, justify: "center"
    });
    d.name = "挙式日"; d.startTime = s.start; d.inPoint = s.start; d.outPoint = s.start + s.dur;
    d.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H * 0.72]);
    fadeIn(d, s.start + 1.0, 0.6);

    // 最後は黒へ
    var blk = comp.layers.addSolid([0, 0, 0], "黒フェード", W, H, 1.0);
    blk.startTime = s.start; blk.inPoint = s.start + s.dur - 1.2; blk.outPoint = s.start + s.dur;
    var op = blk.property("ADBE Transform Group").property("ADBE Opacity");
    op.setValueAtTime(s.start + s.dur - 1.2, 0);
    op.setValueAtTime(s.start + s.dur, 100);
}


// ---------------------------------------------------------------------------
//  カットの切り替わりに入れる演出
//
//  写真が切り替わるだけだと単調なので、繋ぎ目に何かを通す。
//  切り替わりを隠す役目もあるので、カット点をまたぐように配置する。
// ---------------------------------------------------------------------------

function buildTransitions(comp, steps) {
    if (!CONFIG.transitions) { return 0; }
    var n = 0, k = 0;
    for (var i = 1; i < steps.length; i++) {
        var prev = steps[i - 1], cur = steps[i];
        // 場面の頭（Welcome / 姓名 / タイル / 2分割 / クライマックス）は
        // それ自体が演出なので、繋ぎは入れない
        if (cur.type !== "photo" && cur.type !== "welcome") { continue; }
        if (prev.type === "opening") { continue; }

        var kind = TRANS_CYCLE[k % TRANS_CYCLE.length];
        k++;
        if (kind === "none") { continue; }
        if (buildTransition(comp, cur.start, kind, k)) { n++; }
    }
    return n;
}

function buildTransition(comp, at, kind, seed) {
    switch (kind) {
        case "flash":     return transFlash(comp, at);
        case "blockWipe": return transBlockWipe(comp, at, seed);
        case "lineSweep": return transLineSweep(comp, at);
    }
    return false;
}

// 白フラッシュ。カット点を中心に山なりで抜ける。
function transFlash(comp, at) {
    var d = 0.36;
    var L = comp.layers.addSolid(C.white, "繋ぎ 白フラッシュ", W, H, 1.0);
    L.startTime = at - d / 2; L.inPoint = at - d / 2; L.outPoint = at + d / 2;
    var op = L.property("ADBE Transform Group").property("ADBE Opacity");
    op.setValueAtTime(at - d / 2, 0);
    op.setValueAtTime(at, 88);
    op.setValueAtTime(at + d / 2, 0);
    easeKeys(op);
    report.shapes++;
    return true;
}

// 色面が3枚、時間差で画面を横切る。この作品でいちばん効く繋ぎ。
function transBlockWipe(comp, at, seed) {
    var cols = [C.magenta, C.purple, C.coral];
    var d = 0.52;
    var fromRight = (seed % 2 === 0);
    for (var i = 0; i < 3; i++) {
        var bandH = H / 3 + 4;
        var L = makeRect(comp, W * 1.25, bandH, cols[(seed + i) % 3], "繋ぎ 色面 " + (i + 1));
        L.startTime = at - d / 2; L.inPoint = at - d / 2; L.outPoint = at + d / 2 + 0.2;
        var y = bandH * (i + 0.5) - 2;
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        var offL = -W * 0.75, offR = W * 1.75;
        var lag = i * 0.05;
        setEased(pos, at - d / 2 + lag,      [fromRight ? offR : offL, y]);
        setEased(pos, at + lag,              [W / 2, y]);
        setEased(pos, at + d / 2 + lag + 0.1,[fromRight ? offL : offR, y]);
    }
    return true;
}

// 細い白線が数本、横に走る。軽い繋ぎ。
function transLineSweep(comp, at) {
    var d = 0.42;
    for (var i = 0; i < 4; i++) {
        var L = makeRect(comp, W * 0.42, 3, C.white, "繋ぎ 線 " + (i + 1));
        L.startTime = at - d / 2; L.inPoint = at - d / 2; L.outPoint = at + d / 2 + 0.15;
        var y = H * (0.18 + i * 0.22);
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        setEased(pos, at - d / 2 + i * 0.045, [-W * 0.3, y]);
        setEased(pos, at + d / 2 + i * 0.045, [W * 1.3, y]);
        var op = L.property("ADBE Transform Group").property("ADBE Opacity");
        op.setValueAtTime(at - d / 2 + i * 0.045, 0);
        op.setValueAtTime(at + i * 0.045, 90);
        op.setValueAtTime(at + d / 2 + i * 0.045, 0);
    }
    return true;
}


// --- 全編に乗る白いグリッド線と外枠 -----------------------------------------
function buildGridOverlay(comp) {
    var inset = 44, cols = 4, rows = 3;
    var L = comp.layers.addShape();
    L.name = "グリッド線";
    var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var vec = grp.property("ADBE Vectors Group");

    var frame = vec.addProperty("ADBE Vector Shape - Rect");
    frame.property("ADBE Vector Rect Size").setValue([W - inset * 2, H - inset * 2]);

    for (var c = 1; c < cols; c++) {
        addLine(vec, -W / 2 + inset + (W - inset * 2) * c / cols, -H / 2 + inset,
                     -W / 2 + inset + (W - inset * 2) * c / cols,  H / 2 - inset);
    }
    for (var r = 1; r < rows; r++) {
        addLine(vec, -W / 2 + inset,  -H / 2 + inset + (H - inset * 2) * r / rows,
                      W / 2 - inset,  -H / 2 + inset + (H - inset * 2) * r / rows);
    }
    var st = vec.addProperty("ADBE Vector Graphic - Stroke");
    st.property("ADBE Vector Stroke Width").setValue(1.5);
    st.property("ADBE Vector Stroke Color").setValue([1, 1, 1, 1]);
    L.property("ADBE Transform Group").property("ADBE Opacity").setValue(CONFIG.gridOpacity);
    L.moveToBeginning();
    report.shapes++;
}

function addLine(vec, x0, y0, x1, y1) {
    var p = vec.addProperty("ADBE Vector Shape - Group");
    var sh = new Shape();
    sh.vertices = [[x0, y0], [x1, y1]];
    sh.closed = false;
    p.property("ADBE Vector Shape").setValue(sh);
}


// --- 四隅のコーナーブラケット ------------------------------------------------
function cornerBrackets(comp, s, L, T, R, B) {
    var arms = [[L, T, 1, 1], [R, T, -1, 1], [L, B, 1, -1], [R, B, -1, -1]];
    for (var i = 0; i < arms.length; i++) {
        var a = arms[i];
        var col = (a[3] > 0) ? C.coral : C.magenta;
        var lay = comp.layers.addShape();
        lay.name = "コーナー " + (i + 1);
        lay.startTime = s.start; lay.inPoint = s.start; lay.outPoint = s.start + s.dur;
        var grp = lay.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var vec = grp.property("ADBE Vectors Group");
        addLine(vec, a[0] - W / 2, a[1] - H / 2, a[0] - W / 2 + 120 * a[2], a[1] - H / 2);
        addLine(vec, a[0] - W / 2, a[1] - H / 2, a[0] - W / 2, a[1] - H / 2 + 70 * a[3]);
        var st = vec.addProperty("ADBE Vector Graphic - Stroke");
        st.property("ADBE Vector Stroke Width").setValue(7);
        st.property("ADBE Vector Stroke Color").setValue(col.concat([1]).slice(0, 4));
        fadeIn(lay, s.start + 0.5 + i * 0.06, 0.35);
        report.shapes++;
    }
}


// ---------------------------------------------------------------------------
//  部品づくり
// ---------------------------------------------------------------------------

function makeRect(comp, w, h, color, name) {
    var L = comp.layers.addShape();
    L.name = name || "面";
    var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var vec = grp.property("ADBE Vectors Group");
    var rc = vec.addProperty("ADBE Vector Shape - Rect");
    rc.property("ADBE Vector Rect Size").setValue([w, h]);
    var fl = vec.addProperty("ADBE Vector Graphic - Fill");
    fl.property("ADBE Vector Fill Color").setValue(color.concat([1]).slice(0, 4));
    report.shapes++;
    return L;
}

function makeText(comp, str, o) {
    var L = comp.layers.addText(str);
    var doc = L.property("ADBE Text Properties").property("ADBE Text Document").value;
    doc.font = pickFont(o.font);
    doc.fontSize = o.size;
    doc.fillColor = o.color;
    doc.applyFill = true;
    doc.applyStroke = false;
    doc.tracking = o.tracking || 0;
    doc.justification = (o.justify === "left") ? ParagraphJustification.LEFT_JUSTIFY
                                               : ParagraphJustification.CENTER_JUSTIFY;
    L.property("ADBE Text Properties").property("ADBE Text Document").setValue(doc);
    report.texts++;
    return L;
}

// 入っている書体を順に探す。全部無ければ1番目を渡して AE の代替に任せる。
function pickFont(list) {
    var installed = null;
    try { installed = app.fonts; } catch (e) { installed = null; }
    for (var i = 0; i < list.length; i++) {
        if (!installed) { return list[i]; }
        try {
            var hits = installed.getFontsByPostScriptName(list[i]);
            if (hits && hits.length > 0) { return list[i]; }
        } catch (e2) { return list[i]; }
    }
    return list[0];
}

// 1字ずつ下から立ち上げる（テキストアニメーター）
function kineticIn(layer, t0, dur) {
    var animators = layer.property("ADBE Text Properties").property("ADBE Text Animators");
    var anim = animators.addProperty("ADBE Text Animator");
    anim.name = "1字ずつ";
    var props = anim.property("ADBE Text Animator Properties");
    props.addProperty("ADBE Text Position 3D").setValue([0, 90, 0]);
    props.addProperty("ADBE Text Opacity").setValue(0);

    var sel = anim.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    var start = sel.property("ADBE Text Percent Start");
    start.setValueAtTime(t0, 0);
    start.setValueAtTime(t0 + dur, 100);
    easeKeys(start);
    return anim;
}

function fadeIn(layer, t0, dur) {
    var op = layer.property("ADBE Transform Group").property("ADBE Opacity");
    op.setValueAtTime(t0, 0);
    op.setValueAtTime(t0 + dur, 100);
    easeKeys(op);
}

function fadeSlide(layer, t0, dur, from, to) {
    var pos = layer.property("ADBE Transform Group").property("ADBE Position");
    setEased(pos, t0, from);
    setEased(pos, t0 + dur, to);
    fadeIn(layer, t0, dur * 0.7);
}

function rectMask(layer, x0, y0, x1, y1) {
    var m = layer.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var sh = new Shape();
    // マスクはレイヤー座標。コンポ座標との差を引く。
    var p = layer.property("ADBE Transform Group").property("ADBE Position").value;
    var ax = layer.property("ADBE Transform Group").property("ADBE Anchor Point").value;
    var sc = layer.property("ADBE Transform Group").property("ADBE Scale").value[0] / 100;
    function toLayer(x, y) { return [(x - p[0]) / sc + ax[0], (y - p[1]) / sc + ax[1]]; }
    sh.vertices = [toLayer(x0, y0), toLayer(x1, y0), toLayer(x1, y1), toLayer(x0, y1)];
    sh.closed = true;
    m.property("ADBE Mask Shape").setValue(sh);
    return m;
}

// 写真の上に出す文字に、うっすら影を落として沈まないようにする
function addShadow(layer) {
    var fx = addEffect(layer, ["ADBE Drop Shadow"]);
    if (!fx) { return false; }
    try {
        fx.property("ADBE Drop Shadow-0002").setValue(150);   // 不透明度
        fx.property("ADBE Drop Shadow-0004").setValue(6);     // 距離
        fx.property("ADBE Drop Shadow-0005").setValue(28);    // やわらかさ
    } catch (e) { /* 既定値のままでも影は出る */ }
    return true;
}

function addEffect(layer, matchNames) {
    for (var i = 0; i < matchNames.length; i++) {
        try { return layer.property("ADBE Effect Parade").addProperty(matchNames[i]); }
        catch (e) { /* 次の候補へ */ }
    }
    return null;
}


// ---------------------------------------------------------------------------
//  キーフレーム
// ---------------------------------------------------------------------------

function setEased(prop, time, value) {
    prop.setValueAtTime(time, value);
    easeKeys(prop);
}

// すべてのキーにイーズイン／イーズアウトを掛ける
function easeKeys(prop) {
    try {
        for (var k = 1; k <= prop.numKeys; k++) {
            var dim = 1;
            try { dim = prop.valueAtTime(prop.keyTime(k), false).length || 1; } catch (e) { dim = 1; }
            var ins = [], outs = [];
            for (var d = 0; d < dim; d++) {
                ins.push(new KeyframeEase(0, 60));
                outs.push(new KeyframeEase(0, 60));
            }
            prop.setTemporalEaseAtKey(k, ins, outs);
        }
    } catch (e) { /* イーズが効かなくてもキーは残る */ }
}


function buildReport() {
    var m = "組み立てました。\n\n" +
            "写真レイヤー   : " + report.photos + "\n" +
            "テキストレイヤー: " + report.texts + "\n" +
            "シェイプレイヤー: " + report.shapes + "\n" +
            "カットの繋ぎ  : " + report.transitions + " 箇所\n" +
            "尺             : " + TOTAL + " 秒\n" +
            "挙式日         : " + CONFIG.date + "\n\n";
    if (report.missing.length > 0) {
        m += "【見つからない写真】\n  " + report.missing.join(", ") + "\n\n";
    }
    m += "テキストはすべて本物のテキストレイヤーです。\n" +
         "文言・書体・位置は AE 上でそのまま直せます。";
    return m;
}


main();
