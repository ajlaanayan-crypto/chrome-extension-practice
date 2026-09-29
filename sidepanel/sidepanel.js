// Side Panel JavaScript for Ayan Extension v1.1.0

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const adblockMasterSwitch = document.getElementById('adblock-master-switch');
  const blockedCountBadge = document.getElementById('blocked-count-badge');
  const themeMasterSwitch = document.getElementById('theme-master-switch');
  const unblockMasterSwitch = document.getElementById('unblock-master-switch');
  
  const dropZone = document.getElementById('drop-zone');
  const bgFileInput = document.getElementById('bg-file-input');
  const uploadPlaceholder = document.getElementById('upload-placeholder');
  const previewBox = document.getElementById('preview-box');
  const bgPreviewImg = document.getElementById('bg-preview-img');
  const removeImgBtn = document.getElementById('remove-img-btn');

  const sliderOpacity = document.getElementById('slider-opacity');
  const valOpacity = document.getElementById('val-opacity');
  const sliderBlur = document.getElementById('slider-blur');
  const valBlur = document.getElementById('val-blur');
  const sliderBrightness = document.getElementById('slider-brightness');
  const valBrightness = document.getElementById('val-brightness');
  const sliderContrast = document.getElementById('slider-contrast');
  const valContrast = document.getElementById('val-contrast');

  const selectFit = document.getElementById('select-fit');
  const selectBlend = document.getElementById('select-blend');
  const chkMakeTransparent = document.getElementById('chk-make-transparent');

  let currentImageData = '';

  // Load Saved Settings & Initial Stats
  loadSettings();
  updateAdBlockerStats();

  // High-frequency polling (300ms) for real-time live blocked counter badge
  setInterval(() => {
    updateAdBlockerStats();
  }, 300);

  // Master AdBlocker Switch
  adblockMasterSwitch.addEventListener('change', () => {
    saveAndNotify();
  });

  // Master Theme Switch
  themeMasterSwitch.addEventListener('change', () => {
    saveAndNotify();
  });

  // Unblock Copy-Paste Switch
  unblockMasterSwitch.addEventListener('change', () => {
    saveAndNotify();
  });

  // File Upload Handlers
  bgFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      processImageFile(file);
    }
  });

  // Drag & Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  });

  // Remove Image Button
  removeImgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentImageData = '';
    bgPreviewImg.src = '';
    previewBox.classList.add('hidden');
    uploadPlaceholder.classList.remove('hidden');
    bgFileInput.value = '';
    applySidePanelBackground('');
    saveAndNotify();
  });

  // Slider Live Input Listeners
  sliderOpacity.addEventListener('input', () => {
    valOpacity.textContent = `${Math.round(sliderOpacity.value * 100)}%`;
    saveAndNotify();
  });

  sliderBlur.addEventListener('input', () => {
    valBlur.textContent = `${sliderBlur.value}px`;
    saveAndNotify();
  });

  sliderBrightness.addEventListener('input', () => {
    valBrightness.textContent = `${sliderBrightness.value}%`;
    saveAndNotify();
  });

  sliderContrast.addEventListener('input', () => {
    valContrast.textContent = `${sliderContrast.value}%`;
    saveAndNotify();
  });

  selectFit.addEventListener('change', () => {
    saveAndNotify();
  });

  selectBlend.addEventListener('change', () => {
    saveAndNotify();
  });

  chkMakeTransparent.addEventListener('change', () => {
    saveAndNotify();
  });

  function processImageFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      currentImageData = evt.target.result;
      displayPreviewImage(currentImageData);
      applySidePanelBackground(currentImageData);
      themeMasterSwitch.checked = true;
      saveAndNotify();
    };
    reader.readAsDataURL(file);
  }

  function displayPreviewImage(dataUrl) {
    if (dataUrl) {
      bgPreviewImg.src = dataUrl;
      previewBox.classList.remove('hidden');
      uploadPlaceholder.classList.add('hidden');
    } else {
      bgPreviewImg.src = '';
      previewBox.classList.add('hidden');
      uploadPlaceholder.classList.remove('hidden');
    }
  }

  function applySidePanelBackground(dataUrl) {
    if (dataUrl) {
      document.body.style.backgroundImage = `linear-gradient(rgba(224, 229, 236, 0.85), rgba(224, 229, 236, 0.85)), url("${dataUrl}")`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = 'none';
    }
  }

  async function updateAdBlockerStats() {
    try {
      const res = await chrome.storage.local.get(['blockedAdsCount']);
      const count = res.blockedAdsCount || 0;
      if (blockedCountBadge) {
        blockedCountBadge.textContent = `🛡️ Blocked: ${count} Ads`;
      }
    } catch (e) {}
  }

  async function loadSettings() {
    try {
      const data = await chrome.storage.local.get([
        'adblockEnabled',
        'themeEnabled',
        'bgImageData',
        'bgOpacity',
        'bgBlur',
        'bgBlendMode',
        'bgFitMode',
        'bgBrightness',
        'bgContrast',
        'makeBodyTransparent',
        'unblockCopyPaste'
      ]);

      adblockMasterSwitch.checked = data.adblockEnabled !== false;
      themeMasterSwitch.checked = data.themeEnabled !== false;
      unblockMasterSwitch.checked = data.unblockCopyPaste !== false;

      if (data.bgImageData) {
        currentImageData = data.bgImageData;
        displayPreviewImage(currentImageData);
        applySidePanelBackground(currentImageData);
      }

      if (data.bgOpacity !== undefined) {
        sliderOpacity.value = data.bgOpacity;
        valOpacity.textContent = `${Math.round(data.bgOpacity * 100)}%`;
      }

      if (data.bgBlur !== undefined) {
        sliderBlur.value = data.bgBlur;
        valBlur.textContent = `${data.bgBlur}px`;
      }

      if (data.bgBrightness !== undefined) {
        sliderBrightness.value = data.bgBrightness;
        valBrightness.textContent = `${data.bgBrightness}%`;
      }

      if (data.bgContrast !== undefined) {
        sliderContrast.value = data.bgContrast;
        valContrast.textContent = `${data.bgContrast}%`;
      }

      if (data.bgFitMode) selectFit.value = data.bgFitMode;
      if (data.bgBlendMode) selectBlend.value = data.bgBlendMode;
      if (data.makeBodyTransparent !== undefined) {
        chkMakeTransparent.checked = data.makeBodyTransparent;
      }
    } catch (err) {
      console.warn('Error loading sidepanel settings:', err);
    }
  }

  async function saveAndNotify() {
    const settings = {
      adblockEnabled: adblockMasterSwitch.checked,
      themeEnabled: themeMasterSwitch.checked,
      unblockCopyPaste: unblockMasterSwitch.checked,
      bgImageData: currentImageData,
      bgOpacity: parseFloat(sliderOpacity.value),
      bgBlur: parseInt(sliderBlur.value, 10),
      bgBrightness: parseInt(sliderBrightness.value, 10),
      bgContrast: parseInt(sliderContrast.value, 10),
      bgFitMode: selectFit.value,
      bgBlendMode: selectBlend.value,
      makeBodyTransparent: chkMakeTransparent.checked
    };

    try {
      await chrome.storage.local.set(settings);

      if (settings.themeEnabled && currentImageData) {
        applySidePanelBackground(currentImageData);
      } else {
        applySidePanelBackground('');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_SETTINGS' }).catch(() => {});
      }
    } catch (err) {
      console.warn('Error saving sidepanel settings:', err);
    }
  }
});
