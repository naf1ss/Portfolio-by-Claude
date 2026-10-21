/**
 * Page bootstrapping. Each HTML page declares itself with <body data-page="...">
 * and this file wires up only what that page needs.
 */
(function () {
  'use strict';

  const config = window.SITE_CONFIG || {};

  /**
   * Every work (artwork + photography) in display order, plus a lookup by id.
   * `all` is what the gallery lists; works marked `hidden` stay in `catalogue` (so a series can still
   * include them) but are left out of the gallery, its filters and its counts.
   */
  function loadWorks() {
    const U = window.WorksUtils;
    const catalogue = U.sortWorks(window.PORTFOLIO_WORKS.concat(window.PORTFOLIO_PHOTOS || []));
    const all = catalogue.filter((work) => !work.hidden);
    return { U, all, catalogue, byId: new Map(catalogue.map((work) => [work.id, work])) };
  }

  /** The gallery <img> for a work, so the viewer can glide to and from it. */
  function findTileImage(workId) {
    return document.querySelector(`a[data-work-id="${workId}"] .tile__image`);
  }

  /** Creates the viewer for a gallery list and opens it when a tile is clicked. */
  function mountViewer(list, options = {}) {
    const lightbox = window.Lightbox.create(document.getElementById('viewer'), { findOrigin: findTileImage, ...options });
    list.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-work-id]');
      const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      if (!link || event.defaultPrevented || event.button !== 0 || modified) return;
      event.preventDefault();
      lightbox.open(link.dataset.workId, 'user');
    });
    return lightbox;
  }

  /**
   * True the first time the home page is shown in a browser session, so a visitor opens on the best works;
   * later visits (a refresh, coming back from another page) get a fresh random pick. Without storage
   * (private windows) it is always true, which simply keeps the best works showing.
   */
  function isFirstHomeVisit() {
    const key = 'nuances.homeSeen';
    try {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, '1');
    } catch (error) {
      // storage unavailable: treat every visit as the first
    }
    return true;
  }

  function initHome() {
    const { U, all, byId } = loadWorks();
    const hrefFor = (work) => `gallery.html${U.hashForWork(work)}`;

    const latest = byId.get(config.latestId);
    const latestSection = document.getElementById('latest-section');
    if (latest) window.Gallery.renderLatest(document.getElementById('latest'), latest, { href: hrefFor(latest) });
    else latestSection.hidden = true;

    const labels = new Map(U.CATEGORIES.map((category) => [category.id, category.label]));
    const picks = U.pickMediumWorks(all, config.mediumPicks || [], { showBest: isFirstHomeVisit() });
    window.Gallery.renderGallery(document.getElementById('medium-picks'), picks, {
      hrefFor,
      eagerCount: 4,
      kickerFor: (work) => labels.get(work.category),
    });

    const counts = U.countByCategory(all);
    const rows = U.CATEGORIES.filter((category) => category.onHome !== false && counts[category.id] > 0).map((category) => {
      const link = document.createElement('a');
      link.href = `gallery.html?c=${category.id}`;
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

    window.Motion.reveal(document.querySelectorAll('#latest > *, #medium-picks .gallery__item'));
    window.Motion.reveal(document.querySelectorAll('#medium-list li'));
  }

  // The gallery opens on paintings; ?c=all (or any other medium) is a click away.
  const DEFAULT_GALLERY_CATEGORY = 'painting';
  const GALLERY_VIEW_KEY = 'nuances.galleryView';

  /** "wall" or "grid": how paintings and prints are shown, remembered between visits. */
  function readGalleryView() {
    try {
      return localStorage.getItem(GALLERY_VIEW_KEY) === 'grid' ? 'grid' : 'wall';
    } catch (error) {
      return 'wall';
    }
  }

  function saveGalleryView(view) {
    try {
      localStorage.setItem(GALLERY_VIEW_KEY, view);
    } catch (error) {
      // storage unavailable: the choice lasts for this page only
    }
  }

  function initGallery() {
    const { U, all, byId } = loadWorks();
    const RoomUtils = window.GalleryRoomUtils;
    const list = document.getElementById('gallery');
    const status = document.getElementById('result-status');
    const viewToggle = document.getElementById('view-toggle');
    const counts = U.countByCategory(all);
    const labels = new Map(U.CATEGORIES.map((category) => [category.id, category.label]));
    // The photographer only appears alongside the photography work.
    const photographer = document.querySelector('.gallery-peek');

    let category = U.categoryFromSearch(location.search, DEFAULT_GALLERY_CATEGORY);
    let view = readGalleryView();
    const showingWall = () => view === 'wall' && RoomUtils.isWallCategory(category);

    // The close-up glides out of whichever picture was clicked: a wall frame or a grid tile.
    let room = null;
    const lightbox = mountViewer(list, {
      findOrigin: (id) => (showingWall() ? room.pictureFor(id) : findTileImage(id)),
      // Stepping through works in the close-up also walks the wall, so closing lands on the right frame.
      onChange: (work) => {
        if (showingWall()) room.goTo(work.id, { animate: false });
      },
    });
    room = window.GalleryRoom.create(document.getElementById('room'), {
      series: window.PORTFOLIO_SERIES || [],
      onOpenWork: (id) => lightbox.open(id, 'user'),
    });

    // A deep-linked work must be in the visible list, so switch to its medium if needed.
    const linkedId = U.workIdFromHash(location.hash, all);
    const switchedFilter = linkedId && category !== 'all' && byId.get(linkedId).category !== category;
    if (switchedFilter) category = byId.get(linkedId).category;

    const filters = window.Gallery.createFilters(document.getElementById('filters'), {
      counts,
      onSelect: (next) => show(next, { updateUrl: true }),
    });

    function show(next, { updateUrl, focusId } = {}) {
      category = next;
      const visible = U.filterWorks(all, category);
      const wall = showingWall();
      viewToggle.hidden = !RoomUtils.isWallCategory(category);
      viewToggle.querySelectorAll('[data-view]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.view === view));
      });
      list.hidden = wall;

      if (wall) {
        list.replaceChildren();
        room.show(visible, { focusId });
        lightbox.setWorks(room.order());
      } else {
        room.hide();
        window.Gallery.renderGallery(list, visible, {
          hrefFor: (work) => U.hashForWork(work),
          eagerCount: 6,
        });
        lightbox.setWorks(visible);
      }
      filters.setActive(category);
      if (photographer) photographer.classList.toggle('is-shown', category === 'photography');

      const noun = visible.length === 1 ? 'work' : 'works';
      const where = wall ? ' on the wall' : '';
      status.textContent =
        category === 'all'
          ? `Showing all ${visible.length} ${noun}`
          : `Showing ${visible.length} ${noun}${where}: ${labels.get(category)}`;

      if (updateUrl) {
        const query = category === DEFAULT_GALLERY_CATEGORY ? '' : `?c=${category}`;
        history.replaceState(null, '', location.pathname + query);
      }
    }

    viewToggle.addEventListener('click', (event) => {
      const button = event.target.closest('[data-view]');
      if (!button || button.dataset.view === view) return;
      view = button.dataset.view;
      saveGalleryView(view);
      show(category, { updateUrl: false });
    });

    // When the filter was switched, rewrite the URL so ?c= matches what is shown.
    show(category, { updateUrl: switchedFilter, focusId: linkedId });
    if (linkedId) lightbox.open(linkedId, 'load');
  }


  /** Lists every series, or (with ?s=<id>) shows one series as a gallery. */
  function initSeries() {
    const { U, catalogue, byId } = loadWorks();
    const entries = (window.PORTFOLIO_SERIES || [])
      .map((series) => {
        const works = U.worksInSeries(series, catalogue);
        return { series, works, cover: byId.get(series.cover) || works[0] };
      })
      .filter((entry) => entry.works.length > 0);

    const chosen = entries.find((entry) => entry.series.id === new URLSearchParams(location.search).get('s'));
    const title = document.getElementById('series-title');
    const note = document.getElementById('series-note');
    const back = document.getElementById('series-back');
    const list = document.getElementById('series-list');
    const gallery = document.getElementById('gallery');

    if (!chosen) {
      window.Gallery.renderSeriesList(list, entries, { hrefFor: (series) => `series.html?s=${series.id}` });
      window.Motion.reveal(list.children);
      return;
    }

    const { series, works } = chosen;
    document.title = `${series.title} — nuances by nafis`;
    title.textContent = series.title;
    note.textContent = series.note || U.seriesMeta(works);
    note.classList.toggle('series-note--meta', !series.note);
    back.hidden = false;
    list.hidden = true;
    gallery.hidden = false;

    window.Gallery.renderGallery(gallery, works, { hrefFor: (work) => U.hashForWork(work), eagerCount: 6 });
    const lightbox = mountViewer(gallery);
    lightbox.setWorks(works);
    const linkedId = U.workIdFromHash(location.hash, works);
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

  const pages = { home: initHome, gallery: initGallery, series: initSeries, contact: initContact, resume: initResume };
  const init = pages[document.body.dataset.page];
  if (init) init();
})();
