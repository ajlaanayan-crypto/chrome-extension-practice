// Content Script for Ayan Extension v1.1.1 (YouTube AdBlocker, Theme Engine & Bulletproof Copy-Paste Unblocker)

(function () {
  'use strict';

  let bgOverlay = null;
  let isAdBlockerActive = true;
  const trackedBlockedNodes = new WeakSet();

  // Inject Main-World scripts at earliest moment
  injectMainWorldUnblocker();
  injectNuclearYouTubeAdSkipper();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  function initAll() {
    initThemeOverlay();
    applySettingsFromStorage();
    enableCopyPasteUnblocker();
    setupYouTubeHomeMutationObserver();
    setupDeepYouTubeAdBlockerEngine();

    // High frequency loop for transparency & ad skipping
    setInterval(() => {
      stripOpaqueBackgroundsFromYouTubeAndWeb();
      if (isAdBlockerActive) {
        executeDeepYouTubeAdSkip();
      }
    }, 25);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      applySettingsFromStorage();
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'APPLY_SETTINGS') {
      applySettingsFromStorage();
      sendResponse({ status: 'ok' });
    }
    return true;
  });

  // --- DYNAMIC MAIN-WORLD SCRIPT INJECTION ---
  function injectMainWorldUnblocker() {
    try {
      if (document.getElementById('ayan-main-world-unblocker-tag')) return;
      const script = document.createElement('script');
      script.id = 'ayan-main-world-unblocker-tag';
      script.src = chrome.runtime.getURL('unblock_main.js');
      (document.head || document.documentElement).appendChild(script);
      script.onload = () => script.remove();
    } catch (e) {}
  }

  // --- NUCLEAR WINDOW SCRIPT INJECTION (player.skipAd API) ---
  function injectNuclearYouTubeAdSkipper() {
    if (!window.location.hostname.includes('youtube.com')) return;

    try {
      if (document.getElementById('ayan-yt-nuclear-ad-skipper')) return;
      const script = document.createElement('script');
      script.id = 'ayan-yt-nuclear-ad-skipper';
      script.textContent = `
        (function() {
          function cleanObj(obj) {
            if (!obj) return;
            if (obj.adPlacements) delete obj.adPlacements;
            if (obj.playerAds) delete obj.playerAds;
            if (obj.adSlots) delete obj.adSlots;
          }

          let origPlayerResponse = window.ytInitialPlayerResponse;
          Object.defineProperty(window, 'ytInitialPlayerResponse', {
            get() { return origPlayerResponse; },
            set(val) {
              cleanObj(val);
              origPlayerResponse = val;
            },
            configurable: true
          });

          if (window.ytInitialPlayerResponse) {
            cleanObj(window.ytInitialPlayerResponse);
          }

          setInterval(() => {
            const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
            if (player) {
              if (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting')) {
                const video = player.querySelector('video');
                if (video) {
                  video.muted = true;
                  video.playbackRate = 16.0;
                  if (isFinite(video.duration) && video.duration > 0) {
                    video.currentTime = video.duration;
                  }
                }
                try {
                  if (typeof player.skipAd === 'function') {
                    player.skipAd();
                  }
                } catch (e) {}
              }
            }
          }, 20);
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {}
  }

  function initThemeOverlay() {
    bgOverlay = document.getElementById('omni-theme-bg-overlay');
    if (!bgOverlay) {
      bgOverlay = document.createElement('div');
      bgOverlay.id = 'omni-theme-bg-overlay';
      (document.documentElement || document.body).appendChild(bgOverlay);
    }
  }

  async function applySettingsFromStorage() {
    try {
      const data = await chrome.storage.local.get([
        'themeEnabled',
        'bgImageData',
        'bgOpacity',
        'bgBlur',
        'bgBlendMode',
        'bgFitMode',
        'bgBrightness',
        'bgContrast',
        'makeBodyTransparent',
        'unblockCopyPaste',
        'adblockEnabled'
      ]);

      isAdBlockerActive = data.adblockEnabled !== false;

      if (document.body) {
        if (isAdBlockerActive) {
          document.body.classList.add('omni-adblock-active');
          document.documentElement.classList.add('omni-adblock-active');
        } else {
          document.body.classList.remove('omni-adblock-active');
          document.documentElement.classList.remove('omni-adblock-active');
        }
      }

      initThemeOverlay();

      if (!data.themeEnabled || !data.bgImageData) {
        bgOverlay.style.display = 'none';
        if (document.body) document.body.classList.remove('omni-theme-active');
        document.documentElement.classList.remove('omni-theme-active');
      } else {
        bgOverlay.style.display = 'block';
        bgOverlay.style.backgroundImage = `url("${data.bgImageData}")`;
        bgOverlay.style.opacity = data.bgOpacity !== undefined ? data.bgOpacity : 0.85;
        bgOverlay.style.backgroundSize = data.bgFitMode || 'cover';
        bgOverlay.style.backgroundRepeat = data.bgFitMode === 'repeat' ? 'repeat' : 'no-repeat';
        bgOverlay.style.filter = `blur(${data.bgBlur || 0}px) brightness(${data.bgBrightness || 100}%) contrast(${data.bgContrast || 100}%)`;
        bgOverlay.style.mixBlendMode = data.bgBlendMode || 'normal';

        if (data.makeBodyTransparent !== false) {
          if (document.body) document.body.classList.add('omni-theme-active');
          document.documentElement.classList.add('omni-theme-active');
          stripOpaqueBackgroundsFromYouTubeAndWeb();
        } else {
          if (document.body) document.body.classList.remove('omni-theme-active');
          document.documentElement.classList.remove('omni-theme-active');
        }
      }

      if (data.unblockCopyPaste !== false) {
        enableCopyPasteUnblocker();
      }
    } catch (err) {
      console.warn('[AyanExtension] Error applying settings:', err);
    }
  }

  function setupDeepYouTubeAdBlockerEngine() {
    if (!window.location.hostname.includes('youtube.com')) return;

    const observer = new MutationObserver(() => {
      if (isAdBlockerActive) {
        executeDeepYouTubeAdSkip();
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function executeDeepYouTubeAdSkip() {
    if (!window.location.hostname.includes('youtube.com')) return;

    // 1. Detect & Count DOM Ad Slots
    const adSelectors = [
      'ytd-promoted-sparkles-web-renderer',
      'ytd-display-ad-renderer',
      'ytd-statement-banner-renderer',
      'ytd-banner-promo-renderer',
      'ytd-ad-slot-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-search-pyv-renderer',
      '.video-ads',
      '.ytp-ad-module',
      '.ytp-ad-overlay-container',
      '#player-ads',
      '.ytp-ad-image-overlay',
      '.ytp-ad-text-overlay'
    ];

    let newBlockedCount = 0;
    adSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (!trackedBlockedNodes.has(el)) {
          trackedBlockedNodes.add(el);
          newBlockedCount++;
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });

    // 2. Detect & Auto-Click Skip Buttons
    const skipButtons = document.querySelectorAll('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-overlay-close-button, .ytp-ad-skip-button-container');
    skipButtons.forEach(btn => {
      try {
        if (!trackedBlockedNodes.has(btn)) {
          trackedBlockedNodes.add(btn);
          btn.click();
          newBlockedCount++;
        }
      } catch (e) {}
    });

    if (newBlockedCount > 0) {
      incrementBlockedAdsCount(newBlockedCount);
    }

    // 3. Fast-forward Video Ad if Playing
    const isAdPlaying = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-text, .ytp-ad-preview-text');
    const video = document.querySelector('video');

    if (isAdPlaying && video) {
      try {
        video.muted = true;
        video.playbackRate = 16.0;
        if (video.duration && !isNaN(video.duration)) {
          video.currentTime = video.duration;
        }
      } catch (e) {}
    }
  }

  function incrementBlockedAdsCount(amount = 1) {
    try {
      chrome.runtime.sendMessage({ action: 'INCREMENT_BLOCKED_ADS', count: amount }).catch(() => {});
    } catch (e) {}
  }

  function setupYouTubeHomeMutationObserver() {
    const observer = new MutationObserver(() => {
      if (document.body && document.body.classList.contains('omni-theme-active')) {
        stripOpaqueBackgroundsFromYouTubeAndWeb();
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }

  function stripOpaqueBackgroundsFromYouTubeAndWeb() {
    if (!document.body || !document.body.classList.contains('omni-theme-active')) return;

    const selectors = [
      'ytd-masthead',
      '#masthead-container',
      '#masthead',
      '#container.ytd-masthead',
      '#background.ytd-masthead',
      'ytd-searchbox',
      '#container.ytd-searchbox',
      '#search-icon-legacy',
      'ytd-feed-filter-chip-bar-renderer',
      'yt-chip-cloud-renderer',
      '#chips-wrapper',
      '#header.ytd-browse',
      'ytd-guide-renderer',
      '#guide-content',
      'ytd-mini-guide-renderer',
      'ytd-browse',
      'ytd-browse[page-subtype="home"]',
      'ytd-two-column-browse-results-renderer',
      'ytd-rich-grid-renderer',
      'ytd-rich-section-renderer',
      '#primary.ytd-two-column-browse-results-renderer',
      '#contents.ytd-rich-grid-renderer',
      '#contents',
      '#primary',
      '#secondary',
      'header',
      'nav',
      '.navbar',
      '#gb',
      '.gb_Od'
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('background-image', 'none', 'important');
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('box-shadow', 'none', 'important');

        if (el.shadowRoot) {
          try {
            const shadowStyleId = 'omni-shadow-transparent-css';
            if (!el.shadowRoot.getElementById(shadowStyleId)) {
              const style = document.createElement('style');
              style.id = shadowStyleId;
              style.textContent = `
                :host, *, #container, #background, #chips-wrapper, #header, #masthead, #contents, #primary, ytd-rich-grid-renderer {
                  background-color: transparent !important;
                  background-image: none !important;
                  background: transparent !important;
                  box-shadow: none !important;
                }
              `;
              el.shadowRoot.appendChild(style);
            }
          } catch (e) {}
        }
      });
    });
  }

  // --- BULLETPROOF COPY-PASTE & TEXT SELECTION UNBLOCKER ---
  let isUnblockerAttached = false;

  function enableCopyPasteUnblocker() {
    if (isUnblockerAttached) return;
    isUnblockerAttached = true;

    // 1. Inject global unblock style tag
    let style = document.getElementById('omni-unblock-copy-paste-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'omni-unblock-copy-paste-css';
      style.textContent = `
        *, *::before, *::after, body, html, input, textarea, [contenteditable], .monaco-editor, .CodeMirror, pre, code {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          -webkit-touch-callout: default !important;
        }
        ::selection {
          background: #3390ec !important;
          color: #ffffff !important;
        }
        ::-moz-selection {
          background: #3390ec !important;
          color: #ffffff !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    // 2. Clear inline event blockers and apply to Shadow DOMs
    const cleanNodes = (root) => {
      if (!root) return;
      const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      elements.forEach(el => {
        ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 'ondragstart', 'unselectable'].forEach(attr => {
          if (el.hasAttribute && el.hasAttribute(attr)) {
            try { el.removeAttribute(attr); } catch (err) {}
          }
        });
      });
    };

    cleanNodes(document);

    const domObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            cleanNodes(node);
          }
        });
      }
    });

    if (document.documentElement) {
      domObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    // 3. Fallback Hotkeys if standard Cmd+V is intercepted by custom canvas (Option+V / Alt+V)
    window.addEventListener('keydown', async (e) => {
      const k = (e.key || '').toLowerCase();
      const code = e.code || '';
      const isAlt = e.altKey;

      if (isAlt && (k === 'v' || code === 'KeyV')) {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            window.postMessage({ type: 'AYAN_TRIGGER_PASTE', text: text }, '*');
          }
        } catch (err) {}
      } else if (isAlt && (k === 'c' || code === 'KeyC')) {
        window.postMessage({ type: 'AYAN_TRIGGER_COPY_REQ' }, '*');
      }
    }, { capture: true, passive: true });

    // Handle Copy Response from Main World (for Alt+C)
    window.addEventListener('message', async (event) => {
      if (event.data && event.data.type === 'AYAN_TRIGGER_COPY_RESP') {
        const text = event.data.text;
        if (text) {
          try {
            await navigator.clipboard.writeText(text);
          } catch (e) {}
        }
      }
    });
  }
})();
