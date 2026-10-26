/**
 * Series: named groups of works, each with its own page (series.html?s=<id>).
 *
 *   id        URL-safe name
 *   title     shown on the series card and page
 *   note      optional short paragraph shown on the series page (null for none)
 *   medium    optional: the medium shown in the series index; defaults to the categories of its works
 *   (a long-form write-up for a series lives in js/series-stories.js under the same id)
 *   workIds   the works, in the order to show them, OR
 *   category / year   a rule that collects matching works instead, OR
 *   neither   the works that name this series (photographs, see works-photography.js)
 *   treatment         photography only: how the series' room is hung (see js/photo-series.js)
 *   galleryOnly       true keeps a series off the Series page and the Series menu; it is reached from the
 *                     gallery (the photography series, shown under Photography)
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
    note: 'Paintings of the Eiffel Tower made over nearly a decade: a study of how it is built that became a practice I keep returning to.',
    hangTogether: true,
    workIds: ['A001', 'A034', 'A038', 'A012'],
  },
  { id: 'still-life', title: 'Still life', note: null, workIds: ['A010', 'A018', 'A028', 'A007', 'A008', 'A009'] },
  // ---------- Photography: each series has its own room, hung according to its idea ----------
  {
    id: 'negligible',
    title: 'Negligible',
    medium: 'Photography',
    galleryOnly: true,
    treatment: 'vast',
    note: 'Most of every frame is sky. What sits inside it is small enough to miss: an aeroplane, a lamp post, birds on a wire, a plastic bag carried across an English sky, and sometimes nothing but cloud. I let the subject shrink until it is almost gone, because that is its true size. Against the sky, and everything beyond it, a single thing is negligible. So are we.',
  },
  {
    id: 'the-light-hits',
    title: 'The Light Hits',
    medium: 'Photography',
    galleryOnly: true,
    treatment: 'light',
    note: 'Each photograph holds the moment light lands on something: a tissue box on a windowsill, a laptop on a library table, a polished floor, the face of a building at sunset. The things themselves are ordinary. What they share is the moment the light reached them.',
  },
  {
    id: 'straight-from-ghost-stories',
    title: 'Straight from Ghost Stories',
    medium: 'Photography',
    galleryOnly: true,
    treatment: 'fog',
    note: 'These photographs share one colour: the cold, low grade of an old ghost film. Fog around a streetlamp, a house lit on an empty night, bare trees under a pale sky, a clock tower lost in cloud. Looking at them, I am taken straight into a ghost story.',
  },
  {
    id: 'asymmetrical',
    title: 'Asymmetrical',
    medium: 'Photography',
    galleryOnly: true,
    treatment: 'axis',
    note: 'The title is ironic. Nearly every photograph here is symmetrical: a tunnel, a staircase, a nave, a window, each built around a centre line. I named the series for the opposite of what it shows, on purpose.',
  },
  {
    id: 'through-the-window',
    title: 'Through the Window',
    medium: 'Photography',
    galleryOnly: true,
    treatment: 'window',
    note: 'A window is a frame someone else has already made. I look through it: from a screened porch, a ruined arch, an oval opening in a white wall, an aeroplane seat. What lies outside is only ever the part the window allows.',
  },
  {
    id: 'stage-light',
    title: 'Stage Light',
    medium: 'Photography',
    galleryOnly: true,
    treatment: 'stage',
    note: 'Dancers on a dark stage, each held in a single pool of coloured light. The stage is black; the light decides who appears.',
  },
  {
    id: 'city',
    title: 'City',
    medium: 'Photography',
    galleryOnly: true,
    treatment: 'grid',
    note: 'Just the city. Streets, towers and skylines in New York and London, photographed as I found them.',
  },
]);
