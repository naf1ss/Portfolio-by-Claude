'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../js/hero-window-utils.js');

// 50 units per character at a 100px font size.
const measure = (text) => text.length * 50;
const region = { x: 0, y: 100, w: 1000, h: 600 };

test('splitName stacks the name on portrait screens only', () => {
  assert.deepEqual(U.splitName(false), ['nuances']);
  assert.deepEqual(U.splitName(true), ['nuan', 'ces']);
});

test('fitLines is limited by width on a wide, short region', () => {
  const fit = U.fitLines({ lines: ['nuances'], dot: '.', measure, region: { ...region, h: 2000 } });
  // "nuances." is 8 characters = 400 units per 100px; it may fill 90% of 1000px.
  assert.ok(Math.abs(fit.fontSize - 225) < 1e-6);
  assert.ok(Math.abs(fit.box.w - 900) < 1e-6);
  assert.ok(Math.abs(fit.box.x - 50) < 1e-6, 'centred horizontally');
});

test('fitLines is limited by height in a short region', () => {
  const fit = U.fitLines({ lines: ['nuances'], dot: '.', measure, region: { ...region, h: 200 } });
  assert.ok(Math.abs(fit.fontSize - (200 * 0.92) / 1.2) < 1e-6);
  assert.ok(fit.box.h <= 200 && fit.box.y >= region.y, 'the box stays inside the region');
});

test('fitLines puts the dot after the last line only', () => {
  const fit = U.fitLines({ lines: ['nuan', 'ces'], dot: '.', measure, region });
  assert.equal(fit.lines[0].hasDot, false);
  assert.equal(fit.lines[1].hasDot, true);
  const last = fit.lines[1];
  assert.ok(Math.abs(last.dotX - (last.x + (3 * 50 * fit.fontSize) / 100)) < 1e-6);
  assert.ok(fit.lines[1].baseline > fit.lines[0].baseline, 'the second line sits below the first');
  assert.equal(fit.lastLine, last);
});

test('fitLines centres the block vertically in the region', () => {
  const fit = U.fitLines({ lines: ['nuances'], dot: '.', measure, region: { ...region, h: 2000 } });
  const above = fit.box.y - region.y;
  const below = region.y + 2000 - (fit.box.y + fit.box.h);
  assert.ok(Math.abs(above - below) < 1e-6);
});

test('slideAt walks through the works and wraps around', () => {
  const opts = { slideSeconds: 4, fadeSeconds: 1, count: 3 };
  assert.deepEqual(U.slideAt(0, opts), { index: 0, nextIndex: 1, drift: 0, fade: 0 });
  assert.equal(U.slideAt(2, opts).fade, 0, 'no crossfade early in a slide');
  assert.equal(U.slideAt(3.5, opts).fade, 0.5);
  assert.equal(U.slideAt(4.2, opts).index, 1);
  assert.equal(U.slideAt(8.9, opts).nextIndex, 0, 'after the last work comes the first');
  assert.equal(U.slideAt(12, opts).index, 0);
});

test('skipAhead lands just before the next crossfade, and again if already fading', () => {
  const opts = { slideSeconds: 4, fadeSeconds: 1 };
  assert.ok(Math.abs(U.skipAhead(1, opts) - 3.1) < 1e-9);
  assert.ok(Math.abs(U.skipAhead(3.5, opts) - 7.1) < 1e-9);
  assert.equal(U.slideAt(U.skipAhead(1, opts), { ...opts, count: 5 }).fade > 0, true);
});

test('scanPosition runs from the top of the picture to the bottom', () => {
  assert.equal(U.scanPosition(0), -0.85);
  assert.equal(U.scanPosition(1), 0.85);
  assert.equal(U.scanPosition(0.5), 0);
  assert.equal(U.scanPosition(-3), -0.85);
});

test('pickSizeIndex chooses the smallest sufficient file', () => {
  assert.equal(U.pickSizeIndex([600, 1200, 1800], 500), 0);
  assert.equal(U.pickSizeIndex([600, 1200, 1800], 601), 1);
  assert.equal(U.pickSizeIndex([600, 1200, 1526], 4000), 2, 'falls back to the largest');
});
