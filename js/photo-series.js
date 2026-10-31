/**
 * Photography, a series at a time.
 *
 *   renderIndex   the Photography section of the gallery: one large line per series and no photographs, which
 *                 are kept for the rooms. Pointing at (or focusing) a line tints the whole page in that series'
 *                 room colour, so each room is announced by its light before it is entered.
 *   renderSeriesGrid  the Photography section as a grid: each series with its name, its statement and all of
 *                 its photographs together, one series after another
 *   renderRoom    one series on its own page, hung according to its idea. The series' `treatment`
 *                 (series-data.js) picks the hang; styles.css draws each one (.exhibit[data-treatment]).
 *                 With `view: 'grid'` the same page shows the series' photographs as a plain grid instead:
 *
 *     vast    Negligible: the title is set tiny in an empty screen; every photograph fills the screen alone
 *     light   The Light Hits: photographs wait in the dark and light up as they reach the middle of the screen
 *     fog     Straight from Ghost Stories: an old film's title card, grain, photographs surfacing out of a blur
 *     axis    Asymmetrical: everything hangs on one centre line, numbered in mirror image on both sides
 *     window  Through the Window: scrolling down slides the photographs sideways past the screen, like views
 *             going by outside a train window, with a counter for where you are
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
    img.alt = U.altText(work); // the link's name is what screen readers announce; this describes the picture
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
    item.append(link);
    return item;
  }

  /** The Photography section: every series as one line; the room colour follows the pointer and focus. */
  function renderIndex(container, entries, { hrefFor }) {
    const count = NUMBER_WORDS[entries.length] || String(entries.length);
    const intro = element('p', 'pindex__lede', `${count[0].toUpperCase()}${count.slice(1)} series, each built around one idea.`);
    const list = element('ol', 'pindex__list');
    list.append(...entries.map((entry, i) => createIndexLine(entry, i + 1, hrefFor)));
    container.replaceChildren(intro, list);

    function enter(link) {
      document.documentElement.classList.add('is-mood-fading');
      setMood(link.dataset.series);
      list.dataset.active = link.dataset.series;
    }

    function leave() {
      setMood(null);
      delete list.dataset.active;
    }

    list.addEventListener('pointerover', (event) => {
      const link = event.target.closest('.pindex__link');
      if (link && link.dataset.series !== list.dataset.active) enter(link);
    });
    list.addEventListener('pointerleave', leave);
    list.addEventListener('focusin', (event) => {
      const link = event.target.closest('.pindex__link');
      if (link) enter(link);
    });
    list.addEventListener('focusout', (event) => {
      if (!list.contains(event.relatedTarget)) leave();
    });

    return { reset: leave };
  }

  // ---------- Room ----------

  /**
   * Adds `.is-in` as each frame comes into view (and `.is-lit` in the light room as it reaches the middle).
   * Returns a function that stops watching.
   */
  function watchFrames(frames, treatment) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      frames.forEach((frame) => frame.classList.add('is-in', 'is-lit'));
      return () => {};
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

    if (treatment !== 'light') return () => arrive.disconnect();
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
    return () => {
      arrive.disconnect();
      light.disconnect();
    };
  }

  // How large each room's photographs are drawn, for the browser's choice of file.
  const ROOM_SIZES = {
    vast: '(min-width: 700px) 70vw, 100vw',
    grid: '(min-width: 900px) 33vw, 60vw',
    window: '(min-width: 900px) 55vw, 90vw',
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

  // ---------- The passing view (Through the Window) ----------
  // The frames sit in one row inside a stage that sticks to the screen; the stage's container is made as tall
  // as the row is wide, so scrolling down moves the row sideways. Without motion it stays a plain column.

  function hangPassing(list, total) {
    const pass = element('div', 'exhibit__pass');
    const stage = element('div', 'exhibit__pass-stage');
    const counter = element('p', 'exhibit__pass-count');
    counter.setAttribute('aria-hidden', 'true');
    stage.append(list, counter);
    pass.append(stage);
    return { pass, stage, list, counter, total };
  }

  /** Starts the sideways pass; returns a function that ends it (the page may switch to its grid). */
  function startPassing({ pass, stage, list, counter, total }) {
    if (reduceMotion) return () => {};
    pass.classList.add('is-passing');
    const frames = [...list.children];
    let distance = 0;
    let raf = 0;

    const update = () => {
      raf = 0;
      const progress = distance ? Math.min(1, Math.max(0, -pass.getBoundingClientRect().top / distance)) : 0;
      const offset = progress * distance;
      list.style.transform = `translate3d(${-offset}px, 0, 0)`;
      // the frame nearest the middle of the screen is the one being looked at
      const middle = offset + stage.clientWidth / 2;
      let nearest = 0;
      frames.forEach((frame, i) => {
        const best = frames[nearest];
        const distanceOf = (node) => Math.abs(node.offsetLeft + node.offsetWidth / 2 - middle);
        if (distanceOf(frame) < distanceOf(best)) nearest = i;
      });
      counter.textContent = `${pad2(nearest + 1)} / ${pad2(total)}`;
    };

    const measure = () => {
      distance = Math.max(0, list.offsetWidth - stage.clientWidth);
      pass.style.height = `${stage.clientHeight + distance}px`;
      update();
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const resizes = new ResizeObserver(measure);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    resizes.observe(list);

    // Tabbing to a photograph off to the side scrolls the page to the point where it passes the middle.
    list.addEventListener('focusin', (event) => {
      const frame = event.target.closest('.exhibit__frame');
      if (!frame || !distance) return;
      stage.scrollLeft = 0;
      const offset = Math.min(distance, Math.max(0, frame.offsetLeft + frame.offsetWidth / 2 - stage.clientWidth / 2));
      window.scrollTo({ top: pass.offsetTop + offset });
    });
    measure();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      resizes.disconnect();
      cancelAnimationFrame(raf);
    };
  }

  /**
   * One series as a room. `place` is { number, total, previous, next } among the photography series, so the
   * room can say where it hangs and lead on to the next one.
   */
  function renderRoom(container, { series, works }, place, { hrefFor, hrefForWork, indexHref, view = 'wall' }) {
    const asGrid = view === 'grid';
    // 'tiles' has no room styling: the page keeps its colour and its words, and shows the photographs plainly.
    const treatment = asGrid ? 'tiles' : series.treatment || 'vast';
    const article = element('article', 'exhibit');
    article.dataset.treatment = treatment;

    const intro = element('header', 'exhibit__intro');
    intro.append(
      element('p', 'exhibit__kicker', `Photography · ${pad2(place.number)} / ${pad2(place.total)}`),
      element('h1', 'exhibit__title', series.title)
    );
    if (series.note) intro.append(element('p', 'exhibit__statement', series.note));
    intro.append(element('p', 'exhibit__meta', countLine(works)));

    let body;
    let passing = null;
    const ends = []; // what to undo when the page switches view
    if (asGrid) {
      body = element('ul', 'gallery exhibit__grid');
      window.Gallery.renderGallery(body, works, { hrefFor: hrefForWork, eagerCount: 6 });
    } else {
      const sizes = ROOM_SIZES[treatment] || DEFAULT_SIZES;
      const list = element('ol', 'exhibit__frames');
      const frames = works.map((work, i) =>
        createFrame(work, i + 1, works.length, { hrefFor: hrefForWork, sizes, eager: i < 2 })
      );
      list.append(...frames);
      passing = treatment === 'window' ? hangPassing(list, works.length) : null;
      body = passing ? passing.pass : list;
      ends.push(watchFrames(frames, treatment));
    }

    const nav = element('nav', 'exhibit__nav');
    nav.setAttribute('aria-label', 'More photography');
    if (place.next) nav.append(roomLink(place.next, 'Next room', hrefFor, 'exhibit__next'));
    const rest = element('p', 'exhibit__nav-row');
    if (place.previous) rest.append(roomLink(place.previous, '← Previous', hrefFor, 'exhibit__prev'));
    const all = element('a', 'exhibit__all', 'All photography');
    all.href = indexHref;
    rest.append(all);
    nav.append(rest);

    article.append(intro, body, nav);
    container.replaceChildren(article);
    if (asGrid) delete document.body.dataset.treatment;
    else document.body.dataset.treatment = treatment;

    // The passing view measures the frames, so it starts once they are in the page.
    if (passing) ends.push(startPassing(passing));
    return { destroy: () => ends.forEach((end) => end()) };
  }

  // ---------- Grid ----------

  /**
   * The Photography section as a grid: for each series its name (a link to its room), its statement and then all
   * of its photographs together in the site's ordinary grid.
   */
  function renderSeriesGrid(container, entries, { hrefFor, hrefForWork }) {
    const sections = entries.map(({ series, works }, i) => {
      const section = element('section', 'pgrid__series');
      const heading = element('h2', 'pgrid__title');
      const link = element('a', undefined, series.title);
      link.href = hrefFor(series);
      heading.append(link);
      const head = element('header', 'pgrid__head');
      head.append(element('p', 'pgrid__kicker', `${pad2(i + 1)} / ${pad2(entries.length)} · ${countLine(works)}`), heading);
      if (series.note) head.append(element('p', 'pgrid__note', series.note));
      const list = element('ul', 'gallery');
      window.Gallery.renderGallery(list, works, { hrefFor: hrefForWork, eagerCount: i === 0 ? 6 : 0 });
      section.append(head, list);
      return section;
    });
    container.replaceChildren(...sections);
  }

  window.PhotoSeries = { renderIndex, renderSeriesGrid, renderRoom, setMood };
})();
