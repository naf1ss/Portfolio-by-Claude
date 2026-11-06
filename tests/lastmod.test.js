'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pageContent, fingerprint, nextManifest, datesOf } = require('../tools/lastmod.js');

const page = (main, extra = '') =>
  `<html><head><title>t</title><link rel="stylesheet" href="css/s.css?v=1a2b3c4d"></head><body><header>${extra}</header><main>${main}</main><footer>${extra}</footer></body></html>`;

test("a page's content is its head and main: stamps, header and footer do not count", () => {
  assert.equal(fingerprint(page('Hi'), null), fingerprint(page('Hi', 'new menu entry').replace('1a2b3c4d', '99999999'), null));
  assert.notEqual(fingerprint(page('Hi'), null), fingerprint(page('Hello'), null));
  assert.doesNotMatch(pageContent(page('Hi')), /\?v=/);
});

test('the data a page is drawn from counts too', () => {
  assert.notEqual(fingerprint(page('Hi'), { works: [1] }), fingerprint(page('Hi'), { works: [1, 2] }));
});

test('a date moves only when the content changes; new pages take their seed date', () => {
  const previous = { 'a.html': { hash: 'x', date: '2026-10-01' }, 'b.html': { hash: 'y', date: '2026-10-02' }, 'gone.html': { hash: 'z', date: '2026-10-03' } };
  const next = nextManifest(previous, { 'b.html': 'changed', 'a.html': 'x', 'c.html': 'new' }, { today: '2026-11-06', seed: () => '2026-10-20' });
  assert.deepEqual(datesOf(next), { 'a.html': '2026-10-01', 'b.html': '2026-11-06', 'c.html': '2026-10-20' });
  assert.deepEqual(Object.keys(next), ['a.html', 'b.html', 'c.html'], 'sorted, and pages no longer listed drop out');
  assert.equal(nextManifest({}, { 'd.html': 'h' }, { today: '2026-11-06' })['d.html'].date, '2026-11-06');
});

test('the sitemap carries every listed page with a date, and the pictures it shows', () => {
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'lastmod.json'), 'utf8'));
  const urls = sitemap.match(/<url>[\s\S]*?<\/url>/g);
  assert.equal(urls.length, Object.keys(manifest).length);
  urls.forEach((block) => assert.match(block, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/));
  const gallery = urls.find((block) => block.includes('/gallery</loc>'));
  const images = gallery.match(/<image:loc>https:\/\/nuancesbynafis\.com\/([^<?]+)/g).map((tag) => tag.replace(/^.*\.com\//, ''));
  assert.ok(images.length > 100, 'the gallery lists its pictures');
  images.forEach((image) => assert.ok(fs.existsSync(path.join(__dirname, '..', image)), `${image} is missing`));
});
