/**
 * Records a scripted walk through a website as a smooth video, however slowly the machine draws it.
 * Used by the scripts beside it, which make the screen recordings on the project pages (npm run demo:…).
 *
 * The page's clock is faked (Playwright's page.clock) and paused; each video frame advances it by exactly
 * one frame's worth, then captures the screen. CSS animations, which the fake clock does not drive, are
 * slowed with CDP's Animation.setPlaybackRate to roughly the capture speed. A drawn cursor (a real one does
 * not appear in screenshots) glides between targets and ripples when it clicks.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="30" viewBox="0 0 26 30"><path d="M2 2 L2 24 L8 18.5 L12.2 27.5 L16.4 25.6 L12.3 16.8 L20 16.8 Z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`;

// Injected into every page: the cursor and its click ring, moved only by the recorder.
const OVERLAY = `(() => {
  const mount = () => {
    if (document.getElementById('__rec_cursor')) return;
    const ring = document.createElement('div');
    ring.id = '__rec_ring';
    ring.style.cssText = 'position:fixed;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid rgba(255,255,255,.95);box-shadow:0 0 0 2px rgba(0,0,0,.35);pointer-events:none;z-index:2147483647;opacity:0;transition:none!important;animation:none!important';
    const cursor = document.createElement('div');
    cursor.id = '__rec_cursor';
    cursor.innerHTML = ${JSON.stringify(CURSOR_SVG)};
    cursor.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:30px;margin:-2px 0 0 -2px;pointer-events:none;z-index:2147483647;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));transition:none!important;animation:none!important';
    document.documentElement.append(ring, cursor);
  };
  if (document.documentElement) mount();
  document.addEventListener('DOMContentLoaded', mount);
  window.__recPlace = (x, y, ring, scale) => {
    mount();
    const c = document.getElementById('__rec_cursor');
    c.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
    const r = document.getElementById('__rec_ring');
    r.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (0.4 + ring * 0.9) + ')';
    r.style.opacity = ring > 0 ? String((1 - ring) * 0.9) : '0';
  };
})();`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

class Recorder {
  /**
   * `fakeClock`: pause the page's clock and step it a frame at a time (for pages that draw slowly here, such as
   * 3D). Without it the page runs live and each frame is simply captured as it comes, which suits plain pages.
   */
  constructor(page, { dir, fps = 30, cssRate = 0.12, fakeClock = true }) {
    Object.assign(this, { page, dir, fps, cssRate, fakeClock });
    this.frameMs = 1000 / fps;
    this.n = 0;
    this.cursor = { x: 0, y: 0 };
    this.ringAt = null; // frame index of the last click
    this.press = 0; // frames left of the cursor's press
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }

  static async open(page, options) {
    const rec = new Recorder(page, options);
    await page.addInitScript(OVERLAY);
    if (rec.fakeClock) {
      await page.clock.install();
      rec.cdp = await page.context().newCDPSession(page);
      await rec.cdp.send('Animation.enable');
    }
    return rec;
  }

  /** Loads a page with the clock running, then pauses it there for frame-by-frame capture. */
  async settle(action, { wait = 'networkidle', extra = 1200 } = {}) {
    await this.resume();
    await action();
    await this.page.waitForLoadState(wait).catch(() => {});
    await this.page.waitForTimeout(extra);
    await this.pause();
    if (this.fakeClock) await this.cdp.send('Animation.setPlaybackRate', { playbackRate: this.cssRate });
    await this.page.evaluate(OVERLAY);
  }

  async resume() {
    if (this.fakeClock) await this.page.clock.resume();
  }

  async pause() {
    if (!this.fakeClock) return;
    // The running clock moves on while this call travels, so pause just ahead of the time read, as little
    // ahead as will take: every moment skipped is drawn at once, and 3D pages draw slowly here.
    const now = await this.page.evaluate(() => Date.now());
    for (const ahead of [40, 150, 600, 2000]) {
      try {
        await this.page.clock.pauseAt(now + ahead);
        return;
      } catch (error) {
        if (!/past/.test(error.message)) throw error;
      }
    }
  }

  /**
   * CSS and Web Animations run on the browser's own clock, not the faked one, so they are slowed to the pace
   * frames are actually being captured at: a fast page gets a little slowing, a slow 3D page a lot.
   */
  async matchAnimationPace(realMs) {
    this.realMs = this.realMs ? this.realMs * 0.8 + realMs * 0.2 : realMs;
    if (this.n % 6 !== 0) return;
    const rate = Math.min(1, Math.max(0.02, this.frameMs / this.realMs));
    await this.cdp.send('Animation.setPlaybackRate', { playbackRate: rate }).catch(() => {});
  }

  async frame() {
    const started = Date.now();
    const ring = this.ringAt === null ? 0 : (this.n - this.ringAt) / (0.45 * this.fps);
    const scale = this.press > 0 ? 0.86 : 1;
    if (this.press > 0) this.press -= 1;
    // A click that navigates tears the page down mid-frame; that frame simply keeps the old cursor.
    await this.page.evaluate(([x, y, r, s]) => window.__recPlace && window.__recPlace(x, y, r >= 0 && r < 1 ? r : 0, s), [this.cursor.x, this.cursor.y, ring, scale]).catch(() => {});
    if (this.fakeClock) await this.page.clock.runFor(this.frameMs);
    await this.page.screenshot({ path: path.join(this.dir, `f${String(this.n).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92, timeout: 180000 });
    this.n += 1;
    if (this.fakeClock) await this.matchAnimationPace(Date.now() - started);
  }

  async hold(seconds) {
    for (let i = 0; i < Math.round(seconds * this.fps); i += 1) await this.frame();
  }

  /**
   * Keeps capturing until the page's one-off animations (a dialog fading in, say) have finished, so what
   * follows acts on things at rest. Endless ones (a pulsing dot) are ignored.
   */
  async untilStill(maxSeconds = 4) {
    const busy = () => this.page.evaluate(() => document.getAnimations().some((animation) =>
      animation.playState === 'running' && animation.effect && animation.effect.getComputedTiming().iterations !== Infinity));
    for (let i = 0; i < maxSeconds * this.fps && (await busy()); i += 1) await this.frame();
  }

  async moveTo(x, y, seconds = 0.8) {
    const from = { ...this.cursor };
    const frames = Math.max(1, Math.round(seconds * this.fps));
    // A gentle arc, as a hand moves, rather than a ruler-straight line.
    const bend = Math.min(60, Math.hypot(x - from.x, y - from.y) * 0.12);
    for (let i = 1; i <= frames; i += 1) {
      const t = ease(i / frames);
      const arc = Math.sin(Math.PI * t) * bend;
      this.cursor = { x: from.x + (x - from.x) * t, y: from.y + (y - from.y) * t - arc };
      await this.page.mouse.move(this.cursor.x, this.cursor.y);
      await this.frame();
    }
  }

  /** Clicks where the cursor is. `navigates`: the click loads a new page, so no frames are taken after it. */
  async click({ hold = 0.35, navigates = false } = {}) {
    await this.page.mouse.down();
    this.ringAt = this.n;
    this.press = Math.round(0.12 * this.fps);
    await this.frame();
    await this.frame();
    // A click that loads a page needs the clock running while it loads (settle pauses it again after).
    if (navigates) await this.resume();
    await this.page.mouse.up();
    if (navigates) return;
    await this.hold(hold);
  }

  /** Moves to an element's middle (or a point inside it) and clicks it. */
  async clickOn(locator, { at = [0.5, 0.5], seconds = 0.8, hold, navigates } = {}) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const box = await locator.boundingBox();
    await this.moveTo(box.x + box.width * at[0], box.y + box.height * at[1], seconds);
    await this.hold(0.15);
    await this.click({ hold, navigates });
  }

  async type(text, { perSecond = 16 } = {}) {
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      await this.hold(1 / perSecond + (ch === ' ' ? 0.03 : 0));
    }
  }

  /** Scrolls the window to `y` over `seconds`, eased, the way a trackpad glides. */
  async scrollTo(y, seconds = 1.5) {
    const from = await this.page.evaluate(() => scrollY);
    const frames = Math.max(1, Math.round(seconds * this.fps));
    for (let i = 1; i <= frames; i += 1) {
      const to = from + (y - from) * ease(i / frames);
      await this.page.evaluate((v) => window.scrollTo(0, v), to);
      await this.frame();
    }
  }

  /**
   * Joins the frames into an H.264 MP4 (which every browser plays) and saves its last frame as the poster,
   * shown before it plays and to visitors who ask for less motion.
   */
  encode(out, poster, { width = 1280, crf = 26 } = {}) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(this.fps), '-i', path.join(this.dir, 'f%05d.jpg'),
      '-vf', `scale=${width}:-2:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-an', out]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-sseof', '-0.5', '-i', out, '-frames:v', '1', '-q:v', '6', poster]);
  }
}

/** Where a recording's frames are kept while it is made: a fresh folder outside the site. */
function framesDir(name) {
  return fs.mkdtempSync(path.join(require('os').tmpdir(), `demo-${name}-`));
}

module.exports = { Recorder, framesDir };
