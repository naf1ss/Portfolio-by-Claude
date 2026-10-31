'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const seo = require('../tools/seo.js');
const PROJECTS = require('../js/projects-data.js');
const SERIES = require('../js/series-data.js');
const { projectPage, seriesPage } = require('../js/works-utils.js');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('snippet keeps whole sentences under the limit, drops markup and straight quotes', () => {
  assert.equal(seo.snippet('A *short* line.'), 'A short line.');
  assert.equal(seo.snippet('One. Two.', 5), 'One.');
  const long = seo.snippet(`${'word '.repeat(60)}end`);
  assert.ok(long.length <= 160 && long.endsWith('…'));
  assert.ok(!seo.snippet('say "hi"').includes('"'));
});

test('every project and series has its own page, with its title, address and an existing preview picture', () => {
  const pages = [
    ...PROJECTS.map((item) => ({ item, file: projectPage(item.id), data: `data-project="${item.id}"` })),
    ...SERIES.map((item) => ({ item, file: seriesPage(item.id), data: `data-series="${item.id}"` })),
  ];
  pages.forEach(({ item, file, data }) => {
    const html = read(file);
    assert.ok(html.includes(data), `${file}: body does not name its ${data}`);
    assert.ok(html.includes(`<link rel="canonical" href="https://nuancesbynafis.com/${file}">`), `${file}: no canonical`);
    const image = /property="og:image" content="https:\/\/nuancesbynafis\.com\/([^"]+)"/.exec(html);
    assert.ok(image && fs.existsSync(path.join(ROOT, image[1])), `${file}: preview picture missing (run node tools/make-og-images.js)`);
    assert.ok(html.includes('application/ld+json'), `${file}: no structured data`);
  });
});

test('the sitemap lists every public page and leaves out the 404 page and redirects', () => {
  const sitemap = read('sitemap.xml');
  ['', 'gallery.html', 'projects.html', projectPage('planet-walk'), seriesPage('negligible')].forEach((file) => {
    assert.ok(sitemap.includes(`<loc>https://nuancesbynafis.com/${file}</loc>`), `sitemap: ${file || 'home'} missing`);
  });
  ['404.html', 'about.html', 'work.html'].forEach((file) => assert.ok(!sitemap.includes(file), `sitemap lists ${file}`));
  assert.match(read('robots.txt'), /Sitemap: https:\/\/nuancesbynafis\.com\/sitemap\.xml/);
});

test('the home page tells search engines who the artist is', () => {
  const block = /<script type="application\/ld\+json">([^<]+)<\/script>/.exec(read('index.html'));
  const data = JSON.parse(block[1]);
  const person = data['@graph'].find((node) => node['@type'] === 'Person');
  assert.equal(person.name, 'Md Nafisul Hasan Sami');
  assert.ok(person.sameAs.some((url) => url.includes('instagram.com')));
});
