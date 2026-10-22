/**
 * The catalogue behind the site: one record per work, generated from
 * "Artwork Catalogue.xlsx" and the optimised images in /images.
 *
 *   id        catalogue id (also the URL hash, lower-cased)
 *   category  painting | drawing | print | digital | ceramics | wall-magazine (photography lives in works-photography.js)
 *   base      image path without size suffix, relative to /images
 *   ws        real pixel widths of the -600, -1200 and -1800 files
 *   w, h      pixel size of the largest file (drives layout before load)
 *   hidden    optional: true keeps the work out of the gallery (filters, counts, "All") but lets a series still include it
 *   rev       optional: bump it (rev: 2, 3, ...) when a photo is replaced under the same name, so browsers refetch it
 *   notes     optional: the artist's thought process, hung beside the work on the gallery wall
 *
 * Edit titles, years and categories here; nothing else needs to change.
 */
(function (root, works) {
  if (typeof module === 'object' && module.exports) {
    module.exports = works;
  } else {
    root.PORTFOLIO_WORKS = works;
  }
})(typeof self !== 'undefined' ? self : this, [
  { id: 'A001', title: "Eiffel and Mom's Frame", year: 2016, medium: 'Poster color on paper', dimensions: '12x9 inches', category: 'painting', base: 'artwork/a001-eiffel-and-mom-s-frame', ws: [600, 1200, 1214], w: 1214, h: 1512 },
  { id: 'A002', title: 'Rain in NYC', year: 2023, medium: 'Acrylic on canvas', dimensions: '12x9 inches', category: 'painting', base: 'artwork/a002-rain-in-nyc', ws: [600, 1200, 1800], w: 1800, h: 2303 },
  { id: 'A003', title: 'Common Sunset', year: 2023, medium: 'Acrylic on canvas', dimensions: '12x9 inches', category: 'painting', base: 'artwork/a003-common-sunset', ws: [600, 1200, 1800], w: 1800, h: 2267 },
  { id: 'A004', title: 'A Sunny Day', year: 2023, medium: 'Acrylic on canvas', dimensions: '12x9 inches', category: 'painting', base: 'artwork/a004-a-sunny-day', ws: [600, 1200, 1800], w: 1800, h: 1434 },
  { id: 'A005', title: 'Restless Stream', year: 2023, medium: 'Acrylic on canvas', dimensions: '9x12 inches', category: 'painting', base: 'artwork/a005-restless-stream', ws: [600, 1200, 1800], w: 1800, h: 1424 },
  { id: 'A006', title: 'Charcoal Value Study', year: 2024, medium: 'Charcoal collage on paper', dimensions: '12x18 inches', category: 'drawing', base: 'artwork/a006-charcoal-value-study', ws: [600, 1200, 1800], w: 1800, h: 1174 },
  { id: 'A007', title: 'Still Life: Violin & Apple', year: 2024, medium: 'Charcoal on paper', dimensions: '12x18 inches', category: 'drawing', base: 'artwork/a007-still-life-violin-apple', ws: [600, 1200, 1800], w: 1800, h: 1188 },
  { id: 'A008', title: 'Still Life Study', year: 2024, medium: 'Charcoal on paper', dimensions: '12x18 inches', category: 'drawing', base: 'artwork/a008-still-life-study', ws: [600, 1200, 1800], w: 1800, h: 1185 },
  { id: 'A009', title: 'Still Life Blind Study', year: 2024, medium: 'Charcoal on paper', dimensions: '12x18 inches', category: 'drawing', base: 'artwork/a009-still-life-blind-study', ws: [600, 1200, 1800], w: 1800, h: 1188 },
  { id: 'A010', title: 'Still Life: Statue on Call', year: 2025, medium: 'Oil on canvas panel', dimensions: '16x20 inches', category: 'painting', base: 'artwork/a010-still-life-statue-on-call', ws: [600, 1200, 1800], w: 1800, h: 1417 },
  { id: 'A011', title: 'Abstract Collage: Nostalgia', year: 2025, medium: 'Acrylic on wood panel', dimensions: '18x18 inches', category: 'painting', base: 'artwork/a011-abstract-collage-nostalgia', ws: [600, 1200, 1800], w: 1800, h: 1781 },
  { id: 'A012', title: 'Eiffel Tower', year: 2025, medium: 'Mixed media on canvas', dimensions: '32x28 inches', category: 'painting', base: 'artwork/a012-eiffel-tower', ws: [600, 1200, 1800], w: 1800, h: 2028 },
  { id: 'A013', title: 'Tumi', year: 2025, medium: 'Acrylic on canvas panel', dimensions: '5x7 inches', category: 'painting', base: 'artwork/a013-tumi', ws: [600, 1200, 1800], w: 1800, h: 2418, rev: 2 },
  { id: 'A014', title: 'All for you, You for me', year: 2025, medium: 'Digital gouache painting', dimensions: '1526x2048 px', category: 'digital', base: 'artwork/a014-all-for-you-you-for-me', ws: [600, 1200, 1526], w: 1526, h: 2048 },
  { id: 'A015', title: 'Cat', year: 2025, medium: 'Digital Art', dimensions: '1593x2179 px', category: 'digital', base: 'artwork/a015-cat', ws: [600, 1200, 1593], w: 1593, h: 2179 },
  { id: 'A016', title: 'Monoprint Series: Horizon', year: null, medium: null, dimensions: null, category: 'print', hidden: true, base: 'artwork/a016-monoprint-series-horizon', ws: [600, 1200, 1800], w: 1800, h: 1220 },
  { id: 'A017', title: 'View from room', year: 2025, medium: 'Acrylic on canvas', dimensions: '9x12 inches', category: 'painting', base: 'artwork/a017-view-from-room', ws: [600, 1200, 1800], w: 1800, h: 2405 },
  { id: 'A018', title: 'Still Life_Monotone Study', year: 2025, medium: 'Oil on canvas panel', dimensions: '12x9 inches', category: 'painting', base: 'artwork/a018-still-life-monotone-study', ws: [600, 1200, 1800], w: 1800, h: 1302 },
  { id: 'A019', title: 'Monoprint Horizon-1', year: 2026, medium: 'Oil on Paper', dimensions: '12x10 inches', category: 'print', base: 'artwork/a019-monoprint-horizon-1', ws: [600, 1200, 1800], w: 1800, h: 1505 },
  { id: 'A020', title: 'Monoprint Horizon-2', year: 2026, medium: 'Oil on Paper', dimensions: '12x10 inches', category: 'print', base: 'artwork/a020-monoprint-horizon-2', ws: [600, 1200, 1800], w: 1800, h: 1498 },
  { id: 'A021', title: 'Monoprint Horizon-3', year: 2026, medium: 'Oil on Paper', dimensions: '12x10 inches', category: 'print', base: 'artwork/a021-monoprint-horizon-3', ws: [600, 1200, 1800], w: 1800, h: 1497 },
  { id: 'A022', title: 'Monoprint Horizon-4', year: 2026, medium: 'Oil on Paper', dimensions: '12x10 inches', category: 'print', base: 'artwork/a022-monoprint-horizon-4', ws: [600, 1200, 1800], w: 1800, h: 1503 },
  { id: 'A023', title: 'Monoprint Horizon-5', year: 2026, medium: 'Oil on Paper', dimensions: '12x10 inches', category: 'print', base: 'artwork/a023-monoprint-horizon-5', ws: [600, 1200, 1800], w: 1800, h: 1512 },
  { id: 'A024', title: 'Monoprint Horizon-6', year: 2026, medium: 'Oil on Paper', dimensions: '12x10 inches', category: 'print', base: 'artwork/a024-monoprint-horizon-6', ws: [600, 1200, 1800], w: 1800, h: 1499 },
  { id: 'A025', title: 'Philosophy', year: 2026, medium: 'Silkscreen print on Paper', dimensions: '12x9 inches', category: 'print', base: 'artwork/a025-philosophy', ws: [600, 1200, 1800], w: 1800, h: 1346 },
  { id: 'A026', title: 'Saiyan', year: 2026, medium: 'Intaglio on Paper', dimensions: '6x7 inches', category: 'print', base: 'artwork/a026-saiyan', ws: [600, 1200, 1800], w: 1800, h: 2292 },
  { id: 'A027', title: 'The Irony of Waves', year: 2026, medium: 'Intaglio on Paper', dimensions: '16.2x13.2 inches', category: 'print', base: 'artwork/a027-the-irony-of-waves', ws: [600, 1200, 1800], w: 1800, h: 1474 },
  { id: 'A028', title: 'Not a Bagel', year: 2025, medium: 'Acrylic on canvas panel', dimensions: '12x9 inches', category: 'painting', base: 'artwork/a028-not-a-bagel', ws: [600, 1200, 1800], w: 1800, h: 1298 },
  { id: 'A029', title: 'A Sky Full of Stars', year: 2023, medium: 'Acrylic on paper', dimensions: '14x11 inches', category: 'painting', base: 'artwork/a029-a-sky-full-of-stars', ws: [600, 1200, 1800], w: 1800, h: 1375 },
  { id: 'A030', title: 'Almost Happy', year: 2026, medium: 'Acrylic on canvas', dimensions: '18x24 inches', category: 'painting', base: 'artwork/a030-almost-happy', ws: [600, 1200, 1800], w: 1800, h: 2411 },
  { id: 'A031', title: 'Heroes', year: 2026, medium: 'Digital', dimensions: '6477x4319 px', category: 'digital', base: 'artwork/a031-heroes', ws: [600, 1200, 1800], w: 1800, h: 1200 },
  { id: 'A032', title: 'Nobanno', year: 2015, medium: 'Acrylic on Paper', dimensions: '24x18 inches', category: 'painting', base: 'artwork/a032-nobanno', ws: [600, 1200, 1800], w: 1800, h: 1208 },
  { id: 'A033', title: 'Hahakar (The Cry of Despair)', year: 2015, medium: 'Poster on paper', dimensions: '12x8 inches', category: 'painting', base: 'artwork/a033-hahakar-the-cry-of-despair', ws: [600, 1200, 1800], w: 1800, h: 1251 },
  { id: 'A034', title: 'Mirage', year: 2016, medium: 'Mixed media on paper', dimensions: '12x8 inches', category: 'painting', base: 'artwork/a034-mirage', ws: [600, 1200, 1487], w: 1487, h: 2114 },
  { id: 'A035', title: 'Man with Flags', year: 2018, medium: 'Acrylic on canvas', dimensions: '24x18 inches', category: 'painting', base: 'artwork/a035-man-with-flags', ws: [600, 1008, 1008], w: 1008, h: 701 },
  { id: 'A036', title: 'Show', year: 2018, medium: 'Acrylic on canvas', dimensions: '24x36 inches', category: 'painting', base: 'artwork/a036-show', ws: [600, 1200, 1800], w: 1800, h: 1210 },
  { id: 'A037', title: 'Rain in Paris', year: 2018, medium: 'Acrylic on canvas', dimensions: '24x36 inches', category: 'painting', base: 'artwork/a037-rain-in-paris', ws: [600, 1200, 1800], w: 1800, h: 1222 },
  { id: 'A038', title: 'Skyline: Reimagined', year: 2021, medium: 'Mixed media on paper', dimensions: '13x8 inches', category: 'painting', base: 'artwork/a038-skyline-reimagined', ws: [600, 1200, 1800], w: 1800, h: 1176 },
  { id: 'A039', title: 'Zebra-crossing', year: 2021, medium: 'Mixed media on paper', dimensions: '13x8 inches', category: 'painting', base: 'artwork/a039-zebra-crossing', ws: [600, 1200, 1800], w: 1800, h: 1121 },
  { id: 'A040', title: 'Wall Magazine- Champions', year: 2020, medium: 'Mixed craft', dimensions: null, category: 'wall-magazine', base: 'artwork/a040-wall-magazine-champions', ws: [600, 1200, 1800], w: 1800, h: 1137 },
  { id: 'A041', title: 'Aggressive Happiness', year: 2026, medium: 'Acrylic on wood panel', dimensions: '24x24 inches', category: 'painting', base: 'artwork/a041-aggressive-happiness', ws: [600, 1200, 1800], w: 1800, h: 1772 },
  { id: 'A042', title: 'Quarry', year: 2026, medium: 'Oil impasto on wood panel', dimensions: '12x9 inches', category: 'painting', base: 'artwork/a042-quarry', ws: [600, 1200, 1800], w: 1800, h: 1449 },
  { id: 'A043', title: 'Old Master Study- The Milkmaid', year: 2026, medium: 'Oil on canvas panel', dimensions: '16x20 inches', category: 'painting', base: 'artwork/a043-old-master-study-the-milkmaid', ws: [600, 1200, 1800], w: 1800, h: 2246 },

  // Ceramics are untitled photographs for now; add title/year here when ready.
  { id: 'ceramics8', title: null, year: null, medium: 'Ceramics', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics8', ws: [600, 1200, 1800], w: 1800, h: 1940 },
  { id: 'ceramics9', title: 'Mug', year: 2026, medium: 'Glazes: black slip, GEB white at the foot and chun above', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics9', ws: [600, 1200, 1800], w: 1800, h: 1387 },
  { id: 'ceramics-4', title: 'Two bowls', year: 2026, medium: 'Glazes: yellow salt (left); satin black and raspberry (right)', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-4', ws: [600, 1200, 1800], w: 1800, h: 1191 },
  { id: 'ceramics-6', title: 'Bowl', year: 2026, medium: 'Glaze: Korean celadon, two coats', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-6', ws: [600, 1200, 1800], w: 1800, h: 2069 },
  { id: 'ceramics-7', title: null, year: null, medium: 'Ceramics', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-7', ws: [600, 1200, 1800], w: 1800, h: 2079 },
  { id: 'ceramics-11', title: 'Two bowls', year: 2026, medium: 'Glazes: GEB white, two coats (left); Mamo lavender, two coats (right)', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-11', ws: [600, 1200, 1800], w: 1800, h: 1766 },
  { id: 'ceramics-22', title: 'Mug', year: 2026, medium: 'Glaze: Mamo lavender', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-22', ws: [600, 1200, 1800], w: 1800, h: 2235 },
  { id: 'ceramics-25', title: 'Two mugs', year: 2026, medium: 'Glazes: GEB white, two coats (left); Mamo lavender (right)', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-25', ws: [600, 1200, 1800], w: 1800, h: 1444 },
  { id: 'ceramics-28', title: 'Mug', year: 2026, medium: 'Glazes: yellow salt and chun', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-28', ws: [600, 1200, 1800], w: 1800, h: 1993 },
  { id: 'ceramics-29', title: 'Two mugs', year: 2026, medium: 'Glazes: black slip, GEB white at the foot and chun above (left); yellow salt and chun (right)', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-29', ws: [600, 1200, 1800], w: 1800, h: 1431 },
  { id: 'ceramics-39', title: 'Final Trio', year: 2026, medium: 'Plate, bowl and mug; wheel-thrown and glazed', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-39', ws: [600, 1200, 1800], w: 1800, h: 1200 },
  { id: 'ceramics-41', title: 'Final Trio', year: 2026, medium: 'Plate, bowl and mug; wheel-thrown and glazed', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-41', ws: [600, 1200, 1800], w: 1800, h: 1430 },
  { id: 'ceramics-44', title: 'Bowl', year: 2026, medium: "Glaze: Malcolm's shino", dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-44', ws: [600, 1200, 1800], w: 1800, h: 2618 },
  { id: 'ceramics-45', title: 'Bowl', year: 2026, medium: 'Glazes: Vans black with raspberry', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-45', ws: [600, 1200, 1800], w: 1800, h: 1340 },
  { id: 'ceramics-47', title: 'Bowl', year: 2026, medium: 'Glazes: GEB white and chun', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-47', ws: [600, 1200, 1800], w: 1800, h: 2401 },
  { id: 'ceramics-52', title: 'Two bowls', year: 2026, medium: 'Glazes: satin black and raspberry (left); Korean celadon, two coats (right)', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-52', ws: [600, 1200, 1800], w: 1800, h: 1277 },
  { id: 'ceramics-59', title: 'Heart bowl', year: 2026, medium: 'Glazes: raspberry, two coats, and GEB white', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-59', ws: [600, 1200, 1800], w: 1800, h: 1200 },
  { id: 'ceramics-62', title: null, year: null, medium: 'Ceramics', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-62', ws: [600, 1200, 1800], w: 1800, h: 1200 },
  { id: 'ceramics-67', title: null, year: null, medium: 'Ceramics', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-67', ws: [600, 1200, 1800], w: 1800, h: 1113 },
  { id: 'ceramics-33', title: 'Final Trio: Plate', year: 2026, medium: 'Glazes: black slip, chun and GEB white', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-33', ws: [600, 1200, 1800], w: 1800, h: 1769 },
  { id: 'ceramics-34', title: 'Final Trio: Bowl', year: 2026, medium: 'Glazes: Mamo lavender and Korean celadon', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-34', ws: [600, 1200, 1800], w: 1800, h: 2132 },
  { id: 'ceramics-32', title: 'Final Trio: Mug', year: 2026, medium: 'Glazes: Korean celadon and raspberry, two coats', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-32', ws: [600, 1200, 1800], w: 1800, h: 2193 },
  { id: 'ceramics-37', title: 'Final Trio', year: 2026, medium: 'Plate, bowl and mug; wheel-thrown and glazed', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-37', ws: [600, 1200, 1800], w: 1800, h: 1159 },
  { id: 'ceramics-43', title: 'Final Trio, feet', year: 2026, medium: 'Plate, bowl and mug turned over, showing their thrown feet', dimensions: null, category: 'ceramics', base: 'ceramics/ceramics-43', ws: [600, 1200, 1800], w: 1800, h: 1193 },
]);
