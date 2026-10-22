/**
 * Series: named groups of works, each with its own page (series.html?s=<id>).
 *
 *   id        URL-safe name
 *   title     shown on the series card and page
 *   note      optional short paragraph shown on the series page (null for none)
 *   coverIds  optional: up to three work ids set side by side on the series card; defaults to the first three works
 *   (a long-form write-up for a series lives in js/series-stories.js under the same id)
 *   workIds   the works, in the order to show them, OR
 *   category / year   a rule that collects matching works instead
 *   hangTogether      optional: true hangs the series' works side by side on one stretch of the gallery wall
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
  {
    id: 'cross-wired',
    title: 'Cross-Wired',
    note: 'A ceramic study of form, surface and influence: a plate, a bowl and a mug, each guided by a different maker.',
    coverIds: ['ceramics-33', 'ceramics-32', 'ceramics-34'],
    workIds: ['ceramics-41', 'ceramics-33', 'ceramics-34', 'ceramics-32', 'ceramics-37', 'ceramics-39', 'ceramics-43'],
  },
  {
    id: 'three-ways-of-seeing',
    title: 'Three Ways of Seeing',
    note: 'One still life drawn three ways: through light and shadow, as a study of structure, and by intuition.',
    hangTogether: true,
    coverIds: ['A007', 'A008', 'A009'],
    workIds: ['still-life-setup', 'A007', 'A008', 'A009'],
  },
  { id: 'horizon', title: 'Horizon', note: 'Six monotypes of a single horizon, followed from golden light through dusk and night to clear day.', hangTogether: true, workIds: ['A019', 'A020', 'A021', 'A022', 'A023', 'A024', 'A016'] },
  { id: 'still-life', title: 'Still life', note: null, coverIds: ['A010', 'A018', 'A009'], workIds: ['A010', 'A018', 'A007', 'A008', 'A009'] },
  { id: 'ceramics', title: 'Ceramics', note: null, category: 'ceramics' },
  { id: 'photographs-2026', title: 'Photographs, 2026', note: null, category: 'photography', year: 2026 },
  { id: 'photographs-2025', title: 'Photographs, 2025', note: null, category: 'photography', year: 2025 },
  { id: 'photographs-2024', title: 'Photographs, 2024', note: null, category: 'photography', year: 2024 },
  { id: 'photographs-2023', title: 'Photographs, 2023', note: null, category: 'photography', year: 2023 },
  { id: 'photographs-2022', title: 'Photographs, 2022', note: null, category: 'photography', year: 2022 },
]);
