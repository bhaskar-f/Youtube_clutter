// background.js - Minimal service worker

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
});
