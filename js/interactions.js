/**
 * Pointer interactions for buttons and the header controls:
 *  - a circle of colour that grows from where the pointer entered (--mx / --my)
 *  - a label that rolls up to reveal a copy of itself
 *  - a slight magnetic pull on buttons
 *  - a progress line along the top of the page
 * All of it is decoration; the controls work the same without it.
 */
(function () {
  'use strict';

  const PILL_SELECTOR = '.button, .site-nav a, .filter, .theme-toggle';
  const ROLL_SELECTOR = '.button, .site-nav a';
  const MAGNET_PULL = 0.25; // fraction of the pointer's offset from the button centre
  const MAGNET_MAX_PX = 7;

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

  initPointerEffects();
  initScrollProgress();
})();
