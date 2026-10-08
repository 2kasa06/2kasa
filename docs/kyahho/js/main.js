/* きゃっほー — ページの動きと操作
 * 依存ライブラリなし。JSが動かなくても、すべての文章は最初から読める状態でHTMLにあります。
 * 「動かす前の状態」は CSS 側で html.motion のときだけ作っています。
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var canMove = function () { return root.classList.contains('motion'); };

  // 設定が途中で変わったら追従する（動きを減らす → すべて完成形で表示）
  if (motionQuery && motionQuery.addEventListener) {
    motionQuery.addEventListener('change', function (e) {
      root.classList.toggle('motion', !e.matches);
      if (e.matches) revealAll();
    });
  }

  /* ---------- ヘッダー：スクロール時の影と「掃除の進み具合」 ---------- */
  var header = document.querySelector('[data-header]');
  var progress = document.querySelector('[data-progress]');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      if (header) header.classList.toggle('is-scrolled', y > 8);
      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.setProperty('--progress', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      }
      updateTidy();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- スマートフォンのメニュー ---------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var nav = document.querySelector('[data-nav]');
  var mobileQuery = window.matchMedia('(max-width: 899px)');

  function setMenu(open, returnFocus) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-toggle__label').textContent = open ? '閉じる' : 'メニュー';
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('is-menu-open', open);
    if (open) {
      var first = nav.querySelector('a');
      if (first) first.focus();
    } else if (returnFocus) {
      toggle.focus();
    }
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false, true);
    });
    // メニューを開いている間は、Tabでメニューの外へ出ないようにする
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !nav.classList.contains('is-open')) return;
      var items = [toggle].concat(Array.prototype.slice.call(nav.querySelectorAll('a')));
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === nav.querySelector('a')) { e.preventDefault(); first.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    toggle.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && e.shiftKey && nav.classList.contains('is-open')) {
        e.preventDefault();
        var links = nav.querySelectorAll('a');
        links[links.length - 1].focus();
      }
    });
    var onBreakpoint = function (e) { if (!e.matches) setMenu(false); };
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onBreakpoint);
    else if (mobileQuery.addListener) mobileQuery.addListener(onBreakpoint);
  }

  /* ---------- 文章を「言葉のまとまり」に分ける（ほこりを払う演出用） ---------- */
  function splitIntoChunks(el) {
    var text = el.textContent.trim();
    var segments = [];
    if (window.Intl && Intl.Segmenter) {
      var seg = new Intl.Segmenter('ja', { granularity: 'word' });
      Array.from(seg.segment(text)).forEach(function (s) { segments.push(s.segment); });
    } else {
      // 分割できない環境では、句読点ごとに分ける
      segments = text.match(/[^、。！？]+[、。！？]?/g) || [text];
    }

    var chunks = [];
    var current = '';
    segments.forEach(function (part) {
      current += part;
      var endsWithPunct = /[、。！？」]$/.test(current);
      var isParticle = /^[ぁ-ん]{1,2}$/.test(part) && current.length >= 2;
      if (endsWithPunct || isParticle || current.length >= 7) {
        chunks.push(current);
        current = '';
      }
    });
    if (current) chunks.push(current);

    // 読み上げ用には元の文章を1つのまま残し、分割した方は装飾として隠す
    var visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    chunks.forEach(function (c, i) {
      var span = document.createElement('span');
      span.className = 'dust-chunk';
      span.style.setProperty('--i', i);
      span.textContent = c;
      visual.appendChild(span);
    });
    var sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = text;
    el.textContent = '';
    el.appendChild(sr);
    el.appendChild(visual);
  }

  /* ---------- スクロールで現れる ---------- */
  var revealTargets = [];

  function prepare() {
    document.querySelectorAll('[data-fold]').forEach(function (el) {
      el.querySelectorAll('.fold-line').forEach(function (line, i) { line.style.setProperty('--i', i); });
      revealTargets.push(el);
    });
    document.querySelectorAll('[data-dust]').forEach(function (el) {
      if (canMove()) splitIntoChunks(el);
      revealTargets.push(el);
    });
    document.querySelectorAll('.reveal').forEach(function (el) { revealTargets.push(el); });
    document.querySelectorAll('[data-shelf] > *').forEach(function (el) { revealTargets.push(el); });
    document.querySelectorAll('[data-wipe]').forEach(function (el) {
      Array.prototype.forEach.call(el.children, function (child, i) { child.style.setProperty('--i', i); });
      revealTargets.push(el);
    });
  }

  function revealAll() {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
    document.querySelectorAll('[data-pot]').forEach(function (el) { el.classList.add('is-cooked'); });
    document.querySelectorAll('[data-sweep]').forEach(function (el) { el.classList.add('is-swept'); });
    updateTidy(true);
  }

  function observe() {
    if (!canMove() || !('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    // 同じタイミングで画面に入った要素には、順番に少しずつ遅れをつける（棚に並べるように）
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (entry, i) {
        var el = entry.target;
        if (el.parentElement && el.parentElement.hasAttribute('data-shelf')) el.style.setProperty('--i', i);
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealTargets.forEach(function (el) { io.observe(el); });

    // 料理：単語が鍋に入る / 利用イメージ：「家事」を掃き出す（どちらも1回だけ）
    var once = function (selector, className, threshold) {
      var o = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(className);
          o.unobserve(entry.target);
        });
      }, { threshold: threshold });
      document.querySelectorAll(selector).forEach(function (el) { o.observe(el); });
    };
    once('[data-pot]', 'is-cooked', 0.4);
    once('[data-sweep]', 'is-swept', 0.8);
  }

  /* ---------- 散らかった家事の文字が、スクロールに合わせて整う ---------- */
  var tidyBoard = document.querySelector('[data-tidy]');

  function updateTidy(forceDone) {
    if (!tidyBoard) return;
    if (forceDone === true || !canMove()) {
      tidyBoard.style.setProperty('--mess', 0);
      tidyBoard.classList.add('is-tidy');
      return;
    }
    var rect = tidyBoard.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    // ボードの上端が画面の下寄り(90%)から中央寄り(35%)へ動く間に、散らかり→整列
    var p = (vh * 0.9 - rect.top) / (vh * 0.55);
    p = Math.max(0, Math.min(1, p));
    var eased = 1 - Math.pow(1 - p, 3);
    var mess = 1 - eased;
    tidyBoard.style.setProperty('--mess', mess.toFixed(3));
    tidyBoard.classList.toggle('is-tidy', mess < 0.12);
  }

  /* ---------- よくある質問（アコーディオン） ---------- */
  document.querySelectorAll('.faq-item__btn').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    var item = btn.closest('.faq-item');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      if (panel) panel.hidden = !open;
      if (item) item.classList.toggle('is-open', open);
    });
  });

  /* ---------- ご相談フォーム ----------
   * 送信先サーバーがまだ無いため、入力内容を本文に入れたメールを作成します。
   * フォーム送信サービスを使う場合は、この部分を差し替えてください。
   */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var status = form.querySelector('[data-form-status]');
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var setError = function (input, message) {
      var holder = form.querySelector('[data-error-for="' + input.id + '"]');
      if (holder) holder.textContent = message || '';
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    };

    var validate = function () {
      var firstInvalid = null;
      var name = form.elements.name;
      var email = form.elements.email;
      if (!name.value.trim()) { setError(name, 'お名前を入力してください。'); firstInvalid = firstInvalid || name; }
      else setError(name, '');
      if (!email.value.trim()) { setError(email, 'メールアドレスを入力してください。'); firstInvalid = firstInvalid || email; }
      else if (!emailPattern.test(email.value.trim())) { setError(email, 'メールアドレスの形式をご確認ください。'); firstInvalid = firstInvalid || email; }
      else setError(email, '');
      return firstInvalid;
    };

    ['name', 'email'].forEach(function (key) {
      form.elements[key].addEventListener('blur', function () {
        if (form.elements[key].hasAttribute('aria-invalid')) validate();
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'contact-form__status';
      var invalid = validate();
      if (invalid) {
        status.textContent = '入力内容をご確認ください。';
        status.classList.add('is-error');
        invalid.focus();
        return;
      }

      var chores = Array.prototype.slice.call(form.querySelectorAll('input[name="chores"]:checked'))
        .map(function (c) { return c.value; });
      var lines = [
        'お名前：' + form.elements.name.value.trim(),
        'メールアドレス：' + form.elements.email.value.trim(),
        '相談したい家事：' + (chores.length ? chores.join('、') : '未選択'),
        'お住まいの地域：' + (form.elements.area.value.trim() || '未記入'),
        '',
        'ご相談内容：',
        form.elements.message.value.trim() || '（未記入）'
      ];
      var to = form.getAttribute('data-mailto');
      var href = 'mailto:' + to +
        '?subject=' + encodeURIComponent('【きゃっほー】ご相談') +
        '&body=' + encodeURIComponent(lines.join('\n'));

      window.location.href = href;
      status.textContent = '入力内容を本文に入れて、メールアプリの送信画面を開きます。内容を確認して送信してください。メールアプリが開かない場合は、' + to + ' 宛に直接ご連絡ください。';
      status.classList.add('is-success');
    });
  }

  /* ---------- そのほか ---------- */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  prepare();
  observe();
  onScroll();
})();
