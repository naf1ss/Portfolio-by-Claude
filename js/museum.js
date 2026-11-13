/**
 * The museum the home page walks into, drawn in 3D on a canvas (three.js, loaded only when it is needed).
 *
 *   const museum = await Museum.create({ canvas, word, signSuffix, curtain, exhibits, wallText, coverText, colours, onFrame });
 *   museum.setProgress(0.4);   // how far through the walk, 0 to 1; the scene eases toward it
 *
 * Scrolling is the only clock: one number, 0 to 1, places the camera on its path, swings the doors and draws
 * the curtains. A frame is drawn only while something is still moving, so a page at rest costs nothing (the
 * one exception is the dust in the foyer's light, which drifts while you stand there).
 *
 * The parts:
 *   js/museum-utils.js      the floor plan, the scroll timeline, the camera's stops (pure maths)
 *   js/museum-textures.js   every surface, painted in code
 *   js/museum.js            this file: the renderer, the shared kit, the outside of the building, the light, the walk
 *   js/museum-foyer.js      the inside, up to the curtains: the foyer and the curtains themselves
 *   js/museum-gallery.js    the exhibition behind the curtains: the pictures, the labels, the catalogue
 *
 * How it is lit, cheaply. It is dusk: a cool sky light, and one low cool key light whose shadows are worked
 * out once, since the building never moves. The warmth is mostly painted on rather than computed: lamps are
 * glowing sprites, and the columns are lit from their feet by a gradient that makes the stone itself glow.
 * Only two real lamps exist, and each does two jobs: one hangs in the porch and then lights the foyer; the
 * other waits behind the doors and then lights the exhibition.
 *
 * `create` resolves to null where the scene cannot run (no WebGL 2, or the library fails to load); the page
 * then keeps its plain opening.
 */
(function () {
  'use strict';

  const M = window.MuseumUtils;
  const T = window.MuseumTextures;
  const { PLAN, TIMELINE, smoothstep, lerp, clamp } = M;
  // The library sits beside this script; resolving from the script's own address works from any page.
  const LIBRARY = new URL('vendor/three.module.min.js', document.currentScript.src).href;

  const SIGN_FACE = "500 {size}px 'Cinzel'"; // capitals drawn from Roman inscriptions, as a classical front carries
  const MAX_PIXEL_RATIO = 2; // sharper than this costs frames and cannot be seen in motion
  const FOLLOW_MS = 110; // how quickly the scene catches up with the scroll: long enough to smooth a wheel's steps
  const GAZE = { yaw: 0.07, pitch: 0.04, ease: 0.08 }; // radians the view turns toward the cursor, at most
  const DOOR_SWING = 1.5; // radians
  const SHADOW_MAP = 2048;

  // Metres of wall one sheet of each texture covers.
  const TILE = { stone: 4, masonry: 4.8, paving: 6 };

  const COLOUR = {
    stone: 0xe9e0cf, // limestone
    steps: 0xd9d0bf,
    wall: 0xd6ccba, // the masonry behind the columns, a shade deeper
    paving: 0x5a5868, // the square, in evening shade
    bronze: 0xffffff, // the doors' own texture carries their colour
    lampPost: 0x2e261d,
    lamp: 0xffe1ae,
    warm: 0xffa25a, // lamplight
  };

  /** What this browser can do: `webgl` if a WebGL 2 context can be made, `software` if no graphics card backs it. */
  function support() {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return { webgl: false, software: false };
      // Firefox names the graphics card outright; the others answer with a generic name and keep the real one
      // behind an extension (which Firefox is retiring, and warns about, so it is asked only when needed).
      let renderer = String(gl.getParameter(gl.RENDERER) || '');
      if (!renderer || /^(webkit webgl|mozilla)$/i.test(renderer)) {
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
      }
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return { webgl: true, software: /swiftshader|llvmpipe|software/i.test(renderer) };
    } catch (error) {
      return { webgl: false, software: false };
    }
  }

  async function create({ canvas, word, signSuffix = '', curtain, exhibits = [], wallText, coverText, colours, onFrame = () => {} }) {
    if (!support().webgl) return null;
    let THREE;
    let renderer;
    try {
      THREE = await import(LIBRARY);
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (error) {
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // bright lamps roll off softly instead of clipping
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false; // the building stands still: its shadows are worked out once

    const floor = PLAN.platform;
    const scene = new THREE.Scene();
    const outside = new THREE.Group();
    const inside = new THREE.Group();
    scene.add(outside, inside);
    const camera = new THREE.PerspectiveCamera(PLAN.fov.landscape, 1, 0.1, 2000);
    const surveyor = camera.clone(); // a second camera, for measuring where things fall on screen

    // ---------- the kit: textures, materials and shapes the builders share ----------

    const sharpness = Math.min(4, renderer.capabilities.getMaxAnisotropy()); // keeps the paving crisp at a slant; more costs frames on modest graphics
    /** A painted canvas as a texture. Stone and paving repeat; pictures and lettering do not. */
    function textureOf(sheet, { repeats = false } = {}) {
      const texture = new THREE.CanvasTexture(sheet);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = sharpness;
      if (repeats) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    }

    const stoneSheet = T.stone();
    const maps = {
      stone: textureOf(stoneSheet, { repeats: true }),
      masonry: textureOf(T.blocks(stoneSheet), { repeats: true }),
      paving: textureOf(T.blocks(stoneSheet, { rows: 4, perRow: 4, joint: 4, seed: 9, darkness: 0.65 }), { repeats: true }),
      volute: textureOf(T.volute(stoneSheet)),
      door: textureOf(T.bronzeDoor()),
      glow: textureOf(T.glow()),
      uplight: textureOf(T.uplight()),
    };
    maps.uplight.channel = 1; // read with the shafts' second set of coordinates, which run foot to top

    const lambert = (options) => new THREE.MeshLambertMaterial(options);
    /** Unlit and untouched by the tone mapping: for things that are painted, not lit (sky, lettering, the page). */
    const painted = (options) => new THREE.MeshBasicMaterial({ toneMapped: false, ...options });
    /** Light added on top of whatever is behind: lamps' halos and the pools they throw. */
    const light = (color, opacity = 1) => ({ map: maps.glow, color, opacity, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });

    const materials = {
      stone: lambert({ color: COLOUR.stone, map: maps.stone }),
      steps: lambert({ color: COLOUR.steps, map: maps.stone }),
      wall: lambert({ color: COLOUR.wall, map: maps.masonry }),
      paving: lambert({ color: COLOUR.paving, map: maps.paving }),
      // A column's shaft glows from its foot, as stone does with a lamp set at its base.
      shaft: lambert({ color: COLOUR.stone, map: maps.stone, emissive: COLOUR.warm, emissiveMap: maps.uplight, emissiveIntensity: 0.5 }),
      volute: lambert({ color: COLOUR.stone, map: maps.volute }),
      bronze: lambert({ color: 0x4a3420 }),
      lampPost: lambert({ color: COLOUR.lampPost }),
      lamp: painted({ color: COLOUR.lamp, fog: false }),
      // The room behind the curtains is the page itself, in the page's own colour, so the walk ends on it.
      page: painted({ color: colours.paper }),
    };

    /**
     * A box given its size and the position of its centre. Its texture is laid by where the box stands, a
     * `tile` of wall per sheet, so the stone runs on unbroken from one block to the next.
     */
    function box(material, [width, height, depth], [x, y, z], { parent = outside, tile = TILE.stone } = {}) {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const { position, uv } = geometry.attributes;
      for (let i = 0; i < uv.count; i += 1) {
        const face = i >> 2; // four corners a face, in the order +x, -x, +y, -y, +z, -z
        const at = [position.getX(i) + x, position.getY(i) + y, position.getZ(i) + z];
        const [u, v] = face < 2 ? [at[2], at[1]] : face < 4 ? [at[0], at[2]] : [at[0], at[1]];
        uv.setXY(i, u / tile, v / tile);
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }

    /** A solid of revolution from a profile of [radius, height] points, standing on `y`. */
    function turned(material, profile, [x, y, z], parent = outside) {
      const points = profile.map(([radius, height]) => new THREE.Vector2(radius, height));
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(points, 40), material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }

    /** A flat sheet lying on the ground (facing up) or standing (facing +z). */
    function sheetOf(material, [width, length], [x, y, z], { flat = true, parent = outside } = {}) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
      if (flat) mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }

    /** A lamp's halo: a glow that always faces the viewer. */
    function halo(size, [x, y, z], opacity = 0.9, parent = outside) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial(light(COLOUR.warm, opacity)));
      sprite.scale.set(size, size, 1);
      sprite.position.set(x, y, z);
      parent.add(sprite);
      return sprite;
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
          stone.push(i / around, (up * height) / TILE.stone);
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

    /** Lettering drawn on a canvas, as a sheet standing in the scene. `draw(pen)` paints it. */
    function lettering(width, height, draw) {
      const sheet = document.createElement('canvas');
      sheet.width = Math.ceil(width);
      sheet.height = Math.ceil(height);
      draw(sheet.getContext('2d'));
      return textureOf(sheet);
    }
    const letteringPlane = () => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), painted({ transparent: true, depthWrite: false }));

    // ---------- outside ----------

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
      square.geometry.attributes.uv.array.forEach((value, i, uv) => { uv[i] = value * (size / TILE.paving); });
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
        box(materials.wall, [cheek.width, floor, length], [x, floor / 2, midZ], { tile: TILE.masonry });
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
      return sheetOf(new THREE.MeshBasicMaterial(light(COLOUR.warm, strength)), size, at);
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
      tympanum.geometry.attributes.uv.array.forEach((value, i, uv) => { uv[i] = value / TILE.masonry; });
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
      box(materials.wall, [wall.halfWidth * 2, y - eaves, 26], [0, (y + eaves) / 2, wall.z - 13], { tile: TILE.masonry });
    }

    /** The front wall behind the columns: masonry, with the doorway and its surround, and a lamp each side. */
    function buildWall() {
      const { columns, wall, door } = PLAN;
      const masonry = { tile: TILE.masonry };
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
      sheetOf(new THREE.MeshBasicMaterial(light(COLOUR.warm, 0.5)), [5.2, 7], [x, y - 0.4, z + 0.03], { flat: false });
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

    // ---------- lettering ----------

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

    // ---------- light ----------

    function buildLight() {
      const evening = new THREE.HemisphereLight(0x8d9ae6, 0x4f4350, 1.5); // sky above, the square's bounce below
      // The key: the last cool light of the sky, low from the front left. Its shadows give the columns their depth.
      const key = new THREE.DirectionalLight(0xc7cfff, 1.25);
      key.position.set(-26, 30, 36);
      key.target.position.set(0, 7, 0);
      key.castShadow = true;
      key.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
      Object.assign(key.shadow.camera, { left: -24, right: 24, top: 22, bottom: -14, near: 5, far: 120 });
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.05;
      // Every lamp costs a little on every pixel, so there are only two, and one does two jobs: it hangs under
      // the porch ceiling, warming the wall and the columns' backs, until the walk passes the doors, and then
      // goes in ahead to light the foyer.
      const porch = { position: new THREE.Vector3(0, floor + 5.6, -0.5), colour: new THREE.Color(COLOUR.warm), intensity: 190 };
      const foyer = { position: new THREE.Vector3(0, floor + 7, -13), colour: new THREE.Color(0xffe2b8), intensity: 140 };
      const lamp = new THREE.PointLight(porch.colour, porch.intensity, 44, 2);
      // The other waits just inside the doors, coming up as they open, and later lights the exhibition.
      const entry = { position: new THREE.Vector3(0, floor + 4, -6.5), colour: new THREE.Color(0xffb469) };
      const show = { position: new THREE.Vector3(0, floor + 5.2, PLAN.foyer.back + 4.6), colour: new THREE.Color(0xffe6c4), intensity: 150 };
      const doorway = new THREE.PointLight(entry.colour, 0, 34, 2);
      scene.add(evening, key, key.target, lamp, doorway);

      outside.traverse((part) => {
        if (!part.isMesh || !part.material.isMeshLambertMaterial && !Array.isArray(part.material)) return;
        part.castShadow = true;
        part.receiveShadow = true;
      });
      renderer.shadowMap.needsUpdate = true;

      /**
       * `within`: 0 out in the evening, 1 in the foyer, where the sky's light does not follow. `open`: the doors.
       * `deep`: 0 in the foyer, 1 in the exhibition behind the curtains.
       */
      return function setMood(within, open, deep) {
        evening.intensity = lerp(1.5, 0.32, within);
        key.intensity = lerp(1.25, 0, within);
        doorway.position.lerpVectors(entry.position, show.position, deep);
        doorway.color.lerpColors(entry.colour, show.colour, deep);
        doorway.intensity = lerp(lerp(30, 150, open), show.intensity, deep);
        lamp.position.lerpVectors(porch.position, foyer.position, within);
        lamp.color.lerpColors(porch.colour, foyer.colour, within);
        lamp.intensity = lerp(porch.intensity, foyer.intensity, within);
      };
    }

    buildSquare();
    buildSteps();
    buildColumns();
    buildEntablature();
    buildWall();
    const swingDoors = buildDoors();
    const sign = buildSign();
    // The inside is built by its own files, from the same kit of materials and shapes.
    const kit = { THREE, floor, inside, colours, materials, maps, lambert, painted, glowing: light, textureOf, box, sheetOf, halo, lettering, letteringPlane, redraw: () => wake() };
    const foyer = window.MuseumFoyer.build(kit, { curtain });
    const gallery = window.MuseumGallery.build(kit, { exhibits, wallText, coverText });
    const setMood = buildLight();

    // ---------- the walk ----------

    let path = null;
    const state = {
      aspect: 1,
      size: { width: 0, height: 0 },
      target: 0,
      t: null, // where the scene is; null until the first frame, which jumps straight to the target
      gaze: { x: 0, y: 0, toX: 0, toY: 0 },
      last: 0,
      frame: 0,
      astir: false, // whether the last frame left something moving by itself (dust, a curtain changing colour)
    };
    const eye = new THREE.Vector3();
    const focus = new THREE.Vector3();

    /** Stands `view` where the walk is at time `t`. */
    function pose(view, t) {
      const { index, share } = M.segmentAt(path.times, t);
      const along = (index + share) / (path.times.length - 1);
      path.position.getPoint(along, eye);
      path.look.getPoint(along, focus);
      view.position.copy(eye);
      view.lookAt(focus);
    }

    function draw() {
      const { t, gaze } = state;
      pose(camera, t);
      // The cursor turns the head a little, once the wordmark has settled on the building.
      const free = smoothstep(TIMELINE.wordHandedOver, TIMELINE.wordHandedOver + 0.05, t);
      camera.rotateY(-gaze.x * GAZE.yaw * free);
      camera.rotateX(-gaze.y * GAZE.pitch * free);

      const open = smoothstep(TIMELINE.doors[0], TIMELINE.doors[1], t);
      const within = smoothstep(TIMELINE.inside[0], TIMELINE.inside[1], t);
      // The inscription comes up as the page's wordmark lands on the frieze and fades into it.
      sign.plane.material.opacity = smoothstep(TIMELINE.inscribed[0], TIMELINE.inscribed[1], t);
      swingDoors(open);
      // The second lamp leaves the doorway for the exhibition before the curtains part, so the room is lit when first seen.
      setMood(within, open, smoothstep(TIMELINE.inside[1] + 0.03, TIMELINE.curtains[0], t));
      state.astir = foyer.update({ t, within, open: smoothstep(TIMELINE.curtains[0], TIMELINE.curtains[1], t), now: state.last });
      renderer.render(scene, camera);
      onFrame(t);
    }

    /** One frame: move a share of the way to where the scroll and the cursor are, draw, and go on until settled. */
    function tick(now) {
      state.frame = 0;
      const elapsed = clamp(now - state.last, 0, 100);
      state.last = now;
      const { gaze } = state;
      if (state.t === null) state.t = state.target;
      state.t += (state.target - state.t) * (1 - Math.exp(-elapsed / FOLLOW_MS));
      if (Math.abs(state.target - state.t) < 0.0002) state.t = state.target;
      gaze.x += (gaze.toX - gaze.x) * GAZE.ease;
      gaze.y += (gaze.toY - gaze.y) * GAZE.ease;
      const settled = state.t === state.target && Math.abs(gaze.toX - gaze.x) < 0.002 && Math.abs(gaze.toY - gaze.y) < 0.002;
      draw();
      canvas.dataset.walk = state.t.toFixed(4); // where the walk is, for tests and for anyone inspecting the page
      if (!settled || state.astir) state.frame = requestAnimationFrame(tick);
    }

    function wake() {
      if (state.frame || document.hidden || !path) return;
      state.last = performance.now() - 16; // a first frame after a rest counts as one ordinary frame
      state.frame = requestAnimationFrame(tick);
    }

    /** Fits the scene to the canvas: the camera's field of view, how far back the walk starts, the lettering. */
    function resize() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      state.size = { width, height };
      state.aspect = width / height;
      renderer.setSize(width, height, false);
      [camera, surveyor].forEach((view) => {
        view.aspect = state.aspect;
        view.fov = M.fieldOfView(state.aspect);
        view.updateProjectionMatrix();
      });
      const keys = M.cameraKeys(state.aspect, gallery.view(state.aspect));
      const curve = (points) => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, 'centripetal');
      path = { times: keys.map((key) => key.t), position: curve(keys.map((key) => key.position)), look: curve(keys.map((key) => key.look)) };
      gallery.fit(state.aspect);
      if (state.t !== null) draw();
    }

    /** Where a point of the building falls on screen from the walk's first stop, in CSS pixels. */
    function onScreen(point) {
      const projected = point.clone().project(surveyor);
      return { x: ((projected.x + 1) / 2) * state.size.width, y: ((1 - projected.y) / 2) * state.size.height };
    }

    canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
    canvas.addEventListener('webglcontextrestored', () => {
      renderer.shadowMap.needsUpdate = true;
      wake();
    });
    document.addEventListener('visibilitychange', wake);
    resize();
    renderer.compile(scene, camera); // every material is made ready now, so nothing stalls mid-walk

    return {
      /** How far through the walk, 0 to 1. The scene eases there; the first call jumps. */
      setProgress(progress) {
        state.target = clamp(progress);
        wake();
      },
      /** Where the cursor is, -1 to 1 each way from the middle of the scene. */
      setGaze(x, y) {
        state.gaze.toX = clamp(x, -1, 1);
        state.gaze.toY = clamp(y, -1, 1);
        wake();
      },
      /** The page's colours changed (light or dark): the catalogue's cover is the page, so it follows. */
      setColours(next) {
        Object.assign(colours, next);
        gallery.repaint();
        wake();
      },
      /** 'red' or 'navy': the curtains dissolve to the new colour. */
      setCurtain(name) {
        foyer.setCurtain(name, performance.now());
        wake();
      },
      resize,
      /**
       * Where the wordmark on the frieze sits on screen before the walk sets off: the start of its baseline
       * and its width, in CSS pixels. The page lands its own wordmark here.
       */
      signOnScreen() {
        pose(surveyor, 0);
        surveyor.updateMatrixWorld();
        const start = onScreen(sign.start);
        return { x: start.x, y: start.y, width: onScreen(sign.end).x - start.x };
      },
    };
  }

  window.Museum = { support, create };
})();
