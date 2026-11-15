// The screen recording for A Digital Moving Mountain: the landing page, into the interactive canvas, a note
// typed and posted. `npm run demo:mountain` rehearses, stopping short of posting; add `-- --post` to record
// the real thing, which leaves the note on the live canvas for every visitor.
const { chromium } = require('playwright');
const path = require('path');
const { Recorder, framesDir } = require('./recorder.js');

const ROOT = path.join(__dirname, '..', '..');

const LANDING = 'https://a-digital-moving-mountain-landing.vercel.app';
const COMMENT = 'The ink looks like it’s still moving.';
const SPOT = [470, 520]; // an empty patch of dark ink on the 2000 panel, where a white note reads well
const post = process.argv.includes('--post');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const rec = await Recorder.open(page, { dir: framesDir('mountain'), fps: 30, fakeClock: false });
  rec.cursor = { x: 640, y: 560 };
  await rec.settle(() => page.goto(LANDING));
  await rec.hold(1.6);
  await rec.clickOn(page.getByRole('link', { name: 'Interactive Art' }).first(), { seconds: 1.1, navigates: true });
  await rec.settle(() => page.waitForURL(/base44\.app/), { extra: 2500 });
  await rec.hold(1.4);
  await rec.moveTo(...SPOT, 1.0);
  await rec.hold(0.3);
  await rec.click({ hold: 0.4 });
  await page.locator('textarea').waitFor();
  await rec.hold(0.4);
  // White ink for a dark patch of the painting.
  await rec.clickOn(page.locator('button[style*="rgb(255, 255, 255)"]').first(), { seconds: 0.6, hold: 0.3 });
  await rec.clickOn(page.locator('textarea'), { at: [0.25, 0.25], seconds: 0.6, hold: 0.2 });
  await rec.type(COMMENT);
  await rec.hold(0.5);
  const postButton = page.getByRole('button', { name: 'Post' });
  if (post) {
    await rec.clickOn(postButton, { seconds: 0.7, hold: 0.2 });
    await rec.settle(() => page.waitForTimeout(2500), { wait: 'networkidle', extra: 500 });
    await rec.moveTo(SPOT[0] + 120, SPOT[1] + 110, 0.9);
    await rec.hold(3);
  } else {
    const box = await postButton.boundingBox();
    await rec.moveTo(box.x + box.width / 2, box.y + box.height / 2, 0.7);
    await rec.hold(0.6);
  }
  console.log('frames', rec.n, 'seconds', (rec.n / rec.fps).toFixed(1));
  rec.encode(path.join(ROOT, 'images/moving-mountain/dmm-demo.mp4'), path.join(ROOT, 'images/moving-mountain/dmm-demo-poster.jpg'));
  await browser.close();
})();
