/*
 * profile-movie-builder.jsx のロジックテスト。
 *
 * Premiere Pro の ExtendScript API をモックして、実際にスクリプトを走らせ、
 * 配置位置・尺・キーフレームの値を検証します。Premiere なしで実行できます。
 *
 *   node tools/premiere/test/mock-test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "..", "profile-movie-builder.jsx");

function run(opts) {
  const DEFAULT_STILL = opts.defaultStillSeconds;
  const alerts = [];

  const g = {};
  g.alert = (m) => alerts.push(m);
  g.Time = function Time() { this.seconds = 0; };
  g.ProjectItemType = { CLIP: 1, BIN: 2, FILE: 4 };

  const indexable = (arr, key) => {
    Object.defineProperty(arr, key, { get: () => arr.length });
    return arr;
  };

  const makeProp = (name) => ({
    displayName: name, keys: [], timeVarying: false,
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
    return {
      name,
      start: { seconds: at }, end: { seconds: at + DEFAULT_STILL }, inPoint: { seconds: 0 },
      components: indexable(
        [{ displayName: "不透明度", properties: indexable([], "numItems") }, motion], "numItems")
    };
  };

  const track = {
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
  };

  const photos = opts.names.map(n => ({ name: n, type: g.ProjectItemType.CLIP }));

  g.app = {
    project: { activeSequence: { videoTracks: [track], getPlayerPosition: () => ({ seconds: 0 }) } },
    getCurrentProjectViewSelection: () => photos,
    // QE DOM が使えない古いバージョンを想定（graceful degradation の確認）
    enableQE() { throw new Error("QE unavailable"); }
  };

  let src = fs.readFileSync(SCRIPT, "utf8")
    .replace('source: "folder"', 'source: "selection"')
    .replace(/clipSeconds: [\d.]+/, "clipSeconds: " + opts.clipSeconds);

  const fn = new Function(
    "alert", "Time", "ProjectItemType", "app", "qe",
    src + "\n//# sourceURL=profile-movie-builder.jsx"
  );
  fn(g.alert, g.Time, g.ProjectItemType, g.app, undefined);

  return { clips: track.clips, alerts };
}

let fail = 0;
const ok = (c, m) => { console.log((c ? "  ✅ " : "  ❌ ") + m); if (!c) fail++; };

console.log("=== ケース1: 既定尺 5秒 / 指定 3.5秒（通常の使い方）===\n");
{
  const { clips, alerts } = run({
    defaultStillSeconds: 5, clipSeconds: 3.5,
    names: ["10.jpg", "2.jpg", "1.jpg", "3.jpg", "20.jpg", "4.jpg"]
  });

  console.log("■ 並び順（自然順ソート）");
  ok(clips.map(c => c.name).join(",") === "1.jpg,2.jpg,3.jpg,4.jpg,10.jpg,20.jpg",
     "1,2,3,4,10,20 の順 → " + clips.map(c => c.name).join(","));

  console.log("■ 配置と尺");
  ok(clips.length === 6, "6枚すべて配置 → " + clips.length + "枚");
  ok(clips.every((c, i) => Math.abs(c.start.seconds - i * 3.5) < 1e-6),
     "開始位置 0 / 3.5 / 7 / 10.5 / 14 / 17.5 秒");
  ok(clips.every(c => Math.abs((c.end.seconds - c.start.seconds) - 3.5) < 1e-6),
     "全クリップ 3.5 秒（最後の1枚が 5 秒のまま残らない）");
  ok(Math.abs(clips[5].end.seconds - 21.0) < 1e-6, "合計 21.0 秒 → " + clips[5].end.seconds);

  console.log("■ Ken Burns キーフレーム");
  const sc = i => clips[i].components[1].properties[1];
  const po = i => clips[i].components[1].properties[0];
  ok(sc(0).keys.length === 2 && sc(0).keys[0].v === 100 && sc(0).keys[1].v === 108,
     "1枚目 = ズームイン 100→108");
  ok(sc(1).keys[0].v === 108 && sc(1).keys[1].v === 100, "2枚目 = ズームアウト（交互）");
  ok(Math.abs(sc(0).keys[0].t) < 1e-6 && Math.abs(sc(0).keys[1].t - 3.5) < 1e-6,
     "キーフレーム時刻がクリップ尺と一致（0秒 / 3.5秒）");
  ok(sc(0).keys.every(k => k.interp === 2), "両端がベジェ補間（イージング）");
  ok(sc(0).timeVarying === true, "スケールのストップウォッチ ON");
  const p0 = po(0).keys;
  ok(Math.abs(p0[0].v[0] - 0.488) < 1e-9 && Math.abs(p0[1].v[0] - 0.512) < 1e-9,
     "位置 0.488 → 0.512 に横移動");
  ok(po(2).keys[0].v[0] > po(2).keys[1].v[0], "3枚目は逆方向にパン");

  console.log("■ 異常系");
  ok(alerts.length === 1 && /完成しました/.test(alerts[0]),
     "QE DOM が使えなくてもクラッシュせず完走");
}

console.log("\n=== ケース2: 既定尺 5秒 / 指定 6秒（設定ミス。警告が出るべき）===\n");
{
  const { clips, alerts } = run({
    defaultStillSeconds: 5, clipSeconds: 6,
    names: ["1.jpg", "2.jpg", "3.jpg"]
  });
  ok(alerts.length === 1 && /尺が足りていません/.test(alerts[0]),
     "「尺が足りていません」と警告する（無言で壊れない）");
  ok(/環境設定/.test(alerts[0]), "直し方（環境設定の変更）を案内する");
  const hasMotion = clips.some(c => c.components[1].properties[1].keys.length > 0);
  ok(!hasMotion, "壊れた配置にモーションを付けずに中断する");
}

console.log("\n" + (fail === 0 ? "✅ すべて通過" : "❌ " + fail + " 件 失敗"));
process.exit(fail ? 1 : 0);
