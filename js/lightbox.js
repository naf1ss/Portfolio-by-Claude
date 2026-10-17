/**
 * Full-screen viewer built on <dialog>, which supplies focus trapping, the
 * Escape key and focus restoration. Exposes window.Lightbox.create(dialog).
 *
 * Each work has a shareable URL hash (#a012). Opening from the gallery adds
 * one history entry, so the browser Back button closes the viewer instead of
 * leaving the page; moving between works replaces that entry.
 *
 * Where the browser supports view transitions, the picture glides out of its
 * tile when the viewer opens, back into it when it closes, and between works
 * when stepping. Everything works the same without them.
 */
(function () {
  'use strict';

  const U = window.WorksUtils;
  const SWIPE_DISTANCE = 50; // px of horizontal travel that counts as a swipe
  const MAX_ENLARGEMENT = 2; // never show an image above 2x its real pixel size
  const PICTURE_TRANSITION_NAME = 'work-picture';
  const DECODE_TIMEOUT_MS = 1200; // never hold the page still longer than this for a slow image

  const isOnScreen = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  };

  /**
   * findOrigin(workId) returns the gallery <img> for a work (or null); the
   * picture glides to and from it.
   */
  function create(dialog, { findOrigin = () => null } = {}) {
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
      // The CSS fits the picture to the stage; small photographs enlarge to at most twice their real size.
      image.style.setProperty('--picture-ratio', (work.w / work.h).toFixed(4));
      image.style.setProperty('--picture-max-width', `${work.w * MAX_ENLARGEMENT}px`);
      image.sizes = '100vw';
      image.srcset = U.buildSrcset(work);
      image.src = U.fallbackUrl(work);

      title.textContent = caption.title;
      meta.textContent = caption.meta;
      position.textContent = `${index + 1} / ${works.length}`;
      stepButtons.forEach((button) => {
        button.hidden = works.length < 2;
      });
    }

    const canAnimate = () =>
      'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** Resolves once the new picture can be drawn, so the transition has something to morph into. */
    function pictureReady() {
      const decoded = image.decode ? image.decode().catch(() => {}) : Promise.resolve();
      return Promise.race([decoded, new Promise((resolve) => setTimeout(resolve, DECODE_TIMEOUT_MS))]);
    }

    let latestTransition = 0;

    /**
     * Runs `update` inside a view transition that carries the picture from `from`
     * to the element `to()` returns (both default to the viewer's own image).
     */
    function transitionPicture(update, { from = image, to = () => image } = {}) {
      if (!canAnimate()) {
        update();
        return;
      }
      const token = ++latestTransition;
      const named = new Set([from]);
      from.style.viewTransitionName = PICTURE_TRANSITION_NAME;

      const transition = document.startViewTransition(async () => {
        const destination = to();
        if (destination !== from) from.style.viewTransitionName = '';
        update();
        if (destination) {
          destination.style.viewTransitionName = PICTURE_TRANSITION_NAME;
          named.add(destination);
        }
        if (destination === image) {
          await pictureReady();
          image.style.transition = 'none'; // shown at full opacity straight away, not faded in
          image.classList.add('is-loaded');
        }
      });

      transition.finished.finally(() => {
        image.style.transition = '';
        if (token !== latestTransition) return; // a newer transition owns the names now
        named.forEach((element) => {
          element.style.viewTransitionName = '';
        });
      });
    }

    function step(delta) {
      if (works.length < 2) return;
      transitionPicture(() => {
        index = (index + delta + works.length) % works.length;
        render();
        history.replaceState({ lightbox: true }, '', U.hashForWork(works[index]));
      });
    }

    /** The gallery picture for the current work, if it is on screen to glide back into. */
    function visibleOrigin() {
      const origin = works[index] && findOrigin(works[index].id);
      return origin && isOnScreen(origin) ? origin : null;
    }

    function closeViewer() {
      if (!dialog.open) return;
      const origin = visibleOrigin();
      transitionPicture(() => dialog.close(), { from: image, to: () => origin });
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

      if (dialog.open) {
        render();
        return true;
      }

      const show = () => {
        render();
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
      };

      const origin = source === 'user' ? findOrigin(id) : null;
      if (origin && isOnScreen(origin)) transitionPicture(show, { from: origin });
      else show();
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
        closeViewer();
      }
    });

    dialog.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]');
      if (action && action.dataset.action === 'prev') step(-1);
      else if (action && action.dataset.action === 'next') step(1);
      else if (isOutsideWork(event)) closeViewer();
    });

    // Escape: close through the same animated path.
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeViewer();
    });

    /** The picture's box is the picture itself, so any other click (not on the page counter) is "outside". */
    function isOutsideWork(event) {
      return event.target !== image && !event.target.closest('.viewer__count');
    }

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
