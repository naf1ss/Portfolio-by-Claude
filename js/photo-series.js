/**
 * Photography, a series at a time.
 *
 *   renderIndex   the Photography section of the gallery: one large line per series. Pointing at a line
 *                 tints the whole page in that series' room colour and shows its photographs flicking past
 *                 beside the pointer, like a flip book; on touch screens each line shows a short strip instead.
 *   renderRoom    one series on its own page, hung according to its idea. The series' `treatment`
 *                 (series-data.js) picks the hang; styles.css draws each one (.exhibit[data-treatment]):
 *
 *     vast    Negligible: the title is set tiny in an empty screen; every photograph fills the screen alone
 *     light   The Light Hits: photographs wait in the dark and light up as they reach the middle of the screen
 *     fog     Straight from Ghost Stories: an old film's title card, grain, photographs surfacing out of a blur
 *     axis    Asymmetrical: everything hangs on one centre line, numbered in mirror image on both sides
 *     window  Through the Window: a wall of windows, each photograph in a deep frame above a sill
 *     stage   Stage Light: a black stage; each photograph is lit by its own spotlight as it comes on
 *     grid    City: a dense block of photographs, tightly packed like streets, numbered like doors
 *
 * Every photograph links to its place in the viewer (a[data-work-id]), so pages.js opens the lightbox on click.
 * Exposes window.PhotoSeries.
 */
(function () {
  'use strict';

  const U = window.WorksUtils;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FLIP_MS = 420; // how long each photograph shows in the index's flip book
  const FOLLOW = 0.18; // how quickly the flip book catches up with the pointer (0–1 per frame)
  const STRIP_COUNT = 4; // photographs in a line's strip on touch screens
  const OFFSET = 'translate(2.5rem, -50%)'; // the flip book sits just right of the pointer, clear of the title
  const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function pad2(number) {
    return String(number).padStart(2, '0');
  }

  function countLine(works) {
    return [`${works.length} photographs`, U.yearSpan(works)].filter(Boolean).join(' · ');
  }

  function picture(work, { sizes, eager = false, className = 'tile__image' }) {
    const img = new Image();
    img.className = className;
    img.alt = '';
    img.width = work.w;
    img.height = work.h;
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.sizes = sizes;
    img.srcset = U.buildSrcset(work);
    img.src = U.fallbackUrl(work);
    const reveal = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth > 0) reveal();
    else {
      img.addEventListener('load', reveal, { once: true });
      img.addEventListener('error', reveal, { once: true });
    }
    return img;
  }

  /** Sets the page's room colour; null returns it to the site's own colours. */
  function setMood(id) {
    if (id) document.documentElement.dataset.mood = id;
    else delete document.documentElement.dataset.mood;
  }

  // ---------- Index ----------

  /**
   * The flip book: one picture that follows the pointer and steps through the hovered series. Built once and
   * shared by every line; it never takes focus or clicks.
   */
  function createFlipBook() {
    const box = element('figure', 'pindex__flip');
    box.setAttribute('aria-hidden', 'true');
    const img = element('img');
    img.alt = '';
    box.append(img);

    let frames = [];
    let index = 0;
    let timer = 0;
    let target = { x: 0, y: 0 };
    let at = { x: 0, y: 0 };
    let raf = 0;

    const showFrame = () => {
      const work = frames[index % frames.length];
      img.src = U.imageUrl(work, 600);
      box.style.setProperty('--ar', U.aspectRatio(work));
      index += 1;
    };

    const follow = () => {
      at.x += (target.x - at.x) * FOLLOW;
      at.y += (target.y - at.y) * FOLLOW;
      box.style.transform = `translate3d(${at.x}px, ${at.y}px, 0) ${OFFSET}`;
      raf = Math.abs(target.x - at.x) + Math.abs(target.y - at.y) > 0.5 ? requestAnimationFrame(follow) : 0;
    };

    function moveTo(x, y, { jump = false } = {}) {
      target = { x, y };
      if (jump || reduceMotion) {
        at = { ...target };
        box.style.transform = `translate3d(${x}px, ${y}px, 0) ${OFFSET}`;
      } else if (!raf) {
        raf = requestAnimationFrame(follow);
      }
    }

    function show(works) {
      frames = works;
      index = 0;
      // fetch the series' small files up front so the flip book never waits on the network
      works.forEach((work) => {
        new Image().src = U.imageUrl(work, 600);
      });
      clearInterval(timer);
      showFrame();
      if (!reduceMotion) timer = setInterval(showFrame, FLIP_MS);
      box.classList.add('is-shown');
    }

    function hide() {
      clearInterval(timer);
      box.classList.remove('is-shown');
    }

    return { box, moveTo, show, hide };
  }

  function createIndexLine({ series, works }, number, hrefFor) {
    const item = element('li', 'pindex__line');
    const link = element('a', 'pindex__link');
    link.href = hrefFor(series);
    link.dataset.series = series.id;
    link.append(
      element('span', 'pindex__no', pad2(number)),
      element('span', 'pindex__title', series.title),
      element('span', 'pindex__meta', countLine(works))
    );
    const strip = element('span', 'pindex__strip');
    strip.setAttribute('aria-hidden', 'true');
    works.slice(0, STRIP_COUNT).forEach((work) => {
      const thumb = picture(work, { sizes: '30vw', className: 'pindex__thumb' });
      thumb.style.setProperty('--ar', U.aspectRatio(work));
      strip.append(thumb);
    });
    link.append(strip);
    item.append(link);
    return item;
  }

  /** The Photography section: every series as one line, with the flip book on pointers that can hover. */
  function renderIndex(container, entries, { hrefFor }) {
    const count = NUMBER_WORDS[entries.length] || String(entries.length);
    const intro = element('p', 'pindex__lede', `${count[0].toUpperCase()}${count.slice(1)} series, each built around one idea.`);
    const list = element('ol', 'pindex__list');
    list.append(...entries.map((entry, i) => createIndexLine(entry, i + 1, hrefFor)));
    const flip = createFlipBook();
    container.replaceChildren(intro, list, flip.box);

    const byId = new Map(entries.map((entry) => [entry.series.id, entry]));
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function enter(link, point) {
      const entry = byId.get(link.dataset.series);
      if (!entry) return;
      document.documentElement.classList.add('is-mood-fading');
      setMood(entry.series.id);
      list.dataset.active = entry.series.id;
      if (!canHover) return;
      flip.moveTo(point.x, point.y, { jump: !flip.box.classList.contains('is-shown') });
      flip.show(entry.works);
    }

    function leave() {
      setMood(null);
      delete list.dataset.active;
      flip.hide();
    }

    list.addEventListener('pointerover', (event) => {
      const link = event.target.closest('.pindex__link');
      if (link && link.dataset.series !== list.dataset.active) enter(link, { x: event.clientX, y: event.clientY });
    });
    list.addEventListener('pointermove', (event) => flip.moveTo(event.clientX, event.clientY));
    list.addEventListener('pointerleave', leave);
    // Keyboard: the room colour follows focus, and the flip book sits at the end of the focused line.
    list.addEventListener('focusin', (event) => {
      const link = event.target.closest('.pindex__link');
      if (!link) return;
      const box = link.getBoundingClientRect();
      enter(link, { x: box.right - box.width * 0.18, y: box.top + box.height / 2 });
    });
    list.addEventListener('focusout', (event) => {
      if (!list.contains(event.relatedTarget)) leave();
    });

    return { reset: leave };
  }

  // ---------- Room ----------

  /** Adds `.is-in` as each frame comes into view (and `.is-lit` in the light room as it reaches the middle). */
  function watchFrames(frames, treatment) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      frames.forEach((frame) => frame.classList.add('is-in', 'is-lit'));
      return;
    }
    const arrive = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          arrive.unobserve(entry.target);
        }),
      { rootMargin: '0px 0px -12% 0px' }
    );
    frames.forEach((frame) => arrive.observe(frame));

    if (treatment !== 'light') return;
    // Light reaches a photograph once it crosses the middle band of the screen, and stays on it.
    // A frame that was scrolled straight past the band (a jump, a fast fling) is lit as well.
    const light = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          const passed = entry.rootBounds && entry.boundingClientRect.bottom < entry.rootBounds.top;
          if (!entry.isIntersecting && !passed) return;
          entry.target.classList.add('is-lit');
          light.unobserve(entry.target);
        }),
      { rootMargin: '-38% 0px -38% 0px' }
    );
    frames.forEach((frame) => light.observe(frame));
  }

  // How large each room's photographs are drawn, for the browser's choice of file.
  const ROOM_SIZES = {
    vast: '(min-width: 700px) 70vw, 100vw',
    grid: '(min-width: 900px) 33vw, 60vw',
    window: '(min-width: 900px) 30vw, 90vw',
  };
  const DEFAULT_SIZES = '(min-width: 900px) 60vw, 100vw';

  function createFrame(work, number, total, { hrefFor, sizes, eager }) {
    const item = element('li', 'exhibit__frame');
    item.style.setProperty('--ar', U.aspectRatio(work));
    item.dataset.no = pad2(number);
    const link = element('a', 'tile exhibit__link');
    link.href = hrefFor(work);
    link.dataset.workId = work.id;
    link.setAttribute('aria-label', U.accessibleName(work, number));
    const frame = element('span', 'tile__frame');
    frame.append(picture(work, { sizes, eager }));
    link.append(frame);
    const caption = element('span', 'exhibit__no');
    caption.setAttribute('aria-hidden', 'true');
    caption.append(element('span', 'exhibit__no-n', pad2(number)), element('span', 'exhibit__no-of', ` / ${pad2(total)}`));
    item.append(link, caption);
    return item;
  }

  function roomLink(entry, label, hrefFor, className) {
    const link = element('a', className);
    link.href = hrefFor(entry.series);
    link.append(element('span', 'exhibit__nav-label', label), element('span', 'exhibit__nav-title', entry.series.title));
    return link;
  }

  /**
   * One series as a room. `place` is { number, total, previous, next } among the photography series, so the
   * room can say where it hangs and lead on to the next one.
   */
  function renderRoom(container, { series, works }, place, { hrefFor, hrefForWork, indexHref }) {
    const treatment = series.treatment || 'vast';
    const article = element('article', 'exhibit');
    article.dataset.treatment = treatment;

    const intro = element('header', 'exhibit__intro');
    intro.append(
      element('p', 'exhibit__kicker', `Photography · ${pad2(place.number)} / ${pad2(place.total)}`),
      element('h1', 'exhibit__title', series.title)
    );
    if (series.note) intro.append(element('p', 'exhibit__statement', series.note));
    intro.append(element('p', 'exhibit__meta', countLine(works)));

    const sizes = ROOM_SIZES[treatment] || DEFAULT_SIZES;
    const list = element('ol', 'exhibit__frames');
    const frames = works.map((work, i) =>
      createFrame(work, i + 1, works.length, { hrefFor: hrefForWork, sizes, eager: i < 2 })
    );
    list.append(...frames);

    const nav = element('nav', 'exhibit__nav');
    nav.setAttribute('aria-label', 'More photography');
    if (place.next) nav.append(roomLink(place.next, 'Next room', hrefFor, 'exhibit__next'));
    const rest = element('p', 'exhibit__nav-row');
    if (place.previous) rest.append(roomLink(place.previous, '← Previous', hrefFor, 'exhibit__prev'));
    const all = element('a', 'exhibit__all', 'All photography');
    all.href = indexHref;
    rest.append(all);
    nav.append(rest);

    article.append(intro, list, nav);
    container.replaceChildren(article);
    document.body.dataset.treatment = treatment;
    watchFrames(frames, treatment);
    return article;
  }

  window.PhotoSeries = { renderIndex, renderRoom, setMood };
})();
