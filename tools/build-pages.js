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
const vm = require('node:vm');
const { contactEntries } = require('../js/contact-utils.js');
const { renderPage, renderRedirect, resolveNav } = require('./page-builder.js');
const seo = require('./seo.js');
const SERIES = require('../js/series-data.js');
const PROJECTS = require('../js/projects-data.js');
const { stampHtml } = require('./stamp-assets.js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/** Reads js/site-config.js (a browser script) so contact details have one source of truth. */
function readContactLinks() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8'), sandbox);
  return contactEntries(sandbox.window.SITE_CONFIG.contact).map(({ label, href }) => ({ label, href }));
}

/** site.json's nav, with menus that list something (the series, the projects) filled in. */
function withResolvedNav(site) {
  return { ...site, nav: resolveNav(site.nav, { series: SERIES, projects: PROJECTS }) };
}

function readSources() {
  const read = (...parts) => fs.readFileSync(path.join(SRC, ...parts), 'utf8');
  const partials = {};
  fs.readdirSync(path.join(SRC, 'partials')).forEach((file) => {
    partials[path.basename(file, '.html')] = read('partials', file);
  });
  return {
    layout: read('layout.html'),
    partials,
    site: withResolvedNav(JSON.parse(read('site.json'))),
    contactLinks: readContactLinks(),
  };
}

function build() {
  const parts = readSources();
  const sameAs = parts.contactLinks.map(({ href }) => href).filter((href) => /^https?:/.test(href));
  const sources = {};
  const pages = fs.readdirSync(path.join(SRC, 'pages'))
    .filter((file) => file.endsWith('.html'))
    .map((file) => {
      const name = path.basename(file, '.html');
      const source = fs.readFileSync(path.join(SRC, 'pages', file), 'utf8');
      sources[name] = source;
      const extras = name === 'index' ? { jsonLd: seo.homeJsonLd(parts.site, sameAs) } : {};
      return { file: `${name}.html`, html: stampHtml(renderPage(name, source, parts, extras)) };
    });

  // A page of its own for every project and series, drawn from projects.html's and series.html's scripts.
  const ownPages = [
    ...PROJECTS.map((project) => ({ name: 'projects', item: project, made: seo.projectPageSource(project, sources.projects), data: { project: project.id } })),
    ...SERIES.map((series) => ({ name: 'series', item: series, made: seo.seriesPageSource(series, sources.series), data: { series: series.id } })),
  ].map(({ name, item, made, data }) => {
    const jsonLd = seo.workJsonLd(parts.site, {
      name: item.title,
      description: made.description,
      file: made.file,
      image: `images/og/${made.file.replace(/\.html$/, '')}.jpg`,
    });
    const html = renderPage(name, made.source, parts, { file: made.file, bodyData: data, navCurrent: `${name}.html`, jsonLd });
    return { file: made.file, html: stampHtml(html) };
  });
  pages.push(...ownPages);

  const pageFiles = new Set(pages.map(({ file }) => file));
  const redirects = (parts.site.redirects || []).map(({ from, to }) => {
    if (pageFiles.has(from)) throw new Error(`redirects: ${from} is also a page.`);
    if (!pageFiles.has(to)) throw new Error(`redirects: ${from} points to ${to}, which is not a page.`);
    return { file: from, html: renderRedirect(to) };
  });

  // Search engines: every public page except the 404 page and the redirects.
  const listed = pages.map(({ file }) => file).filter((file) => file !== '404.html');
  const files = [
    { file: 'sitemap.xml', html: seo.sitemap(parts.site, listed) },
    { file: 'robots.txt', html: seo.robots(parts.site) },
    { file: 'llms.txt', html: seo.llms(parts.site, { projects: PROJECTS, series: SERIES }) },
  ];
  return pages.concat(redirects, files);
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
