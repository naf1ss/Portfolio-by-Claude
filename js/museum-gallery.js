/**
 * The exhibition behind the curtains: the room the walk has been heading for. Built into the scene that
 * js/museum.js sets up, from the kit of materials and shapes that file hands over.
 *
 *   const gallery = MuseumGallery.build(kit, { exhibits, wallText, coverText });
 *   gallery.fit(aspect);   // turns the catalogue to suit the screen and letters its cover
 *
 * What is in it, as in an artist's exhibition:
 *   - the pictures, hung in a row on a navy wall with their middles on one line, each in a gilt frame under
 *     its own picture light, at true size relative to one another;
 *   - a label beside each (title, year, medium);
 *   - the wall text at the start of the row: the exhibition's title and a line about it;
 *   - the catalogue, on a stand in the middle of the room.
 *
 * The walk ends on the catalogue. Its cover is the page's own colour and fills the screen, so what follows on
 * the page (the selected works) reads as the catalogue opening.
 *
 * The pictures are shown unlit, in their true colours: stage lighting must not repaint an artist's work.
 */
(function () {
  'use strict';

  const M = window.MuseumUtils;
  const T = window.MuseumTextures;
  const { PLAN } = M;

  const FACE = { display: "'Bodoni Moda'", text: "'Manrope'" };
  const TILE = { planks: 2.4 }; // metres of floor one sheet of boards covers
  const FRAME = { width: 0.07, depth: 0.09 };
  const LABEL = { width: 0.42, height: 0.24, beside: 0.26, above: 1.42 }; // the card, its gap from the frame, its middle's height above the floor
  const WALL_TEXT = { width: 2.0, beside: 0.95 }; // the block's width, and its gap from the first picture
  const COLOUR = {
    wall: 0x2a3350, // the gallery page's navy (#1d2433), as a painted wall under light
    lettering: '#f1ece1', // the gallery page's own ink, for words set straight on the wall
    card: '#f4f0e6',
    cardInk: '#1c1b19',
    floor: 0x6a4a33,
    ceiling: 0x1a1c24,
    gilt: 0xb9975a,
    wood: 0x2a1e16,
    pages: 0xe9e2d0, // the catalogue's edges
    unloaded: 0x232836, // a picture before its image arrives
    warm: 0xffc98a,
  };

  function build(kit, { exhibits, wallText, coverText }) {
    const { THREE, floor, inside, colours, materials, lambert, painted, glowing, textureOf, box, sheetOf, lettering, letteringPlane, redraw } = kit;
    const within = { parent: inside };
    const { foyer, gallery } = PLAN;
    const height = foyer.height;
    const back = foyer.back;
    const mouth = PLAN.curtain.z - 0.36; // the room starts just behind the curtains
    const depth = mouth - back;
    const midZ = back + depth / 2;
    const hangY = floor + gallery.hangLine;

    const local = {
      wall: lambert({ color: COLOUR.wall, map: kit.maps.stone }),
      floor: new THREE.MeshPhongMaterial({ color: COLOUR.floor, map: textureOf(T.planks(), { repeats: true }), shininess: 40, specular: 0x3a2c20 }),
      ceiling: lambert({ color: COLOUR.ceiling }),
      gilt: lambert({ color: COLOUR.gilt, emissive: 0x2a1f0a }),
      wood: lambert({ color: COLOUR.wood }),
      pages: lambert({ color: COLOUR.pages }),
    };

    // ---------- the room ----------

    function buildRoom() {
      box(local.wall, [foyer.halfWidth * 2, height, 0.3], [0, floor + height / 2, back - 0.15], within);
      box(local.ceiling, [foyer.halfWidth * 2 + 0.6, 0.3, depth], [0, floor + height + 0.15, midZ], within);
      const boards = sheetOf(local.floor, [foyer.halfWidth * 2, depth], [0, floor + 0.01, midZ], within);
      const { position, uv } = boards.geometry.attributes;
      for (let i = 0; i < uv.count; i += 1) uv.setXY(i, position.getX(i) / TILE.planks, position.getY(i) / TILE.planks);
      // A skirting along the foot of the far wall.
      box(local.wood, [foyer.halfWidth * 2, 0.16, 0.05], [0, floor + 0.08, back + 0.025], within);
    }

    // ---------- the pictures ----------

    /** A picture on the wall: its image, a gilt frame, a picture light over it, and a label beside it. */
    function hangPicture(exhibit, { x, width, height: tall }) {
      const z = back + 0.07;
      const picture = new THREE.Mesh(new THREE.PlaneGeometry(width, tall), painted({ color: COLOUR.unloaded }));
      picture.position.set(x, hangY, z);
      inside.add(picture);
      new THREE.TextureLoader().load(exhibit.src, (image) => {
        image.colorSpace = THREE.SRGBColorSpace;
        image.anisotropy = 4;
        picture.material.map = image;
        picture.material.color.set(0xffffff);
        picture.material.needsUpdate = true;
        redraw();
      });

      const { width: rail, depth: proud } = FRAME;
      [-1, 1].forEach((side) => {
        box(local.gilt, [rail, tall + rail * 2, proud], [x + side * (width + rail) / 2, hangY, back + proud / 2], within);
        box(local.gilt, [width, rail, proud], [x, hangY + side * (tall + rail) / 2, back + proud / 2], within);
      });

      // The picture light: a brass bar held out over the frame, and the wash it throws down the wall.
      const top = hangY + tall / 2;
      box(local.gilt, [Math.min(width * 0.5, 1.1), 0.045, 0.07], [x, top + 0.24, back + 0.3], within);
      box(local.gilt, [0.03, 0.03, 0.3], [x, top + 0.24, back + 0.15], within);
      sheetOf(new THREE.MeshBasicMaterial(glowing(COLOUR.warm, 0.3)), [width * 1.7, tall * 2 + 1.4], [x, hangY + 0.15, back + 0.012], { flat: false, parent: inside });

      const label = letteringPlane();
      label.material.map = labelCard(exhibit);
      label.scale.set(LABEL.width, LABEL.height, 1);
      label.position.set(x + width / 2 + rail + LABEL.beside + LABEL.width / 2, floor + LABEL.above, back + 0.015);
      inside.add(label);
    }

    /** A label as galleries set them: the title, then the year and the medium, on a small card. */
    function labelCard({ title, year, medium }) {
      const size = { width: 700, height: 400 };
      return lettering(size.width, size.height, (pen) => {
        pen.fillStyle = COLOUR.card;
        pen.fillRect(0, 0, size.width, size.height);
        pen.fillStyle = COLOUR.cardInk;
        pen.textBaseline = 'alphabetic';
        pen.font = `600 58px ${FACE.display}`;
        const lines = wrap(pen, title, size.width - 100);
        lines.forEach((line, i) => pen.fillText(line, 50, 110 + i * 68));
        pen.font = `500 38px ${FACE.text}`;
        const below = 110 + lines.length * 68 + 4;
        pen.fillText(String(year), 50, below);
        wrap(pen, medium, size.width - 100).forEach((line, i) => pen.fillText(line, 50, below + 56 + i * 50));
      });
    }

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

    /** The words at the start of the row, set straight on the wall: the title, a rule, and a line about the show. */
    function buildWallText(leftEdge) {
      const size = { width: 1000, height: 820 };
      const plane = letteringPlane();
      plane.material.map = lettering(size.width, size.height, (pen) => {
        pen.fillStyle = COLOUR.lettering;
        pen.font = `500 170px ${FACE.display}`;
        pen.fillText(wallText.title, 0, 190);
        pen.font = `italic 500 104px ${FACE.display}`;
        pen.fillText(wallText.subtitle, 0, 330);
        pen.fillRect(0, 410, 150, 4);
        pen.font = `500 50px ${FACE.text}`;
        wrap(pen, wallText.body, size.width - 40).forEach((line, i) => pen.fillText(line, 0, 520 + i * 76));
      });
      const metres = WALL_TEXT.width / size.width;
      plane.scale.set(WALL_TEXT.width, size.height * metres, 1);
      // Its title sits a little above the pictures' line, as wall text does: read first, at a glance.
      plane.position.set(leftEdge - WALL_TEXT.beside - WALL_TEXT.width / 2, hangY + 0.08, back + 0.015);
      inside.add(plane);
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
    const row = M.hang(exhibits);
    exhibits.forEach((exhibit, i) => hangPicture(exhibit, row[i]));
    if (row.length) buildWallText(row[0].x - row[0].width / 2);
    const fitCatalogue = buildCatalogue();
    let aspectNow = 1;

    return {
      fit(aspect) {
        aspectNow = aspect;
        fitCatalogue(aspect);
      },
      /** The page's colours changed: the catalogue's cover is the page, so it follows. */
      repaint() {
        materials.page.color.set(colours.paper);
        fitCatalogue(aspectNow);
      },
    };
  }

  window.MuseumGallery = { build };
})();
