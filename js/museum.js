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
 *   js/museum.js            this file: the renderer, the shared kit, the light, the walk
 *   js/museum-outside.js    the square, the steps, the portico, the doors, the inscription
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

  const MAX_PIXEL_RATIO = 2; // sharper than this costs frames and cannot be seen in motion
  const FOLLOW_MS = 110; // how quickly the scene catches up with the scroll: long enough to smooth a wheel's steps
  const GAZE = { yaw: 0.07, pitch: 0.04, ease: 0.08 }; // radians the view turns toward the cursor, at most
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

    /** Lettering drawn on a canvas, as a sheet standing in the scene. `draw(pen)` paints it. */
    function lettering(width, height, draw) {
      const sheet = document.createElement('canvas');
      sheet.width = Math.ceil(width);
      sheet.height = Math.ceil(height);
      draw(sheet.getContext('2d'));
      return textureOf(sheet);
    }
    const letteringPlane = () => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), painted({ transparent: true, depthWrite: false }));

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

    // The building is put up by its own files, outside and in, from this one kit of materials and shapes.
    const kit = {
      THREE, scene, outside, inside, floor, colours, tile: TILE, lamplight: COLOUR.warm,
      materials, maps, lambert, painted, glowing: light, textureOf, box, sheetOf, halo, lettering, letteringPlane,
      redraw: () => wake(),
    };
    const { swingDoors, sign } = window.MuseumOutside.build(kit, { word, signSuffix });
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
