/**
 * First-visit hints: a small note pointing at a control a visitor might not find on their own, such as the
 * curtain window that switches the theme or the gallery's grid view.
 *
 * Each hint is shown once per browser and then remembered. It waits for the page's opening animation, and goes
 * away on any tap, key press or scroll, or after a few seconds. Adding ?hints to the address shows the hints
 * again (for checking them).
 *
 *   window.Hints.show({
 *     id: 'theme',                               // remembered under this name
 *     targets: [{ selector, text }, ...],        // the first one visible on screen is pointed at
 *   });
 */
(function () {
  'use strict';

  const STORAGE_PREFIX = 'nuances.hint.';
  const SHOW_AFTER_MS = 900; // after the page is ready, so the hint is not lost in the entrance
  const VISIBLE_MS = 7000;
  const EDGE_PX = 16; // kept this far from the screen's edges
  const GAP_PX = 12; // between the control and the note

  const root = document.documentElement;
  const forced = new URLSearchParams(location.search).has('hints');

  function hasSeen(id) {
    try {
      return localStorage.getItem(STORAGE_PREFIX + id) === '1';
    } catch (error) {
      return false;
    }
  }

  function remember(id) {
    try {
      localStorage.setItem(STORAGE_PREFIX + id, '1');
    } catch (error) {
      // not remembered: the hint may show again on the next visit
    }
  }

  /** Calls `callback` once the opening animation (home page) is over and the page has begun. */
  function whenPageReady(callback) {
    const ready = () => !root.classList.contains('js-intro') && (!root.classList.contains('js-motion') || root.classList.contains('is-ready'));
    if (ready()) {
      callback();
      return;
    }
    const watcher = new MutationObserver(() => {
      if (!ready()) return;
      watcher.disconnect();
      callback();
    });
    watcher.observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  const isVisible = (node) => node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';

  /** Places the note under the control, its arrow pointing at the control's middle. */
  function place(note, target) {
    const box = target.getBoundingClientRect();
    const width = note.offsetWidth;
    const centre = box.left + box.width / 2;
    const left = Math.min(innerWidth - EDGE_PX - width, Math.max(EDGE_PX, centre - width / 2));
    note.style.left = `${left}px`;
    note.style.top = `${box.bottom + GAP_PX}px`;
    note.style.setProperty('--hint-arrow-x', `${centre - left}px`);
  }

  function show({ id, targets }) {
    if (!forced && hasSeen(id)) return;

    whenPageReady(() =>
      setTimeout(() => {
        const choice = targets.map((entry) => ({ ...entry, node: document.querySelector(entry.selector) })).find((entry) => isVisible(entry.node));
        if (!choice) return;
        const text = typeof choice.text === 'function' ? choice.text() : choice.text;

        const note = document.createElement('p');
        note.className = 'hint';
        note.setAttribute('role', 'note');
        note.textContent = text;
        document.body.append(note);
        place(note, choice.node);
        requestAnimationFrame(() => note.classList.add('is-shown'));
        remember(id);

        const reposition = () => place(note, choice.node);
        let timer = 0;
        const dismiss = () => {
          clearTimeout(timer);
          window.removeEventListener('resize', reposition);
          ['pointerdown', 'keydown', 'wheel', 'touchmove'].forEach((type) => document.removeEventListener(type, dismiss, true));
          note.classList.remove('is-shown');
          note.addEventListener('transitionend', () => note.remove(), { once: true });
          setTimeout(() => note.remove(), 600); // in case no transition runs (reduced motion)
        };
        window.addEventListener('resize', reposition);
        ['pointerdown', 'keydown', 'wheel', 'touchmove'].forEach((type) => document.addEventListener(type, dismiss, true));
        timer = setTimeout(dismiss, VISIBLE_MS);
      }, SHOW_AFTER_MS)
    );
  }

  /** The theme the page is showing now: the visitor's choice, else the device's. */
  function currentTheme() {
    if (root.dataset.theme === 'dark' || root.dataset.theme === 'light') return root.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  window.Hints = { show, currentTheme };
})();
