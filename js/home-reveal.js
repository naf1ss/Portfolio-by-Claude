/**
 * The home page's opening and its featured works.
 *
 *   HomeReveal.mount({ opening, features, project }, { heroWork, featureWorks, trailWorks, project, hrefFor, U })
 *
 * The opening: "nuances" is cut out of the page. At rest the letters hold a solid colour; a painting waits behind
 * it. The page has thickness: each letter is a short tunnel whose walls are seen in perspective from wherever the cursor is, and
 * the view drifts by itself when the cursor rests. Scrolling lifts the colour and flies the page into one of the
 * letters until the painting fills the screen. Before you scroll, moving the cursor also leaves two trails, one of paintings where
 * the cursor is and one of photographs where its mirror image would be: two hands at work, the way the artist is
 * ambidextrous.
 *
 * The featured works below each arrive in their own way as they scroll into view (data-arrive on the article):
 * paint spreads, a photograph develops, a ceramic piece turns to face you, and the interdisciplinary project
 * unfolds like a folded panorama. Every effect is a CSS transform, filter or mask driven by one variable, --p,
 * from 0 (not yet arrived) to 1 (settled), so the motion stays cheap on any computer.
 */
(function () {
  'use strict';

  const SVG = 'http://www.w3.org/2000/svg';
  const WORD = 'nuances';
  const ZOOM_SHARE = 0.78; // of the opening's scroll spent flying through the letter; the rest rests on the painting
  const TRAIL_STEP = 90; // px of cursor travel between pictures in the trails
  const TRAIL_LIFE_MS = 1100;
  const UNFOLD_SLICES = 8;
  const SCRIPT_FACE = 'Pinyon Script'; // the "by nafis" signature

  // The depth of the cut letters. Each wall layer is the word shrunk a little further toward the viewpoint, which
  // is how the far end of a tunnel looks; stacked from deep to shallow they shade the inside of each letter.
  const WALL_LAYERS = 6;
  const DEPTH = 0.034; // how much smaller the far end of a letter is than its face
  const PRESS_DEPTH = 0.03; // extra depth while the pointer is held down
  const LIFT = 0.012; // the dot and the signature float this far above the page
  const REACH = { x: 0.42, y: 0.6 }; // how far the viewpoint follows the cursor, as a share of its distance from the word
  const VIEW_EASE = 0.085; // share of the remaining distance the viewpoint covers each frame
  const POINTER_REST_MS = 2600; // after this long without moving, the view drifts by itself again
  const EMERGE_MS = 1500; // the depth grows from flat when the page opens

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const plain = (text) => String(text || '').replace(/\*/g, '');

  function svgElement(name, attributes = {}, text) {
    const node = document.createElementNS(SVG, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
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

  /** The opening: the word cut out of the page, the flight into it, and the two trails. */
  function mountOpening(section, { heroWork, trailWorks, U }) {
    const stage = section.querySelector('.opening__stage');
    const art = section.querySelector('[data-opening-art]');
    const paper = section.querySelector('[data-opening-paper]');
    const caption = section.querySelector('[data-opening-caption]');

    art.src = U.imageUrl(heroWork, window.innerWidth * (window.devicePixelRatio || 1) > 1400 ? 1800 : 1200);
    art.alt = plain(U.altText(heroWork));
    caption.querySelector('.opening__caption-title').textContent = plain(heroWork.title);
    caption.querySelector('.opening__caption-facts').textContent = U.captionParts(heroWork).meta;

    let zoom = { group: null, origin: { x: 0, y: 0 }, endScale: 40 };

    function draw() {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      paper.setAttribute('viewBox', `0 0 ${width} ${height}`);
      paper.replaceChildren();

      const fontSize = Math.min((width * 0.88) / 3.83, height * 0.36); // Bodoni's "nuances." is about 3.83 em wide
      const font = `500 ${fontSize}px 'Bodoni Moda'`;
      const measure = document.createElement('canvas').getContext('2d');
      measure.font = font;
      const wordWidth = measure.measureText(WORD).width;
      const left = (width - wordWidth - measure.measureText('.').width) / 2; // the dot counts toward the centring
      const baseline = height * 0.47 + fontSize * 0.28;

      const wordAttributes = { x: left, y: baseline, fill: '#000', 'font-family': 'Bodoni Moda', 'font-weight': 500, 'font-size': fontSize };
      const everywhere = { x: -width, y: -height, width: width * 3, height: height * 3 };
      // The walls only ever show through the letters, so their layers cover the word's box, not the whole page.
      const pad = fontSize * 0.2;
      const wordBox = { x: left - pad, y: baseline - fontSize - pad, width: wordWidth + pad * 2, height: fontSize * 1.3 + pad * 2 };

      const defs = svgElement('defs');
      const mask = svgElement('mask', { id: 'opening-cut', maskUnits: 'userSpaceOnUse', ...everywhere });
      mask.append(svgElement('rect', { ...everywhere, fill: '#fff' }), svgElement('text', wordAttributes, WORD));
      defs.append(mask);

      const group = svgElement('g', { class: 'opening__flight' });
      const walls = svgElement('g', { class: 'opening__walls' });
      const wallWords = [];
      for (let layer = WALL_LAYERS; layer >= 1; layer -= 1) { // deepest first, so shallower layers lie over it
        const wallMask = svgElement('mask', { id: `opening-wall-${layer}`, maskUnits: 'userSpaceOnUse', ...wordBox });
        const word = svgElement('text', wordAttributes, WORD);
        wallMask.append(svgElement('rect', { ...wordBox, fill: '#fff' }), word);
        defs.append(wallMask);
        const wall = svgElement('rect', { class: 'opening__wall', ...wordBox, mask: `url(#opening-wall-${layer})` });
        wall.style.setProperty('--deep', (layer / WALL_LAYERS).toFixed(3));
        walls.append(wall);
        wallWords.push({ word, share: layer / WALL_LAYERS });
      }

      const scriptSize = fontSize * 0.46;
      const lifted = svgElement('g', { class: 'opening__lift' });
      lifted.append(
        svgElement('text', { class: 'opening__dot', x: left + wordWidth, y: baseline, 'font-family': 'Bodoni Moda', 'font-weight': 500, 'font-size': fontSize }, '.'),
        svgElement('text', {
          class: 'opening__script',
          x: left + wordWidth,
          y: baseline + scriptSize * 0.98,
          'text-anchor': 'end',
          'font-family': SCRIPT_FACE,
          'font-size': scriptSize,
        }, 'by nafis')
      );
      // The letters rest in a solid colour; this veil lifts as the flight begins, and the painting is behind it.
      const veil = svgElement('rect', { class: 'opening__veil', ...wordBox });
      group.append(veil, walls, svgElement('rect', { class: 'opening__page', ...everywhere, mask: 'url(#opening-cut)' }), lifted);
      paper.append(defs, group);

      const stroke = thickestStroke(font, fontSize, wordWidth);
      const origin = { x: left + stroke.x, y: baseline - fontSize + stroke.y };
      const farthest = Math.max(
        Math.hypot(origin.x, origin.y),
        Math.hypot(width - origin.x, origin.y),
        Math.hypot(origin.x, height - origin.y),
        Math.hypot(width - origin.x, height - origin.y)
      );
      zoom = { group, origin, endScale: (farthest / Math.max(stroke.half, 2)) * 1.25 };
      depth.scene = {
        wallWords,
        lifted,
        centre: { x: left + wordWidth / 2, y: baseline - fontSize * 0.3 },
        drift: { x: wordWidth * 0.3, y: fontSize * 0.5 },
        width,
      };
      if (!depth.view) depth.view = { ...depth.scene.centre };
      update();
      look();
    }

    /**
     * The 3D of the letters. One viewpoint (where the eye is looking from) sets every wall layer: each is the word
     * scaled toward that point, so letters far from it show more wall, as real cut-outs would. The viewpoint
     * follows the cursor, drifts when the cursor rests, and squares up to the letter being flown into.
     */
    const depth = { scene: null, view: null, pointer: null, pointerAt: 0, pressed: false, press: 0, born: performance.now(), frame: 0 };

    function viewTarget(now, flight) {
      const { centre, drift } = depth.scene;
      let target;
      if (depth.pointer && now - depth.pointerAt < POINTER_REST_MS) {
        target = { x: centre.x + (depth.pointer.x - centre.x) * REACH.x, y: centre.y + (depth.pointer.y - centre.y) * REACH.y };
      } else {
        const t = now / 1000;
        target = { x: centre.x + Math.cos(t * 0.5) * drift.x, y: centre.y + Math.sin(t * 0.37) * drift.y };
      }
      const square = clamp(flight * 5); // flying in: look straight down the letter
      return { x: target.x + (zoom.origin.x - target.x) * square, y: target.y + (zoom.origin.y - target.y) * square };
    }

    function look() {
      const { scene } = depth;
      if (!scene) return;
      const now = performance.now();
      const flight = Number(stage.style.getPropertyValue('--flight')) || 0;
      if (reduceMotion) {
        depth.view = { x: scene.centre.x - scene.drift.x * 0.5, y: scene.centre.y - scene.drift.y * 0.6 };
      } else {
        const target = viewTarget(now, flight);
        depth.view.x += (target.x - depth.view.x) * VIEW_EASE;
        depth.view.y += (target.y - depth.view.y) * VIEW_EASE;
        depth.press += ((depth.pressed ? 1 : 0) - depth.press) * 0.16;
      }
      const emerged = reduceMotion ? 1 : 1 - (1 - clamp((now - depth.born) / EMERGE_MS)) ** 3;
      const reach = (DEPTH + PRESS_DEPTH * depth.press) * emerged;
      const { x, y } = depth.view;
      const about = (scale) => `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)}) translate(${(-x).toFixed(2)} ${(-y).toFixed(2)})`;
      scene.wallWords.forEach(({ word, share }) => word.setAttribute('transform', about(1 - reach * share)));
      scene.lifted.setAttribute('transform', about(1 + LIFT * emerged));
      // The painting lies deepest, so it shifts the other way a little.
      stage.style.setProperty('--look-x', (((scene.centre.x - x) / scene.width) * 100 * 0.05).toFixed(3));
      stage.style.setProperty('--look-y', (((scene.centre.y - y) / scene.width) * 100 * 0.05).toFixed(3));
    }

    /** Runs the view while the letters are on screen; rests once the flight is through them. */
    function watch() {
      if (depth.frame || reduceMotion) return;
      const tick = () => {
        depth.frame = 0;
        look();
        if (!stage.classList.contains('is-through') && !document.hidden) depth.frame = requestAnimationFrame(tick);
      };
      depth.frame = requestAnimationFrame(tick);
    }

    if (!reduceMotion) {
      stage.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return; // a finger is scrolling, not pointing
        const box = stage.getBoundingClientRect();
        depth.pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
        depth.pointerAt = performance.now();
      });
      stage.addEventListener('pointerdown', () => { depth.pressed = true; });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => stage.addEventListener(type, () => { depth.pressed = false; }));
      document.addEventListener('visibilitychange', watch);
    }

    /** How far through the opening the page has scrolled, 0 to 1. */
    function progress() {
      const travel = section.offsetHeight - window.innerHeight;
      return clamp(-section.getBoundingClientRect().top / Math.max(travel, 1));
    }

    function update() {
      if (!zoom.group) return;
      const p = progress();
      const flight = reduceMotion ? (p > 0.1 ? 1 : 0) : clamp(p / ZOOM_SHARE);
      // Scale grows exponentially, so the flight feels steady rather than slow then sudden; easing in adds a lunge.
      const scale = Math.exp(Math.log(zoom.endScale) * flight ** 1.6);
      const { x, y } = zoom.origin;
      zoom.group.setAttribute('transform', `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`);
      stage.style.setProperty('--flight', flight.toFixed(3));
      stage.classList.toggle('is-through', flight >= 0.98);
      document.documentElement.classList.toggle('is-opening-dark', flight > 0.45);
      watch();
    }

    let frame = 0;
    window.addEventListener('scroll', () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    }, { passive: true });
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 150);
    });

    // The SVG draws its type in the site's faces, so they must be loaded before the word is measured.
    const faces = ["500 40px 'Bodoni Moda'", `400 40px '${SCRIPT_FACE}'`].map((face) => document.fonts.load(face).catch(() => {}));
    Promise.all(faces).then(draw);

    if (!reduceMotion) mountTrails(stage, trailWorks, U, () => progress() < 0.04);
  }

  /** Two trails of pictures behind the cursor: paintings where it is, photographs at its mirror image. */
  function mountTrails(stage, { paintings, photographs }, U, isActive) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || !paintings.length || !photographs.length) return;
    const layer = stage.querySelector('[data-opening-trails]');
    const fact = stage.querySelector('[data-opening-fact]');
    let last = null;
    let turn = 0;

    function drop(work, x, y, hand) {
      const picture = new Image();
      picture.className = `trail trail--${hand}`;
      picture.src = U.imageUrl(work, 600);
      picture.alt = '';
      picture.style.left = `${x}px`;
      picture.style.top = `${y}px`;
      picture.style.setProperty('--tilt', `${(Math.random() - 0.5) * 14}deg`);
      layer.append(picture);
      setTimeout(() => picture.remove(), TRAIL_LIFE_MS);
    }

    stage.addEventListener('pointermove', (event) => {
      if (!isActive()) {
        last = null;
        return;
      }
      const box = stage.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      if (last && Math.hypot(x - last.x, y - last.y) < TRAIL_STEP) return;
      last = { x, y };
      turn += 1;
      drop(paintings[turn % paintings.length], x, y, 'right');
      drop(photographs[turn % photographs.length], box.width - x, y, 'left');
      fact.classList.add('is-shown');
    });
  }

  /** Builds one featured work: the picture (arriving in its own way) and its label. */
  function featureArticle({ work, reveal }, index, { U, hrefFor }) {
    const article = document.createElement('article');
    article.className = `feature feature--${reveal}${index % 2 ? ' feature--flip' : ''}`;
    article.dataset.arrive = reveal;
    const category = U.CATEGORIES.find((entry) => entry.id === work.category);
    article.innerHTML = `
      <div class="feature__media"><img alt="" loading="lazy" decoding="async"></div>
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
    article.querySelector('.eyebrow').textContent = category ? category.label : '';
    // A photograph's catalogue title names its place in a series ("Stage Light, 4 of 20"); here the series is enough.
    const caption = U.captionParts(work);
    article.querySelector('.feature__title').textContent = plain(caption.title).replace(/, \d+ of \d+$/, '');
    article.querySelector('.feature__facts').textContent = caption.meta;
    article.querySelector('.feature__link').href = hrefFor(work);
    return article;
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

  /** Drives --p on everything with data-arrive: 0 as it enters at the bottom, 1 once it is well on screen. */
  function driveReveals(root) {
    const items = [...root.querySelectorAll('[data-arrive]')];
    const update = () => {
      const screen = window.innerHeight;
      items.forEach((item) => {
        const top = item.getBoundingClientRect().top;
        const p = reduceMotion ? 1 : clamp((screen - top) / (screen * 0.7));
        item.style.setProperty('--p', p.toFixed(3));
      });
    };
    let frame = 0;
    window.addEventListener('scroll', () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function mount({ opening, features, project }, { heroWork, featureWorks, trailWorks, projectData, projectCover, hrefFor, U }) {
    if (opening && heroWork) mountOpening(opening, { heroWork, trailWorks, U });
    if (features && featureWorks.length) {
      const list = features.querySelector('[data-features]');
      featureWorks.forEach((feature, index) => list.append(featureArticle(feature, index, { U, hrefFor })));
    }
    if (project && projectData && projectCover) projectFeature(project, { project: projectData, cover: projectCover, U });
    driveReveals(document);
  }

  window.HomeReveal = { mount };
})();
