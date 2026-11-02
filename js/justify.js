/**
 * Rectangle grids: lays a list of pictures out in rows that all run edge to edge, the last row included, so the
 * whole block is a clean rectangle however many pictures it holds. No picture is cropped; instead the rows are
 * planned together, choosing where each one breaks so that every row's height stays as close as it can to the
 * list's target row height (the line-breaking method used for justified text, applied to pictures).
 *
 *   Justify.attach(list, { itemSelector, rowHeight })
 *
 * Each item carries its picture's proportions as the CSS custom property --ar (width / height). `rowHeight` is a
 * CSS length (it may use vw or clamp()) for the height rows aim for. The layout is redone whenever the list
 * changes width. Exposes window.Justify; the planning itself (planRows) is pure, for tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Justify = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';

  const MAX_PER_ROW = 8;
  const TALL_ROW = 1.6; // a row taller than this many times the target counts as much worse (few, tall pictures)

  /**
   * Breaks pictures (their width/height ratios) into rows of the given width that each fill it exactly, choosing
   * the breaks that keep every row's height nearest the target. Returns [{ start, end, height }] (end exclusive).
   */
  function planRows(ratios, width, gap, target) {
    const n = ratios.length;
    if (n === 0 || width <= 0) return [];
    const best = new Array(n + 1).fill(Infinity);
    const from = new Array(n + 1).fill(0);
    best[0] = 0;
    for (let end = 1; end <= n; end += 1) {
      let sum = 0;
      for (let start = end - 1; start >= Math.max(0, end - MAX_PER_ROW); start -= 1) {
        sum += ratios[start];
        const count = end - start;
        const height = (width - gap * (count - 1)) / sum;
        if (height <= 0) break;
        const off = (height - target) / target;
        const cost = off * off * (height > target * TALL_ROW ? 4 : 1);
        if (best[start] + cost < best[end]) {
          best[end] = best[start] + cost;
          from[end] = start;
        }
      }
    }
    const rows = [];
    for (let end = n; end > 0; end = from[end]) {
      const start = from[end];
      const sum = ratios.slice(start, end).reduce((a, b) => a + b, 0);
      rows.unshift({ start, end, height: (width - gap * (end - start - 1)) / sum });
    }
    return rows;
  }

  /** Resolves a CSS length such as "clamp(9rem, 17vw, 16.5rem)" to pixels, inside `host`. */
  function measure(host, length) {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;width:0;height:${length};`;
    host.append(probe);
    const pixels = probe.getBoundingClientRect().height;
    probe.remove();
    return pixels;
  }

  function layout(list, { itemSelector, rowHeight }) {
    const items = Array.from(list.querySelectorAll(itemSelector));
    const width = list.clientWidth;
    if (!items.length || !width) return;
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    const target = measure(list, rowHeight) || 240;
    const ratios = items.map((item) => parseFloat(item.style.getPropertyValue('--ar')) || 1);
    planRows(ratios, width, gap, target).forEach(({ start, end, height }) => {
      let used = 0;
      for (let i = start; i < end; i += 1) {
        // The last picture takes what is left, less half a pixel, so rounding never pushes it onto the next row.
        const w = i === end - 1 ? width - used - 0.5 : Math.floor(ratios[i] * height * 100) / 100;
        items[i].style.width = `${w}px`;
        used += w + gap;
      }
    });
  }

  function attach(list, options) {
    list.classList.add('is-justified');
    let frame = 0;
    let lastWidth = 0;
    const run = () => {
      frame = 0;
      lastWidth = list.clientWidth;
      layout(list, options);
    };
    run();
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        if (list.clientWidth !== lastWidth && !frame) frame = requestAnimationFrame(run);
      }).observe(list);
    } else {
      window.addEventListener('resize', () => {
        if (!frame) frame = requestAnimationFrame(run);
      });
    }
  }

  return { attach, planRows };
});
