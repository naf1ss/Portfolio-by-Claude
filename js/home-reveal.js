/**
 * The home page's opening and its featured works.
 *
 *   HomeReveal.mount({ opening, features, project }, { museum, featureWorks, trailWorks, projectData, projectCover, hrefFor, U })
 *
 * The opening: "nuances" stands on the page as solid 3D letters. The word turns to face the cursor, the letters
 * nearest it step forward, and it sways by itself when the cursor rests. Moving the cursor also leaves two
 * trails, one of paintings where the cursor is and one of photographs where its mirror image would be: two hands
 * at work, the way the artist is ambidextrous.
 *
 * Scrolling begins a walk into a museum (js/museum.js draws it; this file does the page's side). The word
 * squares up, the page fades to an evening square with the museum across it, and the word shrinks onto the
 * building's frieze as its sign. From there the scroll climbs the steps, passes the doors, crosses the foyer,
 * draws the curtains and arrives at a wall in the page's own colour, where the page carries on.
 *
 * How it stays smooth. The word is real text, each letter with copies of itself stacked behind it as its solid
 * side: the browser draws them once, and turning or shrinking the word changes one transform, which the
 * graphics card applies. The museum draws a frame only while something is moving. The featured works below
 * arrive once, as they come into view, using transitions of transform and opacity only, which the browser runs
 * off the main thread.
 */
(function () {
  'use strict';

  const WORD = 'nuances';
  const WORD_FACE = 'Bodoni Moda';
  const CURTAIN_KEY = 'nuances.curtain'; // where the visitor's choice of curtain colour is remembered
  const SCRIPT_FACE = 'Pinyon Script'; // the "by nafis" signature

  // The 3D word.
  const EXTRUDE_LAYERS = 5; // copies behind each letter; together they read as its solid side
  const TURN = { x: 9, y: 17 }; // degrees the word turns, at most, to face the cursor
  const PRESS_PX = 40; // how far the word sinks back while the pointer is held down
  const VIEW_EASE = 0.085; // share of the remaining distance the viewpoint covers each frame
  const POINTER_REST_MS = 2600; // after this long without moving, the word sways by itself again
  // Slower computers: if the word cannot keep this pace it sheds detail (see keepPace).
  const PACE = { frames: 40, slowMs: 36, settleMs: 2600 }; // 36 ms: slower than the 30 a second some phones cap at to save power

  const TRAIL_STEP = 90; // px of cursor travel between pictures in the trails
  const TRAIL_GAP_MS = 80; // and at least this long, so a fast sweep cannot outrun the pool of pictures
  const TRAIL_LIFE_MS = 1100;
  const UNFOLD_SLICES = 8;
  const STROKES = 5; // brushstrokes that uncover the painting

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { TIMELINE, clamp, lerp, smoothstep } = window.MuseumUtils; // the walk's timeline is shared with the 3D scene
  const plain = (text) => String(text || '').replace(/\*/g, '');

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
   * The visitor's choice of curtain colour: two swatches, shown while the curtains are in view. The choice is
   * remembered for next time. Returns { chosen(), show(visible) }.
   */
  function mountCurtainChoice(control, fallback, onChoose) {
    const swatches = [...control.querySelectorAll('[data-curtain]')];
    const names = swatches.map((swatch) => swatch.dataset.curtain);
    let chosen = names.includes(fallback) ? fallback : names[0];
    try {
      const saved = window.localStorage.getItem(CURTAIN_KEY);
      if (names.includes(saved)) chosen = saved;
    } catch (error) {
      // No storage (a private window, say): the default stands.
    }
    const mark = () => swatches.forEach((swatch) => swatch.setAttribute('aria-pressed', String(swatch.dataset.curtain === chosen)));
    mark();
    swatches.forEach((swatch) => swatch.addEventListener('click', () => {
      chosen = swatch.dataset.curtain;
      mark();
      try {
        window.localStorage.setItem(CURTAIN_KEY, chosen);
      } catch (error) {
        // Not remembered, but the curtains still change.
      }
      onChoose(chosen);
    }));
    control.hidden = false;
    return {
      chosen: () => chosen,
      show(visible) {
        control.classList.toggle('is-shown', visible);
        control.inert = !visible; // out of sight, it is out of the tab order too
      },
    };
  }

  /** Whether this browser can draw the museum smoothly enough to be worth walking into. */
  function canWalk() {
    if (!window.Museum) return false;
    const { webgl, software } = window.Museum.support();
    return webgl && (!software || new URLSearchParams(window.location.search).has('museum'));
  }

  /** The opening: the word standing in 3D, the two trails, and the walk into the museum that scrolling begins. */
  function mountOpening(section, { trailWorks, museum: settings, U }) {
    const stage = section.querySelector('.opening__stage');
    const layers = {
      museum: section.querySelector('[data-opening-museum]'),
      blank: section.querySelector('[data-opening-blank]'),
      word: section.querySelector('[data-opening-word]'),
    };
    const curtainChoice = mountCurtainChoice(section.querySelector('[data-opening-curtain]'), settings.curtainDefault, (name) => {
      if (museum) museum.setCurtain(name);
    });
    const body = document.createElement('div'); // the part of the 3D word that turns
    body.className = 'word3d__body';
    layers.word.append(body);
    let letters = []; // the 3D letters, with where each sits: { node, centre }

    // The walk needs a graphics card and a visitor who has not asked for less motion; without them the opening
    // is the wordmark alone, and the page carries on below. Decided now, so the page's length never changes
    // later. (A computer drawing 3D in software manages a few frames a second, which is worse than no walk.
    // Adding ?museum to the address walks anyway, for testing on such a machine.)
    const walks = !reduceMotion && canWalk();
    section.classList.toggle('has-museum', walks);
    let museum = null; // the 3D scene, once it has loaded

    // Everything measured from the screen: where the word sits, and where on the building it lands.
    let scene = null;
    const measure = document.createElement('canvas').getContext('2d');
    const state = {
      t: 0, // how far through the walk the scene is, 0 to 1
      view: null, // the point the word turns to face
      placed: null,
      pointer: null,
      pointerAt: 0,
      pressed: false,
      press: 0,
      onScreen: true,
      frame: 0,
    };

    function measureWord() {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      const fontSize = Math.min((width * 0.84) / 3.83, height * 0.36); // room at the sides for the word to turn; Bodoni's "nuances." is about 3.83 em wide
      const font = `500 ${fontSize}px '${WORD_FACE}'`;
      measure.font = font;
      const wordWidth = measure.measureText(WORD).width;
      const left = (width - wordWidth - measure.measureText('.').width) / 2; // the dot counts toward the centring
      const baseline = height * 0.47 + fontSize * 0.28;
      const scriptSize = fontSize * 0.46;
      // Where a line of this type puts its baseline below the top of its box, so letters set as text sit
      // exactly where the measurements say.
      const lineTop = (face, size, y) => {
        measure.font = `${face.weight} ${size}px '${face.family}'`;
        const metrics = measure.measureText('n');
        const ascent = metrics.fontBoundingBoxAscent || size * 0.95;
        const descent = metrics.fontBoundingBoxDescent || size * 0.3;
        return y - ascent - (size - ascent - descent) / 2;
      };
      const glyphTop = lineTop({ family: WORD_FACE, weight: 500 }, fontSize, baseline);
      const scriptTop = lineTop({ family: SCRIPT_FACE, weight: 400 }, scriptSize, baseline + scriptSize * 0.98);
      measure.font = font;
      scene = {
        width,
        height,
        fontSize,
        left,
        baseline,
        wordWidth,
        centre: { x: left + wordWidth / 2, y: baseline - fontSize * 0.3 },
        drift: { x: width * 0.2, y: height * 0.16 },
        glyphTop,
        // Each letter's left edge, measured as the width of the word before it, so the spacing is the word's own.
        lefts: [...`${WORD}.`].map((_, i) => left + measure.measureText(WORD.slice(0, i)).width),
        script: { size: scriptSize, x: left + wordWidth, top: scriptTop },
        sign: null, // where the wordmark on the building sits on screen: { x, y, width }
      };
      if (!state.view) state.view = reduceMotion
        ? { x: scene.centre.x - scene.drift.x * 0.6, y: scene.centre.y - scene.drift.y * 0.5 }
        : { ...scene.centre };
      buildWord();
      if (museum) {
        museum.resize();
        scene.sign = museum.signOnScreen();
      }
      walk(state.t);
      placeWord();
      onScroll();
    }

    /**
     * The word in 3D. Each letter is real text with copies of itself stacked behind it, a hair apart in depth, which
     * read as its solid side once the word turns. The browser draws each copy once and from then on only moves it.
     */
    function buildWord() {
      const { fontSize, lefts, glyphTop, centre, script } = scene;
      const first = !letters.length;
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

    /** The page's colours, for the parts of the museum that are the page: its last wall and the words on it. */
    function pageColours() {
      const style = getComputedStyle(stage);
      return { paper: style.backgroundColor, ink: style.color };
    }

    /** Turns the word to face the viewpoint. Only one transform changes; nothing is redrawn. */
    function placeWord() {
      const { centre, width, height } = scene;
      const squared = 1 - clamp(state.t / TIMELINE.squareBy); // setting off, the word squares up to the page
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
      return travel > 0 ? clamp(-section.getBoundingClientRect().top / travel) : 0;
    }

    /** The scroll position is handed to the museum, which eases toward it and reports each frame to `walk`. */
    function onScroll() {
      if (museum && scene) museum.setProgress(progress());
    }

    /**
     * The page's side of the walk, at time `t` (0 to 1). The 3D word squares up and flattens; the page fades
     * to show the museum in the evening behind it; the word shrinks onto the frieze, exactly over the same
     * word on the building, and is then let go. Everything after that is the museum's.
     */
    function walk(t) {
      state.t = t;
      if (!scene) return;
      const { left, baseline, wordWidth, sign } = scene;
      const standing = t < TIMELINE.squareBy;
      const landing = sign ? smoothstep(TIMELINE.squareBy, TIMELINE.wordLands, t) : 0;
      // The scale shrinks by equal ratios, which reads as steady; the place it shrinks toward moves evenly.
      const scale = sign ? (sign.width / wordWidth) ** landing : 1;
      const x = sign ? lerp(left, sign.x, landing) : left;
      const y = sign ? lerp(baseline, sign.y, landing) : baseline;
      const word = layers.word.style;
      word.transform = `translate(${(x - scale * left).toFixed(2)}px, ${(y - scale * baseline).toFixed(2)}px) scale(${scale.toFixed(5)})`;
      word.opacity = (1 - smoothstep(TIMELINE.wordLands, TIMELINE.wordHandedOver, t)).toFixed(3);
      word.visibility = t < TIMELINE.wordHandedOver ? 'visible' : 'hidden';
      word.setProperty('--depth', (1 - clamp(t / TIMELINE.squareBy)).toFixed(3));
      const paper = 1 - smoothstep(TIMELINE.squareBy, TIMELINE.paperGone, t);
      layers.blank.style.opacity = paper.toFixed(3);
      layers.blank.style.visibility = paper > 0 ? 'visible' : 'hidden';
      const leave = clamp(1 - t / (TIMELINE.squareBy * 2)); // the word's companions leave early
      stage.style.setProperty('--leave', leave.toFixed(3));
      stage.classList.toggle('is-walking', leave === 0); // once gone they must not be clicked or tabbed to either
      // The curtain colours are offered while the curtains are in view: from inside the foyer until the walk passes them.
      curtainChoice.show(Boolean(museum) && t > TIMELINE.inside[1] + 0.04 && t < TIMELINE.arrive + 0.015);
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

    /** Runs the view while the 3D word stands; rests once the walk has begun, off screen or in a hidden tab. */
    function watch() {
      const wordStands = state.onScreen && state.t < TIMELINE.squareBy && !document.hidden;
      if (state.frame || reduceMotion || !scene || !wordStands) return;
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
      resizeTimer = setTimeout(measureWord, 150);
    });
    new IntersectionObserver(([entry]) => {
      state.onScreen = entry.isIntersecting;
      watch();
    }).observe(stage);
    document.addEventListener('visibilitychange', watch);

    // The museum's last wall is painted in the page's colours, so it is repainted when the theme changes.
    const repaint = () => { if (museum) museum.setColours(pageColours()); };
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
        if (museum) museum.setGaze((state.pointer.x / box.width) * 2 - 1, (state.pointer.y / box.height) * 2 - 1);
      }, { passive: true });
      stage.addEventListener('pointerleave', () => {
        state.pointer = null;
        pop();
        if (museum) museum.setGaze(0, 0);
      });
      stage.addEventListener('pointerdown', () => { state.pressed = true; });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => stage.addEventListener(type, () => { state.pressed = false; }));
    }

    // The word is measured in the site's faces, and the museum letters its walls in them, so those load first.
    const faces = [`500 40px '${WORD_FACE}'`, `600 40px '${WORD_FACE}'`, `italic 500 40px '${WORD_FACE}'`, `400 40px '${SCRIPT_FACE}'`, "500 40px 'Manrope'", "600 40px 'Manrope'"]
      .map((face) => document.fonts.load(face).catch(() => {}));
    Promise.all(faces).then(() => {
      measureWord();
      if (!walks) return;
      // Loaded once the wordmark is on screen, so the first paint never waits for the 3D library.
      window.Museum.create({
        canvas: layers.museum,
        word: WORD,
        signSuffix: settings.signSuffix,
        curtain: curtainChoice.chosen(),
        exhibits: settings.exhibits,
        wallText: settings.wallText,
        coverText: settings.cover,
        colours: pageColours(),
        onFrame: walk,
      }).then((built) => {
        if (!built) {
          section.classList.remove('has-museum'); // it could not start after all: the plain opening stands
          return;
        }
        museum = built;
        measureWord();
      });
    });

    if (!reduceMotion) mountTrails(stage, trailWorks, U, () => state.t < TIMELINE.squareBy / 2);
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

  function mount({ opening, features, project }, { museum, featureWorks, trailWorks, projectData, projectCover, hrefFor, U }) {
    if (opening) mountOpening(opening, { trailWorks, museum, U });
    if (features && featureWorks.length) {
      const list = features.querySelector('[data-features]');
      featureWorks.forEach((feature, index) => list.append(featureArticle(feature, index, { U, hrefFor })));
    }
    if (project && projectData && projectCover) projectFeature(project, { project: projectData, cover: projectCover, U });
    watchArrivals(document);
  }

  window.HomeReveal = { mount };
})();
