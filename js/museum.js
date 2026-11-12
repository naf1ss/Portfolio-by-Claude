/**
 * The museum the home page walks into, drawn in 3D on a canvas (three.js, loaded only when it is needed).
 *
 *   const museum = await Museum.create({ canvas, word, revealText, colours, onFrame });
 *   museum.setProgress(0.4);   // how far through the walk, 0 to 1; the scene eases toward it
 *
 * Scrolling is the only clock: one number, 0 to 1, places the camera on its path, swings the doors and draws
 * the curtains (the timeline and floor plan are in js/museum-utils.js). A frame is drawn only while something
 * is still moving, so a page at rest costs nothing.
 *
 * Stage 1 is a greybox: plain materials and simple light, to judge the building's proportions, the walk and
 * the timing before any detail goes in.
 *
 * `create` resolves to null where the scene cannot run (no WebGL 2, or the library fails to load); the page
 * then keeps its plain opening.
 */
(function () {
  'use strict';

  const M = window.MuseumUtils;
  const { PLAN, TIMELINE, smoothstep, lerp, clamp } = M;
  // The library sits beside this script; resolving from the script's own address works from any page.
  const LIBRARY = new URL('vendor/three.module.min.js', document.currentScript.src).href;

  const WORD_FACE = "500 {size}px 'Bodoni Moda'";
  const SIGN_INK = '#2c2a27'; // the wordmark on the frieze: letters in shadow on the stone
  const MAX_PIXEL_RATIO = 2; // sharper than this costs frames and cannot be seen in motion
  const FOLLOW_MS = 110; // how quickly the scene catches up with the scroll: long enough to smooth a wheel's steps
  const GAZE = { yaw: 0.07, pitch: 0.04, ease: 0.08 }; // radians the view turns toward the cursor, at most
  const DOOR_SWING = 1.5; // radians
  const CURTAIN_GRID = { across: 44, down: 10 };

  const GREY = {
    stone: 0xcbc7be,
    shade: 0xa9a59d, // the wall behind the columns
    steps: 0xbab6ad,
    ground: 0x56555d,
    door: 0x5d4b37,
    foyerWall: 0x8e8b85,
    foyerFloor: 0x716e6a,
    ceiling: 0x77746f,
    curtain: 0x7b1f2b,
    bench: 0x4b443c,
  };
  const SKY = ['#1b1f3d', '#4a4877', '#c98f86', '#f0b98a']; // dusk, from overhead down to the horizon

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

  async function create({ canvas, word, revealText, colours, onFrame = () => {} }) {
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

    const floor = PLAN.platform;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(PLAN.fov.landscape, 1, 0.1, 500);
    const surveyor = camera.clone(); // a second camera, for measuring where things fall on screen

    // ---------- small builders ----------

    const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
    const materials = Object.fromEntries(Object.entries(GREY).map(([name, color]) => [name, lambert(color)]));
    materials.curtain.side = THREE.DoubleSide;
    // The wall behind the curtains is the page itself: unlit, in the page's own colour, so the walk ends on it.
    materials.page = new THREE.MeshBasicMaterial({ color: colours.paper });

    /** A box given its size and the position of its centre. */
    function box(material, [width, height, depth], [x, y, z], parent = scene) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }

    /** A solid of revolution from a profile of [radius, height] points, standing on `y`. */
    function turned(material, profile, [x, y, z], parent = scene) {
      const points = profile.map(([radius, height]) => new THREE.Vector2(radius, height));
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(points, 40), material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }

    /** A column's shaft: tapering toward the top with a slight swell, and cut with shallow vertical flutes. */
    function flutedShaft(height, bottom, top, flutes) {
      const rings = 12;
      const perFlute = 6;
      const around = flutes * perFlute;
      const positions = [];
      const indices = [];
      for (let ring = 0; ring <= rings; ring += 1) {
        const up = ring / rings;
        const radius = bottom + (top - bottom) * up ** 1.7;
        for (let i = 0; i <= around; i += 1) {
          const scoop = Math.sin((Math.PI * (i % perFlute)) / perFlute);
          const r = radius * (1 - 0.055 * scoop);
          const angle = (i / around) * Math.PI * 2;
          positions.push(Math.cos(angle) * r, up * height, Math.sin(angle) * r);
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
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    }

    /** Text drawn on a canvas, as a texture. `draw(pen)` paints it; the canvas is sized first. */
    function textTexture(width, height, draw) {
      const sheet = document.createElement('canvas');
      sheet.width = Math.ceil(width);
      sheet.height = Math.ceil(height);
      draw(sheet.getContext('2d'));
      const texture = new THREE.CanvasTexture(sheet);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return texture;
    }

    const textPlane = (texture) => new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
    );

    // ---------- outside ----------

    function buildOutside() {
      const { steps, columns, entablature, pediment, wall, door } = PLAN;
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), materials.ground);
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);

      // Each step is a slab reaching back to the platform, one riser taller than the step below.
      for (let i = 0; i < steps.count - 1; i += 1) {
        const depth = (steps.count - 1 - i) * steps.run;
        const height = (i + 1) * steps.rise;
        box(materials.steps, [steps.width, height, depth], [0, height / 2, steps.top + depth / 2]);
      }
      const platformDepth = 34;
      box(materials.steps, [steps.width, floor, platformDepth], [0, floor / 2, steps.top - platformDepth / 2]);

      // Columns: plinth, moulded base, fluted shaft, capital.
      const base = { plinth: 0.16, mouldings: 0.4 };
      const capital = { echinus: 0.38, abacus: 0.32 };
      const shaftHeight = columns.height - base.plinth - base.mouldings - capital.echinus - capital.abacus;
      const r = columns.radius;
      const top = r * 0.84;
      const shaft = flutedShaft(shaftHeight, r, top, columns.flutes);
      const baseProfile = [[r * 1.4, 0], [r * 1.42, 0.07], [r * 1.36, 0.14], [r * 1.18, 0.17], [r * 1.12, 0.24], [r * 1.24, 0.3], [r * 1.26, 0.35], [r * 1.08, 0.4]];
      const capitalProfile = [[top, 0], [top * 1.03, 0.06], [top * 1.12, 0.1], [top * 1.36, 0.3], [top * 1.42, capital.echinus]];
      [...columns.xs.map((x) => -x), ...columns.xs].forEach((x) => {
        box(materials.stone, [r * 3, base.plinth, r * 3], [x, floor + base.plinth / 2, columns.z]);
        turned(materials.stone, baseProfile, [x, floor + base.plinth, columns.z]);
        const mesh = new THREE.Mesh(shaft, materials.stone);
        mesh.position.set(x, floor + base.plinth + base.mouldings, columns.z);
        scene.add(mesh);
        turned(materials.stone, capitalProfile, [x, floor + columns.height - capital.abacus - capital.echinus, columns.z]);
        box(materials.stone, [top * 3.1, capital.abacus, top * 3.1], [x, floor + columns.height - capital.abacus / 2, columns.z]);
      });

      // Entablature: architrave, frieze (which carries the wordmark), cornice; then the pediment.
      let y = floor + columns.height;
      box(materials.stone, [entablature.width, entablature.architrave, entablature.depth], [0, y + entablature.architrave / 2, columns.z]);
      y += entablature.architrave;
      box(materials.stone, [entablature.width - 0.2, entablature.frieze, entablature.depth - 0.1], [0, y + entablature.frieze / 2, columns.z]);
      y += entablature.frieze;
      const cornice = { width: entablature.width + 1, depth: entablature.depth + 0.8 };
      box(materials.stone, [cornice.width, entablature.cornice, cornice.depth], [0, y + entablature.cornice / 2, columns.z]);
      y += entablature.cornice;

      const half = cornice.width / 2;
      const gable = new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0, pediment.height)]);
      const tympanum = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: entablature.depth, bevelEnabled: false }), materials.shade);
      tympanum.position.set(0, y, columns.z - entablature.depth / 2);
      scene.add(tympanum);
      const slope = Math.atan2(pediment.height, half);
      const rake = Math.hypot(half, pediment.height);
      [-1, 1].forEach((side) => {
        const raking = box(materials.stone, [rake + 0.5, 0.42, cornice.depth], [side * (half / 2), y + pediment.height / 2 + 0.16, columns.z]);
        raking.rotation.z = -side * slope;
      });

      // The porch ceiling and the mass of the building behind.
      const eaves = floor + columns.height;
      box(materials.shade, [wall.halfWidth * 2, 0.3, columns.z - wall.z], [0, eaves - 0.15, (columns.z + wall.z) / 2]);
      box(materials.shade, [wall.halfWidth * 2, y - eaves, 26], [0, (y + eaves) / 2, wall.z - 13]);

      // The front wall, with the doorway cut in it.
      const wallZ = wall.z - wall.thickness / 2;
      const sideWidth = wall.halfWidth - door.width / 2;
      [-1, 1].forEach((side) => {
        box(materials.shade, [sideWidth, columns.height, wall.thickness], [side * (door.width / 2 + sideWidth / 2), floor + columns.height / 2, wallZ]);
      });
      const above = columns.height - door.height;
      box(materials.shade, [door.width, above, wall.thickness], [0, floor + door.height + above / 2, wallZ]);
      // A plain surround to the doorway.
      const surround = 0.38;
      [-1, 1].forEach((side) => {
        box(materials.stone, [surround, door.height + surround, 0.24], [side * (door.width / 2 + surround / 2), floor + (door.height + surround) / 2, wall.z + 0.1]);
      });
      box(materials.stone, [door.width + surround * 2 + 0.5, surround, 0.4], [0, floor + door.height + surround / 2, wall.z + 0.16]);
    }

    /** Two leaves, each turning on its outer edge; they open inward. */
    function buildDoors() {
      const { door, wall } = PLAN;
      const leafWidth = door.width / 2;
      return [-1, 1].map((side) => {
        const geometry = new THREE.BoxGeometry(leafWidth, door.height, 0.14);
        geometry.translate((-side * leafWidth) / 2, door.height / 2, 0); // so the hinge is the mesh's origin
        const leaf = new THREE.Mesh(geometry, materials.door);
        leaf.position.set(side * leafWidth, floor, wall.z - 0.3);
        scene.add(leaf);
        return { leaf, side };
      });
    }

    // ---------- inside ----------

    function buildInside() {
      const { foyer, wall, proscenium } = PLAN;
      const front = wall.z - wall.thickness;
      const length = front - foyer.back;
      const midZ = (front + foyer.back) / 2;
      const midY = floor + foyer.height / 2;
      [-1, 1].forEach((side) => {
        box(materials.foyerWall, [0.3, foyer.height, length], [side * (foyer.halfWidth + 0.15), midY, midZ]);
        // The piers either side of the opening the curtains hang in.
        const pier = foyer.halfWidth - proscenium.width / 2;
        box(materials.foyerWall, [pier, foyer.height, proscenium.thickness], [side * (proscenium.width / 2 + pier / 2), midY, proscenium.z]);
        box(materials.bench, [2.6, 0.45, 0.6], [side * 4.7, floor + 0.225, -11]);
      });
      const header = foyer.height - proscenium.height;
      box(materials.foyerWall, [proscenium.width, header, proscenium.thickness], [0, floor + proscenium.height + header / 2, proscenium.z]);
      box(materials.ceiling, [foyer.halfWidth * 2 + 0.6, 0.3, length], [0, floor + foyer.height + 0.15, midZ]);

      const boards = new THREE.Mesh(new THREE.PlaneGeometry(foyer.halfWidth * 2, length), materials.foyerFloor);
      boards.rotation.x = -Math.PI / 2;
      boards.position.set(0, floor + 0.01, midZ);
      scene.add(boards);

      const back = new THREE.Mesh(new THREE.PlaneGeometry(foyer.halfWidth * 2, foyer.height), materials.page);
      back.position.set(0, midY, foyer.back);
      scene.add(back);
    }

    /** Two curtains as grids of points, re-hung each time `open` changes. */
    function buildCurtains() {
      const { across, down } = CURTAIN_GRID;
      const indices = [];
      const row = across + 1;
      for (let j = 0; j < down; j += 1) {
        for (let i = 0; i < across; i += 1) {
          const a = j * row + i;
          indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
        }
      }
      const panels = [-1, 1].map((side) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(row * (down + 1) * 3), 3));
        geometry.setIndex(indices);
        scene.add(new THREE.Mesh(geometry, materials.curtain));
        return { geometry, side };
      });

      let hung = -1;
      return function hang(open) {
        if (Math.abs(open - hung) < 0.0005) return;
        hung = open;
        const { width, height, z } = PLAN.curtain;
        panels.forEach(({ geometry, side }) => {
          const position = geometry.attributes.position;
          for (let j = 0; j <= down; j += 1) {
            for (let i = 0; i <= across; i += 1) {
              const point = M.curtainPoint(i / across, j / down, open);
              position.setXYZ(j * row + i, side * (width - point.x), floor + height * (1 - j / down), z + point.z);
            }
          }
          position.needsUpdate = true;
          geometry.computeVertexNormals();
        });
      };
    }

    // ---------- lettering ----------

    /**
     * The wordmark on the frieze. Returns where its first letter starts and its last ends, in the building's
     * space, so the page can fly its own wordmark onto exactly this spot.
     */
    function buildSign() {
      const size = 220;
      const font = WORD_FACE.replace('{size}', size);
      const measure = document.createElement('canvas').getContext('2d');
      measure.font = font;
      const wordWidth = measure.measureText(word).width;
      const margin = Math.round(size * 0.25);
      const baseline = Math.round(size * 1.1);
      const sheet = { width: wordWidth + measure.measureText('.').width + margin * 2, height: size * 1.5 };
      const texture = textTexture(sheet.width, sheet.height, (pen) => {
        pen.font = font;
        pen.fillStyle = SIGN_INK;
        pen.fillText(word, margin, baseline);
        pen.fillText('.', margin + wordWidth, baseline);
      });

      const { entablature, columns, sign } = PLAN;
      const metres = sign.width / wordWidth; // per canvas pixel
      const friezeY = floor + columns.height + entablature.architrave + entablature.frieze / 2;
      const middleOfLetters = baseline - size * 0.23; // lowercase without ascenders: centre on the x-height
      const plane = textPlane(texture);
      plane.scale.set(sheet.width * metres, sheet.height * metres, 1);
      const z = columns.z + (entablature.depth - 0.1) / 2 + 0.01;
      const y = friezeY - (sheet.height / 2 - middleOfLetters) * metres;
      plane.position.set(0, y, z);
      scene.add(plane);

      const start = new THREE.Vector3((-sheet.width / 2 + margin) * metres, y + (sheet.height / 2 - baseline) * metres, z);
      return { start, end: start.clone().setX(start.x + sign.width) };
    }

    /** "Nafis — Selected Works" on the back wall: one line on a wide screen, two on a tall one. */
    function buildReveal() {
      const plane = textPlane(null);
      plane.position.set(0, floor + PLAN.eye, PLAN.foyer.back + 0.01);
      scene.add(plane);
      return function write(aspect, ink) {
        const lines = aspect < 1 ? revealText.split(/\s+[—–-]\s+/) : [revealText];
        const size = 150;
        const font = WORD_FACE.replace('{size}', size);
        const measure = document.createElement('canvas').getContext('2d');
        measure.font = font;
        const widest = Math.max(...lines.map((line) => measure.measureText(line).width));
        const margin = size * 0.3;
        const leading = size * 1.12;
        const sheet = { width: widest + margin * 2, height: leading * lines.length + margin * 2 };
        if (plane.material.map) plane.material.map.dispose();
        plane.material.map = textTexture(sheet.width, sheet.height, (pen) => {
          pen.font = font;
          pen.fillStyle = ink;
          pen.textAlign = 'center';
          lines.forEach((line, i) => pen.fillText(line, sheet.width / 2, margin + leading * (i + 0.78)));
        });
        plane.material.needsUpdate = true;
        const share = aspect < 1 ? 0.72 : 0.6; // of the screen's width, once the walk has arrived
        const metres = (M.arrival(aspect).visibleWidth * share) / widest;
        plane.scale.set(sheet.width * metres, sheet.height * metres, 1);
      };
    }

    // ---------- light and sky ----------

    function buildLight() {
      const sky = document.createElement('canvas');
      sky.width = 4;
      sky.height = 256;
      const pen = sky.getContext('2d');
      const gradient = pen.createLinearGradient(0, 0, 0, sky.height);
      SKY.forEach((color, i) => gradient.addColorStop([0, 0.42, 0.62, 0.74][i], color));
      pen.fillStyle = gradient;
      pen.fillRect(0, 0, sky.width, sky.height);
      scene.background = new THREE.CanvasTexture(sky);
      scene.background.colorSpace = THREE.SRGBColorSpace;

      const evening = new THREE.HemisphereLight(0xaab4e0, 0x55505a, 1.1);
      const sun = new THREE.DirectionalLight(0xffd2a8, 1.6); // low, from the front left
      sun.position.set(-18, 14, 26);
      const doorway = new THREE.PointLight(0xffb469, 140, 34, 2);
      doorway.position.set(0, floor + 4, -6.5);
      const stage = new THREE.PointLight(0xffe2b8, 190, 44, 2);
      stage.position.set(0, floor + 7, -14);
      scene.add(evening, sun, doorway, stage);
      /** `inside`: 0 out in the evening, 1 in the foyer, where the daylight does not follow. */
      return function setMood(inside) {
        evening.intensity = lerp(1.1, 0.32, inside);
        sun.intensity = lerp(1.6, 0, inside);
      };
    }

    buildOutside();
    buildInside();
    const doors = buildDoors();
    const hangCurtains = buildCurtains();
    const sign = buildSign();
    const writeReveal = buildReveal();
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

      const swing = smoothstep(TIMELINE.doors[0], TIMELINE.doors[1], t) * DOOR_SWING;
      doors.forEach(({ leaf, side }) => { leaf.rotation.y = -side * swing; });
      hangCurtains(smoothstep(TIMELINE.curtains[0], TIMELINE.curtains[1], t));
      setMood(smoothstep(TIMELINE.inside[0], TIMELINE.inside[1], t));
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
      if (!settled) state.frame = requestAnimationFrame(tick);
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
      const keys = M.cameraKeys(state.aspect);
      const curve = (points) => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, 'centripetal');
      path = { times: keys.map((key) => key.t), position: curve(keys.map((key) => key.position)), look: curve(keys.map((key) => key.look)) };
      writeReveal(state.aspect, colours.ink);
      if (state.t !== null) draw();
    }

    /** Where a point of the building falls on screen from the walk's first stop, in CSS pixels. */
    function onScreen(point) {
      const projected = point.clone().project(surveyor);
      return { x: ((projected.x + 1) / 2) * state.size.width, y: ((1 - projected.y) / 2) * state.size.height };
    }

    canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
    canvas.addEventListener('webglcontextrestored', wake);
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
      /** The page's colours changed (light or dark): the back wall and its lettering follow. */
      setColours(next) {
        Object.assign(colours, next);
        materials.page.color.set(colours.paper);
        writeReveal(state.aspect, colours.ink);
        if (state.t !== null) draw();
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
