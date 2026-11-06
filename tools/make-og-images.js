#!/usr/bin/env node
/**
 * Link-preview pictures (og:image, 1200 × 630): the card shown when a page of the site is shared on Instagram,
 * LinkedIn, iMessage or in an email. Writes images/og/:
 *
 *   site.jpg               every page without its own card: works on the gallery wall, and the site's name
 *   gallery.jpg            the gallery: works on the gallery wall
 *   series-<id>.jpg        a series of paintings, drawings or prints: the series on the gallery wall;
 *                          any other series (photographs, ceramics): its first work beside its title
 *   project-<id>.jpg       a project's cover beside its title
 *
 * Wall cards are drawn by the site's own gallery wall (js/gallery-room.js and its styles), so a preview looks
 * exactly like the room it leads to. Works are shown whole, never cropped. Run it after adding or renaming a
 * project or series, or changing what hangs in one:
 *
 *     node tools/make-og-images.js
 *
 * Needs Playwright, like the phone check.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const U = require('../js/works-utils.js');
const { planRows } = require('../js/justify.js');
const { ARTIST } = require('./seo.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'images', 'og');
const SIZE = { width: 1200, height: 630 };
const JPEG_QUALITY = 86;
const SITE_WORKS = ['A030', 'A012', 'A041']; // the default card: Almost Happy, Eiffel Tower, Aggressive Happiness
const GALLERY_WORKS = ['A043', 'A037', 'A032']; // the gallery's card: The Milkmaid study, Rain in Paris, Nobanno
// A series whose card hangs other works than its page: Horizon's overview photograph of the six prints is left out.
const WALL_WORKS = { horizon: ['A019', 'A020', 'A021', 'A022', 'A023', 'A024'] };
const WALL_CATEGORIES = new Set(['painting', 'drawing', 'print']); // what the gallery wall hangs (js/pages.js)
// The scripts the gallery wall needs, in the order the site loads them (src/site.json).
const WALL_SCRIPTS = ['works-utils', 'works-data', 'series-data', 'gallery-room-utils', 'pull-cord', 'gallery-room'];

const works = require('../js/works-data.js').concat(require('../js/works-photography.js'));
const byId = new Map(works.map((work) => [work.id, work]));
const SERIES = require('../js/series-data.js');
const PROJECTS = require('../js/projects-data.js');

const fileUrl = (relative) => `file://${path.join(ROOT, relative)}`;
const picture = (work) => fileUrl(U.imageUrl(work, 1200).replace(/\?.*$/, ''));
const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = (text) => escapeHtml(String(text).replace(/\*/g, ''));
const titleSize = (title) => (title.length > 34 ? 44 : title.length > 18 ? 50 : 56);

function fontFaces() {
  const face = (file, family) =>
    `@font-face { font-family: '${family}'; src: url('${fileUrl(`fonts/${file}`)}') format('woff2'); font-weight: 100 900; }`;
  return [
    face('bodoni-moda-latin-wght-normal.woff2', 'Bodoni Moda'),
    face('manrope-latin-wght-normal.woff2', 'Manrope'),
    face('kaushan-script-latin-400-normal.woff2', 'Kaushan Script'),
  ].join('\n');
}

/** The name, the mark and the address, shared by both kinds of card. */
function textBlock({ kicker, title, wordmark }) {
  // The site's own name is set as on the home page: "nuances." in Bodoni, "by nafis" in the script signature.
  const heading = wordmark
    ? '<h1 class="og-wordmark"><span>nuances<span class="og-wordmark__dot">.</span></span><span class="og-wordmark__by">by nafis</span></h1>'
    : `<h1>${plain(title)}</h1>`;
  return `
      <p class="mark">n<span>.</span></p>
      <p class="kicker">${plain(kicker)}</p>
      ${heading}
      <p class="by">${escapeHtml(ARTIST.name)}</p>
      <p class="site">nuancesbynafis.com</p>`;
}

/** The card's text over the wall's colour, shared by both kinds of card: the mark, the label and the name. */
function textStyles(title) {
  return `
    .text { position: absolute; z-index: 5; top: 0; left: 0; bottom: 92px; width: 400px; display: flex; flex-direction: column;
      padding: 52px 0 34px 56px; color: #f1ece1; font-family: Manrope, sans-serif; }
    .mark { margin: 0; font-family: 'Bodoni Moda', serif; font-size: 34px; font-weight: 600; line-height: 1; }
    .mark span { color: #4a9dff; }
    .kicker { margin: auto 0 0; font-size: 14px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #b5bccb; }
    h1 { margin: 14px 0 0; font-family: 'Bodoni Moda', serif; font-size: ${titleSize(title)}px; font-weight: 500; line-height: 1.04; letter-spacing: -0.015em; text-wrap: balance; }
    h1::after { content: ''; display: block; width: 36px; height: 1px; margin-top: 22px; background: rgb(241 236 225 / 0.45); }
    .og-wordmark { display: inline-grid; justify-self: start; font-size: 76px; letter-spacing: -0.035em; line-height: 0.95; }
    .og-wordmark__dot { color: #4a9dff; }
    .og-wordmark__by { justify-self: end; margin-top: 4px; color: #4a9dff; font-family: 'Kaushan Script', cursive; font-size: 0.4em;
      letter-spacing: 0; rotate: -3deg; }
    .og-wordmark::after { margin-top: 18px; }
    .by { margin: auto 0 0; font-size: 18px; font-weight: 600; }
    .site { margin: 4px 0 0; font-size: 15px; color: #b5bccb; }`;
}

const ART_BOX = { left: 424, top: 56, width: 712, height: 518 }; // where pictures sit on a card without the wall
const ART_GAP = 16;
const MIN_PICTURES = 4; // a series is shown by several of its works, not one
const MAX_PICTURES = 5;

/** `count` works spread evenly through a list, the first always among them. */
function spread(list, count) {
  if (list.length <= count) return list.slice();
  return Array.from({ length: count }, (_, i) => list[Math.round((i * (list.length - 1)) / (count - 1))]);
}

/**
 * Places pictures whole in the box, in rows that run edge to edge (the planning of js/justify.js), shrunk to fit
 * its height when they must be. Of the ways to show a few works from the list, keeps the one where the pictures
 * cover the most of the box. Returns [{ work, x, y, w, h }] relative to the box.
 */
function layoutPictures(list, box = ART_BOX, gap = ART_GAP) {
  let best = null;
  const fewest = Math.min(list.length, MIN_PICTURES);
  const counts = Array.from({ length: Math.min(list.length, MAX_PICTURES) - fewest + 1 }, (_, i) => fewest + i);
  counts.forEach((count) => {
    const chosen = spread(list, count);
    const ratios = chosen.map((work) => work.w / work.h);
    [1, 2].forEach((rowCount) => {
      const target = (box.height - gap * (rowCount - 1)) / rowCount;
      const rows = planRows(ratios, box.width, gap, target);
      const natural = rows.reduce((sum, row) => sum + row.height, 0) + gap * (rows.length - 1);
      // Rows that run taller than the box shrink together; their gaps stay as they are.
      const scale = Math.min(1, (box.height - gap * (rows.length - 1)) / (natural - gap * (rows.length - 1)));
      let y = (box.height - (rows.reduce((sum, row) => sum + row.height * scale, 0) + gap * (rows.length - 1))) / 2;
      const placed = [];
      rows.forEach((row) => {
        const rowHeight = row.height * scale;
        const widths = ratios.slice(row.start, row.end).map((ratio) => ratio * rowHeight);
        let x = (box.width - (widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1))) / 2;
        widths.forEach((w, i) => {
          placed.push({ work: chosen[row.start + i], x, y, w, h: rowHeight });
          x += w + gap;
        });
        y += rowHeight + gap;
      });
      const area = placed.reduce((sum, { w, h }) => sum + w * h, 0);
      // More works win unless they leave the pictures much smaller.
      if (!best || area > best.area * 1.04 || (area > best.area * 0.85 && placed.length > best.placed.length)) best = { area, placed };
    });
  });
  return best.placed;
}

/**
 * Works that do not hang on the gallery wall (photographs, ceramics, project covers): a few of them whole, on the
 * same wall colour and plaster, so every card belongs to one family.
 */
function panelCard({ kicker, title, pictures }) {
  const art = layoutPictures(pictures)
    .map(({ work, x, y, w, h }) => `<img src="${picture(work)}" alt="" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px">`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fontFaces()}
    * { box-sizing: border-box; }
    body { position: relative; margin: 0; width: ${SIZE.width}px; height: ${SIZE.height}px; overflow: hidden; background: #1d2433; }
    body::before { content: ''; position: absolute; inset: 0; background: url('${fileUrl('images/room/plaster.jpg')}') 0 0 / 640px 640px;
      mix-blend-mode: soft-light; opacity: 0.55; }
    body::after { content: ''; position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse 52% 70% at 68% 46%, rgb(255 226 178 / 0.13), transparent 70%); }
    .art { position: absolute; z-index: 2; left: ${ART_BOX.left}px; top: ${ART_BOX.top}px; width: ${ART_BOX.width}px; height: ${ART_BOX.height}px; }
    .art img { position: absolute; object-fit: cover; box-shadow: 0 2px 4px rgb(0 0 0 / 0.35), 0 22px 44px -14px rgb(0 0 0 / 0.75); }
    ${textStyles(title)}
    .text { bottom: 0; padding-bottom: 50px; }
  </style></head><body>
    <div class="art">${art}</div>
    <div class="text">${textBlock({ kicker, title })}</div>
  </body></html>`;
}

/**
 * Works hung together on the site's gallery wall, lit, with the title on the wall beside them. The wall's own
 * label and notes are hidden: the card writes a shorter label of its own in their place.
 */
function wallCard({ kicker, title, workIds, wordmark = false }) {
  const hanging = { id: 'og-card', title, hangTogether: true, workIds };
  return `<!doctype html><html><head><meta charset="utf-8"><base href="${fileUrl('')}/">
  <link rel="stylesheet" href="css/styles.css">
  ${WALL_SCRIPTS.map((name) => `<script src="js/${name}.js"></script>`).join('\n  ')}
  <style>
    ${fontFaces()}
    html { overflow: hidden; scrollbar-width: none; }
    body { margin: 0; width: ${SIZE.width}px; height: ${SIZE.height}px; overflow: hidden; background: #1d2433; }
    /* The whole card is one screen of wall: no extra wall below the works, and a strip of floor. */
    .room { height: ${SIZE.height}px !important; --room-below: 0px !important; --room-floor-h: 92px; }
    .room__bar, .room__walk, .room__notes { display: none !important; }
    .room__label { visibility: hidden; }
    .room__segment { grid-template-columns: 360px minmax(0, 1fr) !important; padding: 64px 56px 34px !important; gap: 24px !important; }
    ${textStyles(title)}
  </style></head><body>
    <div id="room" class="room"></div>
    <div class="text">${textBlock({ kicker, title, wordmark })}</div>
    <script>
      try { localStorage.removeItem('nuances.roomLights'); } catch (error) {} // the lights are on unless switched off
      const hanging = ${JSON.stringify(hanging)};
      const list = hanging.workIds.map((id) => window.PORTFOLIO_WORKS.find((work) => work.id === id));
      window.GalleryRoom.create(document.getElementById('room'), { series: [hanging] }).show(list);
    </script>
  </body></html>`;
}

/** The works of a series that the gallery wall would hang, or null when the series is not shown there. */
function wallWorks(series) {
  if (WALL_WORKS[series.id]) return WALL_WORKS[series.id];
  const members = U.worksInSeries(series, works).filter((work) => WALL_CATEGORIES.has(work.category));
  return members.length ? members.map((work) => work.id) : null;
}

function cards() {
  const list = [
    { file: 'site.jpg', kind: 'wall', kicker: 'Portfolio', title: 'nuances by nafis', wordmark: true, workIds: SITE_WORKS },
    { file: 'gallery.jpg', kind: 'wall', kicker: 'Works by medium', title: 'Gallery', workIds: GALLERY_WORKS },
  ];
  PROJECTS.forEach((project) => {
    list.push({ file: `project-${project.id}.jpg`, kind: 'panel', kicker: project.kicker, title: project.title, pictures: [byId.get(project.cover)] });
  });
  SERIES.forEach((series) => {
    const first = U.worksInSeries(series, works)[0];
    if (!first) return;
    const kicker = `Series · ${series.medium || first.category}`;
    const onWall = wallWorks(series);
    list.push(
      onWall
        ? { file: `series-${series.id}.jpg`, kind: 'wall', kicker, title: series.title, workIds: onWall }
        : { file: `series-${series.id}.jpg`, kind: 'panel', kicker, title: series.title, pictures: U.worksInSeries(series, works) }
    );
  });
  return list;
}

/** Resolves once the fonts are in, every picture has decoded and the wall has hung (it lays out in a frame). */
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all([...document.images].map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => {}))));
  });
  await page.waitForTimeout(1600); // the picture lights fade up
}

async function main() {
  const only = process.argv.slice(2); // optional: file names to redraw, e.g. gallery.jpg
  fs.mkdirSync(OUT, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: SIZE, reducedMotion: 'reduce' });
  page.on('pageerror', (error) => console.error(`  page error: ${error.message}`));
  try {
    for (const entry of cards().filter(({ file }) => !only.length || only.includes(file))) {
      const html = path.join(scratch, 'card.html');
      fs.writeFileSync(html, entry.kind === 'wall' ? wallCard(entry) : panelCard(entry));
      await page.goto(`file://${html}`);
      await settle(page);
      await page.screenshot({ path: path.join(OUT, entry.file), type: 'jpeg', quality: JPEG_QUALITY });
      console.log(`images/og/${entry.file}`);
    }
  } finally {
    await browser.close();
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { cards };
