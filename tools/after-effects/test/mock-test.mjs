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
    L.order = null;
    L.moveToEnd = () => { L.order = "end"; };
    L.moveToBeginning = () => { L.order = "begin"; };
    L.moveBefore = (o) => { L.order = "before:" + o.name; };
    // Transform を先に用意しておく
    const tr = L.property("ADBE Transform Group");
    ["ADBE Position", "ADBE Scale", "ADBE Opacity", "ADBE Anchor Point", "ADBE Rotate Z"]
      .forEach(p => tr.property(p));
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

  const PHOTOS = ["1.jpg","2.jpg","3.jpg","5.jpg","6.jpg","7.jpg","8.jpg","9.jpg","10.jpg",
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

console.log("=== ケース1: 標準構成 ===\n");
{
  const { comps, alerts, undoGroups } = run();
  const comp = comps[0];
  const byKind = k => comp.layers.filter(l => l.kind === k);
  const named = re => comp.layers.filter(l => re.test(l.name));

  console.log("■ コンポジション");
  ok(comps.length === 1, "コンポを1つ作る");
  ok(comp.width === 1920 && comp.height === 1080, "1920x1080");
  ok(Math.abs(comp.duration - 86.0) < 1e-9, "尺 86.0 秒（参考動画と同じ）");
  ok(comp.frameRate === 30, "30fps");
  ok(undoGroups.length === 1, "取り消しをひとまとめにする（Ctrl+Z 一発で戻せる）");

  console.log("■ レイヤーの内訳");
  ok(byKind("text").length >= 12, "テキストレイヤーが12枚以上 → " + byKind("text").length);
  ok(byKind("shape").length >= 12, "シェイプレイヤーが12枚以上 → " + byKind("shape").length);
  ok(byKind("footage").length >= 30, "写真レイヤー（タイル16枚を含む）→ " + byKind("footage").length);

  console.log("■ 全編に乗るグリッド");
  const grid = named(/グリッド線/)[0];
  ok(!!grid, "グリッド線レイヤーがある");
  ok(grid && grid.order === "begin", "いちばん上に置かれる");
  ok(grid && grid.property("ADBE Transform Group").property("ADBE Opacity").value === 30,
     "薄く敷く（不透明度30%）");

  console.log("■ オープニング 0:00-0:02");
  const wipes = named(/^ワイプ/);
  ok(wipes.length === 4, "白い帯が4枚 → " + wipes.length);
  ok(wipes.every(w => w.property("ADBE Transform Group").property("ADBE Rotate Z").value !== 0),
     "それぞれ角度が付いている");
  ok(wipes.every(w => w.property("ADBE Transform Group").property("ADBE Position").numKeys === 2),
     "画面外へ抜けるキーフレームが入る");
  const wt = wipes.map(w => w.property("ADBE Transform Group").property("ADBE Position").keys[0].t);
  ok(new Set(wt).size === 4, "4枚とも発火タイミングがずれている（同時に動かない）");

  console.log("■ Welcome 0:14");
  const wel = named(/^Welcome/);
  ok(wel.length === 3, "3行に分かれている → " + wel.length);
  ok(wel.every(l => l.textValue), "本物のテキストレイヤー（AE上で打ち直せる）");
  ok(wel.every(l => Math.abs(l.inPoint - 14.0) < 1e-9), "14.0 秒から出る");
  const anim = wel[0].property("ADBE Text Properties").property("ADBE Text Animators")
                     .property("ADBE Text Animator");
  ok(!!anim, "テキストアニメーターが付く");
  const sel = anim.property("ADBE Text Selectors").property("ADBE Text Selector")
                  .property("ADBE Text Percent Start");
  ok(sel.numKeys === 2 && sel.keys[0].v === 0 && sel.keys[1].v === 100,
     "範囲セレクターが 0→100% で1字ずつ出る");
  ok(anim.property("ADBE Text Animator Properties").property("ADBE Text Position 3D").value[1] === 90,
     "下から90px立ち上がる");
  ok(wel.map(l => l.property("ADBE Text Properties")
      .property("ADBE Text Animators").property("ADBE Text Animator")
      .property("ADBE Text Selectors").property("ADBE Text Selector")
      .property("ADBE Text Percent Start").keys[0].t)
     .every((t, i, a) => i === 0 || t > a[i - 1]), "行ごとに時間差で出る");

  console.log("■ 面で割る＋漢字（0:19 新郎 / 0:43 新婦）");
  const blocks = named(/^面 /);
  ok(blocks.length === 8, "ベタ面が2場面ぶんで8枚 → " + blocks.length);
  ok(blocks.every(b => b.property("ADBE Transform Group").property("ADBE Position").numKeys === 2),
     "画面外から滑り込むキーフレームが入る");
  const kanji = named(/^漢字/);
  ok(kanji.length === 4, "漢字が1字ずつ独立したレイヤー → " + kanji.length);
  const ys = kanji.slice(0, 2).map(k => k.property("ADBE Transform Group").property("ADBE Position").keys[1].v[1]);
  ok(ys[0] !== ys[1], "上下に振って配置される（一列に並べない）");
  const romaji = named(/^ローマ字/);
  ok(romaji.length === 2, "ローマ字も2場面ぶん");
  ok(romaji.every(r => r.property("ADBE Text Properties").property("ADBE Text Document").value.tracking === 320),
     "ローマ字は字間を大きく取る（320）");

  console.log("■ タイル分割 1:01");
  const tiles = named(/^タイル/);
  ok(tiles.length === 16, "4×4 の16枚に割る → " + tiles.length);
  ok(tiles.every(t => t.property("ADBE Mask Parade").children.get("__list__")),
     "各タイルにマスクが入る");
  const t0s = tiles.map(t => t.property("ADBE Transform Group").property("ADBE Opacity").keys[0].t);
  ok(new Set(t0s).size > 1, "中央から外へ、時間差で立ち上がる");
  ok(named(/^コーナー/).length === 4, "四隅のコーナーブラケットが4つ");

  console.log("■ 2分割 1:09");
  const sp = named(/^2分割/);
  ok(sp.length === 2, "縦写真2枚を左右に");
  ok(sp.every(l => l.property("ADBE Mask Parade").children.get("__list__")), "半分ずつマスクする");
  ok(sp.every(l => l.property("ADBE Transform Group").property("ADBE Position").numKeys === 2),
     "外側から滑り込む");

  console.log("■ クライマックスとエンドカード");
  const cf = named(/カラーフレーム/)[0];
  ok(!!cf, "色が変わる枠がある");
  const strokeCol = cf.property("ADBE Root Vectors Group").property("ADBE Vector Group")
                      .property("ADBE Vectors Group").property("ADBE Vector Graphic - Stroke")
                      .property("ADBE Vector Stroke Color");
  ok(strokeCol.numKeys === 3, "枠の色が3点で変化する（オレンジ→マゼンタ→紫）");
  const blk = named(/黒フェード/)[0];
  ok(blk && Math.abs(blk.outPoint - 86.0) < 1e-9, "最後は黒へ落ちて 86.0 秒で終わる");

  console.log("■ 時間のつながり");
  const photos = comp.layers.filter(l => /^写真 /.test(l.name));
  ok(photos.every(l => l.outPoint > l.inPoint), "全写真レイヤーの尺が正");
  ok(photos.every(l => l.property("ADBE Transform Group").property("ADBE Scale").numKeys === 2),
     "全写真にズームのキーフレームが入る");
  ok(photos.every(l => l.property("ADBE Transform Group").property("ADBE Scale").eased > 0),
     "キーフレームにイーズが掛かる（等速にならない）");

  console.log("■ 完了レポート");
  ok(alerts.length === 1 && /組み立てました/.test(alerts[0]), "完了ダイアログが出る");
  ok(!/見つからない/.test(alerts[0]), "欠品なしなら警告は出ない");
}

console.log("\n=== ケース2: 写真が足りない ===\n");
{
  const { alerts } = run({ missing: ["16.jpg", "19.jpg"] });
  ok(/見つからない写真/.test(alerts[0] || ""), "足りないファイル名を報告する");
  ok(/16\.jpg/.test(alerts[0] || "") && /19\.jpg/.test(alerts[0] || ""), "両方挙げる");
  ok(/組み立てました/.test(alerts[0] || ""), "残りは組み上げて完走する");
}

console.log("\n=== ケース3: フォルダ選択をキャンセル ===\n");
{
  const { comps, alerts } = run({ cancel: true });
  ok(comps.length === 0, "コンポを作らずに終わる");
  ok(alerts.length === 0, "余計なダイアログを出さない");
}

console.log("\n=== ケース4: 指定フォントが入っていない ===\n");
{
  const { comps, alerts } = run({ installedFonts: [] });
  const txt = comps[0].layers.filter(l => l.kind === "text");
  ok(txt.length > 0 && txt.every(l =>
      l.property("ADBE Text Properties").property("ADBE Text Document").value.font),
     "代替フォント名を入れて完走する（落ちない）");
  ok(/組み立てました/.test(alerts[0] || ""), "最後まで組み上がる");
}

console.log("\n=== ケース5: 古い AE（app.fonts が無い / 一部プロパティ非対応）===\n");
{
  const { comps, alerts } = run({ noFontApi: true, rejectProps: ["ADBE Black&White"] });
  ok(comps.length === 1, "コンポは作られる");
  ok(/組み立てました/.test(alerts[0] || ""), "モノクロ効果が使えなくても完走する");
  const mono = comps[0].layers.filter(l => /^写真 (5|11)\.jpg/.test(l.name));
  ok(mono.length === 2, "モノクロ対象の写真レイヤー自体は置かれる");
}

console.log("\n" + (fail === 0 ? "✅ すべて通過" : "❌ " + fail + " 件 失敗"));
process.exit(fail ? 1 : 0);
