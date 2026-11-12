/**
 * The museum's surfaces, painted in code: stone, masonry, paving, bronze doors, the evening sky. Each function
 * returns a canvas, which js/museum.js turns into a texture. Nothing is downloaded, and nothing here needs
 * the 3D library.
 *
 * The stone textures are near-white: the scene multiplies them by each material's own colour, so one sheet
 * of stone serves the columns, the steps and the walls. Every pattern is seeded, so the building looks the same
 * on every visit.
 */
(function () {
  'use strict';

  const TAU = Math.PI * 2;

  function sheet(width, height = width) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return { canvas, pen: canvas.getContext('2d') };
  }

  /** Repeatable pseudo-random numbers in [0, 1) (mulberry32). */
  function seeded(seed) {
    let state = seed >>> 0;
    return function next() {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Cloudy noise, `size` by `size` values from 0 to 1, that tiles without a seam: several layers of smoothed
   * random values, each twice as fine and half as strong as the last.
   */
  function noise(size, seed, { octaves = 5, cells = 4 } = {}) {
    const random = seeded(seed);
    const field = new Float32Array(size * size);
    let strength = 1;
    let total = 0;
    for (let octave = 0; octave < octaves; octave += 1) {
      const grid = cells << octave;
      const lattice = Float32Array.from({ length: grid * grid }, random);
      for (let y = 0; y < size; y += 1) {
        const fy = (y / size) * grid;
        const y0 = Math.floor(fy);
        const ty = fy - y0;
        const sy = ty * ty * (3 - 2 * ty);
        const rowA = (y0 % grid) * grid;
        const rowB = ((y0 + 1) % grid) * grid;
        for (let x = 0; x < size; x += 1) {
          const fx = (x / size) * grid;
          const x0 = Math.floor(fx);
          const tx = fx - x0;
          const sx = tx * tx * (3 - 2 * tx);
          const a = x0 % grid;
          const b = (x0 + 1) % grid;
          const top = lattice[rowA + a] + (lattice[rowA + b] - lattice[rowA + a]) * sx;
          const bottom = lattice[rowB + a] + (lattice[rowB + b] - lattice[rowB + a]) * sx;
          field[y * size + x] += (top + (bottom - top) * sy) * strength;
        }
      }
      total += strength;
      strength *= 0.5;
    }
    for (let i = 0; i < field.length; i += 1) field[i] /= total;
    return field;
  }

  /** Pale limestone: soft clouding, a little warmth that comes and goes, and fine grain. Tiles. */
  function stone(size = 512, seed = 7) {
    const { canvas, pen } = sheet(size);
    const clouds = noise(size, seed, { cells: 6 });
    const warmth = noise(size, seed + 31, { octaves: 3, cells: 2 });
    const grain = seeded(seed + 97);
    const image = pen.createImageData(size, size);
    for (let i = 0; i < size * size; i += 1) {
      const tone = 0.88 + (clouds[i] - 0.5) * 0.17 + (grain() - 0.5) * 0.05;
      const warm = (warmth[i] - 0.5) * 0.07;
      image.data[i * 4] = Math.min(255, (tone + warm) * 255);
      image.data[i * 4 + 1] = Math.min(255, tone * 255);
      image.data[i * 4 + 2] = Math.min(255, (tone - warm) * 255);
      image.data[i * 4 + 3] = 255;
    }
    pen.putImageData(image, 0, 0);
    return canvas;
  }

  /**
   * Blocks laid in courses over a sheet of stone: each block a shade of its own, each joint a dark line with a
   * lit edge below it. `rows` courses of `perRow` blocks; alternate courses are offset by half a block. Tiles.
   */
  function blocks(base, { size = 1024, rows = 8, perRow = 4, joint = 3, seed = 3, darkness = 0.4 } = {}) {
    const { canvas, pen } = sheet(size);
    pen.drawImage(base, 0, 0, size, size);
    const random = seeded(seed);
    const rowHeight = size / rows;
    const blockWidth = size / perRow;
    for (let row = 0; row < rows; row += 1) {
      const shift = row % 2 ? blockWidth / 2 : 0;
      for (let block = -1; block < perRow; block += 1) {
        const x = block * blockWidth + shift;
        const shade = random() - 0.5;
        pen.fillStyle = shade > 0 ? `rgba(255, 250, 240, ${shade * 0.16})` : `rgba(40, 30, 20, ${-shade * 0.16})`;
        pen.fillRect(x, row * rowHeight, blockWidth, rowHeight);
        pen.fillStyle = `rgba(30, 22, 16, ${darkness})`;
        pen.fillRect(x, row * rowHeight, joint, rowHeight);
        pen.fillStyle = 'rgba(255, 252, 244, 0.22)';
        pen.fillRect(x + joint, row * rowHeight, 1, rowHeight);
      }
      pen.fillStyle = `rgba(30, 22, 16, ${darkness})`;
      pen.fillRect(0, row * rowHeight, size, joint);
      pen.fillStyle = 'rgba(255, 252, 244, 0.22)';
      pen.fillRect(0, row * rowHeight + joint, size, 1);
    }
    return canvas;
  }

  /** One leaf of a bronze door: a frame, a column of raised panels each with a boss, and a ring to pull. */
  function bronzeDoor({ width = 384, height = 1536, panels = 4, seed = 11 } = {}) {
    const { canvas, pen } = sheet(width, height);
    const metal = pen.createLinearGradient(0, 0, width, height);
    metal.addColorStop(0, '#6b4a2b');
    metal.addColorStop(0.5, '#4d3520');
    metal.addColorStop(1, '#3a2817');
    pen.fillStyle = metal;
    pen.fillRect(0, 0, width, height);

    // Streaks of patina, running down.
    const random = seeded(seed);
    for (let i = 0; i < 260; i += 1) {
      const x = random() * width;
      pen.fillStyle = random() > 0.7 ? `rgba(110, 140, 120, ${random() * 0.07})` : `rgba(20, 12, 6, ${random() * 0.1})`;
      pen.fillRect(x, random() * height, 1 + random() * 2, 60 + random() * 380);
    }

    /** A rectangle that reads as raised (or, with `sunk`, recessed): lit on its top and left edges. */
    function bevel(x, y, w, h, depth, sunk = false) {
      const light = 'rgba(255, 214, 150, 0.4)';
      const dark = 'rgba(12, 7, 3, 0.6)';
      pen.fillStyle = sunk ? dark : light;
      pen.fillRect(x, y, w, depth);
      pen.fillRect(x, y, depth, h);
      pen.fillStyle = sunk ? light : dark;
      pen.fillRect(x, y + h - depth, w, depth);
      pen.fillRect(x + w - depth, y, depth, h);
    }

    const margin = width * 0.11;
    bevel(0, 0, width, height, 6);
    const panelHeight = (height - margin * (panels + 1)) / panels;
    for (let i = 0; i < panels; i += 1) {
      const x = margin;
      const y = margin + i * (panelHeight + margin);
      const w = width - margin * 2;
      bevel(x, y, w, panelHeight, 7, true);
      pen.fillStyle = 'rgba(0, 0, 0, 0.16)';
      pen.fillRect(x + 7, y + 7, w - 14, panelHeight - 14);
      bevel(x + 30, y + 30, w - 60, panelHeight - 60, 5);
      // A boss in the middle of the panel.
      const cx = width / 2;
      const cy = y + panelHeight / 2;
      const boss = pen.createRadialGradient(cx - 9, cy - 11, 2, cx, cy, 34);
      boss.addColorStop(0, '#e2b877');
      boss.addColorStop(0.45, '#8a6238');
      boss.addColorStop(1, '#2c1d10');
      pen.fillStyle = boss;
      pen.beginPath();
      pen.arc(cx, cy, 34, 0, TAU);
      pen.fill();
    }
    // The ring, on the edge that meets the other leaf (the right-hand edge of this sheet).
    pen.lineWidth = 9;
    pen.strokeStyle = '#c69a5c';
    pen.beginPath();
    pen.arc(width - margin * 0.52, height * 0.5, 26, 0, TAU);
    pen.stroke();
    pen.lineWidth = 3;
    pen.strokeStyle = 'rgba(15, 8, 3, 0.7)';
    pen.beginPath();
    pen.arc(width - margin * 0.52 + 2, height * 0.5 + 3, 31, 0, TAU);
    pen.stroke();
    return canvas;
  }

  /** The face of an Ionic volute: a spiral groove winding in to an eye, cut in stone. */
  function volute(base, size = 256) {
    const { canvas, pen } = sheet(size);
    pen.drawImage(base, 0, 0, size, size);
    const centre = size / 2;
    const turns = 2.6;
    function spiral(offset, style, width) {
      pen.strokeStyle = style;
      pen.lineWidth = width;
      pen.beginPath();
      for (let step = 0; step <= 240; step += 1) {
        const along = step / 240;
        const angle = along * turns * TAU + Math.PI;
        const radius = centre * 0.94 * (1 - along) ** 1.15 + 8;
        const x = centre + Math.cos(angle) * radius + offset;
        const y = centre + Math.sin(angle) * radius + offset;
        if (step) pen.lineTo(x, y);
        else pen.moveTo(x, y);
      }
      pen.stroke();
    }
    spiral(0, 'rgba(38, 28, 20, 0.62)', size * 0.05);
    spiral(size * 0.016, 'rgba(255, 250, 240, 0.4)', size * 0.014);
    pen.fillStyle = 'rgba(38, 28, 20, 0.5)';
    pen.beginPath();
    pen.arc(centre, centre, size * 0.055, 0, TAU);
    pen.fill();
    return canvas;
  }

  /** A soft round glow, bright in the middle and gone at the edge: for lamps and pools of light. */
  function glow(size = 128) {
    const { canvas, pen } = sheet(size);
    const fade = pen.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    fade.addColorStop(0, 'rgba(255, 255, 255, 1)');
    fade.addColorStop(0.25, 'rgba(255, 255, 255, 0.5)');
    fade.addColorStop(0.6, 'rgba(255, 255, 255, 0.12)');
    fade.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pen.fillStyle = fade;
    pen.fillRect(0, 0, size, size);
    return canvas;
  }

  /** Brightness falling away upward, as stone lit by a lamp at its foot. White at the bottom of the sheet. */
  function uplight(height = 256) {
    const { canvas, pen } = sheet(4, height);
    const fade = pen.createLinearGradient(0, height, 0, 0);
    fade.addColorStop(0, '#ffffff');
    fade.addColorStop(0.12, '#c9c9c9');
    fade.addColorStop(0.4, '#5c5c5c');
    fade.addColorStop(0.75, '#1c1c1c');
    fade.addColorStop(1, '#0a0a0a');
    pen.fillStyle = fade;
    pen.fillRect(0, 0, 4, height);
    return canvas;
  }

  /**
   * The evening sky, to wrap round the inside of a dome: the top of the sheet is overhead, the middle row the
   * horizon. Deep blue overhead with the first stars, through violet and rose to an amber horizon; long
   * clouds lit from beneath; and along the horizon the dark line of a city's roofs and trees.
   */
  function sky({ width = 4096, height = 1024, seed = 5 } = {}) {
    const { canvas, pen } = sheet(width, height);
    const horizon = height / 2;
    const random = seeded(seed);

    const air = pen.createLinearGradient(0, 0, 0, horizon);
    [[0, '#0b1030'], [0.3, '#1a1f4d'], [0.55, '#3d3470'], [0.74, '#7a4a80'], [0.87, '#c26f78'], [0.95, '#eda072'], [1, '#f9cd8e']]
      .forEach(([at, colour]) => air.addColorStop(at, colour));
    pen.fillStyle = air;
    pen.fillRect(0, 0, width, horizon);

    for (let i = 0; i < 900; i += 1) {
      const y = random() ** 1.6 * horizon * 0.62;
      pen.fillStyle = `rgba(255, 250, 235, ${(0.25 + random() * 0.7) * (1 - y / (horizon * 0.62))})`;
      const r = random() > 0.93 ? 1.5 : 0.8;
      pen.fillRect(random() * width, y, r, r);
    }

    // Clouds: long soft streaks. Higher ones are dusky; lower ones catch the last light on their undersides.
    for (let i = 0; i < 90; i += 1) {
      const up = random(); // 0 near the horizon, 1 high
      const cy = horizon * (0.93 - up * 0.5);
      const cx = random() * width;
      const length = 160 + random() * 460;
      const thickness = 7 + random() * 16 + up * 12;
      const lit = `rgba(255, ${Math.round(150 + (1 - up) * 60)}, ${Math.round(125 - (1 - up) * 30)}, ${0.1 + (1 - up) * 0.2})`;
      const dusk = `rgba(${Math.round(70 + (1 - up) * 80)}, ${Math.round(55 + (1 - up) * 30)}, ${Math.round(110 - (1 - up) * 10)}, ${0.16 + random() * 0.14})`;
      [[0, dusk], [thickness * 0.45, lit]].forEach(([drop, colour]) => {
        for (const wrap of [-width, 0, width]) { // drawn again each side, so the sheet's edges join
          pen.save();
          pen.translate(cx + wrap, cy + drop);
          pen.scale(length / thickness, 1);
          const puff = pen.createRadialGradient(0, 0, 0, 0, 0, thickness);
          puff.addColorStop(0, colour);
          puff.addColorStop(1, 'rgba(0, 0, 0, 0)');
          pen.fillStyle = puff;
          pen.beginPath();
          pen.arc(0, 0, thickness, 0, TAU);
          pen.fill();
          pen.restore();
        }
      });
    }

    // Below the horizon nothing shows but haze, in the colour the ground fades to.
    pen.fillStyle = sky.HAZE;
    pen.fillRect(0, horizon, width, height - horizon);

    // The skyline: roofs and trees, a few lit windows. A pixel here is about a fifth of a degree, so these are
    // small: a far-off city, not hills.
    const dark = '#17142b';
    pen.fillStyle = dark;
    let x = 0;
    while (x < width) {
      const tree = random() > 0.6;
      const w = tree ? 4 + random() * 9 : 5 + random() * 14;
      const h = tree ? 2 + random() * 3.5 : 1.5 + random() * 5.5;
      if (tree) {
        pen.beginPath();
        pen.ellipse(x + w / 2, horizon - h * 0.5, w / 2, h * 0.75, 0, 0, TAU);
        pen.fill();
      } else {
        pen.fillRect(x, horizon - h, w, h);
        if (h > 3 && random() > 0.45) {
          pen.fillStyle = 'rgba(255, 200, 130, 0.85)';
          pen.fillRect(x + 1 + random() * (w - 2), horizon - h + 1 + random() * (h - 2), 1, 1);
          pen.fillStyle = dark;
        }
      }
      x += w * 0.85;
    }
    pen.fillRect(0, horizon - 1.5, width, 3);
    return canvas;
  }
  sky.HAZE = '#2a2440';

  /**
   * Fills lettering as gilded letters cut into stone. `write(pen)` must draw the text with `pen.fillText`; it
   * is called several times with different inks. `depth` is how deep the cut looks, in pixels.
   */
  function gild(pen, write, depth = 4) {
    const { width, height } = pen.canvas;
    const gold = pen.createLinearGradient(0, 0, 0, height);
    gold.addColorStop(0.25, '#ffefbd');
    gold.addColorStop(0.55, '#f0c877');
    gold.addColorStop(0.85, '#c7964a');
    pen.fillStyle = gold;
    write(pen);

    // The cut's upper wall is in shadow: everything but the letters, shifted down and right, darkens them.
    const around = sheet(width, height);
    around.pen.fillStyle = '#000';
    around.pen.fillRect(0, 0, width, height);
    around.pen.globalCompositeOperation = 'destination-out';
    around.pen.font = pen.font;
    write(around.pen);
    pen.save();
    pen.globalCompositeOperation = 'source-atop';
    pen.globalAlpha = 0.38;
    pen.drawImage(around.canvas, depth * 0.6, depth);
    pen.restore();

    // Behind the letters: the stone's lit lip below and to the right, its shadowed lip above and to the left.
    pen.save();
    pen.globalCompositeOperation = 'destination-over';
    pen.fillStyle = 'rgba(255, 244, 220, 0.5)';
    pen.translate(depth * 0.4, depth * 0.5);
    write(pen);
    pen.fillStyle = 'rgba(30, 20, 10, 0.5)';
    pen.translate(-depth * 0.8, -depth);
    write(pen);
    pen.restore();
  }

  window.MuseumTextures = { stone, blocks, bronzeDoor, volute, glow, uplight, sky, gild, seeded, noise };
})();
