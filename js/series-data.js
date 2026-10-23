/**
 * Series: named groups of works, each with its own page (series.html?s=<id>).
 *
 *   id        URL-safe name
 *   title     shown on the series card and page
 *   note      optional short paragraph shown on the series page (null for none)
 *   medium    optional: the medium shown in the series index; defaults to the categories of its works
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
    workIds: ['ceramics-41', 'ceramics-33', 'ceramics-34', 'ceramics-32', 'ceramics-37', 'ceramics-39', 'ceramics-43'],
  },
  {
    id: 'degrees-of-happiness',
    title: 'Degrees of Happiness',
    note: 'Abstract paintings that treat happiness as colour. Yellow, and the orange it becomes, is held at a different intensity in each work: in one the feeling is still arriving; in the other it pushes back.',
    hangTogether: true,
    workIds: ['A030', 'A041'],
  },
  {
    id: 'three-ways-of-seeing',
    title: 'Three Ways of Seeing',
    medium: 'Drawing',
    note: 'One still life drawn three ways: through light and shadow, as a study of structure, and by intuition.',
    hangTogether: true,
    workIds: ['still-life-setup', 'A007', 'A008', 'A009'],
  },
  { id: 'horizon', title: 'Horizon', medium: 'Monotype', note: 'Six monotypes of a single horizon, followed from golden light through dusk and night to clear day.', hangTogether: true, workIds: ['A019', 'A020', 'A021', 'A022', 'A023', 'A024', 'A016'] },
  {
    id: 'eiffel-tower',
    title: 'Eiffel Tower',
    note: 'Paintings of the Eiffel Tower made over nearly a decade: a study of its structure that became a practice I keep returning to.',
    hangTogether: true,
    workIds: ['A001', 'A034', 'A038', 'A012'],
  },
  { id: 'still-life', title: 'Still life', note: null, workIds: ['A010', 'A018', 'A007', 'A008', 'A009'] },
  {
    id: 'mugs',
    title: 'Mugs',
    note: null,
    workIds: ['ceramics9', 'ceramics-22', 'ceramics-28', 'ceramics-25', 'ceramics-29'],
  },
  {
    id: 'bowls',
    title: 'Bowls',
    note: null,
    workIds: ['ceramics-6', 'ceramics-44', 'ceramics-45', 'ceramics-47', 'ceramics-59', 'ceramics-7', 'ceramics8', 'ceramics-4', 'ceramics-11', 'ceramics-52'],
  },
]);
