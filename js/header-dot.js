/**
 * The accent dot in the header (css/styles.css, "Throw the dot"), on wide screens.
 *
 * The accent dot under the current page hops over to whichever page name you point at, and the names lean
 * toward the pointer. Pick the dot up and throw it: it flies around the header under gravity and bounces off the
 * walls. Hit a page name and it falls over and takes you there: the dot swells to fill the screen, and on the
 * next page shrinks back to its place under that page's name. If it lands without hitting one, it hops home.
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const list = header && header.querySelector('.site-nav > ul');
  if (!list) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wide = window.matchMedia('(min-width: 40.0625rem)');
  const active = () => wide.matches;
  const topLinks = (scope) => Array.from(scope.querySelectorAll('.site-nav > ul > li > a'));

  /** Restarts a CSS animation by taking its class off, forcing a reflow and putting it back. */
  function replay(element, className) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function bouncingDot() {
    const RADIUS = 4;
    const GRAVITY = 2400; // px/s²
    const FLOOR_BOUNCE = 0.6;
    const WALL_BOUNCE = 0.7;
    const ROLLING_FRICTION = 0.9; // share of sideways speed kept per 1/60 s on the floor
    const REST_BEFORE_HOME = 1200; // ms

    const ball = document.createElement('span');
    ball.className = 'nav-ball';
    ball.setAttribute('aria-hidden', 'true');
    header.append(ball);

    const links = topLinks(header);
    const current = links.find((link) => link.getAttribute('aria-current') === 'page') || null;
    let pos = null; // { x, y } centre, in the header's own pixels
    let mode = 'rest'; // rest | hop | free | held
    let hops = []; // queued arcs: { from, to, height, duration, start }
    let velocity = { x: 0, y: 0 };
    let restingSince = 0;
    let frame = 0;
    let lastTime = 0;
    let boxes = [];

    const headerBox = () => header.getBoundingClientRect();

    /** Where the dot sits under a page name. */
    function spotUnder(link) {
      const area = headerBox();
      const box = link.getBoundingClientRect();
      return { x: box.left + box.width / 2 - area.left, y: box.bottom - area.top - 4 - RADIUS };
    }

    const floorY = () => Math.max(...links.map((link) => spotUnder(link).y));

    function draw(squash = 1) {
      if (!pos) return;
      ball.style.translate = `${(pos.x - RADIUS).toFixed(1)}px ${(pos.y - RADIUS).toFixed(1)}px`;
      ball.style.scale = squash === 1 ? '' : `${(1 / squash).toFixed(2)} ${squash.toFixed(2)}`;
    }

    function loop(now) {
      const dt = Math.min(0.033, lastTime ? (now - lastTime) / 1000 : 0.016);
      lastTime = now;
      if (mode === 'hop') stepHop(now);
      else if (mode === 'free') stepFree(dt, now);
      frame = mode === 'hop' || mode === 'free' ? requestAnimationFrame(loop) : 0;
      if (!frame) lastTime = 0;
    }

    function run() {
      if (!frame) frame = requestAnimationFrame(loop);
    }

    /** An arc to `to`, then two small settling bounces. */
    function hopTo(to) {
      if (!to) return;
      if (!pos || reduceMotion.matches) {
        pos = { ...to };
        mode = 'rest';
        draw();
        return;
      }
      const distance = Math.hypot(to.x - pos.x, to.y - pos.y);
      hops = [
        { from: { ...pos }, to, height: Math.min(34, 12 + distance * 0.06), duration: 380 + Math.min(220, distance * 0.4) },
        { from: to, to, height: 6, duration: 170 },
        { from: to, to, height: 2, duration: 110 },
      ];
      hops[0].start = performance.now();
      mode = 'hop';
      run();
    }

    function stepHop(now) {
      const hop = hops[0];
      const t = Math.min(1, (now - hop.start) / hop.duration);
      pos = {
        x: hop.from.x + (hop.to.x - hop.from.x) * t,
        y: hop.from.y + (hop.to.y - hop.from.y) * t - 4 * hop.height * t * (1 - t),
      };
      draw(t > 0.92 ? 0.75 : t < 0.08 ? 0.85 : 1.08);
      if (t < 1) return;
      hops.shift();
      if (hops.length) hops[0].start = now;
      else {
        mode = 'rest';
        draw();
      }
    }

    function stepFree(dt, now) {
      const width = header.clientWidth;
      const floor = floorY();
      const before = { ...pos };
      velocity.y += GRAVITY * dt;
      pos.x += velocity.x * dt;
      pos.y += velocity.y * dt;
      let squash = 1;

      if (pos.x < RADIUS || pos.x > width - RADIUS) {
        pos.x = Math.max(RADIUS, Math.min(width - RADIUS, pos.x));
        velocity.x *= -WALL_BOUNCE;
      }
      if (pos.y < RADIUS) {
        pos.y = RADIUS;
        velocity.y = Math.abs(velocity.y) * WALL_BOUNCE;
      }
      if (pos.y >= floor) {
        pos.y = floor;
        if (velocity.y > 120) squash = 0.7;
        velocity.y = velocity.y > 120 ? -velocity.y * FLOOR_BOUNCE : 0;
        velocity.x *= ROLLING_FRICTION ** (dt * 60);
      }

      // Hitting a page name knocks it over and goes there.
      const hit = boxes.find(({ box }) => {
        const inside = (p) => p.x > box.left - RADIUS && p.x < box.right + RADIUS && p.y > box.top - RADIUS && p.y < box.bottom + RADIUS;
        return inside(pos) && !inside(before);
      });
      draw(squash);
      if (hit) {
        pos = before;
        goTo(hit.link);
        return;
      }

      const still = pos.y >= floor && Math.abs(velocity.x) < 25 && velocity.y === 0;
      if (!still) restingSince = 0;
      else if (!restingSince) restingSince = now;
      else if (now - restingSince > REST_BEFORE_HOME) {
        restingSince = 0;
        goHome();
      }
    }

    /** The page names' text, as boxes the dot can hit. */
    function measureBoxes() {
      const area = headerBox();
      boxes = links.map((link) => {
        const box = link.getBoundingClientRect();
        const pad = parseFloat(getComputedStyle(link).paddingLeft) || 0;
        return {
          link,
          box: {
            left: box.left - area.left + pad,
            right: box.right - area.left - pad,
            // The letters' band only, which stays clear of the floor: rolling under a name never hits it.
            top: box.top - area.top + box.height * 0.3,
            bottom: box.bottom - area.top - box.height * 0.42,
          },
        };
      });
    }

    /** The dot swells to fill the screen from where it is, and the link's page follows. */
    function goTo(link) {
      mode = 'gone';
      replay(link, 'is-hit');
      const area = headerBox();
      const wipe = document.createElement('div');
      wipe.className = 'dot-wipe';
      wipe.style.setProperty('--at', `${(area.left + pos.x).toFixed(0)}px ${(area.top + pos.y).toFixed(0)}px`);
      document.body.append(wipe);
      try {
        sessionStorage.setItem('nav-arrival', 'throw');
      } catch (error) {
        // Without storage the next page simply arrives without the dot.
      }
      // Clicking, not assigning location, so the link behaves exactly as if it had been clicked.
      setTimeout(() => link.click(), 520);
    }

    /** Arriving by a throw: the screen-filling dot shrinks back into its place under this page's name. */
    function arrive() {
      const area = headerBox();
      const home = current ? spotUnder(current) : { x: header.clientWidth / 2, y: 0 };
      const wipe = document.createElement('div');
      wipe.className = 'dot-wipe is-arriving';
      wipe.style.setProperty('--at', `${(area.left + home.x).toFixed(0)}px ${(area.top + home.y).toFixed(0)}px`);
      document.body.append(wipe);
      root.classList.add('is-dot-landing'); // the cover motion.js asked for can go: the dot takes over
      wipe.addEventListener('animationend', () => wipe.remove());
    }

    function goHome() {
      ball.classList.toggle('is-away', !current);
      hopTo(current ? spotUnder(current) : pos);
    }

    // Pointing at names
    let leaveTimer = 0;
    list.addEventListener('pointerover', (event) => {
      if (!active() || mode === 'held' || mode === 'free') return;
      const link = event.target.closest('.site-nav > ul > li > a');
      if (!link) return;
      clearTimeout(leaveTimer);
      ball.classList.remove('is-away');
      hopTo(spotUnder(link));
    });
    list.addEventListener('pointerleave', () => {
      links.forEach((link) => link.style.removeProperty('--lean'));
      if (!active() || mode === 'held' || mode === 'free') return;
      leaveTimer = setTimeout(goHome, 150);
    });

    // The names lean toward the pointer, the nearest most.
    list.addEventListener('pointermove', (event) => {
      if (!active() || reduceMotion.matches) return;
      links.forEach((link) => {
        const box = link.getBoundingClientRect();
        const offset = event.clientX - (box.left + box.width / 2);
        const pull = Math.exp(-Math.abs(offset) / 140);
        link.style.setProperty('--lean', (Math.max(-1, Math.min(1, offset / 60)) * pull).toFixed(3));
      });
    });

    // Picking it up and throwing it
    let trail = [];
    ball.addEventListener('pointerdown', (event) => {
      if (!active()) return;
      event.preventDefault();
      ball.setPointerCapture(event.pointerId);
      ball.classList.add('is-held');
      ball.classList.remove('is-away');
      mode = 'held';
      trail = [];
    });
    ball.addEventListener('pointermove', (event) => {
      if (mode !== 'held') return;
      const area = headerBox();
      pos = {
        x: Math.max(RADIUS, Math.min(header.clientWidth - RADIUS, event.clientX - area.left)),
        y: Math.max(RADIUS, Math.min(floorY(), event.clientY - area.top)),
      };
      trail.push({ ...pos, t: event.timeStamp });
      trail = trail.filter((point) => event.timeStamp - point.t < 90);
      draw();
    });
    const release = () => {
      if (mode !== 'held') return;
      ball.classList.remove('is-held');
      const first = trail[0];
      const last = trail[trail.length - 1];
      const seconds = first && last && last.t > first.t ? (last.t - first.t) / 1000 : 0;
      const limit = (value) => Math.max(-3200, Math.min(3200, value));
      velocity = seconds ? { x: limit((last.x - first.x) / seconds), y: limit((last.y - first.y) / seconds) } : { x: 0, y: 0 };
      measureBoxes();
      restingSince = 0;
      mode = 'free';
      run();
    };
    ball.addEventListener('pointerup', release);
    ball.addEventListener('pointercancel', release);

    function settle() {
      if (mode === 'held' || mode === 'free') return;
      ball.classList.toggle('is-away', !current);
      if (current) {
        pos = spotUnder(current);
        mode = 'rest';
        draw();
      }
    }
    if ('ResizeObserver' in window) new ResizeObserver(settle).observe(header);
    if (document.fonts) document.fonts.ready.then(settle);
    settle();
    if (root.classList.contains('arrive-throw')) {
      if (active() && !reduceMotion.matches) arrive();
      else root.classList.remove('arrive-throw');
    }

    // Coming back with the Back button restores the page as it was left: mid-swell, its name knocked over.
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      document.querySelectorAll('.dot-wipe').forEach((wipe) => wipe.remove());
      links.forEach((link) => link.classList.remove('is-hit'));
      mode = 'rest';
      settle();
    });
  }

  bouncingDot();
})();
