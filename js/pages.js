/**
 * Page bootstrapping. Each HTML page declares itself with <body data-page="...">
 * and this file wires up only what that page needs.
 */
(function () {
  'use strict';

  const U = window.WorksUtils;
  const config = window.SITE_CONFIG || {};
  const allWorks = U.sortWorks(window.PORTFOLIO_WORKS);
  const worksById = new Map(allWorks.map((work) => [work.id, work]));

  function initHome() {
    const featured = (config.featuredIds || [])
      .map((id) => worksById.get(id))
      .filter(Boolean);
    window.Gallery.renderGallery(document.getElementById('featured-gallery'), featured, {
      hrefFor: (work) => `work.html${U.hashForWork(work)}`,
      eagerCount: 4,
    });

    const counts = U.countByCategory(allWorks);
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
  }

  function initWork() {
    const list = document.getElementById('gallery');
    const status = document.getElementById('result-status');
    const lightbox = window.Lightbox.create(document.getElementById('viewer'));
    const counts = U.countByCategory(allWorks);
    const labels = new Map(U.CATEGORIES.map((category) => [category.id, category.label]));

    let category = U.categoryFromSearch(location.search);

    // A deep-linked work must be in the visible list, so widen the filter if needed.
    const linkedId = U.workIdFromHash(location.hash, allWorks);
    const widenedFilter =
      linkedId && category !== 'all' && worksById.get(linkedId).category !== category;
    if (widenedFilter) category = 'all';

    const filters = window.Gallery.createFilters(document.getElementById('filters'), {
      counts,
      onSelect: (next) => show(next, { updateUrl: true }),
    });

    function show(next, { updateUrl }) {
      category = next;
      const visible = U.filterWorks(allWorks, category);
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

  function initContact() {
    const contact = config.contact || {};
    const entries = [];
    if (contact.email) {
      entries.push({ label: 'Email', text: contact.email, href: `mailto:${contact.email}` });
    }
    if (contact.instagram) {
      const handle = contact.instagram.replace(/^@/, '');
      entries.push({
        label: 'Instagram',
        text: `@${handle}`,
        href: `https://www.instagram.com/${encodeURIComponent(handle)}/`,
      });
    }

    const list = document.getElementById('contact-list');
    const fallback = document.getElementById('contact-empty');
    const items = entries.map(({ label, text, href }) => {
      const term = document.createElement('span');
      term.className = 'contact-list__label';
      term.textContent = label;
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      const item = document.createElement('li');
      item.append(term, link);
      return item;
    });
    list.replaceChildren(...items);
    list.hidden = items.length === 0;
    fallback.hidden = items.length > 0;
  }

  const pages = { home: initHome, work: initWork, contact: initContact };
  const init = pages[document.body.dataset.page];
  if (init) init();
})();
