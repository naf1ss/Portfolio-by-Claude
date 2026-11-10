/**
 * The home page's opening and its featured works.
 *
 *   HomeReveal.mount({ opening, features, project }, { heroWork, featureWorks, trailWorks, projectData, projectCover, hrefFor, U })
 *
 * The opening: "nuances" is cut out of the page. At rest the letters hold a solid colour; a painting waits behind
 * it. The page has thickness: each letter is a short tunnel whose walls are seen in perspective from wherever the
 * cursor is, and the view drifts by itself when the cursor rests. Scrolling lifts the colour and flies the page
 * into one of the letters until the painting fills the screen. Before you scroll, moving the cursor also leaves
 * two trails, one of paintings where the cursor is and one of photographs where its mirror image would be: two
 * hands at work, the way the artist is ambidextrous.
 *
 * How it stays smooth. Nothing is redrawn while the view moves; pictures made once are only moved, which the
 * browser does on the graphics card:
 *
 *   letters  the inside of the letters: pictures of the word stacked from the face of the page to the far end,
 *            each a shade deeper and placed a little nearer the viewpoint. They are made once; moving the view
 *            only re-places them.
 *   paper    the page with the word cut out of it: a picture at rest, and a canvas while the flight zooms it,
 *            redrawn only when the page scrolls (one fill).
 *   lift     a picture of the dot and the signature, made once, then only moved.
 *
 * SVG masks and CSS filters redrawn every frame are what make such a page stutter, least forgivingly in Safari.
 * The featured works below arrive once, as they come into view, using transitions of transform and opacity only,
 * which the browser runs off the main thread.
 */
(function () {
  'use strict';

  const WORD = 'nuances';
  const WORD_FACE = 'Bodoni Moda';
  const SCRIPT_FACE = 'Pinyon Script'; // the "by nafis" signature
  const ZOOM_SHARE = 0.78; // of the opening's scroll spent flying through the letter; the rest rests on the painting
  const MAX_PIXEL_RATIO = 2; // sharper than this costs frames and cannot be seen in motion

  // The depth of the cut letters. Looking into a letter you see its wall, shading from the face of the page down
  // to the far end. That is drawn as copies of the word, each one shade deeper and shrunk a little further toward
  // the viewpoint, which is how the far end of a tunnel looks.
  const WALL_LAYERS = 5; // each is a full layer for the graphics card to blend, so no more than the shading needs
  const WALL_PICTURE_WIDTH = 1600; // px: the shading is soft, so its pictures need not be sharper than this
  const DEPTH = 0.034; // how much smaller the far end of a letter is than its face
  const PRESS_DEPTH = 0.03; // extra depth while the pointer is held down
  const LIFT = 0.012; // the dot and the signature float this far above the page
  const REACH = { x: 0.42, y: 0.6 }; // how far the viewpoint follows the cursor, as a share of its distance from the word
  const VIEW_EASE = 0.085; // share of the remaining distance the viewpoint covers each frame
  const POINTER_REST_MS = 2600; // after this long without moving, the view drifts by itself again
  const EMERGE_MS = 1500; // the depth grows from flat when the page opens
  const COLOUR_GONE = 0.3; // share of the flight by which the letters' colour has lifted off the painting
  const WALL_SHADE = { light: [26, 29, 36], dark: [154, 161, 173] }; // what the walls fall toward, per theme

  const TRAIL_STEP = 90; // px of cursor travel between pictures in the trails
  const TRAIL_GAP_MS = 80; // and at least this long, so a fast sweep cannot outrun the pool of pictures
  const TRAIL_LIFE_MS = 1100;
  const UNFOLD_SLICES = 8;
  const STROKES = 5; // brushstrokes that uncover the painting

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const plain = (text) => String(text || '').replace(/\*/g, '');

  /** "rgb(12, 34, 56)" to [12, 34, 56]. */
  const channels = (colour) => (colour.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
  /** A canvas as a picture element, ready to show. Unlike a live canvas, a picture costs nothing to keep on screen. */
  function pictureOf(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const picture = new Image();
        picture.alt = '';
        picture.src = URL.createObjectURL(blob);
        const ready = () => resolve(picture);
        (picture.decode ? picture.decode() : Promise.reject()).then(ready, () => { picture.onload = ready; if (picture.complete) ready(); });
      });
    });
  }

  const release = (pictures) => pictures.forEach((picture) => URL.revokeObjectURL(picture.src));

  const mix = (from, to, share) => `rgb(${from.map((value, i) => Math.round(value + (to[i] - value) * share)).join(' ')})`;

  /** Calls back at most once a frame, however often it is asked. */
  function oncePerFrame(callback) {
    let frame = 0;
    return () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        callback();
      });
    };
  }

  /**
   * The thickest stroke near the middle of the word, found by drawing the word on a hidden canvas: the opening
   * flies into it, so the hole grows to fill the screen. Returns its centre and half-width, in the word's box.
   */
  function thickestStroke(font, fontSize, wordWidth) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(wordWidth);
    canvas.height = Math.ceil(fontSize * 1.2);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.font = font;
    ctx.textBaseline = 'alphabetic';
    const baseline = fontSize;
    ctx.fillText(WORD, 0, baseline);
    const row = Math.round(baseline - fontSize * 0.22); // through the middle of the lowercase letters
    const pixels = ctx.getImageData(0, row, canvas.width, 1).data;
    let best = { centre: wordWidth / 2, half: fontSize * 0.04 };
    let runStart = -1;
    for (let x = 0; x <= canvas.width; x += 1) {
      const filled = x < canvas.width && pixels[x * 4 + 3] > 128;
      if (filled && runStart < 0) runStart = x;
      if (!filled && runStart >= 0) {
        const centre = (runStart + x) / 2;
        const half = (x - runStart) / 2;
        const central = centre > wordWidth * 0.3 && centre < wordWidth * 0.7;
        if (central && half > best.half) best = { centre, half };
        runStart = -1;
      }
    }
    return { x: best.centre, y: row, half: best.half };
  }

  /** The opening: the word cut out of the page, its depth, the flight into it, and the two trails. */
  function mountOpening(section, { heroWork, trailWorks, U }) {
    const stage = section.querySelector('.opening__stage');
    const art = section.querySelector('[data-opening-art]');
    const caption = section.querySelector('[data-opening-caption]');
    const layers = {
      letters: section.querySelector('[data-opening-letters]'),
      paper: section.querySelector('[data-opening-paper]'),
      paperAtRest: section.querySelector('[data-opening-paper-rest]'),
      lift: section.querySelector('[data-opening-lift]'),
    };
    const pen = layers.paper.getContext('2d');
    let depths = []; // the copies of the word inside the letters: { picture, share of the full depth }
    const face = document.createElement('div'); // what fills the letters beneath the copies
    layers.letters.append(face);

    art.src = U.imageUrl(heroWork, window.innerWidth * (window.devicePixelRatio || 1) > 1400 ? 1800 : 1200);
    art.alt = plain(U.altText(heroWork));
    caption.querySelector('.opening__caption-title').textContent = plain(heroWork.title);
    caption.querySelector('.opening__caption-facts').textContent = U.captionParts(heroWork).meta;

    // Everything measured from the screen: where the word sits, where the flight aims, the colours in force.
    let scene = null;
    const state = {
      flight: -1, // 0 at rest, 1 once the painting fills the screen; -1 until first measured
      scale: 1,
      view: null, // where the letters are being looked at from
      placedView: null,
      pointer: null,
      pointerAt: 0,
      pressed: false,
      press: 0,
      born: Infinity, // when the depth began to grow; set once the letters are built
      onScreen: true,
      frame: 0,
      paperAtRest: false, // whether the picture of the page is ready to stand in for the canvas
    };

    function measure() {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      layers.paper.width = Math.round(width * ratio);
      layers.paper.height = Math.round(height * ratio);

      const fontSize = Math.min((width * 0.88) / 3.83, height * 0.36); // Bodoni's "nuances." is about 3.83 em wide
      const font = `500 ${fontSize}px '${WORD_FACE}'`;
      pen.font = font;
      const wordWidth = pen.measureText(WORD).width;
      const left = (width - wordWidth - pen.measureText('.').width) / 2; // the dot counts toward the centring
      const baseline = height * 0.47 + fontSize * 0.28;

      const stroke = thickestStroke(font, fontSize, wordWidth);
      const origin = { x: left + stroke.x, y: baseline - fontSize + stroke.y };
      const farthest = Math.max(
        Math.hypot(origin.x, origin.y),
        Math.hypot(width - origin.x, origin.y),
        Math.hypot(origin.x, height - origin.y),
        Math.hypot(width - origin.x, height - origin.y)
      );
      const scriptSize = fontSize * 0.46;
      scene = {
        width,
        height,
        ratio,
        font,
        fontSize,
        left,
        baseline,
        wordWidth,
        origin,
        endScale: (farthest / Math.max(stroke.half, 2)) * 1.25,
        centre: { x: left + wordWidth / 2, y: baseline - fontSize * 0.3 },
        drift: { x: wordWidth * 0.3, y: fontSize * 0.5 },
        script: { size: scriptSize, x: left + wordWidth, y: baseline + scriptSize * 0.98 },
        // The letters' box, with room around it for the copies to shift without showing an edge.
        box: { x: left - fontSize * 0.2, y: baseline - fontSize * 1.2, width: wordWidth + fontSize * 0.4, height: fontSize * 1.7 },
        // The box of the dot and the signature, shadow included.
        liftBox: { x: left + wordWidth * 0.4, y: baseline - fontSize * 0.4, width: wordWidth * 0.6 + fontSize * 0.5, height: fontSize * 0.4 + scriptSize * 1.7 },
        colours: null,
      };
      layers.letters.style.transformOrigin = `${origin.x}px ${origin.y}px`;
      if (!state.view) state.view = reduceMotion
        ? { x: scene.centre.x - scene.drift.x * 0.5, y: scene.centre.y - scene.drift.y * 0.6 }
        : { ...scene.centre };
      readColours();
      state.flight = -1; // forces the scroll-driven layers to redraw at the new size
      onScroll();
    }

    /** The theme's colours, read from the page so the canvases follow light, dark and any room colour. */
    function readColours() {
      if (!scene) return;
      const style = getComputedStyle(stage);
      const paper = channels(style.backgroundColor);
      const ink = channels(style.color);
      const isDark = paper[0] + paper[1] + paper[2] < 384;
      const shade = isDark ? WALL_SHADE.dark : WALL_SHADE.light;
      scene.colours = {
        paper: mix(paper, paper, 0),
        ink: mix(ink, ink, 0),
        // Wall 0 is just under the face of the page; the last is the deepest.
        walls: Array.from({ length: WALL_LAYERS }, (_, layer) => mix(paper, shade, 0.14 + (layer / (WALL_LAYERS - 1)) * 0.62)),
      };
      buildLetters();
      buildLift();
      buildPaperAtRest();
    }

    /** The page, with the word cut clean out of it, as seen at a zoom about the flight's aim. */
    function drawPaper(onto, zoom) {
      const { ratio, origin, colours, font, left, baseline } = scene;
      onto.setTransform(1, 0, 0, 1, 0, 0);
      onto.globalCompositeOperation = 'source-over';
      onto.clearRect(0, 0, onto.canvas.width, onto.canvas.height);
      if (state.flight >= 1 && onto === pen) return; // the hole is wider than the screen: no page left to draw
      onto.fillStyle = colours.paper;
      onto.fillRect(0, 0, onto.canvas.width, onto.canvas.height);
      onto.setTransform(ratio * zoom, 0, 0, ratio * zoom, ratio * origin.x * (1 - zoom), ratio * origin.y * (1 - zoom));
      onto.globalCompositeOperation = 'destination-out';
      onto.font = font;
      onto.fillText(WORD, left, baseline);
    }

    /**
     * The page as a picture, for while nothing is scrolling. A live canvas can cost a little every frame it is on
     * screen, and the view moves every frame; a picture costs nothing.
     */
    function buildPaperAtRest() {
      const builtFor = scene.colours;
      const { canvas, brush } = canvasFor({ x: 0, y: 0, width: scene.width, height: scene.height }, scene.ratio);
      drawPaper(brush, 1);
      state.paperAtRest = false;
      showPaper();
      pictureOf(canvas).then((picture) => {
        if (scene.colours === builtFor) {
          if (layers.paperAtRest.src) URL.revokeObjectURL(layers.paperAtRest.src);
          layers.paperAtRest.src = picture.src;
          state.paperAtRest = true;
          showPaper();
        } else {
          release([picture]);
        }
      });
    }

    /** At rest the picture of the page shows; in flight, the canvas. */
    function showPaper() {
      const resting = state.paperAtRest && state.flight === 0;
      layers.paperAtRest.style.visibility = resting ? 'visible' : 'hidden';
      layers.paper.style.visibility = resting ? 'hidden' : 'visible';
    }

    /** A canvas the size of a box on the stage, with a pen set to draw in the stage's own coordinates. */
    function canvasFor(box, sharpness) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(box.width * sharpness);
      canvas.height = Math.round(box.height * sharpness);
      const brush = canvas.getContext('2d');
      brush.setTransform(sharpness, 0, 0, sharpness, -box.x * sharpness, -box.y * sharpness);
      return { canvas, brush };
    }

    const placeIn = (box, node) => Object.assign(node.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.width}px`, height: `${box.height}px` });

    /**
     * The inside of the letters, built once per size and theme. From the bottom of the stack up: the shallowest
     * wall shade filling the box, a picture of the word in each deeper shade, and the word in the solid colour of
     * the far end. The page above hides all of it except what shows through the letters.
     *
     * Until the pictures are ready the box is simply the solid colour, which is how the letters look flat; the
     * depth then grows in from there. Only the solid word's edge is seen sharp, so the shades are smaller pictures.
     */
    function buildLetters() {
      const builtFor = scene.colours;
      const { box, ratio, font, left, baseline } = scene;
      const { walls: shades, ink } = builtFor;
      placeIn(box, face);
      if (!depths.length) face.style.background = ink;

      const soft = Math.min(1, WALL_PICTURE_WIDTH / box.width);
      const copies = [];
      for (let layer = 1; layer <= WALL_LAYERS; layer += 1) {
        const deepest = layer === WALL_LAYERS;
        const { canvas, brush } = canvasFor(box, deepest ? ratio : soft);
        brush.font = font;
        brush.fillStyle = deepest ? ink : shades[layer];
        brush.fillText(WORD, left, baseline);
        copies.push(pictureOf(canvas).then((picture) => ({ picture, share: layer / WALL_LAYERS })));
      }
      Promise.all(copies).then((built) => {
        if (scene.colours !== builtFor) { // the screen or theme changed while these were being made
          release(built.map((copy) => copy.picture));
          return;
        }
        release(depths.map((copy) => copy.picture));
        depths = built; // shallowest first, so deeper copies lie over shallower ones
        depths.forEach((copy) => placeIn(box, copy.picture));
        face.style.background = shades[0];
        layers.letters.replaceChildren(face, ...depths.map((copy) => copy.picture));
        if (state.born === Infinity) state.born = performance.now();
        placeLetters();
        watch();
      });
    }

    /** Sets each copy of the word for the current viewpoint: shrunk toward it, the deeper the more. Nothing is redrawn. */
    function placeLetters() {
      const { box } = scene;
      const emerged = reduceMotion ? 1 : 1 - (1 - clamp((performance.now() - state.born) / EMERGE_MS)) ** 3;
      const reach = (DEPTH + PRESS_DEPTH * state.press) * emerged;
      const { x, y } = state.view;
      depths.forEach(({ picture, share }) => {
        const shrink = 1 - reach * share;
        const dx = (x - box.x) * (1 - shrink);
        const dy = (y - box.y) * (1 - shrink);
        picture.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${shrink.toFixed(5)})`;
      });
      state.placedView = { x, y, reach };
    }

    /** The dot and the signature with their shadow: one picture in a small box of its own, from then on only moved. */
    function buildLift() {
      const builtFor = scene;
      const { liftBox, origin, ratio, font, fontSize, left, baseline, wordWidth, script } = scene;
      const lift = layers.lift;
      const { canvas, brush } = canvasFor(liftBox, ratio);
      brush.fillStyle = getComputedStyle(lift).color; // the accent, which follows the theme
      brush.shadowColor = 'rgb(0 0 0 / 0.16)';
      brush.shadowBlur = fontSize * 0.03 * ratio;
      brush.shadowOffsetY = fontSize * 0.018 * ratio;
      brush.font = font;
      brush.fillText('.', left + wordWidth, baseline);
      brush.font = `400 ${script.size}px '${SCRIPT_FACE}'`;
      brush.textAlign = 'right';
      brush.fillText('by nafis', script.x, script.y);
      pictureOf(canvas).then((picture) => {
        if (scene !== builtFor) {
          release([picture]);
          return;
        }
        if (lift.src) URL.revokeObjectURL(lift.src);
        placeIn(liftBox, lift);
        lift.style.transformOrigin = `${origin.x - liftBox.x}px ${origin.y - liftBox.y}px`; // it zooms about the flight's aim
        lift.src = picture.src;
      });
    }

    /** Floats the dot and signature above the page: they shift against the viewpoint, and zoom with the flight. */
    function placeLift() {
      const { liftBox } = scene;
      const dx = (liftBox.x + liftBox.width / 2 - state.view.x) * LIFT;
      const dy = (liftBox.y + liftBox.height / 2 - state.view.y) * LIFT;
      layers.lift.style.transform = `scale(${state.scale.toFixed(4)}) translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
    }

    /** How far through the opening the page has scrolled, 0 to 1. */
    function progress() {
      const travel = section.offsetHeight - window.innerHeight;
      return clamp(-section.getBoundingClientRect().top / Math.max(travel, 1));
    }

    /** Everything that follows the scroll position. Does nothing if the flight has not moved. */
    function onScroll() {
      if (!scene) return;
      const p = progress();
      const flight = reduceMotion ? (p > 0.1 ? 1 : 0) : clamp(p / ZOOM_SHARE);
      if (flight === state.flight) return;
      state.flight = flight;
      // Scale grows exponentially, so the flight feels steady rather than slow then sudden; easing in adds a lunge.
      state.scale = Math.exp(Math.log(scene.endScale) * flight ** 1.6);

      drawPaper(pen, state.scale);
      showPaper();
      placeLift();
      art.style.transform = `scale(${(1.18 - 0.18 * flight).toFixed(4)})`;
      // The letters' colour zooms with the page and lifts off the painting early in the flight.
      layers.letters.style.transform = `scale(${state.scale.toFixed(4)})`;
      layers.letters.style.opacity = clamp(1.2 - (flight / COLOUR_GONE) * 1.2).toFixed(3);
      layers.letters.style.visibility = flight < COLOUR_GONE ? 'visible' : 'hidden';
      stage.style.setProperty('--leave', clamp(1 - flight * 5).toFixed(3)); // the word's companions leave early
      stage.classList.toggle('is-through', flight >= 0.98);
      document.documentElement.classList.toggle('is-opening-dark', flight > 0.45);
      watch();
    }

    function viewTarget(now) {
      const { centre, drift, origin } = scene;
      let target;
      if (state.pointer && now - state.pointerAt < POINTER_REST_MS) {
        target = { x: centre.x + (state.pointer.x - centre.x) * REACH.x, y: centre.y + (state.pointer.y - centre.y) * REACH.y };
      } else {
        const t = now / 1000;
        target = { x: centre.x + Math.cos(t * 0.5) * drift.x, y: centre.y + Math.sin(t * 0.37) * drift.y };
      }
      const square = clamp(state.flight * 5); // flying in: look straight down the letter
      return { x: target.x + (origin.x - target.x) * square, y: target.y + (origin.y - target.y) * square };
    }

    /** One frame of the view: ease toward the cursor (or the drift) and re-place the layers if they would move. */
    function look() {
      const now = performance.now();
      const target = viewTarget(now);
      state.view.x += (target.x - state.view.x) * VIEW_EASE;
      state.view.y += (target.y - state.view.y) * VIEW_EASE;
      state.press += ((state.pressed ? 1 : 0) - state.press) * 0.16;

      const placed = state.placedView;
      const emerging = now - state.born < EMERGE_MS + 100;
      const reach = DEPTH + PRESS_DEPTH * state.press;
      const moved = !placed || emerging || Math.abs(placed.x - state.view.x) > 0.2 || Math.abs(placed.y - state.view.y) > 0.2 || Math.abs(placed.reach - reach) > 0.0004;
      if (moved) {
        placeLetters();
        placeLift();
      }
    }

    /** Runs the view while the letters can be seen; rests while they are covered, off screen or in a hidden tab. */
    function watch() {
      const lettersShow = state.onScreen && state.flight < COLOUR_GONE && !document.hidden;
      if (state.frame || reduceMotion || !scene || !lettersShow) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        look();
        watch();
      });
    }

    window.addEventListener('scroll', oncePerFrame(onScroll), { passive: true });
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    });
    new IntersectionObserver(([entry]) => {
      state.onScreen = entry.isIntersecting;
      watch();
    }).observe(stage);
    document.addEventListener('visibilitychange', watch);

    // The canvases are painted in the theme's colours, so they are repainted when the theme or room changes.
    const repaint = () => {
      if (!scene) return;
      readColours();
      drawPaper(pen, state.scale);
    };
    new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mood'] });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);

    if (!reduceMotion) {
      stage.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return; // a finger is scrolling, not pointing
        const box = stage.getBoundingClientRect();
        state.pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
        state.pointerAt = performance.now();
      }, { passive: true });
      stage.addEventListener('pointerdown', () => { state.pressed = true; });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => stage.addEventListener(type, () => { state.pressed = false; }));
    }

    // The canvases draw their type in the site's faces, so those must be loaded before the word is measured.
    const faces = [`500 40px '${WORD_FACE}'`, `400 40px '${SCRIPT_FACE}'`].map((face) => document.fonts.load(face).catch(() => {}));
    Promise.all(faces).then(measure);

    if (!reduceMotion) mountTrails(stage, trailWorks, U, () => state.flight < 0.04);
  }

  /**
   * Two trails of pictures behind the cursor: paintings where it is, photographs at its mirror image.
   * The pictures are a fixed pool, loaded and decoded ahead of time and reused, so dropping one is only an
   * animation of transform and opacity: nothing is created, fetched or decoded while the cursor moves.
   */
  function mountTrails(stage, { paintings, photographs }, U, isActive) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || !paintings.length || !photographs.length) return;
    const layer = stage.querySelector('[data-opening-trails]');
    const fact = stage.querySelector('[data-opening-fact]');
    let pools = null;
    let last = null;
    let lastAt = 0;
    let turn = 0;

    const poolOf = (works, hand) => works.map((work) => {
      const picture = new Image();
      picture.className = `trail trail--${hand}`;
      picture.alt = '';
      picture.decoding = 'async';
      picture.src = U.imageUrl(work, 600);
      layer.append(picture);
      if (picture.decode) picture.decode().catch(() => {});
      return picture;
    });
    // Built when the browser is idle after loading, so the trails never compete with the first paint.
    const build = () => { pools = { right: poolOf(paintings, 'right'), left: poolOf(photographs, 'left') }; };
    if (window.requestIdleCallback) window.requestIdleCallback(build, { timeout: 2500 });
    else setTimeout(build, 600);

    function drop(picture, x, y) {
      if (!picture.complete || !picture.naturalWidth) return;
      const at = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${((Math.random() - 0.5) * 14).toFixed(1)}deg)`;
      picture.animate([
        { opacity: 0, transform: `${at} scale(0.4)` },
        { opacity: 1, transform: `${at} scale(1)`, offset: 0.18 },
        { opacity: 1, transform: `${at} scale(1)`, offset: 0.7 },
        { opacity: 0, transform: `${at} scale(0.85)` },
      ], { duration: TRAIL_LIFE_MS, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
    }

    stage.addEventListener('pointermove', (event) => {
      if (!pools || !isActive()) {
        last = null;
        return;
      }
      const box = stage.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const now = performance.now();
      if (last && (Math.hypot(x - last.x, y - last.y) < TRAIL_STEP || now - lastAt < TRAIL_GAP_MS)) return;
      last = { x, y };
      lastAt = now;
      turn += 1;
      drop(pools.right[turn % pools.right.length], x, y);
      drop(pools.left[turn % pools.left.length], box.width - x, y);
      fact.classList.add('is-shown');
    }, { passive: true });
  }

  /** Builds one featured work: the picture (arriving in its own way) and its label. */
  function featureArticle({ work, reveal }, index, { U, hrefFor }) {
    const article = document.createElement('article');
    article.className = `feature feature--${reveal}${index % 2 ? ' feature--flip' : ''}`;
    article.dataset.arrive = reveal;
    const category = U.CATEGORIES.find((entry) => entry.id === work.category);
    article.innerHTML = `
      <div class="feature__media"><div class="feature__frame"><img alt="" loading="lazy" decoding="async"></div></div>
      <div class="feature__text">
        <p class="eyebrow"></p>
        <h3 class="feature__title"></h3>
        <p class="feature__facts"></p>
        <a class="text-link feature__link">See it in the gallery <span aria-hidden="true">&rarr;</span></a>
      </div>`;
    const picture = article.querySelector('img');
    picture.src = U.imageUrl(work, 1200);
    picture.alt = plain(U.altText(work));
    picture.style.aspectRatio = `${work.w} / ${work.h}`;
    if (reveal === 'paint') article.querySelector('.feature__frame').append(brushstrokes());
    article.querySelector('.eyebrow').textContent = category ? category.label : '';
    // A photograph's catalogue title names its place in a series ("Stage Light, 4 of 20"); here the series is enough.
    const caption = U.captionParts(work);
    article.querySelector('.feature__title').textContent = plain(caption.title).replace(/, \d+ of \d+$/, '');
    article.querySelector('.feature__facts').textContent = caption.meta;
    article.querySelector('.feature__link').href = hrefFor(work);
    return article;
  }

  /** Bands of the page's colour lying over a painting; each sweeps off sideways in turn, like a brush uncovering it. */
  function brushstrokes() {
    const strokes = document.createElement('div');
    strokes.className = 'feature__strokes';
    strokes.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < STROKES; i += 1) {
      const stroke = document.createElement('span');
      stroke.style.setProperty('--i', i);
      stroke.style.setProperty('--sweep', i % 2 ? -1 : 1); // alternate strokes leave by opposite sides
      strokes.append(stroke);
    }
    return strokes;
  }

  /** The interdisciplinary project: a wide picture that unfolds like a folded panorama, and its summary. */
  function projectFeature(section, { project, cover, U }) {
    const media = section.querySelector('[data-project-media]');
    const source = U.imageUrl(cover, 1800);
    media.style.aspectRatio = `${cover.w} / ${cover.h}`;
    media.setAttribute('role', 'img');
    media.setAttribute('aria-label', plain(U.altText(cover)));
    for (let i = 0; i < UNFOLD_SLICES; i += 1) {
      const slice = document.createElement('span');
      slice.className = 'unfold__slice';
      // Alternate panels hinge on opposite edges and fold opposite ways, like a folding screen.
      slice.style.setProperty('--i', i);
      slice.style.setProperty('--fold', i % 2 ? -1 : 1);
      slice.style.transformOrigin = i % 2 ? '0 50%' : '100% 50%';
      slice.style.backgroundImage = `url("${source}")`;
      slice.style.backgroundSize = `${UNFOLD_SLICES * 100}% 100%`;
      slice.style.backgroundPosition = `${(i / (UNFOLD_SLICES - 1)) * 100}% 0`;
      media.append(slice);
    }
    section.querySelector('[data-project-kicker]').textContent = project.kicker;
    section.querySelector('[data-project-title]').textContent = plain(project.title);
    section.querySelector('[data-project-summary]').textContent = plain(project.summary);
    section.querySelector('[data-project-link]').href = U.projectPage(project.id);
  }

  /** Marks everything with data-arrive as arrived once it is well into view; the stylesheet does the rest. */
  function watchArrivals(root) {
    const items = [...root.querySelectorAll('[data-arrive]')];
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-arrived'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        entry.target.classList.add('is-arrived');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -22% 0px' });
    items.forEach((item) => observer.observe(item));
  }

  function mount({ opening, features, project }, { heroWork, featureWorks, trailWorks, projectData, projectCover, hrefFor, U }) {
    if (opening && heroWork) mountOpening(opening, { heroWork, trailWorks, U });
    if (features && featureWorks.length) {
      const list = features.querySelector('[data-features]');
      featureWorks.forEach((feature, index) => list.append(featureArticle(feature, index, { U, hrefFor })));
    }
    if (project && projectData && projectCover) projectFeature(project, { project: projectData, cover: projectCover, U });
    watchArrivals(document);
  }

  window.HomeReveal = { mount };
})();
