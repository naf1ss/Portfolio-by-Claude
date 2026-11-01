/**
 * Scroll scenes: effects tied to how far the page has been scrolled. The browser's own scrolling is left alone;
 * each effect reads its element's place on the screen once per frame and sets a few styles.
 *
 *   [data-wash]          the page takes this element's colour while it holds the middle of the screen. The colour
 *                        is `data-wash-color`, or is sampled from the picture at `data-wash-src` and deepened
 *                        into a wall colour with light text.
 *   [data-ghost]         a huge outlined word slides sideways behind the element's heading and fills with the
 *                        painting at `data-ghost-paint` as the element reaches the middle of the screen.
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

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WASH_LINE = 0.5; // the part of the screen (from the top) whose element sets the page colour
  const PULL_TO_OPEN = 900; // pixels of scrolling past the bottom that fill the next-page bar
  const PULL_DECAY_PER_S = 1.4; // how fast an unfinished pull empties again, in bars per second

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
    };
  }

  const washes = new Map(); // element -> wall colours (null until sampled)
  let currentWash = null;

  function registerWash(element) {
    if (washes.has(element)) return;
    root.classList.add('has-wash');
    washes.set(element, null);
    if (element.dataset.washColor) {
      washes.set(element, wallFrom(hexToRgb(element.dataset.washColor)));
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

  const ghosts = [];

  function registerGhost(host) {
    if (host.querySelector(':scope > .ghost')) return;
    const word = host.dataset.ghost;
    const ghost = document.createElement('div');
    ghost.className = 'ghost';
    ghost.setAttribute('aria-hidden', 'true');
    const outline = document.createElement('span');
    outline.className = 'ghost__word ghost__word--outline';
    outline.textContent = word;
    const paint = document.createElement('span');
    paint.className = 'ghost__word ghost__word--paint';
    paint.textContent = word;
    if (host.dataset.ghostPaint) paint.style.backgroundImage = `url("${host.dataset.ghostPaint}")`;
    ghost.append(outline, paint);
    host.prepend(ghost);
    host.classList.add('has-ghost');
    ghosts.push({ host, ghost, paint });
  }

  function updateGhosts(viewport) {
    ghosts.forEach(({ host, ghost, paint }) => {
      const rect = host.getBoundingClientRect();
      if (rect.bottom < -viewport || rect.top > viewport * 2) return;
      const progress = travel(rect, viewport);
      // Slides from right to left across the whole pass; fills with paint around the middle of it.
      ghost.style.transform = `translate3d(${(18 - progress * 46).toFixed(2)}vw, 0, 0)`;
      const fill = clamp01(1 - Math.abs(progress - 0.42) / 0.16);
      paint.style.clipPath = `inset(0 ${((1 - fill) * 100).toFixed(1)}% 0 0)`;
    });
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
          node.replaceWith(wrap(node.cloneNode(true)));
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
      return next && U ? { label: next.title, href: U.seriesPage(next.id) } : { label: 'Interdisciplinary projects', href: 'projects.html' };
    }
    if (page === 'projects' && projectId) {
      const projects = window.PORTFOLIO_PROJECTS || [];
      const place = projects.findIndex((project) => project.id === projectId);
      const next = projects[place + 1];
      return next && U ? { label: next.title, href: U.projectPage(next.id) } : { label: 'Artist statement', href: 'artist-statement.html' };
    }
    const order = {
      home: { label: 'Gallery', href: 'gallery.html' },
      gallery: { label: 'Series', href: 'series.html' },
      series: { label: 'Interdisciplinary projects', href: 'projects.html' },
      projects: { label: 'Artist statement', href: 'artist-statement.html' },
      'artist-statement': { label: 'Resume', href: 'resume.html' },
      about: { label: 'Resume', href: 'resume.html' },
      resume: { label: 'Contact', href: 'contact.html' },
      contact: { label: 'Home', href: 'index.html' },
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
    const decay = (now) => {
      const dt = lastTick ? (now - lastTick) / 1000 : 0;
      lastTick = now;
      if (leaving) return;
      pull = Math.max(0, pull - PULL_DECAY_PER_S * dt * (pull > 0.85 ? 0.4 : 1));
      draw();
      if (pull > 0) requestAnimationFrame(decay);
      else lastTick = 0;
    };
    const add = (pixels) => {
      if (leaving || pixels <= 0 || !atBottom()) return;
      const wasIdle = pull === 0;
      pull = clamp01(pull + pixels / PULL_TO_OPEN);
      draw();
      if (pull >= 1) {
        leaving = true;
        link.classList.add('is-leaving');
        setTimeout(() => location.assign(next.href), reduceMotion ? 0 : 450);
        return;
      }
      if (wasIdle) requestAnimationFrame(decay);
    };

    window.addEventListener('wheel', (event) => add(event.deltaY), { passive: true });
    let touchY = null;
    window.addEventListener('touchstart', (event) => { touchY = event.touches[0].clientY; }, { passive: true });
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

  function frame() {
    frameRequested = false;
    const viewport = window.innerHeight;
    updateWash(viewport);
    if (!reduceMotion) {
      updateGhosts(viewport);
      updateSideways();
    }
  }

  function requestFrame() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(frame);
  }

  function refresh() {
    document.querySelectorAll('[data-wash]').forEach(registerWash);
    if (!reduceMotion) {
      document.querySelectorAll('[data-ghost]').forEach(registerGhost);
      document.querySelectorAll('[data-sideways]').forEach((section) => {
        if (!sideways.some((entry) => entry.section === section)) registerSideways(section);
      });
    }
    document.querySelectorAll('h1, [data-rise]').forEach((heading) => {
      if (!heading.closest('.visually-hidden, .hero, .exhibit') && !heading.classList.contains('visually-hidden')) registerRise(heading);
    });
    document.querySelectorAll('[data-draw]:not(.is-drawn)').forEach((line) => {
      if (reduceMotion) line.classList.add('is-drawn');
      else whenSeen(line, () => line.classList.add('is-drawn'));
    });
    document.querySelectorAll('[data-count]:not([data-counted])').forEach((counter) => {
      counter.dataset.counted = '';
      registerCount(counter);
    });
    requestFrame();
  }

  function start() {
    refresh();
    buildNextPage();
    window.addEventListener('scroll', requestFrame, { passive: true });
    window.addEventListener('resize', () => {
      sideways.forEach(measureSideways);
      requestFrame();
    });
    // Sampled colours arrive after the first frame; check again once pictures have loaded.
    window.addEventListener('load', requestFrame);
    setTimeout(requestFrame, 600);
  }

  window.ScrollScenes = { refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
