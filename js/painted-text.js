/**
 * Fills lettering with artwork: an element marked data-painted shows pictures through
 * its letters (background-clip: text), crossfading between two stacked layers.
 *
 *   <span data-painted="photography"> ... <span class="painted"><span class="painted__layer">n</span>
 *                                                                 <span class="painted__layer">n</span></span> ...
 *
 * data-painted names the collection ("photography", "paintings"). Pictures are drawn at
 * random from the catalogue, so adding or removing works needs no change here. A picture too dark to read
 * through the letters (a night scene on a black footer) is skipped for the next one. Nothing
 * loads until the element is near the screen. Each change fires a bubbling "painted:show"
 * event ({ detail: { work, url } }); clicking the element is up to the page (see PaintedText.of).
 */
(function () {
  'use strict';

  const SHOWN_CLASS = 'is-shown';
  const PAINTED_CLASS = 'is-painted';
  const SECONDS_PER_PICTURE = 7;
  const PAINTING_CATEGORIES = ['painting'];
  // Average brightness (0–1) below which a picture would vanish into a dark background behind the letters.
  const MIN_BRIGHTNESS = 0.22;
  const SAMPLE_SIZE = 24; // pictures are measured on a tiny copy; that is plenty for an average

  const Works = window.WorksUtils;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const instances = new WeakMap();

  /** The works a collection name stands for; unknown names and missing data give none. */
  function collection(name) {
    if (name === 'photography') return window.PORTFOLIO_PHOTOS || [];
    if (name === 'paintings') {
      return (window.PORTFOLIO_WORKS || []).filter((work) => PAINTING_CATEGORIES.includes(work.category));
    }
    return [];
  }

  /** The picture's average brightness, 0 (black) to 1 (white); 1 if it cannot be measured, so it is kept. */
  function brightnessOf(image) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = SAMPLE_SIZE;
      canvas.height = SAMPLE_SIZE;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      let total = 0;
      for (let i = 0; i < data.length; i += 4) total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      return total / (data.length / 4) / 255;
    } catch (error) {
      return 1;
    }
  }

  /** Resolves with the picture's URL once it has loaded, or null if it failed or is too dark to read. */
  function loadPicture(work) {
    // custom-property URLs resolve against the stylesheet, so give the page-relative path in full
    const url = new URL(Works.fallbackUrl(work), document.baseURI).href;
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(brightnessOf(image) >= MIN_BRIGHTNESS ? url : null);
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  function mount(host) {
    const layers = Array.from(host.querySelectorAll('.painted__layer'));
    const works = collection(host.dataset.painted);
    if (layers.length < 2 || works.length === 0) return;

    // The whole collection in a fresh random order each visit: every picture takes a turn before any repeats,
    // and each loads only when its turn comes.
    const sequence = Works.pickRandom(works, works.length);
    let nextIndex = 0;
    let frontLayer = 0;
    let timer = null;
    let busy = false;

    async function showNext() {
      if (busy) return;
      busy = true;
      // Try the next pictures in turn until one can be shown; a full lap without one gives up for now.
      let work = null;
      let url = null;
      for (let tries = 0; tries < sequence.length && !url; tries += 1) {
        work = sequence[nextIndex % sequence.length];
        nextIndex += 1;
        url = await loadPicture(work);
      }
      busy = false;
      if (!url) return;

      const incoming = layers[1 - frontLayer];
      incoming.style.setProperty('--painted-url', `url("${url}")`);
      host.classList.add(PAINTED_CLASS);
      layers[frontLayer].classList.remove(SHOWN_CLASS);
      incoming.classList.add(SHOWN_CLASS);
      frontLayer = 1 - frontLayer;
      host.dispatchEvent(new CustomEvent('painted:show', { bubbles: true, detail: { work, url } }));
    }

    function start() {
      if (reduceMotion && nextIndex > 0) return; // one still picture per visit
      showNext();
      if (reduceMotion || timer) return;
      timer = setInterval(showNext, SECONDS_PER_PICTURE * 1000);
    }

    function stop() {
      clearInterval(timer);
      timer = null;
    }

    new IntersectionObserver(
      (entries) => (entries[0].isIntersecting ? start() : stop()),
      { rootMargin: '300px 0px' }
    ).observe(host);

    instances.set(host, {
      /** Shows the next picture now and restarts the timer so it is not replaced a moment later. */
      next() {
        showNext();
        if (timer) {
          stop();
          timer = setInterval(showNext, SECONDS_PER_PICTURE * 1000);
        }
      },
    });
  }

  if (Works) document.querySelectorAll('[data-painted]').forEach(mount);

  window.PaintedText = { of: (host) => instances.get(host) || null };
})();
