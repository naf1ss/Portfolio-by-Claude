/**
 * Keeps the header within reach on long pages. It is sticky (css/styles.css), tucks away while the visitor
 * scrolls down, so it never sits over the work, and slides back as soon as they scroll up, reach the top,
 * open the phone menu or tab into it. Also publishes its height as --header-h, for anything placed below it.
 */
(function () {
  'use strict';

  const header = document.querySelector('.site-header');
  if (!header) return;
  const root = document.documentElement;
  // Pixels scrolled one way before the header answers, so a trembling trackpad never makes it flicker.
  const NUDGE = 10;

  const measure = () => root.style.setProperty('--header-h', `${header.offsetHeight}px`);
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(header);

  let lastY = window.scrollY;
  let travel = 0; // distance scrolled in the current direction
  let queued = false;

  function setTucked(tucked) {
    header.classList.toggle('is-tucked', tucked);
  }

  function update() {
    queued = false;
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    lastY = y;
    const pastTop = y > header.offsetHeight;
    header.classList.toggle('is-scrolled', pastTop);
    if (!pastTop || root.classList.contains('is-menu-open')) {
      travel = 0;
      setTucked(false);
      return;
    }
    travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
    if (travel > NUDGE) setTucked(true);
    else if (travel < -NUDGE) setTucked(false);
  }

  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  header.addEventListener('focusin', () => setTucked(false));
  update();
})();
