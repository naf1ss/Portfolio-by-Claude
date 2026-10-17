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

  /** What a note can be about; the first is selected by default. */
  const NOTE_TOPICS = Object.freeze(['Just saying hello', 'A commission', 'A collaboration', 'A piece I saw']);

  /** A mailto: link that opens the visitor's mail app with the subject and body filled in. */
  function composeMailto(email, { topic, name, message }) {
    const sender = String(name || '').trim();
    const subject = [topic, sender].filter(Boolean).join(' \u2014 ');
    const body = [String(message || '').trim(), sender && `\u2014 ${sender}`].filter(Boolean).join('\n\n');
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  /** The time in a place, e.g. { time: '2:31 AM', isDay: false }; daylight is taken as 6am to 6pm. */
  function clockAt(date, timeZone) {
    const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
    const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(date));
    return { time, isDay: hour >= 6 && hour < 18 };
  }

  return { contactEntries, NOTE_TOPICS, composeMailto, clockAt };
});
