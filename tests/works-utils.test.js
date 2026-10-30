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

test('Wall magazine is a gallery filter but stays off the home page list', () => {
  const wall = U.CATEGORIES.find((category) => category.id === 'wall-magazine');
  assert.ok(wall);
  assert.equal(wall.onHome, false);
});

test('an old ?c=mixed link opens the Painting filter', () => {
  assert.equal(U.categoryFromSearch('?c=mixed'), 'painting');
  assert.equal(U.categoryFromSearch('?c=wall-magazine'), 'wall-magazine');
});

test('buildSrcset lists each size with its real pixel width', () => {
  assert.equal(
    U.buildSrcset(work()),
    'images/artwork/a001-test-600.jpg 600w, images/artwork/a001-test-1200.jpg 1200w, images/artwork/a001-test-1800.jpg 1800w'
  );
});

test('a work with a revision gets a cache-busting query on every image address', () => {
  const revised = { ...work(), rev: 2 };
  assert.equal(U.imageUrl(revised, 600), 'images/artwork/a001-test-600.jpg?v=2');
  assert.equal(
    U.buildSrcset(revised),
    'images/artwork/a001-test-600.jpg?v=2 600w, images/artwork/a001-test-1200.jpg?v=2 1200w, images/artwork/a001-test-1800.jpg?v=2 1800w',
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

test('categoryFromSearch uses the fallback only when ?c= is missing or unknown', () => {
  assert.equal(U.categoryFromSearch('', 'painting'), 'painting');
  assert.equal(U.categoryFromSearch('?c=nonsense', 'painting'), 'painting');
  assert.equal(U.categoryFromSearch('?c=all', 'painting'), 'all');
  assert.equal(U.categoryFromSearch('?c=print', 'painting'), 'print');
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

test('catalogue: hero lead works in the config exist', () => {
  const source = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
  const ids = new Set(WORKS.map((record) => record.id));
  const listFor = (key) => {
    const block = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`).exec(source);
    assert.ok(block, `${key} not found`);
    return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  };
  assert.ok(listFor('heroLead').length >= 1, 'the hero slideshow needs a lead work');
  [...listFor('heroLead')].forEach((id) =>
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
        const file = path.join(ROOT, U.imageUrl(record, suffix).split('?')[0]);
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
  const found = U.worksInSeries({ category: 'photography', year: 2025 }, WORKS);
  assert.ok(found.length > 0);
  assert.ok(found.every((w) => w.category === 'photography' && w.year === 2025));
});

test('photography: every photograph names a photography series, and its title says where it hangs', () => {
  const seriesById = new Map(SERIES.map((series) => [series.id, series]));
  PHOTOS.forEach((photo) => {
    const series = seriesById.get(photo.series);
    assert.ok(series, `${photo.id} names a series that does not exist: ${photo.series}`);
    assert.ok(photo.title.startsWith(`${series.title}, `), `${photo.id} is titled for another series`);
  });
});

test('photography: frames keep their series order even in the sorted catalogue', () => {
  U.photographySeries(SERIES, U.sortWorks(WORKS)).forEach(({ series, works }) => {
    works.forEach((work, index) => {
      assert.equal(work.title, `${series.title}, ${index + 1} of ${works.length}`);
    });
  });
});

test('photography: every photography series has a room treatment', () => {
  const treatments = ['vast', 'light', 'fog', 'axis', 'window', 'stage', 'grid'];
  U.photographySeries(SERIES, WORKS).forEach(({ series }) => {
    assert.ok(treatments.includes(series.treatment), `${series.id} has no known treatment`);
  });
});

test('photography: photo ids are unique', () => {
  const ids = PHOTOS.map((photo) => photo.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('worksInSeries: a series with no list or rule holds the works that name it, in their order', () => {
  const works = [work({ id: 'a', series: 'sky' }), work({ id: 'b' }), work({ id: 'c', series: 'sky' })];
  assert.deepEqual(U.worksInSeries({ id: 'sky' }, works).map((w) => w.id), ['a', 'c']);
});

test('photographySeries: keeps only series made of photographs, with their frames in series order', () => {
  const photo = (id) => work({ id, category: 'photography' });
  const painting = work({ id: 'p1', category: 'painting' });
  const works = [photo('a'), photo('b'), photo('c'), painting];
  const found = U.photographySeries(
    [
      { id: 'roll', title: 'Roll', workIds: ['c', 'a'] },
      { id: 'mixed', title: 'Mixed', workIds: ['a', 'p1'] },
      { id: 'empty', title: 'Empty', workIds: ['missing'] },
    ],
    works
  );
  assert.deepEqual(found.map((entry) => entry.series.id), ['roll']);
  assert.deepEqual(found[0].works.map((w) => w.id), ['c', 'a']);
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

test('catalogue: every selected work on the home page exists, once', () => {
  const source = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
  const ids = [...(/selectedIds:\s*\[([^\]]*)\]/.exec(source) || [, ''])[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.ok(ids.length > 0, 'selectedIds not found');
  const known = new Set(WORKS.map((record) => record.id));
  ids.forEach((id) => assert.ok(known.has(id), `selectedIds: ${id} is not in the catalogue`));
  assert.equal(new Set(ids).size, ids.length, 'selectedIds lists a work twice');
});

test('catalogue: the latest work and every medium pick in the config exist and match their medium', () => {
  const source = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
  const byId = new Map(WORKS.map((record) => [record.id, record]));
  const latest = /latestId:\s*'([^']+)'/.exec(source);
  assert.ok(latest && byId.has(latest[1]), 'latestId is not in the catalogue');
  const picks = [...source.matchAll(/\{\s*category:\s*'([^']+)',\s*best:\s*'([^']+)'\s*\}/g)];
  assert.ok(picks.length >= 1, 'mediumPicks not found');
  picks.forEach(([, category, best]) => {
    assert.ok(byId.has(best), `mediumPicks: ${best} is not in the catalogue`);
    assert.equal(byId.get(best).category, category, `${best} is not in ${category}`);
  });
});

test('pickMediumWorks shows the best work first, then a random one from the same medium', () => {
  const works = [
    { id: 'P1', category: 'painting' },
    { id: 'P2', category: 'painting' },
    { id: 'P3', category: 'painting', hidden: true },
    { id: 'C1', category: 'ceramics' },
  ];
  const picks = [
    { category: 'painting', best: 'P2' },
    { category: 'ceramics', best: 'C1' },
    { category: 'drawing', best: 'D1' },
  ];
  const ids = (options) => U.pickMediumWorks(works, picks, options).map((work) => work.id);
  assert.deepEqual(ids({ showBest: true }), ['P2', 'C1']);
  assert.deepEqual(ids({ showBest: false, random: () => 0 }), ['P1', 'C1']);
  assert.deepEqual(ids({ showBest: false, random: () => 0.99 }), ['P2', 'C1']); // hidden P3 is never picked
});

test('catalogue: every work a series story shows is in the catalogue', () => {
  const STORIES = require('../js/series-stories.js');
  const ids = new Set(WORKS.map((record) => record.id));
  const seriesIds = new Set(SERIES.map((series) => series.id));
  Object.entries(STORIES).forEach(([seriesId, story]) => {
    assert.ok(seriesIds.has(seriesId), `story for unknown series ${seriesId}`);
    const strips = (story.chapters || []).flatMap((part) => (part.strip ? part.strip.items : []));
    const shown = [story.intro, ...(story.chapters || []), story.related, ...strips, ...(story.works || [])].filter(
      (part) => part && part.workId
    );
    shown.forEach((part) => assert.ok(ids.has(part.workId), `${seriesId}: ${part.workId} is not in the catalogue`));
  });
});

test('series: medium names a series by its own medium, else by its works’ categories in gallery order', () => {
  assert.equal(U.seriesMedium({ medium: 'Monotype' }, [work({ category: 'print' })]), 'Monotype');
  assert.equal(U.seriesMedium({}, [work({ category: 'ceramics' }), work({ category: 'ceramics' })]), 'Ceramics');
  assert.equal(U.seriesMedium({}, [work({ category: 'drawing' }), work({ category: 'painting' })]), 'Painting & drawing');
});

test('series: year span gives one year, a span, or nothing', () => {
  assert.equal(U.yearSpan([work({ year: 2026 }), work({ year: 2026 })]), '2026');
  assert.equal(U.yearSpan([work({ year: 2025 }), work({ year: 2016 }), work({ year: null })]), '2016–2025');
  assert.equal(U.yearSpan([work({ year: null })]), null);
});

test('applyCuratedOrder puts listed works first within their medium and keeps the media where they were', () => {
  const works = [
    { id: 'p1', category: 'painting' },
    { id: 'x1', category: 'print' },
    { id: 'p2', category: 'painting' },
    { id: 'x2', category: 'print' },
    { id: 'x3', category: 'print' },
  ];
  const ids = U.applyCuratedOrder(works, { print: ['x3', 'x1'] }).map((work) => work.id);
  assert.deepEqual(ids, ['p1', 'x3', 'p2', 'x1', 'x2']);
  assert.deepEqual(U.applyCuratedOrder(works).map((work) => work.id), works.map((work) => work.id));
});

test('catalogue: every picture a project shows is in the catalogue', () => {
  const PROJECTS = require('../js/projects-data.js');
  const ids = new Set(WORKS.map((record) => record.id));
  PROJECTS.forEach((project) => {
    const used = [project.cover, project.hero && project.hero.workId].filter(Boolean);
    project.sections.forEach((section) =>
      section.blocks.forEach((block) => {
        if (block.workId) used.push(block.workId);
        (block.items || []).forEach((item) => item.workId && used.push(item.workId));
      })
    );
    used.forEach((id) => assert.ok(ids.has(id), `${project.id}: ${id} is not in the catalogue`));
    assert.equal(new Set(project.sections.map((s) => s.id)).size, project.sections.length, `${project.id}: section ids repeat`);
  });
});

test('projects: a case study shows each picture only once', () => {
  const PROJECTS = require('../js/projects-data.js');
  PROJECTS.forEach((project) => {
    const shown = project.hero ? [project.hero.workId] : [];
    project.sections.forEach((section) =>
      section.blocks.forEach((block) => {
        if (block.workId) shown.push(block.workId);
        (block.items || []).forEach((item) => item.workId && shown.push(item.workId));
      })
    );
    const repeated = shown.filter((id, i) => shown.indexOf(id) !== i);
    assert.deepEqual(repeated, [], `${project.id} repeats ${repeated.join(', ')}`);
  });
});

test('projects: every contents label fits on one row of the rail', () => {
  const PROJECTS = require('../js/projects-data.js');
  const MAX_RAIL_LABEL = 16; // characters that fit the 14rem rail at the current link's size
  PROJECTS.forEach((project) =>
    project.sections.forEach(({ id, label }) =>
      assert.ok(label.length <= MAX_RAIL_LABEL, `${project.id}/${id}: "${label}" is too long for the contents rail`)
    )
  );
});

test('photography: every photograph has a measured brightness (run tools/photo-brightness.py after adding photos)', () => {
  const brightness = require('../js/photo-brightness.js');
  const missing = PHOTOS.filter((photo) => typeof brightness[photo.id] !== 'number').map((photo) => photo.id);
  assert.deepEqual(missing, []);
});

test('groupSets moves every member of a set up behind the first, and countByCategory counts a set once', () => {
  const works = [
    work({ id: 'a', category: 'design' }),
    work({ id: 's1', category: 'design', set: 'board' }),
    work({ id: 'b', category: 'design' }),
    work({ id: 's2', category: 'design', set: 'board' }),
    work({ id: 's3', category: 'design', set: 'board' }),
  ];
  assert.deepEqual(U.groupSets(works).map((w) => w.id), ['a', 's1', 's2', 's3', 'b']);
  const counts = U.countByCategory(works);
  assert.equal(counts.design, 3);
  assert.equal(counts.all, 3);
});
