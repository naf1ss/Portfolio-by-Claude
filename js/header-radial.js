/**
 * Once the header has scrolled out of sight, a round "n." waits in the top corner (css/styles.css, "Radial
 * menu"). Pointing at it (or tapping it) fans the pages out beside it in a bow, one after another, like cards
 * from a hand; they fold back when the pointer leaves, on a second tap, or with Escape. With a mouse, clicking
 * the "n." itself goes home, as the wordmark does.
 *
 * Also publishes the header's height as --header-h, for anything placed below it.
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const nav = document.getElementById('site-nav');
  if (!header || !nav) return;
  const BOW = { inset: 40, depth: 46, top: -2, step: 38 }; // px, from the disc's centre

  const pages = Array.from(nav.querySelectorAll(':scope > ul > li > a'));
  const wordmark = header.querySelector('.wordmark');

  const radial = document.createElement('nav');
  radial.className = 'radial';
  radial.setAttribute('aria-label', 'Main, while scrolling');
  radial.innerHTML = `
    <button class="radial__disc" type="button" aria-expanded="false" aria-label="Pages">n<span>.</span></button>
    <ul class="radial__pages"></ul>`;
  const disc = radial.querySelector('.radial__disc');
  const list = radial.querySelector('.radial__pages');
  // The pages hang in a bow to the right of the disc, one under another, the middle ones furthest out.
  pages.forEach((page, i) => {
    const t = i / Math.max(1, pages.length - 1);
    const item = document.createElement('li');
    item.style.setProperty('--x', `${(BOW.inset + BOW.depth * Math.sin(Math.PI * t)).toFixed(1)}px`);
    item.style.setProperty('--y', `${(BOW.top + BOW.step * i).toFixed(1)}px`);
    item.style.setProperty('--i', String(i));
    const link = document.createElement('a');
    link.href = page.href;
    link.textContent = page.textContent.trim();
    if (page.getAttribute('aria-current')) link.setAttribute('aria-current', 'page');
    item.append(link);
    list.append(item);
  });
  document.body.append(radial);

  const setOpen = (open) => {
    radial.classList.toggle('is-open', open);
    disc.setAttribute('aria-expanded', String(open));
  };
  // With a mouse the fan opens on its own, so a click on the "n." goes home, as the wordmark does; by touch
  // or keyboard the click opens and closes the fan.
  let pressedWith = 'mouse';
  disc.addEventListener('pointerdown', (event) => {
    pressedWith = event.pointerType;
  });
  disc.addEventListener('click', (event) => {
    if (pressedWith === 'mouse' && event.detail > 0 && wordmark) location.assign(wordmark.href);
    else setOpen(!radial.classList.contains('is-open'));
    pressedWith = 'keyboard';
  });
  radial.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') setOpen(true);
  });
  radial.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') setOpen(false);
  });
  radial.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      disc.focus();
    }
  });

  // It shows once the header is out of sight, and goes when it returns.
  let queued = false;
  const update = () => {
    queued = false;
    const gone = window.scrollY > header.offsetTop + header.offsetHeight;
    radial.classList.toggle('is-shown', gone);
    radial.inert = !gone;
    if (!gone) setOpen(false);
  };
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();

  const measure = () => root.style.setProperty('--header-h', `${header.offsetHeight}px`);
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(header);
})();
