/**
 * Window light across the header (css/styles.css, "Header light").
 *
 * Shafts of light fall across the whole header, as through a tall window, from the visitor's own sky: slanting
 * from the left in the morning and from the right in the afternoon, steeper toward midday. They brighten and
 * dim slowly, as if clouds were passing, and spill a little onto the page below. Dust drifts in them and swirls
 * away from the pointer. The page names cast long soft shadows away from the light (--sun-x, used by the
 * styles) and lift under the pointer. In the dark theme it is moonlight: cooler and fainter.
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  if (!header) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const SPILL = 80; // px the light reaches below the header
  const STIR_RADIUS = 90;
  const SPECKS_PER_100PX = 4;
  // The window's panes: where each shaft falls across the width (0–1) and how wide it is.
  const SHAFTS = [
    { at: 0.08, width: 0.1 }, { at: 0.24, width: 0.14 }, { at: 0.42, width: 0.08 },
    { at: 0.58, width: 0.16 }, { at: 0.77, width: 0.1 }, { at: 0.93, width: 0.12 },
  ];

  /** The light's lean from vertical, in radians: -0.7 at dawn (from the left) to +0.7 at dusk. */
  function lightLean(date = new Date()) {
    const hours = date.getHours() + date.getMinutes() / 60;
    const day = Math.max(0, Math.min(1, (hours - 6) / 12));
    return (day - 0.5) * 1.4;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'header-light';
  canvas.setAttribute('aria-hidden', 'true');
  header.prepend(canvas);
  const context = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let lean = lightLean();
  let tint = { rgb: '255 196 120', strength: 0.3 };
  let specks = [];
  let pointer = null;
  let frame = 0;
  let visible = true;

  function readTint() {
    const style = getComputedStyle(root);
    tint = {
      rgb: style.getPropertyValue('--light-rgb').trim() || tint.rgb,
      strength: parseFloat(style.getPropertyValue('--light-strength')) || tint.strength,
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
      x: Math.random(), y: Math.random(), size: 0.5 + Math.random() * 1.3, rise: 0.0003 + Math.random() * 0.0006,
      phase: Math.random() * Math.PI * 2, vx: 0, vy: 0, ox: 0, oy: 0,
    }));
    // Shadows fall away from the light: to the right in the morning, to the left in the afternoon.
    root.style.setProperty('--sun-x', (-Math.sin(lean) * 1.6).toFixed(2));
  }

  /** Each shaft's brightness now, as passing cloud would vary it. */
  const shaftStrength = (index, seconds) => 0.75 + 0.25 * Math.sin(seconds * 0.25 + index * 1.7);

  /** How lit a point is: the sum of the shafts it stands in. */
  function lightAt(x, y, seconds) {
    const shift = Math.tan(lean) * y;
    return SHAFTS.reduce((sum, shaft, index) => {
      const distance = Math.abs(x - shift - shaft.at * width) / ((shaft.width * width) / 2);
      return distance < 1 ? sum + (1 - distance * distance) * shaftStrength(index, seconds) : sum;
    }, 0);
  }

  function draw(time) {
    const seconds = time / 1000;
    context.clearRect(0, 0, width, height);
    const slant = Math.tan(lean);

    context.save();
    context.transform(1, 0, slant, 1, 0, 0);
    SHAFTS.forEach((shaft, index) => {
      const centre = shaft.at * width;
      const half = (shaft.width * width) / 2;
      const alpha = tint.strength * shaftStrength(index, seconds);
      const band = context.createLinearGradient(centre - half, 0, centre + half, 0);
      band.addColorStop(0, `rgb(${tint.rgb} / 0)`);
      band.addColorStop(0.5, `rgb(${tint.rgb} / ${alpha.toFixed(3)})`);
      band.addColorStop(1, `rgb(${tint.rgb} / 0)`);
      context.fillStyle = band;
      context.fillRect(centre - half, 0, half * 2, height);
    });
    context.restore();

    specks.forEach((speck) => {
      if (!reduceMotion.matches) {
        speck.y = (speck.y - speck.rise + 1) % 1;
        speck.x = (speck.x + Math.sin(seconds * 0.3 + speck.phase) * 0.00008 + 1) % 1;
      }
      let x = speck.x * width;
      const y = speck.y * height;
      if (pointer && !reduceMotion.matches) {
        const dx = x + speck.ox - pointer.x;
        const dy = y + speck.oy - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < STIR_RADIUS && distance > 0.1) {
          const push = (1 - distance / STIR_RADIUS) * 0.8;
          speck.vx += (dx / distance) * push;
          speck.vy += (dy / distance) * push;
        }
      }
      speck.vx *= 0.94;
      speck.vy *= 0.94;
      speck.ox = (speck.ox + speck.vx) * 0.985;
      speck.oy = (speck.oy + speck.vy) * 0.985;
      x += speck.ox;
      const lit = lightAt(x, y + speck.oy, seconds);
      if (lit <= 0.05) return;
      const twinkle = 0.6 + 0.4 * Math.sin(seconds * 1.4 + speck.phase);
      context.fillStyle = `rgb(${tint.rgb} / ${Math.min(0.95, lit * twinkle * tint.strength * 2.6).toFixed(3)})`;
      context.beginPath();
      context.arc(x, y + speck.oy, speck.size, 0, Math.PI * 2);
      context.fill();
    });
  }

  function loop(time) {
    frame = 0;
    if (!visible) return;
    draw(time);
    if (!reduceMotion.matches) frame = requestAnimationFrame(loop);
  }

  function start() {
    lean = lightLean();
    readTint();
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
  // The theme sets the light's colour: the toggle through data-theme, the device through its scheme.
  new MutationObserver(start).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', start);
  start();
})();
