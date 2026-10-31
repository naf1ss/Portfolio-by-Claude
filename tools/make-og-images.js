#!/usr/bin/env node
/**
 * Link-preview pictures (og:image, 1200 × 630): the card shown when a page of the site is shared on Instagram,
 * LinkedIn, iMessage or in an email. Writes images/og/:
 *
 *   site.jpg               every page without its own card: three works, the site's name and the artist's
 *   project-<id>.jpg       a project's cover beside its title
 *   series-<id>.jpg        a series' first work beside its title
 *
 * Works are shown whole (letterboxed), never cropped. Run it after adding or renaming a project or series:
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
const { ARTIST } = require('./seo.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'images', 'og');
const SITE_WORKS = ['A042', 'A041', 'A012']; // the default card: Quarry, Aggressive Happiness, Eiffel Tower

const works = require('../js/works-data.js').concat(require('../js/works-photography.js'));
const byId = new Map(works.map((work) => [work.id, work]));
const SERIES = require('../js/series-data.js');
const PROJECTS = require('../js/projects-data.js');

const fileUrl = (relative) => `file://${path.join(ROOT, relative)}`;
const picture = (work) => fileUrl(U.imageUrl(work, 1200).replace(/\?.*$/, ''));
const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = (text) => escapeHtml(String(text).replace(/\*/g, ''));

function card({ kicker, title, images }) {
  const font = (file, family, style = 'normal') =>
    `@font-face { font-family: '${family}'; src: url('${fileUrl(`fonts/${file}`)}') format('woff2'); font-weight: 100 900; font-style: ${style}; }`;
  const art = images.map((src) => `<img src="${src}" alt="">`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${font('bodoni-moda-latin-wght-normal.woff2', 'Bodoni Moda')}
    ${font('manrope-latin-wght-normal.woff2', 'Manrope')}
    * { box-sizing: border-box; margin: 0; }
    body { width: 1200px; height: 630px; display: grid; grid-template-columns: ${images.length > 1 ? 720 : 630}px 1fr; background: #fff; color: #000; font-family: Manrope, sans-serif; }
    .art { height: 630px; display: flex; gap: 18px; align-items: center; justify-content: center; padding: 44px; background: #f1eee9; }
    .art img { min-width: 0; max-width: 100%; max-height: 542px; object-fit: contain; box-shadow: 0 10px 26px -12px rgb(0 0 0 / 0.45); }
    .art--many img { max-width: calc((100% - 36px) / 3); }
    .text { display: flex; flex-direction: column; padding: 56px 56px 50px; }
    .mark { font-family: 'Bodoni Moda', serif; font-size: 34px; font-weight: 600; }
    .mark span { color: #0071e3; }
    .kicker { margin-top: auto; font-size: 15px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #0071e3; }
    h1 { margin-top: 14px; font-family: 'Bodoni Moda', serif; font-size: ${title.length > 34 ? 44 : 56}px; font-weight: 500; line-height: 1.06; letter-spacing: -0.01em; }
    .by { margin-top: auto; padding-top: 28px; font-size: 19px; font-weight: 600; }
    .site { margin-top: 4px; font-size: 16px; color: #6b6b6b; }
  </style></head><body>
    <div class="art${images.length > 1 ? ' art--many' : ''}">${art}</div>
    <div class="text">
      <p class="mark">n<span>.</span></p>
      <p class="kicker">${plain(kicker)}</p>
      <h1>${plain(title)}</h1>
      <p class="by">${ARTIST.shortName}</p>
      <p class="site">nuancesbynafis.com</p>
    </div>
  </body></html>`;
}

function cards() {
  const list = [
    { file: 'site.jpg', kicker: 'Portfolio', title: 'nuances by nafis', images: SITE_WORKS.map((id) => picture(byId.get(id))) },
  ];
  PROJECTS.forEach((project) => {
    list.push({ file: `project-${project.id}.jpg`, kicker: project.kicker, title: project.title, images: [picture(byId.get(project.cover))] });
  });
  SERIES.forEach((series) => {
    const first = U.worksInSeries(series, works)[0];
    if (!first) return;
    list.push({ file: `series-${series.id}.jpg`, kicker: `Series · ${series.medium || first.category}`, title: series.title, images: [picture(first)] });
  });
  return list;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  try {
    for (const entry of cards()) {
      const html = path.join(scratch, 'card.html');
      fs.writeFileSync(html, card(entry));
      await page.goto(`file://${html}`);
      await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((img) => img.decode().catch(() => {}))]));
      await page.screenshot({ path: path.join(OUT, entry.file), type: 'jpeg', quality: 84 });
      console.log(`images/og/${entry.file}`);
    }
  } finally {
    await browser.close();
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
