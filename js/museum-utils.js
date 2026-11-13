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
    // Landing there, the page's word dissolves and the building's inscription gilds in over the same spot.
    // The two are set in different letters, so one is nearly gone before the other is nearly there.
    wordFades: [0.074, 0.097],
    inscribed: [0.084, 0.11],
    wordHandedOver: 0.11, // only the inscription is left
    setOff: 0.1, // the walk begins
    doors: [0.235, 0.325],
    inside: [0.31, 0.38], // crossing the threshold: evening light gives way to the foyer's
    curtains: [0.5, 0.7],
    arrive: 0.72, // the curtains are open; the walk goes on between them, into the exhibition
    inGallery: 0.84, // standing before the wall of pictures
    toCatalogue: 0.9, // after a pause there, the walk turns to the catalogue on its stand
    overCatalogue: 0.965, // square over its cover; the rest closes in
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
    foyer: { halfWidth: 7, height: 8.5, back: -30 }, // `back`: the far wall, where the pictures hang
    // The exhibition room behind the curtains. Pictures hang with their middles on one line, `hangLine` above
    // the floor, at `scale` times their real size (the room is larger than life), `gap` apart.
    // `gap` leaves room for a label beside each work. The walk stops before the wall between `stand.nearest`
    // and `stand.furthest` metres from it, wherever what it should take in just fits (see cameraKeys).
    gallery: { hangLine: 2.05, scale: 2.0, gap: 1.3, stand: { nearest: 6.4, furthest: 9.5 } },
    // The catalogue lies on a stand whose top slopes toward the visitor by `tilt` degrees. Its cover is `long`
    // by `short` metres, turned to suit the screen (see closeUp).
    catalogue: { z: -26.6, height: 1.06, tilt: 28, long: 0.5, short: 0.36 },
    proscenium: { z: -19, width: 8, height: 5.6, thickness: 0.5 },
    curtain: { z: -19.5, width: 4.35, height: 5.9, gathered: 0.8, folds: 7 },
    eye: 1.65, // eye height above the floor
    // The inscription on the frieze: its capitals' height in metres; the space added between letters and the
    // space between words, both in ems. Roman inscriptions are set wide.
    sign: { capHeight: 0.6, tracking: 0.14, wordSpace: 0.85 },
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
   * The last stop: square on to the catalogue's cover, close enough that the cover is all there is to see.
   * The cover is turned to suit the screen (upright on a tall one), and the distance is the largest at which
   * it still fills the view both ways. Returns the cover's size, that distance, and the width of cover in view.
   */
  function closeUp(aspect) {
    const { long, short } = PLAN.catalogue;
    const cover = aspect < 1 ? { width: short, height: long } : { width: long, height: short };
    const half = tanHalf(fieldOfView(aspect));
    const distance = Math.min(cover.height, cover.width / aspect) / (2 * half);
    return { cover, distance, visibleWidth: 2 * distance * half * aspect };
  }

  /** Where the catalogue's cover is: its middle, and the direction it faces (up, and toward the visitor). */
  function catalogue() {
    const tilt = (PLAN.catalogue.tilt * Math.PI) / 180;
    return { centre: [0, platform + PLAN.catalogue.height, PLAN.catalogue.z], facing: [0, Math.cos(tilt), Math.sin(tilt)], tilt };
  }

  /**
   * Hangs pictures in a row, centred on the wall: given each one's real size in inches, returns its width and
   * height on this wall in metres and the position of its middle along the wall.
   */
  function hang(sizes) {
    const { scale, gap } = PLAN.gallery;
    const metres = sizes.map(({ widthIn, heightIn }) => ({ width: widthIn * 0.0254 * scale, height: heightIn * 0.0254 * scale }));
    const total = metres.reduce((sum, picture) => sum + picture.width, 0) + gap * (metres.length - 1);
    let left = -total / 2;
    return metres.map((picture) => {
      const x = left + picture.width / 2;
      left += picture.width + gap;
      return { ...picture, x };
    });
  }

  /**
   * The camera's stops: where it stands and what it looks at, at each time. Between stops the scene eases
   * along a curve through them (js/museum.js). `view` is the stretch of the exhibition wall to take in when
   * standing before it: where its middle is along the wall, and how wide it is, in metres.
   */
  function cameraKeys(aspect, view = { x: 0, width: 8.5 }) {
    const { platform: floor, eye, wall, proscenium, foyer } = PLAN;
    const fovDeg = fieldOfView(aspect);
    // The first view is level, as an architectural photograph is, so the columns stand upright: the camera is
    // raised to the height it looks at, and stands back until the roof (with some sky) and the steps fit.
    const level = PLAN.top * 0.46;
    const far = distanceToFit({ width: PLAN.frontage + 1.5, height: 2 * (PLAN.top + 1.4 - level), fovDeg, aspect });
    const head = floor + eye;
    const book = catalogue();
    const reach = closeUp(aspect).distance;
    const { stand } = PLAN.gallery;
    const wallOfPictures = [view.x, floor + PLAN.gallery.hangLine, foyer.back];
    const back = clamp(distanceToFit({ width: view.width, height: 0, fovDeg, aspect }), stand.nearest, stand.furthest);
    const above = (distance) => book.centre.map((value, axis) => value + book.facing[axis] * distance); // out from the cover, along the way it faces
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
      // Between the curtains and into the exhibition, to stand before the pictures.
      { t: TIMELINE.inGallery, position: [view.x, head, foyer.back + back], look: wallOfPictures },
      // A pause there, drifting a little closer.
      { t: TIMELINE.toCatalogue, position: [view.x, head, foyer.back + back - 0.7], look: wallOfPictures },
      // Down to the catalogue: first to stand square over its cover, a little way off, then straight in along
      // the cover's own line until it fills the view. Arriving square means the cover never looks skewed.
      { t: TIMELINE.overCatalogue, position: above(reach * 2.6), look: book.centre },
      { t: 1, position: above(reach), look: book.centre },
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

  return { TIMELINE, PLAN, clamp, lerp, smoothstep, fieldOfView, distanceToFit, closeUp, catalogue, hang, cameraKeys, segmentAt, curtainPoint };
})());
