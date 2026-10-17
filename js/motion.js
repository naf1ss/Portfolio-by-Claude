/**
 * Motion: the hero entrance, scroll reveals and a little parallax.
 *
 * Loaded synchronously in <head> so the "js-motion" class is on <html> before
 * the first paint; the CSS only hides things that this script will then show.
 * With reduced motion requested nothing is hidden and nothing moves.
 * Exposes window.Motion.reveal(nodes) for content that is rendered later.
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const READY_TIMEOUT_MS = 2500; // never leave the page hidden if fonts or scripts stall
  const SETTLE_DELAY_MS = 2800; // entrance (letters, images) is finished by then
  const REVEAL_STAGGER_S = 0.08;
  const PARALLAX_MAX_PX = 36;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    window.Motion = { reveal() {} };
    return;
  }

  root.classList.add('js-motion');

  /**
   * Splits an element into one span per letter, for staggered animation. Text is
   * split character by character; a child element (like the accent dot) becomes
   * a single letter of its own.
   */
  function splitLetters(element) {
    let index = 0;
    const createLetter = () => {
      const span = document.createElement('span');
      span.className = 'letter';
      span.style.setProperty('--i', index++);
      return span;
    };
    const letters = [...element.childNodes].flatMap((node) => {
      if (node.nodeType !== Node.TEXT_NODE) {
        const letter = createLetter();
        letter.append(node);
        return [letter];
      }
      return [...node.textContent].map((character) => {
        const letter = createLetter();
        letter.textContent = character;
        return letter;
      });
    });
    element.replaceChildren(...letters);
  }

  let revealObserver = null;

  function getRevealObserver() {
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
      );
    }
    return revealObserver;
  }

  /** Fades and lifts each node into place as it scrolls into view, one after another. */
  function reveal(nodes) {
    const observer = getRevealObserver();
    [...nodes].forEach((node, index) => {
      node.setAttribute('data-reveal', '');
      node.style.setProperty('--reveal-delay', `${Math.min(index, 8) * REVEAL_STAGGER_S}s`);
      observer.observe(node);
    });
  }

  /**
   * Lets [data-parallax] elements lag slightly behind the page while it scrolls
   * through the first screen. At the top of the page the shift is zero, so the
   * layout rests perfectly aligned.
   */
  function initParallax() {
    const targets = [...document.querySelectorAll('[data-parallax]')];
    if (targets.length === 0) return;

    let frameRequested = false;

    function update() {
      frameRequested = false;
      const progress = Math.min(window.scrollY / window.innerHeight, 1);
      targets.forEach((target) => {
        const strength = Number(target.dataset.parallax) || 1;
        target.style.setProperty('--parallax-shift', `${(progress * PARALLAX_MAX_PX * strength).toFixed(1)}px`);
      });
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
    update();
  }

  function markReady() {
    root.classList.add('is-ready');
    // After the entrance has played, the hero letters can respond to the pointer.
    setTimeout(() => root.classList.add('is-settled'), SETTLE_DELAY_MS);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-split]').forEach(splitLetters);
    reveal(document.querySelectorAll('[data-reveal-on-load]'));
    initParallax();

    // Start once the fonts are in, so the headline does not animate and then jump.
    const timeout = setTimeout(markReady, READY_TIMEOUT_MS);
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => {
      clearTimeout(timeout);
      requestAnimationFrame(markReady);
    });
  });

  window.Motion = { reveal };
})();
