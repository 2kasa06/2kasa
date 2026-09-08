/*
 * profile-movie-builder.jsx
 * ---------------------------------------------------------------------------
 * 結婚式プロフィールムービー用 Premiere Pro スクリプト。
 *
 * 写真を選んで実行すると、アクティブなシーケンスに等間隔で並べ、
 * 1枚ずつに Ken Burns（ゆっくりズーム＋パン）のキーフレームを付けます。
 * ズームイン／ズームアウトは1枚おきに自動で入れ替わります。
 *
 * 16:9 でない写真（4:3・縦位置など）は、同じ写真を下のトラックに敷いて
 * 大きくぼかし、黒帯を埋めます（backgroundFill）。
 *
 * 実行方法:
 *   Premiere Pro >  ファイル > スクリプト > スクリプトファイルを実行...
 *   （または ExtendScript Toolkit / VS Code の ExtendScript 拡張から）
 *
 * 使い方の詳細と事前準備は同じフォルダの README.md を参照してください。
 * ---------------------------------------------------------------------------
 */

// ===========================================================================
//  設定 — ここだけ書き換えれば動きが変わります
// ===========================================================================
var CONFIG = {

    // --- 何をするか ---------------------------------------------------------
    // "build"  : 写真を並べて、モーションも付ける（通常はこちら）
    // "motion" : 並んでいるクリップにモーションだけ付け直す
    //            （尺を手で調整したあとに、動きを尺に合わせ直したいとき）
    mode: "build",

    // --- 写真をどこから取るか -----------------------------------------------
    // "selection" : プロジェクトパネルで選択中の項目を使う
    // "folder"    : 実行時にフォルダ選択ダイアログを出し、その中の画像を読み込む
    source: "folder",

    // --- 尺 -----------------------------------------------------------------
    // 上の EDIT_LIST のとおりに配置する。false なら全カットを clipSeconds で等分。
    useEditList: true,
    startSeconds: 2.0,     // 配置開始位置。冒頭にオープニング用の余白を空ける

    clipSeconds: 3.5,      // useEditList が false のときの、1枚あたりの秒数
    videoTrack: 1,         // 写真（前面）を置くトラック。0 = V1、1 = V2 …
    startAtPlayhead: false,// true なら再生ヘッド位置から。false なら startSeconds から

    // --- 背景ぼかし --------------------------------------------------------
    // 16:9 でない写真（4:3・縦位置など）は、そのまま置くと黒帯が出ます。
    // これを ON にすると同じ写真をもう1枚下のトラックに敷き、大きく拡大して
    // ぼかし、黒帯を埋めます。前面の写真は拡大せずに済むので画質が落ちません。
    // ON のときは videoTrack を 1 以上にしてください（背景はその1つ下に入ります）。
    backgroundFill: true,
    backgroundScale: 250,  // 背景の拡大率。ぼかすので大きめで構いません
    blurAmount: 60,        // ぼかしの強さ

    // --- Ken Burns ----------------------------------------------------------
    kenBurns: true,
    zoomPercent: 8,        // 何％ズームするか。100 → 108 なら 8
    panPercent: 1.2,       // 横方向に振る量（画面幅に対する％）。0 で横移動なし
    alternate: true,       // true なら1枚おきにズームイン／ズームアウトを交互に
    easing: true,          // 両端のキーフレームをベジェにして滑らかにする

    // --- 写真の収まり --------------------------------------------------------
    // フレームサイズに設定（Set to Frame Size）を自動で適用するか。
    // Premiere のバージョンによっては失敗するので、その場合は手動で。
    scaleToFrameSize: true
};

// ===========================================================================
//  編集リスト — 参考動画（1分26秒）の構成に合わせたカット割り
//
//  useEditList が true のとき、写真の並び順ではなくこの表のとおりに配置します。
//  file は読み込んだ写真の名前。sec はそのカットの秒数。
//
//  split は画面を左右half分ずつ使う2分割カット。scale は「フレームサイズに設定」
//  を 100 としたときの倍率で、ちょうど画面の半分（960px）幅になる値を入れます。
//    scale = 100 * (960 / フレームに収めたときの表示幅)
//  この値なら2枚が隙間なく隣り合い、はみ出しも重なりもしません。
//  y は上下の位置の微調整（-0.05 で画面高さの5%ぶん上へ）。
// ===========================================================================
var EDIT_LIST = [
    { file: "1.jpg",  sec: 7.0, label: "キービジュアル" },
    { file: "2.jpg",  sec: 6.0, label: "タイトル背景" },

    // Aメロ — 生い立ち/馴れ初め。ゆっくり見せる
    { file: "3.jpg",  sec: 4.0, label: "Aメロ" },
    { file: "4.jpg",  sec: 4.0, label: "Aメロ" },
    { file: "5.jpg",  sec: 4.0, label: "Aメロ" },
    { file: "6.jpg",  sec: 4.0, label: "Aメロ" },
    { file: "7.jpg",  sec: 4.0, label: "Aメロ" },
    { file: "8.jpg",  sec: 4.0, label: "Aメロ" },
    { file: "9.jpg",  sec: 4.0, label: "Aメロ" },

    // 大サビ — テンポを上げて畳みかける
    { file: "10.jpg", sec: 3.3, label: "大サビ" },
    { file: "11.jpg", sec: 3.3, label: "大サビ" },
    { file: "12.jpg", sec: 3.3, label: "大サビ" },
    { file: "13.jpg", sec: 3.3, label: "大サビ" },
    { file: "14.jpg", sec: 3.3, label: "大サビ" },
    { file: "15.jpg", sec: 3.3, label: "大サビ" },
    { file: "16.jpg", sec: 3.3, label: "大サビ" },
    { file: "17.jpg", sec: 3.3, label: "大サビ" },

    // 2分割 — 縦写真2枚を左右に。動かさず見せ場にする
    { split: [ { file: "19.jpg", scale: 133.3, y: -0.03 },
               { file: "20.jpg", scale: 118.5, y:  0.00 } ],
      sec: 4.6, label: "2分割" },

    // クライマックス — 冒頭のキービジュアルに戻す
    { file: "1.jpg",  sec: 5.0, label: "クライマックス（再登場）" }
];


// ===========================================================================
//  以下は通常さわらなくて大丈夫です
// ===========================================================================

// Motion コンポーネントとプロパティの表示名（日本語版／英語版の両方に対応）
var NAMES = {
    motion:   ["モーション", "Motion"],
    scale:    ["スケール", "Scale"],
    position: ["位置", "Position"],
    blur:     ["ブラー", "Blurriness", "ぼかし"],
    repeatEdge: ["エッジピクセルを繰り返す", "Repeat Edge Pixels"]
};

// ガウスブラーの表示名（Premiere のバージョン・言語で揺れる）
var BLUR_EFFECTS = ["ガウス（ブラー）", "Gaussian Blur", "ブラー（ガウス）", "ガウスブラー"];

var IMAGE_EXT = /\.(jpe?g|png|tiff?|bmp|psd|gif|heic|webp)$/i;

// キーフレーム補間タイプ。2 = ベジェ。バージョン差があるので必ず try で包む。
var KF_BEZIER = 2;


function main() {
    if (!app.project) { alert("プロジェクトが開いていません。"); return; }

    var seq = app.project.activeSequence;
    if (!seq) {
        alert("シーケンスが開いていません。\n\n" +
              "式場の指定に合わせたシーケンスを先に作り、\n" +
              "タイムラインでアクティブにしてから実行してください。");
        return;
    }

    if (CONFIG.mode === "motion") {
        var existing = collectTrackItems(seq, CONFIG.videoTrack);
        if (existing.length === 0) {
            alert("V" + (CONFIG.videoTrack + 1) + " にクリップがありません。");
            return;
        }
        var n = applyMotionToAll(existing, CONFIG.videoTrack);
        alert("モーションを付け直しました。\n\n対象 " + existing.length + " 個 / 適用 " + n + " 個");
        return;
    }

    // ---- 必要なトラックを確認 ----
    var needTop = CONFIG.videoTrack;
    if (CONFIG.useEditList && hasSplit()) { needTop = CONFIG.videoTrack + 1; }
    if (CONFIG.backgroundFill && CONFIG.videoTrack < 1) {
        alert("backgroundFill が ON のときは videoTrack を 1 以上にしてください。\n" +
              "背景はそのすぐ下のトラックに入ります。");
        return;
    }
    if (seq.videoTracks.numTracks <= needTop) {
        // 足りないぶんは自動で足す。できなければ手順を案内して止まる。
        if (!addVideoTracks(seq, needTop + 1 - seq.videoTracks.numTracks) ||
            seq.videoTracks.numTracks <= needTop) {
            alert("ビデオトラックが足りません。\n\n" +
                  "必要 : V1〜V" + (needTop + 1) + "\n" +
                  "現在 : V1〜V" + seq.videoTracks.numTracks + "\n\n" +
                  "自動追加できなかったので、トラックヘッダを右クリック >\n" +
                  "トラックを追加 で V" + (needTop + 1) + " まで増やしてから、\n" +
                  "もう一度実行してください。");
            return;
        }
    }

    var items = gatherProjectItems();
    if (!items) { return; }
    if (items.length === 0) { alert("写真が1枚も見つかりませんでした。"); return; }

    var plan = buildPlan(items);
    if (plan.missing.length > 0) {
        alert("編集リストに書かれた写真が見つかりません。\n\n" +
              plan.missing.join("\n") + "\n\n" +
              "ファイル名が EDIT_LIST と一致しているか確認してください。");
        return;
    }
    if (plan.steps.length === 0) { alert("配置するカットがありません。"); return; }

    var stats = placePlan(seq, plan.steps);
    if (stats.error) { alert(stats.error); return; }

    alert(buildReport(plan, stats));
}

// 足りないビデオトラックを追加する（QE DOM 経由。使えない環境では false）
function addVideoTracks(seq, count) {
    if (count <= 0) { return true; }
    try {
        app.enableQE();
        qe.project.getActiveSequence().addTracks(count, seq.videoTracks.numTracks, 0, 0);
        return true;
    } catch (e) {
        try {
            qe.project.getActiveSequence().addTracks(count);
            return true;
        } catch (e2) {
            return false;
        }
    }
}

function hasSplit() {
    for (var i = 0; i < EDIT_LIST.length; i++) { if (EDIT_LIST[i].split) { return true; } }
    return false;
}


// ---------------------------------------------------------------------------
//  配置プランを組む
//
//  step = { main, mainScale, mainY, second, secondScale, secondY, sec, label }
//  second が入っているカットが左右2分割。
// ---------------------------------------------------------------------------

function buildPlan(items) {
    var byName = {};
    for (var i = 0; i < items.length; i++) { byName[items[i].name] = items[i]; }

    var steps = [], missing = [];

    if (!CONFIG.useEditList) {
        // 編集リストを使わない場合は、並び順どおりに等分する
        for (var u = 0; u < items.length; u++) {
            steps.push({ main: items[u], mainScale: null, mainY: 0,
                         second: null, sec: CONFIG.clipSeconds, label: "" });
        }
        return { steps: steps, missing: missing };
    }

    for (var e = 0; e < EDIT_LIST.length; e++) {
        var row = EDIT_LIST[e];

        if (row.split) {
            var a = byName[row.split[0].file], b = byName[row.split[1].file];
            if (!a) { missing.push(row.split[0].file); }
            if (!b) { missing.push(row.split[1].file); }
            if (!a || !b) { continue; }
            steps.push({
                main: a, mainScale: row.split[0].scale, mainY: row.split[0].y || 0,
                second: b, secondScale: row.split[1].scale, secondY: row.split[1].y || 0,
                sec: row.sec, label: row.label || "2分割"
            });
        } else {
            var c = byName[row.file];
            if (!c) { missing.push(row.file); continue; }
            steps.push({ main: c, mainScale: null, mainY: 0,
                         second: null, sec: row.sec, label: row.label || "" });
        }
    }
    return { steps: steps, missing: missing };
}


// ---------------------------------------------------------------------------
//  配置して仕上げる
// ---------------------------------------------------------------------------

function placePlan(seq, steps) {
    var fgTrack = seq.videoTracks[CONFIG.videoTrack];
    var stats = { placed: 0, motion: 0, split: 0, bg: 0, blurred: 0, error: null,
                  start: 0, end: 0 };

    var t = CONFIG.startAtPlayhead ? playheadSeconds(seq) : CONFIG.startSeconds;
    stats.start = t;

    // --- 前面を置く ---
    var i, placedFg = [];
    for (i = 0; i < steps.length; i++) {
        steps[i].at = t;
        if (!overwriteAt(fgTrack, steps[i].main, t)) {
            stats.error = "クリップを配置できませんでした。\n" +
                          "V" + (CONFIG.videoTrack + 1) + " がロックされていないか確認してください。";
            return stats;
        }
        t += steps[i].sec;
    }
    stats.end = t;

    // 置いたクリップを開始位置で拾い直し、尺を確定させる
    for (i = 0; i < steps.length; i++) {
        var clip = findClipAt(fgTrack, steps[i].at);
        if (!clip) {
            stats.error = "配置後にクリップを特定できませんでした（" + i + "番目）。";
            return stats;
        }
        setClipEnd(clip, steps[i].at + steps[i].sec);
        steps[i].clip = clip;
        placedFg.push(clip);
    }

    // 尺が意図どおりか確認する。静止画のデフォルトデュレーションが短いとここで落ちる。
    var worst = null;
    for (i = 0; i < steps.length; i++) {
        var got = steps[i].clip.end.seconds - steps[i].clip.start.seconds;
        if (got < steps[i].sec - 0.01) {
            if (!worst || got < worst.got) { worst = { want: steps[i].sec, got: got }; }
        }
    }
    if (worst) {
        stats.error = "配置しましたが、尺が足りていません。\n\n" +
            "指定 : " + worst.want + " 秒 / 実際 : " + Math.round(worst.got * 100) / 100 + " 秒\n\n" +
            "静止画のデフォルトデュレーションが短すぎます。\n" +
            "  1. Ctrl/Cmd+Z で取り消す\n" +
            "  2. 環境設定 > タイムライン > 静止画のデフォルトデュレーション を\n" +
            "     " + maxSec() + " 秒より長く（10秒など）設定する\n" +
            "  3. 写真をプロジェクトから削除して読み込み直し、もう一度実行する\n\n" +
            "※ 既に読み込み済みの写真には、設定変更が反映されません。";
        return stats;
    }
    stats.placed = placedFg.length;

    // --- 2分割の右側を1つ上のトラックに置く ---
    var secondTrack = seq.videoTracks[CONFIG.videoTrack + 1];
    for (i = 0; i < steps.length; i++) {
        if (!steps[i].second || !secondTrack) { continue; }
        if (overwriteAt(secondTrack, steps[i].second, steps[i].at)) {
            var sc = findClipAt(secondTrack, steps[i].at);
            if (sc) {
                setClipEnd(sc, steps[i].at + steps[i].sec);
                trySetScaleToFrameSize(sc, CONFIG.videoTrack + 1);
                setHalf(sc, steps[i].secondScale, 0.75, steps[i].secondY);
                stats.split++;
            }
        }
    }

    // --- 前面の仕上げ: 2分割は左半分に、それ以外は Ken Burns ---
    var fullIndex = 0;
    for (i = 0; i < steps.length; i++) {
        if (CONFIG.scaleToFrameSize) { trySetScaleToFrameSize(steps[i].clip, CONFIG.videoTrack); }

        if (steps[i].second) {
            // 2分割は動かさない。ズームすると隣の半分に重なってしまう。
            setHalf(steps[i].clip, steps[i].mainScale, 0.25, steps[i].mainY);
        } else if (CONFIG.kenBurns) {
            var zoomIn = CONFIG.alternate ? (fullIndex % 2 === 0) : true;
            if (applyKenBurns(steps[i].clip, zoomIn, fullIndex)) { stats.motion++; }
            fullIndex++;
        }
    }

    // --- 背景ぼかし（2分割は左右で埋まるので不要） ---
    if (CONFIG.backgroundFill) {
        var bgTrack = seq.videoTracks[CONFIG.videoTrack - 1];
        for (i = 0; i < steps.length; i++) {
            if (steps[i].second) { continue; }
            if (!overwriteAt(bgTrack, steps[i].main, steps[i].at)) { continue; }
            var bc = findClipAt(bgTrack, steps[i].at);
            if (!bc) { continue; }
            setClipEnd(bc, steps[i].at + steps[i].sec);
            trySetScaleToFrameSize(bc, CONFIG.videoTrack - 1);
            setScaleValue(bc, CONFIG.backgroundScale);
            stats.bg++;
            if (addBlur(bc, CONFIG.videoTrack - 1)) { stats.blurred++; }
        }
    }

    return stats;
}

// 画面の左半分／右半分にぴったり収める
function setHalf(clip, scale, centerX, yOffset) {
    var motion = findComponent(clip, NAMES.motion);
    if (!motion) { return false; }
    var sc = findProperty(motion, NAMES.scale);
    var po = findProperty(motion, NAMES.position);
    if (sc && scale) { try { sc.setValue(scale, true); } catch (e) {} }
    if (po) { try { po.setValue([centerX, 0.5 + (yOffset || 0)], true); } catch (e2) {} }
    return true;
}

function setScaleValue(clip, value) {
    var motion = findComponent(clip, NAMES.motion);
    if (!motion) { return false; }
    var sc = findProperty(motion, NAMES.scale);
    if (!sc) { return false; }
    try { sc.setValue(value, true); return true; } catch (e) { return false; }
}

function maxSec() {
    var m = 0;
    for (var i = 0; i < EDIT_LIST.length; i++) { if (EDIT_LIST[i].sec > m) { m = EDIT_LIST[i].sec; } }
    return CONFIG.useEditList ? m : CONFIG.clipSeconds;
}

function playheadSeconds(seq) {
    try { return seq.getPlayerPosition().seconds; } catch (e) { return 0; }
}

function overwriteAt(track, item, at) {
    if (!track) { return false; }
    try { track.overwriteClip(item, at); return true; }
    catch (e) {
        try { var t = new Time(); t.seconds = at; track.overwriteClip(item, t); return true; }
        catch (e2) { return false; }
    }
}

function findClipAt(track, at) {
    for (var i = 0; i < track.clips.numTracks; i++) {
        if (Math.abs(track.clips[i].start.seconds - at) < 0.005) { return track.clips[i]; }
    }
    return null;
}

function setClipEnd(clip, endSeconds) {
    if (Math.abs(clip.end.seconds - endSeconds) < 0.005) { return true; }
    try { var t = new Time(); t.seconds = endSeconds; clip.end = t; return true; }
    catch (e) { return false; }
}


// ---------------------------------------------------------------------------
//  完了レポート
// ---------------------------------------------------------------------------

function buildReport(plan, stats) {
    var msg = "完成しました。\n\n" +
              "カット数   : " + stats.placed + "（うち2分割 " + stats.split + "）\n" +
              "配置範囲   : " + formatTC(stats.start) + " 〜 " + formatTC(stats.end) + "\n" +
              "モーション : " + stats.motion + " カットに適用\n";

    if (CONFIG.backgroundFill) {
        msg += "背景ぼかし : " + stats.bg + " カット（V" + CONFIG.videoTrack + "）\n";
        if (stats.blurred < stats.bg) {
            msg += "\n【要手作業】ぼかしを自動で付けられませんでした（" +
                   (stats.bg - stats.blurred) + " カット）。\n" +
                   "V" + CONFIG.videoTrack + " のクリップを全選択して、エフェクト\n" +
                   "「ガウス（ブラー）」をドラッグしてください。\n" +
                   "ぼかし " + CONFIG.blurAmount + " ／「エッジピクセルを繰り返す」ON。\n";
        }
    }

    msg += "\nこのあとは手作業です:\n" +
           "  0:00〜" + formatTC(stats.start) + " にオープニングのグラフィック\n" +
           "  " + formatTC(stats.end) + " 以降にエンドカード\n" +
           "  V" + (CONFIG.videoTrack + 2) + " に調整レイヤー → Lumetri で全体のトーンを統一\n" +
           "  A1 に BGM を置き、サビ頭がカット点と合っているか確認";
    return msg;
}


// ---------------------------------------------------------------------------
//  素材の収集
// ---------------------------------------------------------------------------

function gatherProjectItems() {
    if (CONFIG.source === "selection") {
        var sel = [];
        try { sel = app.getCurrentProjectViewSelection() || []; } catch (e) { sel = []; }
        if (sel.length === 0) {
            alert("プロジェクトパネルで写真を選択してから実行してください。\n\n" +
                  "（フォルダから読み込みたい場合は、スクリプト冒頭の\n" +
                  "  CONFIG.source を \"folder\" にしてください）");
            return null;
        }
        return sortByName(flattenBins(sel));
    }

    // source === "folder"
    var dir = Folder.selectDialog("プロフィールムービーに使う写真フォルダを選んでください");
    if (!dir) { return null; }               // キャンセル

    var files = dir.getFiles(function (f) {
        return (f instanceof File) && IMAGE_EXT.test(f.name);
    });
    if (files.length === 0) {
        alert("そのフォルダに画像が見つかりませんでした。\n" + dir.fsName);
        return null;
    }

    files.sort(function (a, b) { return cmpNatural(a.name, b.name); });

    var paths = [];
    for (var i = 0; i < files.length; i++) { paths.push(files[i].fsName); }

    var bin = findOrCreateBin(dir.name);
    var before = bin.children.numItems;
    app.project.importFiles(paths, true, bin, false);

    var imported = [];
    for (var j = 0; j < bin.children.numItems; j++) {
        imported.push(bin.children[j]);
    }
    if (bin.children.numItems === before) {
        alert("読み込みに失敗しました。フォルダの権限とファイル形式を確認してください。");
        return null;
    }
    return sortByName(imported);
}

// 選択にビンが混ざっていたら中身に展開する
function flattenBins(items) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it) { continue; }
        if (it.type === ProjectItemType.BIN) {
            var inner = [];
            for (var j = 0; j < it.children.numItems; j++) { inner.push(it.children[j]); }
            out = out.concat(flattenBins(inner));
        } else if (it.type === ProjectItemType.CLIP || it.type === ProjectItemType.FILE) {
            out.push(it);
        }
    }
    return out;
}

function findOrCreateBin(name) {
    var root = app.project.rootItem;
    for (var i = 0; i < root.children.numItems; i++) {
        var c = root.children[i];
        if (c.type === ProjectItemType.BIN && c.name === name) { return c; }
    }
    return root.createBin(name);
}


function collectTrackItems(seq, trackIndex) {
    var track = seq.videoTracks[trackIndex];
    var out = [];
    if (!track) { return out; }
    for (var i = 0; i < track.clips.numTracks; i++) { out.push(track.clips[i]); }
    return out;
}


// ---------------------------------------------------------------------------
//  Ken Burns
// ---------------------------------------------------------------------------

function applyMotionToAll(clips, trackIndex) {
    var applied = 0;
    for (var i = 0; i < clips.length; i++) {
        if (CONFIG.scaleToFrameSize) { trySetScaleToFrameSize(clips[i], trackIndex); }
        if (!CONFIG.kenBurns) { continue; }
        // alternate: 偶数枚目はズームイン、奇数枚目はズームアウト
        var zoomIn = CONFIG.alternate ? (i % 2 === 0) : true;
        if (applyKenBurns(clips[i], zoomIn, i)) { applied++; }
    }
    return applied;
}

function applyKenBurns(clip, zoomIn, index) {
    var motion = findComponent(clip, NAMES.motion);
    if (!motion) { return false; }

    var scale = findProperty(motion, NAMES.scale);
    var position = findProperty(motion, NAMES.position);
    if (!scale) { return false; }

    // キーフレームの時刻はクリップのソース内時間。inPoint を基準にする。
    var t0 = clip.inPoint.seconds;
    var t1 = t0 + (clip.end.seconds - clip.start.seconds);
    if (t1 <= t0) { return false; }

    var lo = 100;
    var hi = 100 + CONFIG.zoomPercent;
    var from = zoomIn ? lo : hi;
    var to   = zoomIn ? hi : lo;

    setKeys(scale, t0, from, t1, to);

    if (position && CONFIG.panPercent > 0) {
        var d = CONFIG.panPercent / 100;
        // 1枚ごとに左右へ振り分けて、全部が同じ方向に流れないようにする
        var dir = (index % 4 < 2) ? 1 : -1;
        var cx = 0.5;
        var cy = 0.5;
        setKeys(position,
                t0, [cx - d * dir, cy],
                t1, [cx + d * dir, cy]);
    }
    return true;
}

function setKeys(prop, t0, v0, t1, v1) {
    try {
        prop.setTimeVarying(true);
        prop.addKey(t0);
        prop.setValueAtKey(t0, v0, true);
        prop.addKey(t1);
        prop.setValueAtKey(t1, v1, true);
        if (CONFIG.easing) {
            try {
                prop.setInterpolationTypeAtKey(t0, KF_BEZIER, true);
                prop.setInterpolationTypeAtKey(t1, KF_BEZIER, true);
            } catch (eEase) {
                // 補間タイプの指定に失敗しても、リニアのキーフレームは残る
            }
        }
    } catch (e) { /* このプロパティはスキップ */ }
}

function trySetScaleToFrameSize(clip, trackIndex) {
    var qItem = findQEItem(clip, trackIndex);
    if (!qItem) { return false; }
    try {
        qItem.setScaleToFrameSize();
        return true;
    } catch (e) {
        return false;
    }
}

// QE DOM 側で同じクリップを開始位置から探す（QE が使えなければ null）
function findQEItem(clip, trackIndex) {
    try {
        app.enableQE();
        var qSeq = qe.project.getActiveSequence();
        var qTrack = qSeq.getVideoTrackAt(trackIndex);
        for (var i = 0; i < qTrack.numItems; i++) {
            var q = qTrack.getItemAt(i);
            if (Math.abs(q.start.secs - clip.start.seconds) < 0.001) { return q; }
        }
    } catch (e) {
        // QE DOM が使えないバージョン
    }
    return null;
}


function addBlur(clip, trackIndex) {
    var qItem = findQEItem(clip, trackIndex);
    if (!qItem) { return false; }

    var added = false;
    for (var i = 0; i < BLUR_EFFECTS.length && !added; i++) {
        try {
            var fx = qe.project.getVideoEffectByName(BLUR_EFFECTS[i]);
            if (fx) {
                qItem.addVideoEffect(fx);
                added = true;
            }
        } catch (e) { /* 次の名前を試す */ }
    }
    if (!added) { return false; }

    // ぼかし量と「エッジピクセルを繰り返す」を設定する。
    // 失敗してもエフェクト自体は乗っているので、既定値のまま残る。
    var blurComp = null;
    try {
        var comps = clip.components;
        for (var c = comps.numItems - 1; c >= 0; c--) {
            var nm = "";
            try { nm = comps[c].displayName; } catch (e2) { nm = ""; }
            for (var b = 0; b < BLUR_EFFECTS.length; b++) {
                if (nm === BLUR_EFFECTS[b]) { blurComp = comps[c]; break; }
            }
            if (blurComp) { break; }
        }
    } catch (e3) { /* skip */ }

    if (blurComp) {
        var amount = findProperty(blurComp, NAMES.blur);
        if (amount) { try { amount.setValue(CONFIG.blurAmount, true); } catch (e4) {} }
        var edge = findProperty(blurComp, NAMES.repeatEdge);
        if (edge) { try { edge.setValue(true, true); } catch (e5) {} }
    }
    return true;
}


// ---------------------------------------------------------------------------
//  ユーティリティ
// ---------------------------------------------------------------------------

function findComponent(clip, candidates) {
    var comps;
    try { comps = clip.components; } catch (e) { return null; }
    if (!comps) { return null; }
    for (var i = 0; i < comps.numItems; i++) {
        var c = comps[i];
        var name = "";
        try { name = c.displayName; } catch (e2) { name = ""; }
        for (var j = 0; j < candidates.length; j++) {
            if (name === candidates[j]) { return c; }
        }
    }
    return null;
}

function findProperty(component, candidates) {
    var props;
    try { props = component.properties; } catch (e) { return null; }
    if (!props) { return null; }
    for (var i = 0; i < props.numItems; i++) {
        var p = props[i];
        var name = "";
        try { name = p.displayName; } catch (e2) { name = ""; }
        for (var j = 0; j < candidates.length; j++) {
            if (name === candidates[j]) { return p; }
        }
    }
    return null;
}

function sortByName(items) {
    items.sort(function (a, b) { return cmpNatural(a.name, b.name); });
    return items;
}

// 01, 02, ... 10 が 1, 10, 2 の順にならないようにする
function cmpNatural(a, b) {
    var ka = natKey(a);
    var kb = natKey(b);
    if (ka < kb) { return -1; }
    if (ka > kb) { return 1; }
    return 0;
}

function natKey(s) {
    return String(s).toLowerCase().replace(/\d+/g, function (m) {
        var padded = "0000000000" + m;
        return padded.substr(padded.length - 10);
    });
}

function formatTC(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.round((sec - m * 60) * 10) / 10;
    var txt = s.toFixed(1);
    return m + ":" + (s < 10 ? "0" : "") + txt;
}


main();
