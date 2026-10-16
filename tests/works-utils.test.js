const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const U = require('../js/works-utils.js');
const WORKS = require('../js/works-data.js');

const ROOT = path.join(__dirname, '..');

const work = (overrides = {}) => ({
  id: 'A001',
  title: 'Test',
  year: 2024,
  medium: 'Oil on canvas',
  dimensions: '12x9 inches',
  category: 'painting',
  base: 'artwork/a001-test',
  ws: [600, 1200, 1800],
  w: 1800,
  h: 1200,
  ...overrides,
});

test('buildSrcset lists each size with its real pixel width', () => {
  assert.equal(
    U.buildSrcset(work()),
    'images/artwork/a001-test-600.jpg 600w, images/artwork/a001-test-1200.jpg 1200w, images/artwork/a001-test-1800.jpg 1800w'
  );
});

test('buildSrcset collapses sizes that were not upscaled', () => {
  const small = work({ ws: [600, 1008, 1008] });
  assert.equal(
    U.buildSrcset(small),
    'images/artwork/a001-test-600.jpg 600w, images/artwork/a001-test-1200.jpg 1008w'
  );
});

test('filterWorks returns everything for "all" and a subset otherwise', () => {
  const works = [work(), work({ id: 'A002', category: 'print' })];
  assert.equal(U.filterWorks(works, 'all').length, 2);
  assert.deepEqual(U.filterWorks(works, 'print').map((w) => w.id), ['A002']);
});

test('countByCategory includes zero counts for unused categories', () => {
  const counts = U.countByCategory([work(), work({ id: 'A002' })]);
  assert.equal(counts.all, 2);
  assert.equal(counts.painting, 2);
  assert.equal(counts.ceramics, 0);
});

test('sortWorks puts newest first, undated last, and is stable', () => {
  const sorted = U.sortWorks([
    work({ id: 'old', year: 2015 }),
    work({ id: 'undated', year: null }),
    work({ id: 'new-a', year: 2026 }),
    work({ id: 'new-b', year: 2026 }),
  ]);
  assert.deepEqual(sorted.map((w) => w.id), ['new-a', 'new-b', 'old', 'undated']);
});

test('formatDimensions normalises inches and pixels', () => {
  assert.equal(U.formatDimensions('12x9 inches'), '12 × 9 in');
  assert.equal(U.formatDimensions('16.2x13.2 inches'), '16.2 × 13.2 in');
  assert.equal(U.formatDimensions('1526x2048 px'), '1526 × 2048 px');
  assert.equal(U.formatDimensions(null), '');
  assert.equal(U.formatDimensions('large'), 'large');
});

test('captionParts leads with the medium for untitled works', () => {
  assert.deepEqual(U.captionParts(work()), { title: 'Test', meta: '2024 · Oil on canvas · 12 × 9 in' });
  const ceramic = work({ title: null, year: null, medium: 'Ceramics', dimensions: null });
  assert.deepEqual(U.captionParts(ceramic), { title: 'Ceramics', meta: '' });
});

test('altText and accessibleName handle titled and untitled works', () => {
  assert.equal(U.altText(work()), 'Test, Oil on canvas, 2024');
  const ceramic = work({ title: null, medium: 'Ceramics' });
  assert.equal(U.altText(ceramic), 'Ceramics');
  assert.equal(U.accessibleName(work(), 3), 'Test');
  assert.equal(U.accessibleName(ceramic, 3), 'Ceramics, photograph 3');
});

test('categoryFromSearch accepts known categories only', () => {
  assert.equal(U.categoryFromSearch('?c=print'), 'print');
  assert.equal(U.categoryFromSearch('?c=nonsense'), 'all');
  assert.equal(U.categoryFromSearch(''), 'all');
});

test('workIdFromHash is case-insensitive and rejects unknown ids', () => {
  const works = [work({ id: 'A012' }), work({ id: 'ceramics-44' })];
  assert.equal(U.workIdFromHash('#a012', works), 'A012');
  assert.equal(U.workIdFromHash('#ceramics-44', works), 'ceramics-44');
  assert.equal(U.workIdFromHash('#nope', works), null);
  assert.equal(U.workIdFromHash('', works), null);
  assert.equal(U.workIdFromHash('#%E0%A4%A', works), null);
});

test('catalogue: ids are unique and every record is well formed', () => {
  const ids = new Set();
  for (const record of WORKS) {
    assert.ok(!ids.has(record.id), `duplicate id ${record.id}`);
    ids.add(record.id);
    assert.ok(U.isCategory(record.category), `${record.id}: unknown category`);
    assert.equal(record.ws.length, U.SIZE_SUFFIXES.length, `${record.id}: ws length`);
    assert.ok(record.w > 0 && record.h > 0, `${record.id}: missing size`);
  }
});

test('catalogue: featured works in the config exist', () => {
  const source = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
  const block = /featuredIds:\s*\[([^\]]*)\]/.exec(source);
  assert.ok(block, 'featuredIds not found');
  const featured = [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const ids = new Set(WORKS.map((record) => record.id));
  featured.forEach((id) => assert.ok(ids.has(id), `featured id ${id} is not in works-data.js`));
});

test(
  'catalogue: every referenced image file exists',
  { skip: !fs.existsSync(path.join(ROOT, 'images')) && 'images/ folder not present yet' },
  () => {
    const missing = [];
    for (const record of WORKS) {
      for (const suffix of U.SIZE_SUFFIXES) {
        const file = path.join(ROOT, U.imageUrl(record, suffix));
        if (!fs.existsSync(file)) missing.push(path.relative(ROOT, file));
      }
    }
    assert.deepEqual(missing, []);
  }
);
