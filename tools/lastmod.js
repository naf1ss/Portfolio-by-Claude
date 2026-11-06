/**
 * The date each listed page's content last changed, for the sitemap's <lastmod>. Search engines use it to recrawl
 * what changed first, and ignore it if it is not honest, so a date moves only when the page's own content does.
 *
 * A page's content is its head and <main> as built (without asset stamps, header or footer, so a style tweak or
 * a new menu entry moves nothing), plus the data its scripts draw it from. The build fingerprints that and keeps
 * { file: { hash, date } } in src/lastmod.json; a page whose fingerprint differs gets today's date. A page seen
 * for the first time takes the date its built file was last committed. Pure, apart from the seed passed in.
 */
'use strict';

const crypto = require('node:crypto');

const STAMP = /\?v=[0-9a-f]+(?=")/g;

/** The part of a built page that is its content: <head> and <main>, asset stamps removed. */
function pageContent(html) {
  const head = /<head>([\s\S]*?)<\/head>/.exec(html);
  const main = /<main[\s\S]*?<\/main>/.exec(html);
  return `${head ? head[1] : ''}\n${main ? main[0] : ''}`.replace(STAMP, '');
}

function fingerprint(html, data) {
  return crypto.createHash('sha256').update(pageContent(html)).update(JSON.stringify(data ?? null)).digest('hex').slice(0, 16);
}

/**
 * The manifest for this build: unchanged pages keep their entry, changed ones get `today`, new ones `seed(file)`
 * (or today when it has none). Pages no longer listed drop out. Keys are sorted so the file diffs cleanly.
 *
 * @param {Record<string, {hash: string, date: string}>} previous
 * @param {Record<string, string>} hashes  file -> fingerprint
 */
function nextManifest(previous, hashes, { today, seed = () => null }) {
  const next = {};
  Object.keys(hashes).sort().forEach((file) => {
    const before = previous[file];
    const hash = hashes[file];
    if (before && before.hash === hash) next[file] = before;
    else next[file] = { hash, date: before ? today : seed(file) || today };
  });
  return next;
}

/** file -> date, for the sitemap. */
const datesOf = (manifest) => Object.fromEntries(Object.entries(manifest).map(([file, { date }]) => [file, date]));

module.exports = { pageContent, fingerprint, nextManifest, datesOf };
