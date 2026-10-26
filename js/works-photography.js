/**
 * Photography. Only photographs that belong to a series are on the site; more are added a series at a time.
 *
 * Each series lists its frames as [photo number, year, height in pixels of the largest file]. The number is
 * the photograph's place in the full capture-date order, so it names its files (photo-0572-600.jpg and so
 * on) and never changes when photographs are added or removed. A series' frames are shown in this order, and
 * the series must also be listed in series-data.js, which gives it its page and its note.
 *
 * Every photo has three files (-600, -1200, -1800) whose real pixel widths are WIDTHS below. To add a series,
 * run tools/optimize_images.py on its originals, then add a block here and an entry in series-data.js.
 */
(function (root, works) {
  if (typeof module === 'object' && module.exports) {
    module.exports = works;
  } else {
    root.PORTFOLIO_PHOTOS = works;
  }
})(typeof self !== 'undefined' ? self : this, (function () {
  'use strict';

  const WIDTHS = [600, 1100, 1600];

  const SERIES = [
    {
      title: 'Stage Light',
      frames: [
        [572, 2026, 2400], [575, 2026, 2400], [579, 2026, 2400], [586, 2026, 2400], [588, 2026, 2400],
        [594, 2026, 2400], [597, 2026, 2400], [606, 2026, 2400], [609, 2026, 2400], [611, 2026, 2400],
      ],
    },
    {
      title: 'Through the Window',
      frames: [
        [85, 2024, 1200], [86, 2024, 2133], [87, 2024, 2133], [110, 2024, 2134], [132, 2025, 1200],
        [143, 2025, 2133], [145, 2025, 2133], [84, 2024, 1200], [150, 2025, 2134], [441, 2025, 2409],
        [447, 2025, 2126],
      ],
    },
  ];

  return SERIES.flatMap(({ title, frames }) =>
    frames.map(([number, year, height], index) => {
      const id = String(number).padStart(4, '0');
      return {
        id: `photo-${id}`,
        // A frame is named by its place in its series until it has a title of its own.
        title: `${title}, ${index + 1} of ${frames.length}`,
        year,
        medium: 'Photography',
        dimensions: null,
        category: 'photography',
        base: `photography/photo-${id}`,
        ws: WIDTHS.slice(),
        w: WIDTHS[WIDTHS.length - 1],
        h: height,
      };
    })
  );
})());
