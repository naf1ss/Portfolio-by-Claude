/**
 * The museum's surfaces, painted in code: stone, masonry, paving, bronze doors, the evening sky, and indoors
 * the marble floor, the coffered ceiling and the velvet. Each function
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

  /**
   * A round sheet of light on black, for adding to what is behind it: `strength(r)` gives its brightness (0 to
   * 1) at `r`, which runs from 0 at the middle to 1 at the sheet's edge.
   *
   * The light is in the colour, never in the transparency. A see-through gradient on a canvas is stored
   * multiplied by its own faintness, and some browsers hand it to the graphics card with the colour of its
   * faintest parts scrambled: the glow then comes out speckled in pinks and greens. A sheet with no
   * transparency has nothing to scramble.
   */
  function radiance(strength, size = 256) {
    const { canvas, pen } = sheet(size);
    const image = pen.createImageData(size, size);
    const middle = (size - 1) / 2;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const r = Math.hypot(x - middle, y - middle) / middle;
        const i = (y * size + x) * 4;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = r < 1 ? 255 * strength(r) : 0;
        image.data[i + 3] = 255;
      }
    }
    pen.putImageData(image, 0, 0);
    return canvas;
  }

  /** A soft round glow, bright in the middle and gone at the edge: for lamps' halos and pools of light. */
  const glow = (size) => radiance((r) => Math.exp(-2.9 * r) * (1 - r ** 4), size);

  /**
   * The light a lamp throws on the wall it hangs from: brightest behind the lamp and falling away as light
   * really does with distance and slant, plus a faint wide spread for what the room bounces back. The sheet
   * is `reach` times as wide as the lamp stands off the wall.
   */
  function wash(reach = 16, size = 256) {
    const fall = (distance) => (1 + distance * distance) ** -1.5; // off the wall by 1, `distance` along it
    return radiance((r) => {
      const along = (r * reach) / 2;
      return (0.8 * fall(along) + 0.2 * fall(along / 3)) * (1 - r ** 3);
    }, size);
  }

  /**
   * A lit globe of frosted glass, as a "matcap": a picture of a ball that the material wraps round any shape
   * by the way each face is turned to the viewer. White-hot in the middle, warming toward the rim.
   */
  function frostedGlobe(size = 128) {
    const { canvas, pen } = sheet(size);
    const image = pen.createImageData(size, size);
    const middle = (size - 1) / 2;
    const [core, rim] = [[255, 251, 240], [255, 196, 128]];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const r = Math.min(1, Math.hypot(x - middle, y - middle) / middle);
        const toRim = r ** 2.4;
        const i = (y * size + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) image.data[i + channel] = core[channel] + (rim[channel] - core[channel]) * toRim;
        image.data[i + 3] = 255;
      }
    }
    pen.putImageData(image, 0, 0);
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

  /** A value from a seamless `noise` field of `size`, at any point: the field repeats every 1 in `u` and `v`. */
  function sampled(field, size, u, v) {
    const x = (u - Math.floor(u)) * size;
    const y = (v - Math.floor(v)) * size;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = (x0 + 1) % size;
    const y1 = (y0 + 1) % size;
    const tx = x - x0;
    const ty = y - y0;
    const top = field[y0 * size + x0] + (field[y0 * size + x1] - field[y0 * size + x0]) * tx;
    const bottom = field[y1 * size + x0] + (field[y1 * size + x1] - field[y1 * size + x0]) * tx;
    return top + (bottom - top) * ty;
  }

  const ramped = (from, to, value) => {
    const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
    return t * t * (3 - 2 * t);
  };
  const mixed = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);

  /**
   * The clouds of the evening sky, on a clear sheet covering the sky from `above` degrees down to the horizon
   * and `azimuth` degrees across. They lie on one level sheet high overhead, seen from below, so they are
   * drawn in perspective: broad overhead, drawing out into long thin bars toward the horizon, as a real
   * evening sky does. Thin cloud catches the last light from beneath; thick cloud is in its own shade.
   */
  function clouds({ azimuth, above, seed, width = 1024, height = 512 }) {
    const { canvas, pen } = sheet(width, height);
    const size = 512;
    // Two fields at scales that never line up, so the pattern does not visibly repeat along the horizon.
    const broad = noise(size, seed, { cells: 4 });
    const fine = noise(size, seed + 13, { cells: 4 });
    const image = pen.createImageData(width, height);
    const LIT = { low: [255, 196, 132], mid: [244, 146, 128], high: [150, 120, 170] };
    const SHADE = { low: [168, 100, 112], mid: [112, 78, 122], high: [58, 52, 100] };
    const byHeight = (tones, elevation) => (elevation < 14
      ? mixed(tones.low, tones.mid, ramped(3, 14, elevation))
      : mixed(tones.mid, tones.high, ramped(14, 42, elevation)));
    for (let y = 0; y < height; y += 1) {
      const elevation = above * (1 - y / height);
      const away = 1 / Math.tan((Math.max(elevation, 1.2) * Math.PI) / 180); // how far off the cloud overhead this line of sight meets the sheet
      const lit = byHeight(LIT, elevation);
      const shade = byHeight(SHADE, elevation);
      // Fewer overhead, and none in the last haze above the skyline.
      const share = ramped(1.5, 7, elevation) * (1 - 0.5 * ramped(34, 70, elevation));
      for (let x = 0; x < width; x += 1) {
        const bearing = ((x / width - 0.5) * azimuth * Math.PI) / 180;
        const across = away * Math.sin(bearing);
        const along = away * Math.cos(bearing);
        const density = 0.6 * sampled(broad, size, across / 5, along / 5) + 0.4 * sampled(fine, size, across / 2.3 + 0.37, along / 2.3);
        const cover = ramped(0.5, 0.68, density) * share;
        if (cover <= 0) continue;
        const colour = mixed(lit, shade, ramped(0.56, 0.74, density));
        const i = (y * width + x) * 4;
        image.data[i] = colour[0];
        image.data[i + 1] = colour[1];
        image.data[i + 2] = colour[2];
        image.data[i + 3] = 235 * cover;
      }
    }
    pen.putImageData(image, 0, 0);
    return canvas;
  }

  /**
   * The far side of the square, along the horizon: a line of hills in the haze, and in front of it the dark
   * shapes of trees and roofs with a few windows lit. `perDegree` is the sheet's pixels to a degree each way.
   */
  function skyline(pen, { width, horizon, perDegree, random }) {
    const degrees = { x: (value) => value * perDegree.x, y: (value) => value * perDegree.y };
    const hills = noise(256, 71, { octaves: 4, cells: 8 });
    pen.fillStyle = '#5b4673';
    pen.beginPath();
    pen.moveTo(0, horizon);
    for (let x = 0; x <= width; x += 8) pen.lineTo(x, horizon - degrees.y(0.35 + 1.5 * sampled(hills, 256, x / width, 0.3)));
    pen.lineTo(width, horizon);
    pen.fill();

    const dark = '#1b1630';
    const tree = (x, w, h) => {
      const puffs = 3 + Math.floor(random() * 3);
      for (let i = 0; i < puffs; i += 1) {
        const r = (w / puffs) * (0.7 + random() * 0.5);
        pen.beginPath();
        pen.ellipse(x + (w * (i + 0.5)) / puffs, horizon - h * (0.45 + random() * 0.4), r, r * (0.85 + random() * 0.4), 0, 0, TAU);
        pen.fill();
      }
      pen.fillRect(x, horizon - h * 0.5, w, h * 0.5);
    };
    const house = (x, w, h) => {
      pen.fillRect(x, horizon - h, w, h);
      if (random() > 0.45) { // a pitched roof
        pen.beginPath();
        pen.moveTo(x - 2, horizon - h);
        pen.lineTo(x + w / 2, horizon - h - w * (0.2 + random() * 0.15));
        pen.lineTo(x + w + 2, horizon - h);
        pen.fill();
      } else if (random() > 0.5) { // or a chimney
        pen.fillRect(x + w * (0.15 + random() * 0.6), horizon - h - degrees.y(0.14), degrees.x(0.07), degrees.y(0.14));
      }
      const pane = { w: Math.max(2, degrees.x(0.05)), h: Math.max(3, degrees.y(0.09)) };
      for (let wy = horizon - h + pane.h; wy < horizon - pane.h * 2.5; wy += pane.h * 2.2) {
        for (let wx = x + pane.w * 1.5; wx < x + w - pane.w * 2; wx += pane.w * 2.6) {
          if (random() > 0.3) continue;
          pen.fillStyle = `rgba(255, ${190 + Math.round(random() * 30)}, ${120 + Math.round(random() * 30)}, ${0.65 + random() * 0.3})`;
          pen.fillRect(wx, wy, pane.w, pane.h);
        }
      }
      pen.fillStyle = dark;
    };
    const spire = (x, w, h) => {
      pen.fillRect(x, horizon - h * 0.55, w, h * 0.55);
      pen.beginPath();
      pen.moveTo(x - 1, horizon - h * 0.55);
      pen.lineTo(x + w / 2, horizon - h);
      pen.lineTo(x + w + 1, horizon - h);
      pen.lineTo(x + w + 1, horizon - h * 0.55);
      pen.fill();
    };
    pen.fillStyle = dark;
    let x = 0;
    while (x < width) {
      const kind = random();
      const w = degrees.x(kind < 0.55 ? 0.6 + random() * 1.3 : kind < 0.97 ? 0.45 + random() * 0.9 : 0.22);
      if (kind < 0.55) tree(x, w, degrees.y(0.5 + random() * 0.9));
      else if (kind < 0.97) house(x, w, degrees.y(0.45 + random() * 1.1));
      else spire(x, w, degrees.y(2 + random() * 0.9));
      x += w * (0.8 + random() * 0.25);
    }
  }

  /**
   * The evening sky behind the building, for the stretch of sky the walk can ever see (`sky.SPAN`, in
   * degrees: so far each side of straight ahead, so far up, a little below the horizon). Keeping to that
   * stretch spends every pixel where it is looked at. Deep blue overhead with the first stars, through violet
   * and rose to amber where the sun has just set, behind the building; clouds lit from beneath; and along the
   * horizon the far side of the square.
   */
  function sky({ width = 4096, height = 2048, seed = 5 } = {}) {
    const { azimuth, above, below } = sky.SPAN;
    const { canvas, pen } = sheet(width, height);
    const random = seeded(seed);
    const perDegree = { x: width / azimuth, y: height / (above + below) };
    const horizon = Math.round(above * perDegree.y);

    const air = pen.createLinearGradient(0, 0, 0, horizon);
    [[75, '#11163c'], [63, '#1a1f4d'], [40, '#3d3470'], [23, '#7a4a80'], [12, '#c26f78'], [4.5, '#eda072'], [0, '#f9cd8e']]
      .forEach(([elevation, colour]) => air.addColorStop(Math.min(1, Math.max(0, 1 - elevation / above)), colour));
    pen.fillStyle = air;
    pen.fillRect(0, 0, width, horizon);
    // Where the sun went down, straight ahead: the building stands against the brightest of the sky.
    ellipse(pen, [width / 2, horizon], [perDegree.x * 36, perDegree.y * 15], [[0, 'rgba(255, 232, 178, 0.8)'], [0.4, 'rgba(255, 200, 136, 0.34)'], [1, 'rgba(255, 180, 120, 0)']]);

    for (let i = 0; i < 520; i += 1) {
      const elevation = 26 + random() ** 0.7 * (above - 26);
      const faint = ramped(26, 60, elevation);
      const r = (random() > 0.9 ? 1.7 : 1) * (0.7 + random() * 0.5);
      pen.fillStyle = `rgba(255, 250, 238, ${(0.25 + random() * 0.75) * faint})`;
      pen.beginPath();
      pen.arc(random() * width, horizon - elevation * perDegree.y, r, 0, TAU);
      pen.fill();
    }

    pen.imageSmoothingQuality = 'high';
    pen.drawImage(clouds({ azimuth, above, seed }), 0, 0, width, horizon);

    skyline(pen, { width, horizon, perDegree, random });
    // The far side of the square stands in the evening's haze, which also hides where the ground ends.
    const haze = pen.createLinearGradient(0, horizon - perDegree.y * 2.4, 0, horizon);
    haze.addColorStop(0, 'rgba(42, 36, 64, 0)');
    haze.addColorStop(1, 'rgba(42, 36, 64, 0.7)');
    pen.fillStyle = haze;
    pen.fillRect(0, horizon - perDegree.y * 2.4, width, perDegree.y * 2.4);
    pen.fillStyle = sky.HAZE;
    pen.fillRect(0, horizon, width, height - horizon);
    return canvas;
  }
  sky.SPAN = { azimuth: 140, above: 75, below: 5 };
  sky.HAZE = '#2a2440';
  sky.ZENITH = '#11163c';

  /**
   * Draws lettering as gilded letters on stone. `write(pen, how)` must draw the text with `pen[how](...)`,
   * where `how` is 'fillText' or 'strokeText'; it is called several times with different inks. `size` is the
   * type's size in pixels.
   *
   * The sign is read from across a square, where it is only a few dozen pixels tall, so it is kept plain: the
   * letters' thin strokes are thickened a little (a display face's hairlines vanish at that size), and a soft
   * dark edge below and to the right lifts the gold off the stone. Fine carved detail would only turn to mud.
   */
  function gild(pen, write, size) {
    const { height } = pen.canvas;
    pen.lineJoin = 'round';
    pen.lineWidth = size * 0.02; // enough to carry the hairlines
    const draw = (ink) => {
      pen.fillStyle = ink;
      pen.strokeStyle = ink;
      write(pen, 'strokeText');
      write(pen, 'fillText');
    };
    pen.save();
    pen.shadowColor = 'rgba(32, 20, 8, 0.6)';
    pen.shadowBlur = size * 0.035;
    pen.shadowOffsetX = size * 0.012;
    pen.shadowOffsetY = size * 0.02;
    draw('#5a3f1c');
    pen.restore();
    const gold = pen.createLinearGradient(0, height * 0.2, 0, height * 0.85);
    gold.addColorStop(0, '#ffefc0');
    gold.addColorStop(0.5, '#f1cb7c');
    gold.addColorStop(1, '#cf9f52');
    draw(gold);
  }

  /** Polished marble, near-white, with a few dark veins wandering across it. Tiles roughly, which a floor's joints hide. */
  function marble(size = 512, seed = 21) {
    const { canvas, pen } = sheet(size);
    pen.drawImage(stone(size, seed), 0, 0);
    pen.fillStyle = 'rgba(255, 255, 255, 0.35)'; // marble is cleaner and brighter than the limestone outside
    pen.fillRect(0, 0, size, size);
    const random = seeded(seed + 5);
    pen.lineCap = 'round';
    for (let vein = 0; vein < 9; vein += 1) {
      let x = random() * size;
      let y = -10;
      let heading = Math.PI / 2 + (random() - 0.5) * 1.2;
      pen.beginPath();
      pen.moveTo(x, y);
      while (y < size + 10 && x > -10 && x < size + 10) {
        heading += (random() - 0.5) * 0.7;
        x += Math.cos(heading) * 14;
        y += Math.abs(Math.sin(heading)) * 14 + 2;
        pen.lineTo(x, y);
      }
      pen.strokeStyle = `rgba(70, 66, 84, ${0.1 + random() * 0.2})`;
      pen.lineWidth = 0.6 + random() * 1.8;
      pen.stroke();
    }
    return canvas;
  }

  /** A floor of marble squares, light and dark by turns, with fine joints. `squares` each way; tiles when even. */
  function checker({ size = 1024, squares = 4, dark = 'rgba(44, 48, 66, 0.8)', seed = 21 } = {}) {
    const { canvas, pen } = sheet(size);
    const slab = marble(512, seed);
    const side = size / squares;
    for (let row = 0; row < squares; row += 1) {
      for (let column = 0; column < squares; column += 1) {
        const x = column * side;
        const y = row * side;
        // Each square shows a different piece of the slab, so no two are alike.
        pen.drawImage(slab, (column * 97 + row * 53) % (512 - 256), (column * 31 + row * 149) % (512 - 256), 256, 256, x, y, side, side);
        if ((row + column) % 2) {
          pen.fillStyle = dark;
          pen.fillRect(x, y, side, side);
        }
        pen.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        pen.lineWidth = 2;
        pen.strokeRect(x, y, side, side);
      }
    }
    return canvas;
  }

  /** A coffered ceiling: beams crossing, and in each square between them a panel stepped back twice, with a rosette. */
  function coffers({ size = 512, cells = 2 } = {}) {
    const { canvas, pen } = sheet(size);
    const side = size / cells;
    pen.fillStyle = '#ece7de';
    pen.fillRect(0, 0, size, size);
    for (let row = 0; row < cells; row += 1) {
      for (let column = 0; column < cells; column += 1) {
        const x = column * side;
        const y = row * side;
        // Each step back is darker, shadowed along its top and left, lit along its bottom and right.
        [[0.13, '#bdb7ac'], [0.24, '#9f998e']].forEach(([inset, tone]) => {
          const at = side * inset;
          const span = side - at * 2;
          pen.fillStyle = tone;
          pen.fillRect(x + at, y + at, span, span);
          pen.fillStyle = 'rgba(20, 16, 12, 0.5)';
          pen.fillRect(x + at, y + at, span, 7);
          pen.fillRect(x + at, y + at, 7, span);
          pen.fillStyle = 'rgba(255, 252, 245, 0.55)';
          pen.fillRect(x + at, y + at + span - 4, span, 4);
          pen.fillRect(x + at + span - 4, y + at, 4, span);
        });
        const rosette = pen.createRadialGradient(x + side / 2 - 3, y + side / 2 - 4, 1, x + side / 2, y + side / 2, side * 0.085);
        rosette.addColorStop(0, '#f1e3b8');
        rosette.addColorStop(0.6, '#b8975a');
        rosette.addColorStop(1, '#6d5733');
        pen.fillStyle = rosette;
        pen.beginPath();
        pen.arc(x + side / 2, y + side / 2, side * 0.085, 0, TAU);
        pen.fill();
      }
    }
    return canvas;
  }

  /** Velvet's nap: near-white, with soft streaks running down the cloth. */
  function velvet(size = 256, seed = 41) {
    const { canvas, pen } = sheet(size);
    pen.fillStyle = '#e4e4e4';
    pen.fillRect(0, 0, size, size);
    const random = seeded(seed);
    for (let i = 0; i < 520; i += 1) {
      pen.fillStyle = random() > 0.5 ? `rgba(255, 255, 255, ${random() * 0.07})` : `rgba(0, 0, 0, ${random() * 0.07})`;
      pen.fillRect(random() * size, 0, 1 + random() * 2.5, size);
    }
    return canvas;
  }

  /** A long carpet: plain pile with a pair of pale lines down each edge. The scene tints it. */
  function runner({ width = 256, height = 512, seed = 43 } = {}) {
    const { canvas, pen } = sheet(width, height);
    pen.drawImage(velvet(256, seed), 0, 0, width, height);
    pen.fillStyle = 'rgba(0, 0, 0, 0.16)';
    pen.fillRect(0, 0, width, height);
    pen.fillStyle = 'rgba(255, 236, 190, 0.9)';
    [0.07, 0.105].forEach((inset) => {
      pen.fillRect(width * inset, 0, 3, height);
      pen.fillRect(width * (1 - inset) - 3, 0, 3, height);
    });
    return canvas;
  }

  /** A gold fringe: a braid along the top and strands hanging from it, on a clear sheet. Tiles sideways. */
  function fringe({ width = 512, height = 64, seed = 47 } = {}) {
    const { canvas, pen } = sheet(width, height);
    const random = seeded(seed);
    for (let x = 0; x < width; x += 4) {
      pen.fillStyle = random() > 0.5 ? '#e2c377' : '#b08a43';
      pen.fillRect(x, 0, 3, height * (0.78 + random() * 0.22));
    }
    pen.fillStyle = '#c9a455';
    pen.fillRect(0, 0, width, height * 0.22);
    pen.fillStyle = 'rgba(255, 240, 200, 0.6)';
    pen.fillRect(0, 2, width, 2);
    return canvas;
  }

  /**
   * A shaft of light as a flat sheet: bright where it leaves the lamp (the top), thinning to nothing along its
   * length, and fading softly to nothing at both sides, so the shaft has no edge.
   */
  function beam(size = 128) {
    const { canvas, pen } = sheet(size);
    const image = pen.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      const along = y / (size - 1);
      const strength = 0.9 * (1 - along) ** 1.6;
      for (let x = 0; x < size; x += 1) {
        const across = Math.cos(((x / (size - 1)) - 0.5) * Math.PI) ** 2; // 0 at the sides, 1 down the middle
        const i = (y * size + x) * 4;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = 255 * strength * across; // light as colour: see `radiance`
        image.data[i + 3] = 255;
      }
    }
    pen.putImageData(image, 0, 0);
    return canvas;
  }

  /**
   * A line set with extra space between its letters, which a canvas cannot be asked for in every browser.
   * Each letter is placed by the width of the pair it makes with the next, so the face's own kerning is kept.
   * Returns the line's `width` and `write(pen, how, left, baseline)`, where `how` is 'fillText' or 'strokeText'
   * and `pen` is set to the same font as the pen it was measured with.
   */
  function tracked(pen, text, tracking) {
    const letters = [...text];
    const single = letters.map((letter) => pen.measureText(letter).width);
    let width = 0;
    const places = letters.map((letter, i) => {
      const at = width;
      const next = letters[i + 1];
      width += next === undefined ? single[i] : pen.measureText(letter + next).width - single[i + 1] + tracking;
      return at;
    });
    return { width, write: (onto, how, left, baseline) => letters.forEach((letter, i) => onto[how](letter, left + places[i], baseline)) };
  }

  // ---------- the exhibition room's painted light ----------
  // The gallery page draws its light in CSS (the "Gallery room" rules in css/styles.css). These redraw the same
  // gradients, stop for stop, so the room the walk ends in is lit as that page is.

  /** CSS's `radial-gradient(ellipse rx ry at cx cy, ...stops)`, each stop [offset, colour]. */
  function ellipse(pen, [cx, cy], [rx, ry], stops) {
    const gradient = pen.createRadialGradient(0, 0, 0, 0, 0, 1);
    stops.forEach(([offset, colour]) => gradient.addColorStop(offset, colour));
    pen.save();
    pen.translate(cx, cy);
    pen.scale(rx, ry);
    pen.fillStyle = gradient;
    pen.fillRect(-1, -1, 2, 2);
    pen.restore();
  }

  /**
   * The pool a picture light throws on the wall (.room__pool): a hot spot under the shade, a cone opening over
   * the work, a faint spill past the frame. `width` and `height` are the pool's, and `rem` the gallery page's
   * rem, all in one unit; only their proportions matter. Drawn on black, to be screened over the wall.
   */
  function pool({ width, height, rem, across = 384 }) {
    const down = Math.max(1, Math.round((across * height) / width));
    const { canvas, pen } = sheet(across, down);
    const y = (rems) => (rems * rem * down) / height;
    const x = across / 2;
    const size = (w, h) => [(across * w) / 100, (down * h) / 100];
    ellipse(pen, [x, y(2.3)], size(18, 5), [[0, 'rgba(255, 225, 175, 0.3)'], [1, 'rgba(255, 225, 175, 0)']]);
    ellipse(pen, [x, y(3)], size(50, 82), [[0, 'rgba(250, 196, 130, 0.13)'], [1, 'rgba(250, 196, 130, 0)']]);
    ellipse(pen, [x, y(2.5)], size(34, 64), [[0, 'rgba(255, 206, 144, 0.34)'], [0.6, 'rgba(255, 200, 136, 0.13)'], [1, 'rgba(255, 200, 136, 0)']]);
    ellipse(pen, [x, y(2.6)], size(22, 36), [[0, 'rgba(255, 216, 160, 0.62)'], [0.55, 'rgba(255, 206, 146, 0.26)'], [1, 'rgba(255, 206, 146, 0)']]);
    ellipse(pen, [x, y(2.5)], size(14, 8), [[0, 'rgba(255, 238, 205, 0.8)'], [1, 'rgba(255, 238, 205, 0)']]);
    // Nothing above the lamp: the light starts at the shade.
    const mask = pen.createLinearGradient(0, 0, 0, y(2.1));
    mask.addColorStop(0, 'rgba(0, 0, 0, 0)');
    mask.addColorStop(1, '#000');
    pen.globalCompositeOperation = 'destination-in';
    pen.fillStyle = mask;
    pen.fillRect(0, 0, across, down);
    pen.globalCompositeOperation = 'destination-over';
    pen.fillStyle = '#000';
    pen.fillRect(0, 0, across, down);
    return canvas;
  }

  /**
   * The shadow a frame drops on the wall under its lamp (.room__frame's box-shadow), on a clear sheet. The
   * sheet is the frame's size plus `margin` all round, in the caller's unit; `drop` is how far the shadow falls.
   */
  function frameShadow({ width, height, drop, blur, margin, strength = 0.65, across = 256 }) {
    const scale = across / (width + margin * 2);
    const { canvas, pen } = sheet(across, Math.round((height + margin * 2) * scale));
    // The frame itself is drawn off the sheet; only its shadow, offset back onto the sheet, is kept.
    const away = canvas.width * 2;
    pen.shadowColor = `rgba(0, 0, 0, ${strength})`;
    pen.shadowBlur = blur * scale;
    pen.shadowOffsetX = away;
    pen.shadowOffsetY = drop * scale;
    pen.fillRect(margin * scale - away, margin * scale, width * scale, height * scale);
    return canvas;
  }

  /** A sheet shaded from top to bottom through `stops`, each [offset, colour]: a gradient to stretch over a shape. */
  function ramp(stops, height = 128) {
    const { canvas, pen } = sheet(4, height);
    const down = pen.createLinearGradient(0, 0, 0, height);
    stops.forEach(([offset, colour]) => down.addColorStop(offset, colour));
    pen.fillStyle = down;
    pen.fillRect(0, 0, 4, height);
    return canvas;
  }

  /** Darker corners and a dim ceiling line (.room__shade), for the whole wall. */
  function roomShade(size = 256) {
    const { canvas, pen } = sheet(size);
    const top = pen.createLinearGradient(0, 0, 0, size * 0.3);
    top.addColorStop(0, 'rgba(0, 0, 0, 0.36)');
    top.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pen.fillStyle = top;
    pen.fillRect(0, 0, size, size);
    ellipse(pen, [size / 2, size * 0.45], [size * 1.3, size], [[0, 'rgba(0, 0, 0, 0)'], [0.55, 'rgba(0, 0, 0, 0)'], [1, 'rgba(0, 0, 0, 0.48)']]);
    return canvas;
  }

  /**
   * One tile of the gallery wall: its paint with the plaster laid over it in soft light (.room__track::after).
   * `plaster` is the gallery page's own plaster image, or nothing before it has loaded.
   */
  function plasterWall(colour, plaster, size = 512) {
    const { canvas, pen } = sheet(size);
    pen.fillStyle = colour;
    pen.fillRect(0, 0, size, size);
    if (plaster) {
      pen.globalAlpha = 0.55;
      pen.globalCompositeOperation = 'soft-light';
      pen.drawImage(plaster, 0, 0, size, size);
    }
    return canvas;
  }

  window.MuseumTextures = { stone, blocks, bronzeDoor, volute, radiance, glow, wash, frostedGlobe, uplight, sky, gild, marble, checker, coffers, velvet, runner, fringe, beam, tracked, pool, frameShadow, ramp, roomShade, plasterWall, seeded, noise };
})();
