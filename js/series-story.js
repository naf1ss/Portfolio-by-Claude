/**
 * Renders a series' long-form story (js/series-stories.js) under its works on the series page.
 * Exposes window.SeriesStory.render(container, story, { byId }).
 */
(function () {
  'use strict';

  const U = window.WorksUtils;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** A small picture of one of the artist's works, at its own proportions. */
  function thumbnail(work, sizes) {
    if (!work) return null;
    const img = new Image();
    img.className = 'story__thumb';
    img.alt = U.altText(work);
    img.width = work.w;
    img.height = work.h;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.sizes = sizes;
    img.srcset = U.buildSrcset(work);
    img.src = U.fallbackUrl(work);
    return img;
  }

  function sectionShell(title, intro) {
    const section = element('section', 'story__section');
    const head = element('div', 'section__head');
    head.append(element('h2', 'eyebrow', title));
    section.append(head);
    if (intro) section.append(element('p', 'story__intro', intro));
    return section;
  }

  const renderers = {
    text(section) {
      const body = element('div', 'story__prose');
      section.paragraphs.forEach((text) => body.append(element('p', undefined, text)));
      return body;
    },

    list(section) {
      const list = element(section.ordered ? 'ol' : 'ul', 'story__list');
      section.items.forEach((text) => list.append(element('li', undefined, text)));
      return list;
    },

    sources(section) {
      const grid = element('div', 'story__sources');
      section.items.forEach((source) => {
        // The pots themselves are pictured under "How every pot absorbs all three"; a source card stays text.
        const card = element('article', 'story__source');
        card.append(
          element('p', 'story__kicker', source.piece),
          element('h3', 'story__maker', source.maker),
          element('p', 'story__listing', source.listing),
          element('p', 'story__label', source.onMine.label),
          element('p', 'story__lead', source.onMine.text),
          element('p', 'story__carries', source.carries)
        );
        if (source.url) {
          const link = element('a', 'text-link', 'See the source at Schaller Gallery ↗');
          link.href = source.url;
          link.target = '_blank';
          link.rel = 'noopener';
          card.append(link);
        }
        grid.append(card);
      });
      return grid;
    },

    compare(section) {
      const wrap = element('div');
      const grid = element('div', 'story__compare');
      section.items.forEach((item) => {
        const block = element('div', 'story__compare-item');
        block.append(element('h3', 'story__subtitle', item.title), element('p', undefined, item.text));
        grid.append(block);
      });
      wrap.append(grid);
      if (section.note) wrap.append(element('p', 'story__note', section.note));
      return wrap;
    },

    columns(section, { byId }) {
      const grid = element('div', 'story__columns');
      section.columns.forEach((column) => {
        const block = element('article', 'story__column');
        const picture = thumbnail(byId.get(column.workId), '(min-width: 56rem) 26vw, 80vw');
        if (picture) block.append(picture);
        block.append(element('h3', 'story__subtitle', column.title));
        if (column.glaze) block.append(element('p', 'story__glaze', `Glazes: ${column.glaze}`));
        const list = element('ul', 'story__list story__list--plain');
        column.items.forEach((text) => list.append(element('li', undefined, text)));
        block.append(list);
        grid.append(block);
      });
      return grid;
    },

    steps(section) {
      const list = element('ol', 'story__steps');
      section.items.forEach((step) => {
        const item = element('li');
        item.append(element('h3', 'story__subtitle', step.title), element('p', undefined, step.text));
        list.append(item);
      });
      return list;
    },
  };

  function render(container, story, { byId }) {
    const blocks = [];
    story.sections.forEach((section) => {
      const renderer = renderers[section.kind];
      if (!renderer) return;
      const shell = sectionShell(section.title, section.intro);
      shell.append(renderer(section, { byId }));
      blocks.push(shell);
    });
    container.replaceChildren(...blocks);
    container.hidden = false;
  }

  window.SeriesStory = { render };
})();
