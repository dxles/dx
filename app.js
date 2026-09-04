
/* dxles.eu — vanilla JS, no build step.*/
const CONFIG = {
  isMobile: matchMedia('(max-width: 800px)').matches,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  fine: matchMedia('(pointer: fine)').matches,
};

const DOM = {
  loader: document.getElementById('loader'),
  loaderBar: document.querySelector('.loader-bar-fill'),
  nav: document.getElementById('nav'),
  cursorRing: document.querySelector('.cursor-ring'),
  cursorDot: document.querySelector('.cursor-dot'),
  progressFill: document.querySelector('.progress-fill'),
  progressIdx: document.querySelectorAll('.progress-index'),
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function initLoader() {
  if (!DOM.loader) return;
  if (CONFIG.reduced || !window.gsap) { DOM.loader.style.display = 'none'; return; }
  gsap.timeline({ defaults: { ease: 'power4.inOut' } })
    .to(DOM.loaderBar, { width: '100%', duration: 1.0 })
    .to(DOM.loader, { yPercent: -100, duration: 0.85 }, '-=0.1')
    .set(DOM.loader, { display: 'none' });
}

function initCursor() {
  if (!CONFIG.fine || CONFIG.reduced || !DOM.cursorRing) return;
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;

  addEventListener('mousemove', (e) => {
    x = e.clientX; y = e.clientY;
    DOM.cursorDot.style.transform = `translate3d(${x}px,${y}px,0)`;
  });

  (function loop() {
    rx += (x - rx) * 0.16;
    ry += (y - ry) * 0.16;
    DOM.cursorRing.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    requestAnimationFrame(loop);
  })();

  document.querySelectorAll('a, button, .project, .lab-item').forEach((el) => {
    el.addEventListener('mouseenter', () => DOM.cursorRing.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => DOM.cursorRing.classList.remove('is-hover'));
  });
}

let lenis = null;
function initSmoothScroll() {
  if (CONFIG.reduced || CONFIG.isMobile || !window.Lenis) return null;
  lenis = new Lenis({

    duration: 0.9,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.05,
    touchMultiplier: 1,
    infinite: false,
  });
  if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
  const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  return lenis;
}

function initNavSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initMagneticElements() {
  if (!CONFIG.fine || CONFIG.reduced || !window.gsap) return;
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = clamp((e.clientX - r.left - r.width / 2) * 0.3, -10, 10);
      const my = clamp((e.clientY - r.top - r.height / 2) * 0.3, -10, 10);
      gsap.to(el, { x: mx, y: my, duration: 0.4, ease: 'power3.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
    });
  });
}

function initScrollChoreography() {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  ScrollTrigger.create({
    start: 'top -80', end: 99999,
    onUpdate: (self) => DOM.nav && DOM.nav.classList.toggle('is-scrolled', self.scroll() > 80),
  });
  if (DOM.progressFill) {
    gsap.to(DOM.progressFill, {
      height: '100%', ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
    });
  }
  const railTriggers = { work: 'work-spacer', systems: 'systems-spacer', about: 'about-spacer', lab: 'lab', contact: 'contact' };
  ['work', 'systems', 'about', 'lab', 'contact'].forEach((id, i) => {
    const el = document.getElementById(railTriggers[id]);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el, start: 'top center', end: 'bottom center',
      onEnter: () => setActiveIndex(i), onEnterBack: () => setActiveIndex(i),
    });
  });

  function createScrubStage(stageId, spacerId, build) {
    const stage = document.getElementById(stageId);
    const spacer = document.getElementById(spacerId);
    if (!stage || !spacer) return;

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: spacer,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.4, 
        invalidateOnRefresh: true,
        onLeave: () => gsap.set(stage, { autoAlpha: 0 }),
        onEnterBack: () => gsap.set(stage, { autoAlpha: 1 }),
      },
    });
    build(tl, stage);
  }

  createScrubStage('hero', 'hero-spacer', (tl) => {
    const heroName = document.getElementById('hero-name');
    if (!heroName) return;

    gsap.set(heroName, { scale: 1, yPercent: 0 });
    const naturalWidth = heroName.getBoundingClientRect().width || 1;
    const fitScale = (innerWidth * 0.92) / naturalWidth;
    const maxScale = CONFIG.isMobile ? 3.6 : 6;
    const entryScale = Math.min(fitScale, maxScale);

    gsap.set(heroName, { scale: entryScale, yPercent: 10 });
    gsap.set('.hero-top, .hero-bottom', { opacity: 0, y: 18 });
    gsap.set('#hero', { autoAlpha: 1 });

    tl.to(heroName, { scale: 1, yPercent: 0, duration: 0.35 }, 0)
      .to('.hero-top, .hero-bottom', { opacity: 1, y: 0, duration: 0.15 }, 0.15)
      .to('#hero', { autoAlpha: 1, duration: 0.35 }, 0.35)
      .to('#hero', { autoAlpha: 0, duration: 0.2 }, 0.8);
  });

  createScrubStage('work', 'work-spacer', (tl) => {
    const projects = gsap.utils.toArray('.project');
    if (!projects.length) return;
    gsap.set('#work', { autoAlpha: 0 });
    gsap.set(projects, { x: () => -innerWidth * 0.35, opacity: 0, filter: 'blur(0px)' });
    gsap.set('#work .section-head', { opacity: 0, y: 24 });

    tl.to('#work', { autoAlpha: 1, duration: 0.08 }, 0)
      .to('#work .section-head', { opacity: 1, y: 0, duration: 0.06 }, 0.02);

    const revealStart = 0.1, revealEnd = 0.85;
    const span = (revealEnd - revealStart) / projects.length;
    projects.forEach((item, i) => {
      const t0 = revealStart + i * span;
      tl.to(item, { x: 0, opacity: 1, duration: span * 0.7 }, t0);
      if (i > 0) {
        tl.to(projects[i - 1], { filter: 'blur(6px)', opacity: 0.35, duration: span * 0.7 }, t0);
      }
    });

    tl.to(projects, { filter: 'blur(0px)', opacity: 1, duration: 0.08 }, revealEnd)
      .to('#work', { autoAlpha: 0, duration: 0.12 }, 0.88);
  });

  createScrubStage('systems', 'systems-spacer', (tl) => {
    const cols = gsap.utils.toArray('.systems-col');
    if (!cols.length) return;
    gsap.set('#systems', { autoAlpha: 0 });
    gsap.set(cols, { filter: 'blur(14px)', opacity: 0.18 });
    gsap.set('#systems .section-head', { opacity: 0, y: 24 });

    tl.to('#systems', { autoAlpha: 1, duration: 0.08 }, 0)
      .to('#systems .section-head', { opacity: 1, y: 0, duration: 0.06 }, 0.02);

    const revealStart = 0.1, revealEnd = 0.85;
    const span = (revealEnd - revealStart) / cols.length;
    cols.forEach((col, i) => {
      const t0 = revealStart + i * span;
      tl.to(col, { filter: 'blur(0px)', opacity: 1, duration: span * 0.8 }, t0);
    });
    tl.to(cols, { filter: 'blur(0px)', opacity: 1, duration: 0.08 }, revealEnd)
      .to('#systems', { autoAlpha: 0, duration: 0.12 }, 0.88);
  });

  createScrubStage('about', 'about-spacer', (tl) => {
    const blocks = gsap.utils.toArray('.about-block');
    if (!blocks.length) return;
    gsap.set('#about', { autoAlpha: 0 });
    gsap.set(blocks, { opacity: 0, y: 42 });
    gsap.set('#about .section-head', { opacity: 0, y: 24 });

    tl.to('#about', { autoAlpha: 1, duration: 0.08 }, 0)
      .to('#about .section-head', { opacity: 1, y: 0, duration: 0.06 }, 0.02);

    const revealStart = 0.1, revealEnd = 0.42;
    const span = (revealEnd - revealStart) / blocks.length;
    blocks.forEach((b, i) => {
      const t0 = revealStart + i * span;
      tl.to(b, { opacity: 1, y: 0, duration: span * 0.8 }, t0);
    });

    tl.to('#about', { autoAlpha: 0, duration: 0.15 }, 0.5);
  });

  gsap.set('.lab-line', { scaleX: 0 });
  gsap.to('.lab-line', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: '.lab-line', start: 'top 85%', end: 'top 55%', scrub: 0.5 },
  });

  const labItems = gsap.utils.toArray('.lab-item');
  labItems.forEach((item, i) => {
    const fromLeft = i % 2 === 0;
    gsap.fromTo(item,
      { x: fromLeft ? -70 : 70, rotate: fromLeft ? -1.5 : 1.5, opacity: 0.15, filter: 'blur(8px)' },
      {
        x: 0, rotate: 0, opacity: 1, filter: 'blur(0px)', ease: 'none',
        scrollTrigger: { trigger: item, start: 'top 85%', end: 'top 55%', scrub: 0.5 },
      });
  });

  gsap.to('.contact-glow', {
    opacity: 1, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '#contact', start: 'top bottom', end: 'top 25%', scrub: 0.6 },
  });
  gsap.fromTo('.contact-num',
    { opacity: 0, y: 60 },
    {
      opacity: 1, y: -40, ease: 'none',
      scrollTrigger: { trigger: '#contact', start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
  gsap.fromTo('.contact-title',
    { opacity: 0, y: 50, rotate: 1.2 },
    {
      opacity: 1, y: 0, rotate: 0, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: '#contact', start: 'top 78%', toggleActions: 'play none none reverse' },
    });
  gsap.fromTo('.contact-email',
    { opacity: 0, y: 30 },
    {
      opacity: 1, y: 0, duration: 0.9, delay: 0.15, ease: 'power3.out',
      scrollTrigger: { trigger: '#contact', start: 'top 78%', toggleActions: 'play none none reverse' },
    });
  gsap.fromTo('.contact-links a',
    { opacity: 0, y: 26 },
    {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out',
      scrollTrigger: { trigger: '.contact-links', start: 'top 92%', toggleActions: 'play none none reverse' },
    });

  requestAnimationFrame(() => ScrollTrigger.refresh());
}

function setActiveIndex(i) {
  DOM.progressIdx.forEach((el) => el.classList.toggle('is-active', Number(el.dataset.index) === i));
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function boot() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  try {
    if (!window.gsap) await loadScript('vendor/gsap.min.js');
    if (!window.ScrollTrigger) await loadScript('vendor/ScrollTrigger.min.js');
    if (!window.Lenis) await loadScript('vendor/lenis.min.js');
  } catch (err) {
    console.warn('[dxles] GSAP/Lenis unavailable — serving static, fully readable page.', err);
  }
  initLoader();
  initCursor();
  initSmoothScroll();
  initNavSmoothScroll();
  initMagneticElements();

  const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  const windowLoaded = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve) => addEventListener('load', resolve, { once: true }));
  await Promise.all([fontsReady, windowLoaded]);

  initScrollChoreography();
}

boot();

addEventListener('pageshow', (e) => {
  if (e.persisted) {
    window.scrollTo(0, 0);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
});

addEventListener('resize', debounce(() => {
  CONFIG.isMobile = matchMedia('(max-width: 800px)').matches;
}, 150));
