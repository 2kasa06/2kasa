/* きゃっほー  ページの操作と動き
 * 依存ライブラリなし。JSが動かなくても、すべての文章はHTMLに最初から書いてあります。
 * スクロールの監視は IntersectionObserver だけを使います（scroll イベントは使わない）。
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var canMove = function () { return root.classList.contains('motion'); };

  /* ---------- ヘッダー：ページ上端を離れたら下線を出す ---------- */
  var header = document.querySelector('[data-header]');
  var hero = document.getElementById('top');
  if (header && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
  }

  /* ---------- スマートフォンのメニュー ---------- */
  var menuBtn = document.querySelector('[data-menu]');
  var nav = document.querySelector('[data-nav]');
  var menuLabel = document.querySelector('[data-menu-label]');
  var mobile = window.matchMedia('(max-width: 899px)');

  function setMenu(open, focusBack) {
    if (!menuBtn || !nav) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    if (menuLabel) menuLabel.textContent = open ? '閉じる' : 'メニュー';
    var icon = menuBtn.querySelector('i');
    if (icon) icon.className = open ? 'ph ph-x' : 'ph ph-list';
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('is-menu-open', open);
    if (open) {
      var first = nav.querySelector('a');
      if (first) first.focus();
    } else if (focusBack) {
      menuBtn.focus();
    }
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false, true);
    });
    var onChange = function (e) { if (!e.matches) setMenu(false); };
    if (mobile.addEventListener) mobile.addEventListener('change', onChange);
  }

  /* ---------- 1回で3日分：プランで1週間の埋まり方を切り替える ---------- */
  // 例として、週1回は月曜、週2回は月曜と木曜に作業する場合を表示する
  var PLANS = {
    '1': { cook: [0], covered: [0, 1, 2], summary: '週に3日分、月に12日分の夕食がそろいます。' },
    '2': { cook: [0, 3], covered: [0, 1, 2, 3, 4, 5], summary: '週に6日分、月に24日分の夕食がそろいます。' }
  };
  var segs = document.querySelectorAll('[data-plan]');
  var days = document.querySelectorAll('[data-week] [data-day]');
  var summary = document.querySelector('[data-week-summary]');

  function showPlan(key) {
    var plan = PLANS[key];
    if (!plan) return;
    segs.forEach(function (s) { s.setAttribute('aria-pressed', String(s.getAttribute('data-plan') === key)); });
    days.forEach(function (d) {
      var i = Number(d.getAttribute('data-day'));
      var cook = plan.cook.indexOf(i) !== -1;
      var covered = plan.covered.indexOf(i) !== -1;
      d.classList.toggle('is-cook', cook);
      d.classList.toggle('is-covered', covered);
      d.querySelector('.day__state').textContent = cook ? 'つくる日' : covered ? '作り置き' : 'いつも通り';
    });
    if (summary) summary.textContent = plan.summary;
  }
  segs.forEach(function (s) {
    s.addEventListener('click', function () { showPlan(s.getAttribute('data-plan')); });
  });

  /* ---------- スクロールで現れる（見出しとまとまりだけ） ---------- */
  var groups = [
    '.h2:not(.hero__title)', '.lead', '.rhythm__switch', '.week', '.plan', '.trial',
    '.bento > *', '.split__media', '.promises li', '.step', '.qa', '.form'
  ];
  var targets = [];
  groups.forEach(function (sel) {
    document.querySelectorAll('main ' + sel).forEach(function (el) {
      if (el.closest('.hero')) return;
      el.setAttribute('data-reveal', '');
      targets.push(el);
    });
  });
  var strike = document.querySelectorAll('[data-strike]');

  if (canMove() && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (entry, i) {
        entry.target.style.setProperty('--i', i);
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    targets.forEach(function (el) { io.observe(el); });
    strike.forEach(function (el) { io.observe(el); });
  } else {
    targets.concat(Array.prototype.slice.call(strike)).forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- ご相談フォーム ----------
   * 送信先サーバーがまだ無いため、入力内容を本文に入れたメールを作成します。
   */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var status = form.querySelector('[data-form-status]');
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var setError = function (input, msg) {
      var holder = form.querySelector('[data-error-for="' + input.id + '"]');
      if (holder) holder.textContent = msg || '';
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    };
    var validate = function () {
      var first = null;
      var name = form.elements.name, email = form.elements.email;
      if (!name.value.trim()) { setError(name, 'お名前を入力してください。'); first = first || name; } else setError(name, '');
      if (!email.value.trim()) { setError(email, 'メールアドレスを入力してください。'); first = first || email; }
      else if (!emailOk.test(email.value.trim())) { setError(email, 'メールアドレスの形式を確認してください（例：name@example.com）。'); first = first || email; }
      else setError(email, '');
      return first;
    };
    ['name', 'email'].forEach(function (k) {
      form.elements[k].addEventListener('input', function () {
        if (form.elements[k].hasAttribute('aria-invalid')) validate();
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form__status';
      var bad = validate();
      if (bad) {
        status.textContent = '入力内容を確認してください。';
        status.classList.add('is-error');
        bad.focus();
        return;
      }
      var plan = form.querySelector('input[name="plan"]:checked');
      var body = [
        'お名前：' + form.elements.name.value.trim(),
        'メールアドレス：' + form.elements.email.value.trim(),
        '気になるプラン：' + (plan ? plan.value : '未選択'),
        'お住まいの地域：' + (form.elements.area.value.trim() || '未記入'),
        '',
        '人数・好み・気になること：',
        form.elements.message.value.trim() || '（未記入）'
      ].join('\n');
      var to = form.getAttribute('data-mailto');
      window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent('【きゃっほー】ご相談') + '&body=' + encodeURIComponent(body);
      status.textContent = 'メールアプリで送信画面を開きます。内容を確認して送ってください。開かない場合は ' + to + ' 宛にご連絡ください。';
    });
  }

  /* ---------- 外部画像が読めないときは色面だけを残す ---------- */
  document.querySelectorAll('main img').forEach(function (img) {
    var mark = function () { img.classList.add('is-broken'); };
    if (img.complete && img.naturalWidth === 0) mark();
    else img.addEventListener('error', mark);
  });

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
