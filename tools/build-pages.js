#!/usr/bin/env node
/**
 * Builds the public HTML pages from src/ (GitHub Pages serves the committed output,
 * so the generated files stay in the repository).
 *
 *   node tools/build-pages.js          write the pages
 *   node tools/build-pages.js --check  exit 1 if any page differs from its source
 *
 * Local css/js references are stamped with a content hash ("css/styles.css?v=1a2b3c4d")
 * so browsers re-download a file exactly when it changes.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { renderPage } = require('./page-builder.js');
const { stampHtml } = require('./stamp-assets.js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function readSources() {
  const read = (...parts) => fs.readFileSync(path.join(SRC, ...parts), 'utf8');
  const partials = {};
  fs.readdirSync(path.join(SRC, 'partials')).forEach((file) => {
    partials[path.basename(file, '.html')] = read('partials', file);
  });
  return {
    layout: read('layout.html'),
    partials,
    site: JSON.parse(read('site.json')),
  };
}

function build() {
  const parts = readSources();
  return fs.readdirSync(path.join(SRC, 'pages'))
    .filter((file) => file.endsWith('.html'))
    .map((file) => {
      const name = path.basename(file, '.html');
      const source = fs.readFileSync(path.join(SRC, 'pages', file), 'utf8');
      return { file: `${name}.html`, html: stampHtml(renderPage(name, source, parts)) };
    });
}

function run(check) {
  const outOfDate = [];
  build().forEach(({ file, html }) => {
    const target = path.join(ROOT, file);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    if (current === html) return;
    outOfDate.push(file);
    if (!check) fs.writeFileSync(target, html);
  });
  return outOfDate;
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  const changed = run(check);
  if (check && changed.length > 0) {
    console.error(`Out of date: ${changed.join(', ')}. Run: npm run build`);
    process.exit(1);
  }
  console.log(changed.length ? `Built ${changed.join(', ')}` : 'All pages are up to date.');
}

module.exports = { build };
