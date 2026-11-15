/**
 * The header stays at the top of the page. Once it has scrolled out of sight, a scroll up brings back a slim bar
 * with the same links (on phones: the wordmark and a Menu button that opens the phone menu); a scroll down, or
 * reaching the top again, sends it away (css/styles.css, "Returning header").
 *
 * Also publishes the header's height as --header-h, for anything placed below it.
 */
(function () {
  'use strict';

  const header = document.querySelector('.site-header');
  const nav = document.getElementById('site-nav');
  if (!header || !nav) return;
  const root = document.documentElement;
  const NUDGE = 10; // pixels scrolled one way before the bar answers, so a trembling trackpad never flickers it

  const wordmark = header.querySelector('.wordmark');
  const menuButton = header.querySelector('.menu-toggle');

  const bar = document.createElement('div');
  bar.className = 'return-header';
  bar.inert = true;
  bar.innerHTML = `
    <div class="return-header__board">
      <a class="return-header__mark wordmark" href="${wordmark ? wordmark.getAttribute('href') : './'}" aria-label="nuances by Nafis, home">n<span>.</span></a>
      <nav class="site-nav return-header__nav" aria-label="Main, while scrolling"></nav>
      <button class="return-header__menu" type="button" aria-label="Open menu" aria-expanded="false">Menu</button>
    </div>`;
  // The same links as the header, without the ids its own menus carry.
  const links = nav.querySelector(':scope > ul').cloneNode(true);
  links.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  bar.querySelector('.return-header__nav').append(links);
  document.body.append(bar);

  const barMenu = bar.querySelector('.return-header__menu');
  if (menuButton) {
    barMenu.addEventListener('click', () => menuButton.click());
    // The bar's button says what the header's would: Menu, or Close while the menu is open.
    new MutationObserver(() => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      barMenu.textContent = open ? 'Close' : 'Menu';
      barMenu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      barMenu.setAttribute('aria-expanded', String(open));
    }).observe(menuButton, { attributes: true, attributeFilter: ['aria-expanded'] });
  }

  let lastY = window.scrollY;
  let travel = 0;
  let queued = false;

  function setShown(shown) {
    // While the menu is open from the bar, the bar stays: its Close is the way out.
    if (root.classList.contains('is-menu-open') && bar.classList.contains('is-shown')) shown = true;
    if (shown === bar.classList.contains('is-shown')) return;
    bar.classList.toggle('is-shown', shown);
    bar.inert = !shown;
  }

  function update() {
    queued = false;
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    lastY = y;
    if (y <= header.offsetTop + header.offsetHeight) {
      travel = 0;
      setShown(false);
      return;
    }
    travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
    if (travel > NUDGE) setShown(false);
    else if (travel < -NUDGE) setShown(true);
  }

  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });

  const measure = () => root.style.setProperty('--header-h', `${header.offsetHeight}px`);
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(header);
  update();
})();
