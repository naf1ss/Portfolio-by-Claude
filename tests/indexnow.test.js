'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sitemapUrls, urlForFile, urlsToSubmit } = require('../tools/indexnow.js');

const SITE = 'https://example.com/';
const LISTED = [`${SITE}`, `${SITE}gallery`, `${SITE}series-horizon`];

test('reads the sitemap addresses in order', () => {
  const xml = `<urlset><url><loc>${LISTED[0]}</loc></url><url><loc>${LISTED[1]}</loc></url></urlset>`;
  assert.deepEqual(sitemapUrls(xml), LISTED.slice(0, 2));
});

test('maps a built page to its address, and nothing else to one', () => {
  assert.equal(urlForFile('index.html', SITE), SITE);
  assert.equal(urlForFile('gallery.html', SITE), `${SITE}gallery`);
  assert.equal(urlForFile('src/pages/gallery.html', SITE), null);
  assert.equal(urlForFile('README.md', SITE), null);
});

test('sends only the listed pages whose own HTML changed', () => {
  assert.deepEqual(urlsToSubmit(['series-horizon.html', 'index.html', 'README.md'], LISTED, SITE), [SITE, `${SITE}series-horizon`]);
  assert.deepEqual(urlsToSubmit(['404.html', 'about.html', 'tests/x.test.js'], LISTED, SITE), []);
});

test('sends every listed page when shared scripts, styles, pictures or templates changed', () => {
  ['js/works-data.js', 'css/styles.css', 'images/photography/a-600.jpg', 'src/partials/head.html'].forEach((file) => {
    assert.deepEqual(urlsToSubmit([file], LISTED, SITE), LISTED, file);
  });
});

test('exactly one key file sits at the site root, holding its own name', () => {
  const root = path.join(__dirname, '..');
  const keys = fs.readdirSync(root).filter((name) => /^[0-9a-f]{32}\.txt$/.test(name));
  assert.equal(keys.length, 1);
  assert.equal(fs.readFileSync(path.join(root, keys[0]), 'utf8').trim(), keys[0].slice(0, -4));
});

test('with lastmod manifests on both sides, sends exactly the pages whose content changed', () => {
  const { urlsFromManifests } = require('../tools/indexnow.js');
  const before = { 'index.html': { hash: 'a' }, 'gallery.html': { hash: 'b' } };
  const after = { 'index.html': { hash: 'a' }, 'gallery.html': { hash: 'c' }, 'series-horizon.html': { hash: 'd' } };
  assert.deepEqual(urlsFromManifests(before, after, LISTED, SITE), [`${SITE}gallery`, `${SITE}series-horizon`]);
  assert.deepEqual(urlsFromManifests(after, after, LISTED, SITE), []);
});
