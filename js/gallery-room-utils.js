/**
 * Pure helpers for the gallery room (gallery-room.js): real sizes in inches, how works are grouped into
 * stretches of wall, and the one scale that hangs them all. No DOM access, so it is unit tested under Node
 * and exposes window.GalleryRoomUtils in the browser.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GalleryRoomUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Moulding, then the dark float gap around a canvas or the mat around a work on paper, in inches.
  // Each category listed here is shown on the wall.
  const FRAMING = Object.freeze({
    painting: Object.freeze({ moulding: 0.82, inner: 0.3 }),
    print: Object.freeze({ moulding: 0.6, inner: 2.8 }),
    drawing: Object.freeze({ moulding: 0.6, inner: 2.8 }),
  });

  const FALLBACK_LONG_SIDE_IN = 16; // for works with no size in the catalogue
  const GROUP_SPACING_IN = 3; // between frames hung together

  /** The categories that are shown on the wall. */
  const WALL_CATEGORIES = Object.freeze(Object.keys(FRAMING));

  const isWallCategory = (category) => WALL_CATEGORIES.includes(category);

  /**
   * Width and height in inches. The catalogue lists sizes in either order ("12x9" and "9x12" are both used for
   * portrait works), so the longer number goes with the photograph's longer side and the other side follows
   * the photograph's proportions.
   */
  function sizeInches(work) {
    const match = /([\d.]+)\s*x\s*([\d.]+)\s*(?:inches|inch|in)\b/i.exec(work.dimensions || '');
    const longSide = match ? Math.max(Number(match[1]), Number(match[2])) : FALLBACK_LONG_SIDE_IN;
    const ratio = work.w / work.h;
    return ratio >= 1 ? { w: longSide, h: longSide / ratio } : { w: longSide * ratio, h: longSide };
  }

  /** Outer size in inches once framed. */
  function framedInches(work) {
    const framing = FRAMING[work.category] || FRAMING.painting;
    const picture = sizeInches(work);
    const edge = 2 * (framing.moulding + framing.inner);
    return { w: picture.w + edge, h: picture.h + edge, picture, framing };
  }

  /**
   * Stretches of wall, in order: one work each, except series marked `hangTogether`, whose visible works share
   * one stretch at the place of the first of them.
   */
  function wallSections(works, seriesList = []) {
    const groupOf = new Map();
    seriesList
      .filter((series) => series.hangTogether && Array.isArray(series.workIds))
      .forEach((series) => series.workIds.forEach((id) => groupOf.set(id, series)));

    const sections = [];
    const placed = new Map();
    works.forEach((work) => {
      const series = groupOf.get(work.id);
      if (!series) {
        sections.push({ id: work.id, works: [work], series: null });
        return;
      }
      if (placed.has(series.id)) {
        placed.get(series.id).works.push(work);
        return;
      }
      const section = { id: `series-${series.id}`, works: [work], series };
      placed.set(series.id, section);
      sections.push(section);
    });
    // Keep a series in its own order, not the gallery's.
    placed.forEach((section) => {
      const order = section.series.workIds;
      section.works.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    });
    return sections;
  }

  /** Columns and rows for a group: two rows once there are more than three works. */
  function groupGrid(count) {
    const rows = count > 3 ? 2 : 1;
    return { columns: Math.ceil(count / rows), rows };
  }

  /** Outer size in inches of everything hung on one stretch of wall. */
  function sectionInches(section) {
    const sizes = section.works.map(framedInches);
    if (sizes.length === 1) return { w: sizes[0].w, h: sizes[0].h };
    const { columns, rows } = groupGrid(sizes.length);
    const cellW = Math.max(...sizes.map((size) => size.w));
    const cellH = Math.max(...sizes.map((size) => size.h));
    return {
      w: columns * cellW + (columns - 1) * GROUP_SPACING_IN,
      h: rows * cellH + (rows - 1) * GROUP_SPACING_IN,
    };
  }

  /**
   * Pixels per inch for each section. Single works share one scale, so a 24 in panel hangs visibly larger
   * than a 12 in study; a group may be scaled down further so the whole group still fits its wall.
   */
  function sectionScales(sections, available) {
    const fit = (size) => Math.min(available.w / size.w, available.h / size.h);
    const singles = sections.filter((section) => section.works.length === 1).map(sectionInches);
    const shared = singles.length ? Math.min(...singles.map(fit)) : Infinity;
    return sections.map((section) => {
      const scale = Math.min(shared, fit(sectionInches(section)));
      return Number.isFinite(scale) ? scale : 1;
    });
  }

  /** Works in the order they hang, for stepping through them in the close-up. */
  function hangingOrder(sections) {
    return sections.flatMap((section) => section.works);
  }

  /** Index of the section holding a work, or -1. */
  function sectionIndexOf(sections, workId) {
    return sections.findIndex((section) => section.works.some((work) => work.id === workId));
  }

  return {
    FRAMING,
    GROUP_SPACING_IN,
    WALL_CATEGORIES,
    isWallCategory,
    sizeInches,
    framedInches,
    wallSections,
    groupGrid,
    sectionInches,
    sectionScales,
    hangingOrder,
    sectionIndexOf,
  };
});
