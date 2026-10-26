/**
 * Runs in the <head> of the series page, before anything is drawn: a photography series is shown in its own
 * room colour (html[data-mood="<series id>"] in styles.css), so the page opens in that colour instead of
 * flashing white first. Ids without a room colour simply match no style.
 */
(function () {
  'use strict';

  const id = new URLSearchParams(location.search).get('s');
  if (id && /^[a-z0-9-]+$/.test(id)) document.documentElement.dataset.mood = id;
})();
