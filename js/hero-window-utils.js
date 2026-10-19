/**
 * Pure geometry and timing for the home-page hero, where the name "nuances."
 * is cut out of a slideshow of paintings (see hero-window.js). No DOM access, so
 * it is unit tested under Node and exposes window.HeroWindowUtils in the browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HeroWindowUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Vertical metrics of the display face, in em, measured from a line's baseline.
  const ASCENT_EM = 0.95;
  const DESCENT_EM = 0.25;
  const LINE_PITCH_EM = 0.9;
  const WIDTH_SHARE = 0.9; // the name fills this much of the region's width
  const HEIGHT_SHARE = 0.92;

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const lerp = (from, to, t) => from + (to - from) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /** The name is always a single line, on phones too. */
  const NAME_LINES = Object.freeze(['nuances']);

  /**
   * Fits centred lines of text, plus a trailing dot on the last line, into a region.
   *
   * @param {object}   options
   * @param {string[]} options.lines    the text, one entry per line (without the dot)
   * @param {string}   options.dot      the closing character, drawn in the accent colour
   * @param {(text: string) => number} options.measure  width of `text` at a 100px font size
   * @param {{x: number, y: number, w: number, h: number}} options.region
   * @returns {{fontSize: number, lines: object[], box: object, lastLine: object}}
   */
  function fitLines({ lines, dot, measure, region }) {
    const widthsAt100 = lines.map((text, index) => measure(text) + (index === lines.length - 1 ? measure(dot) : 0));
    const widest = Math.max(...widthsAt100);
    const blockHeightEm = ASCENT_EM + DESCENT_EM + LINE_PITCH_EM * (lines.length - 1);
    const fontSize = Math.min(
      (region.w * WIDTH_SHARE) / (widest / 100),
      (region.h * HEIGHT_SHARE) / blockHeightEm
    );
    const blockTop = region.y + (region.h - fontSize * blockHeightEm) / 2;

    const placed = lines.map((text, index) => {
      const width = (widthsAt100[index] * fontSize) / 100;
      const textWidth = (measure(text) * fontSize) / 100;
      return {
        text,
        width,
        x: region.x + (region.w - width) / 2,
        baseline: blockTop + fontSize * (ASCENT_EM + LINE_PITCH_EM * index),
        dotX: region.x + (region.w - width) / 2 + textWidth,
        hasDot: index === lines.length - 1,
      };
    });

    const left = Math.min(...placed.map((line) => line.x));
    const right = Math.max(...placed.map((line) => line.x + line.width));
    const top = placed[0].baseline - fontSize * ASCENT_EM;
    const bottom = placed[placed.length - 1].baseline + fontSize * DESCENT_EM;
    return {
      fontSize,
      lines: placed,
      box: { x: left, y: top, w: right - left, h: bottom - top },
      lastLine: placed[placed.length - 1],
    };
  }

  /** Where the slideshow is at time `t` (seconds): which work, how far through it, and the crossfade. */
  function slideAt(t, { slideSeconds, fadeSeconds, count }) {
    const cycle = Math.floor(t / slideSeconds);
    const within = t - cycle * slideSeconds;
    return {
      index: ((cycle % count) + count) % count,
      nextIndex: (((cycle + 1) % count) + count) % count,
      drift: within / slideSeconds,
      fade: clamp((within - (slideSeconds - fadeSeconds)) / fadeSeconds, 0, 1),
    };
  }

  /** The time to jump to so the next work starts fading in right away. */
  function skipAhead(t, { slideSeconds, fadeSeconds }) {
    const nextFadeStart = (Math.floor(t / slideSeconds) + 1) * slideSeconds - fadeSeconds * 0.9;
    return t < nextFadeStart ? nextFadeStart : nextFadeStart + slideSeconds;
  }

  /** Vertical scan of a picture through the letters: -1 (top) to 1 (bottom) over a slide. */
  function scanPosition(drift) {
    return lerp(-0.85, 0.85, easeInOut(clamp(drift, 0, 1)));
  }

  /** Index of the smallest file wide enough for `targetPixels`, or the largest if none is. */
  function pickSizeIndex(widths, targetPixels) {
    const index = widths.findIndex((width) => width >= targetPixels);
    return index === -1 ? widths.length - 1 : index;
  }

  /** Wraps a callback so only its first call runs; later calls (a timer firing after an event, say) do nothing. */
  function once(callback) {
    let called = false;
    return (...args) => {
      if (called) return undefined;
      called = true;
      return callback(...args);
    };
  }

  /**
   * The works behind the letters: the `lead` ids first, in that order, then every other visible work in
   * `categories`, taking one from each category in turn so a run of similar pieces (a print series, say)
   * is spread through the slideshow instead of playing back to back.
   */
  function pickHeroSlides(works, { lead = [], categories = [] }) {
    const byId = new Map(works.map((work) => [work.id, work]));
    const chosen = lead.map((id) => byId.get(id)).filter(Boolean);
    const taken = new Set(chosen.map((work) => work.id));
    const queues = categories.map((category) =>
      works.filter((work) => work.category === category && !work.hidden && !taken.has(work.id))
    );
    const rounds = Math.max(0, ...queues.map((queue) => queue.length));
    for (let round = 0; round < rounds; round += 1) {
      queues.forEach((queue) => {
        if (queue[round]) chosen.push(queue[round]);
      });
    }
    return chosen;
  }

  return { once, pickHeroSlides, NAME_LINES, fitLines, slideAt, skipAhead, scanPosition, pickSizeIndex, easeInOut, clamp, lerp };
});
