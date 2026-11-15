/**
 * Dust in the air of the header (css/styles.css, "Header dust").
 *
 * Specks drift slowly upward across the whole width of the header and on down the page, fading out gradually.
 * The pointer stirs them: they swirl away from it and settle back into their drift. Dark specks on the light
 * theme, pale ones on the dark (--dust-rgb, --dust-alpha). The page names cast long soft shadows (--sun-x,
 * leaning with the visitor's time of day) and lift under the pointer.
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  if (!header) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const SPILL = 160; // px the dust reaches below the header, thinning out as it goes
  const SPECKS_PER_100PX = 14;
  const STIR_RADIUS = 120;
  const STIR_FORCE = 1.4;

  /** The shadows' lean: away from where the sun is for the visitor, rightward in the morning. */
  function shadowLean(date = new Date()) {
    const hours = date.getHours() + date.getMinutes() / 60;
    const day = Math.max(0, Math.min(1, (hours - 6) / 12));
    return -Math.sin((day - 0.5) * 1.4) * 1.6;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'header-dust';
  canvas.setAttribute('aria-hidden', 'true');
  header.prepend(canvas);
  const context = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dust = { rgb: '60 50 40', alpha: 0.55 };
  let specks = [];
  let pointer = null;
  let frame = 0;
  let visible = true;

  function readColour() {
    const style = getComputedStyle(header); // the header's own, so a page can change it (the gallery's dark wall)
    dust = {
      rgb: style.getPropertyValue('--dust-rgb').trim() || dust.rgb,
      alpha: parseFloat(style.getPropertyValue('--dust-alpha')) || dust.alpha,
    };
  }

  /** The canvas spans the whole window, not only the header's centred column. */
  function resize() {
    const box = header.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    width = document.documentElement.clientWidth;
    height = Math.ceil(box.height) + SPILL;
    canvas.style.left = `${-box.left}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.round((width / 100) * SPECKS_PER_100PX);
    specks = Array.from({ length: count }, () => ({
      x: Math.random(), y: Math.random(), size: 0.6 + Math.random() ** 2 * 1.6,
      rise: 0.00025 + Math.random() * 0.0005, phase: Math.random() * Math.PI * 2,
      vx: 0, vy: 0, ox: 0, oy: 0,
    }));
    root.style.setProperty('--sun-x', shadowLean().toFixed(2));
  }

  /** 1 within the header, easing to 0 at the bottom of the spill, so the dust thins out instead of stopping. */
  function fadeBelow(y) {
    const start = height - SPILL;
    if (y <= start) return 1;
    const t = Math.min(1, (y - start) / SPILL);
    return 1 - t * t * (3 - 2 * t); // a reversed smoothstep
  }

  function draw(time) {
    const seconds = time / 1000;
    context.clearRect(0, 0, width, height);
    context.fillStyle = `rgb(${dust.rgb})`;
    specks.forEach((speck) => {
      if (!reduceMotion.matches) {
        speck.y = (speck.y - speck.rise + 1) % 1;
        speck.x = (speck.x + Math.sin(seconds * 0.3 + speck.phase) * 0.00008 + 1) % 1;
      }
      const x = speck.x * width;
      const y = speck.y * height;
      if (pointer && !reduceMotion.matches) {
        const dx = x + speck.ox - pointer.x;
        const dy = y + speck.oy - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < STIR_RADIUS && distance > 0.1) {
          const push = (1 - distance / STIR_RADIUS) * STIR_FORCE;
          // Pushed away and a little around, so the dust swirls rather than parts.
          speck.vx += (dx / distance) * push - (dy / distance) * push * 0.6;
          speck.vy += (dy / distance) * push + (dx / distance) * push * 0.6;
        }
      }
      speck.vx *= 0.93;
      speck.vy *= 0.93;
      speck.ox = (speck.ox + speck.vx) * 0.985;
      speck.oy = (speck.oy + speck.vy) * 0.985;
      const twinkle = 0.55 + 0.45 * Math.sin(seconds * 1.4 + speck.phase);
      context.globalAlpha = dust.alpha * twinkle * fadeBelow(y + speck.oy);
      context.beginPath();
      context.arc(x + speck.ox, y + speck.oy, speck.size, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;
  }

  function loop(time) {
    frame = 0;
    if (!visible) return;
    draw(time);
    if (!reduceMotion.matches) frame = requestAnimationFrame(loop);
  }

  function start() {
    readColour();
    resize();
    if (!frame) frame = requestAnimationFrame(loop);
  }

  header.addEventListener('pointermove', (event) => {
    const box = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
  });
  header.addEventListener('pointerleave', () => {
    pointer = null;
  });

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start();
  }).observe(header);
  if ('ResizeObserver' in window) new ResizeObserver(start).observe(header);
  // The theme sets the dust's colour: the toggle through data-theme, the device through its scheme.
  new MutationObserver(readColour).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  new MutationObserver(readColour).observe(document.body, { attributes: true, attributeFilter: ['data-gallery-view'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColour);
  start();
})();
