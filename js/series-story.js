/**
 * Renders a series' write-up (js/series-stories.js): pictures beside their text, so a reader can look at the
 * work while reading about it. Exposes window.SeriesStory.render(container, story, { note, byId }).
 *
 * Pictures are links with data-work-id, so the page's viewer opens them full screen.
 */
(function () {
  'use strict';

  const U = window.WorksUtils;
  const PICTURE_SIZES = '(min-width: 56rem) 50vw, 92vw';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** The whole work, uncropped, as a link the viewer opens. */
  function picture(work, caption) {
    const figure = element('figure', 'story__media');
    if (!work) return figure;
    const link = element('a');
    link.href = U.hashForWork(work);
    link.dataset.workId = work.id;
    link.setAttribute('aria-label', `View ${work.title || 'this work'} full screen`);
    const img = new Image();
    img.alt = U.altText(work);
    img.width = work.w;
    img.height = work.h;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.sizes = PICTURE_SIZES;
    img.srcset = U.buildSrcset(work);
    img.src = U.fallbackUrl(work);
    link.append(img);
    figure.append(link);
    if (caption) figure.append(element('figcaption', undefined, caption));
    return figure;
  }

  function pair(media, text, { flip = false, className = '' } = {}) {
    const section = element('section', `story__pair${flip ? ' story__pair--flip' : ''}${className ? ` ${className}` : ''}`);
    section.append(media, text);
    return section;
  }

  function intro(story, { note, byId }) {
    const text = element('div', 'story__text');
    if (note) text.append(element('p', 'story__lede', note));
    if (story.intro.lead) text.append(element('p', 'story__prose', story.intro.lead));
    if (story.intro.chapters) {
      const list = element('ol', 'story__index');
      story.chapters.forEach((chapter) => {
        const link = element('a');
        link.href = `#${chapter.id}`;
        link.append(element('span', undefined, chapter.label), element('em', undefined, chapter.maker));
        const item = element('li');
        item.append(link);
        list.append(item);
      });
      text.append(list);
    }
    return pair(picture(byId.get(story.intro.workId)), text, { className: 'story__pair--intro' });
  }

  function chapter(entry, flip, byId) {
    const text = element('div', 'story__text');
    text.append(
      element('p', 'story__kicker', `${entry.label} · led by ${entry.maker}`),
      element('h2', 'story__title', entry.title),
      element('p', 'story__prose', entry.lead)
    );
    text.lastChild.classList.add('story__lead');

    const source = element('div', 'story__source');
    source.append(element('p', 'story__source-name', entry.source.name), element('p', 'story__listing', entry.source.listing));
    if (entry.source.url) {
      const link = element('a', 'story__link', 'See it at Schaller Gallery ↗');
      link.href = entry.source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      source.append(link);
    }
    text.append(source);

    const absorbs = element('div', 'story__absorbs');
    absorbs.append(element('p', 'eyebrow', `All three makers in ${entry.label.toLowerCase()}`));
    const list = element('ul');
    entry.absorbs.forEach(({ maker, text: line }) => {
      const item = element('li');
      item.append(element('b', undefined, maker), element('span', undefined, line));
      list.append(item);
    });
    absorbs.append(list);
    text.append(absorbs);

    if (entry.glazes) {
      const glazes = element('p', 'story__glazes');
      glazes.append(element('b', undefined, 'Glazes: '), entry.glazes);
      text.append(glazes);
    }

    const section = pair(picture(byId.get(entry.workId)), text, { flip });
    section.id = entry.id;
    section.setAttribute('aria-label', `${entry.label}, led by ${entry.maker}`);
    return section;
  }

  function related(entry, byId) {
    const text = element('div', 'story__text');
    text.append(element('h2', 'eyebrow', entry.title));
    const compare = element('div', 'story__compare');
    entry.items.forEach((item) => {
      const block = element('div');
      block.append(element('h3', undefined, item.title), element('p', 'story__prose', item.text));
      compare.append(block);
    });
    text.append(compare);
    if (entry.note) text.append(element('p', 'story__prose story__note', entry.note));
    return pair(picture(byId.get(entry.workId), entry.caption), text);
  }

  function closing(entry) {
    const section = element('section', 'story__closing');
    const process = element('div');
    process.append(element('h2', 'eyebrow', 'Process'));
    const steps = element('ol', 'story__steps');
    entry.process.forEach((step) => {
      const item = element('li');
      const body = element('div');
      body.append(element('b', undefined, step.title), element('span', undefined, step.text));
      item.append(body);
      steps.append(item);
    });
    process.append(steps);

    const reflection = element('div');
    reflection.append(element('h2', 'eyebrow', 'Reflection'));
    const prose = element('div', 'story__prose');
    entry.reflection.forEach((paragraph) => prose.append(element('p', undefined, paragraph)));
    reflection.append(prose);

    section.append(process, reflection);
    return section;
  }

  function render(container, story, { note, byId }) {
    const blocks = [];
    if (story.intro) blocks.push(intro(story, { note, byId }));
    (story.chapters || []).forEach((entry, i) => blocks.push(chapter(entry, i % 2 === 0, byId)));
    if (story.related) blocks.push(related(story.related, byId));
    if (story.closing) blocks.push(closing(story.closing));
    container.replaceChildren(...blocks);
    container.hidden = false;
  }

  window.SeriesStory = { render };
})();
