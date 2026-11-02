'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planRows } = require('../js/justify.js');

const rowWidth = (ratios, row, gap) =>
  ratios.slice(row.start, row.end).reduce((sum, ratio) => sum + ratio * row.height, 0) + gap * (row.end - row.start - 1);

test('every row, the last included, fills the width exactly, and every picture is placed once', () => {
  const ratios = [1.5, 0.67, 1.33, 1, 1.78, 0.75, 1.5, 1.5, 0.67, 1.33, 2, 0.8, 1.2];
  const rows = planRows(ratios, 1200, 8, 260);
  rows.forEach((row) => assert.ok(Math.abs(rowWidth(ratios, row, 8) - 1200) < 1e-6));
  assert.equal(rows[0].start, 0);
  assert.equal(rows[rows.length - 1].end, ratios.length);
  rows.slice(1).forEach((row, i) => assert.equal(row.start, rows[i].end));
});

test('rows stay near the target height', () => {
  const ratios = Array.from({ length: 49 }, (_, i) => [1.5, 0.67, 1.33, 0.75][i % 4]);
  planRows(ratios, 1300, 4, 300).forEach((row) => assert.ok(row.height > 180 && row.height < 450, `row ${row.height}`));
});

test('a single picture fills the row on its own, and an empty list gives no rows', () => {
  assert.deepEqual(planRows([], 1000, 8, 200), []);
  const [row] = planRows([0.67], 1000, 8, 200);
  assert.equal(row.end, 1);
  assert.ok(Math.abs(row.height - 1000 / 0.67) < 1e-6);
});
