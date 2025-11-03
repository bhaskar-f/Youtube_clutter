// background.js — Combined version
// =======================================================
// Original YouTube Declutter setup
// =======================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[YT Declutter] Extension installed/updated");

  // Set default settings
  await chrome.storage.sync.set({
    hideHome: false,
    hideSidebar: false,
    hideComments: false,
    hideShorts: false,
    hideAds: true,
  });

  console.log("[YT Declutter] Default settings applied");

  // Show a notification that refresh is needed for open tabs
  if (details.reason === "update") {
    console.log("[YT Declutter] Please refresh YouTube tabs to apply update");
  }

  // =======================================================
  // New EduTube Context Menu Initialization
  // =======================================================

  try {
    chrome.contextMenus.create({
      id: "edutube_whitelist_channel",
      title: "EduTube: Always show videos from this channel (Whitelist)",
      contexts: ["link", "page", "video"],
      documentUrlPatterns: ["*://www.youtube.com/*"],
    });

    chrome.contextMenus.create({
      id: "edutube_blacklist_channel",
      title: "EduTube: Hide all videos from this channel (Blacklist)",
      contexts: ["link", "page", "video"],
      documentUrlPatterns: ["*://www.youtube.com/*"],
    });

    console.log("[EduTube] Context menus created successfully");
  } catch (e) {
    console.warn("[EduTube] Context menu setup error:", e);
  }
});

// =======================================================
// EduTube Context Menu Handler
// =======================================================

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Extract channel ID from link or page
  let channelId = null;
  try {
    const url = info.linkUrl || info.pageUrl || "";
    if (url) {
      const mChannel = url.match(/\/channel\/([^/?#]+)/);
      const mHandle = url.match(/\/@([^/?#]+)/);
      const mC = url.match(/\/c\/([^/?#]+)/);
      if (mChannel) channelId = mChannel[1];
      else if (mHandle) channelId = "@" + mHandle[1];
      else if (mC) channelId = "c/" + mC[1];
    }
  } catch (e) {
    console.warn("[EduTube] Background link parse failed:", e);
  }

  if (!channelId) {
    // Ask the page to extract the channel ID (if link parsing fails)
    chrome.tabs.sendMessage(
      tab.id,
      { action: "edutube_extract_channel_for_context_menu", info },
      (resp) => {
        const id = resp?.channelId;
        if (id) forwardMessage(info.menuItemId, id, tab.id);
        else console.warn("[EduTube] Could not identify channel from page");
      }
    );
  } else {
    forwardMessage(info.menuItemId, channelId, tab.id);
  }
});

function forwardMessage(menuItemId, channelId, tabId) {
  const msgType =
    menuItemId === "edutube_whitelist_channel"
      ? "edutubeWhitelist"
      : "edutubeBlacklist";
  chrome.tabs.sendMessage(tabId, { type: msgType, channelId }, (resp) => {
    console.log(`[EduTube] Sent ${msgType} for ${channelId}`, resp);
  });
}
