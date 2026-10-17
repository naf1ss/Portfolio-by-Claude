/**
 * Pure rules for the opening animation (the big "n." that settles into the
 * header logo). Kept free of the DOM so they can be unit tested.
 */
(function (root, utils) {
  if (typeof module === 'object' && module.exports) {
    module.exports = utils;
  } else {
    root.IntroUtils = utils;
  }
})(typeof self !== 'undefined' ? self : this, (function () {
  'use strict';

  /** True for "/", "/folder/" and ".../index.html": the home page, wherever the site is hosted. */
  function isHomePath(pathname) {
    const lastSegment = pathname.split('/').pop();
    return lastSegment === '' || lastSegment === 'index.html';
  }

  /**
   * The intro plays when someone arrives at the home page or reloads it, but not
   * when they click through to it from another page of the site, or use Back.
   *   navigationType: 'navigate' | 'reload' | 'back_forward' | 'prerender'
   */
  function shouldPlayIntro({ pathname, referrer, origin, navigationType }) {
    if (!isHomePath(pathname)) return false;
    if (navigationType === 'reload') return true;
    if (navigationType !== 'navigate') return false;
    const cameFromThisSite = Boolean(referrer) && referrer.startsWith(`${origin}/`);
    return !cameFromThisSite;
  }

  return { isHomePath, shouldPlayIntro };
})());
