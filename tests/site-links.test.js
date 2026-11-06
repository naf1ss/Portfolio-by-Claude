'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderRedirect } = require('../tools/page-builder.js');
const { pageFile } = require('../js/works-utils.js');

const ROOT = path.join(__dirname, '..');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'site.json'), 'utf8'));
const htmlFiles = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html'));
const slug = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

test('each menu item is linked by the clean address its name suggests (GitHub Pages serves /gallery from gallery.html)', () => {
  // An item whose label is longer than its address names the short form in `page` (e.g. "Interdisciplinary projects" at projects).
  site.nav.forEach(({ label, href, page }) => {
    const expected = slug(page || label);
    assert.equal(href, expected, `"${label}" should live at ${expected}`);
    assert.ok(htmlFiles.includes(pageFile(href)), `${pageFile(href)} is missing`);
  });
});

test('built pages link to other pages by clean address only, and each one is served by a file that exists', () => {
  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (!/http-equiv="refresh"/.test(html)) assert.doesNotMatch(html, /href="[\w-]+\.html/, `${file} links to a .html address`);
    [...html.matchAll(/href="(\.\/|[a-z0-9-]+)(?:[?#][^"]*)?"/g)].forEach(([, target]) => {
      assert.ok(htmlFiles.includes(pageFile(target)), `${file} links to ${target}, which no file serves`);
    });
  });
});

test('old addresses are kept as redirects to pages that exist, and a 404 page is published', () => {
  assert.ok(htmlFiles.includes('404.html'));
  site.redirects.forEach(({ from, to }) => {
    assert.ok(htmlFiles.includes(from), `${from} is missing`);
    assert.ok(htmlFiles.includes(pageFile(to)), `${to} is missing`);
    assert.match(fs.readFileSync(path.join(ROOT, from), 'utf8'), new RegExp(`url=${to}"`));
  });
});

test('a redirect page carries the query and fragment along and escapes its target', () => {
  const html = renderRedirect('gallery.html');
  assert.match(html, /location\.replace\("gallery\.html" \+ location\.search \+ location\.hash\)/);
  assert.match(html, /<meta http-equiv="refresh" content="0; url=gallery\.html">/);
  assert.match(html, /<link rel="canonical" href="gallery\.html">/);
  assert.doesNotMatch(renderRedirect('a"><script>.html'), /<script>\./);
});

test('a built file and its clean address convert both ways', () => {
  const { pageHref } = require('../js/works-utils.js');
  assert.equal(pageHref('index.html'), './');
  assert.equal(pageHref('series-horizon.html'), 'series-horizon');
  assert.equal(pageFile('./'), 'index.html');
  assert.equal(pageFile('gallery?c=print'), 'gallery.html');
  assert.equal(pageFile('gallery#a044'), 'gallery.html');
});

test('the local server finds files as GitHub Pages does, and never outside the site', () => {
  const { resolveFile } = require('../tools/static-server.js');
  assert.equal(resolveFile(ROOT, '/'), path.join(ROOT, 'index.html'));
  assert.equal(resolveFile(ROOT, '/gallery'), path.join(ROOT, 'gallery.html'));
  assert.equal(resolveFile(ROOT, '/gallery.html'), path.join(ROOT, 'gallery.html'));
  assert.equal(resolveFile(ROOT, '/css/styles.css'), path.join(ROOT, 'css', 'styles.css'));
  assert.equal(resolveFile(ROOT, '/no-such-page'), null);
  assert.equal(resolveFile(ROOT, '/%2e%2e/%2e%2e/etc/passwd'), null);
});
