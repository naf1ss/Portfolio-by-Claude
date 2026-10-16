/**
 * Full-screen viewer built on <dialog>, which supplies focus trapping, the
 * Escape key and focus restoration. Exposes window.Lightbox.create(dialog).
 *
 * Each work has a shareable URL hash (#a012). Opening from the gallery adds
 * one history entry, so the browser Back button closes the viewer instead of
 * leaving the page; moving between works replaces that entry.
 */
(function () {
  'use strict';

  const U = window.WorksUtils;
  const SWIPE_DISTANCE = 50; // px of horizontal travel that counts as a swipe

  function create(dialog) {
    const stage = dialog.querySelector('.viewer__stage');
    const image = dialog.querySelector('.viewer__image');
    const title = dialog.querySelector('.viewer__title');
    const meta = dialog.querySelector('.viewer__meta');
    const position = dialog.querySelector('.viewer__count');
    const stepButtons = dialog.querySelectorAll('[data-action="prev"], [data-action="next"]');

    let works = [];
    let index = -1;
    let ownsHistoryEntry = false; // true when Back should close the viewer
    let closingFromHistory = false;

    image.addEventListener('load', () => image.classList.add('is-loaded'));
    image.addEventListener('error', () => image.classList.add('is-loaded'));

    function render() {
      const work = works[index];
      const caption = U.captionParts(work);

      image.classList.remove('is-loaded');
      image.alt = U.altText(work);
      image.width = work.w;
      image.height = work.h;
      image.sizes = '100vw';
      image.srcset = U.buildSrcset(work);
      image.src = U.imageUrl(work, 1200);

      title.textContent = caption.title;
      meta.textContent = caption.meta;
      position.textContent = `${index + 1} / ${works.length}`;
      stepButtons.forEach((button) => {
        button.hidden = works.length < 2;
      });
    }

    function step(delta) {
      if (works.length < 2) return;
      index = (index + delta + works.length) % works.length;
      render();
      history.replaceState({ lightbox: true }, '', U.hashForWork(works[index]));
    }

    /**
     * source: 'user'    clicked in the gallery (adds a history entry)
     *         'history' arrived via Back/Forward (entry already exists)
     *         'load'    deep link on page load (reuses the current entry)
     */
    function open(id, source) {
      const found = works.findIndex((work) => work.id === id);
      if (found === -1) return false;
      index = found;
      render();

      if (!dialog.open) {
        dialog.showModal();
        // Browsers otherwise focus the first button; focus the viewer so none looks pre-selected.
        dialog.focus({ preventScroll: true });
        document.documentElement.classList.add('has-viewer');
        const hash = U.hashForWork(works[index]);
        if (source === 'user') {
          history.pushState({ lightbox: true }, '', hash);
          ownsHistoryEntry = true;
        } else if (source === 'history') {
          ownsHistoryEntry = true;
        } else {
          history.replaceState({ lightbox: true }, '', hash);
          ownsHistoryEntry = false;
        }
      }
      return true;
    }

    function setWorks(nextWorks) {
      works = nextWorks;
      index = -1;
    }

    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('has-viewer');
      if (closingFromHistory) {
        closingFromHistory = false;
        ownsHistoryEntry = false;
        return;
      }
      if (ownsHistoryEntry) {
        ownsHistoryEntry = false;
        history.back();
      } else {
        history.replaceState(null, '', location.pathname + location.search);
      }
    });

    window.addEventListener('popstate', () => {
      const id = U.workIdFromHash(location.hash, works);
      if (id) {
        open(id, 'history');
      } else if (dialog.open) {
        closingFromHistory = true;
        dialog.close();
      }
    });

    dialog.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]');
      if (action && action.dataset.action === 'prev') step(-1);
      else if (action && action.dataset.action === 'next') step(1);
      else if ((action && action.dataset.action === 'close') || event.target === stage) dialog.close();
    });

    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
    });

    // Touch swipe between works; mouse users have the buttons and arrow keys.
    let swipeStart = null;
    stage.addEventListener('pointerdown', (event) => {
      swipeStart = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY };
    });
    stage.addEventListener('pointerup', (event) => {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 2) {
        step(dx < 0 ? 1 : -1);
      }
    });

    return { open, setWorks };
  }

  window.Lightbox = { create };
})();
