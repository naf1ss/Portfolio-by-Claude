/**
 * The gallery's medium picker, in three forms that share one state:
 *
 *   letters   wide screens, grid view: the media lettered in small capitals, the current one underlined
 *   placard   wide screens, wall view: "You are in Prints · 9 works" in the corner of the wall; it opens a
 *             menu of every medium with a small picture of each
 *   capsule   phones: a frosted-glass capsule whose bright pill slides to the current medium
 *
 * Each form carries its own Wall / Grid switch (icons; on wide screens at the top right in both views). The CSS decides which form is visible (see "Medium picker"
 * in styles.css); this file builds them and keeps them in step. Exposes window.MediumPicker.
 */
(function () {
  'use strict';

  const U = window.WorksUtils;

  const ICONS = {
    wall: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3" width="11" height="7.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1 13.5h14" stroke="currentColor" stroke-width="1.4"/></svg>',
    grid: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="5" height="5" fill="currentColor"/><rect x="9" y="2" width="5" height="5" fill="currentColor"/><rect x="2" y="9" width="5" height="5" fill="currentColor"/><rect x="9" y="9" width="5" height="5" fill="currentColor"/></svg>',
  };
  const VIEWS = [
    { id: 'wall', label: 'Wall' },
    { id: 'grid', label: 'Grid' },
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(className, attributes = {}) {
    const node = element('button', className);
    node.type = 'button';
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  }

  const worksLabel = (count) => `${count} ${count === 1 ? 'work' : 'works'}`;

  /** A Wall / Grid switch, as two icons. */
  function createViewSwitch(className) {
    const group = element('div', `view-switch ${className}`);
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'View');
    VIEWS.forEach(({ id, label }) => {
      const choice = button('view-switch__button', { 'data-view': id, 'aria-pressed': 'false', 'aria-label': label });
      choice.innerHTML = ICONS[id];
      choice.title = label;
      group.append(choice);
    });
    return group;
  }

  /** A small square picture for the placard's menu; "All" gets a four-square mosaic. */
  function createThumb(work) {
    if (!work) {
      const mosaic = element('span', 'placard-menu__thumb placard-menu__thumb--all');
      mosaic.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 4; i += 1) mosaic.append(element('i'));
      return mosaic;
    }
    const img = new Image();
    img.className = 'placard-menu__thumb';
    img.alt = '';
    img.width = 40;
    img.height = 40;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.sizes = '40px';
    img.srcset = U.buildSrcset(work);
    img.src = U.fallbackUrl(work);
    return img;
  }

  /**
   * options.options   [{ id, label }] in display order
   * options.counts    works per option id
   * options.thumbFor  (id) => the work pictured beside that option in the placard's menu (or null)
   * options.onSelect  (id) => void
   * options.onView    ('wall' | 'grid') => void
   */
  function create({ options, counts, thumbFor, onSelect, onView }) {
    const choices = []; // every medium button in every form, for keeping them in step

    function addChoice(node, id) {
      node.dataset.category = id;
      node.setAttribute('aria-pressed', 'false');
      choices.push(node);
      return node;
    }

    // Letters
    const letters = element('ul', 'medium-letters');
    options.forEach(({ id, label }) => {
      const choice = addChoice(button('medium-letters__item'), id);
      choice.append(label, element('sup', undefined, String(counts[id])));
      const item = element('li');
      item.append(choice);
      letters.append(item);
    });

    // Capsule
    const capsule = element('div', 'medium-capsule');
    const track = element('div', 'medium-capsule__track');
    const pill = element('span', 'medium-capsule__pill');
    pill.setAttribute('aria-hidden', 'true');
    track.append(pill);
    options.forEach(({ id, label }) => {
      const choice = addChoice(button('medium-capsule__item'), id);
      choice.append(label, element('small', undefined, String(counts[id])));
      track.append(choice);
    });
    const capsuleViews = createViewSwitch('view-switch--glass');
    capsule.append(track, element('span', 'medium-capsule__divider'), capsuleViews);

    // Placard
    const placard = element('div', 'placard');
    const eyebrow = element('p', 'placard__eyebrow', 'You are in');
    const opener = button('placard__button', { 'aria-expanded': 'false', 'aria-haspopup': 'true' });
    const name = element('span', 'placard__name');
    const count = element('span', 'placard__count');
    opener.innerHTML = '<svg class="placard__chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    opener.prepend(name, count);
    const menu = element('div', 'placard-menu');
    menu.id = 'placard-menu';
    menu.hidden = true;
    opener.setAttribute('aria-controls', menu.id);
    options.forEach(({ id, label }) => {
      const choice = addChoice(button('placard-menu__item'), id);
      choice.append(createThumb(thumbFor(id)), element('b', undefined, label), element('small', undefined, String(counts[id])));
      menu.append(choice);
    });
    placard.append(eyebrow, opener, menu);

    // Wide screens: Wall / Grid at the top right, in the same place over the grid and on the wall.
    const lettersViews = createViewSwitch('view-switch--corner view-switch--page');
    const roomViews = createViewSwitch('view-switch--corner view-switch--room');
    const viewSwitches = [lettersViews, capsuleViews, roomViews];

    function setMenu(open) {
      opener.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      if (open) (menu.querySelector('[aria-pressed="true"]') || menu.querySelector('button')).focus();
    }
    opener.addEventListener('click', () => setMenu(menu.hidden));
    document.addEventListener('click', (event) => {
      if (!menu.hidden && !placard.contains(event.target)) setMenu(false);
    });
    placard.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        setMenu(false);
        opener.focus();
      }
    });

    [letters, track, menu].forEach((group) =>
      group.addEventListener('click', (event) => {
        const choice = event.target.closest('button[data-category]');
        if (!choice) return;
        if (group === menu) setMenu(false);
        onSelect(choice.dataset.category);
      })
    );
    viewSwitches.forEach((group) =>
      group.addEventListener('click', (event) => {
        const choice = event.target.closest('button[data-view]');
        if (choice) onView(choice.dataset.view);
      })
    );

    /** Slides the capsule's pill under the current medium (instantly when `animate` is false). */
    function placePill(animate = true) {
      const current = track.querySelector('button[aria-pressed="true"]');
      if (!current || !track.offsetParent) return;
      if (!animate) pill.style.transition = 'none';
      pill.style.width = `${current.offsetWidth}px`;
      pill.style.transform = `translateX(${current.offsetLeft}px)`;
      if (!animate) requestAnimationFrame(() => (pill.style.transition = ''));
      // Keep the current medium in view inside the scrolling capsule.
      const left = current.offsetLeft - (track.clientWidth - current.offsetWidth) / 2;
      track.scrollTo({ left, behavior: animate ? 'smooth' : 'auto' });
    }
    window.addEventListener('resize', () => placePill(false));
    if (document.fonts) document.fonts.ready.then(() => placePill(false));

    let placed = false;
    return {
      letters,
      capsule,
      placard,
      lettersViews,
      roomViews,
      setActive(activeId) {
        choices.forEach((choice) => choice.setAttribute('aria-pressed', String(choice.dataset.category === activeId)));
        const option = options.find(({ id }) => id === activeId);
        name.textContent = option ? option.label : '';
        count.textContent = worksLabel(counts[activeId] || 0);
        placePill(placed);
        placed = true;
      },
      /**
       * `available`: false for media that only show as a grid.
       * `labels`: names to use instead of "Wall" / "Grid" (photography's first view is its series).
       */
      setView(view, { available, labels = {} }) {
        viewSwitches.forEach((group) => {
          group.hidden = !available;
          group.querySelectorAll('[data-view]').forEach((choice) => {
            const label = labels[choice.dataset.view] || VIEWS.find(({ id }) => id === choice.dataset.view).label;
            choice.setAttribute('aria-pressed', String(choice.dataset.view === view));
            choice.setAttribute('aria-label', label);
            choice.title = label;
          });
        });
        capsule.classList.toggle('has-views', available);
        placePill(false);
      },
    };
  }

  window.MediumPicker = { create };
})();
