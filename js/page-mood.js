/**
 * Runs in the <head> of the series page, before anything is drawn: a photography series is shown in its own
 * room colour (html[data-mood="<series id>"] in styles.css), so the page opens in that colour instead of
 * flashing white first. Ids without a room colour simply match no style.
 */
(function () {
  'use strict';

  // The series' own page (series-<id>.html, or without .html as GitHub Pages also serves it), or an old ?s= link.
  const fromPath = /\/series-([a-z0-9-]+?)(?:\.html)?$/.exec(location.pathname);
  const id = fromPath ? fromPath[1] : new URLSearchParams(location.search).get('s');
  if (id && /^[a-z0-9-]+$/.test(id)) document.documentElement.dataset.mood = id;
})();
