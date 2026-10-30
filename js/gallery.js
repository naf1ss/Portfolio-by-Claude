/**
 * Gallery rendering: justified rows of tiles, the home page's lists and the series cards (the medium picker
 * is js/medium-picker.js).
 * Exposes window.Gallery. Layout itself is CSS (see .gallery in styles.css);
 * this file only builds the markup.
 */
(function () {
  'use strict';

  const U = window.WorksUtils;

  // Tiles are at most about half the viewport wide; this lets the browser
  // choose the 600w / 1200w file instead of always fetching the largest.
  const TILE_SIZES = '(min-width: 1200px) 28vw, (min-width: 700px) 42vw, 92vw';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** Fades an image in once it has loaded (or failed, so it never stays hidden). */
  function revealWhenReady(img) {
    const reveal = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth > 0) {
      reveal();
      return;
    }
    img.addEventListener('load', reveal, { once: true });
    img.addEventListener('error', reveal, { once: true });
  }

  function createImage(work, { eager = false, sizes = TILE_SIZES } = {}) {
    const img = new Image();
    img.className = 'tile__image';
    img.alt = ''; // the caption and link name already describe the work
    img.width = work.w;
    img.height = work.h;
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.dataset.zoomSrc = U.largestUrl(work); // full-size file for the hover magnifier
    img.sizes = sizes;
    img.srcset = U.buildSrcset(work);
    img.src = U.fallbackUrl(work);
    revealWhenReady(img);
    return img;
  }

  function createCaption(work) {
    const caption = element('span', 'tile__caption');
    if (work.title) caption.append(element('span', 'tile__title', work.title));
    const meta = U.metaLine(work);
    if (meta) caption.append(element('span', 'tile__meta', meta));
    return caption;
  }

  /** Photographs are shown as a clean contact sheet, with captions only in the viewer. */
  function createTileChildren(work, eager) {
    const frame = element('span', 'tile__frame');
    frame.append(createImage(work, { eager }));
    return U.isBulk(work) ? [frame] : [frame, createCaption(work)];
  }

  function createTile(work, position, { hrefFor, eager }) {
    const item = element('li', 'gallery__item');
    item.style.setProperty('--ar', U.aspectRatio(work));

    const link = element('a', 'tile');
    link.href = hrefFor(work);
    link.dataset.workId = work.id;
    link.setAttribute('aria-label', U.accessibleName(work, position));

    link.append(...createTileChildren(work, eager));
    item.append(link);
    return item;
  }

  const SET_STEP_MS = 2000; // how long each work of a set stays on its tile
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /**
   * One tile for a set of works (see `set` in works-data.js): the works are stacked and the tile turns through them,
   * one every SET_STEP_MS, with "n / N" in the corner. It pauses while pointed at or focused, and stays on the first
   * work when the visitor prefers less motion. The link follows the work on show, so a click opens that one.
   */
  function createSetTile(members, position, { hrefFor, eager }) {
    const first = members[0];
    const item = element('li', 'gallery__item');
    item.style.setProperty('--ar', U.aspectRatio(first));

    const link = element('a', 'tile tile--set');
    const frame = element('span', 'tile__frame tile__frame--set');
    const images = members.map((work, i) => {
      const img = createImage(work, { eager: eager && i === 0 });
      if (i > 0) img.loading = 'lazy';
      frame.append(img);
      return img;
    });
    const counter = element('span', 'tile__set-count');
    counter.setAttribute('aria-hidden', 'true');
    frame.append(counter);

    const caption = element('span', 'tile__caption');
    caption.append(element('span', 'tile__title', first.setTitle || first.title));
    const meta = U.metaLine(first);
    if (meta) caption.append(element('span', 'tile__meta', meta));
    link.append(frame, caption);
    item.append(link);

    let current = 0;
    const show = (index) => {
      current = index;
      images.forEach((img, i) => img.classList.toggle('is-current', i === index));
      link.href = hrefFor(members[index]);
      link.dataset.workId = members[index].id;
      link.setAttribute('aria-label', `${first.setTitle || first.title}, a set of ${members.length}: ${U.accessibleName(members[index], position)}`);
      counter.textContent = `${index + 1} / ${members.length}`;
    };
    show(0);

    let paused = false;
    ['pointerenter', 'focusin'].forEach((type) => link.addEventListener(type, () => (paused = true)));
    ['pointerleave', 'focusout'].forEach((type) => link.addEventListener(type, () => (paused = false)));
    const timer = setInterval(() => {
      if (!item.isConnected) {
        clearInterval(timer); // the grid was redrawn
        return;
      }
      if (paused || reduceMotion.matches || document.hidden) return;
      show((current + 1) % members.length);
    }, SET_STEP_MS);
    return item;
  }

  /**
   * Replaces the contents of `list` (a <ul>) with one tile per work, and one per set: a set's members follow
   * each other (WorksUtils.groupSets) and share a single tile. The first `eagerCount` images load immediately;
   * the rest are lazy.
   */
  function renderGallery(list, works, { hrefFor, eagerCount = 4 }) {
    const tiles = [];
    for (let i = 0; i < works.length; i += 1) {
      const work = works[i];
      const options = { hrefFor, eager: tiles.length < eagerCount };
      if (!work.set) {
        tiles.push(createTile(work, tiles.length + 1, options));
        continue;
      }
      let end = i;
      while (end + 1 < works.length && works[end + 1].set === work.set) end += 1;
      tiles.push(createSetTile(works.slice(i, end + 1), tiles.length + 1, options));
      i = end;
    }
    list.replaceChildren(...tiles);
  }

  /**
   * "Browse by medium" on the home page: one row per medium with its name, a small picture of one of its works
   * and how many works it holds. `pickFor(categoryId)` returns that work (or null for a row without one).
   */
  function renderMediumList(list, categories, { counts, pickFor }) {
    const rows = categories.map((category) => {
      const link = element('a');
      link.href = `gallery.html?c=${category.id}`;
      const count = counts[category.id];
      link.append(element('span', 'medium-list__name', category.label));
      const work = pickFor(category.id);
      if (work) {
        const thumb = createImage(work, { sizes: '10rem' });
        thumb.classList.replace('tile__image', 'medium-list__thumb'); // keeps is-loaded if it already loaded
        thumb.alt = '';
        link.append(thumb);
      }
      link.append(element('span', 'medium-list__count', `${count} ${count === 1 ? 'work' : 'works'}`));
      const item = element('li');
      item.append(link);
      return item;
    });
    list.replaceChildren(...rows);
  }

  const LATEST_SIZES = '(min-width: 56rem) 56vw, 92vw';

  /** The large "latest work" feature: a big picture beside its title and details. */
  function renderLatest(container, work, { href }) {
    const link = element('a', 'tile latest__media');
    link.href = href;
    link.dataset.workId = work.id;
    link.setAttribute('aria-label', `${work.title}, open in the gallery`);
    const frame = element('span', 'tile__frame');
    frame.append(createImage(work, { eager: true, sizes: LATEST_SIZES }));
    link.append(frame);

    const details = [
      ['Year', work.year],
      ['Medium', work.medium],
      ['Size', U.formatDimensions(work.dimensions)],
    ].filter(([, value]) => value);
    const list = element('dl', 'latest__details');
    details.forEach(([label, value]) => {
      const row = element('div');
      row.append(element('dt', undefined, label), element('dd', undefined, String(value)));
      list.append(row);
    });

    const more = element('a', 'text-link', 'View in the gallery \u2192');
    more.href = href;
    const body = element('div', 'latest__body');
    body.append(element('h3', 'latest__title', work.title), list, more);

    container.replaceChildren(link, body);
  }

  // The series index is a set of tickers: each series' name runs slowly across its own row, in outline, and
  // fills in and stops when pointed at. A track holds two identical halves, each at least as wide as the row,
  // and slides by one half, so the loop never shows a seam.
  const TICKER_SPEED = 55; // px per second, the same for every row whatever its length

  function tickerUnit(series, meta, hidden) {
    const unit = element('span', 'ticker__unit');
    if (hidden) unit.setAttribute('aria-hidden', 'true');
    const mark = element('span', 'ticker__mark', '✦');
    mark.setAttribute('aria-hidden', 'true');
    unit.append(element('span', 'ticker__title', series.title), element('span', 'ticker__meta', meta), mark);
    return unit;
  }

  function fillTicker(track, series, meta) {
    track.replaceChildren(tickerUnit(series, meta, false));
    const unitWidth = track.firstChild.getBoundingClientRect().width || 1;
    const perHalf = Math.max(1, Math.ceil(track.parentElement.clientWidth / unitWidth));
    for (let i = 1; i < perHalf * 2; i += 1) track.append(tickerUnit(series, meta, true));
    track.style.setProperty('--ticker-duration', `${((perHalf * unitWidth) / TICKER_SPEED).toFixed(1)}s`);
  }

  /** One ticker row per series: its name, medium and years, running across the page. */
  function renderSeriesList(list, entries, { hrefFor }) {
    const rows = entries.map(({ series, works }) => {
      const meta = [U.seriesMedium(series, works), U.yearSpan(works)].filter(Boolean).join(' · ');
      const link = element('a', 'ticker');
      link.href = hrefFor(series);
      link.setAttribute('aria-label', `${series.title}, ${meta}`);
      const track = element('span', 'ticker__track');
      link.append(track);
      const item = element('li');
      item.append(link);
      return { item, fill: () => fillTicker(track, series, meta) };
    });
    list.classList.add('series-list--ticker');
    list.replaceChildren(...rows.map(({ item }) => item));

    const fillAll = () => rows.forEach(({ fill }) => fill());
    fillAll();
    // Widths change once the display face has loaded and whenever the window does.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fillAll);
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fillAll, 150);
    });
  }

  window.Gallery = { renderGallery, renderLatest, renderMediumList, renderSeriesList };
})();
