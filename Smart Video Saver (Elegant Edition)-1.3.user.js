// ==UserScript==
// @name         Smart Video Saver (Elegant Edition)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Pause offscreen videos and gently fade in visible ones for smooth, efficient browsing.
// @author       Raizuto & ChatGPT
// @icon         https://cdn.iconscout.com/icon/free/png-512/free-reddit-icon-svg-download-png-1911984.png
// @match        *://*.reddit.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @license      MIT
// @homepageURL  https://github.com/Raizuto/Tampermonkey-Script/
// @supportURL   https://github.com/Raizuto/Tampermonkey-Script/issues
// ==/UserScript==

// Feel free to add whatever sites via @match up above :D 

// Change the MAX_ACTIVE below to the desired number of allowed videos to be loaded at once! 
// Set to 1 by default for small monitors or smaller browser viewer experience.
// Videos will fade in and videos you scroll by stop playing once out of view! 
// I HIGHLY recommend activating Performance Saver mode. This will out right stop all videos 
// from loading off screen & not buffer at all. Saves so much CPU. I looked everywhere for something like this!

(() => {
  'use strict';
  const KEYS = { DEBUG: 'svs_debug', PERF: 'svs_perf' };
  const MAX_ACTIVE = 1, OFFSET = 800, VISIBLE_THRESHOLD = 0.85, DELAY = 500;
  const get = (k, d) => GM_getValue(k, d);
  const set = (k, v) => GM_setValue(k, v);
  const currentSite = window.location.hostname;
  const log = (...a) => get(KEYS.DEBUG, false) && console.log(`[SVS @${currentSite}]`, ...a);

  if (get(KEYS.DEBUG) === undefined) set(KEYS.DEBUG, false);
  if (get(KEYS.PERF) === undefined) set(KEYS.PERF, false);

  const toggle = (k, label) => {
    const current = get(k, false);
    const newVal = !current;
    set(k, newVal);
    console.log(`%c[SVS]%c ${label} ${newVal ? 'enabled' : 'disabled'} on ${currentSite}.`,
      'color:#7E63A4;font-weight:bold;', '');
    setTimeout(() => location.reload(), 300);
  };

  const reset = () => {
    if (confirm('Clear all Smart Video Saver settings?')) {
      Object.values(KEYS).forEach(GM_deleteValue);
      location.reload();
    }
  };

  GM_registerMenuCommand(`${get(KEYS.DEBUG) ? 'Disable' : 'Enable'} Debug Logs`, () => toggle(KEYS.DEBUG, 'Debug Logs'));
  GM_registerMenuCommand(`${get(KEYS.PERF) ? 'Disable' : 'Enable'} Performance Saver`, () => toggle(KEYS.PERF, 'Performance Saver'));
  GM_registerMenuCommand('Force Reset', reset);

  if (!get(KEYS.PERF, false)) {
    if (get(KEYS.DEBUG, false)) console.log(`[SVS @${currentSite}] Performance Saver is OFF — videos will not be managed.`);
    return;
  }

  const active = new Set();
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const v = e.target;
      if (!(v instanceof HTMLVideoElement)) continue;
      const visible = e.intersectionRatio >= VISIBLE_THRESHOLD;
      if (visible && active.size < MAX_ACTIVE) {
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
      } else if (!visible) {
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
        io.observe(v);
        log('Observed new video element:', v);
      }
    });
  };

  const mo = new MutationObserver(() => watch());
  document.addEventListener('DOMContentLoaded', watch);
  mo.observe(document.documentElement, { childList: true, subtree: true });

  log('Smart Video Saver initialized with Performance Saver:', get(KEYS.PERF));
})();