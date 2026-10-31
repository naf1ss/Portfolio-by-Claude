#!/usr/bin/env node
/**
 * Phone check: opens every page of the built site at two phone sizes in a real browser and fails if a phone
 * visitor would hit a problem:
 *
 *   - the page scrolls sideways
 *   - a script error, or a file (image, script, style) that fails to load
 *   - a picture on screen that never loads
 *   - a control that a tap would not reach: something else (an invisible layer, a header) sits on top of it
 *   - the footer's lettering never fills with a picture
 *
 *     npm run check:phone
 *
 * Needs Playwright (`npm install --no-save playwright && npx playwright install chromium` once, if it is not
 * already installed). It serves the folder itself, so no other server is needed.
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  console.error('The phone check needs Playwright: npm install --no-save playwright && npx playwright install chromium');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
const PHONES = [
  { name: 'phone 390×844', width: 390, height: 844 },
  { name: 'small phone 375×667', width: 375, height: 667 },
];

// Every page, with the controls on it that must take a tap. `tap` selectors are checked only when present;
// `storage` seeds localStorage first (a view the visitor chose on an earlier visit).
const PAGES = [
  { url: 'index.html' },
  { url: 'gallery.html', tap: ['.room__segment.is-here .room__frame', '.room__cord', '.room__walk button', '.menu-toggle'] },
  { url: 'gallery.html?c=drawing', tap: ['.room__segment.is-here .room__frame', '.room__cord'] },
  { url: 'gallery.html?c=print', tap: ['.room__segment.is-here .room__frame'] },
  { url: 'gallery.html?c=digital', tap: ['#gallery .tile'] },
  { url: 'gallery.html?c=design', tap: ['#gallery .tile'] },
  { url: 'gallery.html?c=ceramics', tap: ['#gallery .tile'] },
  { url: 'gallery.html?c=photography', tap: ['.pindex__link', '.medium-capsule .view-switch button'] },
  { url: 'gallery.html?c=photography', tap: ['#photo-grid .tile'], storage: { 'nuances.photographyView': 'grid' } },
  { url: 'series.html', tap: ['.ticker'] },
  { url: 'series-eiffel-tower.html' },
  { url: 'series-cross-wired.html', tap: ['#gallery .tile'] },
  { url: 'series-negligible.html', tap: ['.exhibit__link', '.series-back .view-switch button'] },
  { url: 'series-negligible.html', tap: ['.exhibit__grid .tile'], storage: { 'nuances.photographyView': 'grid' } },
  { url: 'series-through-the-window.html' },
  { url: 'series-city.html', tap: ['.exhibit__link'] },
  { url: 'projects.html' },
  { url: 'project-planet-walk.html' },
  { url: 'artist-statement.html' },
  { url: 'resume.html' },
  { url: 'contact.html' },
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' };

function serve() {
  const server = http.createServer((request, response) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(request.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** In the page: whether a tap at the middle of each control reaches it (or something inside it). */
function blockedTaps(selectors) {
  const blocked = [];
  selectors.forEach((selector) => {
    const target = document.querySelector(selector);
    if (!target) return;
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    const box = target.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const x = Math.min(innerWidth - 1, Math.max(0, box.left + box.width / 2));
    const y = Math.min(innerHeight - 1, Math.max(0, box.top + box.height / 2));
    const hit = document.elementFromPoint(x, y);
    if (hit && !target.contains(hit) && !hit.contains(target)) {
      const name = (node) => `${node.tagName.toLowerCase()}${node.className && typeof node.className === 'string' ? `.${node.className.trim().split(/\s+/).join('.')}` : ''}`;
      blocked.push(`${selector} is covered by ${name(hit)}`);
    }
  });
  return blocked;
}

/** In the page: pictures on screen that finished loading with nothing to show. */
function brokenPictures() {
  return [...document.images]
    .filter((image) => {
      const box = image.getBoundingClientRect();
      const onScreen = box.bottom > 0 && box.top < innerHeight && box.width > 0;
      return onScreen && image.complete && image.naturalWidth === 0 && image.currentSrc;
    })
    .map((image) => image.currentSrc.replace(location.origin, ''));
}

async function checkPage(context, base, page, phone) {
  const tab = await context.newPage();
  const problems = [];
  tab.on('pageerror', (error) => problems.push(`script error: ${error.message}`));
  tab.on('response', (response) => {
    if (response.status() >= 400) problems.push(`failed to load ${response.url().replace(base, '')} (${response.status()})`);
  });

  if (page.storage) await tab.addInitScript((items) => Object.entries(items).forEach(([key, value]) => localStorage.setItem(key, value)), page.storage);
  await tab.goto(base + page.url, { waitUntil: 'load' });
  await tab.waitForTimeout(1200);

  const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 0) problems.push(`scrolls sideways by ${overflow}px`);
  (await tab.evaluate(brokenPictures)).forEach((src) => problems.push(`picture never loaded: ${src}`));
  if (page.tap) (await tab.evaluate(blockedTaps, page.tap)).forEach((message) => problems.push(`tap blocked: ${message}`));

  // The footer's lettering: scrolled into view, it should fill with a picture within a few seconds.
  await tab.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const painted = await tab
    .waitForFunction(() => !document.querySelector('[data-painted]') || document.querySelector('[data-painted].is-painted'), null, { timeout: 6000 })
    .then(() => true, () => false);
  if (!painted) problems.push('the footer lettering stayed empty');

  await tab.close();
  return problems.map((problem) => `${phone.name} · ${page.url}${page.storage ? ' (grid view)' : ''}: ${problem}`);
}

async function main() {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const phone of PHONES) {
      const context = await browser.newContext({
        viewport: { width: phone.width, height: phone.height },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
      for (const page of PAGES) failures.push(...(await checkPage(context, base, page, phone)));
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  const checked = PHONES.length * PAGES.length;
  if (failures.length) {
    console.error(`Phone check: ${failures.length} problem(s) on ${checked} page views\n`);
    failures.forEach((failure) => console.error(`  ✗ ${failure}`));
    process.exit(1);
  }
  console.log(`Phone check: ${checked} page views, no problems.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
