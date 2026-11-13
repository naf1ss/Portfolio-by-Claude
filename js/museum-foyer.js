/**
 * The inside of the museum up to the curtains: the foyer, and the velvet curtains at its far end. Built into
 * the scene that js/museum.js sets up; that file hands over a kit of shared materials and shapes. What is
 * behind the curtains is js/museum-gallery.js.
 *
 *   const foyer = MuseumFoyer.build(kit, { curtain: 'red' });
 *   foyer.update({ t, open, within, now });   // each frame; returns true while something here still moves
 *
 * The room: navy walls over a limestone dado, pilasters and a cornice, a floor of light and dark marble, a
 * coffered ceiling, wall lamps, benches and a carpet leading to the curtains. Two lamps on the ceiling throw
 * visible shafts of light at the curtains, with dust drifting in them.
 *
 * A rule this file keeps: no two surfaces lie in exactly the same plane where both can be seen. Where they do,
 * the graphics card cannot tell which is in front and the two flicker through each other. So a frame stands a
 * little proud of the wall it is on, rather than flush with it.
 */
(function () {
  'use strict';

  const M = window.MuseumUtils;
  const T = window.MuseumTextures;
  const { PLAN, TIMELINE, lerp, clamp } = M;

  const CURTAIN_GRID = { across: 96, down: 12 }; // fine enough across for each fold to curve
  const CURTAIN_COLOURS = { red: 0x7f1424, navy: 0x263a75 }; // theatre red; and a velvet in the site's navy
  const BLEND_MS = 600; // a change of curtain colour dissolves, it does not snap
  const TILE = { marble: 4.8, coffers: 2.8, velvet: 1.4 }; // metres one sheet of each texture covers
  const DUST = { motes: 150, size: 0.05 };
  const COLOUR = {
    wall: 0x384769, // the site's gallery navy, as painted plaster under lamplight
    marble: 0xa89f93, // the floor's own tint: a dim room, not a showroom
    ceiling: 0x8a8378,
    gold: 0xc9a455,
    leather: 0x3b2a22,
    wood: 0x241a14,
    warm: 0xffa25a,
    beam: 0xffdcae,
  };

  function build(kit, { curtain = 'red' }) {
    const { THREE, floor, inside, materials, maps, lambert, painted, glowing, textureOf, box, sheetOf, halo } = kit;
    const { foyer, wall, proscenium } = PLAN;
    const within = { parent: inside };
    const height = foyer.height;
    const front = wall.z - wall.thickness; // the inner face of the front wall
    const hall = { length: front - proscenium.z, midZ: (front + proscenium.z) / 2 }; // the foyer proper, door to curtains
    const whole = { length: front - foyer.back, midZ: (front + foyer.back) / 2 };

    const cloth = new THREE.Color(CURTAIN_COLOURS[curtain] || CURTAIN_COLOURS.red);
    const velvetMap = textureOf(T.velvet(), { repeats: true });
    const local = {
      wall: lambert({ color: COLOUR.wall, map: maps.stone }),
      ceiling: lambert({ color: COLOUR.ceiling, map: textureOf(T.coffers(), { repeats: true }) }),
      // Polished stone: the lamps glint on it, and the glints slide as the walk moves.
      marble: new THREE.MeshPhongMaterial({ color: COLOUR.marble, map: textureOf(T.checker(), { repeats: true }), shininess: 80, specular: 0x5c5246 }),
      velvet: velvet(lambert({ color: cloth, map: velvetMap, side: THREE.DoubleSide })),
      carpet: lambert({ color: cloth, map: textureOf(T.runner(), { repeats: true }) }),
      gold: lambert({ color: COLOUR.gold, emissive: 0x3d2c0c }),
      leather: lambert({ color: COLOUR.leather }),
      wood: lambert({ color: COLOUR.wood }),
      lamp: painted({ color: 0xffe1ae }),
      fringe: painted({ map: textureOf(T.fringe(), { repeats: true }), transparent: true, side: THREE.DoubleSide }),
    };

    /**
     * Makes a cloth material catch the light the way velvet does: brightest where the surface turns away from
     * the eye, at the edge of each fold. One line added to the standard shading.
     */
    function velvet(material) {
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          'outgoingLight += outgoingLight * pow(1.0 - abs(dot(geometryNormal, geometryViewDir)), 2.2) * 1.1;\n#include <opaque_fragment>'
        );
      };
      return material;
    }

    /** Lays a flat sheet's texture by its size, `tile` metres a sheet, centred so the pattern is symmetrical. */
    function tiled(mesh, tile) {
      const { position, uv } = mesh.geometry.attributes;
      for (let i = 0; i < uv.count; i += 1) uv.setXY(i, position.getX(i) / tile, position.getY(i) / tile);
      return mesh;
    }

    // ---------- the room ----------

    function buildRoom() {
      const half = foyer.halfWidth;
      const pilasterZs = [-6.2, -10.6, -15];
      const lampZs = [-8.4, -12.8];
      [-1, 1].forEach((side) => {
        const face = side * half; // the wall's inner face
        box(local.wall, [0.3, height, whole.length], [face + side * 0.15, floor + height / 2, whole.midZ], within);
        // A limestone dado along the foot of the wall, with its capping.
        box(materials.stone, [0.12, 1.15, hall.length], [face - side * 0.06, floor + 0.575, hall.midZ], within);
        box(materials.stone, [0.2, 0.08, hall.length], [face - side * 0.1, floor + 1.19, hall.midZ], within);
        // A cornice where the wall meets the ceiling, and a gilt rail a little below it.
        box(materials.stone, [0.5, 0.45, hall.length], [face - side * 0.25, floor + height - 0.225, hall.midZ], within);
        box(local.gold, [0.05, 0.05, hall.length], [face - side * 0.025, floor + height - 0.8, hall.midZ], within);
        pilasterZs.forEach((z) => {
          box(materials.stone, [0.22, height - 0.45, 0.8], [face - side * 0.11, floor + (height - 0.45) / 2, z], within);
          box(materials.stone, [0.34, 0.3, 0.98], [face - side * 0.17, floor + height - 0.6, z], within);
          box(materials.stone, [0.3, 0.26, 0.94], [face - side * 0.15, floor + 1.32, z], within);
        });
        lampZs.forEach((z) => {
          wallLamp(side, face, z);
          bench(side * (half - 0.75), z);
        });
      });

      box(local.ceiling, [half * 2 + 0.6, 0.3, hall.length], [0, floor + height + 0.15, hall.midZ], { ...within, tile: TILE.coffers });
      tiled(sheetOf(local.marble, [half * 2, hall.length], [0, floor + 0.01, hall.midZ], within), TILE.marble);
      // A carpet from the doors to the curtains. It takes the curtains' colour.
      const carpet = sheetOf(local.carpet, [2.6, hall.length - 1.6], [0, floor + 0.02, hall.midZ - 0.2], within);
      carpet.geometry.attributes.uv.array.forEach((value, i, uv) => { if (i % 2) uv[i] = value * 6; });
    }

    /** A lamp on the wall: a bronze bracket, a globe, its halo, and the wash of light it throws on the plaster. */
    function wallLamp(side, face, z) {
      const y = floor + 4.4;
      box(local.wood, [0.3, 0.46, 0.1], [face - side * 0.15, y - 0.3, z], within);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), local.lamp);
      globe.position.set(face - side * 0.34, y, z);
      inside.add(globe);
      halo(2.2, [face - side * 0.36, y, z], 0.7, inside);
      const wash = sheetOf(new THREE.MeshBasicMaterial(glowing(COLOUR.warm, 0.42)), [5, 7], [face - side * 0.02, y - 0.3, z], { flat: false, parent: inside });
      wash.rotation.y = -side * Math.PI / 2; // turned to lie on the side wall, facing the room
    }

    /** A bench: a leather seat on a dark wooden base. */
    function bench(x, z) {
      box(local.wood, [0.5, 0.36, 2.3], [x, floor + 0.18, z], within);
      box(local.leather, [0.62, 0.14, 2.6], [x, floor + 0.43, z], within);
    }

    // ---------- the opening the curtains hang in ----------

    function buildProscenium() {
      const half = foyer.halfWidth;
      const opening = proscenium.width / 2;
      const pier = half - opening;
      const header = height - proscenium.height;
      const proud = 0.03; // the frame's inner faces stand this far into the opening, clear of the wall's own
      const frame = { width: 0.5 + proud, depth: 0.7 };
      [-1, 1].forEach((side) => {
        box(local.wall, [pier, height, proscenium.thickness], [side * (opening + pier / 2), floor + height / 2, proscenium.z], within);
        // A limestone frame round the opening, with a gilt bead on its inner edge.
        box(materials.stone, [frame.width, proscenium.height + 0.5, frame.depth], [side * (opening - proud + frame.width / 2), floor + (proscenium.height + 0.5) / 2, proscenium.z + 0.1], within);
        box(local.gold, [0.05, proscenium.height - proud, 0.06], [side * (opening - proud - 0.025), floor + (proscenium.height - proud) / 2, proscenium.z + 0.46], within);
        pierPanel(side, opening + 0.5 + (pier - 0.5) / 2, pier - 1.3);
      });
      box(local.wall, [proscenium.width, header, proscenium.thickness], [0, floor + proscenium.height + header / 2, proscenium.z], within);
      box(materials.stone, [proscenium.width + 1, frame.width, frame.depth], [0, floor + proscenium.height - proud + frame.width / 2, proscenium.z + 0.1], within);
      box(materials.stone, [proscenium.width + 1.6, 0.2, 0.95], [0, floor + proscenium.height + 0.6, proscenium.z + 0.2], within);
      box(local.gold, [proscenium.width - proud * 2, 0.05, 0.06], [0, floor + proscenium.height - proud - 0.025, proscenium.z + 0.46], within);
    }

    /** On the wall each side of the opening: a tall panel outlined in gilt moulding, with a lamp in it. */
    function pierPanel(side, centre, width) {
      const z = proscenium.z + proscenium.thickness / 2 + 0.02;
      const x = side * centre;
      const bottom = floor + 1.7;
      const top = floor + 6.3;
      const bead = 0.05;
      [-1, 1].forEach((edge) => box(local.gold, [bead, top - bottom, bead], [x + edge * width / 2, (top + bottom) / 2, z], within));
      [bottom, top].forEach((y) => box(local.gold, [width + bead, bead, bead], [x, y, z], within));
      const y = floor + 4.3;
      box(local.wood, [0.1, 0.46, 0.3], [x, y - 0.3, z + 0.13], within);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), local.lamp);
      globe.position.set(x, y, z + 0.32);
      inside.add(globe);
      halo(2.2, [x, y, z + 0.34], 0.7, inside);
      sheetOf(new THREE.MeshBasicMaterial(glowing(COLOUR.warm, 0.4)), [4.2, 6.6], [x, y - 0.3, z + 0.005], { flat: false, parent: inside });
    }

    /** A strip of cloth as a grid of points: `place(across, down)` gives each point's [x, y, z] and the grid's faces follow. */
    function cloth3d(across, down, material) {
      const row = across + 1;
      const indices = [];
      const uv = [];
      for (let j = 0; j <= down; j += 1) {
        for (let i = 0; i <= across; i += 1) {
          uv.push((i / across) * (PLAN.curtain.width / TILE.velvet), j / down);
          if (j < down && i < across) {
            const a = j * row + i;
            indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(row * (down + 1) * 3), 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setIndex(indices);
      inside.add(new THREE.Mesh(geometry, material));
      return function drape(place) {
        const position = geometry.attributes.position;
        for (let j = 0; j <= down; j += 1) {
          for (let i = 0; i <= across; i += 1) position.setXYZ(j * row + i, ...place(i / across, j / down));
        }
        position.needsUpdate = true;
        geometry.computeVertexNormals();
      };
    }

    /** Two curtains, re-hung each time `open` changes. */
    function buildCurtains() {
      const { width, z } = PLAN.curtain;
      const panels = [-1, 1].map((side) => ({ side, drape: cloth3d(CURTAIN_GRID.across, CURTAIN_GRID.down, local.velvet) }));
      let hung = -1;
      return function hang(open) {
        if (Math.abs(open - hung) < 0.0005) return;
        hung = open;
        panels.forEach(({ side, drape }) => drape((across, down) => {
          const point = M.curtainPoint(across, down, open);
          return [side * (width - point.x), floor - 0.04 + (PLAN.curtain.height + 0.04) * (1 - down), z + point.z];
        }));
      };
    }

    /** The valance: a short pleated strip across the top of the opening, hanging in swags, with a gold fringe. */
    function buildValance() {
      const span = PLAN.curtain.width * 2;
      const top = floor + proscenium.height + 0.12;
      const z = PLAN.curtain.z + 0.16; // just in front of the curtains
      const swags = 5;
      const hem = (across) => top - 0.72 - 0.26 * Math.abs(Math.sin(across * Math.PI * swags));
      const pleat = (across) => Math.sin(across * Math.PI * 2 * 30) * 0.045;
      const x = (across) => (across - 0.5) * span;
      cloth3d(180, 3, local.velvet)((across, down) => [x(across), lerp(top, hem(across), down), z + pleat(across) * (0.4 + down * 0.6)]);
      const strands = 0.11;
      const fringe = cloth3d(180, 1, local.fringe);
      fringe((across, down) => [x(across), hem(across) - down * strands, z + pleat(across) + 0.01]);
    }

    // ---------- the lit shafts and the dust in them ----------

    function buildBeams() {
      const target = new THREE.Vector3(0, floor + 2.9, proscenium.z + 0.4);
      const beamMap = textureOf(T.beam());
      const sideways = new THREE.Vector3(1, 0, 0);
      const spread = { narrow: 0.12, wide: 1.6 }; // the shaft's half-width at the lamp and at the curtains
      const steps = 10;
      const shafts = [-1, 1].map((side) => {
        const source = new THREE.Vector3(side * 3.6, floor + height - 0.3, proscenium.z + 10.5);
        const aim = target.clone().setX(-side * 0.9); // the two shafts cross
        const length = source.distanceTo(aim);
        const direction = aim.clone().sub(source).normalize();
        // The shaft is a flat sheet that widens along its length. Its texture fades to nothing at the sides,
        // so it has no outline: a solid cone's rim would show as a hard line across the curtains.
        const positions = [];
        const uv = [];
        const indices = [];
        for (let i = 0; i <= steps; i += 1) {
          const along = i / steps;
          const halfWidth = lerp(spread.narrow, spread.wide, along);
          [-1, 1].forEach((edge) => {
            const point = source.clone().addScaledVector(direction, along * length).addScaledVector(sideways, edge * halfWidth);
            positions.push(point.x, point.y, point.z);
            uv.push((edge + 1) / 2, 1 - along);
          });
          if (i < steps) indices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geometry.setIndex(indices);
        const material = painted({ map: beamMap, color: COLOUR.beam, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
        inside.add(new THREE.Mesh(geometry, material));
        box(local.wood, [0.3, 0.3, 0.42], [source.x, source.y + 0.1, source.z], within); // the lamp's housing
        return { source, direction, length, spread, material };
      });

      // Dust: specks scattered through the shafts, each drifting round its own spot.
      const random = T.seeded(61);
      const homes = new Float32Array(DUST.motes * 3);
      const phases = new Float32Array(DUST.motes);
      const across = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < DUST.motes; i += 1) {
        const { source, direction, length, spread } = shafts[i % 2];
        const along = 0.2 + random() * 0.8;
        const radius = lerp(spread.narrow, spread.wide, along) * Math.sqrt(random());
        const angle = random() * Math.PI * 2;
        across.crossVectors(direction, up).normalize().applyAxisAngle(direction, angle).multiplyScalar(radius);
        homes.set([source.x + direction.x * along * length + across.x, source.y + direction.y * along * length + across.y, source.z + direction.z * along * length + across.z], i * 3);
        phases[i] = random() * Math.PI * 2;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(homes.slice(), 3));
      const dust = new THREE.Points(geometry, new THREE.PointsMaterial({ ...glowing(COLOUR.beam, 0), size: DUST.size, sizeAttenuation: true }));
      dust.frustumCulled = false; // the specks move, so their bounds are not worth keeping up to date
      inside.add(dust);

      /** `strength` 0 to 1: how bright the shafts are. `seconds`: the clock the dust drifts by. */
      return function light(strength, seconds) {
        shafts.forEach(({ material }) => { material.opacity = strength * 0.34; });
        dust.material.opacity = strength * 0.75;
        dust.visible = strength > 0.02;
        if (!dust.visible) return;
        const position = geometry.attributes.position;
        for (let i = 0; i < DUST.motes; i += 1) {
          const phase = phases[i];
          position.setXYZ(
            i,
            homes[i * 3] + Math.sin(seconds * 0.21 + phase) * 0.16,
            homes[i * 3 + 1] + Math.sin(seconds * 0.13 + phase * 1.7) * 0.22,
            homes[i * 3 + 2] + Math.cos(seconds * 0.17 + phase * 0.6) * 0.16
          );
        }
        position.needsUpdate = true;
      };
    }

    // ---------- behind the curtains ----------

    /**
     * Dark masking fills the gap between the curtains and the exhibition room, so none of that room's light
     * leaks round the curtains' edges: it is seen only through the opening. Returns a function that sets what
     * the foyer's polished floor reflects: the curtains' colour while they are closed, the exhibition's light
     * as they open.
     */
    function buildMasking() {
      const mouth = PLAN.curtain.z - 0.36; // where the exhibition room begins
      const gap = proscenium.z - proscenium.thickness / 2 - mouth;
      const gapZ = mouth + gap / 2;
      const wings = foyer.halfWidth - PLAN.curtain.width + 0.2;
      box(local.wood, [foyer.halfWidth * 2, 0.04, gap], [0, floor, gapZ], within);
      box(local.wood, [foyer.halfWidth * 2, 0.1, gap], [0, floor + height, gapZ], within);
      [-1, 1].forEach((side) => box(local.wood, [wings, height, 0.05], [side * (foyer.halfWidth - wings / 2), floor + height / 2, mouth + 0.04], within));

      const fromRoom = sheetOf(new THREE.MeshBasicMaterial(glowing(COLOUR.warm, 0)), [7.5, 10], [0, floor + 0.03, proscenium.z + 4.4], within);
      const fromCurtains = sheetOf(new THREE.MeshBasicMaterial(glowing(cloth, 0)), [9.5, 6], [0, floor + 0.035, proscenium.z + 2.6], within);
      /** `open`: how far the curtains are drawn, 0 to 1. `lit`: 0 outside the building, 1 within. */
      return function reflect(open, lit) {
        fromRoom.material.opacity = open * 0.22 * lit;
        fromCurtains.material.color.copy(cloth);
        fromCurtains.material.opacity = (1 - open * 0.7) * 0.5 * lit;
      };
    }

    buildRoom();
    buildProscenium();
    buildValance();
    const hang = buildCurtains();
    const lightShafts = buildBeams();
    const reflect = buildMasking();

    // A change of curtain colour dissolves from the old to the new.
    const blend = { from: cloth.clone(), to: cloth.clone(), since: -Infinity };

    return {
      /** 'red' or 'navy'. The curtains, the valance and the carpet change together. */
      setCurtain(name, now) {
        if (!CURTAIN_COLOURS[name]) return;
        blend.from.copy(cloth);
        blend.to.set(CURTAIN_COLOURS[name]);
        blend.since = now;
      },
      /**
       * One frame. `t`: the walk, 0 to 1. `open`: the curtains. `within`: 0 outside the building, 1 inside.
       * `now`: the clock, in milliseconds. Returns true while something here would still move without the walk
       * moving: the dust, or a change of curtain colour.
       */
      update({ t, open, within: lit, now }) {
        const blending = clamp((now - blend.since) / BLEND_MS);
        cloth.lerpColors(blend.from, blend.to, blending);
        local.velvet.color.copy(cloth);
        local.carpet.color.copy(cloth).multiplyScalar(0.55); // underfoot it is a shade deeper
        hang(open);
        reflect(open, lit);
        // The shafts are for the foyer: they fade as the walk passes between the curtains.
        const inFoyer = lit * (1 - clamp((t - TIMELINE.arrive) / 0.1));
        lightShafts(inFoyer, now / 1000);
        return blending < 1 || inFoyer > 0.02;
      },
    };
  }

  window.MuseumFoyer = { build, CURTAINS: Object.keys(CURTAIN_COLOURS) };
})();
