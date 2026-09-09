/*
 * wedding-opening.jsx  —  After Effects
 * ---------------------------------------------------------------------------
 * 結婚式オープニングムービーを絵コンテどおりに組み立てる。
 *
 *   0:00  白背景。文字が波に乗って右から流れてきて中央で止まる。
 *         その下でルービックキューブ状の立方体がダイヤ立ちで回転している。
 *         面の四角ひとつひとつに写真が入っている。
 *   0:02  文字が左へ。キューブが中央へ移動し、少し大きくなる。
 *   0:03  写真がキューブの中から飛び出す。
 *   0:07  パズル16ピースが上から降ってきて次の写真がはまる。
 *   0:12  写真が右へ抜け、キューブが戻ってきて次の写真が飛び出す。
 *   0:17  半透明の白と舞う羽で、おふたりを紹介する。
 *   0:32  縦4分割がくるくる回って次の写真に変わる。
 *   0:37  白いグリッドで12分割。風車のように回り、風で飛ばされて流れていく。
 *   0:38  次の写真が上からコトンと落ちてくる。
 *   0:42  以降はカードめくり、斜めワイプ、シャッターなどで飽きさせない。
 *
 * テキストもシェイプもすべて本物のレイヤーなので、AE 上で自由に直せる。
 *
 * 実行: ファイル > スクリプト > スクリプトファイルを実行...
 * ---------------------------------------------------------------------------
 */

// ===========================================================================
//  設定
// ===========================================================================
var CONFIG = {
    compName: "オープニングムービー",
    width: 1920, height: 1080, fps: 30,

    // お名前。kanji の空白は姓と名の間隔として扱われる。
    // 新郎新婦が逆ならこの2行を入れ替える。
    groom: { romaji: "HIGUCHI TSUKASA",  kanji: "樋口 司",   given: "TSUKASA" },
    bride: { romaji: "YAMAMOTO NODOKA", kanji: "山本 和果", given: "NODOKA" },
    date:  "2027.11.20",

    title:   "welcome to our wedding",
    endcard: ["Thank you for coming today", "このあともゆっくりお楽しみください"],

    // 書体（PostScript 名）。無ければ順に代替を試す。
    fontRound:  ["Quicksand-Light", "Quicksand-Regular", "Futura-Light", "Helvetica"],
    fontRoundM: ["Quicksand-Medium", "Quicksand-Bold", "Futura-Medium", "Helvetica-Bold"],
    fontScript: ["Sacramento-Regular", "Parisienne-Regular", "SnellRoundhand"],
    fontJP:     ["ZenKakuGothicNew-Light", "HiraginoSans-W2", "YuGothic-Light", "MS-Gothic"],

    cubeSize: 300,      // キューブ1辺（px）
    cubeSpins: 1.6,     // 冒頭2秒で何回転させるか
    feathers: 16        // 紹介の場面に浮かべる羽の数
};

var C = {
    white: [1, 1, 1],
    ink:   [0.23, 0.23, 0.23],
    warm:  [0.97, 0.95, 0.92],
    gold:  [0.878, 0.643, 0.290]
};

// ===========================================================================
//  絵コンテ
//   type ごとに作りが決まる。start / dur を触れば尺を変えられる。
// ===========================================================================
var SCENES = [
    { type: "waveTitle",    start:  0.00, dur: 2.00 },
    { type: "cubeMove",     start:  2.00, dur: 1.20 },
    { type: "cubeBurst",    start:  3.20, dur: 0.60, file: "0.jpg" },
    { type: "hold",         start:  3.80, dur: 3.70, file: "0.jpg" },
    { type: "puzzleDrop",   start:  7.50, dur: 1.00, file: "1.jpg" },
    { type: "hold",         start:  8.50, dur: 3.50, file: "1.jpg" },
    { type: "slideOutCube", start: 12.00, dur: 0.80, file: "1.jpg" },
    { type: "cubeBurst",    start: 12.80, dur: 0.60, file: "2.jpg" },
    { type: "hold",         start: 13.40, dur: 3.10, file: "2.jpg" },

    { type: "slideIn",      start: 16.50, dur: 0.70, file: "3.jpg" },
    { type: "nameWhite",    start: 17.20, dur: 5.30, file: "3.jpg", who: "bride" },
    { type: "slideIn",      start: 22.50, dur: 0.70, file: "4.jpg" },
    { type: "hold",         start: 23.20, dur: 3.10, file: "4.jpg" },
    { type: "slideIn",      start: 26.30, dur: 0.70, file: "5.jpg" },
    { type: "nameWhite",    start: 27.00, dur: 5.30, file: "5.jpg", who: "groom" },

    { type: "flipStrips",   start: 32.30, dur: 1.20, file: "6.jpg", from: "5.jpg" },
    { type: "holdZoom",     start: 33.50, dur: 3.50, file: "6.jpg" },
    { type: "pinwheel",     start: 37.00, dur: 1.60, file: "6.jpg" },
    { type: "dropBounce",   start: 38.60, dur: 0.80, file: "7.jpg" },
    { type: "hold",         start: 39.40, dur: 3.10, file: "7.jpg" },

    { type: "cardFlip",     start: 42.50, dur: 2.85, file: "8.jpg" },
    { type: "wipeDiag",     start: 45.35, dur: 2.85, file: "9.jpg" },
    { type: "stripsIn",     start: 48.20, dur: 2.85, file: "10.jpg" },
    { type: "splitOpen",    start: 51.05, dur: 2.85, file: "11.jpg" },
    { type: "punchIn",      start: 53.90, dur: 2.85, file: "12.jpg" },
    { type: "tileRise",     start: 56.75, dur: 2.85, file: "13.jpg" },
    { type: "slideIn",      start: 59.60, dur: 2.85, file: "14.jpg" },
    { type: "shutter",      start: 62.45, dur: 2.85, file: "15.jpg" },
    { type: "spinIn",       start: 65.30, dur: 2.85, file: "16.jpg" },
    { type: "flashCut",     start: 68.15, dur: 2.85, file: "17.jpg" },

    { type: "splitPair",    start: 71.00, dur: 4.00, files: ["19.jpg", "20.jpg"] },
    { type: "climax",       start: 75.00, dur: 4.00, file: "0.jpg" },
    { type: "endcard",      start: 79.00, dur: 7.00 }
];

var TOTAL = 86.0;


// ===========================================================================
//  以下は通常さわらなくて大丈夫です
// ===========================================================================

var W = CONFIG.width, H = CONFIG.height;
var report = { photos: 0, texts: 0, shapes: 0, cubeTiles: 0, missing: [] };


function main() {
    if (!app.project) { app.newProject(); }
    var dir = Folder.selectDialog("写真フォルダを選んでください");
    if (!dir) { return; }

    app.beginUndoGroup("オープニングムービーを組み立て");
    try {
        var footage = importPhotos(dir);
        var names = photoNames(footage);
        if (names.length === 0) { alert("写真が見つかりませんでした。"); return; }

        var comp = makeComp();
        comp.layers.addCamera("カメラ", [W / 2, H / 2]);   // 3D の見え方を安定させる

        buildScenes(comp, footage, names);
        alert(buildReport());
        comp.openInViewer();
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

// キューブの面に敷き詰める用に、番号順のファイル名一覧を作る
function photoNames(footage) {
    var out = [];
    for (var k in footage) { if (footage.hasOwnProperty(k)) { out.push(k); } }
    out.sort(function (a, b) { return cmpNatural(a, b); });
    return out;
}

function makeComp() {
    var comp = app.project.items.addComp(CONFIG.compName, W, H, 1.0, TOTAL, CONFIG.fps);
    var bg = comp.layers.addSolid(C.white, "白ベース", W, H, 1.0);
    bg.moveToEnd();
    bg.locked = true;
    return comp;
}

function buildScenes(comp, footage, names) {
    // 下から積むと重なり順が自然になる
    for (var i = SCENES.length - 1; i >= 0; i--) {
        var s = SCENES[i];
        switch (s.type) {
            case "waveTitle":    sceneWaveTitle(comp, footage, names, s); break;
            case "cubeMove":     sceneCubeMove(comp, footage, names, s); break;
            case "cubeBurst":    sceneCubeBurst(comp, footage, s); break;
            case "slideOutCube": sceneSlideOutCube(comp, footage, names, s); break;
            case "puzzleDrop":   scenePuzzleDrop(comp, footage, s); break;
            case "nameWhite":    sceneNameWhite(comp, footage, s); break;
            case "flipStrips":   sceneFlipStrips(comp, footage, s); break;
            case "pinwheel":     scenePinwheel(comp, footage, s); break;
            case "splitPair":    sceneSplitPair(comp, footage, s); break;
            case "endcard":      sceneEndcard(comp, s); break;
            default:             sceneSimple(comp, footage, s); break;
        }
    }
}


// ---------------------------------------------------------------------------
//  0:00  波に乗って流れてくる文字 ＋ ダイヤ立ちで回るキューブ
// ---------------------------------------------------------------------------

function sceneWaveTitle(comp, footage, names, s) {
    var end = s.start + s.dur;

    // キューブは画面の下のほう。文字の下で回っている。
    var cube = buildCube(comp, footage, names, s.start, end + 1.2);
    setCubeTransform(cube, s.start, [W / 2, H * 0.70], 0.62);

    var t = makeText(comp, CONFIG.title, {
        font: CONFIG.fontRound, size: 96, color: C.ink, tracking: 60, justify: "center"
    });
    t.name = "タイトル 波";
    t.startTime = s.start; t.inPoint = s.start; t.outPoint = end + 1.2;
    t.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H * 0.40]);
    waveIn(t, s.start + 0.1, 1.3);
    return t;
}

// 文字が1字ずつ右から流れてきて、上下に波打ちながら中央に収まる。
// 横に流す動きと縦に揺らす動きを別々のアニメーターに分け、
// 揺れのほうを少し遅らせることで「波に乗っている」ように見せる。
function waveIn(layer, t0, dur) {
    var animators = layer.property("ADBE Text Properties").property("ADBE Text Animators");

    // 1) 右から流れ込む
    var slide = animators.addProperty("ADBE Text Animator");
    slide.name = "流れ込み";
    slide.property("ADBE Text Animator Properties")
         .addProperty("ADBE Text Position 3D").setValue([W * 0.85, 0, 0]);
    slide.property("ADBE Text Animator Properties")
         .addProperty("ADBE Text Opacity").setValue(0);
    var sel = slide.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    var so = sel.property("ADBE Text Percent Offset");
    so.setValueAtTime(t0, -100);
    so.setValueAtTime(t0 + dur, 0);
    easeKeys(so);
    try { sel.property("ADBE Text Range Type2").setValue(2); } catch (e) {}  // 右から

    // 2) 波の上下。少し遅れて追いかけ、最後に平らになる
    var wave = animators.addProperty("ADBE Text Animator");
    wave.name = "波";
    wave.property("ADBE Text Animator Properties")
        .addProperty("ADBE Text Position 3D").setValue([0, -70, 0]);
    var sel2 = wave.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    var wo = sel2.property("ADBE Text Percent Offset");
    wo.setValueAtTime(t0 + 0.12, -100);
    wo.setValueAtTime(t0 + dur + 0.35, 100);
    easeKeys(wo);
    try {
        sel2.property("ADBE Text Percent Start").setValue(0);
        sel2.property("ADBE Text Percent End").setValue(28);   // 波の幅
        sel2.property("ADBE Text Selector Smoothness").setValue(100);
    } catch (e2) {}
    return layer;
}


// ---------------------------------------------------------------------------
//  ルービックキューブ状の立方体
//   6面 × 3×3 = 54 枚のタイル。それぞれに写真が入る。
//   ダイヤ立ち（頂点で立った姿勢）で回す。
// ---------------------------------------------------------------------------

function buildCube(comp, footage, names, tIn, tOut) {
    var S = CONFIG.cubeSize, half = S / 2, cell = S / 3;

    var root = comp.layers.addNull();
    root.name = "キューブ";
    root.threeDLayer = true;
    root.inPoint = tIn; root.outPoint = tOut; root.startTime = tIn;
    root.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([50, 50, 0]);

    // 頂点で立たせる姿勢。ここから Y 軸で回すとダイヤが回って見える。
    root.property("ADBE Transform Group").property("ADBE Orientation")
        .setValue([35.264, 0, 45]);

    // 面ごとの向きと位置（AE は Y が下向き）
    var faces = [
        { n: "前", p: [0, 0, -half], o: [0, 0, 0] },
        { n: "後", p: [0, 0,  half], o: [0, 180, 0] },
        { n: "右", p: [ half, 0, 0], o: [0, 90, 0] },
        { n: "左", p: [-half, 0, 0], o: [0, 270, 0] },
        { n: "上", p: [0, -half, 0], o: [90, 0, 0] },
        { n: "下", p: [0,  half, 0], o: [270, 0, 0] }
    ];

    var idx = 0;
    for (var f = 0; f < faces.length; f++) {
        var fn = comp.layers.addNull();
        fn.name = "面 " + faces[f].n;
        fn.threeDLayer = true;
        fn.inPoint = tIn; fn.outPoint = tOut; fn.startTime = tIn;
        fn.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([50, 50, 0]);
        fn.property("ADBE Transform Group").property("ADBE Position").setValue(faces[f].p);
        fn.property("ADBE Transform Group").property("ADBE Orientation").setValue(faces[f].o);
        fn.parent = root;

        for (var r = 0; r < 3; r++) {
            for (var c = 0; c < 3; c++) {
                var name = names[idx % names.length]; idx++;
                var item = footage[name];
                if (!item) { continue; }
                var tile = comp.layers.add(item);
                tile.name = "キューブ面 " + faces[f].n + " " + r + c;
                tile.threeDLayer = true;
                tile.inPoint = tIn; tile.outPoint = tOut; tile.startTime = tIn;
                var sc = (cell - 3) / Math.min(item.width, item.height) * 100;
                tile.property("ADBE Transform Group").property("ADBE Scale").setValue([sc, sc, 100]);
                tile.property("ADBE Transform Group").property("ADBE Position")
                    .setValue([(c - 1) * cell, (r - 1) * cell, 0]);
                tile.parent = fn;
                report.cubeTiles++;
            }
        }
    }

    // 回転。冒頭からずっと回し続ける。
    var rotY = root.property("ADBE Transform Group").property("ADBE Rotate Y");
    rotY.setValueAtTime(tIn, 0);
    rotY.setValueAtTime(tOut, 360 * CONFIG.cubeSpins * (tOut - tIn) / 2.0);
    return root;
}

// キューブの画面上の位置と大きさを決める（ある時刻の値として置く）
function setCubeTransform(cube, t, xy, scale) {
    var pos = cube.property("ADBE Transform Group").property("ADBE Position");
    var sc  = cube.property("ADBE Transform Group").property("ADBE Scale");
    pos.setValueAtTime(t, [xy[0], xy[1], 0]);
    sc.setValueAtTime(t, [scale * 100, scale * 100, scale * 100]);
    return cube;
}


// ---------------------------------------------------------------------------
//  0:02  文字が左へ / キューブが中央へ移動し少し大きくなる
// ---------------------------------------------------------------------------

function sceneCubeMove(comp, footage, names, s) {
    var end = s.start + s.dur;
    var cube = buildCube(comp, footage, names, s.start, end + 0.7);
    setCubeTransform(cube, s.start, [W / 2, H * 0.70], 0.62);
    setCubeTransform(cube, end,     [W / 2, H * 0.50], 0.95);
    easeKeys(cube.property("ADBE Transform Group").property("ADBE Position"));
    easeKeys(cube.property("ADBE Transform Group").property("ADBE Scale"));

    var t = makeText(comp, CONFIG.title, {
        font: CONFIG.fontRound, size: 96, color: C.ink, tracking: 60, justify: "center"
    });
    t.name = "タイトル 左へ";
    t.startTime = s.start; t.inPoint = s.start; t.outPoint = end + 0.5;
    var pos = t.property("ADBE Transform Group").property("ADBE Position");
    setEased(pos, s.start, [W / 2, H * 0.40]);
    setEased(pos, end,     [W * 0.24, H * 0.40]);
    var op = t.property("ADBE Transform Group").property("ADBE Opacity");
    op.setValueAtTime(end, 100);
    op.setValueAtTime(end + 0.5, 0);
    return t;
}


// ---------------------------------------------------------------------------
//  写真がキューブの中から飛び出す
// ---------------------------------------------------------------------------

function sceneCubeBurst(comp, footage, s) {
    var L = addPhoto(comp, footage, s);
    if (!L) { return null; }
    var base = fillScale(footage[s.file]);
    var tr = L.property("ADBE Transform Group");
    var sc = tr.property("ADBE Scale");
    var rot = tr.property("ADBE Rotate Z");

    // キューブの中心から、小さく回りながら一気に画面いっぱいへ
    sc.setValueAtTime(s.start, [base * 0.06, base * 0.06]);
    sc.setValueAtTime(s.start + s.dur * 0.78, [base * 1.10, base * 1.10]);
    sc.setValueAtTime(s.start + s.dur, [base, base]);
    easeKeys(sc);
    setEased(rot, s.start, -22);
    setEased(rot, s.start + s.dur, 0);
    tr.property("ADBE Position").setValue([W / 2, H / 2]);
    fadeIn(L, s.start, 0.14);
    return L;
}

// 写真が右へ抜け、入れ替わりにキューブが戻ってくる
function sceneSlideOutCube(comp, footage, names, s) {
    var end = s.start + s.dur;
    var L = addPhoto(comp, footage, s);
    if (L) {
        var base = fillScale(footage[s.file]);
        L.property("ADBE Transform Group").property("ADBE Scale").setValue([base, base]);
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        setEased(pos, s.start, [W / 2, H / 2]);
        setEased(pos, end,     [W * 1.62, H / 2]);
    }
    var cube = buildCube(comp, footage, names, s.start, end + 0.7);
    setCubeTransform(cube, s.start, [-W * 0.35, H * 0.50], 0.95);
    setCubeTransform(cube, end,     [W / 2,     H * 0.50], 0.95);
    easeKeys(cube.property("ADBE Transform Group").property("ADBE Position"));
    return L;
}


// ---------------------------------------------------------------------------
//  パズル16ピースが上から降ってきて写真がはまる
// ---------------------------------------------------------------------------

function scenePuzzleDrop(comp, footage, s) {
    var item = footage[s.file];
    if (!item) { report.missing.push(s.file); return null; }
    var base = fillScale(item);
    var cols = 4, rows = 4;
    var tw = W / cols, th = H / rows;

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var L = comp.layers.add(item);
            L.name = "ピース " + r + "-" + c;
            L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur + 0.05;
            L.property("ADBE Transform Group").property("ADBE Scale").setValue([base, base]);
            rectMask(L, c * tw, r * th, (c + 1) * tw, (r + 1) * th, [W / 2, H / 2], base / 100);

            // 上から順に、列ごとに少しずらして落ちてくる
            var lag = (r * cols + ((r % 2 === 0) ? c : cols - 1 - c)) * 0.035;
            var pos = L.property("ADBE Transform Group").property("ADBE Position");
            pos.setValueAtTime(s.start + lag, [W / 2, H / 2 - H * 1.15]);
            pos.setValueAtTime(s.start + lag + 0.42, [W / 2, H / 2 + 10]);
            pos.setValueAtTime(s.start + lag + 0.52, [W / 2, H / 2]);   // はまる時の小さな沈み込み
            easeKeys(pos);
            report.photos++;
        }
    }
    return null;
}


// ---------------------------------------------------------------------------
//  半透明の白と舞う羽で紹介する
// ---------------------------------------------------------------------------

function sceneNameWhite(comp, footage, s) {
    var who = CONFIG[s.who];
    var L = addPhoto(comp, footage, s);
    if (L) { kenBurns(L, s, fillScale(footage[s.file]), 1); }

    // 全面にごく薄い白。写真を消さずに、白い世界の中に置く。
    var veil = comp.layers.addSolid(C.white, "白ベール", W, H, 1.0);
    veil.startTime = s.start; veil.inPoint = s.start; veil.outPoint = s.start + s.dur;
    fadeTo(veil.property("ADBE Transform Group").property("ADBE Opacity"),
           s.start, s.start + 0.5, 0, 32);

    // 名前を置く帯。半透明の白。
    var panel = comp.layers.addSolid(C.white, "白い帯", W, Math.round(H * 0.30), 1.0);
    panel.startTime = s.start; panel.inPoint = s.start; panel.outPoint = s.start + s.dur;
    panel.property("ADBE Transform Group").property("ADBE Position")
         .setValue([W / 2, H * 0.70]);
    fadeTo(panel.property("ADBE Transform Group").property("ADBE Opacity"),
           s.start + 0.2, s.start + 0.8, 0, 62);
    report.shapes++;

    buildFeathers(comp, s);

    var rt = makeText(comp, who.romaji, {
        font: CONFIG.fontRoundM, size: 40, color: C.ink, tracking: 340, justify: "center"
    });
    rt.name = "ローマ字 " + s.who;
    rt.startTime = s.start; rt.inPoint = s.start; rt.outPoint = s.start + s.dur;
    rt.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H * 0.635]);
    kineticIn(rt, s.start + 0.5, 0.8);

    var glyphs = layoutKanji(who.kanji);
    var span = glyphs.length ? glyphs[glyphs.length - 1].dx : 0;
    for (var k = 0; k < glyphs.length; k++) {
        var jt = makeText(comp, glyphs[k].ch, {
            font: CONFIG.fontJP, size: 150, color: C.ink, tracking: 0, justify: "center"
        });
        jt.name = "漢字 " + glyphs[k].ch;
        jt.startTime = s.start; jt.inPoint = s.start; jt.outPoint = s.start + s.dur;
        var jx = W / 2 - span / 2 + glyphs[k].dx;
        var jy = H * 0.745;
        jt.property("ADBE Transform Group").property("ADBE Position").setValue([jx, jy]);
        fadeSlide(jt, s.start + 0.7 + k * 0.10, 0.5, [jx, jy + 44], [jx, jy]);
    }
    return L;
}

// ふわりと浮かぶ羽。白い楕円を細長くしたもので、ゆっくり昇りながら回る。
function buildFeathers(comp, s) {
    for (var i = 0; i < CONFIG.feathers; i++) {
        var w = 16 + (i % 4) * 7, h = w * 2.6;
        var L = comp.layers.addShape();
        L.name = "羽 " + (i + 1);
        L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
        var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var vec = grp.property("ADBE Vectors Group");
        // 楕円が作れない環境では角丸の四角で代用する。羽が無くなるより良い。
        try {
            var el = vec.addProperty("ADBE Vector Shape - Ellipse");
            el.property("ADBE Vector Ellipse Size").setValue([w, h]);
        } catch (eShape) {
            try {
                var rc = vec.addProperty("ADBE Vector Shape - Rect");
                rc.property("ADBE Vector Rect Size").setValue([w, h]);
                rc.property("ADBE Vector Rect Roundness").setValue(w / 2);
            } catch (eRect) { /* 形が作れないなら諦めて次の羽へ */ }
        }
        try {
            var fl = vec.addProperty("ADBE Vector Graphic - Fill");
            fl.property("ADBE Vector Fill Color").setValue([1, 1, 1, 1]);
        } catch (eFill) { /* 既定の塗りのまま */ }

        var x = W * (0.05 + 0.9 * ((i * 0.37) % 1));
        var drift = (i % 2 === 0 ? 1 : -1) * (40 + (i % 5) * 26);
        var lag = (i % 6) * 0.22;
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        setEased(pos, s.start + lag,          [x, H * 1.08]);
        setEased(pos, s.start + s.dur + lag,  [x + drift, -H * 0.12]);
        var rot = L.property("ADBE Transform Group").property("ADBE Rotate Z");
        setEased(rot, s.start + lag, -30 + i * 9);
        setEased(rot, s.start + s.dur + lag, 40 + i * 13);
        L.property("ADBE Transform Group").property("ADBE Opacity")
         .setValue(26 + (i % 4) * 12);
        report.shapes++;
    }
}


// ---------------------------------------------------------------------------
//  縦4分割がくるくる回って次の写真になる
// ---------------------------------------------------------------------------

function sceneFlipStrips(comp, footage, s) {
    var to = footage[s.file], from = footage[s.from];
    if (!to) { report.missing.push(s.file); return null; }
    var cols = 4, sw = W / cols;

    for (var c = 0; c < cols; c++) {
        var pivot = comp.layers.addNull();
        pivot.name = "回転軸 " + c;
        pivot.threeDLayer = true;
        pivot.startTime = s.start; pivot.inPoint = s.start; pivot.outPoint = s.start + s.dur;
        pivot.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([50, 50, 0]);
        pivot.property("ADBE Transform Group").property("ADBE Position")
             .setValue([sw * (c + 0.5), H / 2, 0]);

        // 縦に回すので X 軸まわり。列ごとに少し遅らせる。
        var rx = pivot.property("ADBE Transform Group").property("ADBE Rotate X");
        setEased(rx, s.start + c * 0.09, 0);
        setEased(rx, s.start + s.dur - 0.1 + c * 0.09, 180);

        // 表に前の写真、裏に次の写真を貼り、両方を軸にぶら下げる。
        // レイヤー番号は追加のたびにずれるので、必ず戻り値で掴む。
        var front = addFlipFace(comp, from, s, c, sw, 0);
        var back  = addFlipFace(comp, to,   s, c, sw, 180);
        if (front) { front.parent = pivot; }
        if (back)  { back.parent  = pivot; }
    }
    return null;
}

function addFlipFace(comp, item, s, c, sw, faceRot) {
    if (!item) { return null; }
    var base = fillScale(item);
    var L = comp.layers.add(item);
    L.name = "回転面 " + c + (faceRot ? " 裏" : " 表");
    L.threeDLayer = true;
    L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
    L.property("ADBE Transform Group").property("ADBE Scale").setValue([base, base, 100]);
    L.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0, 0]);
    L.property("ADBE Transform Group").property("ADBE Orientation").setValue([faceRot, 0, 0]);
    rectMask(L, c * sw, 0, (c + 1) * sw, H, [sw * (c + 0.5), H / 2], base / 100);
    report.photos++;
    return L;
}


// ---------------------------------------------------------------------------
//  白いグリッドで12分割 → 風車のように回って風で飛ばされる
// ---------------------------------------------------------------------------

function scenePinwheel(comp, footage, s) {
    var item = footage[s.file];
    if (!item) { report.missing.push(s.file); return null; }
    var base = fillScale(item);
    var cols = 4, rows = 3, tw = W / cols, th = H / rows;

    // 分割線。まず白いグリッドが現れてから割れる。
    var grid = comp.layers.addShape();
    grid.name = "分割グリッド";
    grid.startTime = s.start; grid.inPoint = s.start; grid.outPoint = s.start + 0.7;
    var gv = grid.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group")
                 .property("ADBE Vectors Group");
    for (var c1 = 1; c1 < cols; c1++) { addLine(gv, -W / 2 + tw * c1, -H / 2, -W / 2 + tw * c1, H / 2); }
    for (var r1 = 1; r1 < rows; r1++) { addLine(gv, -W / 2, -H / 2 + th * r1, W / 2, -H / 2 + th * r1); }
    var gs = gv.addProperty("ADBE Vector Graphic - Stroke");
    gs.property("ADBE Vector Stroke Width").setValue(3);
    gs.property("ADBE Vector Stroke Color").setValue([1, 1, 1, 1]);
    fadeTo(grid.property("ADBE Transform Group").property("ADBE Opacity"),
           s.start, s.start + 0.22, 0, 100);
    report.shapes++;

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var cx = tw * (c + 0.5), cy = th * (r + 0.5);
            var L = comp.layers.add(item);
            L.name = "風車 " + r + "-" + c;
            L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
            L.property("ADBE Transform Group").property("ADBE Scale").setValue([base, base]);
            rectMask(L, c * tw, r * th, (c + 1) * tw, (r + 1) * th, [cx, cy], base / 100);

            var t0 = s.start + 0.30 + ((cols - 1 - c) + r) * 0.055;   // 右下から順に飛ぶ
            var t1 = s.start + s.dur;

            var rot = L.property("ADBE Transform Group").property("ADBE Rotate Z");
            setEased(rot, t0, 0);
            setEased(rot, t1, 420 + (c + r) * 60);

            var pos = L.property("ADBE Transform Group").property("ADBE Position");
            setEased(pos, t0, [cx, cy]);
            // 全部を同じ風下（画面の右上の外）へ流す。相対移動だと左端が画面に残る。
            setEased(pos, t1, [W * 1.7 + c * 60, -H * 0.5 - r * 50]);

            var sc = L.property("ADBE Transform Group").property("ADBE Scale");
            sc.setValueAtTime(t0, [base, base]);
            sc.setValueAtTime(t1, [base * 0.06, base * 0.06]);        // タンポポのように小さく
            easeKeys(sc);

            fadeTo(L.property("ADBE Transform Group").property("ADBE Opacity"),
                   t1 - 0.45, t1, 100, 0);
            report.photos++;
        }
    }
    return null;
}


// ---------------------------------------------------------------------------
//  後半のいろいろな入り方
// ---------------------------------------------------------------------------

function sceneSimple(comp, footage, s) {
    var L = addPhoto(comp, footage, s);
    if (!L) { return null; }
    var item = footage[s.file];
    var base = fillScale(item);
    var tr = L.property("ADBE Transform Group");
    var pos = tr.property("ADBE Position");
    var sc = tr.property("ADBE Scale");
    var e = 0.55;                     // 入りにかける時間

    switch (s.type) {

        case "dropBounce":            // 上からコトンと落ちる
            sc.setValue([base, base]);
            pos.setValueAtTime(s.start, [W / 2, -H * 0.6]);
            pos.setValueAtTime(s.start + s.dur * 0.7, [W / 2, H / 2 + 26]);
            pos.setValueAtTime(s.start + s.dur, [W / 2, H / 2]);
            easeKeys(pos);
            break;

        case "cardFlip":              // カードをめくるように
            L.threeDLayer = true;
            sc.setValue([base, base, 100]);
            pos.setValue([W / 2, H / 2, 0]);
            var ry = tr.property("ADBE Rotate Y");
            setEased(ry, s.start, -92);
            setEased(ry, s.start + e, 0);
            fadeIn(L, s.start, 0.2);
            break;

        case "wipeDiag":              // 斜めに開く
            sc.setValue([base, base]);
            pos.setValue([W / 2, H / 2]);
            diagWipe(L, s.start, e);
            break;

        case "stripsIn":              // 4分割が横から入る
            L.enabled = false;
            buildStripsIn(comp, footage, s, base);
            break;

        case "splitOpen":             // 上下から閉じるように現れる
            L.enabled = false;
            buildSplitOpen(comp, footage, s, base);
            break;

        case "punchIn":
            pos.setValue([W / 2, H / 2]);
            sc.setValueAtTime(s.start, [base * 1.32, base * 1.32]);
            sc.setValueAtTime(s.start + 0.5, [base * 1.02, base * 1.02]);
            sc.setValueAtTime(s.start + s.dur, [base * 1.08, base * 1.08]);
            easeKeys(sc);
            break;

        case "tileRise":              // 9分割が順に立ち上がる（キューブの面を思わせる）
            L.enabled = false;
            buildTileRise(comp, footage, s, base);
            break;

        case "shutter":               // 上下から挟み込む
            L.enabled = false;
            buildShutter(comp, footage, s, base);
            break;

        case "spinIn":                // 回りながら入る
            pos.setValue([W / 2, H / 2]);
            sc.setValueAtTime(s.start, [base * 0.15, base * 0.15]);
            sc.setValueAtTime(s.start + e, [base, base]);
            easeKeys(sc);
            var rz = tr.property("ADBE Rotate Z");
            setEased(rz, s.start, -180);
            setEased(rz, s.start + e, 0);
            break;

        case "flashCut":              // フラッシュを焚いたように入る
            sc.setValue([base * 1.04, base * 1.04]);
            pos.setValue([W / 2, H / 2]);
            flashOver(comp, s.start, 0.3);
            kenBurns(L, s, base, 1);
            break;

        case "slideIn":
            sc.setValue([base, base]);
            setEased(pos, s.start, [W * 1.55, H / 2]);
            setEased(pos, s.start + e, [W / 2, H / 2]);
            break;

        case "holdZoom":
            pos.setValue([W / 2, H / 2]);
            sc.setValueAtTime(s.start, [base, base]);
            sc.setValueAtTime(s.start + s.dur, [base * 1.12, base * 1.12]);
            easeKeys(sc);
            break;

        case "climax":
            kenBurns(L, s, base, -1);
            colorFrame(comp, s);
            break;

        default:                      // hold
            kenBurns(L, s, base, 1);
            break;
    }
    return L;
}

function buildStripsIn(comp, footage, s, base) {
    var item = footage[s.file], cols = 4, sw = W / cols;
    for (var c = 0; c < cols; c++) {
        var cx = sw * (c + 0.5);
        var L = comp.layers.add(item);
        L.name = "帯 " + c;
        L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
        L.property("ADBE Transform Group").property("ADBE Scale").setValue([base, base]);
        rectMask(L, c * sw, 0, (c + 1) * sw, H, [cx, H / 2], base / 100);
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        var side = (c % 2 === 0) ? -1 : 1;
        setEased(pos, s.start + c * 0.06, [cx + side * W * 0.7, H / 2]);
        setEased(pos, s.start + 0.5 + c * 0.06, [cx, H / 2]);
        report.photos++;
    }
}

function buildSplitOpen(comp, footage, s, base) {
    var item = footage[s.file];
    for (var i = 0; i < 2; i++) {
        var L = comp.layers.add(item);
        L.name = "割り " + (i ? "下" : "上");
        L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
        L.property("ADBE Transform Group").property("ADBE Scale").setValue([base, base]);
        rectMask(L, 0, i * H / 2, W, (i + 1) * H / 2, [W / 2, H / 2], base / 100);
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        setEased(pos, s.start, [W / 2, H / 2 + (i ? 1 : -1) * H * 0.55]);
        setEased(pos, s.start + 0.5, [W / 2, H / 2]);
        report.photos++;
    }
}

function buildTileRise(comp, footage, s, base) {
    var item = footage[s.file], cols = 3, rows = 3;
    var tw = W / cols, th = H / rows;
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var cx = tw * (c + 0.5), cy = th * (r + 0.5);
            var L = comp.layers.add(item);
            L.name = "面 " + r + "-" + c;
            L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
            L.property("ADBE Transform Group").property("ADBE Scale").setValue([base, base]);
            rectMask(L, c * tw, r * th, (c + 1) * tw, (r + 1) * th, [cx, cy], base / 100);
            var t0 = s.start + (r + c) * 0.055;
            var pos = L.property("ADBE Transform Group").property("ADBE Position");
            setEased(pos, t0, [cx, cy + th * 0.5]);
            setEased(pos, t0 + 0.4, [cx, cy]);
            fadeTo(L.property("ADBE Transform Group").property("ADBE Opacity"), t0, t0 + 0.3, 0, 100);
            report.photos++;
        }
    }
}

function buildShutter(comp, footage, s, base) {
    var item = footage[s.file], rows = 6, th = H / rows;
    for (var r = 0; r < rows; r++) {
        var cy = th * (r + 0.5);
        var L = comp.layers.add(item);
        L.name = "羽根 " + r;
        L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
        L.property("ADBE Transform Group").property("ADBE Scale").setValue([base, base]);
        rectMask(L, 0, r * th, W, (r + 1) * th, [W / 2, cy], base / 100);
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        var side = (r % 2 === 0) ? -1 : 1;
        setEased(pos, s.start + r * 0.045, [W / 2 + side * W * 0.8, cy]);
        setEased(pos, s.start + 0.46 + r * 0.045, [W / 2, cy]);
        report.photos++;
    }
}

// 斜めに開くワイプ（不透明度のマスクを傾けて動かす）
function diagWipe(layer, t0, dur) {
    var m = layer.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var sh = new Shape();
    sh.vertices = [[-W, -H], [W * 0.4, -H], [-W * 0.4, H * 2], [-W * 2, H * 2]];
    sh.closed = true;
    m.property("ADBE Mask Shape").setValue(sh);
    // レイヤーごと動かすと絵も動いてしまうので、マスクの形だけを動かす
    var mp = m.property("ADBE Mask Shape");
    var sh2 = new Shape();
    sh2.vertices = [[-W, -H], [W * 2.4, -H], [W * 1.6, H * 2], [-W * 2, H * 2]];
    sh2.closed = true;
    mp.setValueAtTime(t0, sh);
    mp.setValueAtTime(t0 + dur, sh2);
    return m;
}

function flashOver(comp, at, d) {
    var L = comp.layers.addSolid(C.white, "フラッシュ", W, H, 1.0);
    L.startTime = at; L.inPoint = at; L.outPoint = at + d;
    var op = L.property("ADBE Transform Group").property("ADBE Opacity");
    op.setValueAtTime(at, 100);
    op.setValueAtTime(at + d, 0);
    easeKeys(op);
    report.shapes++;
}

function colorFrame(comp, s) {
    var f = comp.layers.addShape();
    f.name = "カラーフレーム";
    f.startTime = s.start; f.inPoint = s.start; f.outPoint = s.start + s.dur;
    var vec = f.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group")
               .property("ADBE Vectors Group");
    var rc = vec.addProperty("ADBE Vector Shape - Rect");
    rc.property("ADBE Vector Rect Size").setValue([W - 92, H - 92]);
    var st = vec.addProperty("ADBE Vector Graphic - Stroke");
    st.property("ADBE Vector Stroke Width").setValue(14);
    var col = st.property("ADBE Vector Stroke Color");
    col.setValueAtTime(s.start, [0.96, 0.51, 0.31, 1]);
    col.setValueAtTime(s.start + s.dur / 2, [0.89, 0.28, 0.55, 1]);
    col.setValueAtTime(s.start + s.dur, [0.54, 0.18, 0.84, 1]);
    report.shapes++;
}


// ---------------------------------------------------------------------------
//  縦写真2枚を左右half
// ---------------------------------------------------------------------------

function sceneSplitPair(comp, footage, s) {
    for (var i = 0; i < 2; i++) {
        var item = footage[s.files[i]];
        if (!item) { report.missing.push(s.files[i]); continue; }
        var sc = Math.max((W / 2) / item.width, H / item.height) * 100;
        var cx = (i === 0) ? W * 0.25 : W * 0.75;
        var L = comp.layers.add(item);
        L.name = "2分割 " + s.files[i];
        L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
        L.property("ADBE Transform Group").property("ADBE Scale").setValue([sc, sc]);
        rectMask(L, (i === 0) ? 0 : W / 2, 0, (i === 0) ? W / 2 : W, H, [cx, H / 2], sc / 100);
        var pos = L.property("ADBE Transform Group").property("ADBE Position");
        setEased(pos, s.start, [(i === 0) ? cx - W * 0.5 : cx + W * 0.5, H / 2]);
        setEased(pos, s.start + 0.5, [cx, H / 2]);
        report.photos++;
    }
    return null;
}


// ---------------------------------------------------------------------------
//  エンドカード
// ---------------------------------------------------------------------------

function sceneEndcard(comp, s) {
    var bg = comp.layers.addSolid(C.warm, "エンド背景", W, H, 1.0);
    bg.startTime = s.start; bg.inPoint = s.start; bg.outPoint = s.start + s.dur;
    buildFeathers(comp, s);

    var a = makeText(comp, CONFIG.endcard[0], {
        font: CONFIG.fontScript, size: 96, color: C.ink, tracking: 0, justify: "center"
    });
    a.name = "エンド1"; a.startTime = s.start; a.inPoint = s.start; a.outPoint = s.start + s.dur;
    a.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H * 0.42]);
    fadeIn(a, s.start + 0.3, 0.6);

    var b = makeText(comp, CONFIG.endcard[1], {
        font: CONFIG.fontJP, size: 42, color: C.ink, tracking: 40, justify: "center"
    });
    b.name = "エンド2"; b.startTime = s.start; b.inPoint = s.start; b.outPoint = s.start + s.dur;
    b.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H * 0.56]);
    fadeIn(b, s.start + 0.7, 0.6);

    var d = makeText(comp, CONFIG.date, {
        font: CONFIG.fontRound, size: 38, color: C.ink, tracking: 200, justify: "center"
    });
    d.name = "挙式日"; d.startTime = s.start; d.inPoint = s.start; d.outPoint = s.start + s.dur;
    d.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H * 0.70]);
    fadeIn(d, s.start + 1.0, 0.6);

    var blk = comp.layers.addSolid([0, 0, 0], "黒フェード", W, H, 1.0);
    blk.startTime = s.start; blk.inPoint = s.start + s.dur - 1.2; blk.outPoint = s.start + s.dur;
    fadeTo(blk.property("ADBE Transform Group").property("ADBE Opacity"),
           s.start + s.dur - 1.2, s.start + s.dur, 0, 100);
}


// ---------------------------------------------------------------------------
//  部品
// ---------------------------------------------------------------------------

function addPhoto(comp, footage, s) {
    var item = footage[s.file];
    if (!item) { report.missing.push(s.file); return null; }
    var L = comp.layers.add(item);
    L.name = "写真 " + s.file;
    L.startTime = s.start; L.inPoint = s.start; L.outPoint = s.start + s.dur;
    L.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H / 2]);
    report.photos++;
    return L;
}

function fillScale(item) { return Math.max(W / item.width, H / item.height) * 100; }

function kenBurns(L, s, base, dir) {
    var sc = L.property("ADBE Transform Group").property("ADBE Scale");
    var lo = base, hi = base * 1.07;
    setEased(sc, s.start, dir > 0 ? [lo, lo] : [hi, hi]);
    setEased(sc, s.start + s.dur, dir > 0 ? [hi, hi] : [lo, lo]);
}

// レイヤー座標に直した矩形マスク。center はそのレイヤーの画面上の中心。
function rectMask(layer, x0, y0, x1, y1, center, scale) {
    var m = layer.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var ax = layer.property("ADBE Transform Group").property("ADBE Anchor Point").value;
    function toLayer(x, y) {
        return [(x - center[0]) / scale + ax[0], (y - center[1]) / scale + ax[1]];
    }
    var sh = new Shape();
    sh.vertices = [toLayer(x0, y0), toLayer(x1, y0), toLayer(x1, y1), toLayer(x0, y1)];
    sh.closed = true;
    m.property("ADBE Mask Shape").setValue(sh);
    layer.property("ADBE Transform Group").property("ADBE Position").setValue(center);
    return m;
}

function addLine(vec, x0, y0, x1, y1) {
    var p = vec.addProperty("ADBE Vector Shape - Group");
    var sh = new Shape();
    sh.vertices = [[x0, y0], [x1, y1]];
    sh.closed = false;
    p.property("ADBE Vector Shape").setValue(sh);
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

function layoutKanji(str) {
    var STEP = 150, GAP = 80;
    var out = [], x = 0;
    for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        if (ch === " " || ch === "　" || ch === "\t") { x += GAP; continue; }
        out.push({ ch: ch, dx: x });
        x += STEP;
    }
    return out;
}

function kineticIn(layer, t0, dur) {
    var animators = layer.property("ADBE Text Properties").property("ADBE Text Animators");
    var anim = animators.addProperty("ADBE Text Animator");
    anim.name = "1字ずつ";
    anim.property("ADBE Text Animator Properties")
        .addProperty("ADBE Text Position 3D").setValue([0, 70, 0]);
    anim.property("ADBE Text Animator Properties")
        .addProperty("ADBE Text Opacity").setValue(0);
    var sel = anim.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    var st = sel.property("ADBE Text Percent Start");
    st.setValueAtTime(t0, 0);
    st.setValueAtTime(t0 + dur, 100);
    easeKeys(st);
    return anim;
}

function fadeIn(layer, t0, dur) {
    fadeTo(layer.property("ADBE Transform Group").property("ADBE Opacity"), t0, t0 + dur, 0, 100);
}

function fadeTo(prop, t0, t1, v0, v1) {
    prop.setValueAtTime(t0, v0);
    prop.setValueAtTime(t1, v1);
    easeKeys(prop);
}

function fadeSlide(layer, t0, dur, from, to) {
    var pos = layer.property("ADBE Transform Group").property("ADBE Position");
    setEased(pos, t0, from);
    setEased(pos, t0 + dur, to);
    fadeIn(layer, t0, dur * 0.7);
}

function setEased(prop, time, value) {
    prop.setValueAtTime(time, value);
    easeKeys(prop);
}

function easeKeys(prop) {
    try {
        for (var k = 1; k <= prop.numKeys; k++) {
            var dim = 1;
            try { dim = prop.valueAtTime(prop.keyTime(k), false).length || 1; } catch (e) { dim = 1; }
            var ins = [], outs = [];
            for (var d = 0; d < dim; d++) {
                ins.push(new KeyframeEase(0, 62));
                outs.push(new KeyframeEase(0, 62));
            }
            prop.setTemporalEaseAtKey(k, ins, outs);
        }
    } catch (e) { /* イーズが効かなくてもキーは残る */ }
}

function cmpNatural(a, b) {
    var ka = natKey(a), kb = natKey(b);
    return (ka < kb) ? -1 : (ka > kb) ? 1 : 0;
}

function natKey(s) {
    return String(s).toLowerCase().replace(/\d+/g, function (m) {
        var p = "0000000000" + m;
        return p.substr(p.length - 10);
    });
}

function formatTC(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.round((sec - m * 60) * 10) / 10;
    return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1);
}

function buildReport() {
    var m = "組み立てました。\n\n" +
            "写真レイヤー     : " + report.photos + "\n" +
            "キューブのタイル : " + report.cubeTiles + "\n" +
            "テキストレイヤー : " + report.texts + "\n" +
            "シェイプレイヤー : " + report.shapes + "\n" +
            "尺               : " + formatTC(TOTAL) + "\n" +
            "挙式日           : " + CONFIG.date + "\n\n";
    if (report.missing.length > 0) {
        m += "【見つからない写真】\n  " + report.missing.join(", ") + "\n\n";
    }
    m += "レイヤー数が多いので、プレビューは解像度を 1/2 か 1/4 に\n" +
         "落としてから再生してください。";
    return m;
}


main();
