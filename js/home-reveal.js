/**
 * The home page's opening and its featured works.
 *
 *   HomeReveal.mount({ opening, features, project }, { heroWork, featureWorks, trailWorks, projectData, projectCover, hrefFor, U })
 *
 * The opening: "nuances" stands on the page as solid 3D letters. The word turns to face the cursor, the letters
 * nearest it step forward, and it sways by itself when the cursor rests. Scrolling squares the word up to the
 * page, where it turns out to be cut clean through: the colour lifts and the page flies into one of the letters
 * until the painting behind fills the screen. Before you scroll, moving the cursor also leaves two trails, one of
 * paintings where the cursor is and one of photographs where its mirror image would be: two hands at work, the
 * way the artist is ambidextrous.
 *
 * How it stays smooth. Nothing is redrawn while the word moves:
 *
 *   word    real text, each letter with copies of itself stacked behind it as its solid side. The browser draws
 *           them once; turning the word changes one transform, which the graphics card applies.
 *   paper   the page with the word cut out of it: a canvas, redrawn only when the page scrolls (one fill).
 *   lift    a picture of the dot and the signature, made once, for the flight.
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

  // The 3D word.
  const EXTRUDE_LAYERS = 5; // copies behind each letter; together they read as its solid side
  const TURN = { x: 9, y: 17 }; // degrees the word turns, at most, to face the cursor
  const PRESS_PX = 40; // how far the word sinks back while the pointer is held down
  const SQUARE_BY = 0.06; // share of the flight by which the word has squared up and handed over to the cut page
  const VIEW_EASE = 0.085; // share of the remaining distance the viewpoint covers each frame
  const POINTER_REST_MS = 2600; // after this long without moving, the word sways by itself again
  // Slower computers: if the word cannot keep this pace it sheds detail (see keepPace).
  const PACE = { frames: 40, slowMs: 36, settleMs: 2600 }; // 36 ms: slower than the 30 a second some phones cap at to save power
  const COLOUR_GONE = 0.3; // share of the flight by which the letters' colour has lifted off the painting

  const TRAIL_STEP = 90; // px of cursor travel between pictures in the trails
  const TRAIL_GAP_MS = 80; // and at least this long, so a fast sweep cannot outrun the pool of pictures
  const TRAIL_LIFE_MS = 1100;
  const UNFOLD_SLICES = 8;
  const STROKES = 5; // brushstrokes that uncover the painting

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const plain = (text) => String(text || '').replace(/\*/g, '');

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

  /** The opening: the word standing in 3D, the page it is cut from, the flight into it, and the two trails. */
  function mountOpening(section, { heroWork, trailWorks, U }) {
    const stage = section.querySelector('.opening__stage');
    const art = section.querySelector('[data-opening-art]');
    const layers = {
      colour: section.querySelector('[data-opening-colour]'),
      paper: section.querySelector('[data-opening-paper]'),
      blank: section.querySelector('[data-opening-blank]'),
      word: section.querySelector('[data-opening-word]'),
      lift: section.querySelector('[data-opening-lift]'),
    };
    const pen = layers.paper.getContext('2d');
    const body = document.createElement('div'); // the part of the 3D word that turns
    body.className = 'word3d__body';
    layers.word.append(body);
    let letters = []; // the 3D letters, with where each sits: { node, centre }

    art.src = U.imageUrl(heroWork, window.innerWidth * (window.devicePixelRatio || 1) > 1400 ? 1800 : 1200);
    art.alt = plain(U.altText(heroWork));

    // Everything measured from the screen: where the word sits and where the flight aims.
    let scene = null;
    const state = {
      flight: -1, // 0 at rest, 1 once the painting fills the screen; -1 until first measured
      scale: 1,
      view: null, // the point the word turns to face
      placed: null,
      pointer: null,
      pointerAt: 0,
      pressed: false,
      press: 0,
      onScreen: true,
      frame: 0,
    };

    function measure() {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      layers.paper.width = Math.round(width * ratio);
      layers.paper.height = Math.round(height * ratio);

      const fontSize = Math.min((width * 0.84) / 3.83, height * 0.36); // room at the sides for the word to turn; Bodoni's "nuances." is about 3.83 em wide
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
      // Where a line of this type puts its baseline below the top of its box, so letters set as text land
      // exactly on the word the canvas cuts out of the page.
      const lineTop = (face, size, y) => {
        pen.font = `${face.weight} ${size}px '${face.family}'`;
        const metrics = pen.measureText('n');
        const ascent = metrics.fontBoundingBoxAscent || size * 0.95;
        const descent = metrics.fontBoundingBoxDescent || size * 0.3;
        return y - ascent - (size - ascent - descent) / 2;
      };
      const glyphTop = lineTop({ family: WORD_FACE, weight: 500 }, fontSize, baseline);
      const scriptTop = lineTop({ family: SCRIPT_FACE, weight: 400 }, scriptSize, baseline + scriptSize * 0.98);
      pen.font = font;
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
        drift: { x: width * 0.2, y: height * 0.16 },
        glyphTop,
        // Each letter's left edge, measured as the width of the word before it, so the spacing is the word's own.
        lefts: [...`${WORD}.`].map((_, i) => left + pen.measureText(WORD.slice(0, i)).width),
        script: { size: scriptSize, x: left + wordWidth, y: baseline + scriptSize * 0.98, top: scriptTop },
        // The letters' box, with a margin: the colour that fills the cut-out word during the flight.
        box: { x: left - fontSize * 0.2, y: baseline - fontSize * 1.2, width: wordWidth + fontSize * 0.4, height: fontSize * 1.7 },
        liftBox: { x: left + wordWidth * 0.4, y: baseline - fontSize * 0.4, width: wordWidth * 0.6 + fontSize * 0.5, height: fontSize * 0.4 + scriptSize * 1.7 },
        colours: null,
      };
      Object.assign(layers.colour.style, { left: `${scene.box.x}px`, top: `${scene.box.y}px`, width: `${scene.box.width}px`, height: `${scene.box.height}px` });
      layers.colour.style.transformOrigin = `${origin.x - scene.box.x}px ${origin.y - scene.box.y}px`;
      if (!state.view) state.view = reduceMotion
        ? { x: scene.centre.x - scene.drift.x * 0.6, y: scene.centre.y - scene.drift.y * 0.5 }
        : { ...scene.centre };
      buildWord();
      readColours();
      state.flight = -1; // forces the scroll-driven layers to redraw at the new size
      onScroll();
      placeWord();
    }

    /**
     * The word in 3D. Each letter is real text with copies of itself stacked behind it, a hair apart in depth, which
     * read as its solid side once the word turns. The browser draws each copy once and from then on only moves it.
     */
    function buildWord() {
      const { fontSize, lefts, glyphTop, centre, origin, script } = scene;
      const first = !letters.length;
      layers.word.style.transformOrigin = `${origin.x}px ${origin.y}px`; // it zooms about the flight's aim
      layers.word.style.perspectiveOrigin = `${centre.x}px ${centre.y}px`;
      body.style.transformOrigin = `${centre.x}px ${centre.y}px`;
      body.style.fontSize = `${fontSize}px`;
      const glyphs = [...`${WORD}.`];
      letters = glyphs.map((glyph, i) => {
        const node = document.createElement('span');
        node.className = `word3d__letter${glyph === '.' ? ' word3d__letter--dot' : ''}`;
        node.style.left = `${lefts[i]}px`;
        node.style.top = `${glyphTop}px`;
        node.style.setProperty('--i', i);
        for (let layer = EXTRUDE_LAYERS; layer >= 0; layer -= 1) { // deepest first; layer 0 is the face
          const copy = document.createElement('span');
          copy.className = layer ? 'word3d__side' : 'word3d__face';
          copy.textContent = glyph;
          copy.style.setProperty('--z', (layer / EXTRUDE_LAYERS).toFixed(3));
          node.append(copy);
        }
        const next = lefts[i + 1] === undefined ? lefts[i] + fontSize * 0.28 : lefts[i + 1];
        return { node, centre: (lefts[i] + next) / 2 };
      });
      const signature = document.createElement('span');
      signature.className = 'word3d__script';
      signature.textContent = 'by nafis';
      Object.assign(signature.style, { right: `${scene.width - script.x}px`, top: `${script.top}px`, fontSize: `${script.size}px` });
      body.replaceChildren(...letters.map((letter) => letter.node), signature);
      layers.word.classList.toggle('is-entering', first && !reduceMotion);
    }

    /** The theme's colours, read from the page so the canvas and the picture follow light, dark and any room colour. */
    function readColours() {
      if (!scene) return;
      const style = getComputedStyle(stage);
      scene.colours = { paper: style.backgroundColor };
      buildLift();
    }

    /** The page, with the word cut clean out of it, as seen at a zoom about the flight's aim. */
    function drawPaper(zoom) {
      const { ratio, origin, colours, font, left, baseline } = scene;
      pen.setTransform(1, 0, 0, 1, 0, 0);
      pen.globalCompositeOperation = 'source-over';
      pen.clearRect(0, 0, pen.canvas.width, pen.canvas.height);
      if (state.flight >= 1) return; // the hole is wider than the screen: no page left to draw
      pen.fillStyle = colours.paper;
      pen.fillRect(0, 0, pen.canvas.width, pen.canvas.height);
      pen.setTransform(ratio * zoom, 0, 0, ratio * zoom, ratio * origin.x * (1 - zoom), ratio * origin.y * (1 - zoom));
      pen.globalCompositeOperation = 'destination-out';
      pen.font = font;
      pen.fillText(WORD, left, baseline);
    }

    /**
     * The dot and the signature as one flat picture. It stands in for their 3D selves once the flight is under
     * way, when all they do is grow and fade.
     */
    function buildLift() {
      const builtFor = scene;
      const { liftBox, origin, ratio, font, left, baseline, wordWidth, script } = scene;
      const lift = layers.lift;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(liftBox.width * ratio);
      canvas.height = Math.round(liftBox.height * ratio);
      const brush = canvas.getContext('2d');
      brush.setTransform(ratio, 0, 0, ratio, -liftBox.x * ratio, -liftBox.y * ratio);
      brush.fillStyle = getComputedStyle(lift).color; // the accent, which follows the theme
      brush.font = font;
      brush.fillText('.', left + wordWidth, baseline);
      brush.font = `400 ${script.size}px '${SCRIPT_FACE}'`;
      brush.textAlign = 'right';
      brush.fillText('by nafis', script.x, script.y);
      pictureOf(canvas).then((picture) => {
        if (scene !== builtFor) {
          URL.revokeObjectURL(picture.src);
          return;
        }
        if (lift.src) URL.revokeObjectURL(lift.src);
        Object.assign(lift.style, { left: `${liftBox.x}px`, top: `${liftBox.y}px`, width: `${liftBox.width}px`, height: `${liftBox.height}px` });
        lift.style.transformOrigin = `${origin.x - liftBox.x}px ${origin.y - liftBox.y}px`; // it zooms about the flight's aim
        lift.src = picture.src;
      });
    }

    /** Turns the word to face the viewpoint. Only one transform changes; nothing is redrawn. */
    function placeWord() {
      const { centre, width, height } = scene;
      const squared = 1 - clamp(state.flight / SQUARE_BY); // flying in, the word squares up to the page
      const turnY = clamp((state.view.x - centre.x) / (width / 2), -1, 1) * TURN.y * squared;
      const turnX = clamp((centre.y - state.view.y) / (height / 2), -1, 1) * TURN.x * squared;
      body.style.transform = `translateZ(${(-state.press * PRESS_PX).toFixed(1)}px) rotateX(${turnX.toFixed(3)}deg) rotateY(${turnY.toFixed(3)}deg)`;
      state.placed = { x: state.view.x, y: state.view.y, press: state.press };
    }

    /** Brings the letters nearest the cursor a little forward. The stylesheet eases each one to its new place. */
    function popLetters() {
      const { fontSize, baseline } = scene;
      const near = state.pointer && Math.abs(state.pointer.y - (baseline - fontSize * 0.35)) < fontSize * 0.75;
      letters.forEach(({ node, centre }) => {
        const distance = near ? Math.abs(state.pointer.x - centre) / (fontSize * 0.55) : Infinity;
        node.style.setProperty('--pop', Math.exp(-distance * distance).toFixed(2));
      });
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
      const scaled = `scale(${state.scale.toFixed(4)})`;

      // At rest the 3D word stands on a blank page. As the flight begins it squares up and flattens until it
      // matches the word cut out of the page exactly; then the cut page takes over, its letters filled with the
      // same colour, which lifts off the painting a little further in.
      const standing = flight < SQUARE_BY;
      drawPaper(state.scale);
      layers.word.style.visibility = standing ? 'visible' : 'hidden';
      layers.blank.style.visibility = standing ? 'visible' : 'hidden';
      layers.lift.style.visibility = standing ? 'hidden' : 'visible';
      layers.word.style.transform = scaled;
      layers.word.style.setProperty('--depth', (1 - clamp(flight / SQUARE_BY)).toFixed(3));
      layers.lift.style.transform = scaled;
      layers.colour.style.transform = scaled;
      layers.colour.style.opacity = clamp(1.2 - (flight / COLOUR_GONE) * 1.2).toFixed(3);
      layers.colour.style.visibility = flight < COLOUR_GONE ? 'visible' : 'hidden';
      art.style.transform = `scale(${(1.18 - 0.18 * flight).toFixed(4)})`;
      stage.style.setProperty('--leave', clamp(1 - flight * 5).toFixed(3)); // the word's companions leave early
      stage.classList.toggle('is-through', flight >= 0.98);
      document.documentElement.classList.toggle('is-opening-dark', flight > 0.45);
      if (standing) placeWord();
      watch();
    }

    function viewTarget(now) {
      const { centre, drift } = scene;
      if (state.pointer && now - state.pointerAt < POINTER_REST_MS) return state.pointer;
      if (pace.level >= 2) return centre; // a computer this slow gets a word that rests when the cursor does
      const t = now / 1000;
      return { x: centre.x + Math.cos(t * 0.5) * drift.x, y: centre.y + Math.sin(t * 0.37) * drift.y };
    }

    /**
     * Keeps the word smooth on computers that cannot draw it at full detail. Once the letters have arrived, the
     * time between frames is sampled; if the typical frame is slow the word steps down, first to thinner sides,
     * then to a flat word that only turns when the cursor moves. It never steps back up, so it cannot flicker.
     */
    const pace = { level: 0, since: 0, last: 0, samples: [] };
    function keepPace(now) {
      if (pace.level >= 2) return;
      const gap = now - pace.last;
      pace.last = now;
      if (!pace.since) pace.since = now;
      if (now - pace.since < PACE.settleMs || gap > 250) return; // still arriving, or the tab was away
      pace.samples.push(gap);
      if (pace.samples.length < PACE.frames) return;
      const typical = pace.samples.sort((a, b) => a - b)[PACE.frames >> 1];
      pace.samples = [];
      if (typical <= PACE.slowMs) return;
      pace.level += 1;
      pace.since = now - PACE.settleMs + 500; // a short pause, then judge the lighter word afresh
      layers.word.dataset.detail = pace.level === 1 ? 'light' : 'flat';
    }

    /** One frame of the view: ease toward the cursor (or the drift) and turn the word if it would move. */
    function look() {
      const now = performance.now();
      keepPace(now);
      const target = viewTarget(now);
      state.view.x += (target.x - state.view.x) * VIEW_EASE;
      state.view.y += (target.y - state.view.y) * VIEW_EASE;
      state.press += ((state.pressed ? 1 : 0) - state.press) * 0.16;
      const placed = state.placed;
      const moved = !placed || Math.abs(placed.x - state.view.x) > 0.3 || Math.abs(placed.y - state.view.y) > 0.3 || Math.abs(placed.press - state.press) > 0.004;
      if (moved) placeWord();
    }

    /** Runs the view while the 3D word can be seen; rests while it is replaced, off screen or in a hidden tab. */
    function watch() {
      const wordShows = state.onScreen && state.flight < SQUARE_BY && !document.hidden;
      if (state.frame || reduceMotion || !scene || !wordShows) return;
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

    // The canvas and the picture are painted in the theme's colours, so they are repainted when it changes.
    const repaint = () => {
      if (!scene) return;
      readColours();
      drawPaper(state.scale);
    };
    new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mood'] });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);

    if (!reduceMotion) {
      const pop = oncePerFrame(popLetters);
      stage.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return; // a finger is scrolling, not pointing
        const box = stage.getBoundingClientRect();
        state.pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
        state.pointerAt = performance.now();
        pop();
      }, { passive: true });
      stage.addEventListener('pointerleave', () => {
        state.pointer = null;
        pop();
      });
      stage.addEventListener('pointerdown', () => { state.pressed = true; });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => stage.addEventListener(type, () => { state.pressed = false; }));
    }

    // The word is measured and cut out in the site's faces, so those must be loaded first.
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
