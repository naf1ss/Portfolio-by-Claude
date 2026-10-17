/**
 * Pure geometry for the hover magnifier: given where the pointer is over a
 * picture, which part of the full-size image should fill the lens.
 * No DOM access, so it can be unit tested.
 */
(function (root, utils) {
  if (typeof module === 'object' && module.exports) {
    module.exports = utils;
  } else {
    root.MagnifierUtils = utils;
  }
})(typeof self !== 'undefined' ? self : this, (function () {
  'use strict';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /**
   * box:      { left, top, width, height } of the <img> on screen
   * natural:  { width, height } of the full-size file
   * fit:      'cover' (image cropped to fill its box) or 'fill' (box has the image's shape)
   * pointer:  { x, y } in the same coordinates as box
   * Returns CSS background values for the lens. The magnification never exceeds
   * the file's real resolution (`maxZoom` at most), so the lens stays sharp.
   */
  function lensBackground({ box, natural, fit, pointer, lensSize, maxZoom = 3, minZoom = 1.5 }) {
    const coverScale = Math.max(box.width / natural.width, box.height / natural.height);
    const shown =
      fit === 'cover'
        ? { width: natural.width * coverScale, height: natural.height * coverScale }
        : { width: box.width, height: box.height };
    const offset = { x: (box.width - shown.width) / 2, y: (box.height - shown.height) / 2 };

    const fractionX = clamp((pointer.x - box.left - offset.x) / shown.width, 0, 1);
    const fractionY = clamp((pointer.y - box.top - offset.y) / shown.height, 0, 1);

    const zoom = clamp(natural.width / shown.width, minZoom, maxZoom);
    const width = shown.width * zoom;
    const height = shown.height * zoom;
    return {
      zoom,
      width,
      height,
      x: lensSize / 2 - fractionX * width,
      y: lensSize / 2 - fractionY * height,
    };
  }

  return { lensBackground };
})());
