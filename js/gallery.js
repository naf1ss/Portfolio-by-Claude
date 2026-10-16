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

  function createImage(work, { eager = false, sizes = TILE_SIZES, priority = false } = {}) {
    const img = new Image();
    img.className = 'tile__image';
    img.alt = ''; // the caption and link name already describe the work
    img.width = work.w;
    img.height = work.h;
    img.loading = eager ? 'eager' : 'lazy';
    if (priority) img.fetchPriority = 'high';
    img.decoding = 'async';
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

  // Width of each mosaic image relative to the viewport, for choosing a file size.
  const MOSAIC_SIZES = '(min-width: 60rem) 38vw, 60vw';

  function createMosaicItem(work, { hrefFor, priority }) {
    const link = element('a', 'mosaic__item');
    link.href = hrefFor(work);
    link.setAttribute('aria-label', U.accessibleName(work, 1));
    const frame = element('span', 'tile__frame');
    frame.append(createImage(work, { eager: true, sizes: MOSAIC_SIZES, priority }));
    link.append(frame);
    return link;
  }

  /**
   * Hero composition from exactly three works: one large image on the left and
   * two stacked on the right. Column widths are weighted by each image's
   * height-to-width ratio, so both columns end at the same height with no
   * cropping:  width(large) : width(stack) = (r2 + r3) : r1.
   */
  function renderMosaic(container, [large, top, bottom], { hrefFor }) {
    const ratio = (work) => work.h / work.w;
    container.style.setProperty('--grow-large', ratio(top) + ratio(bottom));
    container.style.setProperty('--grow-stack', ratio(large));

    const largeColumn = element('div', 'mosaic__column mosaic__column--large');
    largeColumn.append(createMosaicItem(large, { hrefFor, priority: true }));
    const stackColumn = element('div', 'mosaic__column mosaic__column--stack');
    stackColumn.append(
      createMosaicItem(top, { hrefFor, priority: false }),
      createMosaicItem(bottom, { hrefFor, priority: false })
    );
    container.replaceChildren(largeColumn, stackColumn);
  }

  /**
   * Builds the medium filter buttons (categories with no works are omitted).
   * Returns { setActive(id) } to reflect the current selection.
   */
  function createFilters(container, { counts, onSelect }) {
    const options = [{ id: 'all', label: 'All' }].concat(
      U.CATEGORIES.filter((category) => counts[category.id] > 0)
    );
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

    container.replaceChildren(list);

    return {
      setActive(activeId) {
        buttons.forEach((button, id) => {
          button.setAttribute('aria-pressed', String(id === activeId));
        });
      },
    };
  }

  window.Gallery = { renderGallery, renderMosaic, createFilters };
})();
