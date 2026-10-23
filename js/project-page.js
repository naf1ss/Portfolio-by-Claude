/**
 * Renders a project's case study (js/projects-data.js): a hero, the project at a glance, a contents rail that
 * follows the reader, and the sections in order, each built from typed blocks. Pictures are always shown whole
 * and link to the page's viewer (data-work-id). Exposes window.ProjectPage.{ renderList, renderCase }.
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

  /** A paragraph (or other inline container) in which *asterisks* mark a title, set in italics. */
  function paragraph(text, className, tag = 'p') {
    const node = element(tag, className);
    text.split(/\*([^*]+)\*/).forEach((part, i) => {
      if (part) node.append(i % 2 === 1 ? element('i', undefined, part) : part);
    });
    return node;
  }

  /** The whole picture (never cropped), as a link the viewer opens. */
  function image(work, sizes) {
    const link = element('a', 'pcase__image');
    link.href = U.hashForWork(work);
    link.dataset.workId = work.id;
    link.setAttribute('aria-label', `View ${work.title || 'this image'} full screen`);
    const img = new Image();
    img.alt = U.altText(work);
    img.width = work.w;
    img.height = work.h;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.sizes = sizes;
    img.srcset = U.buildSrcset(work);
    img.src = U.fallbackUrl(work);
    link.append(img);
    return link;
  }

  function figure(work, { caption, label, sizes = '(min-width: 64rem) 60vw, 92vw', className = 'pcase__figure' } = {}) {
    const node = element('figure', className);
    node.append(image(work, sizes));
    if (caption || label) {
      const text = element('figcaption');
      if (label) text.append(element('b', undefined, label));
      if (caption) text.append(element('span', undefined, caption));
      node.append(text);
    }
    return node;
  }

  const BLOCKS = {
    text: ({ paragraphs }) => {
      const prose = element('div', 'pcase__prose');
      paragraphs.forEach((text) => prose.append(paragraph(text)));
      return prose;
    },

    question: ({ text }) => {
      const block = element('blockquote', 'pcase__question');
      block.append(element('p', 'pcase__eyebrow', 'Research question'), element('p', undefined, text));
      return block;
    },

    criteria: ({ items }) => {
      const block = element('div', 'pcase__criteria');
      block.append(element('p', 'pcase__eyebrow', 'Design criteria'));
      const list = element('ul');
      items.forEach(({ title, text }) => {
        const item = element('li');
        item.append(element('b', undefined, title), element('span', undefined, text));
        list.append(item);
      });
      block.append(list);
      return block;
    },

    stats: ({ items }) => {
      const list = element('dl', 'pcase__stats');
      items.forEach(({ value, label }) => {
        const item = element('div');
        item.append(element('dt', undefined, value), element('dd', undefined, label));
        list.append(item);
      });
      return list;
    },

    figure: ({ workId, caption, size }, byId) => {
      const work = byId.get(workId);
      if (!work) return null;
      const className = size ? `pcase__figure pcase__figure--${size}` : 'pcase__figure';
      return figure(work, { caption, className });
    },

    // Side by side at one height: each picture's share of the row follows its shape, so none is cropped.
    row: ({ items }, byId) => {
      const row = element('div', 'pcase__row');
      items.forEach(({ workId, caption, label }) => {
        const work = byId.get(workId);
        if (!work) return;
        const item = figure(work, { caption, label, sizes: '(min-width: 64rem) 30vw, 92vw' });
        item.style.setProperty('--ar', U.aspectRatio(work));
        row.append(item);
      });
      return row;
    },

    // `columns` fixes the count on wide screens, so a set such as ten panels falls into even rows.
    grid: ({ items, columns }, byId) => {
      const grid = element('div', 'pcase__grid');
      if (columns) {
        grid.classList.add('pcase__grid--fixed');
        grid.style.setProperty('--columns', columns);
      }
      items.forEach(({ workId, label, caption }) => {
        const work = byId.get(workId);
        if (work) grid.append(figure(work, { label, caption, sizes: '(min-width: 64rem) 20vw, 46vw', className: 'pcase__figure pcase__figure--station' }));
      });
      return grid;
    },

    compare: ({ items }, byId) => {
      const pair = element('div', 'pcase__compare');
      items.forEach(({ workId, label, caption }, i) => {
        const work = byId.get(workId);
        if (!work) return;
        const item = figure(work, { label, caption, sizes: '(min-width: 64rem) 30vw, 92vw' });
        item.style.setProperty('--ar', U.aspectRatio(work));
        pair.append(item);
        if (i === 0 && items.length > 1) {
          const arrow = element('span', 'pcase__arrow', '→');
          arrow.setAttribute('aria-hidden', 'true');
          pair.append(arrow);
        }
      });
      return pair;
    },

    // Questions put to a collaborator, each with what was learned and what it meant for the work.
    findings: ({ items }) => {
      const list = element('ol', 'pcase__findings');
      items.forEach(({ question, answer, implication }) => {
        const item = element('li');
        item.append(element('p', 'pcase__finding-q', question), paragraph(answer, 'pcase__finding-a'));
        if (implication) {
          const note = element('p', 'pcase__finding-i');
          note.append(element('b', undefined, 'For the design: '), implication);
          item.append(note);
        }
        list.append(item);
      });
      return list;
    },

    decision: ({ title, text }) => {
      const block = element('aside', 'pcase__decision');
      block.append(element('p', 'pcase__eyebrow', 'Key decision'), element('h3', undefined, title), paragraph(text));
      return block;
    },

    outcomes: ({ items }) => {
      const list = element('ul', 'pcase__outcomes');
      items.forEach(({ title, text, status }) => {
        const item = element('li');
        const head = element('div');
        head.append(element('b', undefined, title));
        if (status) head.append(element('span', 'pcase__status', status));
        item.append(head, paragraph(text));
        list.append(item);
      });
      return list;
    },

    changes: ({ items }) => {
      const block = element('div', 'pcase__changes');
      block.append(element('p', 'pcase__eyebrow', 'From proposal to practice'));
      const table = element('dl');
      items.forEach(({ title, from, to }) => {
        const row = element('div');
        const change = element('dd');
        change.append(element('s', undefined, from), element('span', 'pcase__to', to));
        row.append(element('dt', undefined, title), change);
        table.append(row);
      });
      block.append(table);
      return block;
    },

    link: ({ text, url }) => {
      const link = element('a', 'button pcase__link', `${text} ↗`);
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      return link;
    },

    credits: ({ text }) => element('p', 'pcase__credits', text),
  };

  function section(entry, byId) {
    const node = element('section', 'pcase__section');
    node.id = entry.id;
    const head = element('header', 'pcase__head');
    if (entry.number) head.append(element('span', 'pcase__number', entry.number));
    head.append(element('p', 'pcase__eyebrow', entry.label), element('h2', 'pcase__title', entry.title));
    node.append(head);
    entry.blocks.forEach((block) => {
      const build = BLOCKS[block.type];
      const built = build ? build(block, byId) : null;
      if (built) node.append(built);
    });
    return node;
  }

  /**
   * The contents rail, turning like a wheel: the section in view sits in the middle at full strength, and the
   * others fade and tilt away the further they are from it (CSS reads --wheel and each link's --d).
   */
  function contents(sections) {
    const nav = element('nav', 'pcase__contents');
    nav.setAttribute('aria-label', 'Contents');
    const list = element('ol');
    const links = new Map();
    sections.forEach(({ id, label, number }) => {
      const link = element('a');
      link.href = `#${id}`;
      link.title = label;
      link.append(element('span', 'pcase__contents-number', number || ''), element('span', 'pcase__contents-label', label));
      links.set(id, link);
      const item = element('li');
      item.append(link);
      list.append(item);
    });
    nav.append(list);
    return { nav, links };
  }

  function setCurrent(nav, links, currentId) {
    const ids = [...links.keys()];
    const current = Math.max(0, ids.indexOf(currentId));
    nav.style.setProperty('--wheel', current);
    ids.forEach((id, i) => {
      const link = links.get(id);
      link.style.setProperty('--d', Math.abs(i - current));
      link.style.setProperty('--s', Math.sign(i - current));
      link.toggleAttribute('aria-current', i === current);
    });
  }

  function watchContents(container, nav, links) {
    setCurrent(nav, links, links.keys().next().value);
    if (!('IntersectionObserver' in window)) return;
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id)));
        const current = [...links.keys()].find((id) => visible.has(id));
        if (current) setCurrent(nav, links, current);
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    container.querySelectorAll('.pcase__section').forEach((node) => observer.observe(node));
  }

  function renderCase(container, project, { byId }) {
    const hero = element('header', 'pcase__hero');
    hero.append(
      element('p', 'pcase__kicker', project.kicker),
      element('h1', 'pcase__name', project.title),
      paragraph(project.summary, 'pcase__summary')
    );
    const heroWork = byId.get(project.hero.workId);
    if (heroWork) {
      const heroFigure = figure(heroWork, { caption: project.hero.caption, sizes: '96vw', className: 'pcase__figure pcase__figure--hero' });
      // An optional link beside the caption, e.g. to a collaborating artist's own site.
      if (project.hero.link) {
        const { text, url } = project.hero.link;
        const link = element('a', 'pcase__figure-link', `${text} ↗`);
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        heroFigure.querySelector('figcaption').append(link);
      }
      hero.append(heroFigure);
    }

    const glance = element('dl', 'pcase__glance');
    project.glance.forEach(({ label, text }) => {
      const item = element('div');
      item.append(element('dt', undefined, label), element('dd', undefined, text));
      glance.append(item);
    });

    const { nav, links } = contents(project.sections);
    const body = element('div', 'pcase__body');
    project.sections.forEach((entry) => body.append(section(entry, byId)));
    const layout = element('div', 'pcase__layout');
    layout.append(nav, body);

    container.replaceChildren(hero, glance, layout);
    container.hidden = false;
    watchContents(container, nav, links);
  }

  /**
   * The projects list, an index: each row is numbered, its text leads and its cover follows, shown whole at a
   * capped height so a tall photograph and a long panorama sit at a similar visual weight.
   */
  function renderList(list, projects, { byId, hrefFor }) {
    const items = projects.map((project, i) => {
      const item = element('li');
      const link = element('a', 'project-card');
      link.href = hrefFor(project);
      const text = element('span', 'project-card__text');
      text.append(
        element('span', 'project-card__index', String(i + 1).padStart(2, '0')),
        element('span', 'project-card__kicker', project.kicker),
        element('span', 'project-card__title', project.title),
        paragraph(project.summary, 'project-card__summary', 'span'),
        element('span', 'project-card__more', `${project.cta || 'Read the project'} →`)
      );
      link.append(text);
      const cover = byId.get(project.cover);
      if (cover) {
        const img = new Image();
        img.alt = '';
        img.width = cover.w;
        img.height = cover.h;
        img.loading = i === 0 ? 'eager' : 'lazy';
        img.decoding = 'async';
        img.sizes = '(min-width: 56rem) 45vw, 92vw';
        img.srcset = U.buildSrcset(cover);
        img.src = U.fallbackUrl(cover);
        const frame = element('span', 'project-card__image');
        frame.append(img);
        link.append(frame);
      }
      item.append(link);
      return item;
    });
    list.replaceChildren(...items);
  }

  window.ProjectPage = { renderCase, renderList };
})();
