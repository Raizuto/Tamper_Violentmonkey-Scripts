// ==UserScript==
// @name         Smart Video Saver (Elegant Edition)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Pause offscreen videos and gently fade in visible ones for smooth, efficient browsing.
// @author       Rae
// @match        *://*.reddit.com/*
// @match        *://*.redgifs.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

(() => {
  'use strict';
  const KEYS = { ENABLE: 'svs_enabled', DEBUG: 'svs_debug', PERF: 'svs_perf' };
  const MAX_ACTIVE = 1, OFFSET = 800, VISIBLE_THRESHOLD = 0.85, DELAY = 500;
  const get = (k, d) => GM_getValue(k, d);
  const set = (k, v) => GM_setValue(k, v);
  const log = (...a) => get(KEYS.DEBUG, false) && console.log('[SVS]', ...a);

  if (get(KEYS.ENABLE) === undefined) set(KEYS.ENABLE, true);
  if (get(KEYS.DEBUG) === undefined) set(KEYS.DEBUG, false);
  if (get(KEYS.PERF) === undefined) set(KEYS.PERF, false);

  const toggle = (k, label) => {
    const c = get(k, false);
    set(k, !c);
    alert(`${label} ${!c ? 'enabled' : 'disabled'}`);
    location.reload();
  };
  const reset = () => {
    if (confirm('Clear settings?')) {
      Object.values(KEYS).forEach(GM_deleteValue);
      location.reload();
    }
  };

  GM_registerMenuCommand(`${get(KEYS.ENABLE) ? 'Disable' : 'Enable'} Script`, () => toggle(KEYS.ENABLE, 'Script'));
  GM_registerMenuCommand(`${get(KEYS.DEBUG) ? 'Disable' : 'Enable'} Debug Logs`, () => toggle(KEYS.DEBUG, 'Debug Logs'));
  GM_registerMenuCommand(`${get(KEYS.PERF) ? 'Disable' : 'Enable'} Performance Saver`, () => toggle(KEYS.PERF, 'Performance Saver'));
  GM_registerMenuCommand('Force Reset', reset);

  if (!get(KEYS.ENABLE, true) || !get(KEYS.PERF, false)) return;

  const active = new Set();
  const videos = new Set();

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const v = e.target;
      if (!(v instanceof HTMLVideoElement)) continue;
      const mostlyVisible = e.intersectionRatio >= VISIBLE_THRESHOLD;
      if (mostlyVisible && active.size < MAX_ACTIVE) {
        if (v.dataset.fade !== '1') {
          v.style.opacity = 0;
          v.style.transition = 'opacity 0.5s ease';
          v.dataset.fade = '1';
        }
        setTimeout(() => {
          if (e.intersectionRatio >= VISIBLE_THRESHOLD) {
            v.play().catch(() => {});
            v.style.opacity = 1;
            active.add(v);
            log('Playing', v);
          }
        }, DELAY);
      } else if (!mostlyVisible) {
        v.pause();
        v.style.opacity = 0.6;
        active.delete(v);
        log('Paused', v);
      }
    }
  }, { rootMargin: `${OFFSET}px`, threshold: Array.from({ length: 11 }, (_, i) => i / 10) });

  const watch = () => {
    document.querySelectorAll('video').forEach(v => {
      if (!v.dataset.svs) {
        v.dataset.svs = '1';
        videos.add(v);
        io.observe(v);
        log('Observed', v);
      }
    });
  };

  const mo = new MutationObserver(() => watch());
  document.addEventListener('DOMContentLoaded', watch);
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
