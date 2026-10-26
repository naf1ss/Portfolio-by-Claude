/**
 * Phone menu: on narrow screens the header links fold behind a Menu button and open as a full-screen panel.
 *
 * Runs in <head> (not deferred) so `has-menu` is set before the first paint and the links never flash open.
 * Without JavaScript the class is never set and the links simply stay visible in the header.
 */
(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('has-menu');

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('.menu-toggle');
    const nav = document.getElementById('site-nav');
    if (!button || !nav) return;

    const isOpen = () => root.classList.contains('is-menu-open');

    function setOpen(open, { returnFocus = false } = {}) {
      root.classList.toggle('is-menu-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) nav.querySelector('a').focus({ preventScroll: true });
      else if (returnFocus) button.focus({ preventScroll: true });
    }

    // On phones the theme window leaves the header (where it crowded the Menu button) for the foot of the
    // panel, with a label; on wider screens it goes back beside the links. theme.js adds it to the header
    // on DOMContentLoaded, before this listener runs.
    const themeToggle = document.querySelector('.site-header > .theme-toggle');
    const themeSlot = document.createElement('div');
    themeSlot.className = 'site-nav__theme';
    const themeLabel = document.createElement('span');
    themeLabel.className = 'site-nav__theme-label';
    themeLabel.textContent = 'Light or dark';
    themeSlot.append(themeLabel);
    nav.append(themeSlot);
    const phone = window.matchMedia('(max-width: 40rem)');
    const placeThemeToggle = () => {
      if (!themeToggle) return;
      if (phone.matches) themeSlot.prepend(themeToggle);
      else button.parentElement.append(themeToggle);
    };
    placeThemeToggle();
    phone.addEventListener('change', placeThemeToggle);

    button.addEventListener('click', () => setOpen(!isOpen()));
    // A link to the page already open (or to another filter of it) should still close the panel.
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) setOpen(false, { returnFocus: true });
    });
    // Rotating to a wide screen shows the normal header again.
    window.matchMedia('(min-width: 40.0625rem)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  });
})();
