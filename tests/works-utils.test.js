const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const U = require('../js/works-utils.js');
const ARTWORKS = require('../js/works-data.js');
const PHOTOS = require('../js/works-photography.js');
const SERIES = require('../js/series-data.js');
const ContactUtils = require('../js/contact-utils.js');

const WORKS = ARTWORKS.concat(PHOTOS);

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

test('buildSrcset and fallbackUrl cope with photos that only have one or two sizes', () => {
  const single = work({ ws: [480], w: 480, h: 360 });
  assert.equal(U.buildSrcset(single), 'images/artwork/a001-test-600.jpg 480w');
  assert.equal(U.fallbackUrl(single), 'images/artwork/a001-test-600.jpg');
  const pair = work({ ws: [600, 768], w: 768 });
  assert.equal(U.buildSrcset(pair), 'images/artwork/a001-test-600.jpg 600w, images/artwork/a001-test-1200.jpg 768w');
  assert.equal(U.fallbackUrl(pair), 'images/artwork/a001-test-1200.jpg');
  assert.equal(U.fallbackUrl(work()), 'images/artwork/a001-test-1200.jpg');
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

test('sortWorks places bulk categories (photography) after artwork', () => {
  const sorted = U.sortWorks([
    work({ id: 'photo-new', category: 'photography', year: 2026 }),
    work({ id: 'art-old', year: 2010 }),
    work({ id: 'photo-old', category: 'photography', year: 2022 }),
    work({ id: 'art-undated', year: null }),
  ]);
  assert.deepEqual(sorted.map((w) => w.id), ['art-old', 'art-undated', 'photo-new', 'photo-old']);
  assert.ok(U.isBulk(sorted[2]) && !U.isBulk(sorted[0]));
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

test('photography is a known category and photos omit title and dimensions', () => {
  assert.ok(U.isCategory('photography'));
  assert.equal(U.categoryFromSearch('?c=photography'), 'photography');
  const photo = work({ id: 'photo-0001', title: null, dimensions: null, medium: 'Photography', category: 'photography' });
  assert.deepEqual(U.captionParts(photo), { title: 'Photography', meta: '2024' });
});

test('contactEntries builds links only for the details that are filled in', () => {
  assert.deepEqual(ContactUtils.contactEntries({}), []);
  assert.deepEqual(ContactUtils.contactEntries(undefined), []);
  const entries = ContactUtils.contactEntries({
    email: 'a@b.co',
    instagram: '@handle',
    linkedin: 'www.linkedin.com/in/someone/',
  });
  assert.deepEqual(entries, [
    { label: 'Email', text: 'a@b.co', href: 'mailto:a@b.co' },
    { label: 'Instagram', text: '@handle', href: 'https://www.instagram.com/handle/' },
    { label: 'LinkedIn', text: 'linkedin.com/in/someone', href: 'https://www.linkedin.com/in/someone/' },
  ]);
});

test('catalogue: ids are unique and every record is well formed', () => {
  const ids = new Set();
  for (const record of WORKS) {
    assert.ok(!ids.has(record.id), `duplicate id ${record.id}`);
    ids.add(record.id);
    assert.ok(U.isCategory(record.category), `${record.id}: unknown category`);
    assert.ok(
      record.ws.length >= 1 && record.ws.length <= U.SIZE_SUFFIXES.length,
      `${record.id}: ws length`
    );
    assert.equal(record.w, record.ws[record.ws.length - 1], `${record.id}: w matches ws`);
    assert.ok(record.w > 0 && record.h > 0, `${record.id}: missing size`);
  }
});

test('catalogue: hero slides and featured works in the config exist', () => {
  const source = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
  const ids = new Set(WORKS.map((record) => record.id));
  const listFor = (key) => {
    const block = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`).exec(source);
    assert.ok(block, `${key} not found`);
    return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  };
  assert.ok(listFor('heroSlides').length >= 3, 'the hero slideshow needs a few works');
  [...listFor('heroSlides'), ...listFor('featuredIds')].forEach((id) =>
    assert.ok(ids.has(id), `configured id ${id} is not in the catalogue`)
  );
});

test(
  'catalogue: every referenced image file exists',
  { skip: !fs.existsSync(path.join(ROOT, 'images')) && 'images/ folder not present yet' },
  () => {
    const missing = [];
    for (const record of WORKS) {
      // A whole image folder may not have been added yet (e.g. photography); the
      // folder check is skipped for it, but every file is checked once it exists.
      const folder = path.join(ROOT, 'images', record.base.split('/')[0]);
      if (!fs.existsSync(folder)) continue;
      for (const suffix of U.SIZE_SUFFIXES.slice(0, record.ws.length)) {
        const file = path.join(ROOT, U.imageUrl(record, suffix));
        if (!fs.existsSync(file)) missing.push(path.relative(ROOT, file));
      }
    }
    assert.deepEqual(missing, []);
  }
);

const ThemeUtils = require('../js/theme-utils.js');

test('theme: a saved choice beats the device setting', () => {
  assert.equal(ThemeUtils.resolveTheme({ chosen: 'light', systemPrefersDark: true }), 'light');
  assert.equal(ThemeUtils.resolveTheme({ chosen: 'dark', systemPrefersDark: false }), 'dark');
});

test('theme: with no (or an invalid) choice the device setting decides', () => {
  assert.equal(ThemeUtils.resolveTheme({ chosen: null, systemPrefersDark: true }), 'dark');
  assert.equal(ThemeUtils.resolveTheme({ chosen: 'sepia', systemPrefersDark: false }), 'light');
  assert.equal(ThemeUtils.parseTheme(undefined), null);
});

test('theme: opposite flips between the two themes', () => {
  assert.equal(ThemeUtils.oppositeTheme('light'), 'dark');
  assert.equal(ThemeUtils.oppositeTheme('dark'), 'light');
});

test('every page loads the theme script before first paint', () => {
  ['index', 'gallery', 'artist-statement', 'contact', 'resume', '404'].forEach((page) => {
    const html = fs.readFileSync(path.join(ROOT, `${page}.html`), 'utf8');
    assert.match(html, /<script src="js\/theme-utils\.js(\?v=[0-9a-f]+)?"><\/script>\s*<script src="js\/theme\.js(\?v=[0-9a-f]+)?"><\/script>/, page);
  });
});

const IntroUtils = require('../js/intro-utils.js');

test('intro: plays on arrival and reload of the home page only', () => {
  const base = { pathname: '/', referrer: '', origin: 'https://site.test', navigationType: 'navigate' };
  assert.equal(IntroUtils.shouldPlayIntro(base), true);
  assert.equal(IntroUtils.shouldPlayIntro({ ...base, navigationType: 'reload', referrer: 'https://site.test/work.html' }), true);
  assert.equal(IntroUtils.shouldPlayIntro({ ...base, referrer: 'https://elsewhere.test/' }), true);
});

test('intro: skipped when clicking through from inside the site, on Back, and off the home page', () => {
  const base = { pathname: '/', referrer: '', origin: 'https://site.test', navigationType: 'navigate' };
  assert.equal(IntroUtils.shouldPlayIntro({ ...base, referrer: 'https://site.test/work.html' }), false);
  assert.equal(IntroUtils.shouldPlayIntro({ ...base, navigationType: 'back_forward' }), false);
  assert.equal(IntroUtils.shouldPlayIntro({ ...base, pathname: '/work.html' }), false);
});

test('intro: recognises the home page under a sub-folder host', () => {
  assert.equal(IntroUtils.isHomePath('/Portfolio-by-Claude/'), true);
  assert.equal(IntroUtils.isHomePath('/Portfolio-by-Claude/index.html'), true);
  assert.equal(IntroUtils.isHomePath('/Portfolio-by-Claude/about.html'), false);
});

test('series: ids are unique and every series has at least one work', () => {
  const ids = SERIES.map((series) => series.id);
  assert.equal(new Set(ids).size, ids.length);
  SERIES.forEach((series) => {
    assert.ok(U.worksInSeries(series, WORKS).length > 0, `${series.id} is empty`);
  });
});

test('series: listed ids all exist and keep their order', () => {
  SERIES.filter((series) => series.workIds).forEach((series) => {
    const found = U.worksInSeries(series, WORKS).map((work) => work.id);
    assert.deepEqual(found, series.workIds, `${series.id} lists a work that does not exist`);
  });
});

test('series: a category + year rule collects only matching works', () => {
  const found = U.worksInSeries({ category: 'photography', year: 2022 }, WORKS);
  assert.ok(found.length > 0);
  assert.ok(found.every((w) => w.category === 'photography' && w.year === 2022));
});

test('series: meta line gives the count and the year or span of years', () => {
  assert.equal(U.seriesMeta([work({ year: 2023 })]), '1 work · 2023');
  assert.equal(U.seriesMeta([work({ year: 2023 }), work({ year: 2025 })]), '2 works · 2023–2025');
  assert.equal(U.seriesMeta([work({ year: null })]), '1 work');
});

test('series: every page links to the Series page and series.html exists', () => {
  ['index', 'gallery', 'artist-statement', 'contact', 'resume', 'series', '404'].forEach((page) => {
    const html = fs.readFileSync(path.join(ROOT, `${page}.html`), 'utf8');
    assert.match(html, /<li><a href="series\.html"/, page);
  });
});

const { stampHtml } = require('../tools/stamp-assets.js');

test('asset stamps: local css and js get a content hash, other links are untouched', () => {
  const html = '<link rel="stylesheet" href="css/styles.css"><script src="js/theme.js" defer></script><link rel="icon" href="favicon.svg">';
  const out = stampHtml(html);
  assert.match(out, /href="css\/styles\.css\?v=[0-9a-f]{8}"/);
  assert.match(out, /src="js\/theme\.js\?v=[0-9a-f]{8}" defer/);
  assert.match(out, /href="favicon\.svg"/);
  assert.equal(stampHtml(out), out, 'stamping twice changes nothing');
});

test('pickRandom returns distinct items, never more than exist, and does not touch the input', () => {
  const items = ['a', 'b', 'c', 'd'];
  const picked = U.pickRandom(items, 3, () => 0);
  assert.deepEqual(picked, ['a', 'b', 'c']);
  assert.deepEqual(items, ['a', 'b', 'c', 'd']);
  assert.equal(new Set(U.pickRandom(items, 10)).size, 4);
  assert.deepEqual(U.pickRandom([], 3), []);
});

test('pickRandom follows the random source', () => {
  assert.deepEqual(U.pickRandom(['a', 'b', 'c'], 2, () => 0.99), ['c', 'b']);
});

test('composeMailto encodes the subject and body and signs the note with the sender name', () => {
  const href = ContactUtils.composeMailto('hi@example.com', { topic: 'A commission', name: 'Sam', message: 'Hello & welcome' });
  const url = new URL(href);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, 'hi@example.com');
  assert.equal(url.searchParams.get('subject'), 'A commission — Sam');
  assert.equal(url.searchParams.get('body'), 'Hello & welcome\n\n— Sam');
});

test('composeMailto leaves out the name parts when no name is given', () => {
  const url = new URL(ContactUtils.composeMailto('hi@example.com', { topic: 'Just saying hello', name: '  ', message: ' Hi ' }));
  assert.equal(url.searchParams.get('subject'), 'Just saying hello');
  assert.equal(url.searchParams.get('body'), 'Hi');
});

test('clockAt gives the local time in a place and whether it is daytime there', () => {
  const instant = new Date('2026-10-17T06:31:00Z');
  assert.deepEqual(ContactUtils.clockAt(instant, 'America/New_York'), { time: '2:31 AM', isDay: false });
  assert.deepEqual(ContactUtils.clockAt(instant, 'Asia/Dhaka'), { time: '12:31 PM', isDay: true });
});

test('NOTE_TOPICS starts with the friendliest default', () => {
  assert.equal(ContactUtils.NOTE_TOPICS[0], 'Just saying hello');
});
