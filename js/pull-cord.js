/**
 * The gallery's pull cord (the picture-light switch): a brass bead on a cord that can be clicked, or grabbed and
 * pulled down or to the side. A long enough pull switches the lights; letting go, or brushing past it, sets it
 * swinging on a damped spring, so it wobbles to rest like a real cord.
 *
 * The spring maths is pure (`step`, `pulled`) and unit tested under Node; `attach` wires it to a button in the
 * browser. Exposes window.PullCord.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PullCord = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SPRING = Object.freeze({ stiffness: 140, damping: 5.5 }); // per second²; per second
  const PULL_DOWN_PX = 18; // a pull this far down switches the lights...
  const PULL_SIDE_PX = 26; // ...or this far to the side
  const REACH_PX = { side: 44, down: 46, up: 6 }; // how far the bead can be pulled
  const AT_REST = 0.15; // px and px/s below which the swing stops

  /** One spring step for the bead's offset { x, y } and velocity { vx, vy }, `dt` in seconds. */
  function step(state, dt, { stiffness, damping } = SPRING) {
    const ax = -stiffness * state.x - damping * state.vx;
    const ay = -stiffness * state.y - damping * state.vy;
    const vx = state.vx + ax * dt;
    const vy = state.vy + ay * dt;
    return { x: state.x + vx * dt, y: state.y + vy * dt, vx, vy };
  }

  const isAtRest = (s) => Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.vx), Math.abs(s.vy)) < AT_REST;

  /** Whether letting go at this offset switches the lights. */
  const pulled = ({ x, y }) => y >= PULL_DOWN_PX || Math.abs(x) >= PULL_SIDE_PX;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /**
   * Makes `button` a pull cord. It must hold a `.room__cord-line` (hung from its top) and a `.room__cord-bead`.
   * `onPull()` is called for a click, a key press or a long enough pull.
   */
  function attach(button, { onPull }) {
    const line = button.querySelector('.room__cord-line');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let state = { x: 0, y: 0, vx: 0, vy: 0 };
    let frame = 0;
    let last = 0;
    let drag = null; // { id, startX, startY, moved }
    let suppressClick = false;

    // The line pivots at its top and stretches to reach the bead; the bead simply moves.
    function draw() {
      const length = line.offsetHeight || 1;
      const angle = -Math.atan2(state.x, length + state.y);
      const stretch = Math.hypot(state.x, length + state.y) / length;
      button.style.setProperty('--cord-x', `${state.x.toFixed(2)}px`);
      button.style.setProperty('--cord-y', `${state.y.toFixed(2)}px`);
      button.style.setProperty('--cord-angle', `${angle.toFixed(4)}rad`);
      button.style.setProperty('--cord-stretch', stretch.toFixed(4));
    }

    function tick(now) {
      const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
      last = now;
      if (!drag) state = step(state, dt);
      draw();
      if (drag || !isAtRest(state)) {
        frame = requestAnimationFrame(tick);
      } else {
        state = { x: 0, y: 0, vx: 0, vy: 0 };
        draw();
        frame = 0;
      }
    }

    function run() {
      if (reduceMotion.matches) {
        state = { x: 0, y: 0, vx: 0, vy: 0 };
        draw();
        return;
      }
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    /** Sets the cord swinging (velocities in px/s). */
    const MAX_SWING = 180; // px/s, so repeated nudges never fling it
    function nudge(vx, vy) {
      state = {
        ...state,
        vx: clamp(state.vx + vx, -MAX_SWING, MAX_SWING),
        vy: clamp(state.vy + vy, -MAX_SWING * 2, MAX_SWING * 2),
      };
      run();
    }

    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      suppressClick = false;
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
      button.setPointerCapture(event.pointerId);
      run();
    });

    button.addEventListener('pointermove', (event) => {
      if (drag && event.pointerId === drag.id) {
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.hypot(dx, dy) > 4) drag.moved = true;
        state = {
          x: clamp(dx, -REACH_PX.side, REACH_PX.side),
          y: clamp(dy, -REACH_PX.up, REACH_PX.down),
          vx: 0,
          vy: 0,
        };
      } else if (!drag && event.pointerType === 'mouse') {
        // Brushing past the cord sets it swaying in the direction the pointer moved.
        nudge(clamp(event.movementX * 9, -70, 70), 0);
      }
    });

    function release(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const wasDragged = drag.moved;
      drag = null;
      if (wasDragged) {
        suppressClick = true; // the click that follows a drag is not a second pull
        if (pulled(state)) onPull();
      }
      run(); // the spring takes it from here
    }
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);

    button.addEventListener('click', () => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      onPull();
      nudge(0, 260); // a tug: the bead drops and bounces back
    });

    draw();
    return { nudge };
  }

  return { SPRING, PULL_DOWN_PX, PULL_SIDE_PX, step, pulled, attach };
});
