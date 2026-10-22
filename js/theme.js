/**
 * Light / dark theme. Follows the device setting until the visitor uses the
 * window in the header (curtains open: light; drawn: dark); that choice is remembered in this browser. Holding the
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

  // The switch is a small white-framed window onto a sunset sea (a crop of photo-0195), with sand sheer curtains
  // on a brass rod: open for the light theme, drawn for the dark. Drawn in SVG, 60 x 76 units.
  const CURTAIN_RINGS = (x) =>
    Array.from({ length: 6 }, (_, i) => `<circle cx="${x + 2 + i * 4.6}" cy="9" r="1.05" fill="none" stroke="url(#tw-brass)" stroke-width="0.6"/>`).join('');
  const CURTAIN = (side, x) =>
    `<g class="theme-window__curtain theme-window__curtain--${side}">` +
    `<rect x="${x}" y="9" width="27" height="53" fill="url(#tw-folds)"/>` +
    `<rect x="${x}" y="9" width="27" height="53" fill="url(#tw-drape)"/>` +
    `<rect x="${x}" y="60.4" width="27" height="1.6" fill="url(#tw-hem)"/>` +
    CURTAIN_RINGS(x) +
    '</g>';
  const GLASS = 'M12 15 H48 V58 H12 Z';
  const BARS = 'M30 15 V58 M12 36.5 H48';
  const WINDOW =
    '<svg class="theme-window" viewBox="0 -2 60 76" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<linearGradient id="tw-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dca3"/><stop offset="0.5" stop-color="#c69a4a"/><stop offset="1" stop-color="#7a5a24"/></linearGradient>' +
    '<radialGradient id="tw-ball" cx="0.35" cy="0.3"><stop offset="0" stop-color="#fff0c6"/><stop offset="0.6" stop-color="#c69a4a"/><stop offset="1" stop-color="#6e5020"/></radialGradient>' +
    '<linearGradient id="tw-fold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#94805f"/><stop offset="0.3" stop-color="#c4a982"/><stop offset="0.55" stop-color="#e2d2b9"/><stop offset="0.8" stop-color="#c4a982"/><stop offset="1" stop-color="#94805f"/></linearGradient>' +
    '<pattern id="tw-folds" width="4.5" height="80" patternUnits="userSpaceOnUse"><rect width="4.5" height="80" fill="url(#tw-fold)"/></pattern>' +
    '<linearGradient id="tw-drape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.12"/><stop offset="0.15" stop-color="#000" stop-opacity="0"/><stop offset="0.85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.16"/></linearGradient>' +
    '<linearGradient id="tw-hem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a765a"/><stop offset="1" stop-color="#6c5c46"/></linearGradient>' +
    '<linearGradient id="tw-sill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf8f2"/><stop offset="1" stop-color="#cfc6b6"/></linearGradient>' +
    '<linearGradient id="tw-shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0.18" stop-color="#fff" stop-opacity="0"/><stop offset="0.26" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.34" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    `<clipPath id="tw-glass"><path d="${GLASS}"/></clipPath>` +
    '</defs>' +
    '<ellipse cx="30" cy="64.5" rx="25" ry="1.6" fill="#000" opacity="0.18"/>' +
    `<path d="${GLASS}" fill="none" stroke="#cfc6b6" stroke-width="7.5" stroke-linejoin="round" transform="translate(0.6 0.9)"/>` +
    '<g clip-path="url(#tw-glass)">' +
    '<image class="theme-window__view" href="images/theme/window-view.jpg" x="12" y="15" width="36" height="43" preserveAspectRatio="xMidYMid slice"/>' +
    '<rect x="12" y="15" width="36" height="43" fill="url(#tw-shine)"/>' +
    `<path d="${GLASS}" fill="none" stroke="#000" stroke-opacity="0.22" stroke-width="2.4"/>` +
    '</g>' +
    `<path d="${BARS}" stroke="#f6f2ea" stroke-width="1.7"/>` +
    `<path d="${BARS}" stroke="#000" stroke-opacity="0.15" stroke-width="0.5" transform="translate(0.7 0.7)"/>` +
    `<path d="${GLASS}" fill="none" stroke="#f6f2ea" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="${GLASS}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="0.6" transform="translate(-0.9 -0.9)"/>` +
    '<rect x="8" y="60" width="44" height="3.6" rx="0.8" fill="url(#tw-sill)"/>' +
    '<rect x="1.5" y="8.1" width="57" height="1.8" rx="0.9" fill="url(#tw-brass)"/>' +
    '<circle cx="1.6" cy="9" r="1.9" fill="url(#tw-ball)"/><circle cx="58.4" cy="9" r="1.9" fill="url(#tw-ball)"/>' +
    CURTAIN('left', 3) +
    CURTAIN('right', 30) +
    '<g class="theme-window__ties"><rect x="2.6" y="41" width="7.6" height="1.6" rx="0.8" fill="url(#tw-brass)"/><rect x="49.8" y="41" width="7.6" height="1.6" rx="0.8" fill="url(#tw-brass)"/></g>' +
    '</svg>';

  function createToggle() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Dark mode');
    button.title = 'Draw or open the curtains. Hold to follow your device.';
    button.innerHTML = WINDOW;
    return button;
  }

  function reflect(button) {
    button.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
  }

  /**
   * Sets the theme (null = follow the device). Going light, the new theme grows out of the window as a circle;
   * going dark, the light theme shrinks back into the window. Falls back to an instant change without view
   * transitions or with reduced motion.
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

    // The reveal itself is CSS keyframes on the view-transition snapshots (see "theme reveal" in styles.css):
    // they apply from the transition's very first frame, so the new theme can never flash in whole first.
    const goingDark = resolveTheme({ chosen: theme, systemPrefersDark: systemDark.matches }) === 'dark';
    const radius = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
    root.style.setProperty('--theme-x', `${origin.x}px`);
    root.style.setProperty('--theme-y', `${origin.y}px`);
    root.style.setProperty('--theme-r', `${Math.ceil(radius)}px`);
    root.classList.add('is-theme-switching');
    root.classList.toggle('is-theme-closing', goingDark);
    const transition = document.startViewTransition(apply);
    transition.finished.finally(() => root.classList.remove('is-theme-switching', 'is-theme-closing'));
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
