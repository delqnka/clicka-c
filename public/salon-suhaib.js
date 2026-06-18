(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const haptic = (ms = 8) => {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  };

  // Year
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // ── SCROLL + HERO PARALLAX + GRADIENT SHIFT ──────────────────
  const header      = $('#siteHeader');
  const toTopBtn    = $('#toTop');
  const heroBgImg   = $('.hero-bg img');
  const heroOverlay = $('.hero-overlay');

  let _gyroX = 0, _gyroY = 0, _rafPending = false;

  function applyHeroTransform() {
    const tx = _gyroX;
    const ty = _gyroY + window.scrollY * 0.22;
    heroBgImg.style.transform = `scale(1.1) translate(${tx}px, ${ty}px)`;
    _rafPending = false;
  }

  function scheduleHeroRaf() {
    if (_rafPending) return;
    _rafPending = true;
    requestAnimationFrame(applyHeroTransform);
  }

  window.addEventListener('scroll', () => {
    const sy = window.scrollY;

    // Header
    header.classList.toggle('scrolled', sy > 24);

    // To top button
    if (sy > 600) {
      toTopBtn.hidden = false;
      requestAnimationFrame(() => toTopBtn.classList.add('show'));
    } else {
      toTopBtn.classList.remove('show');
    }

    if (reducedMotion) return;

    // Hero image parallax
    if (heroBgImg && sy < window.innerHeight * 1.2) {
      scheduleHeroRaf();
    }

    // Gradient shift: gold warms up as you scroll, top darkening softens
    if (heroOverlay) {
      const p      = Math.min(1, sy / (window.innerHeight * 0.75));
      const goldA  = (0.08 + p * 0.18).toFixed(3); // 0.08 → 0.26
      const topA   = (0.72 - p * 0.22).toFixed(3); // 0.72 → 0.50
      heroOverlay.style.background = [
        `radial-gradient(70% 70% at 75% 15%, rgba(193,160,98,${goldA}), transparent 60%)`,
        `radial-gradient(60% 60% at 20% 80%, rgba(200,48,63,0.09), transparent 60%)`,
        `linear-gradient(180deg, rgba(8,8,7,${topA}) 0%, rgba(8,8,7,0.4) 35%, rgba(8,8,7,0.97) 100%)`,
      ].join(',');
    }
  }, { passive: true });

  // Fire once on load to set initial state
  window.dispatchEvent(new Event('scroll'));

  toTopBtn.addEventListener('click', () => {
    haptic(10);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── GYROSCOPE PARALLAX (mobile only) ─────────────────────────
  (function initGyro() {
    if (!heroBgImg || reducedMotion) return;
    if (!matchMedia('(pointer: coarse)').matches) return;

    let calibrated = false, baseBeta = 0, baseGamma = 0;

    function onOrientation(e) {
      if (!calibrated) {
        baseBeta  = e.beta  ?? 0;
        baseGamma = e.gamma ?? 0;
        calibrated = true;
        return;
      }
      _gyroX = clamp((e.gamma ?? 0) - baseGamma, -25, 25) / 25 * 18;
      _gyroY = clamp((e.beta  ?? 0) - baseBeta,  -25, 25) / 25 * 12;
      scheduleHeroRaf();
    }

    function startGyro() {
      window.addEventListener('deviceorientation', onOrientation, { passive: true });
    }

    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ — request permission on first touch of hero
      document.querySelector('.hero')?.addEventListener('touchstart', () => {
        DeviceOrientationEvent.requestPermission()
          .then(r => { if (r === 'granted') startGyro(); })
          .catch(() => {});
      }, { once: true, passive: true });
    } else if ('DeviceOrientationEvent' in window) {
      // Android / older iOS — no permission needed
      startGyro();
    }
  })();

  // ── REVEAL ON SCROLL ──────────────────────────────────────────
  const revealEls = $$('.reveal, .reveal-line, .reveal-left, .reveal-right');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // Stagger delays for grouped cards
  ['.about-points li', '.services-grid .service-card', '.styles-row .style-card', '.gallery-mosaic .g-item'].forEach(sel => {
    $$(sel).forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 75, 450)}ms`;
    });
  });

  // ── COUNTER ANIMATION (hero stats) ───────────────────────────
  (function initCounters() {
    if (reducedMotion) return;
    $$('.meta-item').forEach(item => {
      const numEl = item.querySelector('.meta-num');
      if (!numEl) return;

      // Find the raw text node (skip <small>)
      const textNode = Array.from(numEl.childNodes).find(n => n.nodeType === 3);
      if (!textNode) return;

      const raw       = textNode.textContent.trim();
      const isDecimal = raw.includes(',');
      const target    = parseFloat(raw.replace(',', '.'));
      if (isNaN(target)) return;

      let fired = false;
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting || fired) return;
          fired = true;
          io.disconnect();
          const t0       = performance.now();
          const duration = 1600;
          (function tick(now) {
            const t    = Math.min((now - t0) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
            const v    = target * ease;
            textNode.textContent = isDecimal
              ? v.toFixed(1).replace('.', ',')
              : Math.round(v).toString();
            if (t < 1) requestAnimationFrame(tick);
          })(performance.now());
        });
      }, { threshold: 0.6 });
      io.observe(item);
    });
  })();

  // ── MOBILE MENU ───────────────────────────────────────────────
  const menuToggle = $('#menuToggle');
  const drawer = $('#mobileDrawer');
  const toggleMenu = (open) => {
    const state = open ?? !menuToggle.classList.contains('open');
    menuToggle.classList.toggle('open', state);
    drawer.classList.toggle('open', state);
    drawer.setAttribute('aria-hidden', String(!state));
    menuToggle.setAttribute('aria-expanded', String(state));
    document.body.style.overflow = state ? 'hidden' : '';
    haptic(6);
  };
  menuToggle.addEventListener('click', () => toggleMenu());
  $('#drawerClose')?.addEventListener('click', () => toggleMenu(false));
  // Close on backdrop click (click outside panel)
  drawer.addEventListener('click', e => {
    if (!e.target.closest('.drawer-panel')) toggleMenu(false);
  });
  $$('#mobileDrawer nav a, #mobileDrawer .drawer-cta').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) toggleMenu(false);
  });

  // ── GALLERY SLIDER ────────────────────────────────────────────
  (function initGallerySlider() {
    const wrap    = $('#gallerySlider');
    const track   = $('#gsTrack');
    const dotsEl  = $('#gsDots');
    const prevBtn = $('#gsPrev');
    const nextBtn = $('#gsNext');
    if (!wrap || !track) return;

    const slides = Array.from(track.querySelectorAll('.gs-slide'));
    const total  = slides.length;
    let current  = 0;
    let autoTimer = null;

    // Stamp data attrs for the counter badge
    slides.forEach((s, i) => {
      s.dataset.num   = i + 1;
      s.dataset.total = total;
    });

    // Build dots
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'gs-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Снимка ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    });

    function slideWidth() {
      const s = slides[0];
      if (!s) return 0;
      const gap = 16;
      return s.getBoundingClientRect().width + gap;
    }

    function goTo(idx, animated = true) {
      current = ((idx % total) + total) % total;
      if (!animated) track.classList.add('dragging');
      track.style.transform = `translateX(${-current * slideWidth()}px)`;
      if (!animated) requestAnimationFrame(() => track.classList.remove('dragging'));

      slides.forEach((s, i) => s.classList.toggle('active', i === current));
      dotsEl.querySelectorAll('.gs-dot').forEach((d, i) => d.classList.toggle('active', i === current));

      haptic(5);
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    prevBtn.addEventListener('click', () => { resetAuto(); prev(); });
    nextBtn.addEventListener('click', () => { resetAuto(); next(); });

    // Touch / mouse drag
    let dragStart = null, dragX = 0, isDragging = false;

    function onDragStart(x) { dragStart = x; dragX = 0; isDragging = false; }
    function onDragMove(x) {
      if (dragStart === null) return;
      dragX = x - dragStart;
      isDragging = Math.abs(dragX) > 6;
      if (isDragging) {
        track.classList.add('dragging');
        track.style.transform = `translateX(${-current * slideWidth() + dragX}px)`;
      }
    }
    function onDragEnd() {
      if (dragStart === null) return;
      track.classList.remove('dragging');
      if (isDragging) {
        const threshold = slideWidth() * 0.25;
        if (dragX < -threshold) next();
        else if (dragX > threshold) prev();
        else goTo(current);
        resetAuto();
      }
      dragStart = null; dragX = 0; isDragging = false;
    }

    wrap.addEventListener('touchstart',  e => onDragStart(e.touches[0].clientX), { passive: true });
    wrap.addEventListener('touchmove',   e => onDragMove(e.touches[0].clientX),  { passive: true });
    wrap.addEventListener('touchend',    () => onDragEnd());
    wrap.addEventListener('mousedown',   e => { onDragStart(e.clientX); e.preventDefault(); });
    window.addEventListener('mousemove', e => { if (dragStart !== null) onDragMove(e.clientX); });
    window.addEventListener('mouseup',   () => onDragEnd());

    // Auto-play
    function startAuto() { autoTimer = setInterval(next, 4000); }
    function resetAuto()  { clearInterval(autoTimer); startAuto(); }
    wrap.addEventListener('mouseenter', () => clearInterval(autoTimer));
    wrap.addEventListener('mouseleave', startAuto);

    // Init
    goTo(0, false);
    startAuto();

    // Recalculate on resize
    window.addEventListener('resize', () => goTo(current, false), { passive: true });
  })();

  // ── REVIEWS CAROUSEL ──────────────────────────────────────────
  const track = $('#reviewsTrack');
  if (track) {
    const step = () => {
      const card = track.querySelector('.review-card');
      if (!card) return 320;
      const style = window.getComputedStyle(track);
      const gap = parseInt(style.columnGap || style.gap || '20', 10);
      return card.getBoundingClientRect().width + gap;
    };
    $('#revPrev').addEventListener('click', () => {
      haptic(8);
      track.scrollBy({ left: -step(), behavior: 'smooth' });
    });
    $('#revNext').addEventListener('click', () => {
      haptic(8);
      track.scrollBy({ left: step(), behavior: 'smooth' });
    });
  }

  // ── BOOKING FORM ──────────────────────────────────────────────
  const form = $('#bookForm');
  if (form) {
    const dateInput = $('#bdate');
    if (dateInput) {
      dateInput.min = new Date().toISOString().split('T')[0];
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        haptic([20, 40, 20]);
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) firstInvalid.focus();
        form.reportValidity();
        return;
      }
      const btn      = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.disabled   = true;
      btn.innerHTML  = '<span>Изпращане</span>';
      setTimeout(() => {
        const success = $('#formSuccess');
        success.hidden = false;
        form.reset();
        btn.disabled  = false;
        btn.innerHTML = original;
        haptic([10, 30, 60]);
        success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => { success.hidden = true; }, 6500);
      }, 900);
    });
  }

  // ── HAPTIC ON TAPS ────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.btn, .service-book, .rev-btn, .socials a, .g-item, .nav-link');
    if (el) haptic(6);
  });

  // ── ACTIVE NAV LINK ───────────────────────────────────────────
  const navLinks = $$('.primary-nav a');
  const sections = navLinks
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (sections.length) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          const id = '#' + en.target.id;
          navLinks.forEach(a => {
            a.style.color = a.getAttribute('href') === id ? 'var(--text)' : '';
          });
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    sections.forEach(s => so.observe(s));
  }

})();
