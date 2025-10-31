// popup.js — stable version (prevents "Receiving end does not exist")

function initPopup() {
  const checkboxes = [
    "hideHome",
    "hideSidebar",
    "hideComments",
    "hideShorts",
    "hideHeader",
    "hideChipBar",
  ];

  checkboxes.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`[popup] Missing element: ${id}`);
      return;
    }

    // Load saved values
    chrome.storage.sync.get(id, (data) => {
      el.checked = data[id] ?? false;
    });

    // Handle user toggles
    el.addEventListener("change", async () => {
      const value = el.checked;
      await chrome.storage.sync.set({ [id]: value });

      // Try to message current YouTube tab safely
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.length) return;
        const tabId = tabs[0].id;

        chrome.tabs.sendMessage(tabId, { setting: id, value }, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            // Happens when content script not present; ignore gracefully
            console.debug(
              "[popup] No content script in this tab:",
              lastError.message
            );
          } else if (response?.ok) {
            console.debug("[popup] Updated setting:", id, value);
          }
        });
      });
    });
  });
}

// Wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPopup);
} else {
  initPopup();
}
