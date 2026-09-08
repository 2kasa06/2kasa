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
    groom: { romaji: "NAME NAME", kanji: "新郎", label: "Groom" },
    bride: { romaji: "NAME NAME", kanji: "新婦", label: "Bride" },
    date: "2026.00.00",

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
    monoSections: true    // 中盤の写真をモノクロにする
};

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

    { type: "photo", file: "1.jpg",  start:  2.0, dur: 7.0 },
    { type: "photo", file: "2.jpg",  start:  9.0, dur: 5.0 },

    { type: "welcome",   file: "3.jpg",  start: 14.0, dur: 5.0 },

    { type: "nameblock", who: "groom", file: "5.jpg", start: 19.0, dur: 5.0, side: "right" },

    { type: "photo", file: "6.jpg",  start: 24.0, dur: 3.6 },
    { type: "photo", file: "7.jpg",  start: 27.6, dur: 3.6 },
    { type: "photo", file: "8.jpg",  start: 31.2, dur: 3.6 },
    { type: "photo", file: "9.jpg",  start: 34.8, dur: 3.6 },
    { type: "photo", file: "10.jpg", start: 38.4, dur: 4.6 },

    { type: "nameblock", who: "bride", file: "11.jpg", start: 43.0, dur: 5.0, side: "left" },

    { type: "photo", file: "12.jpg", start: 48.0, dur: 3.3 },
    { type: "photo", file: "13.jpg", start: 51.3, dur: 3.3 },
    { type: "photo", file: "14.jpg", start: 54.6, dur: 3.3 },
    { type: "photo", file: "15.jpg", start: 57.9, dur: 3.3 },

    { type: "tiles", file: "16.jpg", start: 61.2, dur: 5.8 },

    { type: "photo", file: "17.jpg", start: 67.0, dur: 2.4 },
    { type: "split", files: ["19.jpg", "20.jpg"], start: 69.4, dur: 4.6 },

    { type: "climax", file: "1.jpg", start: 74.0, dur: 5.0 },
    { type: "endcard", start: 79.0, dur: 7.0 }
];

var TOTAL = 86.0;


// ===========================================================================
//  以下は通常さわらなくて大丈夫です
// ===========================================================================

var W = CONFIG.width, H = CONFIG.height;
var report = { photos: 0, texts: 0, shapes: 0, missing: [] };


function main() {
    if (!app.project) { app.newProject(); }

    var dir = Folder.selectDialog("写真フォルダを選んでください");
    if (!dir) { return; }

    app.beginUndoGroup("オープニングムービーを組み立て");
    try {
        var footage = importPhotos(dir);
        var comp = makeComp();

        buildScenes(comp, footage);
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
            case "photo":     buildPhoto(comp, footage, s, photoIndex++); break;
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
    var zoomIn = (idx % 2 === 0);
    var lo = base, hi = base * (1 + CONFIG.kenBurns / 100);
    var sc = L.property("ADBE Transform Group").property("ADBE Scale");
    setEased(sc, s.start,          zoomIn ? [lo, lo] : [hi, hi]);
    setEased(sc, s.start + s.dur,  zoomIn ? [hi, hi] : [lo, lo]);

    L.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H / 2]);

    if (opts.mono) { addEffect(L, ["ADBE Black&White", "ADBE Tint"]); }
    if (opts.wash) { washOut(comp, L, s, opts.wash); }

    report.photos++;
    return L;
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
    buildPhoto(comp, footage, s, 0, { mono: CONFIG.monoSections });

    var right = (s.side === "right");
    var bx = right ? W * 0.40 : 0;

    // 階段状のベタ面。時間差で滑り込ませる。
    var blocks = [
        { w: W * 0.60, h: H * 0.65, x: bx + W * 0.30, y: H * 0.325, col: C.purple,  d: 0.00 },
        { w: W * 0.42, h: H * 0.29, x: bx + W * 0.42, y: H * 0.79,  col: C.purple,  d: 0.10 },
        { w: W * 0.40, h: H * 0.44, x: right ? W * 0.20 : W * 0.80, y: H * 0.22, col: C.coral, d: 0.18 },
        { w: W * 0.16, h: H * 0.36, x: right ? W * 0.08 : W * 0.92, y: H * 0.62, col: C.magenta, d: 0.26 }
    ];
    for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        var L = makeRect(comp, b.w, b.h, b.col, "面 " + (i + 1));
        L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        var from = right ? [b.x + W * 0.7, b.y] : [b.x - W * 0.7, b.y];
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
      .setValue([right ? W * 0.08 : W * 0.46, H * 0.30]);
    kineticIn(rt, s.start + 0.35, 0.8);

    // 漢字を1字ずつ散らして置く
    var chars = who.kanji.split("");
    for (var k = 0; k < chars.length; k++) {
        var jt = makeText(comp, chars[k], {
            font: CONFIG.fontJP, size: 210, color: C.white, tracking: 0, justify: "center"
        });
        jt.name = "漢字 " + chars[k];
        jt.startTime = s.start; jt.inPoint = s.start; jt.outPoint = s.start + s.dur;
        var jx = (right ? W * 0.11 : W * 0.50) + k * 190;
        var jy = H * 0.52 + ((k % 2 === 0) ? -60 : 70);       // 上下に振ってリズムを出す
        jt.property("ADBE Transform Group").property("ADBE Position").setValue([jx, jy]);
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
            "尺             : " + TOTAL + " 秒\n\n";
    if (report.missing.length > 0) {
        m += "【見つからない写真】\n  " + report.missing.join(", ") + "\n\n";
    }
    m += "テキストはすべて本物のテキストレイヤーです。\n" +
         "文言・書体・位置は AE 上でそのまま直せます。";
    return m;
}


main();
