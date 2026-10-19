/**
 * Resume: each role is one line (date, title, place); a click opens its details.
 *
 * Without this script every row simply stays open, so the page reads (and prints) in full.
 * Rows marked data-open start open; the rest start closed.
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-ledger]');
  if (!root) return;

  const rows = Array.from(root.querySelectorAll('.ledger-row'));
  const toggleAll = document.querySelector('[data-ledger-toggle]');

  function setOpen(row, open) {
    row.classList.toggle('is-open', open);
    row.querySelector('.ledger-btn').setAttribute('aria-expanded', String(open));
  }

  function syncToggleLabel() {
    const allOpen = rows.every((row) => row.classList.contains('is-open'));
    toggleAll.textContent = allOpen ? 'Close all' : 'Open all';
  }

  root.classList.add('is-collapsible');
  rows.forEach((row) => {
    setOpen(row, row.hasAttribute('data-open'));
    row.querySelector('.ledger-btn').addEventListener('click', () => {
      setOpen(row, !row.classList.contains('is-open'));
      syncToggleLabel();
    });
  });

  toggleAll.hidden = false;
  syncToggleLabel();
  toggleAll.addEventListener('click', () => {
    const open = toggleAll.textContent === 'Open all';
    rows.forEach((row) => setOpen(row, open));
    syncToggleLabel();
  });
})();
