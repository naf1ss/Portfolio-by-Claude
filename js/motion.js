/**
 * Motion: the page-ready signal ("is-ready") that starts entrances, and scroll reveals.
 *
 * Loaded synchronously in <head> so the "js-motion" (and, on arrival, "js-intro") class is on <html> before
 * the first paint; the CSS only hides things that this script will then show.
 * With reduced motion requested nothing is hidden and nothing moves.
 * Exposes window.Motion.reveal(nodes) for content that is rendered later.
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const READY_TIMEOUT_MS = 2500; // never leave the page hidden if fonts or scripts stall
  const REVEAL_STAGGER_S = 0.08;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    window.Motion = { reveal() {} };
    return;
  }

  root.classList.add('js-motion');

  const navigationEntry = performance.getEntriesByType('navigation')[0];
  if (
    window.IntroUtils &&
    window.IntroUtils.shouldPlayIntro({
      pathname: location.pathname,
      referrer: document.referrer,
      origin: location.origin,
      navigationType: navigationEntry ? navigationEntry.type : 'navigate',
    })
  ) {
    root.classList.add('js-intro');
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

  function markReady() {
    root.classList.add('is-ready');
  }

  document.addEventListener('DOMContentLoaded', () => {
    reveal(document.querySelectorAll('[data-reveal-on-load]'));
    // A group staggers its own children, independent of the rest of the page.
    document.querySelectorAll('[data-reveal-group]').forEach((group) => reveal(group.children));

    // Start once the fonts are in, so the headline does not animate and then jump.
    let started = false;
    function start() {
      if (started) return;
      started = true;
      if (window.Intro && root.classList.contains('js-intro')) {
        window.Intro.play({ onReveal: markReady });
      } else {
        root.classList.remove('js-intro');
        markReady();
      }
    }
    const timeout = setTimeout(start, READY_TIMEOUT_MS);
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => {
      clearTimeout(timeout);
      requestAnimationFrame(start);
    });
  });

  window.Motion = { reveal };
})();
