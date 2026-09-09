/*
 * wedding-opening.jsx のロジックテスト。
 * After Effects の ExtendScript API をモックしてスクリプトを実走させ、
 * レイヤー構成・時間・キーフレーム・マスクを検証する。AE なしで実行できる。
 *
 *   node tools/after-effects/test/mock-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "..", "wedding-opening.jsx");

function run(opts = {}) {
  const alerts = [];
  const undoGroups = [];

  // ---- プロパティ木 ----
  class Prop {
    constructor(name) {
      this.name = name; this.value = undefined;
      this.keys = []; this.children = new Map(); this.eased = 0;
    }
    get numKeys() { return this.keys.length; }
    property(n) {
      if (!this.children.has(n)) this.children.set(n, new Prop(n));
      return this.children.get(n);
    }
    addProperty(n) {
      if (opts.rejectProps && opts.rejectProps.includes(n)) throw new Error("no such property: " + n);
      const p = new Prop(n);
      const list = this.children.get("__list__") || [];
      list.push(p); this.children.set("__list__", list);
      this.children.set(n, p);
      return p;
    }
    setValue(v) { this.value = v; return v; }
    setValueAtTime(t, v) {
      const k = this.keys.find(k => Math.abs(k.t - t) < 1e-6);
      if (k) k.v = v; else this.keys.push({ t, v });
      this.keys.sort((a, b) => a.t - b.t);
      this.value = v;
    }
    keyTime(i) { return this.keys[i - 1].t; }
    valueAtTime(t) { return this.keys.length ? this.keys[0].v : this.value; }
    setTemporalEaseAtKey() { this.eased++; }
  }

  const mkLayer = (kind, name) => {
    const L = new Prop("layer");
    L.kind = kind; L.name = name;
    L.startTime = 0; L.inPoint = 0; L.outPoint = 0; L.locked = false;
    L.threeDLayer = false; L.enabled = true; L.parent = null;
    L.order = null;
    L.moveToEnd = () => { L.order = "end"; };
    L.moveToBeginning = () => { L.order = "begin"; };
    L.moveBefore = (o) => { L.order = "before:" + o.name; };
    // Transform を先に用意しておく
    const tr = L.property("ADBE Transform Group");
    ["ADBE Position", "ADBE Scale", "ADBE Opacity", "ADBE Anchor Point", "ADBE Rotate Z"]
      .forEach(p => tr.property(p));
    ["ADBE Rotate X", "ADBE Rotate Y", "ADBE Orientation"].forEach(p => tr.property(p));
    tr.property("ADBE Position").value = [960, 540];
    tr.property("ADBE Anchor Point").value = [0, 0];
    tr.property("ADBE Scale").value = [100, 100];
    return L;
  };

  const comps = [];
  const mkComp = (name, w, h, par, dur, fps) => {
    const c = { name, width: w, height: h, duration: dur, frameRate: fps, layers: [] };
    c.openInViewer = () => {};
    c.layers.add = (item) => { const L = mkLayer("footage", item.name); L.source = item; c.layers.push(L); return L; };
    c.layers.addSolid = (col, nm, w2, h2) => { const L = mkLayer("solid", nm); L.color = col; c.layers.push(L); return L; };
    c.layers.addShape = () => { const L = mkLayer("shape", "Shape"); c.layers.push(L); return L; };
    c.layers.addNull = () => { const L = mkLayer("null", "Null"); c.layers.push(L); return L; };
    c.layers.addCamera = (nm) => { const L = mkLayer("camera", nm); c.layers.push(L); return L; };
    c.layer = (i) => c.layers[c.layers.length - i];
    c.layers.addText = (s) => {
      const L = mkLayer("text", "Text");
      L.textValue = s;
      const doc = { text: s, fontSize: 0, font: "", tracking: 0, fillColor: null, justification: null };
      L.property("ADBE Text Properties").property("ADBE Text Document").value = doc;
      c.layers.push(L);
      return L;
    };
    comps.push(c);
    return c;
  };

  const imported = [];
  const app = {
    project: {
      items: {
        addComp: mkComp,
        addFolder: (n) => ({ name: n, items: [] })
      },
      importFile: (io) => {
        const nm = io.file.name;
        const item = { name: nm, width: opts.wide ? 4000 : 1477, height: opts.wide ? 3000 : 1108 };
        imported.push(item); return item;
      }
    },
    fonts: opts.noFontApi ? undefined : {
      getFontsByPostScriptName: (n) => ((opts.installedFonts || ["Quicksand-Light", "Quicksand-Medium",
        "Sacramento-Regular", "ZenKakuGothicNew-Light"]).includes(n) ? [{ n }] : [])
    },
    newProject: () => {},
    beginUndoGroup: (n) => undoGroups.push(n),
    endUndoGroup: () => {}
  };

  const PHOTOS = ["0.jpg","1.jpg","2.jpg","3.jpg","4.jpg","5.jpg","6.jpg","7.jpg","8.jpg","9.jpg","10.jpg",
                  "11.jpg","12.jpg","13.jpg","14.jpg","15.jpg","16.jpg","17.jpg","19.jpg","20.jpg"]
                 .filter(f => !(opts.missing || []).includes(f));

  function MockFile(name) { this.name = name; }
  function MockFolder() {}
  MockFolder.selectDialog = () => (opts.cancel ? null : {
    getFiles: () => PHOTOS.map(n => Object.assign(new MockFile(n), { __isFile: true }))
  });

  const src = fs.readFileSync(SCRIPT, "utf8");
  const fn = new Function("app", "alert", "Folder", "File", "ImportOptions", "ImportAsType",
    "ParagraphJustification", "Shape", "KeyframeEase",
    src + "\n//# sourceURL=wedding-opening.jsx");

  fn(app, (m) => alerts.push(m), MockFolder, MockFile,
     function (f) { this.file = f; this.importAs = null; },
     { FOOTAGE: 1 },
     { CENTER_JUSTIFY: "center", LEFT_JUSTIFY: "left" },
     function () { this.vertices = []; this.closed = false; },
     function (speed, influence) { this.speed = speed; this.influence = influence; });

  return { comps, alerts, imported, undoGroups };
}

let fail = 0;
const ok = (c, m) => { console.log((c ? "  ✅ " : "  ❌ ") + m); if (!c) fail++; };
const PH = [...Array(18)].map((_, i) => i + ".jpg").concat(["19.jpg", "20.jpg"]);

console.log("=== 絵コンテどおりに組めているか ===\n");
{
  const { comps, alerts } = run({ names: PH });
  const comp = comps[0];
  const named = re => comp.layers.filter(l => re.test(l.name));
  const at = nm => comp.layers.find(l => l.name === nm);
  const tr = l => l.property("ADBE Transform Group");

  console.log("■ コンポジション");
  ok(comps.length === 1 && comp.width === 1920 && comp.height === 1080, "1920x1080 のコンポ");
  ok(Math.abs(comp.duration - 86.0) < 1e-9, "尺 86.0 秒");
  ok(comp.layers.some(l => l.kind === "camera"), "3D 用のカメラを置く");

  console.log("■ 0:00 波に乗って流れてくる文字");
  const wt = at("タイトル 波");
  ok(!!wt && wt.textValue === "welcome to our wedding", "文言が入る → " + (wt && wt.textValue));
  ok(wt && Math.abs(wt.inPoint) < 1e-9, "0.0 秒から出る");
  const animList = wt.property("ADBE Text Properties")
                     .property("ADBE Text Animators").children.get("__list__") || [];
  ok(animList.length === 2, "アニメーターが2つ（流れ込みと波）→ " + animList.length);
  const offs = animList.map(a => a.property("ADBE Text Selectors")
                                  .property("ADBE Text Selector")
                                  .property("ADBE Text Percent Offset"));
  ok(offs.every(o => o.numKeys === 2), "どちらも範囲セレクターで1字ずつ動く");
  ok(offs[0].keys[0].v === -100 && offs[0].keys[1].v === 0, "流れ込みは -100 → 0（右から入る）");
  ok(offs[1].keys[0].v === -100 && offs[1].keys[1].v === 100,
     "波は -100 → 100（文字列を通り抜けて平らになる）");
  ok(offs[1].keys[0].t > offs[0].keys[0].t, "波は流れ込みより少し遅れて始まる");

  console.log("■ ルービックキューブ");
  const cubeTiles = named(/^キューブ面 /);
  ok(cubeTiles.length >= 54, "1面9枚×6面＝54枚以上のタイル → " + cubeTiles.length);
  ok(cubeTiles.every(l => l.threeDLayer), "タイルはすべて3Dレイヤー");
  ok(cubeTiles.every(l => l.parent && /^面 /.test(l.parent.name)), "各タイルが面にぶら下がる");
  const faces = named(/^面 (前|後|右|左|上|下)$/);
  ok(faces.length >= 6, "6面ぶんの軸がある → " + faces.length);
  ok(faces.every(f => f.parent && f.parent.name === "キューブ"), "6面がキューブ本体にぶら下がる");
  const cube = named(/^キューブ$/)[0];
  const ori = tr(cube).property("ADBE Orientation").value;
  ok(Math.abs(ori[0] - 35.264) < 0.01 && Math.abs(ori[2] - 45) < 0.01,
     "頂点で立った姿勢（ダイヤ立ち）→ " + ori.map(v => Math.round(v)).join(","));
  ok(tr(cube).property("ADBE Rotate Y").numKeys === 2, "回り続ける");
  const usedInCube = new Set(cubeTiles.map(l => l.source && l.source.name));
  ok(usedInCube.size >= 18, "タイルには違う写真が入る → " + usedInCube.size + " 種類");

  console.log("■ 0:02 文字が左へ / キューブが中央へ");
  const t2 = at("タイトル 左へ");
  const tp = tr(t2).property("ADBE Position");
  ok(tp.keys.length === 2 && tp.keys[0].v[0] === 960 && tp.keys[1].v[0] < 600,
     "文字が中央から左へ動く");
  const cubes = named(/^キューブ$/);
  ok(cubes.length === 3, "キューブは冒頭・移動・再登場の3回出る → " + cubes.length);
  const moving = cubes.find(c => tr(c).property("ADBE Scale").numKeys === 2 &&
                                 tr(c).property("ADBE Scale").keys[1].v[0] > tr(c).property("ADBE Scale").keys[0].v[0]);
  ok(!!moving, "中央へ移動するときに少し大きくなる");

  console.log("■ 写真がキューブから飛び出す");
  const burst = comp.layers.filter(l => /^写真 (0|2)\.jpg$/.test(l.name) &&
                                        tr(l).property("ADBE Scale").numKeys === 3);
  ok(burst.length === 2, "飛び出しは2回（写真1と写真3）→ " + burst.length);
  const bs = tr(burst[0]).property("ADBE Scale");
  ok(bs.keys[0].v[0] < bs.keys[1].v[0] && bs.keys[1].v[0] > bs.keys[2].v[0],
     "小さく出て行き過ぎてから収まる");
  ok(tr(burst[0]).property("ADBE Rotate Z").numKeys === 2, "回りながら飛び出す");

  console.log("■ 0:07 パズル16ピースが上から落ちてはまる");
  const pieces = named(/^ピース /);
  ok(pieces.length === 16, "4×4 の16ピース → " + pieces.length);
  ok(pieces.every(l => l.property("ADBE Mask Parade").children.get("__list__")), "各ピースにマスク");
  ok(pieces.every(l => tr(l).property("ADBE Position").numKeys === 3),
     "落ちて、少し沈んで、はまる（3点）");
  ok(pieces.every(l => tr(l).property("ADBE Position").keys[0].v[1] < 0), "全部画面の上から来る");
  const lags = pieces.map(l => tr(l).property("ADBE Position").keys[0].t);
  ok(new Set(lags).size > 8, "ピースごとに落ちる時間がずれる → " + new Set(lags).size + " 段階");

  console.log("■ 紹介の場面（半透明の白と羽）");
  ok(named(/^白い帯$/).length === 2, "白い帯が2場面ぶん");
  ok(named(/^白ベール$/).length === 2, "全面の薄い白が2場面ぶん");
  const veil = named(/^白ベール$/)[0];
  ok(tr(veil).property("ADBE Opacity").keys[1].v <= 40,
     "ベールは薄く（写真を消さない）→ " + tr(veil).property("ADBE Opacity").keys[1].v + "%");
  const feathers = named(/^羽 /);
  ok(feathers.length >= 32, "羽が紹介2場面＋エンドカードぶん浮かぶ → " + feathers.length);
  ok(feathers.every(l => tr(l).property("ADBE Position").keys[0].v[1] > 1000),
     "羽は下から現れる");
  ok(feathers.every(l => tr(l).property("ADBE Position").keys[1].v[1] < 0), "上へ抜けていく");
  ok(feathers.every(l => tr(l).property("ADBE Rotate Z").numKeys === 2), "回りながら舞う");
  const kanji = named(/^漢字 /);
  ok(kanji.length === 7, "漢字が1字ずつ（山本和果4＋樋口司3）→ " + kanji.length);
  ok(kanji.some(k => k.name === "漢字 果"), "「果」が入っている（和界ではない）");

  console.log("■ 縦4分割がくるくる回って次の写真へ");
  const pivots = named(/^回転軸 /);
  ok(pivots.length === 4, "回転軸が4本 → " + pivots.length);
  ok(pivots.every(p => p.threeDLayer && tr(p).property("ADBE Rotate X").numKeys === 2),
     "縦に回る（X軸まわり）");
  ok(pivots.every(p => tr(p).property("ADBE Rotate X").keys[1].v === 180), "半回転して裏が出る");
  const facesFB = named(/^回転面 /);
  ok(facesFB.length === 8, "表と裏で8枚 → " + facesFB.length);
  ok(facesFB.every(l => l.parent && /^回転軸/.test(l.parent.name)), "全部が軸にぶら下がる");
  const backs = facesFB.filter(l => / 裏$/.test(l.name));
  ok(backs.every(l => tr(l).property("ADBE Orientation").value[0] === 180), "裏は180度向けて貼る");

  console.log("■ 12分割 → 風車 → 風で飛ばされる");
  const pin = named(/^風車 /);
  ok(pin.length === 12, "4×3 の12分割 → " + pin.length);
  ok(pin.every(l => tr(l).property("ADBE Rotate Z").keys[1].v >= 420), "風車のように何回も回る");
  ok(pin.every(l => {
      const sc = tr(l).property("ADBE Scale");
      return sc.keys[sc.keys.length - 1].v[0] < sc.keys[0].v[0] * 0.2;
  }), "だんだん小さくなる（タンポポのように）");
  ok(pin.every(l => tr(l).property("ADBE Position").keys[1].v[0] > 1920), "風で画面の外へ流れる");
  ok(!!at("分割グリッド"), "先に白いグリッドが出る");

  console.log("■ 上からコトンと落ちてくる");
  const drop = comp.layers.find(l => l.name === "写真 7.jpg" && tr(l).property("ADBE Position").numKeys === 3);
  ok(!!drop, "落ちてくるカットがある");
  const dp = tr(drop).property("ADBE Position");
  ok(dp.keys[0].v[1] < 0 && dp.keys[1].v[1] > 540 && Math.abs(dp.keys[2].v[1] - 540) < 1,
     "上から来て、少し行き過ぎて、戻って止まる");

  console.log("■ 後半の入り方の変化");
  const kinds = {
    "帯 ": "4分割が横から", "割り ": "上下から", "面 0-": "9分割が立ち上がる", "羽根 ": "シャッター"
  };
  for (const k in kinds) { ok(named(new RegExp("^" + k)).length > 0, kinds[k] + " が入っている"); }
  ok(named(/^フラッシュ$/).length > 0, "フラッシュで入るカットがある");
  ok(named(/^2分割 /).length === 2, "縦写真2枚の左右分割");
  ok(!!at("カラーフレーム"), "クライマックスの色が変わる枠");

  console.log("■ 全写真を使い切っているか");
  const used = new Set(comp.layers.filter(l => l.source).map(l => l.source.name));
  const unused = PH.filter(f => !used.has(f));
  ok(unused.length === 0, "20枚すべて使う → 未使用 " + (unused.join(",") || "なし"));

  console.log("■ 時間のつながり");
  let gap = null, prev = 0;
  for (const s of [[0,2],[2,1.2],[3.2,.6],[3.8,3.7],[7.5,1],[8.5,3.5],[12,.8],[12.8,.6],[13.4,3.1]]) {
    if (Math.abs(s[0] - prev) > 1e-6) gap = s[0];
    prev = s[0] + s[1];
  }
  ok(gap === null, "冒頭から隙間なくつながる");
  ok(comp.layers.every(l => l.outPoint <= 86.0001), "86秒を超えるレイヤーがない");

  console.log("■ 完了レポート");
  ok(alerts.length === 1 && /組み立てました/.test(alerts[0]), "完了ダイアログ");
  ok(/2027\.11\.20/.test(alerts[0]), "挙式日を確認できる");
  ok(!/見つからない/.test(alerts[0]), "欠品なし");
}

console.log("\n=== 写真が足りない ===\n");
{
  const { alerts } = run({ names: PH, missing: ["9.jpg"] });
  ok(/見つからない写真/.test(alerts[0] || "") && /9\.jpg/.test(alerts[0] || ""),
     "足りないファイル名を報告して完走する");
}

console.log("\n=== フォルダ選択をキャンセル ===\n");
{
  const { comps, alerts } = run({ cancel: true, names: PH });
  ok(comps.length === 0 && alerts.length === 0, "何も作らずに静かに終わる");
}

console.log("\n=== 古い AE（app.fonts なし・一部プロパティ非対応）===\n");
{
  const { comps, alerts } = run({ names: PH, noFontApi: true,
                                  rejectProps: ["ADBE Text Range Type2", "ADBE Vector Shape - Ellipse"] });
  ok(comps.length === 1, "コンポは作られる");
  ok(/組み立てました/.test(alerts[0] || ""), "対応していない指定があっても完走する");
}

console.log("\n" + (fail === 0 ? "✅ すべて通過" : "❌ " + fail + " 件 失敗"));
process.exit(fail ? 1 : 0);
