/**
 * Beauty Produce テーマのフロント側スクリプト。
 * ヘッダーの背景切り替え、モバイルメニュー、スクロール表示、
 * ヒーローのパララックス、FAQアコーディオン、比較スライダーを担当します。
 */
(function () {
	'use strict';

	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ---------- ヘッダー ---------- */
	function initHeader() {
		var header = document.getElementById('bp-header');
		if (!header) return;

		function onScroll() {
			header.classList.toggle('is-scrolled', window.scrollY > 60);
		}

		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
	}

	/* ---------- モバイルメニュー ---------- */
	function initMobileMenu() {
		var burger = document.getElementById('bp-burger');
		var menu = document.getElementById('bp-mobile-menu');
		if (!burger || !menu) return;

		function setOpen(open) {
			burger.setAttribute('aria-expanded', open ? 'true' : 'false');
			menu.classList.toggle('is-open', open);
			menu.setAttribute('aria-hidden', open ? 'false' : 'true');
			document.body.classList.toggle('bp-menu-open', open);
		}

		burger.addEventListener('click', function () {
			setOpen(burger.getAttribute('aria-expanded') !== 'true');
		});

		menu.addEventListener('click', function (event) {
			if (event.target.closest('a')) setOpen(false);
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape') setOpen(false);
		});
	}

	/* ---------- スクロール表示 ---------- */
	function initReveal() {
		var targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
		if (!targets.length) return;

		if (reduceMotion || !('IntersectionObserver' in window)) {
			Array.prototype.forEach.call(targets, function (el) {
				el.classList.add('revealed');
			});
			return;
		}

		var observer = new IntersectionObserver(
			function (entries) {
				entries.forEach(function (entry) {
					if (entry.isIntersecting) {
						entry.target.classList.add('revealed');
						observer.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
		);

		Array.prototype.forEach.call(targets, function (el) {
			observer.observe(el);
		});
	}

	/* ---------- ヒーローのパララックス ---------- */
	function initParallax() {
		var layers = document.querySelectorAll('[data-bp-parallax]');
		if (!layers.length || reduceMotion) return;

		var ticking = false;

		function update() {
			ticking = false;
			Array.prototype.forEach.call(layers, function (layer) {
				var section = layer.parentElement;
				if (!section) return;

				var rect = section.getBoundingClientRect();
				if (rect.bottom < 0 || rect.top > window.innerHeight) return;

				var progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
				layer.style.transform = 'translate3d(0, ' + progress * 20 + '%, 0)';
			});
		}

		function onScroll() {
			if (!ticking) {
				ticking = true;
				window.requestAnimationFrame(update);
			}
		}

		update();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
	}

	/* ---------- FAQ ---------- */
	function initFaq() {
		var items = document.querySelectorAll('[data-bp-faq]');

		Array.prototype.forEach.call(items, function (item) {
			var button = item.querySelector('.faq-item__button');
			if (!button) return;

			button.addEventListener('click', function () {
				var willOpen = !item.classList.contains('is-open');

				Array.prototype.forEach.call(items, function (other) {
					other.classList.remove('is-open');
					var otherButton = other.querySelector('.faq-item__button');
					if (otherButton) otherButton.setAttribute('aria-expanded', 'false');
				});

				item.classList.toggle('is-open', willOpen);
				button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
			});
		});
	}

	/* ---------- ビフォーアフター ---------- */
	function initBeforeAfter() {
		var containers = document.querySelectorAll('[data-bp-before-after]');

		Array.prototype.forEach.call(containers, function (container) {
			var clip = container.querySelector('[data-bp-clip]');
			var handle = container.querySelector('[data-bp-handle]');
			var button = handle ? handle.querySelector('button') : null;
			if (!clip || !handle) return;

			var dragging = false;

			function setPosition(value) {
				var pos = Math.min(95, Math.max(5, value));
				clip.style.clipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
				clip.style.webkitClipPath = 'inset(0 ' + (100 - pos) + '% 0 0)';
				handle.style.left = pos + '%';
				if (button) button.setAttribute('aria-valuenow', Math.round(pos));
			}

			function positionFromEvent(event) {
				var clientX = event.touches && event.touches.length ? event.touches[0].clientX : event.clientX;
				var rect = container.getBoundingClientRect();
				setPosition(((clientX - rect.left) / rect.width) * 100);
			}

			container.addEventListener('mousedown', function (event) {
				dragging = true;
				positionFromEvent(event);
			});
			container.addEventListener('touchstart', function (event) {
				dragging = true;
				positionFromEvent(event);
			}, { passive: true });
			container.addEventListener('mouseleave', function () { dragging = false; });

			window.addEventListener('mousemove', function (event) {
				if (dragging) positionFromEvent(event);
			});
			window.addEventListener('touchmove', function (event) {
				if (dragging) positionFromEvent(event);
			}, { passive: true });
			window.addEventListener('mouseup', function () { dragging = false; });
			window.addEventListener('touchend', function () { dragging = false; });

			if (button) {
				button.addEventListener('keydown', function (event) {
					var current = parseFloat(button.getAttribute('aria-valuenow')) || 50;
					if (event.key === 'ArrowLeft') {
						setPosition(current - 5);
						event.preventDefault();
					}
					if (event.key === 'ArrowRight') {
						setPosition(current + 5);
						event.preventDefault();
					}
				});
			}

			setPosition(50);
		});
	}

	/* ---------- ページ内リンクのスムーススクロール ---------- */
	function initSmoothAnchors() {
		document.addEventListener('click', function (event) {
			var link = event.target.closest('a[href*="#"]');
			if (!link) return;

			var url = new URL(link.href, window.location.href);
			if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
			if (!url.hash || url.hash === '#') return;

			var target = document.querySelector(url.hash);
			if (!target) return;

			event.preventDefault();
			target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
			history.pushState(null, '', url.hash);
		});
	}

	function init() {
		initHeader();
		initMobileMenu();
		initReveal();
		initParallax();
		initFaq();
		initBeforeAfter();
		initSmoothAnchors();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
