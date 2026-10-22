/**
 * The gallery room: paintings, drawings and prints hung along one long wall under picture lights, at true relative size.
 * Walking (arrows, keys, swipe) slides the whole wall, so the next work was always there. Clicking a work asks
 * the page to open the close-up viewer. Exposes window.GalleryRoom.create(section, options).
 *
 * Sizes, grouping and scale live in gallery-room-utils.js; the look lives in the "Gallery room" CSS.
 */
(function () {
  'use strict';

  const U = window.WorksUtils;
  const R = window.GalleryRoomUtils;
  const LIGHTS_KEY = 'nuances.roomLights';
  const WALK_MS = 1500; // keep in step with --room-walk in the CSS
  const SWIPE_DISTANCE = 50;
  const LAMP_ROOM_PX = 64; // space kept above the tallest work for its lamp
  const PHONE_LAMP_PX = 52; // phones: the lamp's gap, kept above and below the frame so it stays centred
  const PHONE_LABEL_GAP_PX = 18; // phones: between the frame and its label

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const readLights = () => {
    try {
      return localStorage.getItem(LIGHTS_KEY) !== 'off';
    } catch (error) {
      return true;
    }
  };
  const saveLights = (on) => {
    try {
      localStorage.setItem(LIGHTS_KEY, on ? 'on' : 'off');
    } catch (error) {
      // storage unavailable: the choice lasts for this page only
    }
  };

  /**
   * "16 × 20 in" with " (40.6 × 50.8 cm)" in its own span (phones hide it to keep the label on one line),
   * from the catalogue's "16x20 inches". Returns null when there is no size.
   */
  function sizeLine(dimensions, prefix = '') {
    if (!dimensions) return null;
    const line = element('dd');
    const match = /^\s*([\d.]+)\s*x\s*([\d.]+)\s*(?:inches|inch|in)\s*$/i.exec(dimensions);
    if (!match) {
      line.textContent = prefix + U.formatDimensions(dimensions);
      return line;
    }
    const cm = (inches) => (Number(inches) * 2.54).toFixed(1);
    line.append(
      `${prefix}${match[1]} × ${match[2]} in`,
      element('span', 'room__metric', ` (${cm(match[1])} × ${cm(match[2])} cm)`)
    );
    return line;
  }

  /** The wall label: what a gallery prints beside a work (or beside a series hung together). */
  function createLabel(section, categoryLabel) {
    const label = element('div', 'room__label');
    const works = section.works;
    const lead = works[0];
    const facts = element('dl', 'room__facts');
    const addFact = (text) => text && facts.append(element('dd', undefined, text));

    if (section.series) {
      label.append(element('p', 'room__kicker', `${categoryLabel} · Series of ${works.length}`));
      label.append(element('h2', 'room__title', section.series.title));
      const media = new Set(works.map((work) => work.medium));
      const sizes = new Set(works.map((work) => work.dimensions));
      addFact(media.size === 1 ? lead.medium : '');
      const size = sizes.size === 1 ? sizeLine(lead.dimensions, 'Each ') : null;
      if (size) facts.append(size);
      addFact(U.seriesMeta(works).split(' · ')[1] || '');
    } else {
      label.append(element('p', 'room__kicker', categoryLabel));
      label.append(element('h2', 'room__title', lead.title || lead.medium || 'Untitled'));
      addFact(lead.medium);
      const size = sizeLine(lead.dimensions);
      if (size) facts.append(size);
      addFact(lead.year ? String(lead.year) : '');
    }
    label.append(element('span', 'room__rule'), facts);
    if (section.series) label.append(...seriesDetails(section));
    return label;
  }

  const MAX_LISTED_TITLES = 4; // larger groups (Horizon's numbered prints) would only repeat their title

  /**
   * Under a group's label: each work's title, left to right (small groups only), and a link to the series page.
   */
  function seriesDetails(section) {
    const details = [];
    if (section.works.length <= MAX_LISTED_TITLES) {
      const list = element('ol', 'room__works');
      section.works.forEach((work) => list.append(element('li', undefined, work.title || work.medium || 'Untitled')));
      details.push(element('p', 'room__works-heading', R.groupGrid(section.works.length).rows === 1 ? 'Left to right' : 'In order'), list);
    }
    const link = element('a', 'room__series-link', 'About the series →');
    link.href = `series.html?s=${encodeURIComponent(section.series.id)}`;
    details.push(link);
    return details;
  }

  /** The artist's notes, hung on the other side of the work when a record has them. */
  function createNotes(section) {
    const notes = section.works.length === 1 ? section.works[0].notes : section.series.note;
    if (!notes) return null;
    const block = element('div', 'room__notes');
    block.append(element('p', 'room__kicker', 'Thought process'), element('p', 'room__notes-text', notes));
    return block;
  }

  function createFrame(work) {
    const frame = element('button', `room__frame room__frame--${work.category}`);
    frame.type = 'button';
    frame.dataset.workId = work.id;
    frame.setAttribute('aria-label', `Open ${work.title || work.medium || 'this work'}`);
    const img = new Image();
    img.alt = U.altText(work);
    img.width = work.w;
    img.height = work.h;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.srcset = U.buildSrcset(work);
    img.src = U.fallbackUrl(work);
    const picture = element('span', 'room__picture');
    picture.append(img);
    const inner = element('span', 'room__inner');
    inner.append(picture);
    frame.append(inner);
    return frame;
  }

  function createLamp() {
    const lamp = element('div', 'room__lamp');
    lamp.setAttribute('aria-hidden', 'true');
    lamp.append(element('span', 'room__lamp-plate'), element('span', 'room__lamp-arm'), element('span', 'room__lamp-shade'));
    return lamp;
  }

  function createSegment(section, categoryLabel) {
    const segment = element('section', 'room__segment');
    segment.setAttribute('aria-label', section.series ? section.series.title : section.works[0].title || 'Work');
    const art = element('div', 'room__art');
    const pool = element('div', 'room__pool');
    pool.setAttribute('aria-hidden', 'true');
    const hang = element('div', 'room__hang');
    const frames = element('div', 'room__frames');
    section.works.forEach((work) => frames.append(createFrame(work)));
    hang.append(createLamp(), frames);
    art.append(pool, hang);
    segment.append(createLabel(section, categoryLabel), art);
    const notes = createNotes(section);
    if (notes) segment.append(notes);
    return segment;
  }

  function createShell(room) {
    const view = element('div', 'room__view');
    const track = element('div', 'room__track');
    const floor = element('div', 'room__floor');
    const plane = element('div', 'room__plane');
    const glints = element('div', 'room__glints');
    floor.append(plane, glints, element('div', 'room__floor-light'));
    floor.setAttribute('aria-hidden', 'true');
    const skirting = element('div', 'room__skirting');
    const shade = element('div', 'room__shade');
    skirting.setAttribute('aria-hidden', 'true');
    shade.setAttribute('aria-hidden', 'true');
    view.append(track, skirting, floor, shade);

    const bar = element('div', 'room__bar');
    const lights = element('button', 'room__button room__lights');
    lights.type = 'button';
    lights.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Lights</span>';
    const prev = element('button', 'room__button', '←');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous work on the wall');
    const count = element('span', 'room__count');
    count.setAttribute('aria-live', 'polite');
    const next = element('button', 'room__button', '→');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next work on the wall');
    bar.append(lights, prev, count, next);

    room.replaceChildren(view, bar);
    return { view, track, plane, glints, lights, prev, count, next };
  }

  /**
   * options.series      the series list (series marked hangTogether share a stretch of wall)
   * options.onOpenWork  called with a work id when a framed work is clicked
   */
  function create(room, { series = [], onOpenWork = () => {} } = {}) {
    const parts = createShell(room);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const labels = new Map(U.CATEGORIES.map((category) => [category.id, category.label]));
    let sections = [];
    let index = 0;
    let segmentWidth = 0;
    let walkingUntil = 0;

    function setLights(on) {
      room.classList.toggle('is-lit', on);
      parts.lights.setAttribute('aria-pressed', String(on));
      parts.lights.setAttribute('aria-label', on ? 'Turn the picture lights off' : 'Turn the picture lights on');
    }
    setLights(readLights());
    parts.lights.addEventListener('click', () => {
      const on = !room.classList.contains('is-lit');
      setLights(on);
      saveLights(on);
    });

    function buildWall(works) {
      sections = R.wallSections(works, series);
      const categoryLabel = labels.get(works[0] && works[0].category) || 'Work';
      // An empty stretch of wall at each end, so the first and last works are not at the edge of the world.
      const segments = [element('div', 'room__segment room__segment--end')];
      sections.forEach((section) => segments.push(createSegment(section, categoryLabel)));
      segments.push(element('div', 'room__segment room__segment--end'));
      parts.track.replaceChildren(...segments);
      parts.glints.replaceChildren(...segments.map((_, i) => element('div', i === 0 || i === segments.length - 1 ? 'room__glint is-off' : 'room__glint')));
    }

    /**
     * The box a framed work may fill. Wide screens: the middle column, less room for the lamp. Phones: the work
     * and its label are centred together on the wall, so the tallest label and the lamp's gaps come off first.
     */
    function availableSpace() {
      const segments = parts.track.querySelectorAll('.room__segment:not(.room__segment--end)');
      if (window.matchMedia('(min-width: 62rem)').matches) {
        const box = segments[0].querySelector('.room__art').getBoundingClientRect();
        return { w: box.width * 0.94, h: (box.height - LAMP_ROOM_PX) * 0.9 };
      }
      const style = getComputedStyle(segments[0]);
      const innerW = segments[0].clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const innerH = segments[0].clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const labelH = Math.max(...Array.from(segments, (segment) => segment.querySelector('.room__label').offsetHeight));
      return { w: innerW * 0.9, h: (innerH - labelH - PHONE_LABEL_GAP_PX - 2 * PHONE_LAMP_PX) * 0.95 };
    }

    /** Sizes every frame from one scale (see sectionScales) and keeps the camera on the current section. */
    function layout() {
      if (room.hidden || sections.length === 0) return;
      room.style.setProperty('--room-top', `${Math.round(room.getBoundingClientRect().top + window.scrollY)}px`);
      segmentWidth = room.clientWidth;
      room.style.setProperty('--room-segment', `${segmentWidth}px`);
      const scales = R.sectionScales(sections, availableSpace());

      parts.track.querySelectorAll('.room__segment:not(.room__segment--end)').forEach((segment, i) => {
        const section = sections[i];
        const ppi = scales[i];
        const outer = R.sectionInches(section);
        segment.style.setProperty('--room-fw', `${(outer.w * ppi).toFixed(1)}px`);
        segment.style.setProperty('--room-fh', `${(outer.h * ppi).toFixed(1)}px`);
        segment.style.setProperty('--room-lamp-gap', `${Math.max(44, outer.h * ppi * 0.13).toFixed(1)}px`);
        const grid = R.groupGrid(section.works.length);
        const frames = segment.querySelector('.room__frames');
        frames.style.setProperty('--room-columns', String(section.works.length === 1 ? 1 : grid.columns));
        frames.style.setProperty('--room-spacing', `${(R.GROUP_SPACING_IN * ppi).toFixed(1)}px`);

        frames.querySelectorAll('.room__frame').forEach((frame, j) => {
          const size = R.framedInches(section.works[j]);
          frame.style.setProperty('--room-moulding', `${Math.max(4, size.framing.moulding * ppi).toFixed(1)}px`);
          frame.style.setProperty('--room-inner', `${Math.max(3, size.framing.inner * ppi).toFixed(1)}px`);
          frame.style.setProperty('--room-pw', `${(size.picture.w * ppi).toFixed(1)}px`);
          frame.style.setProperty('--room-ph', `${(size.picture.h * ppi).toFixed(1)}px`);
          frame.style.setProperty('--room-frame-h', `${(size.h * ppi).toFixed(1)}px`);
          frame.querySelector('img').sizes = `${Math.ceil(size.picture.w * ppi)}px`;
        });
      });
      place(false);
    }

    /** Moves the camera to the current section; with `animate` it walks there along the wall. */
    function place(animate) {
      const moving = animate && !reduceMotion.matches;
      const x = -(index + 1) * segmentWidth;
      [parts.track, parts.glints, parts.plane].forEach((node) => node.classList.toggle('is-moving', moving));
      parts.track.style.transform = `translate3d(${x}px, 0, 0)`;
      parts.glints.style.transform = `translate3d(${x}px, 0, 0)`;
      parts.plane.style.setProperty('--room-floor-x', `${x}px`);
      parts.count.textContent = `${index + 1} / ${sections.length}`;
      parts.prev.disabled = index === 0;
      parts.next.disabled = index === sections.length - 1;
      // Load the pictures you are about to walk up to.
      const segments = parts.track.querySelectorAll('.room__segment:not(.room__segment--end)');
      [index - 1, index, index + 1].forEach((i) => {
        if (segments[i]) segments[i].querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
      });
      if (moving) walkingUntil = performance.now() + WALK_MS;
    }

    function walk(step) {
      const next = index + step;
      if (next < 0 || next >= sections.length || performance.now() < walkingUntil) return;
      index = next;
      place(true);
    }

    parts.prev.addEventListener('click', () => walk(-1));
    parts.next.addEventListener('click', () => walk(1));
    parts.track.addEventListener('click', (event) => {
      const frame = event.target.closest('.room__frame');
      if (frame && performance.now() >= walkingUntil) onOpenWork(frame.dataset.workId);
    });

    document.addEventListener('keydown', (event) => {
      if (room.hidden || document.documentElement.classList.contains('has-viewer')) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select')) return;
      if (event.key === 'ArrowLeft') walk(-1);
      else if (event.key === 'ArrowRight') walk(1);
      else return;
      event.preventDefault();
    });

    let swipeStart = null;
    parts.view.addEventListener('pointerdown', (event) => {
      swipeStart = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY };
    });
    parts.view.addEventListener('pointerup', (event) => {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) walk(dx < 0 ? 1 : -1);
    });

    let resizeFrame = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(layout);
    });

    return {
      /** Hangs `works` (one medium) and shows the room, standing at `focusId` or the first work. */
      show(works, { focusId } = {}) {
        buildWall(works);
        room.hidden = false;
        index = Math.max(0, R.sectionIndexOf(sections, focusId));
        layout();
        if (document.fonts) document.fonts.ready.then(layout);
      },
      hide() {
        room.hidden = true;
      },
      /** Stands in front of a work, walking there unless `animate` is false. */
      goTo(workId, { animate = true } = {}) {
        const found = R.sectionIndexOf(sections, workId);
        if (found === -1 || found === index) return;
        index = found;
        place(animate);
      },
      /** The picture on the wall for a work, so the close-up can glide out of it and back. */
      pictureFor(workId) {
        if (room.hidden) return null;
        const frame = parts.track.querySelector(`.room__frame[data-work-id="${CSS.escape(workId)}"]`);
        return frame ? frame.querySelector('img') : null;
      },
      /** Works in the order they hang. */
      order() {
        return R.hangingOrder(sections);
      },
    };
  }

  window.GalleryRoom = { create };
})();
