'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderRedirect } = require('../tools/page-builder.js');

const ROOT = path.join(__dirname, '..');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'site.json'), 'utf8'));
const htmlFiles = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html'));
const slug = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

test('each menu item is served at the address its name suggests (GitHub Pages serves /gallery from gallery.html)', () => {
  // An item whose label is longer than its address names the short form in `page` (e.g. "Interdisciplinary projects" at projects.html).
  site.nav.forEach(({ label, href, page }) => {
    const expected = `${slug(page || label)}.html`;
    assert.equal(href, expected, `"${label}" should live at ${expected}`);
    assert.ok(htmlFiles.includes(href), `${href} is missing`);
  });
});

test('every local page link in the built pages points to a file that exists', () => {
  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    [...html.matchAll(/href="([\w-]+\.html)(?:[?#][^"]*)?"/g)].forEach(([, target]) => {
      assert.ok(htmlFiles.includes(target), `${file} links to ${target}, which does not exist`);
    });
  });
});

test('old addresses are kept as redirects to pages that exist, and a 404 page is published', () => {
  assert.ok(htmlFiles.includes('404.html'));
  site.redirects.forEach(({ from, to }) => {
    assert.ok(htmlFiles.includes(from), `${from} is missing`);
    assert.ok(htmlFiles.includes(to), `${to} is missing`);
    assert.match(fs.readFileSync(path.join(ROOT, from), 'utf8'), new RegExp(`url=${to.replace('.', '\\.')}`));
  });
});

test('a redirect page carries the query and fragment along and escapes its target', () => {
  const html = renderRedirect('gallery.html');
  assert.match(html, /location\.replace\("gallery\.html" \+ location\.search \+ location\.hash\)/);
  assert.match(html, /<meta http-equiv="refresh" content="0; url=gallery\.html">/);
  assert.match(html, /<link rel="canonical" href="gallery\.html">/);
  assert.doesNotMatch(renderRedirect('a"><script>.html'), /<script>\./);
});
