/*
 * profile-movie-builder.jsx のロジックテスト。
 *
 * Premiere Pro の ExtendScript API をモックして、実際にスクリプトを走らせ、
 * 配置位置・尺・キーフレーム・背景ぼかしを検証します。Premiere なしで実行できます。
 *
 *   node tools/premiere/test/mock-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "..", "profile-movie-builder.jsx");

const BLUR_NAME = "ガウス（ブラー）";

function run(opts) {
  const DEFAULT_STILL = opts.defaultStillSeconds;
  const alerts = [];
  const indexable = (arr, key) => {
    Object.defineProperty(arr, key, { get: () => arr.length });
    return arr;
  };

  const makeProp = (name) => ({
    displayName: name, keys: [], timeVarying: false, value: undefined,
    setValue(v) { this.value = v; },
    setTimeVarying(v) { this.timeVarying = v; },
    addKey(t) { if (!this.keys.some(k => Math.abs(k.t - t) < 1e-6)) this.keys.push({ t, v: null }); },
    setValueAtKey(t, v) {
      const k = this.keys.find(k => Math.abs(k.t - t) < 1e-6);
      if (k) k.v = v; else this.keys.push({ t, v });
    },
    setInterpolationTypeAtKey(t, type) {
      const k = this.keys.find(k => Math.abs(k.t - t) < 1e-6);
      if (k) k.interp = type;
    }
  });

  const makeClip = (name, at) => {
    const motion = {
      displayName: "モーション",
      properties: indexable([makeProp("位置"), makeProp("スケール"), makeProp("回転")], "numItems")
    };
    const comps = [{ displayName: "不透明度", properties: indexable([], "numItems") }, motion];
    return {
      name, scaledToFrame: false,
      start: { seconds: at }, end: { seconds: at + DEFAULT_STILL }, inPoint: { seconds: 0 },
      components: indexable(comps, "numItems"),
      _addBlur() {
        comps.push({
          displayName: BLUR_NAME,
          properties: indexable([makeProp("ブラー"), makeProp("エッジピクセルを繰り返す")], "numItems")
        });
      }
    };
  };

  const makeTrack = () => ({
    _clips: [],
    get clips() {
      return indexable(this._clips.slice().sort((a, b) => a.start.seconds - b.start.seconds), "numTracks");
    },
    overwriteClip(item, at) {
      const t = (typeof at === "number") ? at : at.seconds;
      const end = t + DEFAULT_STILL;
      this._clips = this._clips.filter(c => !(c.start.seconds >= t - 1e-9 && c.end.seconds <= end + 1e-9));
      this._clips.forEach(c => { if (c.end.seconds > t && c.start.seconds < t) c.end = { seconds: t }; });
      this._clips.push(makeClip(item.name, t));
    }
  });

  const tracks = indexable([makeTrack(), makeTrack(), makeTrack()], "numTracks");
  const photos = opts.names.map(n => ({ name: n, type: 1 }));

  const app = {
    project: {
      activeSequence: { videoTracks: tracks, getPlayerPosition: () => ({ seconds: 0 }) }
    },
    getCurrentProjectViewSelection: () => photos,
    enableQE() { if (!opts.qe) throw new Error("QE unavailable"); }
  };

  // QE DOM は内部のクリップを共有し、setScaleToFrameSize / addVideoEffect を実クリップへ反映する
  const qe = {
    project: {
      getActiveSequence: () => ({
        getVideoTrackAt: (i) => {
          const src = tracks[i].clips;
          const items = [];
          for (let k = 0; k < src.length; k++) {
            const c = src[k];
            items.push({
              start: { secs: c.start.seconds },
              setScaleToFrameSize() { c.scaledToFrame = true; },
              addVideoEffect(fx) { if (fx && fx.name === BLUR_NAME) c._addBlur(); else throw new Error("bad fx"); }
            });
          }
          return { numItems: items.length, getItemAt: (i) => items[i] };
        }
      }),
      getVideoEffectByName: (n) => (n === BLUR_NAME ? { name: n } : null)
    }
  };

  let src = fs.readFileSync(SCRIPT, "utf8").replace('source: "folder"', 'source: "selection"');
  for (const [k, v] of Object.entries(opts.config || {})) {
    const re = new RegExp(k + ": [^,]+,");
    src = src.replace(re, k + ": " + JSON.stringify(v) + ",");
  }

  const fn = new Function("alert", "Time", "ProjectItemType", "app", "qe",
    src + "\n//# sourceURL=profile-movie-builder.jsx");
  fn((m) => alerts.push(m), function Time() { this.seconds = 0; },
     { CLIP: 1, BIN: 2, FILE: 4 }, app, qe);

  return { tracks, alerts };
}

let fail = 0;
const ok = (c, m) => { console.log((c ? "  ✅ " : "  ❌ ") + m); if (!c) fail++; };
const NAMES6 = ["10.jpg", "2.jpg", "1.jpg", "3.jpg", "20.jpg", "4.jpg"];

console.log("=== ケース1: 標準設定・QE 利用可（前面 V2 ＋ ぼかし背景 V1）===\n");
{
  const { tracks, alerts } = run({ defaultStillSeconds: 5, qe: true, names: NAMES6 });
  const fg = tracks[1].clips, bg = tracks[0].clips;

  console.log("■ 並び順と配置");
  ok(fg.map(c => c.name).join(",") === "1.jpg,2.jpg,3.jpg,4.jpg,10.jpg,20.jpg",
     "自然順ソート 1,2,3,4,10,20 → " + fg.map(c => c.name).join(","));
  ok(fg.length === 6, "前面 V2 に 6 枚 → " + fg.length);
  ok(fg.every((c, i) => Math.abs(c.start.seconds - i * 3.5) < 1e-6), "開始位置 0/3.5/7/10.5/14/17.5 秒");
  ok(fg.every(c => Math.abs((c.end.seconds - c.start.seconds) - 3.5) < 1e-6), "全クリップ 3.5 秒");

  console.log("■ Ken Burns（前面のみ）");
  const sc = i => fg[i].components[1].properties[1];
  const po = i => fg[i].components[1].properties[0];
  ok(sc(0).keys[0].v === 100 && sc(0).keys[1].v === 108, "1枚目 ズームイン 100→108");
  ok(sc(1).keys[0].v === 108 && sc(1).keys[1].v === 100, "2枚目 ズームアウト（交互）");
  ok(Math.abs(sc(0).keys[1].t - 3.5) < 1e-6, "キーフレーム時刻がクリップ尺と一致");
  ok(sc(0).keys.every(k => k.interp === 2), "両端がベジェ補間");
  ok(Math.abs(po(0).keys[0].v[0] - 0.488) < 1e-9, "位置 0.488 → 0.512 に横移動");
  ok(po(2).keys[0].v[0] > po(2).keys[1].v[0], "3枚目は逆方向にパン");
  ok(fg.every(c => c.scaledToFrame), "前面はフレームサイズに設定（＝拡大されない）");

  console.log("■ 背景ぼかし");
  ok(bg.length === 6, "背景 V1 にも 6 枚 → " + bg.length);
  ok(bg.every((c, i) => Math.abs(c.start.seconds - fg[i].start.seconds) < 1e-6), "前面と開始位置が揃っている");
  ok(bg.every(c => c.components[1].properties[1].value === 250), "背景スケール 250%（画面を覆う）");
  ok(bg.every(c => c.components[1].properties[1].keys.length === 0), "背景には Ken Burns を付けない");
  const blur = c => { for (let i = 0; i < c.components.numItems; i++) if (c.components[i].displayName === BLUR_NAME) return c.components[i]; return null; };
  ok(bg.every(c => blur(c)), "全背景にガウスブラーが付いた");
  ok(bg.every(c => blur(c).properties[0].value === 60), "ぼかし量 60");
  ok(bg.every(c => blur(c).properties[1].value === true), "「エッジピクセルを繰り返す」ON");

  console.log("■ 完了メッセージ");
  ok(alerts.length === 1 && /完成しました/.test(alerts[0]), "完了ダイアログが出る");
  ok(!/要手作業/.test(alerts[0]), "ぼかしが付いたので手作業の警告は出ない");
}

console.log("\n=== ケース2: QE が使えない古い環境（graceful degradation）===\n");
{
  const { tracks, alerts } = run({ defaultStillSeconds: 5, qe: false, names: NAMES6 });
  ok(tracks[1].clips.length === 6, "前面の配置は成功する");
  ok(tracks[1].clips[0].components[1].properties[1].keys.length === 2, "Ken Burns も付く");
  ok(tracks[0].clips.length === 6, "背景クリップも敷かれる");
  ok(tracks[0].clips.every(c => c.components[1].properties[1].value === 250), "背景スケールも設定される");
  ok(/要手作業/.test(alerts[0]) && /ガウス（ブラー）/.test(alerts[0]),
     "ぼかしだけ手で付けるよう案内する（無言で欠落させない）");
}

console.log("\n=== ケース3: 静止画のデフォルトデュレーション不足 ===\n");
{
  const { tracks, alerts } = run({
    defaultStillSeconds: 5, qe: true, names: ["1.jpg", "2.jpg", "3.jpg"],
    config: { clipSeconds: 6 }
  });
  ok(alerts.length === 1 && /尺が足りていません/.test(alerts[0]), "警告する（無言で壊れない）");
  ok(/環境設定/.test(alerts[0]), "直し方を案内する");
  ok(tracks[1].clips.every(c => c.components[1].properties[1].keys.length === 0),
     "壊れた配置にモーションを付けずに中断する");
  ok(tracks[0].clips.length === 0, "背景も作らずに中断する");
}

console.log("\n=== ケース4: backgroundFill ON なのに videoTrack が 0 ===\n");
{
  const { tracks, alerts } = run({
    defaultStillSeconds: 5, qe: true, names: NAMES6, config: { videoTrack: 0 }
  });
  ok(/videoTrack を 1 以上/.test(alerts[0] || ""), "設定ミスを実行前に指摘する");
  ok(tracks[0].clips.length === 0 && tracks[1].clips.length === 0, "何も配置せずに中断する");
}

console.log("\n=== ケース5: 背景なし（backgroundFill OFF）===\n");
{
  const { tracks, alerts } = run({
    defaultStillSeconds: 5, qe: true, names: NAMES6, config: { backgroundFill: false }
  });
  ok(tracks[1].clips.length === 6, "前面だけ配置される");
  ok(tracks[0].clips.length === 0, "背景トラックは触らない");
  ok(!/背景ぼかし/.test(alerts[0]), "完了メッセージに背景の行が出ない");
}

console.log("\n" + (fail === 0 ? "✅ すべて通過" : "❌ " + fail + " 件 失敗"));
process.exit(fail ? 1 : 0);
