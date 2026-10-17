#!/usr/bin/env node
/**
 * Cache busting for a site with no build step.
 *
 * GitHub Pages lets browsers keep css/js for about ten minutes (and Safari/Chrome
 * sometimes much longer), so after a deploy visitors can see old scripts with new
 * pages. This stamps every local stylesheet and script reference in the HTML with
 * a short hash of that file's content ("css/styles.css?v=1a2b3c4d"): the address
 * changes exactly when the file does, so a changed file is always re-downloaded.
 *
 *   node tools/stamp-assets.js          rewrite the HTML files
 *   node tools/stamp-assets.js --check  exit 1 if any stamp is out of date
 */
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
// <link rel="stylesheet" href="..."> and <script src="..."> with a relative path.
const REFERENCE = /(<(?:link rel="stylesheet" href|script src)=")((?:css|js)\/[^"?]+)(?:\?v=[0-9a-f]+)?(")/g;

function stampFor(relativePath) {
  const content = fs.readFileSync(path.join(ROOT, relativePath));
  return crypto.createHash('sha1').update(content).digest('hex').slice(0, 8);
}

function stampHtml(html) {
  return html.replace(REFERENCE, (_, before, file, after) => `${before}${file}?v=${stampFor(file)}${after}`);
}

function htmlFiles() {
  return fs.readdirSync(ROOT).filter((name) => name.endsWith('.html'));
}

function run(check) {
  const stale = [];
  htmlFiles().forEach((name) => {
    const filePath = path.join(ROOT, name);
    const current = fs.readFileSync(filePath, 'utf8');
    const stamped = stampHtml(current);
    if (stamped === current) return;
    stale.push(name);
    if (!check) fs.writeFileSync(filePath, stamped);
  });
  return stale;
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  const changed = run(check);
  if (check && changed.length > 0) {
    console.error(`Out of date: ${changed.join(', ')}. Run: npm run stamp`);
    process.exit(1);
  }
  console.log(changed.length ? `Updated ${changed.join(', ')}` : 'All asset stamps are current.');
}

module.exports = { stampHtml, stampFor };
