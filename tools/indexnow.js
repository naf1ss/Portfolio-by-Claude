#!/usr/bin/env node
/**
 * Tells IndexNow search engines (Bing, Yandex, Seznam, Naver, …) which pages changed, so they recrawl them now
 * instead of rediscovering the change on their own. A page changed when its fingerprint in src/lastmod.json did
 * (see tools/lastmod.js). Run it after a deploy is live (the GitHub workflow does):
 *
 *   node tools/indexnow.js                 pages changed by the last commit
 *   node tools/indexnow.js --since <ref>   pages changed since a commit (e.g. the previous deploy)
 *   node tools/indexnow.js --all           every page in the sitemap
 *   add --dry-run to print the list without sending it
 *
 * The key is the name of the <key>.txt file at the site root; the engines fetch that file to confirm the
 * submission comes from the site's owner, so the script checks it is live before sending anything.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pageHref } = require('../js/works-utils.js');

const ROOT = path.join(__dirname, '..');
// The shared endpoint first; engines pass submissions on to each other, so when one has not yet verified the key
// (Bing can take a while after the first submission) another can take the list instead.
const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://yandex.com/indexnow'];
const ACCEPTED = new Set([200, 202]); // 202: accepted while the key is still being checked
const KEY_FILE = /^[0-9a-f]{32}\.txt$/;
// Pages are drawn in the browser from these shared files, so a change here can alter any page.
const SHARED_PREFIXES = ['js/', 'css/', 'images/', 'fonts/', 'src/partials/', 'src/layout.html', 'src/site.json'];

/** The sitemap's addresses, in order. */
function sitemapUrls(xml) {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]);
}

/** The clean address a built file is served at, or null when the file is not a page. */
function urlForFile(file, siteUrl) {
  if (!file.endsWith('.html') || file.includes('/')) return null;
  return file === 'index.html' ? siteUrl : siteUrl + pageHref(file);
}

/**
 * Which sitemap addresses a set of changed files affects: a page whose own HTML changed, or every page when a
 * shared script, style, picture or template changed. Addresses outside the sitemap (redirects, 404) never go out.
 */
function urlsToSubmit(changedFiles, listedUrls, siteUrl) {
  if (changedFiles.some((file) => SHARED_PREFIXES.some((prefix) => file.startsWith(prefix)))) return [...listedUrls];
  const listed = new Set(listedUrls);
  const changed = new Set(changedFiles.map((file) => urlForFile(file, siteUrl)).filter((url) => listed.has(url)));
  return listedUrls.filter((url) => changed.has(url));
}

/**
 * The listed pages whose content changed between two lastmod manifests (src/lastmod.json, kept by the build),
 * which is exact: a style tweak or new menu entry changes no page's fingerprint.
 */
function urlsFromManifests(before, after, listedUrls, siteUrl) {
  const changed = new Set(
    Object.keys(after)
      .filter((file) => !before[file] || before[file].hash !== after[file].hash)
      .map((file) => urlForFile(file, siteUrl))
  );
  return listedUrls.filter((url) => changed.has(url));
}

/** src/lastmod.json as it was at a commit, or null when it did not exist yet. */
function manifestAt(ref) {
  try {
    return JSON.parse(execFileSync('git', ['show', `${ref}:src/lastmod.json`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    return null;
  }
}

/** The pages to send for the changes since `ref`: by manifest when both ends have one, else by changed files. */
function changedUrls(ref, listedUrls, siteUrl) {
  const before = manifestAt(ref);
  const after = manifestAt('HEAD');
  if (before && after) return urlsFromManifests(before, after, listedUrls, siteUrl);
  return urlsToSubmit(changedSince(ref), listedUrls, siteUrl);
}

function findKey() {
  const file = fs.readdirSync(ROOT).find((name) => KEY_FILE.test(name));
  if (!file) throw new Error('No IndexNow key file (<32 hex characters>.txt) at the site root.');
  return file.slice(0, -'.txt'.length);
}

function changedSince(ref) {
  return execFileSync('git', ['diff', '--name-only', ref, 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
}

async function submit({ siteUrl, key, urls }) {
  const keyLocation = `${siteUrl}${key}.txt`;
  const live = await fetch(`${keyLocation}?nc=${Date.now()}`).then((response) => (response.ok ? response.text() : ''));
  if (live.trim() !== key) throw new Error(`The key file is not live yet at ${keyLocation}; wait for the deploy.`);
  const body = JSON.stringify({ host: new URL(siteUrl).host, key, keyLocation, urlList: urls });
  const refusals = [];
  for (const endpoint of ENDPOINTS) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
    if (ACCEPTED.has(response.status)) {
      // Shown as a warning on the GitHub run, so a refusal that lasts is noticed without failing every deploy.
      refusals.forEach((refusal) => console.log(`::warning::IndexNow ${refusal}`));
      return { endpoint, status: response.status };
    }
    refusals.push(`${new URL(endpoint).host} answered ${response.status}: ${await response.text()}`);
  }
  throw new Error(`IndexNow refused the list everywhere:\n${refusals.join('\n')}`);
}

async function main(argv) {
  const siteUrl = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/site.json'), 'utf8')).url;
  const listed = sitemapUrls(fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8'));
  const sinceAt = argv.indexOf('--since');
  const urls = argv.includes('--all') ? listed : changedUrls(sinceAt >= 0 ? argv[sinceAt + 1] : 'HEAD~1', listed, siteUrl);
  if (!urls.length) return console.log('No listed pages changed; nothing to send.');
  if (argv.includes('--dry-run')) return console.log(urls.join('\n'));
  const { endpoint, status } = await submit({ siteUrl, key: findKey(), urls });
  console.log(`IndexNow (${new URL(endpoint).host}) accepted ${urls.length} page${urls.length === 1 ? '' : 's'} (HTTP ${status}).`);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { sitemapUrls, urlForFile, urlsToSubmit, urlsFromManifests };
