/**
 * The museum the home page walks into: its floor plan, the scroll timeline, and the maths that needs no
 * graphics library (camera stops, how far back to stand, how a curtain hangs). The 3D scene itself is
 * js/museum.js. No DOM access, so this can be unit tested.
 *
 * Distances are in metres. The building faces +z: the visitor starts far out on +z, climbs the steps, passes
 * the columns and the doors, and walks down the foyer toward -z, where the curtains hang.
 */
(function (root, utils) {
  if (typeof module === 'object' && module.exports) {
    module.exports = utils;
  } else {
    root.MuseumUtils = utils;
  }
})(typeof self !== 'undefined' ? self : this, (function () {
  'use strict';

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, share) => from + (to - from) * share;
  /** 0 below `from`, 1 above `to`, easing in and out between. */
  const smoothstep = (from, to, value) => {
    const share = clamp((value - from) / (to - from));
    return share * share * (3 - 2 * share);
  };

  /**
   * When things happen, as shares of the opening's scroll (0 at the wordmark, 1 at the reveal).
   * Pairs are [start, end].
   */
  const TIMELINE = {
    squareBy: 0.02, // the 3D wordmark has squared up and flattened
    paperGone: 0.075, // the page has faded off the façade
    wordLands: 0.09, // the wordmark sits on the frieze
    wordHandedOver: 0.11, // the page's word has faded; the one on the building stays
    setOff: 0.1, // the walk begins
    doors: [0.235, 0.325],
    inside: [0.31, 0.38], // crossing the threshold: evening light gives way to the foyer's
    curtains: [0.52, 0.76],
    arrive: 0.76, // the curtains are open; the last stretch walks between them, up to the wall
  };

  const steps = { count: 11, rise: 0.16, run: 0.42, width: 27, top: 2.4 }; // `top`: z of the platform's front edge
  const platform = steps.count * steps.rise;
  const columnHeight = 10.5;

  /** The building. Heights are from the ground unless a comment says otherwise. */
  const PLAN = {
    steps,
    platform, // height of the floor everything stands on
    columns: {
      xs: [2.0, 5.2, 8.4, 11.6], // mirrored about the centre; the middle bay is wider, for the doors
      z: 0.9,
      height: columnHeight,
      radius: 0.62,
      flutes: 24,
    },
    entablature: { width: 25.6, depth: 1.5, architrave: 0.85, frieze: 1.5, cornice: 0.55 },
    pediment: { height: 3.6 },
    wall: { z: -3.2, thickness: 0.8, halfWidth: 13 }, // the front wall, behind the columns
    door: { width: 3.0, height: 6.2 },
    cheek: { width: 2.2 }, // the low walls flanking the steps, which carry the lamps
    foyer: { halfWidth: 7, height: 8.5, back: -24 }, // `back`: the wall behind the curtains
    proscenium: { z: -19, width: 8, height: 5.6, thickness: 0.5 },
    curtain: { z: -19.5, width: 4.35, height: 5.9, gathered: 0.8, folds: 7 },
    eye: 1.65, // eye height above the floor
    sign: { width: 5.4 }, // the wordmark on the frieze
    fov: { landscape: 40, portrait: 50 }, // vertical field of view, degrees
  };
  PLAN.frontOfSteps = steps.top + (steps.count - 1) * steps.run;
  PLAN.frontage = steps.width + PLAN.cheek.width * 2; // the whole width of the front, cheek to cheek
  PLAN.top = platform + columnHeight + PLAN.entablature.architrave + PLAN.entablature.frieze + PLAN.entablature.cornice + PLAN.pediment.height;

  const tanHalf = (degrees) => Math.tan((degrees * Math.PI) / 360);

  /** Vertical field of view for a screen shape: a tall screen needs a wider one to take the building in. */
  function fieldOfView(aspect) {
    return aspect < 1 ? PLAN.fov.portrait : PLAN.fov.landscape;
  }

  /** How far back a camera must stand for something `width` by `height` to fit in view, with a margin. */
  function distanceToFit({ width, height, fovDeg, aspect, margin = 1.05 }) {
    const half = tanHalf(fovDeg);
    return Math.max(width / 2 / (half * aspect), height / 2 / half) * margin;
  }

  /**
   * The last stop: close enough to the back wall that the wall is all there is to see, and the width of wall
   * that then fills the screen. The floor must stay out of view, which limits the distance by the eye's height.
   */
  function arrival(aspect) {
    const half = tanHalf(fieldOfView(aspect));
    const distance = Math.min(4.4, (PLAN.eye - 0.05) / half);
    return { distance, visibleWidth: 2 * distance * half * aspect };
  }

  /**
   * The camera's stops: where it stands and what it looks at, at each time. Between stops the scene eases
   * along a curve through them (js/museum.js).
   */
  function cameraKeys(aspect) {
    const { platform: floor, eye, wall, proscenium, foyer } = PLAN;
    const fovDeg = fieldOfView(aspect);
    // The first view is level, as an architectural photograph is, so the columns stand upright: the camera is
    // raised to the height it looks at, and stands back until the roof (with some sky) and the steps fit.
    const level = PLAN.top * 0.46;
    const far = distanceToFit({ width: PLAN.frontage + 1.5, height: 2 * (PLAN.top + 1.4 - level), fovDeg, aspect });
    const head = floor + eye;
    const end = arrival(aspect);
    return [
      // The whole façade, from across the square.
      { t: TIMELINE.setOff, position: [0, level, far], look: [0, level, 0] },
      // At the foot of the steps, looking up at the portico.
      { t: 0.19, position: [0, eye + 0.1, PLAN.frontOfSteps + 4], look: [0, floor + 4.4, 0] },
      // At the top of the steps, facing the doors.
      { t: 0.3, position: [0, head, steps.top - 0.6], look: [0, floor + 2.8, wall.z] },
      // Just inside.
      { t: 0.37, position: [0, head, wall.z - wall.thickness - 1.2], look: [0, floor + 2.6, proscenium.z] },
      // Into the foyer, far enough from the curtains to see the opening they hang in.
      { t: 0.5, position: [0, head, proscenium.z + 10.4], look: [0, floor + 2.6, proscenium.z] },
      // A slow step closer while they open.
      { t: TIMELINE.arrive, position: [0, head, proscenium.z + 8.8], look: [0, floor + 2.2, foyer.back] },
      // Between the curtains, up to the wall.
      { t: 1, position: [0, head, foyer.back + end.distance], look: [0, head, foyer.back] },
    ];
  }

  /**
   * Which stretch between two stops a time falls in: { index, share }, where `index` is the stop before it
   * and `share` (0 to 1) how far along to the next. Times before the first stop hold at it; after the last, at it.
   */
  function segmentAt(times, t) {
    const last = times.length - 1;
    if (t <= times[0]) return { index: 0, share: 0 };
    if (t >= times[last]) return { index: last - 1, share: 1 };
    let index = 0;
    while (index < last - 1 && t >= times[index + 1]) index += 1;
    return { index, share: (t - times[index]) / (times[index + 1] - times[index]) };
  }

  /**
   * A point on a curtain. `across` runs 0 at the fixed outer edge to 1 at the edge that meets the other curtain;
   * `down` 0 at the rail to 1 at the hem; `open` 0 closed to 1 drawn fully aside. Returns how far the point sits
   * from the fixed edge (`x`) and how far forward of the rail (`z`), in metres. As the curtain gathers, the same
   * cloth takes up less width, so its folds deepen; the hem trails a little behind the rail.
   */
  function curtainPoint(across, down, open, { width, gathered, folds } = PLAN.curtain) {
    const trailing = clamp(open - Math.sin(Math.PI * open) * 0.09 * down);
    const eased = trailing * trailing * (3 - 2 * trailing);
    const phase = across * folds * 2 * Math.PI;
    const depth = lerp(0.06, 0.2, eased) * (0.75 + 0.25 * down);
    return {
      x: across * lerp(width, gathered, eased),
      z: Math.sin(phase) * depth + Math.sin(phase * 0.37 + 1.3) * depth * 0.3,
    };
  }

  return { TIMELINE, PLAN, clamp, lerp, smoothstep, fieldOfView, distanceToFit, arrival, cameraKeys, segmentAt, curtainPoint };
})());
