// 駐車場の空き状況 — 画面側
// データはポータル本体の PHP(/apps/parking/api/trpc/…)に保存する。
// ポータルの CSP でインラインのスクリプトは動かないため、このファイルに分けている。
(() => {
  "use strict";

  const API = "api/trpc/";            // 相対パス。/apps/parking/api/trpc/ を指す
  const LOGIN = "../../login";
  const POLL_MS = 20000;               // 他の人の入出庫を拾う間隔
  const REPORT_MIN = 60;               // 「満車だった」を有効にする分数
  const UNAUTHED = "Please login (10001)";

  const $ = (id) => document.getElementById(id);
  const state = { me: null, lots: [], parked: [], reports: {}, skew: 0, loaded: false, error: "" };

  // ---- 時刻(日本時間) ----
  const tz = "Asia/Tokyo";
  const now = () => Date.now() + state.skew;
  const fmtHM = new Intl.DateTimeFormat("ja-JP", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const fmtDay = new Intl.DateTimeFormat("ja-JP", { timeZone: tz, month: "long", day: "numeric", weekday: "short" });
  const hm = (t) => fmtHM.format(t);
  const ago = (t) => {
    const m = Math.max(0, Math.round((now() - t) / 60000));
    return m < 1 ? "たった今" : m < 60 ? m + "分前" : Math.floor(m / 60) + "時間前";
  };
  function tickClock() { $("clock").textContent = hm(now()); $("today").textContent = fmtDay.format(now()); }

  // ---- 通信(ポータルの tRPC 互換エンドポイント。superjson 形式で包む) ----
  function unwrap(body) {
    if (body && body.error) {
      const e = body.error.json || body.error;
      const err = new Error(e.message || "error");
      err.code = e.data && e.data.code;
      throw err;
    }
    const d = body && body.result && body.result.data;
    return d && Object.prototype.hasOwnProperty.call(d, "json") ? d.json : d;
  }
  async function call(method, proc, input) {
    const opts = { method, credentials: "same-origin", headers: { "Accept": "application/json" } };
    let url = API + proc;
    if (method === "GET") {
      if (input !== undefined) url += "?input=" + encodeURIComponent(JSON.stringify({ json: input }));
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify({ json: input === undefined ? null : input });
    }
    const res = await fetch(url, opts);
    let body = null;
    try { body = await res.json(); } catch { /* 応答が JSON でない(ログイン画面の HTML など) */ }
    if (res.status === 401 || (res.redirected && /\/login/.test(res.url))) { location.href = LOGIN; throw new Error(UNAUTHED); }
    if (!body) throw new Error("通信に失敗しました");
    try { return unwrap(body); }
    catch (e) { if (e.message === UNAUTHED) location.href = LOGIN; throw e; }
  }
  const query = (proc, input) => call("GET", proc, input);
  const mutate = (proc, input) => call("POST", proc, input);

  // ---- 読み込み ----
  function apply(s) {
    state.me = s.me;
    state.lots = s.lots || [];
    state.parked = s.parked || [];
    state.reports = {};
    (s.reports || []).forEach((r) => { state.reports[r.lotId] = r; });
    if (typeof s.now === "number") state.skew = s.now - Date.now();
    state.loaded = true; state.error = "";
    render();
  }
  let loading = false;
  async function refresh() {
    if (loading) return; loading = true;
    try { apply(await query("parking.state")); }
    catch (e) { if (!state.loaded) { state.error = "読み込めませんでした。通信を確認して、ページを開き直してください。"; render(); } }
    finally { loading = false; }
  }

  // ---- DOM ----
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) el.append(k instanceof Node ? k : String(k));
    return el;
  }
  let toastTimer;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  // ---- 集計 ----
  const LAMP = { ok: "空", few: "混", full: "満" };
  const WORD = { ok: "空きあり", few: "残りわずか", full: "満車" };
  function lotStatus(lot) {
    const cap = Math.max(0, Number(lot.capacity) || 0);
    const fixed = Math.min(cap, Math.max(0, Number(lot.fixed) || 0));
    const here = state.parked.filter((p) => p.lotId === lot.id);
    const used = Math.min(cap, fixed + here.length);
    const free = Math.max(0, cap - fixed - here.length);
    const r = state.reports[lot.id];
    const reported = r && r.state === "full" && now() - r.at < REPORT_MIN * 60000 ? r : null;
    const fewLine = Math.max(1, Math.ceil(cap * 0.15));
    const s = reported || free === 0 ? "full" : free <= fewLine ? "few" : "ok";
    return { cap, fixed, here, used, free, s, reported };
  }
  const myParking = () => state.me && state.parked.find((p) => p.userId === state.me.id);

  // ---- 描画 ----
  function render() { tickClock(); renderBest(); renderMe(); renderLots(); renderAdmin(); }

  function renderBest() {
    const box = $("best");
    box.replaceChildren(h("div", { class: "label" }, "いま停めやすい駐車場"));
    if (!state.loaded) { box.append(h("h2", {}, state.error ? "読み込めませんでした" : "読み込んでいます…"), state.error ? h("p", {}, state.error) : null); return; }
    if (!state.lots.length) { box.append(h("h2", {}, "駐車場がまだ登録されていません"), h("p", {}, "管理者が下の設定から駐車場と台数を登録すると、ここに空き状況が出ます。")); return; }
    const ranked = state.lots.map((l) => ({ l, st: lotStatus(l) })).filter((x) => x.st.s !== "full").sort((a, b) => b.st.free - a.st.free);
    if (!ranked.length) { box.append(h("h2", {}, "すべての駐車場が満車です"), h("p", {}, "出庫の記録が入ると、ここに空いた駐車場が出ます。")); return; }
    const top = ranked[0];
    box.append(
      h("h2", {}, h("span", { class: "hl" }, top.l.name), " が空いています"),
      h("p", {}, "空き ", h("b", { class: "num" }, top.st.free), " 台", top.l.memo ? "・" + top.l.memo : "",
        ranked[1] ? `。次は ${ranked[1].l.name}(空き ${ranked[1].st.free}台)` : ""));
  }

  function renderMe() {
    const box = $("me");
    box.replaceChildren(h("div", { class: "label" }, "あなたの駐車"));
    if (!state.loaded) { box.append(h("div", { class: "now" }, "—")); return; }
    const mine = myParking();
    const lot = mine && state.lots.find((l) => l.id === mine.lotId);
    if (mine && lot) {
      box.append(h("div", { class: "now" }, `${lot.name} に駐車中`),
        h("div", { class: "note" }, `${hm(mine.parkedAt)} から`),
        h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: leave }, "出庫した")));
    } else {
      box.append(h("div", { class: "now" }, "今日はまだ記録がありません"),
        h("div", { class: "note" }, "停めたら、その駐車場の「ここに停めた」を押してください。"));
    }
  }

  function renderLots() {
    const wrap = $("lots");
    if (!state.loaded || !state.lots.length) { wrap.replaceChildren(); return; }
    const mine = myParking();
    wrap.replaceChildren(...state.lots.map((lot) => {
      const st = lotStatus(lot);
      const isMine = !!mine && mine.lotId === lot.id;
      const stalls = [];
      for (let i = 0; i < st.cap; i++) {
        let cls = "stall";
        if (i < st.fixed) cls += " fixed";
        else if (isMine && i === st.fixed) cls += " me";
        else if (i < st.used) cls += " used";
        stalls.push(h("div", { class: cls }));
      }
      const names = st.here.map((p) => p.name || "社員");
      return h("article", { class: "lot" + (isMine ? " mine" : ""), "aria-label": `${lot.name} ${WORD[st.s]} 空き${st.free}台` },
        h("div", { class: "lot-head" },
          h("div", { class: "pmark", "aria-hidden": "true" }, "P"),
          h("div", { class: "name" }, h("h3", {}, lot.name), lot.memo ? h("div", { class: "memo" }, lot.memo) : null),
          h("div", { class: "lamp", "data-s": st.s, role: "img", "aria-label": WORD[st.s] }, LAMP[st.s])),
        h("div", { class: "count", "data-s": st.s },
          h("span", {}, "空き"), h("span", { class: "big" }, st.free), h("span", { class: "unit" }, "台"),
          h("span", { class: "of" }, `/ 全${st.cap}台`, st.fixed ? `(固定${st.fixed})` : "")),
        st.cap ? h("div", { class: "stalls", "aria-hidden": "true" }, stalls) : null,
        h("div", { class: "legend", "aria-hidden": "true" },
          h("span", {}, h("i", { class: "k-used" }), "駐車中"),
          isMine ? h("span", {}, h("i", { class: "k-me" }), "あなた") : null,
          st.fixed ? h("span", {}, h("i", { class: "k-fixed" }), "固定") : null),
        h("div", { class: "who" }, names.length ? ["今日の記録: ", h("b", {}, names.join("、"))] : "今日の記録はまだありません"),
        st.reported ? h("div", { class: "report" }, `${ago(st.reported.at)}に「満車だった」と報告あり`) : null,
        h("div", { class: "lot-actions" },
          isMine ? h("button", { class: "btn primary", type: "button", onclick: leave }, "出庫した")
                 : h("button", { class: "btn primary", type: "button", onclick: () => park(lot) }, "ここに停めた"),
          st.reported ? h("button", { class: "btn small", type: "button", onclick: () => report(lot, "clear") }, "空いていた")
                      : h("button", { class: "btn small danger", type: "button", onclick: () => report(lot, "full") }, "満車だった")));
    }));
  }

  // ---- 管理(ポータルの管理者のみ。サーバー側でも確かめている) ----
  let adminSig = "";
  function renderAdmin() {
    const box = $("admin");
    box.hidden = !(state.loaded && state.me && state.me.isAdmin);
    if (box.hidden) return;
    const sig = JSON.stringify(state.lots);
    if (sig === adminSig) return;          // 入力中のフォームを上書きしない
    adminSig = sig;
    $("adminList").replaceChildren(...state.lots.map(adminRow));
  }
  function adminRow(lot) {
    const id = lot.id;
    const f = (key, label, type, value, extra = {}) => h("div", { class: "field" + (extra.wide ? " wide" : "") },
      h("label", { for: `f-${key}-${id}` }, label),
      h("input", Object.assign({ id: `f-${key}-${id}`, name: key, type, value: value == null ? "" : value, autocomplete: "off" },
        type === "number" ? { inputmode: "numeric", min: "0", max: "999" } : {}, extra.attrs || {})));
    let armed = false;
    const del = h("button", { class: "btn small danger", type: "button", onclick: async () => {
      if (!armed) { armed = true; del.textContent = "本当に削除"; setTimeout(() => { armed = false; del.textContent = "削除"; }, 4000); return; }
      await act(() => mutate("parking.deleteLot", { id }), `${lot.name} を削除しました`);
    } }, "削除");
    const form = h("form", { class: "admin-item", onsubmit: async (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      if (!name) { toast("名前を入れてください"); return; }
      await act(() => mutate("parking.saveLot", {
        id, name,
        capacity: parseInt(fd.get("capacity"), 10) || 0,
        fixed: parseInt(fd.get("fixed"), 10) || 0,
        order: parseInt(fd.get("order"), 10) || 0,
        memo: String(fd.get("memo") || "").trim(),
      }), `${name} を保存しました`);
    } },
      f("name", "名前", "text", lot.name, { attrs: { required: true, maxlength: "30" } }),
      f("capacity", "台数", "number", lot.capacity),
      f("fixed", "固定", "number", lot.fixed),
      f("order", "並び順", "number", lot.order),
      f("memo", "メモ(場所など)", "text", lot.memo, { wide: true, attrs: { maxlength: "60" } }),
      h("div", { class: "acts" }, h("button", { class: "btn small primary", type: "submit" }, "保存"), del));
    return form;
  }
  $("addLot").addEventListener("click", () => act(() => mutate("parking.saveLot", {
    id: null, name: `新しい駐車場${state.lots.length + 1}`, capacity: 10, fixed: 0, order: state.lots.length + 1, memo: "",
  }), "駐車場を追加しました。名前と台数を直してください"));

  // ---- 書き込み ----
  let busy = false;
  async function act(fn, okMsg) {
    if (busy) return; busy = true;
    try { apply(await fn()); toast(okMsg); }
    catch (e) { if (e.message !== UNAUTHED) toast(e.code === "FORBIDDEN" ? "この操作は管理者だけができます" : (e.message && /[ぁ-ん]/.test(e.message) ? e.message : "保存できませんでした。通信を確認して、もう一度押してください")); }
    finally { busy = false; }
  }
  const park = (lot) => act(() => mutate("parking.park", { lotId: lot.id }), `${lot.name} に記録しました`);
  const leave = () => act(() => mutate("parking.leave"), "出庫を記録しました");
  const report = (lot, kind) => act(() => mutate("parking.report", { lotId: lot.id, state: kind }),
    kind === "full" ? `${lot.name} を満車として表示します(60分)` : `${lot.name} の満車報告を取り消しました`);

  // ---- 起動 ----
  render();
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); else tickClock(); }, POLL_MS);
  setInterval(() => { if (state.loaded) render(); else tickClock(); }, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
})();
