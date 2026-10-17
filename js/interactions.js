/**
 * Pointer interactions for buttons, the header controls and pictures:
 *  - a circle of colour that grows from where the pointer entered (--mx / --my)
 *  - a label that rolls up to reveal a copy of itself
 *  - a slight magnetic pull on buttons
 *  - a progress line along the top of the page
 *  - a "View" label that follows the pointer over pictures
 * All of it is decoration; the controls work the same without it.
 */
(function () {
  'use strict';

  const PILL_SELECTOR = '.button, .site-nav a, .filter, .theme-toggle';
  const ROLL_SELECTOR = '.button, .site-nav a';
  const MAGNET_PULL = 0.25; // fraction of the pointer's offset from the button centre
  const MAGNET_MAX_PX = 7;
  const PICTURE_SELECTOR = '.tile, .mosaic__item';
  const CURSOR_LABEL_TEXT = 'View';
  const CURSOR_EASING = 0.18; // share of the remaining distance covered each frame

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Replaces a label with two stacked copies that CSS slides past each other. */
  function wrapLabel(control) {
    const label = control.textContent.trim();
    if (!label || control.querySelector('.roll')) return;

    const roll = document.createElement('span');
    roll.className = 'roll';
    const front = document.createElement('span');
    front.className = 'roll__face';
    front.textContent = label;
    const back = front.cloneNode(true);
    back.setAttribute('aria-hidden', 'true');
    roll.append(front, back);
    control.replaceChildren(roll);
  }

  function setPointerOrigin(control, event) {
    const rect = control.getBoundingClientRect();
    control.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    control.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }

  function pull(button, event) {
    const rect = button.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    const clamp = (value) => Math.max(-MAGNET_MAX_PX, Math.min(MAGNET_MAX_PX, value * MAGNET_PULL));
    button.style.transform = `translate(${clamp(offsetX)}px, ${clamp(offsetY)}px)`;
  }

  function initPointerEffects() {
    document.querySelectorAll(ROLL_SELECTOR).forEach(wrapLabel);

    // Delegated, so controls that are built later (the filter pills) work too.
    document.addEventListener('pointerover', (event) => {
      const control = event.target.closest(PILL_SELECTOR);
      if (control) setPointerOrigin(control, event);
    });
    document.addEventListener('pointerout', (event) => {
      const control = event.target.closest(PILL_SELECTOR);
      if (!control) return;
      setPointerOrigin(control, event);
      if (control.matches('.button')) control.style.transform = '';
    });

    if (prefersReducedMotion) return;
    document.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const button = event.target.closest('.button');
      if (button) pull(button, event);
    });
  }

  function initScrollProgress() {
    if (prefersReducedMotion) return;
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.append(bar);

    let frameRequested = false;
    function update() {
      frameRequested = false;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      bar.style.setProperty('--progress', progress.toFixed(4));
    }
    window.addEventListener(
      'scroll',
      () => {
        if (frameRequested) return;
        frameRequested = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    window.addEventListener('resize', update);
    update();
  }

  /**
   * A round label that trails the pointer while it is over a picture. Mouse
   * only: touch screens and keyboard users keep the normal controls.
   */
  function initCursorLabel() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const label = document.createElement('div');
    label.className = 'cursor-label';
    label.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = CURSOR_LABEL_TEXT;
    label.append(text);
    document.body.append(label);
    document.documentElement.classList.add('has-cursor-label');

    const target = { x: 0, y: 0 };
    const position = { x: 0, y: 0 };
    let animating = false;

    function render() {
      label.style.setProperty('--cursor-x', `${position.x.toFixed(1)}px`);
      label.style.setProperty('--cursor-y', `${position.y.toFixed(1)}px`);
    }

    function step() {
      const settled = Math.abs(target.x - position.x) < 0.1 && Math.abs(target.y - position.y) < 0.1;
      position.x += (target.x - position.x) * CURSOR_EASING;
      position.y += (target.y - position.y) * CURSOR_EASING;
      render();
      animating = !settled;
      if (animating) requestAnimationFrame(step);
    }

    function moveTo(event) {
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

    document.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const overPicture = Boolean(event.target.closest(PICTURE_SELECTOR));
      if (overPicture && !label.classList.contains('is-visible')) {
        // Appear at the pointer instead of sliding in from wherever it last was.
        position.x = event.clientX;
        position.y = event.clientY;
      }
      label.classList.toggle('is-visible', overPicture);
      if (overPicture) moveTo(event);
    });
    document.addEventListener('pointerleave', () => label.classList.remove('is-visible'));
    window.addEventListener('blur', () => label.classList.remove('is-visible'));
  }

  initPointerEffects();
  initScrollProgress();
  initCursorLabel();
})();
