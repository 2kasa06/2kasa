/* =========================================================
   MIRAI 建設マネジメント — サイト内の動きをまとめて制御
   依存ライブラリなし。スクロール処理は rAF に集約している。
   ========================================================= */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  /* -------------------------------------------------------
     1. テキスト分割（文字送り・単語のフェード）
     ------------------------------------------------------- */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.transitionDelay = `${i * 34}ms`;
      el.appendChild(span);
    });
  }

  function splitWords(el) {
    // 日本語は単語境界が無いので、句読点と改行で区切る。
    const parts = el.textContent.trim().split(/(?<=[、。])|\s+/).filter(Boolean);
    el.textContent = '';
    parts.forEach((w) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = w;
      el.appendChild(span);
    });
  }

  if (!reduced) {
    $$('[data-split]').forEach(splitChars);
    $$('[data-split-words]').forEach(splitWords);
  }

  /* -------------------------------------------------------
     2. ローディング
     ------------------------------------------------------- */
  const loader = $('#loader');
  const loaderNum = $('#loaderNum');
  const loaderBar = $('#loaderBar');

  function finishLoading() {
    document.body.classList.add('is-ready');
    loader.classList.add('is-done');
    setTimeout(() => loader.classList.add('is-hidden'), 1100);
    // ヒーローの見出しはローディング明けに動かす
    $$('#hero [data-split], #hero [data-reveal]').forEach((el) => el.classList.add('is-in'));
    onScroll();
  }

  if (reduced) {
    loader.classList.add('is-hidden');
    document.body.classList.add('is-ready');
    $$('[data-split], [data-reveal], [data-split-words]').forEach((el) => el.classList.add('is-in'));
  } else {
    let n = 0;
    const tick = () => {
      // 終盤ほど遅くして、実際の読み込みっぽい間を作る
      n += Math.max(0.6, (100 - n) * 0.045);
      if (n >= 100) n = 100;
      loaderNum.textContent = Math.floor(n);
      loaderBar.style.width = `${n}%`;
      if (n < 100) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(finishLoading, 260);
      }
    };
    requestAnimationFrame(tick);
  }

  /* -------------------------------------------------------
     3. 出現アニメーション（IntersectionObserver）
     ------------------------------------------------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = Number(el.dataset.revealDelay || 0);
      setTimeout(() => el.classList.add('is-in'), delay);
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

  $$('[data-reveal], [data-split], .flow__step').forEach((el) => {
    if (el.closest('#hero')) return;   // ヒーローはローディング明けに動かす
    io.observe(el);
  });

  // 本文は、スクロールに合わせて単語が一つずつ濃くなる
  const wordSpans = $$('.word');
  const wordIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const words = $$('.word', entry.target);
      words.forEach((w, i) => setTimeout(() => w.classList.add('is-in'), i * 55));
      wordIo.unobserve(entry.target);
    });
  }, { threshold: 0.3 });
  if (wordSpans.length) $$('[data-split-words]').forEach((el) => wordIo.observe(el));

  /* -------------------------------------------------------
     4. 数字のカウントアップ
     ------------------------------------------------------- */
  const countIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const dur = 1600;
      const start = performance.now();
      const step = (now) => {
        const p = clamp((now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(target * eased).toLocaleString('ja-JP');
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString('ja-JP');
      };
      requestAnimationFrame(step);
      countIo.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIo.observe(el));

  /* -------------------------------------------------------
     5. マーキーの複製（切れ目なくループさせる）
     ------------------------------------------------------- */
  $$('.marquee__track, .footer__track').forEach((track) => {
    track.innerHTML += track.innerHTML;
  });

  /* -------------------------------------------------------
     6. スクロール連動（進捗バー／ヘッダー／視差／WORKS／FLOW）
     ------------------------------------------------------- */
  const header      = $('#header');
  const progressBar = $('#progressBar');
  const worksSec    = $('#works');
  const worksTrack  = $('#worksTrack');
  const worksBar    = $('#worksBar');
  const flowList    = $('#flowList');
  const flowLine    = $('#flowLine');
  const parallaxEls = $$('[data-parallax]');

  let lastY = 0;
  let ticking = false;

  function onScroll() {
    const y  = window.scrollY;
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight - vh;

    // 進捗バー
    if (progressBar) progressBar.style.width = `${clamp(y / (docH || 1)) * 100}%`;

    // ヘッダー：下スクロールで隠し、上スクロールで戻す
    header.classList.toggle('is-solid', y > 40);
    if (y > 260 && y > lastY + 4) header.classList.add('is-hidden');
    else if (y < lastY - 4) header.classList.remove('is-hidden');
    lastY = y;

    // 視差
    if (!reduced) {
      parallaxEls.forEach((el) => {
        const speed = Number(el.dataset.parallax || 0.1);
        const rect  = el.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    }

    // WORKS：縦スクロールを横移動に変換
    if (worksSec && worksTrack && !reduced) {
      const rect = worksSec.getBoundingClientRect();
      const total = worksSec.offsetHeight - vh;
      const p = clamp(-rect.top / (total || 1));
      const distance = Math.max(0, worksTrack.scrollWidth - window.innerWidth + 40);
      worksTrack.style.transform = `translate3d(${(-p * distance).toFixed(1)}px,0,0)`;
      if (worksBar) worksBar.style.width = `${p * 100}%`;
    }

    // FLOW：縦線がスクロールに合わせて伸びる
    if (flowList && flowLine) {
      const rect = flowList.getBoundingClientRect();
      const p = clamp((vh * 0.75 - rect.top) / (rect.height || 1));
      flowLine.style.height = `${p * 100}%`;
    }
  }

  function requestTick() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  onScroll();

  /* -------------------------------------------------------
     7. カスタムカーソル & マグネットボタン
     ------------------------------------------------------- */
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !reduced) {
    document.body.classList.add('has-cursor');
    const cursor = $('#cursor');
    const dot  = $('.cursor__dot', cursor);
    const ring = $('.cursor__ring', cursor);
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });

    (function follow() {
      rx = lerp(rx, mx, 0.16);
      ry = lerp(ry, my, 0.16);
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(follow);
    })();

    document.addEventListener('mouseover', (e) => {
      const hit = e.target.closest('a, button, [data-cursor], .work, .service__item');
      cursor.classList.toggle('is-active', Boolean(hit));
    });

    // ボタンがカーソルに引き寄せられる
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.28;
        const y = (e.clientY - r.top - r.height / 2) * 0.32;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* -------------------------------------------------------
     8. モバイルメニュー
     ------------------------------------------------------- */
  const burger = $('#burger');
  const menu   = $('#menu');

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    menu.setAttribute('aria-hidden', String(!open));
    document.documentElement.classList.toggle('is-locked', open);
  }

  burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('#menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });

  /* -------------------------------------------------------
     9. お問い合わせフォーム（送信先が未設定のため確認のみ）
     ------------------------------------------------------- */
  const form = $('#contactForm');
  const note = $('#formNote');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('input[required], textarea[required]', form).forEach((input) => {
      const valid = input.checkValidity() && input.value.trim() !== '';
      input.closest('.field').classList.toggle('is-error', !valid);
      if (!valid) ok = false;
    });
    if (!ok) {
      note.textContent = '未入力の項目があります。ご確認ください。';
      return;
    }
    note.textContent = '送信処理は未接続です（送信先のメール／フォームAPIを設定してください）。';
    form.querySelector('.btn').blur();
  });

  $$('.field input, .field textarea', form).forEach((input) => {
    input.addEventListener('input', () => input.closest('.field').classList.remove('is-error'));
  });

  /* -------------------------------------------------------
     10. 小物：時計・年号・トップへ戻る
     ------------------------------------------------------- */
  const clock = $('#clock');
  if (clock) {
    const tickClock = () => {
      const now = new Date();
      const jst = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo', hour12: false,
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).format(now);
      clock.textContent = jst;
    };
    tickClock();
    setInterval(tickClock, 1000);
  }

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  $('#totop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
})();
