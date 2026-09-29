// Service Worker for Ayan Extension v1.1.0

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("Error setting panel behavior:", error));
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.id && chrome.sidePanel && chrome.sidePanel.open) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (e) {
      console.warn("Could not open side panel via action click:", e);
    }
  }
});

// Track network declarativeNetRequest blocked rules if debug listener is available
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  try {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
      chrome.storage.local.get(['blockedAdsCount'], (res) => {
        const current = res.blockedAdsCount || 0;
        chrome.storage.local.set({ blockedAdsCount: current + 1 });
      });
    });
  } catch (e) {}
}

// Handle incoming background messages for AdBlock counter sync
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_ACTIVE_TAB') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        sendResponse({ tab });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'INCREMENT_BLOCKED_ADS') {
    const addCount = request.count || 1;
    chrome.storage.local.get(['blockedAdsCount'], (res) => {
      const current = res.blockedAdsCount || 0;
      const updated = current + addCount;
      chrome.storage.local.set({ blockedAdsCount: updated }, () => {
        sendResponse({ success: true, count: updated });
      });
    });
    return true;
  }

  if (request.action === 'RELOAD_ACTIVE_TAB_THEME') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          await chrome.tabs.sendMessage(tab.id, { action: 'APPLY_SETTINGS' });
        }
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }
});
