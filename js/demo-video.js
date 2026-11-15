/**
 * A short, silent screen recording of a website at work, shown as part of a page.
 *
 *   const video = DemoVideo.create({ src, poster, width, height, label });
 *
 * It plays by itself, looping, only while it is well on screen, and stops when scrolled away, so a page
 * holding several costs nothing until each is seen. A click pauses or resumes it. A visitor who has asked
 * for less motion gets the poster and the browser's own controls, and nothing moves until they press play.
 */
(function (root) {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ON_SCREEN = 0.45; // the share of the video that must be visible for it to play

  let observer = null;
  const pausedByVisitor = new WeakSet(); // videos the visitor stopped, which scrolling back must not restart

  function watch(video) {
    if (!observer) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting && !pausedByVisitor.has(target)) target.play().catch(() => {});
          else if (!isIntersecting) target.pause();
        });
      }, { threshold: ON_SCREEN });
    }
    observer.observe(video);
  }

  function create({ src, poster, width, height, label }) {
    const video = document.createElement('video');
    video.className = 'demo-video';
    video.width = width;
    video.height = height;
    video.poster = poster;
    video.preload = 'none'; // the poster stands in until it is seen
    video.loop = true;
    // Muted and inline, which browsers require before a video may play by itself (Safari on iPhone above all).
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-label', label);
    video.src = src;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      video.controls = true;
      return video;
    }
    video.addEventListener('click', () => {
      if (video.paused) {
        pausedByVisitor.delete(video);
        video.play().catch(() => {});
      } else {
        pausedByVisitor.add(video);
        video.pause();
      }
    });
    watch(video);
    return video;
  }

  root.DemoVideo = { create };
})(window);
