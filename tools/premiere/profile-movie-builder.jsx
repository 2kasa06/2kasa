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
    clipSeconds: 3.5,      // 写真1枚あたりの秒数
    videoTrack: 1,         // 写真（前面）を置くトラック。0 = V1、1 = V2 …
    startAtPlayhead: true, // false ならシーケンスの先頭から並べる

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
    if (!app.project) {
        alert("プロジェクトが開いていません。");
        return;
    }

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
        alert("モーションを付け直しました。\n\n対象クリップ: " + existing.length + " 個\n" +
              "モーション適用: " + n + " 個");
        return;
    }

    if (CONFIG.backgroundFill && CONFIG.videoTrack < 1) {
        alert("backgroundFill が ON のときは videoTrack を 1 以上にしてください。\n" +
              "背景はそのすぐ下のトラックに入ります。");
        return;
    }
    if (seq.videoTracks.numTracks <= CONFIG.videoTrack) {
        alert("V" + (CONFIG.videoTrack + 1) + " が存在しません。\n" +
              "トラックを追加してから実行してください。");
        return;
    }

    // ---- build ----
    var items = gatherProjectItems();
    if (!items) { return; }                       // ユーザーがキャンセルした
    if (items.length === 0) {
        alert("写真が1枚も見つかりませんでした。");
        return;
    }

    var placed = placeClips(seq, items, CONFIG.videoTrack);
    if (placed.length === 0) {
        alert("クリップを配置できませんでした。\n" +
              "V" + (CONFIG.videoTrack + 1) + " がロックされていないか確認してください。");
        return;
    }

    // 配置は「静止画のデフォルトデュレーション」を上書きで切り詰める仕組みなので、
    // 既定尺が clipSeconds より短いと、隙間だらけの短いクリップになってしまう。
    var shortest = placed[0].end.seconds - placed[0].start.seconds;
    for (var s = 1; s < placed.length; s++) {
        var d = placed[s].end.seconds - placed[s].start.seconds;
        if (d < shortest) { shortest = d; }
    }
    if (shortest < CONFIG.clipSeconds - 0.01) {
        alert("配置しましたが、尺が足りていません。\n\n" +
              "指定 : " + CONFIG.clipSeconds + " 秒 / 実際 : " + Math.round(shortest * 100) / 100 + " 秒\n\n" +
              "静止画のデフォルトデュレーションが短すぎます。\n" +
              "  1. このスクリプトの結果を取り消す（Ctrl/Cmd+Z）\n" +
              "  2. 環境設定 > タイムライン > 静止画のデフォルトデュレーション を\n" +
              "     " + CONFIG.clipSeconds + " 秒より長く（10秒など）設定する\n" +
              "  3. 写真をプロジェクトから削除して読み込み直し、もう一度実行する\n\n" +
              "※ 既に読み込み済みの写真には、設定変更が反映されません。");
        return;
    }

    var motionCount = applyMotionToAll(placed, CONFIG.videoTrack);

    // 背景ぼかし: 同じ写真をもう一度、1つ下のトラックに敷く
    var bgResult = { placed: 0, blurred: 0 };
    if (CONFIG.backgroundFill) {
        bgResult = buildBackground(seq, items);
    }

    var totalSec = placed.length * CONFIG.clipSeconds;

    var msg = "完成しました。\n\n" +
              "配置した写真 : " + placed.length + " 枚（V" + (CONFIG.videoTrack + 1) + "）\n" +
              "1枚あたり    : " + CONFIG.clipSeconds + " 秒\n" +
              "合計         : " + formatTC(totalSec) + "\n" +
              "モーション   : " + motionCount + " 枚に適用\n";

    if (CONFIG.backgroundFill) {
        msg += "背景ぼかし   : " + bgResult.placed + " 枚（V" + CONFIG.videoTrack + "）";
        if (bgResult.blurred < bgResult.placed) {
            msg += "\n\n【要手作業】ぼかしを自動で付けられませんでした（" +
                   (bgResult.placed - bgResult.blurred) + " 枚）。\n" +
                   "V" + CONFIG.videoTrack + " のクリップを全選択して、\n" +
                   "エフェクト「ガウス（ブラー）」をドラッグしてください。\n" +
                   "ぼかし " + CONFIG.blurAmount + " / 「エッジピクセルを繰り返す」に\n" +
                   "チェックを入れると綺麗になります。";
        }
        msg += "\n";
    }

    msg += "\nこのあとは手作業です:\n" +
           "  V" + (CONFIG.videoTrack + 2) + " に調整レイヤー → Lumetri で全体のトーンを統一\n" +
           "  その上に装飾フレーム / テキスト\n" +
           "  A1 に BGM を置き、区切りに合わせて尺を微調整";
    alert(msg);
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


// ---------------------------------------------------------------------------
//  配置
// ---------------------------------------------------------------------------

function placeClips(seq, items, trackIndex) {
    var track = seq.videoTracks[trackIndex];
    if (!track) {
        alert("V" + (trackIndex + 1) + " が存在しません。トラックを追加してください。");
        return [];
    }

    var start = 0;
    if (CONFIG.startAtPlayhead) {
        try { start = seq.getPlayerPosition().seconds; } catch (e) { start = 0; }
    }

    var countBefore = track.clips.numTracks;

    // 1本ずつ上書き配置する。既定の静止画デュレーションが CONFIG.clipSeconds より
    // 長ければ、次の1枚を置いた時点で前の1枚が自動的に切り詰められる。
    for (var i = 0; i < items.length; i++) {
        var at = start + i * CONFIG.clipSeconds;
        try {
            track.overwriteClip(items[i], at);
        } catch (e) {
            // 秒数を直接受け付けないバージョン向けのフォールバック
            try {
                var t = new Time();
                t.seconds = at;
                track.overwriteClip(items[i], t);
            } catch (e2) { /* この1枚はあきらめて次へ */ }
        }
    }

    // 置いたクリップを拾い直す（最後の1枚は既定尺のままなので切り詰める）
    var placed = [];
    var endLimit = start + items.length * CONFIG.clipSeconds;
    for (var k = 0; k < track.clips.numTracks; k++) {
        var clip = track.clips[k];
        if (clip.start.seconds >= start - 0.001 && clip.start.seconds < endLimit - 0.001) {
            placed.push(clip);
        }
    }

    if (placed.length > 0) {
        var last = placed[placed.length - 1];
        var wantEnd = last.start.seconds + CONFIG.clipSeconds;
        if (Math.abs(last.end.seconds - wantEnd) > 0.001) {
            try {
                var te = new Time();
                te.seconds = wantEnd;
                last.end = te;
            } catch (e3) { /* 手で詰めてもらう */ }
        }
    }

    if (countBefore === track.clips.numTracks) { return []; }
    return placed;
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


// ---------------------------------------------------------------------------
//  背景ぼかし
//
//  16:9 でない写真をそのまま置くと黒帯が出る。同じ写真を1つ下のトラックに敷き、
//  大きく拡大してぼかすことで帯を埋める。前面の写真は拡大しないので、
//  元の解像度以上に引き伸ばされることがなく、画質が保たれる。
//
//  背景は必要な拡大率を写真ごとに計算せず、一律で大きめ（既定 250%）にする。
//  どうせ強くぼかすため、はみ出しても問題にならない。
// ---------------------------------------------------------------------------

function buildBackground(seq, items) {
    var bgTrack = CONFIG.videoTrack - 1;
    var result = { placed: 0, blurred: 0 };

    var clips = placeClips(seq, items, bgTrack);
    result.placed = clips.length;

    for (var i = 0; i < clips.length; i++) {
        var clip = clips[i];

        // まずフレームに収めてから、一律で拡大して画面を覆う
        trySetScaleToFrameSize(clip, bgTrack);

        var motion = findComponent(clip, NAMES.motion);
        if (motion) {
            var scale = findProperty(motion, NAMES.scale);
            if (scale) {
                try { scale.setValue(CONFIG.backgroundScale, true); } catch (e) { /* skip */ }
            }
        }

        if (addBlur(clip, bgTrack)) { result.blurred++; }
    }
    return result;
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
    var s = Math.round(sec - m * 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
}


main();
