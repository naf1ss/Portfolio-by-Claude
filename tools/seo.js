/**
 * What search engines and link previews read, built from the site's own data (pure functions, no file system):
 *
 *   - a page of its own for every project and series (project-<id>.html, series-<id>.html), with its own title,
 *     description, preview image and structured data, and its heading and summary already in the HTML;
 *     pages.js then draws the rest, exactly as it does for projects.html and series.html
 *   - sitemap.xml, robots.txt and llms.txt
 *
 * The artist's name appears in full in titles, because that is what people search for.
 */
'use strict';

const { pageHref, pageFile, projectPage, seriesPage, worksInSeries, largestUrl } = require('../js/works-utils.js');

const ARTIST = {
  // Shown text uses the full name or "Nafis", never both together; the other forms are for search engines only.
  name: 'Md Nafisul Hasan Sami',
  alternateNames: ['Nafis', 'Nafisul Hasan Sami'],
};
const DESCRIPTION_MAX = 160; // about what a search result shows
const ABBREVIATION = /\b(Dr|Mr|Mrs|Ms|Prof|St|vs|No)\./g;

/** Plain text from the site's light markup (*italics*), safe for an attribute and trimmed to a search snippet. */
function snippet(text, max = DESCRIPTION_MAX) {
  const plain = String(text || '').replace(/\*/g, '').replace(/"/g, '”').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (plain.length <= max) return plain;
  // A title such as "Dr." does not end a sentence: its point is held aside while the text is split.
  const held = plain.replace(ABBREVIATION, '$1\u2024');
  const sentences = (held.match(/[^.!?]+[.!?]+/g) || []).map((sentence) => sentence.replace(/\u2024/g, '.'));
  let kept = '';
  for (const sentence of sentences) {
    if ((kept + sentence).trim().length > max) break;
    kept += sentence;
  }
  if (kept.trim()) return kept.trim();
  const cut = plain.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The light markup's *italics* as <em>, for text placed in the page. */
function richText(text) {
  return escapeHtml(text).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** A title as plain attribute text: no markup, no straight quotes. */
const plainTitle = (title) => snippet(title, 200);

const pageTitle = (title) => `${title} — ${ARTIST.name}`;

function frontMatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

/** The scripts line of a page source, so a generated page loads exactly what its template page loads. */
function scriptsOf(templateSource) {
  const line = /^scripts:\s*(.+)$/m.exec(templateSource);
  return line ? line[1].trim() : '';
}

function personJsonLd(site, sameAs = []) {
  return {
    '@type': 'Person',
    '@id': `${site.url}#artist`,
    name: ARTIST.name,
    alternateName: ARTIST.alternateNames,
    url: site.url,
    jobTitle: 'Multidisciplinary artist',
    description: 'Multidisciplinary artist and student of mathematics and studio art at Gettysburg College, working across painting, ceramics, printmaking, photography, digital art and graphic design.',
    affiliation: { '@type': 'CollegeOrUniversity', name: 'Gettysburg College' },
    sameAs,
  };
}

/** Structured data for the home page: the artist, and the site as theirs. */
function homeJsonLd(site, sameAs) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      personJsonLd(site, sameAs),
      { '@type': 'WebSite', '@id': `${site.url}#site`, name: 'nuances by nafis', url: site.url, author: { '@id': `${site.url}#artist` } },
    ],
  };
}

function workJsonLd(site, { name, description, file, image }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name,
    description,
    url: `${site.url}${pageHref(file)}`,
    image: `${site.url}${image}`,
    author: { '@type': 'Person', '@id': `${site.url}#artist`, name: ARTIST.name, url: site.url },
  };
}

/**
 * A project's own page: projects.html's scripts, the case study's heading and summary already in place
 * (project-page.js redraws the case study around them), and the project index left empty and hidden.
 */
function projectPageSource(project, templateSource) {
  const description = snippet(project.summary);
  const source =
    frontMatter({
      title: pageTitle(project.title.replace(/"/g, '”')),
      description,
      'og-title': project.title.replace(/"/g, '”'),
      'og-image': `images/og/project-${project.id}.jpg`,
      'og-image-alt': `${plainTitle(project.title)}, a project by ${ARTIST.name}`,
      scripts: scriptsOf(templateSource),
    }) +
    [
      '  <main id="main" class="wrap">',
      '    <div id="projects-index" hidden></div>',
      '    <p class="series-back" id="project-back"><a href="projects">&larr; All projects</a></p>',
      '    <article class="pcase" id="project-case">',
      '      <header class="pcase__hero">',
      '        <div class="pcase__intro">',
      `          <p class="pcase__kicker">${escapeHtml(project.kicker)}</p>`,
      `          <h1 class="pcase__name">${escapeHtml(project.title)}</h1>`,
      `          <p class="pcase__summary">${richText(project.summary)}</p>`,
      '        </div>',
      '      </header>',
      '    </article>',
      '    <noscript><p class="muted">Please enable JavaScript to read the full case study.</p></noscript>',
      '  </main>',
    ].join('\n');
  return { file: pageFile(projectPage(project.id)), source, description };
}

/** A series' own page: series.html with the series' title and note already in place. */
function seriesPageSource(series, templateSource) {
  const description = snippet(series.note || `${series.title}, a series by ${ARTIST.name}.`);
  const source =
    frontMatter({
      title: pageTitle(series.title),
      description,
      'og-title': series.title,
      'og-image': `images/og/series-${series.id}.jpg`,
      'og-image-alt': `${plainTitle(series.title)}, a series by ${ARTIST.name}`,
      scripts: scriptsOf(templateSource),
    }) +
    [
      '  <main id="main" class="wrap">',
      '    <p class="series-back" id="series-back"><a href="series">&larr; All series</a></p>',
      `    <h1 class="page-title" id="series-title">${escapeHtml(series.title)}</h1>`,
      `    <p class="series-note" id="series-note">${richText(series.note || '')}</p>`,
      '    <ul class="series-list" id="series-list" hidden></ul>',
      '    <ul class="gallery" id="gallery" hidden></ul>',
      '    <div class="story" id="series-story" hidden></div>',
      '    <!-- A photography series is hung as its own room (js/photo-series.js). -->',
      '    <div id="photo-room" hidden></div>',
      '    <noscript><p class="muted">Please enable JavaScript to view the series.</p></noscript>',
      '  </main>',
    ].join('\n');
  return { file: pageFile(seriesPage(series.id)), source, description };
}

const xmlText = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Every workId named anywhere in a project's case study (hero, figures, rows, grids). */
function projectWorkIds(project) {
  const ids = [];
  const visit = (value) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      if (typeof value.workId === 'string') ids.push(value.workId);
      Object.values(value).forEach(visit);
    }
  };
  visit(project);
  return [...new Set(ids)];
}

/**
 * The pictures each page shows, for the image sitemap (so image search finds work that the page draws with
 * JavaScript): the gallery shows every visible work, a series page its works, a project page its figures.
 * Returns Map(file -> [image path]), the largest file of each picture.
 */
function pageImages({ works, series, projects }) {
  const byId = new Map(works.map((work) => [work.id, work]));
  const paths = (list) => list.filter(Boolean).map((work) => largestUrl(work));
  const images = new Map([['gallery.html', paths(works.filter((work) => !work.hidden))]]);
  series.forEach((entry) => images.set(pageFile(seriesPage(entry.id)), paths(worksInSeries(entry, works))));
  projects.forEach((project) => images.set(pageFile(projectPage(project.id)), paths(projectWorkIds(project).map((id) => byId.get(id)))));
  return images;
}

/**
 * sitemap.xml: every listed page at its clean address, with the date its content last changed (`lastmod`,
 * file -> YYYY-MM-DD) and the pictures it shows (`images`, file -> [path]), when known.
 */
function sitemap(site, files, { lastmod = {}, images = new Map() } = {}) {
  const urls = files.map((file) => {
    const lines = [`    <loc>${xmlText(site.url + (file === 'index.html' ? '' : pageHref(file)))}</loc>`];
    if (lastmod[file]) lines.push(`    <lastmod>${lastmod[file]}</lastmod>`);
    (images.get(file) || []).forEach((image) => lines.push(`    <image:image><image:loc>${xmlText(site.url + image)}</image:loc></image:image>`));
    return ['  <url>', ...lines, '  </url>'].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

function robots(site) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${site.url}sitemap.xml\n`;
}

/** A plain summary of the site for AI assistants (llmstxt.org): who the artist is and where the work is. */
function llms(site, { projects, series }) {
  const link = (title, file, note) => `- [${title}](${site.url}${file})${note ? `: ${snippet(note, 200)}` : ''}`;
  return [
    '# nuances by nafis',
    '',
    `> Portfolio of ${ARTIST.name}, a multidisciplinary artist studying mathematics and studio art, with a minor in data science, at Gettysburg College. Painting, drawing, printmaking, ceramics, photography, digital art and graphic design, and interdisciplinary projects joining art with science and data.`,
    '',
    '## Pages',
    '',
    link('Gallery', 'gallery', 'All works by medium, on a gallery wall or as a grid.'),
    link('Series', 'series', 'Bodies of work built around one idea.'),
    link('Interdisciplinary projects', 'projects', 'Case studies, from the question to the result.'),
    link('Artist statement', 'artist-statement'),
    link('Resume', 'resume'),
    link('Contact', 'contact'),
    '',
    '## Projects',
    '',
    ...projects.map((project) => link(project.title, projectPage(project.id), project.summary)),
    '',
    '## Series',
    '',
    ...series.map((entry) => link(entry.title, seriesPage(entry.id), entry.note)),
    '',
  ].join('\n');
}

module.exports = { ARTIST, snippet, pageTitle, projectPageSource, seriesPageSource, homeJsonLd, workJsonLd, projectWorkIds, pageImages, sitemap, robots, llms };
