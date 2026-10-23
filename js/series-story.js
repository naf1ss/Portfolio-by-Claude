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

  /** A paragraph in which *asterisks* mark titles of works, set in italics. */
  function paragraph(text) {
    const node = element('p');
    text.split(/\*([^*]+)\*/).forEach((part, i) => {
      if (!part) return;
      node.append(i % 2 === 1 ? element('i', undefined, part) : part);
    });
    return node;
  }

  function paragraphs(className, list) {
    const prose = element('div', className);
    list.forEach((text) => prose.append(paragraph(text)));
    return prose;
  }

  /** The opening: a picture beside the series' note, a line under it, and the chapters as links. */
  function intro(story, { note, byId }) {
    const text = element('div', 'story__text');
    if (note) text.append(element('p', 'story__lede', note));
    if (story.intro.lead) {
      const lines = Array.isArray(story.intro.lead) ? story.intro.lead : [story.intro.lead];
      text.append(paragraphs('story__prose story__intro-lead', lines));
    }
    if (story.intro.facts) {
      // The project's particulars (programme, mentor, role...) as a short list of label and value.
      const facts = element('dl', 'story__facts');
      story.intro.facts.forEach(({ label, text: value }) => {
        const row = element('div');
        row.append(element('dt', undefined, label), element('dd', undefined, value));
        facts.append(row);
      });
      text.append(facts);
    }
    if (story.intro.index) {
      const list = element('ol', 'story__index');
      story.chapters.forEach((chapter) => {
        const link = element('a');
        link.href = `#${chapter.id}`;
        link.append(element('span', undefined, chapter.label), element('em', undefined, chapter.aside || ''));
        const item = element('li');
        item.append(link);
        list.append(item);
      });
      text.append(list);
    }
    if (!story.intro.workId) {
      // No picture: the opening reads on its own, at a comfortable measure.
      const section = element('section', 'story__pair story__pair--intro story__pair--text');
      section.append(text);
      return section;
    }
    return pair(picture(byId.get(story.intro.workId), story.intro.caption), text, { className: 'story__pair--intro' });
  }

  function chapter(entry, flip, byId) {
    const text = element('div', 'story__text');
    if (entry.kicker) text.append(element('p', 'story__kicker', entry.kicker));
    text.append(element('h2', 'story__title', entry.title), paragraphs('story__prose story__lead', entry.text));

    if (entry.source) {
      const source = element('div', 'story__source');
      source.append(element('p', 'story__source-name', entry.source.name), element('p', 'story__listing', entry.source.listing));
      if (entry.source.url) {
        const link = element('a', 'story__link', `${entry.source.linkText || 'See the source'} ↗`);
        link.href = entry.source.url;
        link.target = '_blank';
        link.rel = 'noopener';
        source.append(link);
      }
      text.append(source);
    }

    // A short list under an eyebrow: "All three makers in the plate", "Still to develop", ...
    if (entry.points) {
      const points = element('div', 'story__points');
      points.append(element('p', 'eyebrow', entry.points.title));
      const list = element('ul');
      entry.points.items.forEach(({ label, text: line }) => {
        const item = element('li');
        if (label) item.append(element('b', undefined, label));
        else item.classList.add('is-unlabelled');
        item.append(element('span', undefined, line));
        list.append(item);
      });
      points.append(list);
      text.append(points);
    }

    if (entry.detail) {
      const detail = element('p', 'story__detail');
      detail.append(element('b', undefined, `${entry.detail.label}: `), entry.detail.text);
      text.append(detail);
    }

    const section = pair(picture(byId.get(entry.workId), entry.caption), text, { flip });
    section.id = entry.id;
    section.setAttribute('aria-label', entry.kicker || entry.title);
    return section;
  }

  /** A row of small photographs under an eyebrow, each with a bold label and a caption (a chapter's `strip`). */
  function strip(entry, byId) {
    const section = element('section', 'story__strip');
    section.append(element('h3', 'eyebrow', entry.title));
    const list = element('ol');
    entry.items.forEach(({ workId, label, caption }) => {
      const work = byId.get(workId);
      if (!work) return;
      const item = element('li');
      const figure = picture(work);
      figure.classList.add('story__strip-item');
      const text = element('figcaption');
      if (label) text.append(element('b', undefined, label));
      if (caption) text.append(element('span', undefined, caption));
      figure.append(text);
      item.append(figure);
      list.append(item);
    });
    section.append(list);
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

  /** Numbered process steps under a "Process" eyebrow. */
  function processSteps(steps, title = 'Process') {
    const block = element('div');
    block.append(element('h2', 'eyebrow', title));
    const list = element('ol', 'story__steps');
    steps.forEach((step) => {
      const item = element('li');
      const body = element('div');
      body.append(element('b', undefined, step.title), element('span', undefined, step.text));
      item.append(body);
      list.append(item);
    });
    block.append(list);
    return block;
  }

  /** The process as a band across the page, read before the works (a story's top-level `process`). */
  function processBand(steps, title) {
    const section = element('section', 'story__process');
    section.append(processSteps(steps, title));
    return section;
  }

  /** Process steps (optional) beside the reflection; `reflectionFirst` puts the reflection on the left. */
  function closing(entry) {
    const section = element('section', 'story__closing');
    const steps = entry.process ? processSteps(entry.process, entry.processTitle) : null;
    if (!steps) section.classList.add('story__closing--single');
    if (steps && entry.reflectionFirst) section.classList.add('story__closing--reflection-first');
    if (steps && !entry.reflectionFirst) section.append(steps);

    const reflection = element('div');
    reflection.append(element('h2', 'eyebrow', entry.reflectionTitle || 'Reflection'), paragraphs('story__prose', entry.reflection));
    if (entry.credits) reflection.append(element('p', 'story__credits', entry.credits));
    section.append(reflection);
    if (steps && entry.reflectionFirst) section.append(steps);
    return section;
  }

  /** A museum-style caption: the title in italics and the year, then medium and size. */
  function labelCaption(work) {
    const caption = element('figcaption', 'story__label');
    const head = element('span', 'story__label-head');
    head.append(element('i', undefined, work.title || 'Untitled'));
    if (work.year) head.append(`, ${work.year}`);
    caption.append(head);
    const facts = [work.medium, work.dimensions && U.formatDimensions(work.dimensions)].filter(Boolean).join(', ');
    if (facts) caption.append(element('span', 'story__label-facts', facts));
    return caption;
  }

  /** The works side by side, each with its label and the words about it underneath. */
  function set(entries, byId) {
    const section = element('section', 'story__set');
    entries.forEach((entry) => {
      const work = byId.get(entry.workId);
      if (!work) return;
      const column = element('article', 'story__set-item');
      column.id = entry.id || work.id.toLowerCase();
      const figure = picture(work);
      figure.append(labelCaption(work));
      column.append(figure, paragraphs('story__prose', entry.text));
      section.append(column);
    });
    return section;
  }

  function render(container, story, { note, byId }) {
    const blocks = [];
    if (story.works) blocks.push(set(story.works, byId));
    if (story.intro) blocks.push(intro(story, { note, byId }));
    if (story.process) blocks.push(processBand(story.process, story.processTitle));
    (story.chapters || []).forEach((entry, i) => {
      blocks.push(chapter(entry, i % 2 === 0, byId));
      if (entry.strip) blocks.push(strip(entry.strip, byId));
    });
    if (story.related) blocks.push(related(story.related, byId));
    if (story.closing) blocks.push(closing(story.closing));
    container.replaceChildren(...blocks);
    container.hidden = false;
  }

  window.SeriesStory = { render };
})();
