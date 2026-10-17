/**
 * Hover magnifier: over a picture (mouse only) a round lens follows the pointer
 * and shows that spot of the full-size image, enlarged. Reads the pictures'
 * data-zoom-src; the maths lives in magnifier-utils.js.
 */
(function () {
  'use strict';

  const FRAME_SELECTOR = '.tile__frame';
  const LENS_SIZE_PX = 168;
  const FOLLOW_EASING = 0.3; // share of the remaining distance covered each frame

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  const lens = document.createElement('div');
  lens.className = 'lens';
  lens.setAttribute('aria-hidden', 'true');
  document.body.append(lens);
  root.classList.add('has-lens');

  const target = { x: 0, y: 0 };
  const position = { x: 0, y: 0 };
  let image = null; // the <img> under the pointer
  let animating = false;

  function render() {
    lens.style.setProperty('--lens-x', `${position.x.toFixed(1)}px`);
    lens.style.setProperty('--lens-y', `${position.y.toFixed(1)}px`);
    if (!image) return;

    const rect = image.getBoundingClientRect();
    const placement = window.MagnifierUtils.lensBackground({
      box: rect,
      natural: { width: Number(image.getAttribute('width')), height: Number(image.getAttribute('height')) },
      fit: getComputedStyle(image).objectFit === 'cover' ? 'cover' : 'fill',
      pointer: position,
      lensSize: LENS_SIZE_PX,
    });
    lens.style.backgroundSize = `${placement.width.toFixed(1)}px ${placement.height.toFixed(1)}px`;
    lens.style.backgroundPosition = `${placement.x.toFixed(1)}px ${placement.y.toFixed(1)}px`;
  }

  function step() {
    const settled = Math.abs(target.x - position.x) < 0.1 && Math.abs(target.y - position.y) < 0.1;
    position.x += (target.x - position.x) * FOLLOW_EASING;
    position.y += (target.y - position.y) * FOLLOW_EASING;
    render();
    animating = !settled && Boolean(image);
    if (animating) requestAnimationFrame(step);
  }

  function follow(event) {
    target.x = event.clientX;
    target.y = event.clientY;
    if (prefersReducedMotion) {
      position.x = target.x;
      position.y = target.y;
      render();
    } else if (!animating) {
      animating = true;
      requestAnimationFrame(step);
    }
  }

  /** Starts with the picture already on screen, then swaps in the sharp full-size file. */
  function useImage(next) {
    image = next;
    const fullSize = next.dataset.zoomSrc;
    lens.style.backgroundImage = `url("${next.currentSrc || next.src}")`;
    const loader = new Image();
    loader.onload = () => {
      if (image === next) lens.style.backgroundImage = `url("${fullSize}")`;
    };
    loader.src = fullSize;
  }

  function hide() {
    lens.classList.remove('is-visible');
    image = null;
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const frame = event.target.closest(FRAME_SELECTOR);
    const next = frame && frame.querySelector('img[data-zoom-src]');
    if (!next) {
      hide();
      return;
    }
    if (next !== image) {
      // Appear at the pointer instead of sliding in from wherever it last was.
      position.x = event.clientX;
      position.y = event.clientY;
      useImage(next);
      lens.classList.add('is-visible');
    }
    follow(event);
  });
  document.addEventListener('pointerleave', hide);
  document.addEventListener('pointerdown', hide); // opening the viewer
  window.addEventListener('blur', hide);
  window.addEventListener('scroll', hide, { passive: true });
})();
