/**
 * Photography. Only photographs that belong to a series are on the site; series are added one at a time.
 *
 * Each block is one series, its frames in the order they are shown. The block's `series` is the id of its
 * entry in series-data.js (which gives the series its statement and its room) and `title` must match it.
 *
 *   { file, year, w, h }   a photograph in images/photography/<series>/: <file>-600.jpg, -1200.jpg and -1800.jpg,
 *                          made by tools/optimize_images.py; w and h are the size of the largest file
 *   { photo, year, h }     one of the earlier photographs, images/photography/photo-NNNN-*.jpg, whose three
 *                          files are 600, 1100 and 1600 pixels wide
 *
 * To add a series: run tools/optimize_images.py <folder of originals> images/photography/<series-id>, add a
 * block here, and add the series (with its statement and treatment) to series-data.js.
 */
(function (root, works) {
  if (typeof module === 'object' && module.exports) {
    module.exports = works;
  } else {
    root.PORTFOLIO_PHOTOS = works;
  }
})(typeof self !== 'undefined' ? self : this, (function () {
  'use strict';

  const SUFFIXES = [600, 1200, 1800]; // the optimiser never upscales, so a narrow photo's files stop at its width
  const EARLIER_WIDTHS = [600, 1100, 1600];

  const SERIES = [
    {
      series: 'negligible',
      title: 'Negligible',
      frames: [
        { file: 'img-9408', year: 2025, w: 1800, h: 2400 },
        { file: 'england', year: 2025, w: 1800, h: 2400 },
        { file: 'img-8819', year: 2025, w: 1800, h: 2400 },
        { file: 'img-8826', year: 2025, w: 1800, h: 2400 },
        { file: 'england-8', year: 2025, w: 1800, h: 2400 },
        { file: '20250313-img-0927', year: 2025, w: 1800, h: 2400 },
        { file: '20240111-img-1352', year: 2024, w: 1800, h: 2400 },
        { file: 'img-9324', year: 2025, w: 1800, h: 2400 },
        { file: '20231119-img-0127', year: 2023, w: 1800, h: 2400 },
        { file: '20250409-img-2190', year: 2025, w: 1800, h: 2400 },
        { file: '20250314-img-1497', year: 2025, w: 1800, h: 2233 },
        { file: '20250315-img-1719', year: 2025, w: 1800, h: 2400 },
        { file: 'archseries-116', year: 2025, w: 1800, h: 2400 },
      ],
    },
    {
      series: 'architecture',
      title: 'Architecture',
      frames: [
        { file: 'archseries-3', year: 2025, w: 1800, h: 2400 },
        { file: 'archseries-5', year: 2025, w: 1800, h: 2400 },
        { file: 'archseries-6', year: 2025, w: 1800, h: 2400 },
        { file: 'archseries-8', year: 2025, w: 1800, h: 2400 },
        { file: 'archseries-10', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-15', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-17', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-18', year: 2026, w: 1800, h: 2700 },
        { file: 'archseries-21', year: 2026, w: 1800, h: 1186 },
        { file: 'archseries-22', year: 2026, w: 1800, h: 2140 },
        { file: 'archseries-24', year: 2026, w: 1800, h: 1302 },
        { file: 'archseries-25', year: 2026, w: 1800, h: 2700 },
        { file: 'archseries-26', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-28', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-30', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-45', year: 2026, w: 1800, h: 2700 },
        { file: 'archseries-46', year: 2026, w: 1800, h: 2670 },
        { file: 'archseries-58', year: 2026, w: 1536, h: 2048 },
        { file: 'archseries-59', year: 2026, w: 1536, h: 2048 },
        { file: 'archseries-60', year: 2026, w: 1536, h: 2048 },
        { file: 'archseries-61', year: 2026, w: 1536, h: 2048 },
        { file: 'archseries-68', year: 2025, w: 1800, h: 2282 },
        { file: 'archseries-69', year: 2025, w: 1800, h: 1350 },
        { file: 'archseries-80', year: 2025, w: 1800, h: 2400 },
        { file: 'england-55', year: 2025, w: 1800, h: 2400 },
        { file: 'england-58', year: 2025, w: 1800, h: 2400 },
        { file: 'england-88', year: 2025, w: 1800, h: 2400 },
        { file: 'england-80', year: 2025, w: 1800, h: 1350 },
        { file: 'archseries-31', year: 2026, w: 1800, h: 2700 },
        { file: 'archseries-41', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-42', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-44', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-49', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-51', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-54', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-56', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-57', year: 2026, w: 1536, h: 2048 },
        { file: 'archseries-64', year: 2026, w: 1800, h: 2700 },
        { file: 'archseries-65', year: 2026, w: 1800, h: 1200 },
        { file: 'archseries-66', year: 2026, w: 1800, h: 2092 },
        { file: 'archseries-71', year: 2025, w: 1800, h: 2400 },
        { file: 'archseries-73', year: 2025, w: 1800, h: 2400 },
        { file: 'archseries-99', year: 2025, w: 1800, h: 2460 },
        { file: '20231121-img-0297', year: 2023, w: 1800, h: 2400 },
        { file: 'archseries-27', year: 2026, w: 1800, h: 1256 },
        { file: 'archseries-75', year: 2025, w: 1800, h: 2202 },
        { file: 'archseries-92', year: 2025, w: 1800, h: 2400 },
        { file: 'archseries-118', year: 2025, w: 1800, h: 1350 },
        { file: '20231121-img-0298', year: 2023, w: 1800, h: 2400 },
      ],
    },
    {
      series: 'the-light-hits',
      title: 'The Light Hits',
      frames: [
        { file: '20250327-img-1949', year: 2025, w: 1800, h: 1350 },
        { file: '20231102-img-8894', year: 2023, w: 1800, h: 1350 },
        { file: '20250509-img-2917', year: 2025, w: 1800, h: 1573 },
        { file: 'springpictures-12', year: 2026, w: 1800, h: 2700 },
        { file: '20240531-img-4929', year: 2024, w: 1800, h: 1350 },
        { file: 'springpictures-2', year: 2026, w: 1800, h: 1481 },
        { file: '20241126-img-7913', year: 2024, w: 1800, h: 1350 },
        { file: '20250426-img-2664', year: 2025, w: 1800, h: 2201 },
        { file: '20250413-img-2258', year: 2025, w: 1800, h: 2400 },
        { file: 'england-34', year: 2025, w: 1800, h: 2400 },
        { file: '20231123-img-0799', year: 2023, w: 1800, h: 2400 },
        { file: '20221022-img-0913', year: 2022, w: 1800, h: 2220 },
        { file: '20250308-img-9909', year: 2025, w: 1800, h: 2400 },
        { file: '20250308-img-9852', year: 2025, w: 1800, h: 2400 },
        { file: 'england-10', year: 2025, w: 1800, h: 2400 },
        { file: '20230211-img-3239', year: 2023, w: 1800, h: 1012 },
        { file: 'archseries-77', year: 2025, w: 1800, h: 2400 },
      ],
    },
    {
      series: 'straight-from-ghost-stories',
      title: 'Straight from Ghost Stories',
      frames: [
        { file: '20250206-img-9259-2', year: 2025, w: 1800, h: 2400 },
        { file: '20250206-img-9254', year: 2025, w: 1800, h: 2400 },
        { file: '20250206-img-9256', year: 2025, w: 1800, h: 2400 },
        { file: '20250206-img-9252', year: 2025, w: 1800, h: 2400 },
        { file: '20241109-img-7436', year: 2024, w: 1800, h: 2400 },
        { file: '20241127-img-8046', year: 2024, w: 1800, h: 1350 },
        { file: '20241113-img-7677', year: 2024, w: 1800, h: 1350 },
        { file: '20250423-img-2513', year: 2025, w: 1800, h: 2400 },
        { file: 'england-17', year: 2025, w: 1800, h: 2400 },
        { file: 'england-69', year: 2025, w: 1800, h: 1350 },
        { file: '20250311-img-0374', year: 2025, w: 1800, h: 1350 },
        { file: 'england-103', year: 2025, w: 1800, h: 2400 },
        { file: '20250308-img-9857', year: 2025, w: 1800, h: 1350 },
      ],
    },
    {
      series: 'asymmetrical',
      title: 'Asymmetrical',
      frames: [
        { file: 'england-22', year: 2025, w: 1800, h: 2400 },
        { file: '20250509-img-2948', year: 2025, w: 1800, h: 2400 },
        { file: '20230613-img-5035', year: 2023, w: 1800, h: 2400 },
        { file: 'england-21', year: 2025, w: 1800, h: 2400 },
        { file: '20231121-img-0275', year: 2023, w: 1800, h: 1591 },
        { file: '20240705-img-5363', year: 2024, w: 1800, h: 1350 },
        { file: 'img-8563', year: 2025, w: 1800, h: 2432 },
        { file: '20250509-img-2922', year: 2025, w: 1800, h: 1350 },
        { file: 'img-8668', year: 2025, w: 1800, h: 2383 },
        { file: 'archseries-4', year: 2025, w: 1800, h: 1350 },
        { file: 'archseries-7', year: 2025, w: 1800, h: 1350 },
      ],
    },
    {
      series: 'through-the-window',
      title: 'Through the Window',
      frames: [
        { photo: 85, year: 2024, h: 1200 },
        { photo: 86, year: 2024, h: 2133 },
        { photo: 87, year: 2024, h: 2133 },
        { photo: 110, year: 2024, h: 2134 },
        { photo: 132, year: 2025, h: 1200 },
        { photo: 143, year: 2025, h: 2133 },
        { photo: 145, year: 2025, h: 2133 },
        { photo: 84, year: 2024, h: 1200 },
        { file: '20250311-img-0373', year: 2025, w: 1800, h: 1350 },
        { file: 'england-71', year: 2025, w: 1800, h: 2400 },
        { file: 'england-89', year: 2025, w: 1800, h: 2400 },
        { photo: 150, year: 2025, h: 2134 },
        { photo: 441, year: 2025, h: 2409 },
        { file: 'img-8195', year: 2025, w: 1800, h: 1682 },
        { photo: 447, year: 2025, h: 2126 },
      ],
    },
    {
      series: 'stage-light',
      title: 'Stage Light',
      frames: [
        { file: 'start', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7023', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7024', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7025', year: 2026, w: 1800, h: 1200 },
        { file: 'img-7026', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7027', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7029', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7034', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7035', year: 2026, w: 1800, h: 1087 },
        { file: 'img-7038', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7039', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7041', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7044', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7047', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7052', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7054', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7056', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7057', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7062', year: 2026, w: 1800, h: 2700 },
        { file: 'img-7064', year: 2026, w: 1800, h: 2700 },
      ],
    },
    {
      series: 'portraits',
      title: 'Portraits',
      frames: [
        { file: 'a7404286', year: 2026, w: 1800, h: 2700 },
        { file: 'a7404314', year: 2026, w: 1800, h: 2700 },
        { file: 'portrait-mitu-13', year: 2026, w: 1800, h: 2700 },
        { file: 'portrait-mitu-5', year: 2026, w: 1800, h: 2700 },
        { file: 'portrait-mitu', year: 2026, w: 1800, h: 2700 },
      ],
    },
  ];

  function fileFields(seriesId, frame) {
    if (frame.photo) {
      const number = String(frame.photo).padStart(4, '0');
      return { id: `photo-${number}`, base: `photography/photo-${number}`, ws: EARLIER_WIDTHS.slice(), w: 1600 };
    }
    return {
      id: `${seriesId}-${frame.file}`,
      base: `photography/${seriesId}/${frame.file}`,
      ws: SUFFIXES.map((size) => Math.min(size, frame.w)),
      w: frame.w,
    };
  }

  return SERIES.flatMap(({ series, title, frames }) =>
    frames.map((frame, index) => ({
      ...fileFields(series, frame),
      // A frame is named by its place in its series until it has a title of its own.
      title: `${title}, ${index + 1} of ${frames.length}`,
      year: frame.year,
      medium: 'Photography',
      dimensions: null,
      category: 'photography',
      series,
      frame: index + 1, // its place in the series, kept apart from the catalogue's own order
      h: frame.h,
    }))
  );
})());
