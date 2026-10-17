/**
 * Contact page extras: the painted headline's caption, the note composer (opens the
 * visitor's mail app, since the site has no server), copy-email, and live local times.
 * The links list itself is filled by pages.js.
 */
(function () {
  'use strict';

  const CLOCK_REFRESH_MS = 20 * 1000;
  const config = window.SITE_CONFIG || {};
  const Contact = window.ContactUtils;
  const page = document.querySelector('.contact');
  if (!page || !Contact) return;

  const email = (config.contact || {}).email;

  /* ---- painted headline: caption, "another painting" ---- */
  const title = page.querySelector('[data-painted]');
  const credit = page.querySelector('[data-painted-credit]');
  const creditLink = page.querySelector('[data-painted-title]');

  title.addEventListener('painted:show', ({ detail }) => {
    const { work, url } = detail;
    page.style.setProperty('--paint', `url("${url}")`); // the link list borrows the same painting on hover
    creditLink.textContent = work.title || work.medium;
    creditLink.href = `gallery.html#${work.id.toLowerCase()}`;
    credit.hidden = false;
  });

  const nextPainting = () => {
    const painted = window.PaintedText.of(title);
    if (painted) painted.next();
  };
  title.addEventListener('click', nextPainting);
  page.querySelector('[data-painted-next]').addEventListener('click', nextPainting);

  /* ---- clocks ---- */
  const clockList = page.querySelector('[data-clocks]');
  const places = config.places || [];

  function renderClocks() {
    const now = new Date();
    const items = places.map(({ label, timeZone }) => {
      const { time, isDay } = Contact.clockAt(now, timeZone);
      const item = document.createElement('li');
      item.className = `clocks__place${isDay ? ' is-day' : ''}`;
      const name = document.createElement('span');
      name.className = 'clocks__name';
      name.textContent = label;
      const value = document.createElement('span');
      value.className = 'clocks__time';
      value.textContent = time;
      item.append(name, value);
      return item;
    });
    clockList.replaceChildren(...items);
  }

  if (places.length > 0) {
    clockList.hidden = false;
    renderClocks();
    setInterval(renderClocks, CLOCK_REFRESH_MS);
  }

  /* ---- note composer ---- */
  const note = page.querySelector('[data-note]');
  if (!email) return; // nothing to write to: the composer stays hidden

  note.hidden = false;
  const form = note.querySelector('[data-note-form]');
  const status = note.querySelector('[data-note-status]');
  const topics = note.querySelector('[data-note-topics]');

  Contact.NOTE_TOPICS.forEach((topic, index) => {
    const chip = document.createElement('label');
    chip.className = 'chip';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'topic';
    input.value = topic;
    input.className = 'chip__input';
    input.checked = index === 0;
    const text = document.createElement('span');
    text.className = 'chip__text';
    text.textContent = topic;
    chip.append(input, text);
    topics.append(chip);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (!String(data.get('message')).trim()) {
      status.textContent = 'Write a line or two first.';
      form.elements.message.focus();
      return;
    }
    status.textContent = 'Opening your mail app… if nothing happens, copy my address and write from there.';
    window.location.href = Contact.composeMailto(email, {
      topic: data.get('topic'),
      name: data.get('name'),
      message: data.get('message'),
    });
  });

  note.querySelector('[data-copy-email]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(email);
      status.textContent = `Copied ${email}`;
    } catch (error) {
      status.textContent = `My address is ${email}`; // clipboard blocked: show it so it can be copied by hand
    }
  });
})();
