/**
 * Pure page assembly for the static site (no file system access, so it is unit-testable).
 *
 * Every public page is one small source file in src/pages/ (front matter + its own
 * content). The layout, head, header, footer and image viewer are shared partials,
 * and the nav, font preloads and script tags are generated from src/site.json.
 */
'use strict';

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;
const SLOT_MARKER = /^<!-- @slot (\w+) -->\n/gm;

/** Splits a page source into its metadata and named content slots ("main" by default). */
function parsePage(source) {
  const match = FRONT_MATTER.exec(source);
  if (!match) throw new Error('Page source must start with a --- front matter block.');

  const meta = {};
  match[1].split('\n').forEach((line) => {
    const colon = line.indexOf(':');
    if (colon < 1) throw new Error(`Bad front matter line: "${line}"`);
    meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  });

  const body = source.slice(match[0].length);
  const slots = { main: '' };
  const markers = [...body.matchAll(SLOT_MARKER)];
  if (markers.length === 0) {
    slots.main = body;
  } else {
    markers.forEach((marker, index) => {
      const end = index + 1 < markers.length ? markers[index + 1].index : body.length;
      slots[marker[1]] = body.slice(marker.index + marker[0].length, end);
    });
  }
  Object.keys(slots).forEach((name) => { slots[name] = slots[name].replace(/\s+$/, ''); });
  return { meta, slots };
}

/**
 * Fills {{name}} placeholders. A placeholder that sits alone on a line and has an
 * empty value is removed together with the blank line after it, so optional
 * sections leave no gaps in the output.
 */
function fillTemplate(template, values) {
  const withoutEmpty = template.replace(/^\{\{(\w+)\}\}\n(?:\n)?/gm, (whole, name) => {
    if (!(name in values)) throw new Error(`Unknown placeholder {{${name}}}`);
    return values[name] === '' ? '' : whole;
  });
  return withoutEmpty.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    if (!(name in values)) throw new Error(`Unknown placeholder {{${name}}}`);
    return values[name];
  });
}

function assertAttributeSafe(name, value) {
  if (/["<>]/.test(value)) throw new Error(`Front matter "${name}" must not contain quotes or angle brackets.`);
  return value;
}

/**
 * Header links. An entry with `children` gets a small menu that opens on hover or keyboard focus
 * (Gallery lists its media, so a visitor can go straight to Prints or Photography).
 */
/**
 * Fills the children of nav entries that name a list instead of spelling one out:
 * `"childrenFrom": "series"` lists every series (js/series-data.js), so a new series joins the menu on the
 * next build.
 */
function resolveNav(nav, { series = [] } = {}) {
  const lists = {
    series: series.map(({ id, title }) => ({ label: title, href: `series.html?s=${encodeURIComponent(id)}` })),
  };
  return nav.map((entry) => {
    if (!entry.childrenFrom) return entry;
    const children = lists[entry.childrenFrom];
    if (!children) throw new Error(`nav: unknown childrenFrom "${entry.childrenFrom}".`);
    const { childrenFrom, ...rest } = entry;
    return { ...rest, children };
  });
}

function renderNav(nav, currentHref) {
  return nav
    .map(({ label, href, children, menuLabel }) => {
      const current = href === currentHref ? ' aria-current="page"' : '';
      const link = `<a href="${href}"${current}>${label}</a>`;
      if (!children || children.length === 0) return `        <li>${link}</li>`;
      const items = children.map((child) => `            <li><a href="${child.href}">${child.label}</a></li>`).join('\n');
      return [
        `        <li class="site-nav__group">${link}`,
        `          <ul class="site-nav__menu" aria-label="${menuLabel || label}">`,
        items,
        '          </ul>',
        '        </li>',
      ].join('\n');
    })
    .join('\n');
}

function renderFontPreloads(fonts) {
  return fonts
    .map((file) => `  <link rel="preload" href="fonts/${file}" as="font" type="font/woff2" crossorigin>`)
    .join('\n');
}

/**
 * A tiny page that sends visitors from an address that used to exist to its new one,
 * keeping any ?query and #fragment (a script does that; the meta refresh is the fallback).
 */
function renderRedirect(target) {
  const href = escapeAttribute(target);
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <title>Moved \u2014 nuances by nafis</title>',
    '  <meta name="robots" content="noindex">',
    `  <link rel="canonical" href="${href}">`,
    `  <meta http-equiv="refresh" content="0; url=${href}">`,
    `  <script>location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')} + location.search + location.hash);</script>`,
    '</head>',
    '<body>',
    `  <p>This page has moved to <a href="${href}">${href}</a>.</p>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function renderLinkItems(links) {
  return links
    .map(({ label, href }) => `          <li><a href="${escapeAttribute(href)}">${label}</a></li>`)
    .join('\n');
}

/** The footer's optional "Elsewhere" column (email, social links); empty when none are set. */
function renderElsewhere(links) {
  if (links.length === 0) return '';
  return [
    '      <nav class="footer__elsewhere" aria-label="Elsewhere">',
    '        <h2 class="footer__heading">Elsewhere</h2>',
    '        <ul class="footer__list">',
    renderLinkItems(links),
    '        </ul>',
    '      </nav>',
  ].join('\n');
}

function renderFooter(template, site, contactLinks) {
  const email = contactLinks.find((link) => link.label === 'Email');
  return fillTemplate(template.replace(/\n$/, ''), {
    helloHref: escapeAttribute(email ? email.href : 'contact.html'),
    exploreLinks: renderLinkItems(site.nav),
    elsewhere: renderElsewhere(contactLinks),
    year: String(site.copyrightYear),
  });
}

/** Adds each script's declared dependencies (transitively) to the requested set. */
function withDependencies(known, files) {
  const wanted = new Set();
  const visit = (file) => {
    const script = known.get(file);
    if (!script) throw new Error(`Unknown script "${file}" (not listed in site.json).`);
    if (wanted.has(file)) return;
    wanted.add(file);
    (script.requires || []).forEach(visit);
  };
  files.forEach(visit);
  return wanted;
}

/** Orders the page's scripts as declared in site.json; render-blocking ones first. */
function renderScripts(site, requested) {
  const known = new Map(site.scripts.map((script) => [script.file, script]));
  const wanted = withDependencies(known, [...site.baseScripts, ...requested]);
  return site.scripts
    .filter((script) => wanted.has(script.file))
    .map(({ file, defer = true }) => `  <script src="js/${file}.js"${defer ? ' defer' : ''}></script>`)
    .join('\n');
}

function splitList(value) {
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

/**
 * @param {string} name     page file name without extension ("about")
 * @param {string} source   contents of src/pages/<name>.html
 * @param {{layout: string, partials: Record<string, string>, site: object,
 *          contactLinks?: {label: string, href: string}[]}} parts
 */
function renderPage(name, source, { layout, partials, site, contactLinks = [] }) {
  const { meta, slots } = parsePage(source);
  ['title', 'description'].forEach((key) => {
    if (!meta[key]) throw new Error(`${name}: front matter "${key}" is required.`);
  });

  const scripts = splitList(meta.scripts);
  const head = fillTemplate(partials.head.replace(/\n$/, ''), {
    title: meta.title,
    description: assertAttributeSafe('description', meta.description),
    ogTitle: assertAttributeSafe('og-title', meta['og-title'] || meta.title),
    ogDescription: assertAttributeSafe('og-description', meta['og-description'] || meta.description),
    // Pages that can be served from any depth (the 404 page) resolve their files from the site root.
    base: meta.base ? `  <base href="${assertAttributeSafe('base', meta.base)}">` : '',
    fontPreloads: renderFontPreloads(site.fonts),
    scripts: renderScripts(site, scripts),
  });

  return fillTemplate(layout, {
    head,
    page: name === 'index' ? 'home' : name,
    intro: slots.intro || '',
    header: fillTemplate(partials.header, { nav: renderNav(site.nav, `${name}.html`) }).replace(/\n$/, ''),
    main: slots.main,
    footer: renderFooter(partials.footer, site, contactLinks),
    // The image viewer is only needed on pages that load the lightbox script.
    viewer: scripts.includes('lightbox') ? `\n${partials.viewer.replace(/\n$/, '')}` : '',
  });
}

module.exports = { parsePage, fillTemplate, renderPage, resolveNav, renderNav, renderRedirect };
