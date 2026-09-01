/* Benchhaus v2 — motion runtime */
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header state */
  const header = document.querySelector('.site-header');
  const onScrollHeader = () => header.classList.toggle('scrolled', window.scrollY > 40);
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* Mobile nav */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  /* Reveal observer.
     Clipped elements (.wipe / .wipe-l start at zero visible area, so an
     IntersectionObserver watching them directly never fires) are revealed
     by observing an unclipped proxy — their parent — and mapping back. */
  const proxyMap = new WeakMap();
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      /* The proxy may itself be a reveal target (e.g. figure.rv wrapping a
         .wipe frame) — reveal it too, not just its mapped children. */
      const mapped = proxyMap.get(e.target);
      const targets = mapped ? [e.target].concat(mapped) : [e.target];
      targets.forEach(t => t.classList.add('in'));
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

  document.querySelectorAll('.rv, .mask-line, .donts-list li, .manifesto p.big').forEach(el => io.observe(el));
  document.querySelectorAll('.wipe, .wipe-l').forEach(el => {
    const proxy = el.parentElement || el;
    if (!proxyMap.has(proxy)) proxyMap.set(proxy, []);
    proxyMap.get(proxy).push(el);
    io.observe(proxy);
  });

  if (reduced) return;

  /* Parallax */
  const plxEls = Array.from(document.querySelectorAll('.plx'));
  let ticking = false;
  function plx() {
    const vh = window.innerHeight;
    plxEls.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const p = (r.top + r.height / 2 - vh / 2) / (vh / 2); /* -1..1 */
      el.style.setProperty('--plx', (p * -4.5) + '%');
      el.style.transform = 'translateY(' + (p * -4.5) + '%) scale(1.12)';
    });
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(plx); ticking = true; }
  }, { passive: true });
  plx();

  /* Steps stitched line — draws with scroll progress through the section */
  const stepsEl = document.querySelector('.steps');
  const linePath = document.querySelector('.steps-line path');
  if (stepsEl && linePath) {
    const len = linePath.getTotalLength();
    linePath.style.strokeDasharray = String(len);
    linePath.style.strokeDashoffset = String(len);
    let lt = false;
    const drawLine = () => {
      const r = stepsEl.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height - vh * 0.4;
      const gone = Math.min(Math.max(vh * 0.6 - r.top, 0), total);
      const t = total > 0 ? gone / total : 1;
      linePath.style.strokeDashoffset = String(len * (1 - t));
      lt = false;
    };
    window.addEventListener('scroll', () => {
      if (!lt) { requestAnimationFrame(drawLine); lt = true; }
    }, { passive: true });
    drawLine();
  }

  /* Lazy videos: play only in view.
     Observe an unclipped ancestor — the video itself may sit inside a
     clip-path'd frame and would never register as intersecting. */
  const vidMap = new WeakMap();
  const vio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const v = vidMap.get(e.target);
      if (!v) return;
      if (e.isIntersecting) { v.play().catch(() => {}); }
      else { v.pause(); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('video[data-autoplay]').forEach(v => {
    const proxy = v.closest('.step-media') || v.closest('.haus-grid') || v.closest('.hero-media') || v.parentElement || v;
    vidMap.set(proxy, v);
    vio.observe(proxy);
  });
})();
