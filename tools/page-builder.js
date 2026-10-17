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

function renderNav(nav, currentHref) {
  return nav
    .map(({ label, href }) => {
      const current = href === currentHref ? ' aria-current="page"' : '';
      return `        <li><a href="${href}"${current}>${label}</a></li>`;
    })
    .join('\n');
}

function renderFontPreloads(fonts) {
  return fonts
    .map((file) => `  <link rel="preload" href="fonts/${file}" as="font" type="font/woff2" crossorigin>`)
    .join('\n');
}

/** Orders the page's scripts as declared in site.json; render-blocking ones first. */
function renderScripts(site, requested) {
  const known = new Map(site.scripts.map((script) => [script.file, script]));
  const wanted = new Set([...site.baseScripts, ...requested]);
  wanted.forEach((file) => {
    if (!known.has(file)) throw new Error(`Unknown script "${file}" (not listed in site.json).`);
  });
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
 * @param {{layout: string, partials: Record<string, string>, site: object}} parts
 */
function renderPage(name, source, { layout, partials, site }) {
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
    fontPreloads: renderFontPreloads(site.fonts),
    scripts: renderScripts(site, scripts),
  });

  return fillTemplate(layout, {
    head,
    page: name === 'index' ? 'home' : name,
    intro: slots.intro || '',
    header: fillTemplate(partials.header, { nav: renderNav(site.nav, `${name}.html`) }).replace(/\n$/, ''),
    main: slots.main,
    footer: partials.footer.replace(/\n$/, ''),
    // The image viewer is only needed on pages that load the lightbox script.
    viewer: scripts.includes('lightbox') ? `\n${partials.viewer.replace(/\n$/, '')}` : '',
  });
}

module.exports = { parsePage, fillTemplate, renderPage, renderNav };
