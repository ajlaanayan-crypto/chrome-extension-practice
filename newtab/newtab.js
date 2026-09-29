document.addEventListener('DOMContentLoaded', () => {
  const newtabBg = document.getElementById('newtab-bg');
  const searchInput = document.getElementById('search-input');

  loadSettings();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      loadSettings();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        if (/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/i.test(query)) {
          const url = query.startsWith('http') ? query : `https://${query}`;
          window.location.href = url;
        } else {
          window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
      }
    }
  });

  async function loadSettings() {
    try {
      const data = await chrome.storage.local.get([
        'themeEnabled',
        'bgImageData',
        'bgOpacity',
        'bgBlur',
        'bgFitMode',
        'bgBrightness',
        'bgContrast'
      ]);

      if (data.themeEnabled !== false && data.bgImageData) {
        newtabBg.style.backgroundImage = `url("${data.bgImageData}")`;
        newtabBg.style.opacity = data.bgOpacity !== undefined ? data.bgOpacity : 1;
        newtabBg.style.backgroundSize = data.bgFitMode || 'cover';
        newtabBg.style.filter = `blur(${data.bgBlur || 0}px) brightness(${data.bgBrightness || 100}%) contrast(${data.bgContrast || 100}%)`;
      } else {
        newtabBg.style.backgroundImage = 'none';
      }
    } catch (e) {
      console.warn('Error loading newtab settings:', e);
    }
  }
});
