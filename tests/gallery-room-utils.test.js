const test = require('node:test');
const assert = require('node:assert/strict');

const R = require('../js/gallery-room-utils.js');
const ARTWORKS = require('../js/works-data.js');
const SERIES = require('../js/series-data.js');

const work = (overrides = {}) => ({ id: 'A1', category: 'painting', dimensions: '16x20 inches', w: 1600, h: 2000, ...overrides });

test('sizeInches puts the longer catalogue number on the picture\'s longer side', () => {
  // The catalogue writes portrait sizes both ways round.
  assert.deepEqual(R.sizeInches(work({ dimensions: '12x9 inches', w: 900, h: 1200 })), { w: 9, h: 12 });
  assert.deepEqual(R.sizeInches(work({ dimensions: '9x12 inches', w: 900, h: 1200 })), { w: 9, h: 12 });
  assert.deepEqual(R.sizeInches(work({ dimensions: '12x9 inches', w: 1200, h: 900 })), { w: 12, h: 9 });
});

test('sizeInches falls back to a 16 in long side when the size is unknown', () => {
  assert.deepEqual(R.sizeInches(work({ dimensions: null, w: 2000, h: 1000 })), { w: 16, h: 8 });
  assert.deepEqual(R.sizeInches(work({ dimensions: '1526x2048 px', w: 1000, h: 2000 })), { w: 8, h: 16 });
});

test('framedInches adds moulding and the float gap or mat on every side', () => {
  const painting = R.framedInches(work({ dimensions: '10x10 inches', w: 1000, h: 1000 }));
  const edge = 2 * (R.FRAMING.painting.moulding + R.FRAMING.painting.inner);
  assert.equal(painting.w, 10 + edge);
  const print = R.framedInches(work({ category: 'print', dimensions: '10x10 inches', w: 1000, h: 1000 }));
  assert.ok(print.w > painting.w, 'a print is framed with a wide mat');
});

test('wallSections hangs a hangTogether series on one stretch, in the series order', () => {
  const works = [work({ id: 'P1' }), work({ id: 'S2' }), work({ id: 'P2' }), work({ id: 'S1' })];
  const series = [{ id: 'set', title: 'Set', hangTogether: true, workIds: ['S1', 'S2'] }, { id: 'loose', workIds: ['P1', 'P2'] }];
  const sections = R.wallSections(works, series);
  assert.deepEqual(sections.map((section) => section.works.map((w) => w.id)), [['P1'], ['S1', 'S2'], ['P2']]);
  assert.equal(sections[1].series.id, 'set');
  assert.deepEqual(R.hangingOrder(sections).map((w) => w.id), ['P1', 'S1', 'S2', 'P2']);
  assert.equal(R.sectionIndexOf(sections, 'S2'), 1);
  assert.equal(R.sectionIndexOf(sections, 'nope'), -1);
});

test('the six Horizon monoprints hang together; the hidden cover does not', () => {
  const prints = ARTWORKS.filter((record) => record.category === 'print' && !record.hidden);
  const sections = R.wallSections(prints, SERIES);
  const horizon = sections.find((section) => section.series && section.series.id === 'horizon');
  assert.deepEqual(horizon.works.map((w) => w.id), ['A019', 'A020', 'A021', 'A022', 'A023', 'A024']);
  assert.equal(sections.filter((section) => section.series).length, 1);
  assert.deepEqual(R.groupGrid(horizon.works), { columns: 3, rows: 2 }, 'six same-size prints hang as a grid');
});

test('sectionScales shares one scale between single works and shrinks only a group that would not fit', () => {
  const small = { works: [work({ id: 'S', dimensions: '10x10 inches', w: 1000, h: 1000 })] };
  const large = { works: [work({ id: 'L', dimensions: '20x20 inches', w: 1000, h: 1000 })] };
  const group = { works: Array.from({ length: 6 }, (_, i) => work({ id: `G${i}`, category: 'print', dimensions: '12x10 inches', w: 1200, h: 1000 })) };
  const available = { w: 600, h: 400 };
  const [a, b, c] = R.sectionScales([small, large, group], available);
  assert.equal(a, b, 'single works hang at the same scale');
  const fits = (section, scale) => {
    const size = R.sectionInches(section);
    return size.w * scale <= available.w + 1e-9 && size.h * scale <= available.h + 1e-9;
  };
  assert.ok(fits(large, b) && fits(group, c));
  assert.ok(c <= a);
});

test('paintings, drawings and prints are shown on the wall; other media are not', () => {
  ['painting', 'drawing', 'print'].forEach((category) => assert.ok(R.isWallCategory(category), category));
  ['digital', 'photography', 'ceramics', 'wall-magazine', 'all'].forEach((category) => assert.ok(!R.isWallCategory(category), category));
  assert.deepEqual(R.FRAMING.drawing, R.FRAMING.print, 'drawings are matted like prints');
});

test('a group of mixed sizes hangs in one row on the centre line, the largest work in the middle', () => {
  const sized = (id, inches) => work({ id, dimensions: `${inches}x${inches} inches`, w: 1000, h: 1000 });
  const works = [sized('a', 10), sized('b', 30), sized('c', 14), sized('d', 20)];
  const row = R.hangGroup(works);
  assert.deepEqual(row.map((w) => w.id), ['c', 'b', 'd', 'a'], 'anchor in the middle, next largest beside it');
  assert.deepEqual(R.groupGrid(row), { columns: 4, rows: 1 });
  const size = R.sectionInches({ works: row });
  const framed = row.map(R.framedInches);
  assert.ok(Math.abs(size.w - (framed.reduce((s, f) => s + f.w, 0) + 3 * R.GROUP_SPACING_IN)) < 1e-9);
  assert.equal(size.h, Math.max(...framed.map((f) => f.h)));
  // Two works, or works of one size, keep the series' own order.
  assert.deepEqual(R.hangGroup([sized('x', 10), sized('y', 30)]).map((w) => w.id), ['x', 'y']);
});
