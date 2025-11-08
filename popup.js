// popup.js – stable version with new video page features and theme toggle

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

  // Initialize EduTube controls
  initEduTubeControls();
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

function initEduTubeControls() {
  const enableToggle = document.getElementById("edutubeEnabled");
  const sensitivitySlider = document.getElementById("edutubeSensitivity");
  const sensitivityValue = document.getElementById("sensitivityValue");
  const settingsContainer = document.getElementById("edutubeSettings");
  const videosHiddenEl = document.getElementById("videosHidden");
  const videosShownEl = document.getElementById("videosShown");

  // API controls
  const apiKeyInput = document.getElementById("youtubeApiKey");
  const saveApiKeyBtn = document.getElementById("saveApiKey");
  const apiHelpBtn = document.getElementById("apiHelpBtn");
  const apiHelp = document.getElementById("apiHelp");
  const apiStatusIndicator = document.getElementById("apiStatusIndicator");
  const apiStatusText = document.getElementById("apiStatusText");
  const apiQuota = document.getElementById("apiQuota");

  if (!enableToggle) {
    console.error("[popup] EduTube controls not found");
    return;
  }

  // Load saved EduTube settings
  chrome.storage.sync.get(
    [
      "edutubeEnabled",
      "edutubeSensitivity",
      "edutubeStats",
      "youtubeApiKey",
      "youtubeApiEnabled",
      "youtubeQuotaUsed",
      "youtubeQuotaResetTime",
    ],
    (data) => {
      const enabled = data.edutubeEnabled ?? false;
      const sensitivity = data.edutubeSensitivity ?? 50;
      const stats = data.edutubeStats || {
        videosHidden: 0,
        videosShown: 0,
        layerStats: {
          whitelist: 0,
          blacklist: 0,
          keywords: 0,
          api: 0,
          fallback: 0,
        },
      };

      enableToggle.checked = enabled;
      sensitivitySlider.value = sensitivity;
      updateSensitivityLabel(sensitivity);

      // Show/hide settings based on enabled state
      if (enabled) {
        settingsContainer.style.display = "block";
        updateStats(stats);
      }

      // Load API key (masked)
      if (data.youtubeApiKey) {
        const key = data.youtubeApiKey;
        apiKeyInput.value =
          key.substring(0, 8) + "..." + key.substring(key.length - 4);
        apiKeyInput.dataset.fullKey = key;
        updateApiStatus(
          true,
          data.youtubeQuotaUsed || 0,
          data.youtubeQuotaResetTime
        );
      }
    }
  );

  // Handle enable/disable toggle
  enableToggle.addEventListener("change", () => {
    const enabled = enableToggle.checked;
    chrome.storage.sync.set({ edutubeEnabled: enabled });

    // Show/hide settings
    if (enabled) {
      settingsContainer.style.display = "block";
    } else {
      settingsContainer.style.display = "none";
    }

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.length) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          type: "edutubeToggle",
          enabled,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.debug(
              "[popup] EduTube toggle message failed:",
              chrome.runtime.lastError.message
            );
          }
        }
      );
    });
  });

  // Handle sensitivity slider
  sensitivitySlider.addEventListener("input", () => {
    const value = parseInt(sensitivitySlider.value);
    updateSensitivityLabel(value);
  });

  sensitivitySlider.addEventListener("change", () => {
    const value = parseInt(sensitivitySlider.value);
    chrome.storage.sync.set({ edutubeSensitivity: value });

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.length) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          type: "edutubeSensitivity",
          value,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.debug(
              "[popup] Sensitivity update failed:",
              chrome.runtime.lastError.message
            );
          }
        }
      );
    });
  });

  // API Help toggle
  if (apiHelpBtn && apiHelp) {
    apiHelpBtn.addEventListener("click", () => {
      apiHelp.style.display =
        apiHelp.style.display === "none" ? "block" : "none";
    });
  }

  // Save API Key
  if (saveApiKeyBtn && apiKeyInput) {
    apiKeyInput.addEventListener("focus", () => {
      // Show full key when focused
      if (apiKeyInput.dataset.fullKey) {
        apiKeyInput.value = apiKeyInput.dataset.fullKey;
      }
    });

    saveApiKeyBtn.addEventListener("click", async () => {
      const apiKey = apiKeyInput.value.trim();

      if (!apiKey || apiKey.includes("...")) {
        alert("Please enter a valid YouTube API key");
        return;
      }

      // Save API key
      await chrome.storage.sync.set({
        youtubeApiKey: apiKey,
        youtubeApiEnabled: true,
      });

      // Mask the key
      apiKeyInput.value =
        apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
      apiKeyInput.dataset.fullKey = apiKey;

      updateApiStatus(true, 0, null);

      alert(
        "API key saved! EduTube will now use YouTube API for better accuracy."
      );

      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.length) return;
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "apiKeyUpdated",
        });
      });
    });
  }

  // Update stats periodically
  setInterval(() => {
    chrome.storage.sync.get(
      [
        "edutubeStats",
        "youtubeQuotaUsed",
        "youtubeQuotaResetTime",
        "youtubeApiEnabled",
      ],
      (data) => {
        if (data.edutubeStats) {
          updateStats(data.edutubeStats);
        }
        if (data.youtubeApiEnabled) {
          updateQuotaDisplay(
            data.youtubeQuotaUsed || 0,
            data.youtubeQuotaResetTime
          );
        }
      }
    );
  }, 2000);

  function updateSensitivityLabel(value) {
    if (!sensitivityValue) return;

    if (value <= 35) {
      sensitivityValue.textContent = "Relaxed";
    } else if (value >= 70) {
      sensitivityValue.textContent = "Strict";
    } else {
      sensitivityValue.textContent = "Balanced";
    }
  }

  function updateStats(stats) {
    if (videosHiddenEl) videosHiddenEl.textContent = stats.videosHidden || 0;
    if (videosShownEl) videosShownEl.textContent = stats.videosShown || 0;

    // Update layer stats
    const layerStats = stats.layerStats || {};
    const layerElements = {
      whitelist: document.getElementById("layerWhitelist"),
      blacklist: document.getElementById("layerBlacklist"),
      keywords: document.getElementById("layerKeywords"),
      api: document.getElementById("layerApi"),
      fallback: document.getElementById("layerFallback"),
    };

    Object.keys(layerElements).forEach((key) => {
      if (layerElements[key]) {
        layerElements[key].textContent = layerStats[key] || 0;
      }
    });
  }

  function updateApiStatus(enabled, quotaUsed = 0, resetTime = null) {
    if (!apiStatusIndicator || !apiStatusText) return;

    if (enabled) {
      apiStatusIndicator.className = "status-indicator active";
      apiStatusIndicator.textContent = "●";
      apiStatusText.textContent = "API Active";
      if (apiQuota) apiQuota.style.display = "block";
      updateQuotaDisplay(quotaUsed, resetTime);
    } else {
      apiStatusIndicator.className = "status-indicator inactive";
      apiStatusIndicator.textContent = "●";
      apiStatusText.textContent = "No API key set";
      if (apiQuota) apiQuota.style.display = "none";
    }
  }

  function updateQuotaDisplay(used, resetTime) {
    const quotaBar = document.getElementById("quotaBar");
    const quotaUsedEl = document.getElementById("quotaUsed");
    const quotaResetEl = document.getElementById("quotaReset");

    if (quotaBar && quotaUsedEl) {
      const percentage = ((used / 10000) * 100).toFixed(1);
      quotaBar.style.width = percentage + "%";
      quotaUsedEl.textContent = used.toLocaleString();
    }

    if (quotaResetEl && resetTime) {
      const date = new Date(resetTime);
      quotaResetEl.textContent = date.toLocaleTimeString();
    }
  }

  // Live updates from content script
  // 🧩 Live EduTube Stats Listener (real-time dynamic updates)
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== "edutubeStatsUpdate" || !msg.stats) return;

    const s = msg.stats || {};
    console.debug("[Popup] Live stats update:", s);

    // Update totals
    if (videosHiddenEl)
      videosHiddenEl.textContent = s.videosHidden ?? s.hidden ?? 0;
    if (videosShownEl)
      videosShownEl.textContent = s.videosShown ?? s.shown ?? 0;

    // Update layer breakdown if available
    const ls = s.layerStats || {};
    const layerElements = {
      whitelist: document.getElementById("layerWhitelist"),
      blacklist: document.getElementById("layerBlacklist"),
      keywords: document.getElementById("layerKeywords"),
      api: document.getElementById("layerApi"),
      fallback: document.getElementById("layerFallback"),
    };

    Object.entries(layerElements).forEach(([key, el]) => {
      if (el) el.textContent = ls[key] ?? 0;
    });

    // Save new stats to storage for persistence
    chrome.storage.sync.set({ edutubeStats: s });
  });

  // --- Whitelist/Blacklist management ---
  initListManagement();

  function initListManagement() {
    const wlInput = document.getElementById("wlInput");
    const wlKind = document.getElementById("wlKind");
    const wlAddBtn = document.getElementById("wlAddBtn");
    const wlAddCurrentVideo = document.getElementById("wlAddCurrentVideo");
    const wlAddCurrentChannel = document.getElementById("wlAddCurrentChannel");
    const wlList = document.getElementById("wlList");
    const wlHint = document.getElementById("wlHint");

    const blInput = document.getElementById("blInput");
    const blKind = document.getElementById("blKind");
    const blAddBtn = document.getElementById("blAddBtn");
    const blAddCurrentVideo = document.getElementById("blAddCurrentVideo");
    const blAddCurrentChannel = document.getElementById("blAddCurrentChannel");
    const blList = document.getElementById("blList");
    const blHint = document.getElementById("blHint");

    if (!wlList || !blList) return;

    // Clear lists before loading to prevent duplicates
    wlList.innerHTML = "";
    blList.innerHTML = "";

    // Load existing lists
    chrome.storage.sync.get(
      [
        "edutubeWhitelist",
        "edutubeBlacklist",
        "edutubeWhitelistVideos",
        "edutubeBlacklistVideos",
      ],
      (data) => {
        renderList(wlList, data.edutubeWhitelist || [], "channel", "whitelist");
        renderList(blList, data.edutubeBlacklist || [], "channel", "blacklist");
        renderList(
          wlList,
          data.edutubeWhitelistVideos || [],
          "video",
          "whitelist"
        );
        renderList(
          blList,
          data.edutubeBlacklistVideos || [],
          "video",
          "blacklist"
        );
        updateCounts();
      }
    );

    wlAddBtn?.addEventListener("click", () =>
      handleAdd("whitelist", wlKind.value, wlInput.value.trim(), wlHint)
    );
    blAddBtn?.addEventListener("click", () =>
      handleAdd("blacklist", blKind.value, blInput.value.trim(), blHint)
    );

    wlAddCurrentVideo?.addEventListener("click", () =>
      handleAddCurrent("whitelist", "video", wlHint)
    );
    wlAddCurrentChannel?.addEventListener("click", () =>
      handleAddCurrent("whitelist", "channel", wlHint)
    );
    blAddCurrentVideo?.addEventListener("click", () =>
      handleAddCurrent("blacklist", "video", blHint)
    );
    blAddCurrentChannel?.addEventListener("click", () =>
      handleAddCurrent("blacklist", "channel", blHint)
    );

    function handleAdd(list, idKind, raw, hintEl) {
      if (!raw) return showHint(hintEl, "Enter a YouTube URL or ID", true);
      const parsed = parseInput(raw);
      const finalKind = idKind === "auto" ? parsed.kind : idKind;
      const id = idKind === "auto" ? parsed.id : raw;
      if (!finalKind || !id)
        return showHint(
          hintEl,
          "Could not detect ID. Try selecting type.",
          true
        );
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.length) return;
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            type: "edutubeListUpdate",
            list,
            action: "add",
            idKind: finalKind,
            id,
          },
          () => {
            // Update storage mirrors for popup rendering
            const key = mapKey(list, finalKind);
            chrome.storage.sync.get([key], (data) => {
              const arr = new Set(data[key] || []);
              arr.add(id);
              chrome.storage.sync.set({ [key]: Array.from(arr) }, updateCounts);
            });
            addItemToList(
              list === "whitelist" ? wlList : blList,
              finalKind,
              id,
              list
            );
            showHint(hintEl, "Added.");
            updateCounts();
          }
        );
      });
    }

    function handleAddCurrent(list, idKind, hintEl) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.length) return;
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "edutubeGetCurrentIds" },
          (res) => {
            if (!res?.ok) return;
            const id = idKind === "channel" ? res.channelId : res.videoId;
            if (id) handleAdd(list, idKind, id, hintEl);
            else
              showHint(
                hintEl,
                `No current ${idKind} detected. Open a YouTube ${idKind} page.`,
                true
              );
          }
        );
      });
    }

    function renderList(ul, items, idKind, list) {
      items.forEach((id) => addItemToList(ul, idKind, id, list));
    }

    function addItemToList(ul, idKind, id, list) {
      const li = document.createElement("li");
      li.textContent = `${idKind === "channel" ? "CH" : "VID"}: ${id}`;
      const btn = document.createElement("button");
      btn.textContent = "✖";
      btn.className = "remove-btn";
      btn.addEventListener("click", () => removeItem(idKind, id, list, li));
      li.appendChild(btn);
      ul.appendChild(li);
    }

    function removeItem(idKind, id, list, li) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.length) return;
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "edutubeListUpdate", list, action: "remove", idKind, id },
          () => {
            const key = mapKey(list, idKind);
            chrome.storage.sync.get([key], (data) => {
              const arr = new Set(data[key] || []);
              arr.delete(id);
              chrome.storage.sync.set({ [key]: Array.from(arr) }, updateCounts);
            });
            li.remove();
            updateCounts();
          }
        );
      });
    }

    function mapKey(list, idKind) {
      if (list === "whitelist" && idKind === "channel")
        return "edutubeWhitelist";
      if (list === "blacklist" && idKind === "channel")
        return "edutubeBlacklist";
      if (list === "whitelist" && idKind === "video")
        return "edutubeWhitelistVideos";
      return "edutubeBlacklistVideos";
    }

    function updateCounts() {
      chrome.storage.sync.get(
        [
          "edutubeWhitelist",
          "edutubeBlacklist",
          "edutubeWhitelistVideos",
          "edutubeBlacklistVideos",
        ],
        (d) => {
          const wlCount =
            (d.edutubeWhitelist?.length || 0) +
            (d.edutubeWhitelistVideos?.length || 0);
          const blCount =
            (d.edutubeBlacklist?.length || 0) +
            (d.edutubeBlacklistVideos?.length || 0);
          const wlCountEl = document.getElementById("wlCount");
          const blCountEl = document.getElementById("blCount");
          if (wlCountEl) wlCountEl.textContent = wlCount;
          if (blCountEl) blCountEl.textContent = blCount;
        }
      );
    }

    function parseInput(text) {
      try {
        const t = text.trim();
        // Channel ID
        const ch = t.match(/(?:channel\/|\bUC)[A-Za-z0-9_-]{20,}/i);
        if (ch) {
          const id = ch[0].includes("channel/")
            ? ch[0].split("channel/")[1]
            : ch[0];
          return { kind: "channel", id };
        }
        // Video ID from URL or raw 11-char ID
        const urlVid = t.match(/[?&]v=([A-Za-z0-9_-]{11})/);
        if (urlVid) return { kind: "video", id: urlVid[1] };
        const shorts = t.match(/shorts\/([A-Za-z0-9_-]{11})/);
        if (shorts) return { kind: "video", id: shorts[1] };
        const youtu = t.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
        if (youtu) return { kind: "video", id: youtu[1] };
        if (/^[A-Za-z0-9_-]{11}$/.test(t)) return { kind: "video", id: t };
        return { kind: null, id: null };
      } catch {
        return { kind: null, id: null };
      }
    }

    function showHint(el, msg, isError = false) {
      if (!el) return;
      el.style.display = "block";
      el.textContent = msg;
      el.style.color = isError ? "#ff7676" : "#9ad17f";
      setTimeout(() => (el.style.display = "none"), 2000);
    }
  }
}

// Wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPopup);
} else {
  initPopup();
}
