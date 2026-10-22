/**
 * Pure helpers shared by the gallery, the lightbox and the tests.
 *
 * Loaded as a classic script in the browser (exposes window.WorksUtils) and
 * with require() under Node, so everything here must stay free of DOM access.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WorksUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const IMAGE_ROOT = 'images/';

  // Filename suffixes written by the image-optimisation step, smallest first.
  const SIZE_SUFFIXES = Object.freeze([600, 1200, 1800]);

  // Display order of the medium filters. `onHome: false` keeps a category in the gallery filters only,
  // out of the home page's "Browse by medium" list.
  const CATEGORIES = Object.freeze([
    { id: 'painting', label: 'Painting' },
    { id: 'drawing', label: 'Drawing' },
    { id: 'print', label: 'Prints' },
    { id: 'digital', label: 'Digital' },
    { id: 'photography', label: 'Photography' },
    { id: 'ceramics', label: 'Ceramics' },
    { id: 'wall-magazine', label: 'Wall magazine', onHome: false },
  ]);

  // Large contact-sheet categories are listed after the artwork in the "All" view
  // and shown without per-tile captions.
  const BULK_CATEGORIES = Object.freeze(['photography']);

  function isCategory(value) {
    return CATEGORIES.some((category) => category.id === value);
  }

  function isBulk(work) {
    return BULK_CATEGORIES.includes(work.category);
  }

  /**
   * `work.rev` is bumped whenever a work's photo is replaced under the same file name; the query string makes
   * browsers and CDNs fetch the new pictures instead of reusing cached ones.
   */
  function imageUrl(work, suffix, imageRoot = IMAGE_ROOT) {
    const revision = work.rev ? `?v=${work.rev}` : '';
    return `${imageRoot}${work.base}-${suffix}.jpg${revision}`;
  }

  /**
   * Builds a srcset using each file's real pixel width. Sources smaller than
   * a target size are never upscaled, so `work.ws[i]` can be lower than the
   * filename suffix, repeated widths are collapsed to one entry, and works
   * with fewer than three sizes (small photographs) simply list fewer files.
   */
  function buildSrcset(work, imageRoot = IMAGE_ROOT) {
    const seenWidths = new Set();
    const entries = [];
    SIZE_SUFFIXES.forEach((suffix, i) => {
      const width = work.ws[i];
      if (width === undefined || seenWidths.has(width)) return;
      seenWidths.add(width);
      entries.push(`${imageUrl(work, suffix, imageRoot)} ${width}w`);
    });
    return entries.join(', ');
  }

  /** The `src` for browsers without srcset: the mid size, or the largest that exists. */
  function fallbackUrl(work, imageRoot = IMAGE_ROOT) {
    const index = Math.min(1, work.ws.length - 1);
    return imageUrl(work, SIZE_SUFFIXES[index], imageRoot);
  }

  /** The largest file that exists for a work (small photographs have fewer than three sizes). */
  function largestUrl(work, imageRoot = IMAGE_ROOT) {
    return imageUrl(work, SIZE_SUFFIXES[work.ws.length - 1], imageRoot);
  }

  function aspectRatio(work) {
    return Number((work.w / work.h).toFixed(4));
  }

  function filterWorks(works, category) {
    return category === 'all'
      ? works.slice()
      : works.filter((work) => work.category === category);
  }

  function countByCategory(works) {
    const counts = { all: works.length };
    CATEGORIES.forEach(({ id }) => {
      counts[id] = 0;
    });
    works.forEach((work) => {
      counts[work.category] = (counts[work.category] || 0) + 1;
    });
    return counts;
  }

  /**
   * Artwork first, then bulk categories (photography); within each group newest
   * first, undated last, and ties keep their catalogue order.
   */
  function sortWorks(works) {
    return works
      .map((work, index) => ({ work, index }))
      .sort((a, b) => {
        const rankDiff = Number(isBulk(a.work)) - Number(isBulk(b.work));
        if (rankDiff !== 0) return rankDiff;
        const yearDiff = (b.work.year || 0) - (a.work.year || 0);
        return yearDiff !== 0 ? yearDiff : a.index - b.index;
      })
      .map(({ work }) => work);
  }

  /**
   * Puts the works of a category in a hand-picked order (`order`: { category: [ids] }), best first. Listed works
   * come first in the order given and the rest follow as they were; each category keeps the places it held in
   * the list, so "All" still interleaves the media as before.
   */
  function applyCuratedOrder(works, order = {}) {
    const result = works.slice();
    Object.entries(order).forEach(([category, ids]) => {
      const places = [];
      result.forEach((work, i) => {
        if (work.category === category) places.push(i);
      });
      const inCategory = places.map((i) => result[i]);
      const rank = (work) => {
        const at = ids.indexOf(work.id);
        return at === -1 ? ids.length : at;
      };
      const ordered = inCategory
        .map((work, i) => ({ work, i }))
        .sort((a, b) => rank(a.work) - rank(b.work) || a.i - b.i)
        .map(({ work }) => work);
      places.forEach((place, k) => {
        result[place] = ordered[k];
      });
    });
    return result;
  }

  /** "12x9 inches" -> "12 × 9 in"; "1526x2048 px" -> "1526 × 2048 px". */
  function formatDimensions(dimensions) {
    if (!dimensions) return '';
    const match = /^\s*([\d.]+)\s*x\s*([\d.]+)\s*(inches|inch|in|px)\s*$/i.exec(dimensions);
    if (!match) return dimensions.trim();
    const unit = /^inch/i.test(match[3]) ? 'in' : match[3].toLowerCase();
    return `${match[1]} × ${match[2]} ${unit}`;
  }

  /** "2026 · Oil on Paper"; works without a year or title still read cleanly. */
  function metaLine(work) {
    return [work.year, work.medium].filter(Boolean).join(' · ');
  }

  /** Alt text for the large view, where the image is the content. */
  function altText(work) {
    if (!work.title) return work.medium || 'Artwork';
    const detail = [work.medium, work.year].filter(Boolean).join(', ');
    return detail ? `${work.title}, ${detail}` : work.title;
  }

  /** Title and detail line for the large view. Untitled works lead with their medium. */
  function captionParts(work) {
    const dimensions = formatDimensions(work.dimensions);
    if (work.title) {
      return { title: work.title, meta: [metaLine(work), dimensions].filter(Boolean).join(' · ') };
    }
    return {
      title: work.medium || 'Artwork',
      meta: [work.year, dimensions].filter(Boolean).join(' · '),
    };
  }

  /** Link name for a gallery tile; untitled works are numbered by position. */
  function accessibleName(work, position) {
    return work.title || `${work.medium || 'Artwork'}, photograph ${position}`;
  }

  // Categories that were merged into another; keeps old shared links (?c=mixed) working.
  const RENAMED_CATEGORIES = Object.freeze({ mixed: 'painting' });

  /** Reads the `?c=` filter from a query string ("all" included), or `fallback` when it is missing or unknown. */
  function categoryFromSearch(search, fallback = 'all') {
    const raw = new URLSearchParams(search || '').get('c');
    const value = RENAMED_CATEGORIES[raw] || raw;
    if (value === 'all') return 'all';
    return isCategory(value) ? value : fallback;
  }

  /** Resolves a "#a012"-style hash to a work id, or null if none matches. */
  function workIdFromHash(hash, works) {
    let wanted;
    try {
      wanted = decodeURIComponent(String(hash || '').replace(/^#/, '')).toLowerCase();
    } catch (error) {
      return null;
    }
    if (!wanted) return null;
    const match = works.find((work) => work.id.toLowerCase() === wanted);
    return match ? match.id : null;
  }

  function hashForWork(work) {
    return `#${work.id.toLowerCase()}`;
  }

  /** The works a series contains: its listed ids in order, or everything matching its category / year. */
  function worksInSeries(series, works) {
    if (series.workIds) {
      const byId = new Map(works.map((work) => [work.id, work]));
      return series.workIds.map((id) => byId.get(id)).filter(Boolean);
    }
    return works.filter(
      (work) =>
        (!series.category || work.category === series.category) && (!series.year || work.year === series.year)
    );
  }

  /** "7 works" or "63 works · 2023" / "12 works · 2024–2026". */
  function seriesMeta(works) {
    const years = works.map((work) => work.year).filter(Boolean);
    const first = Math.min(...years);
    const last = Math.max(...years);
    const span = years.length === 0 ? null : first === last ? String(first) : `${first}–${last}`;
    const count = `${works.length} ${works.length === 1 ? 'work' : 'works'}`;
    return span ? `${count} · ${span}` : count;
  }

  const COVER_WORK_LIMIT = 3;

  /** The works set on a series card: its coverIds that exist, else its first works. */
  function seriesCoverWorks(series, works, byId) {
    const chosen = (series.coverIds || []).map((id) => byId.get(id)).filter(Boolean);
    return (chosen.length ? chosen : works).slice(0, COVER_WORK_LIMIT);
  }

  /**
   * Widths, in % of a row of the given shape (width / height), for pictures of these aspect ratios hung side
   * by side at one common height with `gap` (a fraction of the row width) between them: as large as fits.
   */
  function coverRowWidths(ratios, { rowRatio, gap }) {
    if (!ratios.length) return [];
    const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
    const height = Math.min(1 / rowRatio, (1 - gap * (ratios.length - 1)) / totalRatio); // in row widths
    return ratios.map((ratio) => ratio * height * 100);
  }

  /** Up to `count` distinct items in random order; `random` is injectable so tests are deterministic. */
  function pickRandom(items, count, random = Math.random) {
    const pool = items.slice();
    const picked = [];
    while (picked.length < count && pool.length > 0) {
      picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    }
    return picked;
  }

  /**
   * One work per medium for the home page. Each pick names its category and a `best` work. With `showBest`
   * the best works are returned; otherwise a random visible work of that medium (the best one included).
   * Picks whose category has no visible works are skipped.
   */
  function pickMediumWorks(works, picks, { showBest, random = Math.random }) {
    const chosen = [];
    picks.forEach(({ category, best }) => {
      const pool = works.filter((work) => work.category === category && !work.hidden);
      const bestWork = pool.find((work) => work.id === best);
      const work = showBest && bestWork ? bestWork : pickRandom(pool, 1, random)[0];
      if (work) chosen.push(work);
    });
    return chosen;
  }

  return {
    IMAGE_ROOT,
    SIZE_SUFFIXES,
    CATEGORIES,
    isCategory,
    isBulk,
    imageUrl,
    buildSrcset,
    fallbackUrl,
    largestUrl,
    aspectRatio,
    filterWorks,
    countByCategory,
    sortWorks,
    applyCuratedOrder,
    formatDimensions,
    metaLine,
    altText,
    captionParts,
    accessibleName,
    categoryFromSearch,
    workIdFromHash,
    hashForWork,
    worksInSeries,
    seriesMeta,
    seriesCoverWorks,
    coverRowWidths,
    pickRandom,
    pickMediumWorks,
  };
});
