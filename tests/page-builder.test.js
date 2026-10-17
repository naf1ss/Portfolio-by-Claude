'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePage, fillTemplate, renderPage, renderNav } = require('../tools/page-builder.js');

const site = {
  nav: [{ label: 'Work', href: 'work.html' }, { label: 'About', href: 'about.html' }],
  scripts: [
    { file: 'theme', defer: false },
    { file: 'config' },
    { file: 'interactions' },
    { file: 'lightbox' },
    { file: 'pages', requires: ['config'] },
  ],
  baseScripts: ['theme', 'interactions'],
  fonts: ['a.woff2'],
  copyrightYear: 2026,
  tagline: 'A tagline.',
};
const parts = {
  layout: '<head>\n{{head}}\n</head>\n<body data-page="{{page}}">\n{{intro}}\n\n{{header}}\n\n{{main}}\n\n{{footer}}\n{{viewer}}\n</body>\n',
  partials: {
    head: '  <title>{{title}}</title>\n  <meta content="{{ogTitle}}">\n{{fontPreloads}}\n{{scripts}}\n',
    header: '  <nav>\n{{nav}}\n  </nav>\n',
    footer: '  <footer>\n{{exploreLinks}}\n{{elsewhere}}\n(c) {{year}} {{tagline}}\n  </footer>\n',
    viewer: '  <dialog></dialog>\n',
  },
  site,
};
const page = (front, body = '  <main></main>') => `---\n${front}\n---\n${body}\n`;

test('parsePage reads front matter and keeps values containing colons', () => {
  const { meta, slots } = parsePage(page('title: Work: all\ndescription: d'));
  assert.deepEqual(meta, { title: 'Work: all', description: 'd' });
  assert.equal(slots.main, '  <main></main>');
});

test('parsePage splits named slots', () => {
  const { slots } = parsePage(page('title: t\ndescription: d', '<!-- @slot intro -->\n<i></i>\n<!-- @slot main -->\n<main></main>'));
  assert.equal(slots.intro, '<i></i>');
  assert.equal(slots.main, '<main></main>');
});

test('parsePage rejects a page without front matter', () => {
  assert.throws(() => parsePage('<main></main>'), /front matter/);
});

test('fillTemplate drops an empty placeholder line together with its blank line', () => {
  assert.equal(fillTemplate('a\n{{x}}\n\nb\n', { x: '' }), 'a\nb\n');
  assert.equal(fillTemplate('a\n{{x}}\n\nb\n', { x: 'X' }), 'a\nX\n\nb\n');
  assert.throws(() => fillTemplate('{{missing}}', {}), /Unknown placeholder/);
});

test('renderNav marks only the current page', () => {
  const html = renderNav(site.nav, 'about.html');
  assert.match(html, /<a href="about\.html" aria-current="page">About<\/a>/);
  assert.doesNotMatch(html, /work\.html" aria-current/);
});

test('renderPage fills metadata, defaults the social tags and marks the nav', () => {
  const html = renderPage('about', page('title: About\ndescription: Desc'), parts);
  assert.match(html, /<title>About<\/title>/);
  assert.match(html, /<meta content="About">/);
  assert.match(html, /data-page="about"/);
  assert.match(html, /aria-current="page">About/);
});

test('renderPage maps index to the "home" page id', () => {
  assert.match(renderPage('index', page('title: t\ndescription: d'), parts), /data-page="home"/);
});

test('scripts follow site.json order and respect defer', () => {
  const html = renderPage('work', page('title: t\ndescription: d\nscripts: lightbox'), parts);
  const tags = html.match(/<script src="js\/[^"]+"[^>]*>/g);
  assert.deepEqual(tags, [
    '<script src="js/theme.js">',
    '<script src="js/interactions.js" defer>',
    '<script src="js/lightbox.js" defer>',
  ]);
});

test('the image viewer is included only on pages that load the lightbox', () => {
  const withViewer = renderPage('work', page('title: t\ndescription: d\nscripts: lightbox'), parts);
  const without = renderPage('about', page('title: t\ndescription: d'), parts);
  assert.match(withViewer, /<dialog>/);
  assert.doesNotMatch(without, /<dialog>/);
  assert.match(without, /<\/footer>\n<\/body>/, 'no gap is left where the viewer would be');
});

test('renderPage rejects unknown scripts and unsafe attribute values', () => {
  assert.throws(() => renderPage('x', page('title: t\ndescription: d\nscripts: nope'), parts), /Unknown script/);
  assert.throws(() => renderPage('x', page('title: t\ndescription: say "hi"'), parts), /quotes/);
  assert.throws(() => renderPage('x', page('title: t'), parts), /description/);
});

test('a script pulls in the scripts it requires, in site.json order', () => {
  const html = renderPage('work', page('title: t\ndescription: d\nscripts: pages'), parts);
  const files = html.match(/js\/(\w+)\.js/g);
  assert.deepEqual(files, ['js/theme.js', 'js/config.js', 'js/interactions.js', 'js/pages.js']);
});

test('the footer lists the nav, the year and the contact links', () => {
  const contactLinks = [{ label: 'Email', href: 'mailto:a@b.c?x=1&y="2"' }];
  const html = renderPage('about', page('title: t\ndescription: d'), { ...parts, contactLinks });
  assert.match(html, /<li><a href="work\.html">Work<\/a><\/li>/);
  assert.match(html, /aria-label="Elsewhere"/);
  assert.match(html, /href="mailto:a@b\.c\?x=1&amp;y=&quot;2&quot;">Email/, 'attribute values are escaped');
  assert.match(html, /\(c\) 2026 A tagline\./);
});

test('the footer omits the Elsewhere column when no contact details are set', () => {
  const html = renderPage('about', page('title: t\ndescription: d'), parts);
  assert.doesNotMatch(html, /Elsewhere/);
  assert.doesNotMatch(html, /\n\n\(c\)/, 'no blank line is left behind');
});
