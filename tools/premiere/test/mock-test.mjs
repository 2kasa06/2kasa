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
      start: { seconds: at }, _limit: at + DEFAULT_STILL, inPoint: { seconds: 0 },
      _end: { seconds: at + DEFAULT_STILL },
      get end() { return this._end; },
      // strictStillDuration: 静止画の既定尺を超えて伸ばせない Premiere を再現する
      set end(v) {
        if (opts.strictStillDuration && v.seconds > this._limit + 1e-9) throw new Error("cannot extend still");
        this._end = v;
      },
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
      this._clips.forEach(c => { if (c.end.seconds > t && c.start.seconds < t) c._end = { seconds: t }; });
      this._clips.push(makeClip(item.name, t));
    }
  });

  const nTracks = opts.trackCount || 4;
  const tracks = indexable([...Array(nTracks)].map(() => makeTrack()), "numTracks");
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
const tc = (x) => `${Math.floor(x / 60)}:${String((x % 60).toFixed(1)).padStart(4, "0")}`;

// 実素材と同じ構成: 1〜17, 19, 20（18 は欠番）
const REAL = [...Array(17)].map((_, i) => `${i + 1}.jpg`).concat(["19.jpg", "20.jpg"]);

console.log("=== ケース1: 編集リストどおりに配置（実素材19枚）===\n");
{
  const { tracks, alerts } = run({ defaultStillSeconds: 10, qe: true, names: REAL });
  const fg = tracks[1].clips, bg = tracks[0].clips, sp = tracks[2].clips;

  console.log("■ 参考動画（1:26）の尺に合っているか");
  ok(fg.length === 19, "前面 V2 に 19 カット（17枚＋2分割の左＋再登場） → " + fg.length);
  ok(Math.abs(fg[0].start.seconds - 2.0) < 1e-6, "0:02.0 から開始（冒頭2秒はオープニング用に空ける）");
  const last = fg[fg.length - 1];
  ok(Math.abs(last.end.seconds - 79.0) < 1e-6, "写真パートは 1:19.0 で終わる → " + tc(last.end.seconds));
  ok(Math.abs(last.start.seconds - 74.0) < 1e-6, "クライマックスは 1:14.0 から（参考動画と同じ）");

  console.log("■ パートごとの尺");
  const dur = c => c.end.seconds - c.start.seconds;
  ok(Math.abs(dur(fg[0]) - 7.0) < 1e-6, "キービジュアル 7.0秒");
  ok(Math.abs(dur(fg[1]) - 6.0) < 1e-6, "タイトル背景 6.0秒");
  ok(fg.slice(2, 9).every(c => Math.abs(dur(c) - 4.0) < 1e-6), "Aメロ 7カットが 4.0秒");
  ok(fg.slice(9, 17).every(c => Math.abs(dur(c) - 3.3) < 1e-6), "大サビ 8カットが 3.3秒（テンポが上がる）");
  ok(Math.abs(dur(fg[17]) - 4.6) < 1e-6, "2分割 4.6秒");
  ok(Math.abs(dur(fg[18]) - 5.0) < 1e-6, "クライマックス 5.0秒");
  let gap = false;
  for (let i = 1; i < fg.length; i++) if (Math.abs(fg[i].start.seconds - fg[i - 1].end.seconds) > 1e-6) gap = true;
  ok(!gap, "カット間に隙間も重なりもない");

  console.log("■ 2分割（19 と 20 を左右half）");
  ok(fg[17].name === "19.jpg", "左は 19.jpg → " + fg[17].name);
  ok(sp.length === 1 && sp[0].name === "20.jpg", "右は 20.jpg を V3 に → " + (sp[0] && sp[0].name));
  ok(Math.abs(sp[0].start.seconds - fg[17].start.seconds) < 1e-6 &&
     Math.abs(sp[0].end.seconds - fg[17].end.seconds) < 1e-6, "左右が同じ時間に同じ尺で並ぶ");
  const mo = c => c.components[1].properties;
  ok(mo(fg[17])[1].value === 133.3, "19 のスケール 133.3%（画面ちょうど半分の幅）");
  ok(mo(sp[0])[1].value === 118.5, "20 のスケール 118.5%（画面ちょうど半分の幅）");
  ok(mo(fg[17])[0].value[0] === 0.25, "19 は左半分の中央 x=0.25");
  ok(mo(sp[0])[0].value[0] === 0.75, "20 は右半分の中央 x=0.75");
  ok(Math.abs(mo(fg[17])[0].value[1] - 0.47) < 1e-9, "19 は少し上寄せ（足元が切れないよう y=0.47）");
  ok(mo(fg[17])[1].keys.length === 0 && mo(sp[0])[1].keys.length === 0,
     "2分割にはズームを付けない（隣の半分に重なるため）");

  console.log("■ Ken Burns（2分割以外）");
  ok(mo(fg[0])[1].keys[0].v === 100 && mo(fg[0])[1].keys[1].v === 108, "1カット目 ズームイン 100→108");
  ok(mo(fg[1])[1].keys[0].v === 108, "2カット目 ズームアウト（交互）");
  ok(Math.abs(mo(fg[0])[1].keys[1].t - 7.0) < 1e-6, "キーフレームが 7.0秒のカット尺に一致");
  ok(Math.abs(mo(fg[9])[1].keys[1].t - 3.3) < 1e-6, "3.3秒のカットには 3.3秒のキーフレーム");
  ok(mo(fg[0])[1].keys.every(k => k.interp === 2), "両端がベジェ補間");

  console.log("■ 背景ぼかし");
  ok(bg.length === 18, "2分割を除く 18 カットに背景 → " + bg.length);
  ok(bg.every(c => c.components[1].properties[1].value === 250), "背景スケール 250%");
  const blur = c => { for (let i = 0; i < c.components.numItems; i++) if (c.components[i].displayName === BLUR_NAME) return c.components[i]; return null; };
  ok(bg.every(c => blur(c) && blur(c).properties[0].value === 60), "全背景にぼかし 60");
  ok(!bg.some(c => Math.abs(c.start.seconds - 69.4) < 0.01), "2分割の位置には背景を敷かない（左右で埋まるため）");

  console.log("■ 完了メッセージ");
  ok(/1:19\.0/.test(alerts[0]), "エンドカードの開始位置を案内する");
  ok(!/要手作業/.test(alerts[0]), "ぼかしが付いたので手作業の警告は出ない");
}

console.log("\n=== ケース2: 編集リストの写真が足りない ===\n");
{
  const { tracks, alerts } = run({ defaultStillSeconds: 10, qe: true, names: ["1.jpg", "2.jpg"] });
  ok(/見つかりません/.test(alerts[0] || ""), "不足しているファイル名を挙げて中断する");
  ok(/19\.jpg/.test(alerts[0] || "") && /20\.jpg/.test(alerts[0] || ""), "分割用の2枚も検出する");
  ok(tracks[1].clips.length === 0, "1枚も配置せずに止まる（中途半端に置かない）");
}

console.log("\n=== ケース3: 静止画のデフォルトデュレーション不足（7秒のカットがある）===\n");
{
  const { tracks, alerts } = run({ defaultStillSeconds: 5, qe: true, names: REAL, strictStillDuration: true });
  ok(/尺が足りていません/.test(alerts[0] || ""), "警告する（無言で壊れない）");
  ok(/7 秒より長く/.test(alerts[0] || ""), "編集リストの最長カット 7 秒を基準に案内する");
  ok(tracks[1].clips.every(c => c.components[1].properties[1].keys.length === 0),
     "壊れた配置にモーションを付けずに中断する");
  ok(tracks[0].clips.length === 0, "背景も作らずに中断する");
}

console.log("\n=== ケース4: トラック不足 ===\n");
{
  const { tracks, alerts } = run({ defaultStillSeconds: 10, qe: true, names: REAL, trackCount: 2 });
  ok(/ビデオトラックが足りません/.test(alerts[0] || ""), "実行前に不足を指摘する");
  ok(/V1〜V3/.test(alerts[0] || ""), "必要なトラック数を具体的に示す");
  ok(tracks[0].clips.length === 0 && tracks[1].clips.length === 0, "何も配置せずに中断する");
}

console.log("\n=== ケース5: QE が使えない古い環境 ===\n");
{
  const { tracks, alerts } = run({ defaultStillSeconds: 10, qe: false, names: REAL });
  ok(tracks[1].clips.length === 19, "配置は成功する");
  ok(tracks[1].clips[0].components[1].properties[1].keys.length === 2, "Ken Burns も付く");
  ok(tracks[1].clips[17].components[1].properties[1].value === 133.3, "2分割のスケールも設定される");
  ok(/要手作業/.test(alerts[0]) && /ガウス（ブラー）/.test(alerts[0]),
     "ぼかしだけ手作業に回す案内が出る（無言で欠落させない）");
}

console.log("\n=== ケース6: 編集リストを使わず等分（useEditList: false）===\n");
{
  const { tracks } = run({
    defaultStillSeconds: 10, qe: true, names: ["10.jpg", "2.jpg", "1.jpg"],
    config: { useEditList: false }
  });
  const fg = tracks[1].clips;
  ok(fg.map(c => c.name).join(",") === "1.jpg,2.jpg,10.jpg", "自然順ソート（1,10,2 にならない）");
  ok(fg.every(c => Math.abs((c.end.seconds - c.start.seconds) - 3.5) < 1e-6), "全カット 3.5秒");
  ok(tracks[2].clips.length === 0, "2分割トラックは使わない");
}

console.log("\n" + (fail === 0 ? "✅ すべて通過" : "❌ " + fail + " 件 失敗"));
process.exit(fail ? 1 : 0);
