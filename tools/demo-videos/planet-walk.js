// The screen recording for the Planet Walk: the galaxy home page, a planet, the map, then the tracker from
// start to Pluto, including Pluto stamped too early. Drawn frame by frame, since its 3D pages render slowly
// without a graphics card: `npm run demo:planet` takes about half an hour (`-- --preview` for a quick check).
const { chromium } = require('playwright');
const path = require('path');
const { Recorder, framesDir } = require('./recorder.js');

const ROOT = path.join(__dirname, '..', '..');

const SITE = 'https://planet-walk.vercel.app';
const SKIPPED = 'Uranus'; // the stop left out, so Pluto is reached too soon
// The walk's own clock is not sped up between stamps: jumping the page's time ahead stalls its animations.
const STOPS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Ceres', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const preview = process.argv.includes('--preview'); // every 4th frame only, to check the path quickly

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const rec = await Recorder.open(page, { dir: framesDir('planet'), fps: preview ? 8 : 30 });
  rec.cursor = { x: 900, y: 620 };
  const box = async (locator) => locator.boundingBox();

  /** Glides the page so `locator` sits comfortably on screen, if it is not already. */
  async function bringIntoView(locator) {
    const b = await box(locator);
    if (b.y > 130 && b.y + b.height < 720) return;
    const now = await page.evaluate(() => scrollY);
    await rec.scrollTo(Math.max(0, now + b.y - 330), 0.7);
  }

  async function follow(link) {
    await rec.clickOn(link, { seconds: 0.9, navigates: true });
    await rec.settle(() => page.waitForTimeout(400), { extra: 2200 });
  }

  // 1. The galaxy, down to the solar system.
  await rec.settle(() => page.goto(SITE), { extra: 2500 });
  await rec.hold(1.4);
  await rec.scrollTo(1300, 2.4);
  await rec.scrollTo(2800, 2.6);
  await rec.hold(0.8);

  // 2. One planet's page.
  await follow(page.locator('a[href="/planet/saturn"]:not(.sr-only)').last());
  await rec.hold(1.6);
  await rec.scrollTo(380, 1.2);
  await rec.hold(0.8);

  // 3. The campus map, focused on one stop.
  await follow(page.getByRole('link', { name: 'Map', exact: true }).first());
  await rec.hold(1.0);
  await rec.clickOn(page.getByText('Science Center Walkway').first(), { seconds: 0.8, hold: 1.6 });

  // 4. The tracker: start, stamp every stop but one, try Pluto, go back for the one, finish.
  await follow(page.getByRole('link', { name: /track your walk/i }).first());
  await rec.hold(0.8);
  await rec.clickOn(page.getByRole('button', { name: 'Start Walk' }), { seconds: 0.8, hold: 0.6 });
  const mark = (stop) => page.locator(`[aria-label="Mark ${stop} as visited"]`);
  for (const stop of STOPS.filter((name) => name !== SKIPPED)) {
    await bringIntoView(mark(stop));
    await rec.clickOn(mark(stop), { seconds: 0.45, hold: 0.25 });
  }
  await bringIntoView(mark('Pluto'));
  await rec.clickOn(mark('Pluto'), { seconds: 0.5, hold: 0.3 });
  await rec.untilStill();
  await rec.hold(2.2); // time to read "Not so fast"
  await rec.clickOn(page.getByRole('button', { name: /keep walking/i }), { seconds: 0.8, hold: 0.2 });
  // The box leaves with an animation of its own; keep filming until it has gone.
  const warning = page.getByText('Not so fast').first();
  for (let i = 0; i < 3 * rec.fps && (await warning.isVisible().catch(() => false)); i += 1) await rec.frame();
  if (await warning.isVisible().catch(() => false)) throw new Error('the "Not so fast" box did not close');
  await rec.hold(0.3);
  await bringIntoView(mark(SKIPPED));
  await rec.clickOn(mark(SKIPPED), { seconds: 0.6, hold: 0.4 });
  await rec.untilStill();
  await rec.scrollTo(0, 1.0);
  const summary = page.getByText(/journey complete/i).first();
  if (await summary.count()) await bringIntoView(summary);
  await rec.moveTo(1180, 700, 1.0);
  await rec.hold(3.2);

  console.log('frames', rec.n, 'seconds', (rec.n / rec.fps).toFixed(1));
  rec.encode(path.join(ROOT, 'images/planet-walk/pw-demo.mp4'), path.join(ROOT, 'images/planet-walk/pw-demo-poster.jpg'));
  await browser.close();
})();
