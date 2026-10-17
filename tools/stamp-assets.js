#!/usr/bin/env node
/**
 * Cache busting for the static site.
 *
 * GitHub Pages lets browsers keep css/js for about ten minutes (and Safari/Chrome
 * sometimes much longer), so after a deploy visitors can see old scripts with new
 * pages. This stamps every local stylesheet and script reference in the HTML with
 * a short hash of that file's content ("css/styles.css?v=1a2b3c4d"): the address
 * changes exactly when the file does, so a changed file is always re-downloaded.
 *
 * Used by tools/build-pages.js, which applies it to every generated page.
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

module.exports = { stampHtml, stampFor };
