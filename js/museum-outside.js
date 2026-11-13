/**
 * The outside of the museum: the square at dusk, the steps and their lamps, the portico of Ionic columns
 * under its pediment, the front wall with its bronze doors, and the name inscribed on the frieze. Built into
 * the scene that js/museum.js sets up, from the kit of materials and shapes that file hands over. Through the
 * doors is js/museum-foyer.js.
 *
 *   const front = MuseumOutside.build(kit, { word: 'nuances', signSuffix: 'gallery' });
 *   front.swingDoors(open);   // 0 shut, 1 open
 *   front.sign;               // { plane, start, end }: the inscription's sheet, and where the wordmark sits in it
 *
 * Nothing here moves except the doors, so the shadows the building casts are worked out once (js/museum.js).
 */
(function () {
  'use strict';

  const M = window.MuseumUtils;
  const T = window.MuseumTextures;
  const { PLAN } = M;

  const SIGN_FACE = "500 {size}px 'Cinzel'"; // capitals drawn from Roman inscriptions, as a classical front carries
  const DOOR_SWING = 1.5; // radians

  function build(kit, { word, signSuffix = '' }) {
    const { THREE, scene, outside, floor, tile, lamplight, materials, maps, lambert, painted, glowing, textureOf, box, sheetOf, halo, lettering, letteringPlane } = kit;

    // ---------- shapes only the outside needs ----------

    /** A solid of revolution from a profile of [radius, height] points, standing on `y`. */
    function turned(material, profile, [x, y, z], parent = outside) {
      const points = profile.map(([radius, height]) => new THREE.Vector2(radius, height));
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(points, 40), material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }

    /**
     * A column's shaft: tapering toward the top with a slight swell, and cut with shallow vertical flutes.
     * It carries two sets of texture coordinates: one for the stone, one running foot to top for the uplight.
     */
    function flutedShaft(height, bottom, top, flutes) {
      const rings = 12;
      const perFlute = 6;
      const around = flutes * perFlute;
      const positions = [];
      const stone = [];
      const rise = [];
      const indices = [];
      for (let ring = 0; ring <= rings; ring += 1) {
        const up = ring / rings;
        const radius = bottom + (top - bottom) * up ** 1.7;
        for (let i = 0; i <= around; i += 1) {
          const scoop = Math.sin((Math.PI * (i % perFlute)) / perFlute);
          const r = radius * (1 - 0.055 * scoop);
          const angle = (i / around) * Math.PI * 2;
          positions.push(Math.cos(angle) * r, up * height, Math.sin(angle) * r);
          stone.push(i / around, (up * height) / tile.stone);
          rise.push(i / around, up);
        }
      }
      const row = around + 1;
      for (let ring = 0; ring < rings; ring += 1) {
        for (let i = 0; i < around; i += 1) {
          const a = ring * row + i;
          indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(stone, 2));
      geometry.setAttribute('uv1', new THREE.Float32BufferAttribute(rise, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    }

    // ---------- the building ----------

    function buildSquare() {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1500, 48, 24),
        painted({ map: textureOf(T.sky()), side: THREE.BackSide, fog: false, depthWrite: false })
      );
      dome.rotation.y = Math.PI * 0.7; // turns a good stretch of cloud to stand behind the building
      scene.add(dome);
      scene.fog = new THREE.Fog(T.sky.HAZE, 150, 1100); // the square fades into the haze below the skyline

      const size = 2400;
      const square = sheetOf(materials.paving, [size, size], [0, 0, 0]);
      square.geometry.attributes.uv.array.forEach((value, i, uv) => { uv[i] = value * (size / tile.paving); });
    }

    function buildSteps() {
      const { steps, cheek } = PLAN;
      // Each step is a slab reaching back to the platform, one riser taller than the step below.
      for (let i = 0; i < steps.count - 1; i += 1) {
        const depth = (steps.count - 1 - i) * steps.run;
        const height = (i + 1) * steps.rise;
        box(materials.steps, [steps.width, height, depth], [0, height / 2, steps.top + depth / 2]);
      }
      const platformDepth = 34;
      box(materials.steps, [steps.width, floor, platformDepth], [0, floor / 2, steps.top - platformDepth / 2]);

      // Low walls flank the steps; each ends in a pedestal carrying a lamp.
      const length = PLAN.frontOfSteps - steps.top + 1.6;
      const midZ = steps.top - 0.5 + length / 2;
      [-1, 1].forEach((side) => {
        const x = side * (steps.width / 2 + cheek.width / 2);
        box(materials.wall, [cheek.width, floor, length], [x, floor / 2, midZ], { tile: tile.masonry });
        box(materials.stone, [cheek.width + 0.24, 0.2, length + 0.24], [x, floor + 0.1, midZ]);
        const front = midZ + length / 2 - 1.1;
        box(materials.stone, [1.3, 0.9, 1.3], [x, floor + 0.65, front]);
        box(materials.stone, [1.5, 0.14, 1.5], [x, floor + 1.17, front]);
        lamp([x, floor + 1.24, front], 2.7, 0.3);
        pool([9, 9], [x, floor + 0.22, front], 0.3);
        pool([16, 13], [x - side * 2.5, 0.03, front + 3.5], 0.22); // and on the square beside it
      });
      pool([30, 16], [0, 0.03, PLAN.frontOfSteps + 5], 0.2); // the porch's light reaches the foot of the steps
    }

    /** A pool of lamplight lying on the ground. */
    function pool(size, at, strength) {
      return sheetOf(new THREE.MeshBasicMaterial(glowing(lamplight, strength)), size, at);
    }

    /** A lamp on a post: a bronze stem, a glowing globe, and its halo. */
    function lamp([x, y, z], height, radius) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, height, 12), materials.lampPost);
      post.position.set(x, y + height / 2, z);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), materials.lamp);
      globe.position.set(x, y + height + radius * 0.8, z);
      outside.add(post, globe);
      halo(radius * 15, [x, y + height + radius * 0.8, z]);
    }

    function buildColumns() {
      const { columns } = PLAN;
      const base = { plinth: 0.16, mouldings: 0.4 };
      const capital = { neck: 0.26, scrolls: 0.32, abacus: 0.12 };
      const capitalHeight = capital.neck + capital.scrolls + capital.abacus;
      const shaftHeight = columns.height - base.plinth - base.mouldings - capitalHeight;
      const r = columns.radius;
      const top = r * 0.84;
      const shaft = flutedShaft(shaftHeight, r, top, columns.flutes);
      const baseProfile = [[r * 1.4, 0], [r * 1.42, 0.07], [r * 1.36, 0.14], [r * 1.18, 0.17], [r * 1.12, 0.24], [r * 1.24, 0.3], [r * 1.26, 0.35], [r * 1.08, 0.4]];
      const neckProfile = [[top, 0], [top * 1.04, 0.04], [top * 1.0, 0.08], [top * 1.08, 0.12], [top * 1.3, capital.neck]];
      // An Ionic capital's scrolls: a drum lying front to back at each side, its round ends carved with a spiral.
      const scroll = new THREE.CylinderGeometry(0.31, 0.31, top * 2.3, 28);
      scroll.rotateX(Math.PI / 2);
      const scrollFaces = [materials.stone, materials.volute, materials.volute];
      const head = floor + columns.height;

      [...columns.xs.map((x) => -x), ...columns.xs].forEach((x) => {
        const at = (y) => [x, y, columns.z];
        box(materials.stone, [r * 3, base.plinth, r * 3], at(floor + base.plinth / 2));
        turned(materials.stone, baseProfile, at(floor + base.plinth));
        const column = new THREE.Mesh(shaft, materials.shaft);
        column.position.set(...at(floor + base.plinth + base.mouldings));
        outside.add(column);
        turned(materials.stone, neckProfile, at(head - capitalHeight));
        box(materials.stone, [top * 2.5, capital.scrolls * 0.8, top * 2.2], at(head - capital.abacus - capital.scrolls * 0.4));
        [-1, 1].forEach((side) => {
          const drum = new THREE.Mesh(scroll, scrollFaces);
          drum.position.set(x + side * top * 1.28, head - capital.abacus - capital.scrolls * 0.92, columns.z);
          drum.scale.x = side; // the two scrolls wind opposite ways
          outside.add(drum);
        });
        box(materials.stone, [top * 2.9, capital.abacus, top * 2.6], at(head - capital.abacus / 2));
      });
    }

    /** Everything the columns carry: architrave, frieze, cornice with its row of dentils, and the pediment. */
    function buildEntablature() {
      const { columns, entablature, pediment } = PLAN;
      const { width, depth } = entablature;
      const z = columns.z;
      let y = floor + columns.height;

      // The architrave is three bands, each standing a little proud of the one below.
      const band = entablature.architrave / 3;
      [0, 1, 2].forEach((i) => {
        box(materials.stone, [width - 0.12 + i * 0.06, band, depth - 0.16 + i * 0.08], [0, y + band * (i + 0.5), z]);
      });
      y += entablature.architrave;
      box(materials.stone, [width - 0.2, entablature.frieze, depth - 0.1], [0, y + entablature.frieze / 2, z]);
      y += entablature.frieze;

      // The cornice: a row of small blocks (dentils), then two slabs that reach out over them.
      const dentil = { size: 0.2, gap: 0.2, height: 0.22 };
      const count = Math.floor((width - 0.4) / (dentil.size + dentil.gap));
      const dentils = new THREE.InstancedMesh(new THREE.BoxGeometry(dentil.size, dentil.height, 0.24), materials.stone, count);
      const place = new THREE.Matrix4();
      const frontFace = z + (depth - 0.1) / 2;
      for (let i = 0; i < count; i += 1) {
        place.setPosition((i - (count - 1) / 2) * (dentil.size + dentil.gap), y + dentil.height / 2, frontFace + 0.12);
        dentils.setMatrixAt(i, place);
      }
      outside.add(dentils);
      box(materials.stone, [width - 0.2, dentil.height, depth - 0.1], [0, y + dentil.height / 2, z]);
      y += dentil.height;
      const corona = { width: width + 0.9, depth: depth + 0.8, height: 0.24 };
      const cyma = { width: width + 1.2, depth: depth + 1.1, height: entablature.cornice - dentil.height - corona.height };
      box(materials.stone, [corona.width, corona.height, corona.depth], [0, y + corona.height / 2, z]);
      y += corona.height;
      box(materials.stone, [cyma.width, cyma.height, cyma.depth], [0, y + cyma.height / 2, z]);
      y += cyma.height;

      // The pediment: a recessed triangle (the tympanum) under two sloping cornices.
      const half = cyma.width / 2;
      const gable = new THREE.Shape([new THREE.Vector2(-half + 0.3, 0), new THREE.Vector2(half - 0.3, 0), new THREE.Vector2(0, pediment.height - 0.08)]);
      const tympanum = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: depth - 0.1, bevelEnabled: false }), materials.wall);
      tympanum.geometry.attributes.uv.array.forEach((value, i, uv) => { uv[i] = value / tile.masonry; });
      tympanum.position.set(0, y, z - (depth - 0.1) / 2);
      outside.add(tympanum);
      const slope = Math.atan2(pediment.height, half);
      const rake = Math.hypot(half, pediment.height);
      [-1, 1].forEach((side) => {
        [[0.3, corona.depth, 0.06], [0.14, cyma.depth, 0.3]].forEach(([thickness, reach, lift]) => {
          const raking = box(materials.stone, [rake + 0.4, thickness, reach], [side * (half / 2), y + pediment.height / 2 + lift, z]);
          raking.rotation.z = -side * slope;
        });
      });
      // A wreath in the middle of the tympanum.
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.1, 12, 40), materials.stone);
      wreath.position.set(0, y + pediment.height * 0.36, frontFace + 0.02);
      outside.add(wreath);

      // The porch ceiling and the mass of the building behind.
      const eaves = floor + columns.height;
      const { wall } = PLAN;
      box(materials.wall, [wall.halfWidth * 2, 0.3, z - wall.z], [0, eaves - 0.15, (z + wall.z) / 2]);
      box(materials.wall, [wall.halfWidth * 2, y - eaves, 26], [0, (y + eaves) / 2, wall.z - 13], { tile: tile.masonry });
    }

    /** The front wall behind the columns: masonry, with the doorway and its surround, and a lamp each side. */
    function buildWall() {
      const { columns, wall, door } = PLAN;
      const masonry = { tile: tile.masonry };
      const wallZ = wall.z - wall.thickness / 2;
      const sideWidth = wall.halfWidth - door.width / 2;
      const above = columns.height - door.height;
      [-1, 1].forEach((side) => {
        box(materials.wall, [sideWidth, columns.height, wall.thickness], [side * (door.width / 2 + sideWidth / 2), floor + columns.height / 2, wallZ], masonry);
        // A flat pilaster closes each end of the wall, answering the columns.
        box(materials.stone, [1.3, columns.height - 0.3, 0.3], [side * (wall.halfWidth - 0.65), floor + (columns.height - 0.3) / 2, wall.z + 0.15]);
        // The doorway's frame.
        box(materials.stone, [0.44, door.height + 0.42, 0.3], [side * (door.width / 2 + 0.2), floor + (door.height + 0.42) / 2, wall.z + 0.12]);
        box(materials.stone, [0.26, 0.5, 0.42], [side * (door.width / 2 + 0.29), floor + door.height + 0.67, wall.z + 0.2]); // a bracket under the hood
        sconce(side * (door.width / 2 + 2.2), floor + 4.3);
      });
      box(materials.wall, [door.width, above, wall.thickness], [0, floor + door.height + above / 2, wallZ], masonry);
      box(materials.stone, [wall.halfWidth * 2, 0.7, 0.16], [0, floor + 0.35, wall.z + 0.08]); // the wall's footing
      box(materials.stone, [door.width + 0.84, 0.44, 0.34], [0, floor + door.height + 0.2, wall.z + 0.14]);
      box(materials.stone, [door.width + 0.84, 0.5, 0.2], [0, floor + door.height + 0.67, wall.z + 0.1]); // a plain band between the brackets
      box(materials.stone, [door.width + 1.5, 0.18, 0.7], [0, floor + door.height + 1.01, wall.z + 0.3]); // the hood over the door
    }

    /** A wall lamp: a small bronze bracket, a globe, and the wash of light it throws on the masonry. */
    function sconce(x, y) {
      const z = PLAN.wall.z;
      box(materials.lampPost, [0.1, 0.5, 0.34], [x, y - 0.3, z + 0.17]);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 12), materials.lamp);
      globe.position.set(x, y, z + 0.38);
      outside.add(globe);
      halo(2.6, [x, y, z + 0.4], 0.75);
      sheetOf(new THREE.MeshBasicMaterial(glowing(lamplight, 0.5)), [5.2, 7], [x, y - 0.4, z + 0.03], { flat: false });
    }

    /** Two bronze leaves, each turning on its outer edge, and the light that spills out as they open. */
    function buildDoors() {
      const { door, wall } = PLAN;
      const leafWidth = door.width / 2;
      const leaves = [-1, 1].map((side) => {
        const geometry = new THREE.BoxGeometry(leafWidth, door.height, 0.14);
        geometry.translate((-side * leafWidth) / 2, door.height / 2, 0); // so the hinge is the mesh's origin
        // The sheet is drawn with its ring at the right, where the left leaf meets the other; the right leaf mirrors it.
        const face = maps.door.clone();
        if (side > 0) {
          face.wrapS = THREE.RepeatWrapping;
          face.repeat.x = -1;
        }
        const front = lambert({ map: face });
        const leaf = new THREE.Mesh(geometry, [materials.bronze, materials.bronze, materials.bronze, materials.bronze, front, front]);
        leaf.position.set(side * leafWidth, floor, wall.z - 0.3);
        outside.add(leaf);
        return { leaf, side };
      });
      const spill = pool([6.5, 9], [0, floor + 0.02, wall.z + 3.4], 0);
      return function swing(open) {
        leaves.forEach(({ leaf, side }) => { leaf.rotation.y = -side * open * DOOR_SWING; });
        spill.material.opacity = open * 0.55;
      };
    }

    /**
     * The name on the frieze, as a museum carries it: an inscription in Roman capitals, set wide and gilded.
     * The wordmark comes first, then `signSuffix` ("gallery"), with a point between the words as inscriptions
     * divide them. Returns the sheet it is painted on, and where the wordmark's first letter starts and its
     * last ends, in the building's space: the page lands its own wordmark on that spot, and the inscription
     * takes over from it there.
     */
    function buildSign() {
      const size = 200;
      const font = SIGN_FACE.replace('{size}', size);
      const tracking = size * PLAN.sign.tracking;
      const space = signSuffix ? size * PLAN.sign.wordSpace : 0;
      const measure = document.createElement('canvas').getContext('2d');
      measure.font = font;
      const name = T.tracked(measure, word.toUpperCase(), tracking);
      const suffix = T.tracked(measure, signSuffix.toUpperCase(), tracking);
      const capHeight = measure.measureText('N').actualBoundingBoxAscent;
      const margin = Math.round(size * 0.25);
      const baseline = margin + Math.ceil(capHeight);
      // Equal margins all round, so the sheet's middle is the middle of the capitals.
      const sheet = { width: name.width + space + suffix.width + margin * 2, height: baseline + margin };
      const plane = letteringPlane();
      plane.material.map = lettering(sheet.width, sheet.height, (pen) => {
        pen.font = font;
        T.gild(pen, (inked, how) => {
          name.write(inked, how, margin, baseline);
          if (!signSuffix) return;
          inked.beginPath();
          inked.arc(margin + name.width + space / 2, baseline - capHeight / 2, size * 0.04, 0, Math.PI * 2);
          inked[how === 'fillText' ? 'fill' : 'stroke']();
          suffix.write(inked, how, margin + name.width + space, baseline);
        }, size);
      });

      const { entablature, columns, sign } = PLAN;
      const metres = sign.capHeight / capHeight; // per canvas pixel
      const friezeY = floor + columns.height + entablature.architrave + entablature.frieze / 2;
      const z = columns.z + (entablature.depth - 0.1) / 2 + 0.01;
      plane.scale.set(sheet.width * metres, sheet.height * metres, 1);
      plane.position.set(0, friezeY, z);
      outside.add(plane);

      const start = new THREE.Vector3((-sheet.width / 2 + margin) * metres, friezeY - sign.capHeight / 2, z);
      return { plane, start, end: start.clone().setX(start.x + name.width * metres) };
    }

    buildSquare();
    buildSteps();
    buildColumns();
    buildEntablature();
    buildWall();
    return { swingDoors: buildDoors(), sign: buildSign() };
  }

  window.MuseumOutside = { build };
})();
