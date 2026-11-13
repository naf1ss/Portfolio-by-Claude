#!/usr/bin/env node
/**
 * Renders the museum walk as still pictures, for visitors whose computers cannot draw it (js/home-reveal.js
 * shows them one fading into the next). The pictures are screenshots of the real scene at the moments listed
 * in STILLS (js/museum-utils.js), in a wide and a tall shape, with a dark-page version of those that show the
 * exhibition room.
 *
 *     npm run stills
 *
 * Run it again whenever the museum's settings change (the works hung, the wall text, the sign: `home.museum`
 * in js/site-config.js) or the scene itself is changed; a test fails while the pictures are out of date with
 * the settings. Needs Playwright, as the phone check does. It works on a machine without a graphics card,
 * slowly: the scene is drawn in software, a second or two a frame.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { serve } = require('./static-server.js');
const { STILLS, stillPath } = require('../js/museum-utils.js');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, STILLS.folder, 'stills.json');
const QUALITY = 80;
// Everything on the stage but the scene itself, and the page's own furniture over it.
const HIDE = '.site-header, .scroll-progress, .opening__blank, .opening__stills, .word3d, .opening__words, .opening__fact, .opening__skip, .opening__trails { visibility: hidden !important; }';

/** A fingerprint of the museum's settings, so a test can tell when the pictures no longer match them. */
function settingsFingerprint() {
  const source = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
  const start = source.indexOf('    museum: {');
  const end = source.indexOf('\n    },', start);
  if (start < 0 || end < 0) throw new Error('home.museum not found in js/site-config.js');
  return crypto.createHash('sha1').update(source.slice(start, end)).digest('hex').slice(0, 12);
}

const readManifest = () => (fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : null);

/** One pass through the walk at one screen shape and page theme, saving the stops asked for. */
async function renderPass(browser, base, { shape, dark, stops }) {
  const [width, height] = STILLS.shapes[shape];
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: dark ? 'dark' : 'light' });
  await page.goto(`${base}?museum`);
  await page.addStyleTag({ content: HIDE });
  await page.waitForFunction(() => document.querySelector('[data-opening-museum]').dataset.walk !== undefined, null, { timeout: 120000 });
  const opening = await page.evaluate(() => {
    const section = document.querySelector('.opening');
    return { top: Math.round(section.getBoundingClientRect().top + window.scrollY), travel: section.offsetHeight - window.innerHeight };
  });
  for (const stop of stops) {
    const y = Math.round(opening.travel * stop.t);
    await page.evaluate((to) => window.scrollTo(0, to), opening.top + y);
    // The scene eases toward the scroll; wait until it has arrived, then for the paintings' images.
    await page.waitForFunction((want) => Math.abs(Number(document.querySelector('[data-opening-museum]').dataset.walk) - want) < 0.0006, y / opening.travel, { timeout: 180000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    const file = path.join(ROOT, stillPath(stop, shape, dark));
    await page.locator('[data-opening-museum]').screenshot({ path: file, type: 'jpeg', quality: QUALITY });
    console.log(`  ${path.relative(ROOT, file)}`);
  }
  await page.close();
}

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (error) {
    console.error('Rendering the stills needs Playwright: npm install --no-save playwright && npx playwright install chromium');
    process.exit(2);
  }
  fs.mkdirSync(path.join(ROOT, STILLS.folder), { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    for (const shape of Object.keys(STILLS.shapes)) {
      console.log(`${shape}:`);
      await renderPass(browser, base, { shape, dark: false, stops: STILLS.stops });
      await renderPass(browser, base, { shape, dark: true, stops: STILLS.stops.filter((stop) => stop.themed) });
    }
    fs.writeFileSync(MANIFEST, `${JSON.stringify({ settings: settingsFingerprint() }, null, 2)}\n`);
  } finally {
    await browser.close();
    server.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { settingsFingerprint, readManifest };
