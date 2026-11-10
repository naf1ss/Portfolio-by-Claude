/**
 * The home page's opening and its featured works.
 *
 *   HomeReveal.mount({ opening, features, project }, { heroWork, featureWorks, trailWorks, project, hrefFor, U })
 *
 * The opening: "nuances" is cut out of the page, and a painting shows through the letters. Scrolling flies the
 * page into one of the letters until the painting fills the screen. Before you scroll, moving the cursor leaves
 * two trails, one of paintings where the cursor is and one of photographs where its mirror image would be: two
 * hands at work, the way the artist is ambidextrous.
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

      const fontSize = Math.min((width * 0.86) / 3.55, height * 0.36); // Bodoni's "nuances" is about 3.55 em wide
      const font = `500 ${fontSize}px 'Bodoni Moda'`;
      const measure = document.createElement('canvas').getContext('2d');
      measure.font = font;
      const wordWidth = measure.measureText(WORD).width;
      const left = (width - wordWidth) / 2;
      const baseline = height * 0.47 + fontSize * 0.28;

      const mask = svgElement('mask', { id: 'opening-cut', maskUnits: 'userSpaceOnUse', x: -width, y: -height, width: width * 3, height: height * 3 });
      mask.append(
        svgElement('rect', { x: -width, y: -height, width: width * 3, height: height * 3, fill: '#fff' }),
        svgElement('text', { x: left, y: baseline, fill: '#000', 'font-family': 'Bodoni Moda', 'font-weight': 500, 'font-size': fontSize }, WORD)
      );
      const group = svgElement('g', { class: 'opening__flight' });
      group.append(
        svgElement('rect', { class: 'opening__page', x: -width, y: -height, width: width * 3, height: height * 3, mask: 'url(#opening-cut)' }),
        svgElement('text', { class: 'opening__dot', x: left + wordWidth, y: baseline, 'font-family': 'Bodoni Moda', 'font-weight': 500, 'font-size': fontSize }, '.'),
        svgElement('text', {
          class: 'opening__script',
          x: left + wordWidth,
          y: baseline + fontSize * 0.42,
          'text-anchor': 'end',
          'font-family': 'Kaushan Script',
          'font-size': fontSize * 0.34,
          transform: `rotate(-3 ${left + wordWidth} ${baseline + fontSize * 0.42})`,
        }, 'by nafis')
      );
      paper.append(svgElement('defs', {}, null), group);
      paper.firstChild.append(mask);

      const stroke = thickestStroke(font, fontSize, wordWidth);
      const origin = { x: left + stroke.x, y: baseline - fontSize + stroke.y };
      const farthest = Math.max(
        Math.hypot(origin.x, origin.y),
        Math.hypot(width - origin.x, origin.y),
        Math.hypot(origin.x, height - origin.y),
        Math.hypot(width - origin.x, height - origin.y)
      );
      zoom = { group, origin, endScale: (farthest / Math.max(stroke.half, 2)) * 1.25 };
      update();
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
    const faces = ["500 40px 'Bodoni Moda'", "400 40px 'Kaushan Script'"].map((face) => document.fonts.load(face).catch(() => {}));
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
