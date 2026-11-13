/**
 * The exhibition behind the curtains: the room the walk has been heading for. Built into the scene that
 * js/museum.js sets up, from the kit of materials and shapes that file hands over.
 *
 *   const gallery = MuseumGallery.build(kit, { exhibits, wallText, coverText });
 *   gallery.view(aspect);  // the stretch of wall the walk should stop and take in
 *   gallery.fit(aspect);   // turns the catalogue to suit the screen and letters its cover
 *   gallery.repaint();     // the page's colours changed (light or dark)
 *
 * The room is the gallery page's own room (js/gallery-room.js and the "Gallery room" rules in css/styles.css),
 * rebuilt in three dimensions: the same wall and plaster, the same black float frames and white mats, the same
 * brass picture lights and the pools they throw, the same floor, and labels set in the same type. Like that
 * page, it is painted rather than lit: its light is drawn, so the pictures keep their true colours and the
 * room looks the same on every machine. Lengths the page gives in CSS are kept as they are and converted by
 * `rem` below, so a change there can be copied here number for number.
 *
 * What is in it, as in an artist's exhibition: the pictures in a row with their middles on one line, at true
 * size relative to one another; a label beside each; the wall text at the start of the row; and the catalogue
 * on a stand in the middle of the room. The walk ends on the catalogue. Its cover is the page's own colour and
 * fills the screen, so what follows on the page (the selected works) reads as the catalogue opening.
 */
(function () {
  'use strict';

  const M = window.MuseumUtils;
  const T = window.MuseumTextures;
  const { PLAN } = M;
  const HERE = document.currentScript ? document.currentScript.src : document.baseURI;
  const asset = (path) => new URL(path, HERE).href;

  const FACE = { display: "'Bodoni Moda'", text: "'Manrope'" };
  const inch = 0.0254 * PLAN.gallery.scale; // an inch of a work, as hung on this wall, in metres
  const PAGE_PX_PER_INCH = 12; // how large the gallery page draws a single work on a desktop screen
  const rem = (16 / PAGE_PX_PER_INCH) * inch; // so this is the gallery page's rem, in metres on this wall

  // Each sheet laid on the wall stands a little further off it than the last, so none flickers against another.
  const LAYER = { shade: 0.012, pool: 0.024, shadow: 0.036, type: 0.048 };
  const FRAME = {
    proud: 0.06, // how far the moulding stands off the wall
    tones: { top: '#2f2f31', right: '#19191b', bottom: '#070708', left: '#232325' }, // .room__frame's mitred sides
    gap: '#0b0b0c', // a canvas floats in a dark gap
    mat: '#f5f3ee', // a work on paper sits in a mat
  };
  const LAMP = { reach: 0.07, brass: '#c9a55c', plate: '#a9833e', strip: '#fff4dc', glow: 0xffd28c };
  const WOOD = { src: '../images/room/wood.jpg', tile: [68.75 * rem, 20.625 * rem], tint: 0x86868b }; // .room__plane: 1100 x 330px
  const PLASTER = { src: '../images/room/plaster.jpg', tile: 40 * rem }; // .room__track::after: 640px
  // Type, in the gallery page's rems (.room__kicker, .room__title, .room__rule, .room__facts, .room__notes-text).
  const TYPE = {
    px: 80, // canvas pixels to a rem
    kicker: { size: 0.72, tracking: 0.16, line: 1.6 },
    titleGap: 0.8,
    title: { tracking: -0.015, line: 1.03, ascent: 0.8 },
    rule: { width: 2.25, gap: 1.25, weight: 0.0625 },
    facts: { size: 0.88, line: 1.55, gap: 0.15 },
    body: { size: 1, line: 1.6, gap: 1.25 },
  };
  const VIEW_MARGIN = 0.6; // wall left clear at the sides of what the walk stops to look at, in all
  const LABEL = { rem: 0.075, columns: 11, title: 1.9, beside: 0.2 }; // a label's rem in metres; its width in rems; its gap from the frame
  const WALL_TEXT = { rem: 0.115, columns: 16, title: 2.6, beside: 0.6 };
  const COLOUR = {
    room: { wall: '#1d2433', ink: '#f1ece1', muted: '#b5bccb' }, // the gallery page's own, until the page hands over its colours
    wood: 0x2a1e16,
    pages: 0xe9e2d0, // the catalogue's edges
    unloaded: 0x232836, // a picture before its image arrives
  };

  function build(kit, { exhibits, wallText, coverText }) {
    const { THREE, floor, inside, colours, materials, lambert, painted, glowing, textureOf, box, sheetOf, lettering, letteringPlane, redraw } = kit;
    const within = { parent: inside };
    const standing = { flat: false, parent: inside };
    const { foyer, gallery } = PLAN;
    const height = foyer.height;
    const wide = foyer.halfWidth * 2;
    const back = foyer.back;
    const mouth = PLAN.curtain.z - 0.36; // the room starts just behind the curtains
    const depth = mouth - back;
    const midZ = back + depth / 2;
    const hangY = floor + gallery.hangLine;
    const room = () => ({ ...COLOUR.room, ...colours.room });

    /** A sheet that is laid over what is behind it and never hides anything in front. */
    const overlay = (map, options) => painted({ map, transparent: true, depthWrite: false, ...options });
    /** Light screened over the wall, as the gallery page's pools are (mix-blend-mode: screen). */
    const screened = (map) => overlay(map, { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcColorFactor });
    /** `colour` mixed toward black in sRGB, as CSS's color-mix does: `share` of it is kept. */
    const darkened = (colour, share) => {
      const { r, g, b } = new THREE.Color(colour).getRGB({}, THREE.SRGBColorSpace);
      return new THREE.Color().setRGB(r * share, g * share, b * share, THREE.SRGBColorSpace);
    };
    const loadPicture = (src, use) => new THREE.TextureLoader().load(src, (image) => {
      image.colorSpace = THREE.SRGBColorSpace;
      image.anisotropy = 4;
      use(image);
      redraw();
    });

    const local = {
      wall: painted({ map: textureOf(T.plasterWall(room().wall), { repeats: true }) }),
      sideWall: painted({ color: 0xc4c4c4 }),
      skirting: painted(),
      ceiling: painted(),
      floor: painted({ color: COLOUR.unloaded }),
      falloff: overlay(textureOf(T.ramp([[0, 'rgba(255, 240, 215, 0.09)'], [0.32, 'rgba(255, 240, 215, 0)'], [0.32, 'rgba(0, 0, 0, 0)'], [1, 'rgba(0, 0, 0, 0.23)']], 256))),
      brass: painted({ map: textureOf(T.ramp([[0, '#fbe9c0'], [0.26, '#d9b46b'], [0.58, '#a47d37'], [1, '#5e4419']], 64)) }),
      arm: painted({ color: LAMP.brass }),
      plate: painted({ color: LAMP.plate }),
      strip: painted({ color: LAMP.strip }),
      moulding: painted({ vertexColors: true, side: THREE.DoubleSide }),
      wood: lambert({ color: COLOUR.wood }),
      pages: lambert({ color: COLOUR.pages }),
    };
    const typeset = []; // every block of words on the wall, so they can be set again when the colours change
    let plaster = null;

    // ---------- the room ----------

    function buildRoom() {
      box(local.wall, [wide, height, 0.3], [0, floor + height / 2, back - 0.15], { ...within, tile: PLASTER.tile });
      sheetOf(overlay(textureOf(T.roomShade())), [wide, height], [0, floor + height / 2, back + LAYER.shade], standing);
      // The side walls are the back wall's paint a shade darker, so the room is one colour and still has corners.
      [-1, 1].forEach((side) => box(local.sideWall, [0.1, height, depth], [side * (foyer.halfWidth - 0.05), floor + height / 2, midZ], { ...within, tile: PLASTER.tile }));
      box(local.ceiling, [wide + 0.6, 0.3, depth], [0, floor + height + 0.15, midZ], within);
      box(local.skirting, [wide, 1.8 * rem, 0.03], [0, floor + 0.9 * rem, back + 0.015], within);

      const boards = sheetOf(local.floor, [wide, depth], [0, floor + 0.01, midZ], within);
      const { position, uv } = boards.geometry.attributes;
      for (let i = 0; i < uv.count; i += 1) uv.setXY(i, position.getX(i) / WOOD.tile[0], position.getY(i) / WOOD.tile[1]);
      loadPicture(asset(WOOD.src), (wood) => {
        wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
        local.floor.map = wood;
        local.floor.color.set(WOOD.tint); // .room__floor-light: the boards sit in the room's dusk
        local.floor.needsUpdate = true;
      });
      // The wall darkens the boards at its foot (.room__floor-light's first layer).
      sheetOf(overlay(textureOf(T.ramp([[0, 'rgba(0, 0, 0, 0.4)'], [1, 'rgba(0, 0, 0, 0)']]))), [wide, 1.6], [0, floor + 0.014, back + 0.8], within);

      const image = new Image();
      image.onload = () => {
        plaster = image;
        paintRoom();
        redraw();
      };
      image.src = asset(PLASTER.src);
    }

    /** The wall's paint, and what is mixed from it (.room__skirting), in the page's current colours. */
    function paintRoom() {
      const { wall } = room();
      local.wall.map.image = T.plasterWall(wall, plaster);
      local.wall.map.needsUpdate = true;
      local.sideWall.map = local.wall.map;
      local.sideWall.needsUpdate = true;
      local.skirting.color.copy(darkened(wall, 0.55));
      local.ceiling.color.copy(darkened(wall, 0.3));
    }

    // ---------- the pictures ----------

    /**
     * A moulding round a rectangle `width` by `height`: four mitred sides, each in its own tone as light from
     * above strikes it, standing `proud` of the wall. Centred on its own origin, its back on z = 0.
     */
    function mouldingOf({ width, height, border, proud }) {
      const [w, h] = [width / 2, height / 2];
      const outer = [[-w, h], [w, h], [w, -h], [-w, -h]]; // clockwise from the top left
      const inner = [[-w + border, h - border], [w - border, h - border], [w - border, -h + border], [-w + border, -h + border]];
      const positions = [];
      const tints = [];
      const quad = (corners, colour) => {
        const [a, b, c, d] = corners;
        [a, b, c, a, c, d].forEach((corner) => {
          positions.push(...corner);
          tints.push(colour.r, colour.g, colour.b);
        });
      };
      ['top', 'right', 'bottom', 'left'].forEach((side, i) => {
        const next = (i + 1) % 4;
        const face = new THREE.Color(FRAME.tones[side]);
        const at = (point, z) => [point[0], point[1], z];
        quad([at(outer[i], proud), at(outer[next], proud), at(inner[next], proud), at(inner[i], proud)], face);
        quad([at(outer[i], 0), at(outer[next], 0), at(outer[next], proud), at(outer[i], proud)], face.clone().multiplyScalar(0.55)); // its outer edge
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
      return geometry;
    }

    /**
     * A picture light (.room__lamp): a plate on the wall, an arm, and a brass shade held out over the frame with
     * a strip of light under it. `top` is the frame's top edge; `gap` is how far above it the shade hangs.
     */
    function hangLamp(x, top, gap, frameWidth) {
      const z = back + LAMP.reach;
      const shadeY = top + gap;
      const plateY = shadeY + gap * 0.62;
      const length = M.clamp(frameWidth * 0.44, 4.5 * rem, 13 * rem);
      const radius = 0.4 * rem;
      box(local.plate, [0.875 * rem, 0.625 * rem, 0.02], [x, plateY, back + 0.01], within);
      box(local.arm, [0.19 * rem, 0.19 * rem, LAMP.reach], [x, plateY, back + LAMP.reach / 2], within);
      box(local.arm, [0.19 * rem, plateY - shadeY, 0.19 * rem], [x, (plateY + shadeY) / 2, z], within);

      const shade = new THREE.CapsuleGeometry(radius, length - radius * 2, 4, 12);
      shade.rotateZ(Math.PI / 2);
      // The brass is shaded from the top of the tube to its underside, whichever way a face is turned.
      const { position, uv } = shade.attributes;
      for (let i = 0; i < uv.count; i += 1) uv.setXY(i, 0.5, (position.getY(i) + radius) / (radius * 2));
      const tube = new THREE.Mesh(shade, local.brass);
      tube.position.set(x, shadeY, z);
      inside.add(tube);

      box(local.strip, [length * 0.88, 0.19 * rem, 0.19 * rem], [x, shadeY - radius, z], within);
      sheetOf(new THREE.MeshBasicMaterial(glowing(LAMP.glow, 0.55)), [length * 1.3, 5 * rem], [x, shadeY - radius, z + 0.01], standing);
    }

    /**
     * A work on the wall as the gallery page hangs it: framed (a float frame for a canvas, a mat for a work on
     * paper), under its own lamp, in that lamp's pool, with its label beside it. The slot is the frame's.
     */
    function hangPicture(exhibit, { x, width, height: tall }) {
      const border = exhibit.framing.moulding * inch;
      const inner = exhibit.framing.inner * inch;
      const face = back + FRAME.proud;
      const top = hangY + tall / 2;

      const frame = new THREE.Mesh(mouldingOf({ width, height: tall, border, proud: FRAME.proud }), local.moulding);
      frame.position.set(x, hangY, back);
      inside.add(frame);
      sheetOf(painted({ color: exhibit.framing.paper ? FRAME.mat : FRAME.gap }), [width - border * 2, tall - border * 2], [x, hangY, face - 0.012], standing);
      const picture = sheetOf(painted({ color: COLOUR.unloaded }), [width - (border + inner) * 2, tall - (border + inner) * 2], [x, hangY, face - 0.009], standing);
      loadPicture(exhibit.src, (image) => {
        picture.material.map = image;
        picture.material.color.set(0xffffff);
        picture.material.needsUpdate = true;
      });
      sheetOf(local.falloff, [width, tall], [x, hangY, face + 0.003], standing);

      // The shadow the frame drops under its lamp (.room__frame's box-shadow).
      const margin = tall * 0.25;
      const shadow = T.frameShadow({ width, height: tall, drop: tall * 0.045, blur: tall * 0.08, margin });
      sheetOf(overlay(textureOf(shadow)), [width + margin * 2, tall + margin * 2], [x, hangY, back + LAYER.shadow], standing);

      const gap = Math.max(2.75 * rem, tall * 0.13); // --room-lamp-gap
      hangLamp(x, top, gap, width);
      // .room__pool, whose light starts 2.5rem below its top edge, at the shade.
      const pool = { width: width * 2.3 + 6 * rem, height: tall * 1.7 + gap, rem };
      sheetOf(screened(textureOf(T.pool(pool))), [pool.width, pool.height], [x, top + gap + 2.5 * rem - pool.height / 2, back + LAYER.pool], standing);
      // The lamp's light in the boards under the work (.room__glint).
      sheetOf(new THREE.MeshBasicMaterial(glowing(LAMP.glow, 0.14)), [width * 1.5, 3.4], [x, floor + 0.018, back + 1.1], within);

      setWords({ kicker: exhibit.kicker, title: exhibit.title, facts: exhibit.facts }, LABEL, { left: x + width / 2 + LABEL.beside });
    }

    // ---------- the words on the wall ----------

    /** Breaks `text` into lines no wider than `width`, measured with the pen's current font. */
    function wrap(pen, text, width) {
      const lines = [];
      let line = '';
      text.split(/\s+/).forEach((word) => {
        const longer = line ? `${line} ${word}` : word;
        if (line && pen.measureText(longer).width > width) {
          lines.push(line);
          line = word;
        } else {
          line = longer;
        }
      });
      if (line) lines.push(line);
      return lines;
    }

    /**
     * Sets a block of words as the gallery page sets a label: a small spaced heading, the title, a short rule,
     * the facts line by line, and (for the wall text) a paragraph. Returns the sheet and its height in rems.
     * `columns` is the block's width in rems, and `title` the title's size.
     */
    function typesetWords({ kicker, title, facts = [], body }, { columns, title: titleSize }) {
      const { px } = TYPE;
      const { ink, muted } = room();
      const width = columns * px;
      const measure = document.createElement('canvas').getContext('2d');
      const fonts = {
        kicker: `600 ${TYPE.kicker.size * px}px ${FACE.text}`,
        title: `500 ${titleSize * px}px ${FACE.display}`,
        facts: `500 ${TYPE.facts.size * px}px ${FACE.text}`,
        body: `500 ${TYPE.body.size * px}px ${FACE.text}`,
      };
      const tighten = (pen) => { if ('letterSpacing' in pen) pen.letterSpacing = `${TYPE.title.tracking * titleSize * px}px`; };
      const loosen = (pen) => { if ('letterSpacing' in pen) pen.letterSpacing = '0px'; };
      const steps = []; // each draws one thing; `y` runs down the sheet in rems as they are added
      let y = 0;

      if (kicker) {
        const baseline = y + TYPE.kicker.size * (TYPE.kicker.line / 2 + 0.36);
        steps.push((pen) => {
          pen.font = fonts.kicker;
          pen.fillStyle = muted;
          T.tracked(pen, kicker.toUpperCase(), TYPE.kicker.tracking * TYPE.kicker.size * px).write(pen, 'fillText', 0, baseline * px);
        });
        y += TYPE.kicker.size * TYPE.kicker.line + TYPE.titleGap;
      }

      measure.font = fonts.title;
      tighten(measure);
      wrap(measure, title, width).forEach((line) => {
        const baseline = y + titleSize * TYPE.title.ascent;
        steps.push((pen) => {
          pen.font = fonts.title;
          pen.fillStyle = ink;
          tighten(pen);
          pen.fillText(line, 0, baseline * px);
          loosen(pen);
        });
        y += titleSize * TYPE.title.line;
      });
      loosen(measure); // or the lines below would be measured tighter than they are drawn

      y += TYPE.rule.gap;
      const ruleAt = y;
      steps.push((pen) => {
        pen.fillStyle = ink;
        pen.globalAlpha = 0.5;
        pen.fillRect(0, ruleAt * px, TYPE.rule.width * px, Math.max(2, TYPE.rule.weight * px));
        pen.globalAlpha = 1;
      });
      y += TYPE.rule.weight + TYPE.rule.gap;

      const lines = (text, style, font, colour) => {
        measure.font = font;
        wrap(measure, text, width).forEach((line) => {
          const baseline = y + style.size * (style.line / 2 + 0.36);
          steps.push((pen) => {
            pen.font = font;
            pen.fillStyle = colour;
            pen.fillText(line, 0, baseline * px);
          });
          y += style.size * style.line;
        });
      };
      facts.filter(Boolean).forEach((fact, i) => {
        if (i > 0) y += TYPE.facts.gap;
        lines(String(fact), TYPE.facts, fonts.facts, ink);
      });
      if (body) {
        y += TYPE.body.gap;
        lines(body, TYPE.body, fonts.body, muted);
      }

      const tall = y + 0.2; // a little under the last line, for the tails of its letters
      return { sheet: lettering(width, tall * px, (pen) => steps.forEach((step) => step(pen))), tall };
    }

    /**
     * Puts a block of words on the wall with its middle on the pictures' line and its left edge at `left`
     * (or its right edge at `right`). `style` is LABEL or WALL_TEXT.
     */
    function setWords(content, style, { left, right }) {
      const plane = letteringPlane();
      plane.renderOrder = 1; // over the pools of light, as the page's labels are
      inside.add(plane);
      const set = () => {
        const { sheet, tall } = typesetWords(content, style);
        if (plane.material.map) plane.material.map.dispose();
        plane.material.map = sheet;
        plane.material.needsUpdate = true;
        const width = style.columns * style.rem;
        plane.scale.set(width, tall * style.rem, 1);
        plane.position.set(left === undefined ? right - width / 2 : left + width / 2, hangY, back + LAYER.type);
      };
      set();
      typeset.push(set);
    }

    // ---------- the catalogue ----------

    /**
     * The catalogue on its stand. The stand's top and the book are made one metre square and stretched to the
     * cover's size, because that size depends on the screen (see `fit`).
     */
    function buildCatalogue() {
      const { centre, facing, tilt } = M.catalogue();
      const [x, y, z] = centre;
      const lean = -(Math.PI / 2 - tilt); // turns a sheet facing the visitor to lie on the sloping top
      const along = (distance) => [x + facing[0] * distance, y + facing[1] * distance, z + facing[2] * distance];

      box(local.wood, [0.5, 0.05, 0.42], [x, floor + 0.025, z - 0.04], within);
      box(local.wood, [0.1, y - floor - 0.06, 0.1], [x, floor + (y - floor - 0.06) / 2, z - 0.04], within);

      const thickness = { top: 0.03, book: 0.022 };
      const top = new THREE.Mesh(new THREE.BoxGeometry(1, 1, thickness.top), local.wood);
      top.position.set(...along(-thickness.book - thickness.top / 2));
      // The book: its edges are paper; its cover is the page itself.
      const book = new THREE.Mesh(new THREE.BoxGeometry(1, 1, thickness.book), [local.pages, local.pages, local.pages, local.pages, materials.page, local.pages]);
      book.position.set(...along(-thickness.book / 2));
      const words = letteringPlane();
      words.position.set(...along(0.001));
      [top, book, words].forEach((part) => {
        part.rotation.x = lean;
        inside.add(part);
      });

      /** Sizes the catalogue for a screen shape, and letters its cover: one line on a wide screen, two on a tall one. */
      return function fit(aspect) {
        const { cover, visibleWidth } = M.closeUp(aspect);
        top.scale.set(cover.width + 0.14, cover.height + 0.14, 1);
        book.scale.set(cover.width, cover.height, 1);

        const lines = aspect < 1 ? coverText.title.split(/\s+[—–-]\s+/) : [coverText.title];
        const size = 150;
        const title = `500 ${size}px ${FACE.display}`;
        const note = `600 ${size * 0.2}px ${FACE.text}`;
        const measure = document.createElement('canvas').getContext('2d');
        measure.font = title;
        const widest = Math.max(...lines.map((line) => measure.measureText(line).width));
        const margin = size * 0.3;
        const leading = size * 1.12;
        const sheet = { width: widest + margin * 2, height: leading * lines.length + margin * 2 + size * 0.6 };
        if (words.material.map) words.material.map.dispose();
        words.material.map = lettering(sheet.width, sheet.height, (pen) => {
          pen.fillStyle = colours.ink;
          pen.textAlign = 'center';
          pen.font = title;
          lines.forEach((line, i) => pen.fillText(line, sheet.width / 2, margin + leading * (i + 0.78)));
          pen.font = note;
          pen.fillText(spaced(coverText.note.toUpperCase()), sheet.width / 2, margin + leading * lines.length + size * 0.42);
        });
        words.material.needsUpdate = true;
        const share = aspect < 1 ? 0.72 : 0.6; // of the screen's width, once the walk has arrived
        const metres = (visibleWidth * share) / widest;
        words.scale.set(sheet.width * metres, sheet.height * metres, 1);
      };
    }

    /** Letterspaces a line the plain way, which every browser's canvas can do: a hair space between letters. */
    const spaced = (text) => [...text].join('  ');

    buildRoom();
    paintRoom();
    const framed = ({ widthIn, heightIn, framing }) => {
      const edge = 2 * (framing.moulding + framing.inner);
      return { widthIn: widthIn + edge, heightIn: heightIn + edge };
    };
    // The wall text stands at the start of the row and each work has its label on its right. The whole
    // group, text to last label, is centred on the room, so the frames alone stand a little off its middle.
    const labelled = LABEL.beside + LABEL.columns * LABEL.rem; // a label and its gap from the frame
    const introduced = wallText ? WALL_TEXT.beside + WALL_TEXT.columns * WALL_TEXT.rem : 0;
    const hung = M.hang(exhibits.map(framed));
    const ends = hung.length ? [hung[0].x - hung[0].width / 2 - introduced, hung[hung.length - 1].x + hung[hung.length - 1].width / 2 + labelled] : [0, 0];
    const row = hung.map((slot) => ({ ...slot, x: slot.x - (ends[0] + ends[1]) / 2 }));
    exhibits.forEach((exhibit, i) => hangPicture(exhibit, row[i]));
    if (row.length && wallText) setWords(wallText, WALL_TEXT, { right: row[0].x - row[0].width / 2 - WALL_TEXT.beside });
    const fitCatalogue = buildCatalogue();
    let aspectNow = 1;

    return {
      /**
       * The stretch of wall to take in when standing before it: on a wide screen all of it, from the wall
       * text to the last label; on a tall one, the middle work and its label. `x` is its middle along the wall.
       */
      view(aspect) {
        if (!row.length) return undefined;
        const [first, last] = aspect < 1 ? Array(2).fill(row[Math.floor(row.length / 2)]) : [row[0], row[row.length - 1]];
        const left = first.x - first.width / 2 - (aspect < 1 ? 0 : introduced);
        const right = last.x + last.width / 2 + labelled;
        return { x: (left + right) / 2, width: right - left + VIEW_MARGIN };
      },
      fit(aspect) {
        aspectNow = aspect;
        fitCatalogue(aspect);
      },
      /** The page's colours changed: the wall and its words follow, and the catalogue's cover, which is the page. */
      repaint() {
        materials.page.color.set(colours.paper);
        paintRoom();
        typeset.forEach((set) => set());
        fitCatalogue(aspectNow);
      },
    };
  }

  window.MuseumGallery = { build };
})();
