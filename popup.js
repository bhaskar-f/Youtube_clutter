// popup.js – stable version with new video page features

function initPopup() {
  const checkboxes = [
    // Existing features
    "hideHome",
    "hideSidebar",
    "hideComments",
    "hideShorts",
    "hideHeader",
    "hideChipBar",
    "hideExplore",
    // NEW Video Page Features
    "hideVideoDescription",
    "hideChannelInfo",
    "hideEngagementButtons",
    "hideSuggestedVideos",
    "hideVideoTitle",
    "hideMerchShelf",
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
  // Initialize theme toggle
  initThemeToggle();
}

function initThemeToggle() {
  const body = document.body;
  const lightBtn = document.getElementById("lightMode");
  const darkBtn = document.getElementById("darkMode");

  if (!lightBtn || !darkBtn) {
    console.error("[popup] Theme buttons not found!");
    return;
  }

  // Load saved theme preference
  chrome.storage.sync.get("themeMode", (data) => {
    const mode = data.themeMode || "dark";
    applyTheme(mode);
  });

  // Theme button click handlers
  lightBtn.addEventListener("click", () => {
    setTheme("light");
  });

  darkBtn.addEventListener("click", () => {
    setTheme("dark");
  });

  function setTheme(mode) {
    chrome.storage.sync.set({ themeMode: mode });
    applyTheme(mode);
  }

  function applyTheme(mode) {
    if (mode === "light") {
      body.classList.add("light-mode");
      body.classList.remove("dark-mode");
      lightBtn.classList.add("active");
      darkBtn.classList.remove("active");
    } else {
      body.classList.remove("light-mode");
      body.classList.add("dark-mode");
      darkBtn.classList.add("active");
      lightBtn.classList.remove("active");
    }
  }
}

// Wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPopup);
} else {
  initPopup();
}
