/**
 * Pure theme rules, kept apart from the DOM so they can be unit tested.
 * A visitor's saved choice wins; otherwise the device setting decides.
 */
(function (root, utils) {
  if (typeof module === 'object' && module.exports) {
    module.exports = utils;
  } else {
    root.ThemeUtils = utils;
  }
})(typeof self !== 'undefined' ? self : this, (function () {
  'use strict';

  const THEMES = ['light', 'dark'];

  /** Returns a stored value only if it is a known theme (storage can hold anything). */
  function parseTheme(value) {
    return THEMES.includes(value) ? value : null;
  }

  function resolveTheme({ chosen, systemPrefersDark }) {
    return parseTheme(chosen) || (systemPrefersDark ? 'dark' : 'light');
  }

  function oppositeTheme(theme) {
    return theme === 'dark' ? 'light' : 'dark';
  }

  return { THEMES, parseTheme, resolveTheme, oppositeTheme };
})());
