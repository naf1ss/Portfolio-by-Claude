/**
 * Page bootstrapping. Each HTML page declares itself with <body data-page="...">
 * and this file wires up only what that page needs.
 */
(function () {
  'use strict';

  const config = window.SITE_CONFIG || {};

  /** Every work (artwork + photography) in display order, plus a lookup by id. */
  function loadWorks() {
    const U = window.WorksUtils;
    const all = U.sortWorks(window.PORTFOLIO_WORKS.concat(window.PORTFOLIO_PHOTOS || []));
    return { U, all, byId: new Map(all.map((work) => [work.id, work])) };
  }

  function initHome() {
    const { U, all, byId } = loadWorks();
    const pick = (ids) => (ids || []).map((id) => byId.get(id)).filter(Boolean);
    const hrefFor = (work) => `work.html${U.hashForWork(work)}`;

    const hero = pick(config.heroIds);
    const mosaic = document.getElementById('hero-mosaic');
    if (hero.length === 3) window.Gallery.renderMosaic(mosaic, hero, { hrefFor });
    else mosaic.hidden = true;

    window.Gallery.renderGallery(document.getElementById('featured-gallery'), pick(config.featuredIds), {
      hrefFor,
      eagerCount: 4,
    });

    const counts = U.countByCategory(all);
    const rows = U.CATEGORIES.filter((category) => counts[category.id] > 0).map((category) => {
      const link = document.createElement('a');
      link.href = `work.html?c=${category.id}`;
      const name = document.createElement('span');
      name.className = 'medium-list__name';
      name.textContent = category.label;
      const count = document.createElement('span');
      count.className = 'medium-list__count';
      count.textContent = `${counts[category.id]} ${counts[category.id] === 1 ? 'work' : 'works'}`;
      link.append(name, count);
      const item = document.createElement('li');
      item.append(link);
      return item;
    });
    document.getElementById('medium-list').replaceChildren(...rows);

    window.Motion.reveal(document.querySelectorAll('#featured-gallery .gallery__item'));
    window.Motion.reveal(document.querySelectorAll('#medium-list li'));
  }

  function initWork() {
    const { U, all, byId } = loadWorks();
    const list = document.getElementById('gallery');
    const status = document.getElementById('result-status');
    const lightbox = window.Lightbox.create(document.getElementById('viewer'));
    const counts = U.countByCategory(all);
    const labels = new Map(U.CATEGORIES.map((category) => [category.id, category.label]));

    let category = U.categoryFromSearch(location.search);

    // A deep-linked work must be in the visible list, so widen the filter if needed.
    const linkedId = U.workIdFromHash(location.hash, all);
    const widenedFilter =
      linkedId && category !== 'all' && byId.get(linkedId).category !== category;
    if (widenedFilter) category = 'all';

    const filters = window.Gallery.createFilters(document.getElementById('filters'), {
      counts,
      onSelect: (next) => show(next, { updateUrl: true }),
    });

    function show(next, { updateUrl }) {
      category = next;
      const visible = U.filterWorks(all, category);
      window.Gallery.renderGallery(list, visible, {
        hrefFor: (work) => U.hashForWork(work),
        eagerCount: 6,
      });
      lightbox.setWorks(visible);
      filters.setActive(category);

      const noun = visible.length === 1 ? 'work' : 'works';
      status.textContent =
        category === 'all'
          ? `Showing all ${visible.length} ${noun}`
          : `Showing ${visible.length} ${noun}: ${labels.get(category)}`;

      if (updateUrl) {
        const query = category === 'all' ? '' : `?c=${category}`;
        history.replaceState(null, '', location.pathname + query);
      }
    }

    list.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-work-id]');
      const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      if (!link || event.defaultPrevented || event.button !== 0 || modified) return;
      event.preventDefault();
      lightbox.open(link.dataset.workId, 'user');
    });

    // When the filter was widened, rewrite the URL so ?c= matches what is shown.
    show(category, { updateUrl: widenedFilter });
    if (linkedId) lightbox.open(linkedId, 'load');
  }

  /** Fills a <ul> with contact links; `showValue` also prints the address or handle. */
  function renderContactLinks(list, { showValue }) {
    const entries = window.ContactUtils.contactEntries(config.contact);
    const items = entries.map(({ label, text, href }) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = href;
      if (showValue) {
        const term = document.createElement('span');
        term.className = 'contact-list__label';
        term.textContent = label;
        link.textContent = text;
        item.append(term, link);
      } else {
        link.textContent = label;
        item.append(link);
      }
      return item;
    });
    list.replaceChildren(...items);
    return items.length;
  }

  function initContact() {
    const count = renderContactLinks(document.getElementById('contact-list'), { showValue: true });
    document.getElementById('contact-list').hidden = count === 0;
    document.getElementById('contact-empty').hidden = count > 0;
  }

  function initResume() {
    const links = document.getElementById('resume-links');
    links.hidden = renderContactLinks(links, { showValue: false }) === 0;
    document.querySelector('[data-print]').addEventListener('click', () => window.print());
  }

  const pages = { home: initHome, work: initWork, contact: initContact, resume: initResume };
  const init = pages[document.body.dataset.page];
  if (init) init();
})();
