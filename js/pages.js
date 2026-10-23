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
    const catalogue = U.applyCuratedOrder(
      U.sortWorks(window.PORTFOLIO_WORKS.concat(window.PORTFOLIO_PHOTOS || [])),
      config.galleryOrder
    );
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

    // Each medium's row shows one of its works: the chosen best on a first visit, a random one after that.
    const picks = U.pickMediumWorks(all, config.mediumPicks || [], { showBest: isFirstHomeVisit() });
    const pickByCategory = new Map(picks.map((work) => [work.category, work]));
    const counts = U.countByCategory(all);
    window.Gallery.renderMediumList(
      document.getElementById('medium-list'),
      U.CATEGORIES.filter((category) => category.onHome !== false && counts[category.id] > 0),
      { counts, pickFor: (id) => pickByCategory.get(id) || null }
    );

    window.Motion.reveal(document.querySelectorAll('#latest > *'));
    window.Motion.reveal(document.querySelectorAll('#medium-list li'));
  }

  // The gallery opens on paintings; ?c=all (or any other medium) is a click away.
  const DEFAULT_GALLERY_CATEGORY = 'painting';
  const GALLERY_VIEW_KEY = 'nuances.galleryView';

  /** "wall" or "grid": how paintings, drawings and prints are shown, remembered between visits. */
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
    const bar = document.getElementById('gallery-bar');
    // On the wall the header lies over the room, so the wall's controls are placed below its height.
    const header = document.querySelector('.site-header');
    const measureHeader = () => document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
    if (header) {
      measureHeader();
      new ResizeObserver(measureHeader).observe(header);
    }
    const counts = U.countByCategory(all);
    const labels = new Map(U.CATEGORIES.map((category) => [category.id, category.label]));
    // The photographer only appears alongside the photography work.
    const photographer = document.querySelector('.gallery-peek');

    let category = U.categoryFromSearch(location.search, DEFAULT_GALLERY_CATEGORY);
    // A link to a medium with nothing in it (a hidden section) opens the default medium instead of an empty page.
    if (category !== 'all' && !counts[category]) category = DEFAULT_GALLERY_CATEGORY;
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

    // The media first, "All" last; each pictured in the placard's menu by its chosen work, else its first.
    const options = U.CATEGORIES.filter((entry) => counts[entry.id] > 0).concat({ id: 'all', label: 'All' });
    const picks = new Map((config.mediumPicks || []).map((pick) => [pick.category, pick.best]));
    const picker = window.MediumPicker.create({
      options,
      counts,
      thumbFor: (id) => (id === 'all' ? null : byId.get(picks.get(id)) || all.find((work) => work.category === id)),
      onSelect: (next) => show(next, { updateUrl: true }),
      onView: (next) => {
        if (next === view) return;
        view = next;
        saveGalleryView(view);
        show(category, { updateUrl: false });
      },
    });
    bar.append(picker.letters, picker.lettersViews, picker.capsule);
    const roomElement = document.getElementById('room');
    roomElement.append(picker.placard);
    roomElement.querySelector('.room__bar').append(picker.roomViews);

    function show(next, { updateUrl, focusId } = {}) {
      category = next;
      const visible = U.filterWorks(all, category);
      const wall = showingWall();
      list.hidden = wall;
      // The CSS places the picker by this: on the wall, or above the grid.
      document.body.dataset.galleryView = wall ? 'wall' : 'grid';

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
      picker.setActive(category);
      picker.setView(view, { available: RoomUtils.isWallCategory(category) });
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
        return { series, works };
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
    note.textContent = series.note || '';
    back.hidden = false;
    list.hidden = true;
    gallery.hidden = false;

    // A series with a write-up (js/series-stories.js) is told through it, pictures beside the words, instead of
    // a grid of its works; the note becomes the write-up's opening line.
    const story = (window.PORTFOLIO_SERIES_STORIES || {})[series.id];
    const storyBox = document.getElementById('series-story');
    let viewerHost = gallery;
    if (story && window.SeriesStory) {
      gallery.hidden = true;
      note.hidden = true;
      window.SeriesStory.render(storyBox, story, { note: series.note, byId });
      viewerHost = storyBox;
    } else {
      window.Gallery.renderGallery(gallery, works, { hrefFor: (work) => U.hashForWork(work), eagerCount: 6 });
    }

    const lightbox = mountViewer(viewerHost);
    lightbox.setWorks(works);
    const linkedId = U.workIdFromHash(location.hash, works);
    if (linkedId) lightbox.open(linkedId, 'load');
  }

  /** Lists every project, or (with ?p=<id>) shows one project's case study. */
  function initProjects() {
    const { byId } = loadWorks();
    const projects = window.PORTFOLIO_PROJECTS || [];
    const chosen = projects.find((project) => project.id === new URLSearchParams(location.search).get('p'));
    const index = document.getElementById('projects-index');
    const article = document.getElementById('project-case');

    if (!chosen) {
      window.ProjectPage.renderList(document.getElementById('project-list'), projects, {
        byId,
        hrefFor: (project) => `projects.html?p=${project.id}`,
      });
      return;
    }

    document.title = `${chosen.title} — nuances by nafis`;
    index.hidden = true;
    document.getElementById('project-back').hidden = false;
    window.ProjectPage.renderCase(article, chosen, { byId });

    // The viewer steps through the case study's pictures in reading order.
    const ids = [...new Set([...article.querySelectorAll('[data-work-id]')].map((link) => link.dataset.workId))];
    const works = ids.map((id) => byId.get(id)).filter(Boolean);
    const lightbox = mountViewer(article, {
      findOrigin: (id) => article.querySelector(`a[data-work-id="${id}"] img`),
    });
    lightbox.setWorks(works);
    const linkedId = window.WorksUtils.workIdFromHash(location.hash, works);
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

  const pages = { home: initHome, gallery: initGallery, series: initSeries, projects: initProjects, contact: initContact, resume: initResume };
  const init = pages[document.body.dataset.page];
  if (init) init();
})();
