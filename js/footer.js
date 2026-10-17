/**
 * Builds the site footer into <footer data-site-footer>. The markup lives here
 * once instead of being copied into every page; the HTML keeps only a one-line
 * copyright as a fallback for when scripts are off.
 */
(function () {
  'use strict';

  const NAV_LINKS = [
    { label: 'Work', href: 'work.html' },
    { label: 'About', href: 'about.html' },
    { label: 'Resume', href: 'resume.html' },
    { label: 'Contact', href: 'contact.html' },
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function linkList(links) {
    const list = element('ul', 'footer__list');
    links.forEach(({ label, href }) => {
      const link = element('a', '', label);
      link.href = href;
      const item = element('li');
      item.append(link);
      list.append(item);
    });
    return list;
  }

  function column(heading, links) {
    const section = element('nav');
    section.setAttribute('aria-label', heading);
    section.append(element('h2', 'footer__heading', heading), linkList(links));
    return section;
  }

  function brandBlock() {
    const block = element('div');
    const brand = element('a', 'footer__brand');
    brand.href = 'index.html';
    brand.setAttribute('aria-label', 'nuances by Nafis, home');
    brand.append(element('span', 'footer__name', 'nuances'), element('span', 'footer__by', 'by Nafis'));
    block.append(
      brand,
      element('p', 'footer__tagline', 'Paintings, prints, ceramics and photographs by Nafis.')
    );
    return block;
  }

  function bottomBar() {
    const bar = element('div', 'wrap footer__bottom');
    const top = element('a', 'footer__top-link', 'Back to top ↑');
    top.href = '#';
    bar.append(
      element('p', '', `© ${new Date().getFullYear()} Nafis. All images © the artist.`),
      top
    );
    return bar;
  }

  function renderFooter(footer) {
    const config = window.SITE_CONFIG || {};
    const elsewhere = window.ContactUtils
      ? window.ContactUtils.contactEntries(config.contact).map(({ label, href }) => ({ label, href }))
      : [];

    const top = element('div', 'wrap footer__top');
    top.append(brandBlock(), column('Explore', NAV_LINKS));
    if (elsewhere.length > 0) top.append(column('Elsewhere', elsewhere));

    footer.replaceChildren(top, bottomBar());
    if (window.Motion) window.Motion.reveal(top.children);
  }

  const footer = document.querySelector('[data-site-footer]');
  if (footer) renderFooter(footer);
})();
