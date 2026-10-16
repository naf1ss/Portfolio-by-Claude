/**
 * Turns the `contact` block of site-config.js into display-ready link entries.
 * Pure (no DOM) so it can be unit tested; exposes window.ContactUtils.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ContactUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function withProtocol(url) {
    return /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, '')}`;
  }

  /** Returns [{ label, text, href }] for each contact detail that is filled in. */
  function contactEntries(contact) {
    const details = contact || {};
    const entries = [];

    if (details.email) {
      entries.push({ label: 'Email', text: details.email, href: `mailto:${details.email}` });
    }
    if (details.instagram) {
      const handle = details.instagram.replace(/^@/, '');
      entries.push({
        label: 'Instagram',
        text: `@${handle}`,
        href: `https://www.instagram.com/${encodeURIComponent(handle)}/`,
      });
    }
    if (details.linkedin) {
      const href = withProtocol(details.linkedin);
      entries.push({
        label: 'LinkedIn',
        text: href.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''),
        href,
      });
    }
    return entries;
  }

  return { contactEntries };
});
