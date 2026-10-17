/**
 * Series: named groups of works, each with its own page (series.html?s=<id>).
 *
 *   id        URL-safe name
 *   title     shown on the series card and page
 *   note      optional short paragraph shown on the series page (null for none)
 *   cover     optional work id for the card image; defaults to the first work
 *   workIds   the works, in the order to show them, OR
 *   category / year   a rule that collects matching works instead
 *
 * These are a starting point: regroup, rename and add notes here as the
 * photographs and artwork are sorted into projects. Nothing else needs to change.
 */
(function (root, series) {
  if (typeof module === 'object' && module.exports) {
    module.exports = series;
  } else {
    root.PORTFOLIO_SERIES = series;
  }
})(typeof self !== 'undefined' ? self : this, [
  { id: 'horizon', title: 'Horizon', note: null, workIds: ['A019', 'A020', 'A021', 'A022', 'A023', 'A024', 'A016'] },
  { id: 'still-life', title: 'Still life', note: null, workIds: ['A010', 'A018', 'A007', 'A008', 'A009'] },
  { id: 'ceramics', title: 'Ceramics', note: null, category: 'ceramics' },
  { id: 'photographs-2026', title: 'Photographs, 2026', note: null, category: 'photography', year: 2026 },
  { id: 'photographs-2025', title: 'Photographs, 2025', note: null, category: 'photography', year: 2025 },
  { id: 'photographs-2024', title: 'Photographs, 2024', note: null, category: 'photography', year: 2024 },
  { id: 'photographs-2023', title: 'Photographs, 2023', note: null, category: 'photography', year: 2023 },
  { id: 'photographs-2022', title: 'Photographs, 2022', note: null, category: 'photography', year: 2022 },
]);
