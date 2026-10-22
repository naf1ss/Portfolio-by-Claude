/**
 * Gallery rendering: justified rows of tiles and the medium filter buttons.
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

  /**
   * Replaces the contents of `list` (a <ul>) with one tile per work.
   * The first `eagerCount` images load immediately; the rest are lazy.
   */
  function renderGallery(list, works, { hrefFor, eagerCount = 4 }) {
    const tiles = works.map((work, i) =>
      createTile(work, i + 1, { hrefFor, eager: i < eagerCount })
    );
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

  const SERIES_SIZES = '(min-width: 60rem) 30vw, (min-width: 40rem) 45vw, 92vw';

  /** One card per series: its whole cover picture (never cropped) and its title, in justified rows. */
  function renderSeriesList(list, entries, { hrefFor, eagerCount = 3 }) {
    const cards = entries.map(({ series, cover }, i) => {
      const link = element('a', 'series-card');
      link.href = hrefFor(series);
      const frame = element('span', 'tile__frame');
      frame.append(createImage(cover, { eager: i < eagerCount, sizes: SERIES_SIZES }));
      const caption = element('span', 'tile__caption');
      caption.append(element('span', 'tile__title', series.title));
      link.append(frame, caption);
      const item = element('li');
      item.style.setProperty('--ar', U.aspectRatio(cover));
      item.append(link);
      return item;
    });
    list.replaceChildren(...cards);
  }

  /**
   * Builds the medium filter buttons (categories with no works are omitted).
   * Returns { setActive(id) } to reflect the current selection.
   */
  function createFilters(container, { counts, onSelect }) {
    // The media first, "All" last.
    const options = U.CATEGORIES.filter((category) => counts[category.id] > 0).concat({ id: 'all', label: 'All' });
    const buttons = new Map();
    const list = element('ul', 'filters');

    options.forEach(({ id, label }) => {
      const button = element('button', 'filter');
      button.type = 'button';
      button.dataset.category = id;
      button.append(label, element('span', 'filter__count', String(counts[id])));
      buttons.set(id, button);
      const item = element('li');
      item.append(button);
      list.append(item);
    });

    list.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-category]');
      if (button) onSelect(button.dataset.category);
    });

    // Phones show the same choices as one compact menu (the CSS picks which of the two is visible).
    const select = element('select');
    select.setAttribute('aria-label', 'Medium');
    options.forEach(({ id, label }) => {
      const option = element('option', undefined, `${label} (${counts[id]})`);
      option.value = id;
      select.append(option);
    });
    select.addEventListener('change', () => onSelect(select.value));
    const compact = element('label', 'filters-select');
    compact.append(select);

    container.replaceChildren(list, compact);

    return {
      setActive(activeId) {
        buttons.forEach((button, id) => {
          button.setAttribute('aria-pressed', String(id === activeId));
        });
        select.value = activeId;
      },
    };
  }

  window.Gallery = { renderGallery, renderLatest, renderMediumList, renderSeriesList, createFilters };
})();
