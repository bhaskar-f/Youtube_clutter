// background.js — EduTube + Declutter (v12 compatible)
// =======================================================
// Handles:
// - Initial default settings
// - Context menus for channel WL/BL
// - Bridges context menu → contentScript via edutubeListUpdate
// =======================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[EduTube] Extension installed/updated");

  try {
    // Set sane defaults for declutter-related settings
    await chrome.storage.sync.set({
      hideHome: false,
      hideSidebar: false,
      hideComments: false,
      hideShorts: false,
      hideAds: true, // legacy flag – kept for compatibility if used in popup/UI
    });
    console.log("[EduTube] Default settings applied");
  } catch (e) {
    console.warn("[EduTube] Failed to set default settings:", e);
  }

  if (details.reason === "update") {
    console.log(
      "[EduTube] Updated – You may need to refresh open YouTube tabs."
    );
  }

  // =======================================================
  // EduTube Context Menu Initialization
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
// Helper: extract channel ID/handle from a URL
// =======================================================

function extractChannelIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const mChannel = url.match(/\/channel\/([^/?#]+)/);
    if (mChannel) return mChannel[1];

    const mHandle = url.match(/\/@([^/?#]+)/);
    if (mHandle) return "@" + mHandle[1];

    const mC = url.match(/\/c\/([^/?#]+)/);
    if (mC) return "c/" + mC[1];

    return null;
  } catch (e) {
    console.warn("[EduTube] extractChannelIdFromUrl error:", e);
    return null;
  }
}

// =======================================================
// Context Menu Click Handler → edutubeListUpdate
// =======================================================

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) {
    console.warn("[EduTube] No active tab for context menu action");
    return;
  }

  // Try to get channel ID from the clicked link or page URL
  const url = info.linkUrl || info.pageUrl || tab.url || "";
  let channelId = extractChannelIdFromUrl(url);

  if (!channelId) {
    console.warn(
      "[EduTube] Could not extract channelId from URL for context menu action"
    );
    return;
  }

  // Map menu item → whitelist/blacklist list
  const list =
    info.menuItemId === "edutube_whitelist_channel" ? "whitelist" : "blacklist";

  // Use the unified list update message that contentScript.js already supports
  const message = {
    type: "edutubeListUpdate",
    list, // "whitelist" | "blacklist"
    action: "add", // from context menu we always add
    idKind: "channel",
    id: channelId,
  };

  chrome.tabs.sendMessage(tab.id, message, (resp) => {
    const err = chrome.runtime.lastError;
    if (err) {
      console.warn(
        "[EduTube] Failed to send context menu WL/BL update to tab:",
        err.message
      );
    } else {
      console.log(
        `[EduTube] Context menu ${list} update for channel ${channelId}`,
        resp
      );
    }
  });
});
