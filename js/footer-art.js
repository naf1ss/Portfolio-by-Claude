/**
 * Fills the big "n" in the footer with photographs. They are drawn at random from
 * whatever is in works-photography.js, so adding or removing photos needs no change
 * here. Two layers crossfade; nothing loads until the footer is about to be seen.
 */
(function () {
  'use strict';

  const SHOWN_CLASS = 'is-shown';
  const PAINTED_CLASS = 'is-painted';
  const SECONDS_PER_PHOTO = 7;
  const PHOTOS_PER_VISIT = 12; // a short random sequence, so a long visit does not repeat quickly

  const logo = document.querySelector('.footer__logo');
  const layers = logo ? Array.from(logo.querySelectorAll('.footer__n-layer')) : [];
  const photos = window.PORTFOLIO_PHOTOS || [];
  if (layers.length < 2 || photos.length === 0 || !window.WorksUtils) return;

  const Works = window.WorksUtils;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sequence = Works.pickRandom(photos, PHOTOS_PER_VISIT);

  let nextIndex = 0;
  let frontLayer = 0;
  let timer = null;

  /** Resolves with the photo's URL once it has loaded, or null if it failed. */
  function loadPhoto(work) {
    // custom-property URLs resolve against the stylesheet, so give the page-relative path in full
    const url = new URL(Works.fallbackUrl(work), document.baseURI).href;
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(url);
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  async function showNextPhoto() {
    const work = sequence[nextIndex % sequence.length];
    nextIndex += 1;
    const url = await loadPhoto(work);
    if (!url) return;

    const incoming = layers[1 - frontLayer];
    incoming.style.setProperty('--footer-photo', `url("${url}")`);
    logo.classList.add(PAINTED_CLASS);
    layers[frontLayer].classList.remove(SHOWN_CLASS);
    incoming.classList.add(SHOWN_CLASS);
    frontLayer = 1 - frontLayer;
  }

  function start() {
    if (reduceMotion && nextIndex > 0) return; // one still photograph per visit
    showNextPhoto();
    if (reduceMotion || timer) return;
    timer = setInterval(showNextPhoto, SECONDS_PER_PHOTO * 1000);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  // Only run while the footer is near the screen.
  new IntersectionObserver(
    (entries) => (entries[0].isIntersecting ? start() : stop()),
    { rootMargin: '300px 0px' }
  ).observe(logo);
})();
