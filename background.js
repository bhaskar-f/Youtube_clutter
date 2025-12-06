// =========================================================
// eduguard Background Script (Zarvis Optimized v11.5)
// - Initializes default settings
// - Manages WL/BL via right-click context menus
// - Forwards WL/BL and sensitivity changes to content scripts
// - Handles popup → tab messaging reliably
// - Fully MV3-safe
// =========================================================

// ---------------------------------------------
// Default settings bootstrap
// ---------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(null, (data) => {
    const defaults = {
      eduguardEnabled: true,
      eduguardSensitivity: 50,
      whitelist: [],
      blacklist: [],
      whitelistVideos: [],
      blacklistVideos: [],
      whitelistKeywords: [],
      blacklistKeywords: [],
    };

    const toSet = {};
    for (const key in defaults) {
      if (data[key] === undefined) toSet[key] = defaults[key];
    }

    if (Object.keys(toSet).length > 0) {
      chrome.storage.sync.set(toSet);
    }
  });

  setupContextMenus();
});

// ---------------------------------------------
// Context Menus (Right-Click Support)
// ---------------------------------------------
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "eduguardRoot",
      title: "EduGuard",
      contexts: ["selection", "link", "page"],
    });

    chrome.contextMenus.create({
      id: "wlChannel",
      parentId: "eduguardRoot",
      title: "Whitelist Channel",
      contexts: ["selection", "link"],
    });

    chrome.contextMenus.create({
      id: "blChannel",
      parentId: "eduguardRoot",
      title: "Blacklist Channel",
      contexts: ["selection", "link"],
    });
  });
}

// Best-case consistent channel extractor
function extractChannelId(input) {
  if (!input) return null;

  // Full channel URL
  let m = input.match(/\/channel\/([^/?]+)/);
  if (m) return m[1];

  // Handle-style @channelname
  m = input.match(/@([^/?]+)/);
  if (m) return "@" + m[1];

  return null;
}

// ---------------------------------------------
// Context Menu Handler
// ---------------------------------------------
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  let channelId = null;

  // Extract from link, selection, or fall back
  channelId =
    extractChannelId(info.linkUrl) ||
    extractChannelId(info.selectionText) ||
    null;

  if (!channelId) {
    console.warn("[EduGuard BG] No channelId could be extracted");
    return;
  }

  let payload = null;

  if (info.menuItemId === "wlChannel") {
    payload = {
      type: "eduguardListUpdate",
      list: "whitelist",
      action: "add",
      idKind: "channel",
      id: channelId,
    };
  }

  if (info.menuItemId === "blChannel") {
    payload = {
      type: "eduguardListUpdate",
      list: "blacklist",
      action: "add",
      idKind: "channel",
      id: channelId,
    };
  }

  if (!payload) return;

  chrome.tabs.sendMessage(tab.id, payload, (resp) => {
    const err = chrome.runtime.lastError;
    if (err) {
      // Happens when tab has no content script (non-YouTube pages)
      console.debug("[EduGuard BG] No receiver:", err.message);
    }
  });
});

// ---------------------------------------------
// Popup → ContentScript Messaging Proxy
// ---------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Popup wants to forward message to active tab
  if (msg?.type === "popupForward") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;

      chrome.tabs.sendMessage(tabs[0].id, msg.payload, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) {
          sendResponse({ ok: false });
        } else {
          sendResponse({ ok: true, resp });
        }
      });
    });

    return true; // async
  }
});

// ---------------------------------------------
// Debug (optional)
// ---------------------------------------------
console.log("[EduGuard] background.js loaded (optimized)");
