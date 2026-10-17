/**
 * Opening animation. A cover the colour of the page holds a large "n." for a
 * moment; then the cover closes like an iris onto the header logo while the
 * "n." travels and shrinks into that exact spot, and the page begins to play.
 *
 * The markup (.intro-cover, .intro-mark) is only on the home page, and the
 * "js-intro" class that shows it is set by motion.js. Exposes window.Intro.play().
 */
(function () {
  'use strict';

  const HOLD_MS = 1000; // the large mark rests this long (counted from page load)
  const TRAVEL_MS = 1500;
  const REVEAL_LEAD_MS = 400; // the page starts to play this long after the mark starts moving
  const EASING = 'cubic-bezier(0.76, 0, 0.24, 1)';

  const root = document.documentElement;

  function finish() {
    document.querySelectorAll('.intro-cover, .intro-mark').forEach((node) => node.remove());
    root.classList.remove('js-intro');
  }

  /** Runs the animation, then calls onReveal when the page itself should begin. */
  function play({ onReveal }) {
    const cover = document.querySelector('.intro-cover');
    const mark = document.querySelector('.intro-mark');
    const logo = document.querySelector('.wordmark');
    const markBox = mark && mark.getBoundingClientRect();
    const logoBox = logo && logo.getBoundingClientRect();

    // Reloaded part-way down the page, or no logo to land on: skip the show.
    const canPlay = cover && mark && logo && window.scrollY === 0 && logoBox.bottom > 0 && logoBox.height > 0;
    if (!canPlay) {
      finish();
      onReveal();
      return;
    }

    const wait = Math.max(0, HOLD_MS - performance.now());
    setTimeout(() => {
      const scale = logoBox.height / markBox.height;
      const logoCentre = { x: logoBox.left + logoBox.width / 2, y: logoBox.top + logoBox.height / 2 };
      const farthestCorner = Math.hypot(
        Math.max(logoCentre.x, innerWidth - logoCentre.x),
        Math.max(logoCentre.y, innerHeight - logoCentre.y)
      );
      const timing = { duration: TRAVEL_MS, easing: EASING, fill: 'forwards' };

      // The mark is centred by CSS; switch to explicit coordinates so it can be animated.
      mark.style.cssText = 'left:0;top:0;transform-origin:0 0;';
      const flight = mark.animate(
        [
          { transform: `translate(${markBox.left}px, ${markBox.top}px) scale(1)` },
          { transform: `translate(${logoBox.left}px, ${logoBox.top}px) scale(${scale})` },
        ],
        timing
      );
      cover.animate(
        [
          { clipPath: `circle(${farthestCorner}px at ${logoCentre.x}px ${logoCentre.y}px)` },
          { clipPath: `circle(0px at ${logoCentre.x}px ${logoCentre.y}px)` },
        ],
        timing
      );

      setTimeout(onReveal, REVEAL_LEAD_MS);
      flight.finished.then(finish, finish);
    }, wait);
  }

  window.Intro = { play };
})();
