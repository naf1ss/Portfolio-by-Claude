/**
 * Light / dark theme. Follows the device setting until the visitor uses the
 * toggle in the header; that choice is remembered in this browser.
 *
 * Loaded synchronously in <head> so a saved choice is applied before the first
 * paint (no flash of the wrong theme). The CSS does the rest: it reads
 * color-scheme, which this script sets through <html data-theme>.
 */
(function () {
  'use strict';

  const { parseTheme, resolveTheme, oppositeTheme } = window.ThemeUtils;
  const STORAGE_KEY = 'theme';
  const SWITCH_DURATION_MS = 1400;

  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Storage can throw (private windows, blocked site data); the theme still works without it.
  function readChoice() {
    try {
      return parseTheme(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return null;
    }
  }

  function saveChoice(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      /* not remembered, still applied */
    }
  }

  const currentTheme = () => resolveTheme({ chosen: root.dataset.theme, systemPrefersDark: systemDark.matches });

  const savedChoice = readChoice();
  if (savedChoice) root.dataset.theme = savedChoice;

  const ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>';

  function createToggle() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Dark mode');
    button.innerHTML = ICON;
    return button;
  }

  function reflect(button) {
    button.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
  }

  /**
   * Switches theme, revealing the new one as a circle growing from the button.
   * Falls back to an instant change without view transitions or with reduced motion.
   */
  function applyTheme(theme, origin) {
    const apply = () => {
      root.dataset.theme = theme;
    };
    if (!document.startViewTransition || reducedMotion.matches) {
      apply();
      return;
    }

    const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
    root.classList.add('is-theme-switching');
    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
          { duration: SWITCH_DURATION_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
        )
      )
      .catch(() => {});
    transition.finished.finally(() => root.classList.remove('is-theme-switching'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const button = createToggle();
    reflect(button);
    header.append(button);

    button.addEventListener('click', () => {
      const next = oppositeTheme(currentTheme());
      const rect = button.getBoundingClientRect();
      saveChoice(next);
      applyTheme(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      button.setAttribute('aria-pressed', String(next === 'dark'));
    });

    // With no saved choice the page follows the device, including live changes.
    systemDark.addEventListener('change', () => reflect(button));
  });
})();
