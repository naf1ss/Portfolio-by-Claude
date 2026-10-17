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

  // Display order of the medium filters.
  const CATEGORIES = Object.freeze([
    { id: 'painting', label: 'Painting' },
    { id: 'mixed', label: 'Mixed media' },
    { id: 'drawing', label: 'Drawing' },
    { id: 'print', label: 'Prints' },
    { id: 'digital', label: 'Digital' },
    { id: 'photography', label: 'Photography' },
    { id: 'ceramics', label: 'Ceramics' },
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

  function imageUrl(work, suffix, imageRoot = IMAGE_ROOT) {
    return `${imageRoot}${work.base}-${suffix}.jpg`;
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

  /** Reads the `?c=` filter from a query string, falling back to "all". */
  function categoryFromSearch(search) {
    const value = new URLSearchParams(search || '').get('c');
    return isCategory(value) ? value : 'all';
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

  /**
   * Whether a point lies on the visible picture inside an object-fit: contain
   * box. The element's box is larger than the picture whenever their shapes
   * differ, so a click in the empty margin must not count as a click on the work.
   *   box: { left, top, width, height } of the <img>; point: { x, y }
   */
  function isPointOnContainedPicture(box, work, point) {
    const scale = Math.min(box.width / work.w, box.height / work.h);
    const width = work.w * scale;
    const height = work.h * scale;
    const left = box.left + (box.width - width) / 2;
    const top = box.top + (box.height - height) / 2;
    return point.x >= left && point.x <= left + width && point.y >= top && point.y <= top + height;
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
    aspectRatio,
    filterWorks,
    countByCategory,
    sortWorks,
    formatDimensions,
    metaLine,
    altText,
    captionParts,
    accessibleName,
    categoryFromSearch,
    workIdFromHash,
    hashForWork,
    isPointOnContainedPicture,
  };
});
