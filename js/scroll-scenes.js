/**
 * Scroll scenes: effects tied to how far the page has been scrolled. The browser's own scrolling is left alone;
 * each effect reads its element's place on the screen once per frame and sets a few styles.
 *
 *   [data-wash]          the page takes this element's colour while it holds the middle of the screen. The colour
 *                        is `data-wash-color`, or is sampled from the picture at `data-wash-src` and deepened
 *                        into a wall colour with light text.
 *   [data-ghost]         huge, faint outlined words behind the element ("ONE|WORD|PER|LINE"), always drifting
 *                        sideways (faster while scrolling), and catching an iridescent light under the pointer.
 *   [data-sideways]      a tall section whose `.sideways__track` is pinned and moved sideways as you scroll down.
 *   .rise                headings whose words rise into place from below a hairline as they come into view.
 *   [data-count]         a number that counts up from zero when it comes into view.
 *   [data-draw]          a row whose top rule draws itself from left to right when it comes into view.
 *   next page            the foot of every page names the next page; scrolling on past the bottom fills a bar,
 *                        and a full bar opens that page.
 *
 * Exposes window.ScrollScenes.refresh() for content drawn later. Visitors who ask for less motion get the
 * pages at rest: no sliding, no counting, and colour changes without a fade.
 */
(function () {
  'use strict';

  /**
   * Which scenes are on. Each can be switched off here without touching the pages that use it.
   * (Loaded before pages.js, so pages can ask before preparing a scene.)
   */
  const FEATURES = Object.freeze({
    wash: true,
    sideways: true,
    ghosts: false,
    rise: true,
    counts: false,
    draw: true,
    nextPage: true,
  });

  // Headings that rise into place: every page title, and the section titles of the resume, the series write-ups
  // and the home page's latest work.
  const RISING_HEADINGS = 'h1, [data-rise], .resume-block__title, .story__title, .latest__title';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WASH_LINE = 0.5; // the part of the screen (from the top) whose element sets the page colour
  const PULL_TO_OPEN = 1400; // pixels of deliberate scrolling past the bottom that fill the next-page bar
  const PULL_STEP_MAX = 45; // the most one wheel event can add, so a single hard flick cannot fill it
  const PULL_PAUSE_MS = 350; // the pause, after reaching the bottom, before scrolling on starts to count
  const PULL_HOLD_MS = 250; // an unfinished pull starts emptying this long after scrolling stops
  const PULL_DECAY_PER_S = 1.5; // and then empties at this rate, in bars per second

  const clamp01 = (value) => Math.min(1, Math.max(0, value));

  /** How far an element has travelled through the screen: 0 as its top enters at the bottom, 1 as its bottom leaves at the top. */
  function travel(rect, viewport) {
    return clamp01((viewport - rect.top) / (viewport + rect.height));
  }

  // ---------- Colour ----------

  /** The average colour of a picture's coloured parts, ignoring white mats, black shadows and grey walls. */
  function sampleColour(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, size, size);
        const { data } = context.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let weight = 0;
        for (let i = 0; i < data.length; i += 4) {
          const max = Math.max(data[i], data[i + 1], data[i + 2]);
          const min = Math.min(data[i], data[i + 1], data[i + 2]);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const w = saturation * saturation * (max > 24 && max < 250 ? 1 : 0.05);
          r += data[i] * w;
          g += data[i + 1] * w;
          b += data[i + 2] * w;
          weight += w;
        }
        resolve(weight > 0 ? [r / weight, g / weight, b / weight] : null);
      };
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  function rgbToHsl([r, g, b]) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }

  /** A deep wall colour in the picture's hue, with the tones a page needs to sit on it. */
  function wallFrom(rgb) {
    const [h, s] = rgbToHsl(rgb);
    const sat = Math.round(Math.min(0.55, Math.max(0.18, s * 0.7)) * 100);
    const hue = Math.round(h);
    return {
      paper: `hsl(${hue} ${sat}% 14%)`,
      sunken: `hsl(${hue} ${sat}% 18%)`,
      rule: `hsl(${hue} ${Math.round(sat * 0.6)}% 27%)`,
      ink: `hsl(${hue} 30% 94%)`,
      dark: true,
    };
  }

  /** A wall in exactly the colour given (a dark one), for sections whose colour is chosen rather than sampled. */
  function wallExact(hex) {
    const [h, s] = rgbToHsl(hexToRgb(hex));
    const hue = Math.round(h);
    const sat = Math.round(s * 100);
    return { paper: hex, sunken: `hsl(${hue} ${sat}% 9%)`, rule: `hsl(${hue} ${Math.min(sat, 20)}% 20%)`, ink: `hsl(${hue} 15% 93%)`, dark: true };
  }

  const washes = new Map(); // element -> wall colours (null until sampled)
  let currentWash = null;

  function registerWash(element) {
    if (washes.has(element)) return;
    root.classList.add('has-wash');
    washes.set(element, null);
    if (element.dataset.washColor) {
      washes.set(element, wallExact(element.dataset.washColor));
      return;
    }
    const src = element.dataset.washSrc;
    if (src) {
      sampleColour(src).then((rgb) => {
        if (!rgb) return;
        washes.set(element, wallFrom(rgb));
        requestFrame();
      });
    }
  }

  function hexToRgb(hex) {
    const value = parseInt(hex.replace('#', ''), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  function applyWash(wall) {
    if (wall === currentWash) return;
    currentWash = wall;
    root.classList.toggle('is-washed', Boolean(wall));
    root.classList.toggle('is-wash-dark', Boolean(wall && wall.dark));
    const props = { '--paper': 'paper', '--paper-sunken': 'sunken', '--rule': 'rule', '--ink': 'ink' };
    Object.entries(props).forEach(([property, key]) => {
      if (wall) root.style.setProperty(property, wall[key]);
      else root.style.removeProperty(property);
    });
    root.style.colorScheme = wall ? 'dark' : '';
  }

  function updateWash(viewport) {
    const line = viewport * WASH_LINE;
    let active = null;
    const across = window.innerWidth / 2;
    washes.forEach((wall, element) => {
      if (!wall) return;
      const rect = element.getBoundingClientRect();
      const pinned = element.closest('.sideways__pin');
      if (pinned) {
        // A panel passing sideways: it sets the colour while it crosses the middle, and the row is on screen.
        const pin = pinned.getBoundingClientRect();
        if (pin.top <= line && pin.bottom >= line && rect.left <= across && rect.right >= across) active = wall;
      } else if (rect.top <= line && rect.bottom >= line) {
        active = wall;
      }
    });
    applyWash(active);
  }

  // ---------- Giant words ----------
  // Huge outlined words behind a section, so faint they never compete with the text in front: a hairline of
  // metal with a hint of iridescence that breathes slowly. Each line is a word repeated end to end that keeps
  // drifting sideways on its own, alternate lines in opposite directions, and runs faster while the page is
  // scrolled. A lens follows the pointer; under it the metal lights up, iridescent. Drawn in SVG, so the outline
  // can carry a gradient, in an outline cut of Manrope whose letters are single
  // shapes (the ordinary cut builds letters from overlapping pieces, which an outline shows as stray lines).

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const GHOST_SPEED = 26; // drift in pixels a second
  const GHOST_SCROLL_PULL = 0.4; // extra drift per pixel scrolled
  const GHOST_GAP_EM = 0.4; // space between repeats of a word
  const ghosts = []; // one entry per line
  const pointer = { x: -1e4, y: -1e4 };
  let ghostId = 0;
  let lastScrollY = window.scrollY;
  let lastFrameAt = 0;

  // How much of the effect this computer gets. It starts from what the browser tells about the machine and
  // steps down for good if the words cannot hold a smooth frame rate while they are on screen:
  //   full   drifting words, and the light under the pointer
  //   calm   drifting words without the light, which is the costly part
  //   still  words at rest, moving only as the page is scrolled
  const QUALITY_LEVELS = ['full', 'calm', 'still'];
  const SLOW_FRAME_MS = 26; // a typical frame slower than this (under ~38 frames a second) steps down
  const SAMPLE_FRAMES = 90;
  const frameSamples = [];
  let quality = startingQuality();

  function startingQuality() {
    const cores = navigator.hardwareConcurrency || 8;
    const memory = navigator.deviceMemory || 8; // reported by Chrome and Edge only
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);
    if (saveData || cores <= 2 || memory <= 2) return 'still';
    if (cores <= 4 || memory <= 4) return 'calm';
    return 'full';
  }

  function watchFrameRate(frameMs) {
    // A long gap is the tab in the background or the page loading, not a slow computer.
    if (quality === 'still' || frameMs <= 0 || frameMs > 250) return;
    frameSamples.push(frameMs);
    if (frameSamples.length < SAMPLE_FRAMES) return;
    const sorted = frameSamples.splice(0).sort((a, b) => a - b);
    if (sorted[sorted.length >> 1] > SLOW_FRAME_MS) {
      quality = QUALITY_LEVELS[QUALITY_LEVELS.indexOf(quality) + 1];
      root.dataset.ghostQuality = quality;
    }
  }

  function svgElement(tag, attributes = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  }

  function gradientStops(gradient, stops) {
    // Theme tokens (var(--…)) work only through a style, not as an SVG attribute.
    stops.forEach(([offset, color]) => {
      const stop = color.startsWith('var(') ? svgElement('stop', { offset, style: `stop-color: ${color}` }) : svgElement('stop', { offset, 'stop-color': color });
      gradient.append(stop);
    });
    return gradient;
  }

  /**
   * One line of a giant word: a track of repeated outlines, and over it the same repeats lit, shown only under
   * the lens. The lens is a CSS mask on the lit layer, moved with two custom properties; an SVG mask, redrawn
   * every frame over letters this large, would now and then drop a frame and flash.
   */
  function ghostLine(word, index) {
    ghostId += 1;
    const id = `ghost-${ghostId}`;
    const row = document.createElement('div');
    row.className = 'ghost__row';
    const svg = svgElement('svg', { class: 'ghost__line ghost__line--edge', overflow: 'visible', 'aria-hidden': 'true', focusable: 'false' });
    const defs = svgElement('defs');
    defs.append(gradientStops(svgElement('linearGradient', { id: `${id}-edge`, x1: '0', y1: '0', x2: '1', y2: '0.35' }), [
      ['0', 'var(--ghost-steel)'], ['0.22', 'var(--ghost-bronze)'], ['0.45', 'var(--ghost-violet)'],
      ['0.68', 'var(--ghost-gold)'], ['0.86', 'var(--ghost-teal)'], ['1', 'var(--ghost-steel)'],
    ]));
    const shine = gradientStops(svgElement('linearGradient', { id: `${id}-shine`, x1: '0', y1: '0', x2: '1', y2: '0.5', spreadMethod: 'reflect' }), [
      ['0', '#f4f5ff'], ['0.16', '#aab4ff'], ['0.3', '#5c4bff'], ['0.44', '#ff5a40'], ['0.56', '#ffd27e'],
      ['0.66', '#ffffff'], ['0.8', '#86e4ff'], ['1', '#f4f5ff'],
    ]);
    defs.append(shine);
    const track = svgElement('g', { class: 'ghost__track' });
    svg.append(defs, track);

    const litSvg = svgElement('svg', { class: 'ghost__line ghost__line--lit', overflow: 'visible', 'aria-hidden': 'true', focusable: 'false', style: 'visibility: hidden' });
    const litTrack = svgElement('g', { class: 'ghost__track' });
    litSvg.append(litTrack);
    row.append(svg, litSvg);
    return {
      word, id, row, svg, litSvg, track, litTrack, shine,
      direction: index % 2 === 0 ? -1 : 1,
      position: Math.random() * 1000, // lines start at different points of their word
      unit: 0, size: 100, strength: 0, lensX: 0, lensY: 0, shownRadius: 0, live: false,
    };
  }

  function wordText(line, className, x, paint) {
    const node = svgElement('text', { class: className, x: x.toFixed(1), y: '0.8em', ...paint });
    node.textContent = line.word;
    return node;
  }

  /** Lays the repeats of a line's word end to end, enough to cover the screen while it drifts. */
  /**
   * Lays the repeats of a line's word end to end, enough to cover the screen while it drifts, and sizes each
   * layer to exactly that strip. The strips are then only ever moved with a CSS transform, which the browser
   * does without redrawing the letters.
   */
  function layoutGhostLine(line) {
    const probe = wordText(line, 'ghost__edge', 0, {});
    line.track.replaceChildren(probe);
    line.size = parseFloat(getComputedStyle(line.row).fontSize) || 100;
    const width = probe.getComputedTextLength();
    if (!width) return;
    line.unit = width + line.size * GHOST_GAP_EM;
    const count = Math.ceil(window.innerWidth / line.unit) + 3;
    const edges = [];
    const lit = [];
    for (let i = 0; i < count; i += 1) {
      const x = i * line.unit;
      edges.push(wordText(line, 'ghost__edge', x, { stroke: `url(#${line.id}-edge)` }));
      lit.push(wordText(line, 'ghost__shine', x, { fill: `url(#${line.id}-shine)` }));
      lit.push(wordText(line, 'ghost__lit-edge', x, { stroke: `url(#${line.id}-edge)` }));
    }
    line.track.replaceChildren(...edges);
    line.litTrack.replaceChildren(...lit);
    const stripWidth = `${Math.ceil(count * line.unit)}px`;
    line.svg.style.width = stripWidth;
    line.litSvg.style.width = stripWidth;
  }

  function registerGhost(host) {
    root.dataset.ghostQuality = quality;
    if (host.querySelector(':scope > .ghost')) return;
    const ghost = document.createElement('div');
    ghost.className = 'ghost';
    ghost.setAttribute('aria-hidden', 'true');
    host.prepend(ghost);
    host.classList.add('has-ghost');
    host.dataset.ghost.split('|').filter(Boolean).forEach((word, index) => {
      const line = ghostLine(word, index);
      line.host = host;
      ghost.append(line.row);
      layoutGhostLine(line);
      ghosts.push(line);
    });
  }

  function relayoutGhosts() {
    ghosts.forEach(layoutGhostLine);
  }

  /** Drifts every line on screen and moves the lens; returns whether any line is on screen. */
  function updateGhosts(viewport, now) {
    const frameMs = lastFrameAt ? now - lastFrameAt : 0;
    const dt = Math.min(0.1, frameMs / 1000);
    lastFrameAt = now;
    const scrolled = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    const drifting = quality !== 'still';
    const lit = quality === 'full';
    let onScreen = false;
    ghosts.forEach((line) => {
      if (!line.unit) return;
      const rect = line.row.getBoundingClientRect();
      const visible = rect.bottom > -line.size && rect.top < viewport + line.size;
      // Only lines near the screen keep their own layer, so a long page does not hold every strip in memory.
      if (visible !== line.live) {
        line.live = visible;
        line.row.classList.toggle('is-live', visible);
      }
      if (!visible) return;
      onScreen = true;
      line.position += line.direction * ((drifting ? GHOST_SPEED * dt : 0) + Math.abs(scrolled) * GHOST_SCROLL_PULL);
      // The strip starts a word to the left of the line, so the screen's edge is always covered.
      const shift = -(((line.position % line.unit) + line.unit) % line.unit) - line.unit;
      const transform = `translate3d(${shift.toFixed(2)}px, 0, 0)`;
      line.svg.style.transform = transform;

      const localY = pointer.y - rect.top;
      const over = localY > -line.size * 0.25 && localY < rect.height + line.size * 0.25 && pointer.x > rect.left - 40;
      const target = over && lit ? 1 : 0;
      line.strength += (target - line.strength) * (target ? 0.14 : 0.07);
      if (over) {
        line.lensX = pointer.x - rect.left;
        line.lensY = localY;
      }
      const radius = line.strength < 0.01 ? 0 : line.size * 0.85 * line.strength;
      if (radius === 0) {
        // Out of the light: the lit layer is hidden, so nothing about it is drawn at all.
        if (line.shownRadius !== 0) line.litSvg.style.visibility = 'hidden';
        line.shownRadius = 0;
        return;
      }
      if (line.shownRadius === 0 || line.shownRadius === -1) line.litSvg.style.visibility = '';
      line.shownRadius = radius;
      line.litSvg.style.transform = transform;
      // The lens is placed in the lit strip's own coordinates, which move with it.
      line.litSvg.style.setProperty('--lx', `${(line.lensX - shift).toFixed(1)}px`);
      line.litSvg.style.setProperty('--ly', `${line.lensY.toFixed(1)}px`);
      line.litSvg.style.setProperty('--lr', `${radius.toFixed(1)}px`);
      line.shine.setAttribute('gradientTransform', `translate(${((line.lensX / Math.max(1, rect.width)) * 0.6).toFixed(3)} 0)`);
    });
    if (onScreen && drifting) watchFrameRate(frameMs);
    // At rest ("still") the words wait for the next scroll instead of asking for every frame.
    return onScreen && (drifting || ghosts.some((line) => line.shownRadius > 0));
  }

  function trackPointer(event) {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }

  // ---------- Sideways ----------

  const sideways = [];

  function registerSideways(section) {
    const track = section.querySelector('.sideways__track');
    if (!track) return;
    const entry = { section, track, distance: 0 };
    sideways.push(entry);
    measureSideways(entry);
  }

  function measureSideways(entry) {
    entry.distance = Math.max(0, entry.track.scrollWidth - window.innerWidth);
    // The section is as tall as the sideways distance, so a screen's worth of scrolling moves the track a screen.
    entry.section.style.height = `${entry.distance + window.innerHeight}px`;
  }

  function updateSideways() {
    sideways.forEach(({ section, track, distance }) => {
      const rect = section.getBoundingClientRect();
      const progress = clamp01(-rect.top / Math.max(1, rect.height - window.innerHeight));
      track.style.transform = `translate3d(${(-progress * distance).toFixed(1)}px, 0, 0)`;
      section.style.setProperty('--sideways-progress', progress.toFixed(4));
    });
  }

  // ---------- Rising headings and counts ----------

  /** Wraps each word of a heading in a mask, keeping inline elements (the accent dot) whole. */
  function splitWords(heading) {
    if (heading.dataset.risen !== undefined) return;
    heading.dataset.risen = '';
    let index = 0;
    const wrap = (content) => {
      const mask = document.createElement('span');
      mask.className = 'rise__mask';
      const word = document.createElement('span');
      word.className = 'rise__word';
      word.style.setProperty('--rise-i', index);
      index += 1;
      word.append(content);
      mask.append(word);
      return mask;
    };
    Array.from(heading.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/);
        const fragment = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          fragment.append(/^\s+$/.test(part) ? document.createTextNode(part) : wrap(document.createTextNode(part)));
        });
        node.replaceWith(fragment);
      } else if (node.nodeType === Node.ELEMENT_NODE && !node.matches('br')) {
        // An inline element right after a word (the "." of "statement.") rides with that word.
        const previous = node.previousSibling;
        if (previous && previous.classList && previous.classList.contains('rise__mask')) {
          previous.querySelector('.rise__word').append(node);
        } else {
          // Move the element itself, never a copy: other scripts hold on to it (the painted lettering fills
          // its letters with pictures), and a copy would leave them working on an element no longer shown.
          const parent = node.parentNode;
          const next = node.nextSibling;
          parent.insertBefore(wrap(node), next);
        }
      }
    });
    heading.classList.add('rise');
  }

  let seenObserver = null;

  function whenSeen(element, callback) {
    if (!('IntersectionObserver' in window)) {
      callback();
      return;
    }
    if (!seenObserver) {
      seenObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            seenObserver.unobserve(entry.target);
            entry.target.__onSeen();
          });
        },
        { rootMargin: '0px 0px -12% 0px' }
      );
    }
    element.__onSeen = callback;
    seenObserver.observe(element);
  }

  function registerRise(heading) {
    if (reduceMotion) return;
    splitWords(heading);
    whenSeen(heading, () => heading.classList.add('is-risen'));
  }

  function registerCount(counter) {
    const target = Number(counter.dataset.count);
    const digits = counter.dataset.countDigits ? Number(counter.dataset.countDigits) : 2;
    const show = (value) => {
      counter.textContent = String(value).padStart(digits, '0');
    };
    if (reduceMotion) {
      show(target);
      return;
    }
    show(0);
    whenSeen(counter, () => {
      const start = performance.now();
      const duration = 900;
      const step = (now) => {
        const t = clamp01((now - start) / duration);
        show(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // ---------- Next page ----------

  /** Where each page leads, so the whole portfolio can be read through in order. */
  function nextPage() {
    const page = document.body.dataset.page;
    const seriesId = document.body.dataset.series;
    const projectId = document.body.dataset.project;
    const U = window.WorksUtils;
    if (page === 'series' && seriesId) {
      const listed = (window.PORTFOLIO_SERIES || []).filter((series) => !series.galleryOnly);
      const place = listed.findIndex((series) => series.id === seriesId);
      if (place === -1) return null; // photography rooms lead on to the next room themselves
      const next = listed[place + 1];
      return next && U ? { label: next.title, href: U.seriesPage(next.id) } : { label: 'Interdisciplinary projects', href: 'projects' };
    }
    if (page === 'projects' && projectId) {
      const projects = window.PORTFOLIO_PROJECTS || [];
      const place = projects.findIndex((project) => project.id === projectId);
      const next = projects[place + 1];
      return next && U ? { label: next.title, href: U.projectPage(next.id) } : { label: 'Artist statement', href: 'artist-statement' };
    }
    const order = {
      home: { label: 'Gallery', href: 'gallery' },
      gallery: { label: 'Series', href: 'series' },
      series: { label: 'Interdisciplinary projects', href: 'projects' },
      projects: { label: 'Artist statement', href: 'artist-statement' },
      'artist-statement': { label: 'Resume', href: 'resume' },
      about: { label: 'Resume', href: 'resume' },
      resume: { label: 'Contact', href: 'contact' },
      contact: { label: 'Home', href: './' },
    };
    return order[page] || null;
  }

  function buildNextPage() {
    const footer = document.querySelector('.site-footer');
    const next = nextPage();
    if (!footer || !next || footer.querySelector('.next-page')) return;

    const link = document.createElement('a');
    link.className = 'next-page wrap';
    link.href = next.href;
    link.innerHTML =
      '<span class="next-page__label"><span>Next</span><span class="next-page__hint">Keep scrolling</span></span>' +
      '<span class="next-page__title"></span>' +
      '<span class="next-page__bar" aria-hidden="true"><span class="next-page__fill"></span></span>';
    link.querySelector('.next-page__title').textContent = next.label;
    footer.append(link);

    const fill = link.querySelector('.next-page__fill');
    const hint = link.querySelector('.next-page__hint');
    let pull = 0;
    let lastTick = 0;
    let leaving = false;
    const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

    const draw = () => {
      fill.style.transform = `scaleX(${pull.toFixed(4)})`;
      link.classList.toggle('is-pulling', pull > 0.02);
      hint.textContent = pull > 0.02 ? 'Keep going' : 'Keep scrolling';
    };
    let lastPullAt = 0;
    // An unfinished pull holds while scrolling goes on, and empties once it stops.
    const decay = (now) => {
      const dt = lastTick ? (now - lastTick) / 1000 : 0;
      lastTick = now;
      if (leaving) return;
      if (now - lastPullAt > PULL_HOLD_MS) pull = Math.max(0, pull - PULL_DECAY_PER_S * dt);
      draw();
      if (pull > 0) requestAnimationFrame(decay);
      else lastTick = 0;
    };
    const add = (pixels) => {
      if (leaving || pixels <= 0) return;
      lastPullAt = performance.now();
      const wasIdle = pull === 0;
      pull = clamp01(pull + Math.min(pixels, PULL_STEP_MAX) / PULL_TO_OPEN);
      draw();
      if (pull >= 1) {
        leaving = true;
        link.classList.add('is-leaving');
        setTimeout(() => location.assign(next.href), reduceMotion ? 0 : 450);
        return;
      }
      if (wasIdle) requestAnimationFrame(decay);
    };

    // Only a deliberate pull counts. A trackpad keeps sending scroll movement for a second or more after a
    // flick, so arriving at the bottom must be followed by a pause before scrolling on fills the bar.
    let lastWheelAt = 0;
    let armed = false;
    window.addEventListener('wheel', (event) => {
      const now = performance.now();
      const quietBefore = now - lastWheelAt;
      lastWheelAt = now;
      if (!atBottom()) {
        armed = false;
        return;
      }
      if (!armed && quietBefore > PULL_PAUSE_MS) armed = true;
      if (armed) add(event.deltaY);
    }, { passive: true });
    window.addEventListener('scroll', () => {
      if (!atBottom()) armed = false;
    }, { passive: true });
    // On a touch screen the finger must already be at the bottom when the pull begins.
    let touchY = null;
    window.addEventListener('touchstart', (event) => {
      touchY = atBottom() ? event.touches[0].clientY : null;
    }, { passive: true });
    window.addEventListener('touchmove', (event) => {
      if (touchY === null) return;
      const y = event.touches[0].clientY;
      add((touchY - y) * 1.6);
      touchY = y;
    }, { passive: true });
    window.addEventListener('touchend', () => { touchY = null; }, { passive: true });
  }

  // ---------- The frame loop ----------

  let frameRequested = false;

  function frame(now) {
    frameRequested = false;
    const viewport = window.innerHeight;
    updateWash(viewport);
    if (!reduceMotion) {
      updateSideways();
      // The giant words keep drifting while any of them is on screen.
      if (ghosts.length && updateGhosts(viewport, now)) requestFrame();
      else lastFrameAt = 0;
    }
  }

  function requestFrame() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(frame);
  }

  function refresh() {
    if (FEATURES.wash) document.querySelectorAll('[data-wash]').forEach(registerWash);
    if (!reduceMotion) {
      if (FEATURES.ghosts) document.querySelectorAll('[data-ghost]').forEach(registerGhost);
      if (FEATURES.sideways) {
        document.querySelectorAll('[data-sideways]').forEach((section) => {
          if (!sideways.some((entry) => entry.section === section)) registerSideways(section);
        });
      }
    }
    if (FEATURES.rise) {
      document.querySelectorAll(RISING_HEADINGS).forEach((heading) => {
        if (!heading.closest('.visually-hidden, .hero, .exhibit') && !heading.classList.contains('visually-hidden')) registerRise(heading);
      });
    }
    if (FEATURES.draw) {
      document.querySelectorAll('[data-draw]:not(.is-drawn)').forEach((line) => {
        if (reduceMotion) line.classList.add('is-drawn');
        else whenSeen(line, () => line.classList.add('is-drawn'));
      });
    }
    if (FEATURES.counts) {
      document.querySelectorAll('[data-count]:not([data-counted])').forEach((counter) => {
        counter.dataset.counted = '';
        registerCount(counter);
      });
    }
    requestFrame();
  }

  function start() {
    refresh();
    if (FEATURES.nextPage) buildNextPage();
    window.addEventListener('scroll', requestFrame, { passive: true });
    if (ghosts.length) {
      window.addEventListener('pointermove', (event) => {
        trackPointer(event);
        requestFrame();
      }, { passive: true });
    }
    // The repeats are measured in the outline font, so they are laid out again once it has loaded.
    if (ghosts.length && document.fonts && document.fonts.ready) document.fonts.ready.then(relayoutGhosts);
    window.addEventListener('resize', () => {
      relayoutGhosts();
      sideways.forEach(measureSideways);
      requestFrame();
    });
    // Sampled colours arrive after the first frame; check again once pictures have loaded.
    window.addEventListener('load', requestFrame);
    setTimeout(requestFrame, 600);
  }

  window.ScrollScenes = { refresh, features: FEATURES };
  // A deferred script runs before DOMContentLoaded, but before pages.js has marked its scenes: wait for it.
  if (document.readyState === 'complete') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
