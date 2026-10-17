/**
 * Home-page hero: the name "nuances." is a window onto the paintings. Each work
 * in SITE_CONFIG.heroSlides slowly scans through the letters, then dissolves
 * into the next. The pointer nudges the scan; a click (or the Next button)
 * moves on. Geometry and timing live in hero-window-utils.js.
 *
 * Works without scripts or canvas: the markup keeps an accessible <h1> and a
 * static fallback (see .hero__fallback in the stylesheet).
 */
(function () {
  'use strict';

  const hero = document.querySelector('[data-hero]');
  const Geometry = window.HeroWindowUtils;
  const Works = window.WorksUtils;
  if (!hero || !Geometry || !Works) return;

  const SLIDE_SECONDS = 4.6;
  const FADE_SECONDS = 1.5;
  const PREFETCH_AHEAD = 2;
  const MAX_DPR = 2;
  const BY_LINE_SHARE = 0.3; // script size relative to the name
  const FIRST_PICTURE_FADE_S = 0.9;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = hero.querySelector('[data-hero-canvas]');
  const stage = hero.querySelector('[data-hero-stage]');
  const countLabel = hero.querySelector('[data-hero-count]');
  const titleLink = hero.querySelector('[data-hero-title]');
  const nextButton = hero.querySelector('[data-hero-next]');
  const context = canvas.getContext('2d');
  const artLayer = document.createElement('canvas'); // the picture, before the letters are cut out of it
  const artContext = artLayer.getContext('2d');
  const maskLayer = document.createElement('canvas'); // the letters, drawn once per layout
  const maskContext = maskLayer.getContext('2d');

  /** The configured works, each with its picture once loaded. */
  function loadSlides() {
    const all = window.PORTFOLIO_WORKS.concat(window.PORTFOLIO_PHOTOS || []);
    const byId = new Map(all.map((work) => [work.id, work]));
    const ids = (window.SITE_CONFIG && window.SITE_CONFIG.heroSlides) || [];
    return ids.map((id) => byId.get(id)).filter(Boolean).map((work) => ({ work, image: null, status: 'idle', readyAt: 0 }));
  }

  const slides = loadSlides();
  if (slides.length === 0) throw new Error('hero-window: SITE_CONFIG.heroSlides lists no known works.');

  const state = {
    dpr: 1,
    layout: null,
    palette: { ink: '#000', accent: '#0071e3', dark: false },
    slideTime: 0, // seconds on the slideshow clock
    manualIndex: 0, // used instead of the clock when motion is reduced
    shownIndex: -1,
    entranceStartedAt: null,
    visible: true,
    pointer: { x: 0.5, y: 0.5, smoothX: 0.5, smoothY: 0.5 },
  };

  /* ---- colours: tokens use light-dark(), so let the browser resolve them ---- */
  const probe = document.createElement('span');
  probe.hidden = true;
  hero.append(probe);

  function resolveColor(token) {
    probe.style.color = `var(${token})`;
    return getComputedStyle(probe).color;
  }

  function refreshPalette() {
    probe.hidden = false;
    const ink = resolveColor('--ink');
    const [red, green, blue] = ink.match(/[\d.]+/g).map(Number);
    // Light ink means the dark theme.
    state.palette = { ink, accent: resolveColor('--accent'), dark: (red + green + blue) / 3 > 128 };
    probe.hidden = true;
  }

  /* ---- pictures ---- */
  function sizeSuffixFor(slide) {
    const widths = slide.work.ws;
    const wanted = state.layout ? state.layout.fit.box.w * state.dpr * 0.75 : 1200;
    return Works.SIZE_SUFFIXES[Geometry.pickSizeIndex(widths, wanted)];
  }

  function ensureLoaded(index) {
    const slide = slides[index % slides.length];
    if (slide.status !== 'idle') return;
    slide.status = 'loading';
    const image = new Image();
    image.src = Works.imageUrl(slide.work, sizeSuffixFor(slide));
    image.decode().catch(() => {}).then(() => {
      slide.image = image.naturalWidth > 0 ? image : null;
      slide.status = slide.image ? 'ready' : 'failed';
      slide.readyAt = performance.now();
    });
  }

  function prefetchAround(index) {
    for (let step = 0; step <= PREFETCH_AHEAD; step += 1) ensureLoaded(index + step);
  }

  /* ---- layout ---- */
  const nameFont = (size) => `500 ${size}px "Bodoni Moda", serif`;
  const nameSpacing = (size) => `${-size * 0.035}px`;

  function measureAt100(text) {
    context.font = nameFont(100);
    context.letterSpacing = nameSpacing(100);
    return context.measureText(text).width;
  }

  function computeLayout() {
    const heroBox = hero.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    const header = document.querySelector('.site-header');
    const gutter = parseFloat(getComputedStyle(hero).paddingLeft) || 16;
    const top = Math.max(stageBox.top, header ? header.getBoundingClientRect().bottom : 0) - heroBox.top;
    const region = { x: gutter, y: top, w: heroBox.width - gutter * 2, h: stageBox.bottom - heroBox.top - top };
    const lines = Geometry.splitName(heroBox.width / heroBox.height < 0.8);

    // Fit once, then again with room reserved for the by-line that hangs below the name.
    let fit = Geometry.fitLines({ lines, dot: '.', measure: measureAt100, region });
    fit = Geometry.fitLines({
      lines,
      dot: '.',
      measure: measureAt100,
      region: { ...region, h: region.h - fit.fontSize * (BY_LINE_SHARE + 0.05) },
    });

    state.dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    canvas.width = Math.round(heroBox.width * state.dpr);
    canvas.height = Math.round(heroBox.height * state.dpr);
    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    const pad = Math.ceil(fit.fontSize * 0.1);
    artLayer.width = Math.ceil((fit.box.w + pad * 2) * state.dpr);
    artLayer.height = Math.ceil((fit.box.h + pad * 2) * state.dpr);
    artContext.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    maskLayer.width = artLayer.width;
    maskLayer.height = artLayer.height;
    maskContext.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    drawLetterMask(fit, pad);

    state.layout = { fit, pad, width: heroBox.width, height: heroBox.height };
  }

  /** The letters in black on a transparent layer; pictures are cut to this shape. */
  function drawLetterMask(fit, pad) {
    maskContext.font = nameFont(fit.fontSize);
    maskContext.letterSpacing = nameSpacing(fit.fontSize);
    maskContext.fillStyle = '#000';
    fit.lines.forEach((line) =>
      maskContext.fillText(line.text, line.x - fit.box.x + pad, line.baseline - fit.box.y + pad)
    );
  }

  /* ---- drawing ---- */
  /** Covers the box with a picture; panX / panY (-1..1) slide it within its overflow. */
  function drawCover(target, image, box, panX, panY, alpha) {
    const scale = Math.max(box.w / image.width, box.h / image.height) * 1.05;
    const width = image.width * scale;
    const height = image.height * scale;
    target.globalAlpha = alpha;
    target.drawImage(
      image,
      box.x + (box.w - width) / 2 + (panX * (width - box.w)) / 2,
      box.y + (box.h - height) / 2 + (panY * (height - box.h)) / 2,
      width,
      height
    );
    target.globalAlpha = 1;
  }

  function currentSlideState() {
    if (reduceMotion) {
      return { index: state.manualIndex % slides.length, nextIndex: 0, drift: 0, fade: 0 };
    }
    return Geometry.slideAt(state.slideTime, { slideSeconds: SLIDE_SECONDS, fadeSeconds: FADE_SECONDS, count: slides.length });
  }

  function paintArtLayer(show, now) {
    const { fit, pad } = state.layout;
    const local = { x: pad, y: pad, w: fit.box.w, h: fit.box.h };
    const pointer = state.pointer;
    const panX = reduceMotion ? 0 : (pointer.smoothX - 0.5) * -0.5;
    const nudgeY = reduceMotion ? 0 : (pointer.smoothY - 0.5) * -0.3;
    const scan = (drift) => Geometry.clamp(Geometry.scanPosition(drift) + nudgeY, -1, 1);

    artContext.globalCompositeOperation = 'source-over';
    artContext.clearRect(0, 0, fit.box.w + pad * 2, fit.box.h + pad * 2);
    artContext.fillStyle = state.palette.ink; // shown until the first picture is ready
    artContext.fillRect(0, 0, fit.box.w + pad * 2, fit.box.h + pad * 2);

    const current = slides[show.index];
    if (current.status === 'ready') {
      const arrival = Geometry.clamp((now - current.readyAt) / 1000 / FIRST_PICTURE_FADE_S, 0, 1);
      drawCover(artContext, current.image, local, panX, scan(show.drift), arrival);
    }
    const next = slides[show.nextIndex];
    if (show.fade > 0 && next.status === 'ready') {
      drawCover(artContext, next.image, local, panX, scan(0), Geometry.easeInOut(show.fade));
    }

    // Keep dark paint visible on a dark page and white paper visible on a white one.
    artContext.globalCompositeOperation = state.palette.dark ? 'lighten' : 'darken';
    artContext.fillStyle = state.palette.dark ? 'rgb(74, 74, 84)' : 'rgb(230, 232, 238)';
    artContext.fillRect(0, 0, fit.box.w + pad * 2, fit.box.h + pad * 2);

    // Cut the name out of the picture.
    artContext.globalCompositeOperation = 'destination-in';
    artContext.drawImage(maskLayer, 0, 0, fit.box.w + pad * 2, fit.box.h + pad * 2);
    artContext.globalCompositeOperation = 'source-over';
  }

  function drawByLine(elapsed) {
    const { fit } = state.layout;
    const progress = reduceMotion ? 1 : Geometry.easeInOut(Geometry.clamp((elapsed - 0.9) / 1.6, 0, 1));
    if (progress <= 0) return;
    const size = fit.fontSize * BY_LINE_SHARE;
    const line = fit.lastLine;
    context.save();
    context.font = `400 ${size}px "Kaushan Script", cursive`;
    context.letterSpacing = '0px';
    const textWidth = context.measureText('by nafis').width;
    context.translate(line.x + line.width - fit.fontSize * 0.04, line.baseline + size * 1.1);
    context.rotate((-3 * Math.PI) / 180);
    context.beginPath();
    context.rect(-textWidth - 12, -size * 1.4, (textWidth + 24) * progress, size * 2.2); // written on, left to right
    context.clip();
    context.fillStyle = state.palette.accent;
    context.textAlign = 'right';
    context.fillText('by nafis', 0, 0);
    context.restore();
  }

  function drawFrame(now) {
    const { fit, pad, width, height } = state.layout;
    const show = currentSlideState();
    paintArtLayer(show, now);

    context.clearRect(0, 0, width, height);
    if (state.entranceStartedAt === null) return;
    const elapsed = (now - state.entranceStartedAt) / 1000;
    const rise = reduceMotion ? 1 : 1 - Math.pow(1 - Geometry.clamp(elapsed / 1.5, 0, 1), 3);

    context.save();
    context.beginPath(); // letters rise from the bottom of the name
    context.rect(0, fit.box.y - pad + (fit.box.h + pad * 2) * (1 - rise), width, (fit.box.h + pad * 2) * rise + pad);
    context.clip();
    context.drawImage(artLayer, fit.box.x - pad, fit.box.y - pad, fit.box.w + pad * 2, fit.box.h + pad * 2);
    context.fillStyle = state.palette.accent;
    context.font = nameFont(fit.fontSize);
    context.letterSpacing = nameSpacing(fit.fontSize);
    const last = fit.lastLine;
    context.fillText('.', last.dotX, last.baseline);
    context.restore();
    drawByLine(elapsed);

    if (show.index !== state.shownIndex) showCaption(show.index);
  }

  function showCaption(index) {
    state.shownIndex = index;
    const { work } = slides[index];
    countLabel.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    titleLink.textContent = work.title;
    titleLink.href = `work.html${Works.hashForWork(work)}`;
    prefetchAround(index);
  }

  /* ---- loop ---- */
  let lastFrame = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const delta = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!state.visible || document.hidden || !state.layout) return;
    const pointer = state.pointer;
    pointer.smoothX += (pointer.x - pointer.smoothX) * 0.06;
    pointer.smoothY += (pointer.y - pointer.smoothY) * 0.06;
    if (!reduceMotion) state.slideTime += delta;
    drawFrame(now);
  }

  function advance() {
    if (reduceMotion) {
      state.manualIndex += 1;
      return;
    }
    state.slideTime = Geometry.skipAhead(state.slideTime, { slideSeconds: SLIDE_SECONDS, fadeSeconds: FADE_SECONDS });
    prefetchAround(Geometry.slideAt(state.slideTime, { slideSeconds: SLIDE_SECONDS, fadeSeconds: FADE_SECONDS, count: slides.length }).nextIndex);
  }

  /** Starts the entrance once the page itself starts playing (after the opening animation). */
  function whenPageReady(callback) {
    if (!root.classList.contains('js-motion') || root.classList.contains('is-ready')) {
      callback();
      return;
    }
    const watcher = new MutationObserver(() => {
      if (!root.classList.contains('is-ready')) return;
      watcher.disconnect();
      callback();
    });
    watcher.observe(root, { attributes: true, attributeFilter: ['class'] });
    setTimeout(() => { watcher.disconnect(); callback(); }, 5000); // never leave the name unwritten
  }

  function start() {
    refreshPalette();
    computeLayout();
    ensureLoaded(0);
    prefetchAround(0);
    new ResizeObserver(computeLayout).observe(hero);
    new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting; }).observe(hero);
    new MutationObserver(refreshPalette).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refreshPalette);

    hero.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const box = hero.getBoundingClientRect();
      state.pointer.x = (event.clientX - box.left) / box.width;
      state.pointer.y = (event.clientY - box.top) / box.height;
    });
    canvas.addEventListener('click', advance);
    nextButton.addEventListener('click', advance);

    whenPageReady(() => { state.entranceStartedAt = performance.now(); });
    requestAnimationFrame(frame);
  }

  const fontsReady = Promise.all([
    document.fonts.load(nameFont(100)),
    document.fonts.load('400 40px "Kaushan Script"'),
  ]);
  fontsReady.catch(() => {}).then(() => {
    try {
      start();
    } catch (error) {
      hero.classList.add('hero--static'); // fall back to the plain heading
      console.error(error);
    }
  });
})();
