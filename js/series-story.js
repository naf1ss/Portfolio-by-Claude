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

  function paragraphs(className, list) {
    const prose = element('div', className);
    list.forEach((text) => prose.append(element('p', undefined, text)));
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
  function processSteps(steps) {
    const block = element('div');
    block.append(element('h2', 'eyebrow', 'Process'));
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
  function processBand(steps) {
    const section = element('section', 'story__process');
    section.append(processSteps(steps));
    return section;
  }

  /** Process steps (optional) beside the reflection. */
  function closing(entry) {
    const section = element('section', 'story__closing');
    if (entry.process) {
      section.append(processSteps(entry.process));
    } else {
      section.classList.add('story__closing--single');
    }

    const reflection = element('div');
    reflection.append(element('h2', 'eyebrow', entry.reflectionTitle || 'Reflection'), paragraphs('story__prose', entry.reflection));
    section.append(reflection);
    return section;
  }

  function render(container, story, { note, byId }) {
    const blocks = [];
    if (story.intro) blocks.push(intro(story, { note, byId }));
    if (story.process) blocks.push(processBand(story.process));
    (story.chapters || []).forEach((entry, i) => blocks.push(chapter(entry, i % 2 === 0, byId)));
    if (story.related) blocks.push(related(story.related, byId));
    if (story.closing) blocks.push(closing(story.closing));
    container.replaceChildren(...blocks);
    container.hidden = false;
  }

  window.SeriesStory = { render };
})();
