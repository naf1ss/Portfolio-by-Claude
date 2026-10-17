/**
 * Light / dark theme. Follows the device setting until the visitor uses the
 * toggle in the header; that choice is remembered in this browser. Holding the
 * toggle down (or Shift + click / Shift + Enter) forgets the choice and goes
 * back to following the device.
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
  const HOLD_TO_RESET_MS = 650;
  const STATUS_VISIBLE_MS = 2200;

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
      if (theme) localStorage.setItem(STORAGE_KEY, theme);
      else localStorage.removeItem(STORAGE_KEY);
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
    button.title = 'Switch theme. Hold to follow your device.';
    button.innerHTML = ICON;
    return button;
  }

  function reflect(button) {
    button.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
  }

  /**
   * Sets the theme (null = follow the device), revealing it as a circle growing from the button.
   * Falls back to an instant change without view transitions or with reduced motion.
   */
  function applyTheme(theme, origin) {
    const apply = () => {
      if (theme) root.dataset.theme = theme;
      else delete root.dataset.theme;
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

    const status = document.createElement('p');
    status.className = 'theme-status';
    status.setAttribute('role', 'status');
    document.body.append(status);
    let statusTimer = null;
    function announce(message) {
      status.textContent = message;
      status.classList.add('is-shown');
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => status.classList.remove('is-shown'), STATUS_VISIBLE_MS);
    }

    const originOf = () => {
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    function chooseTheme(theme) {
      saveChoice(theme);
      applyTheme(theme, originOf());
      // The device setting decides when nothing is chosen.
      button.setAttribute('aria-pressed', String((theme || (systemDark.matches ? 'dark' : 'light')) === 'dark'));
    }

    function followDevice() {
      chooseTheme(null);
      announce('Following your device');
    }

    // A long press resets; the click that ends it must not also toggle.
    let holdTimer = null;
    let holdFired = false;
    button.addEventListener('pointerdown', () => {
      holdFired = false;
      holdTimer = setTimeout(() => {
        holdFired = true;
        followDevice();
      }, HOLD_TO_RESET_MS);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) =>
      button.addEventListener(type, () => clearTimeout(holdTimer))
    );
    button.addEventListener('contextmenu', (event) => event.preventDefault());

    button.addEventListener('click', (event) => {
      if (holdFired) {
        holdFired = false;
        return;
      }
      if (event.shiftKey) followDevice();
      else chooseTheme(oppositeTheme(currentTheme()));
    });

    // With no saved choice the page follows the device, including live changes.
    systemDark.addEventListener('change', () => reflect(button));
  });
})();
