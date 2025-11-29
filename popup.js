// popup.js – Updated for new HTML structure + keyword support + suggestions

function initPopup() {
  const checkboxes = [
    "hideHome",
    "hideSidebar",
    "hideComments",
    "hideShorts",
    "hideHeader",
    "hideChipBar",
    "hideExplore",
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

    chrome.storage.sync.get(id, (data) => {
      el.checked = data[id] ?? false;
    });

    el.addEventListener("change", async () => {
      const value = el.checked;
      await chrome.storage.sync.set({ [id]: value });

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.length) return;
        const tabId = tabs[0].id;

        chrome.tabs.sendMessage(tabId, { setting: id, value }, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
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

  initThemeToggle();
  initEduTubeControls();
  initTabSwitching();
  initSuggestions(); // 🔥 YouTube-style suggestions for wl/bl inputs
}

// Theme Toggle
function initThemeToggle() {
  const body = document.body;
  const lightBtn = document.getElementById("lightMode");
  const darkBtn = document.getElementById("darkMode");

  if (!lightBtn || !darkBtn) {
    console.error("[popup] Theme buttons not found!");
    return;
  }

  chrome.storage.sync.get("themeMode", (data) => {
    const mode = data.themeMode || "dark";
    applyTheme(mode);
  });

  lightBtn.addEventListener("click", () => setTheme("light"));
  darkBtn.addEventListener("click", () => setTheme("dark"));

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

// Tab Switching for Whitelist/Blacklist
function initTabSwitching() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabs = document.querySelectorAll(".tab");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");

      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabs.forEach((tab) => tab.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(targetTab)?.classList.add("active");
    });
  });
}

// EduTube Controls
function initEduTubeControls() {
  const enableToggle = document.getElementById("edutubeEnabled");
  const sensitivitySlider = document.getElementById("edutubeSensitivity");
  const sensitivityValue = document.getElementById("sensitivityValue");
  const settingsContainer = document.getElementById("edutubeSettings");
  const videosHiddenEl = document.getElementById("videosHidden");
  const videosShownEl = document.getElementById("videosShown");

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

      if (enabled) {
        settingsContainer.style.display = "block";
        updateStats(stats);
      } else {
        settingsContainer.style.display = "none";
      }

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
      } else {
        updateApiStatus(false);
      }
    }
  );

  // Enable/disable toggle
  enableToggle.addEventListener("change", () => {
    const enabled = enableToggle.checked;
    chrome.storage.sync.set({ edutubeEnabled: enabled });

    settingsContainer.style.display = enabled ? "block" : "none";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.length) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "edutubeToggle", enabled },
        () => {}
      );
    });
  });

  // Sensitivity slider
  sensitivitySlider.addEventListener("input", () => {
    const value = parseInt(sensitivitySlider.value, 10);
    updateSensitivityLabel(value);
  });

  sensitivitySlider.addEventListener("change", () => {
    const value = parseInt(sensitivitySlider.value, 10);
    chrome.storage.sync.set({ edutubeSensitivity: value });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.length) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "edutubeSensitivity", value },
        () => {}
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

      await chrome.storage.sync.set({
        youtubeApiKey: apiKey,
        youtubeApiEnabled: true,
      });

      apiKeyInput.value =
        apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
      apiKeyInput.dataset.fullKey = apiKey;

      updateApiStatus(true, 0, null);

      alert(
        "API key saved! EduTube will now use YouTube API for better accuracy."
      );

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.length) return;
        chrome.tabs.sendMessage(tabs[0].id, { type: "apiKeyUpdated" });
      });
    });
  }

  // Update stats periodically (to sync with background/content)
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

  // Live stats updates
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== "edutubeStatsUpdate" || !msg.stats) return;

    const s = msg.stats || {};

    if (videosHiddenEl)
      videosHiddenEl.textContent = s.videosHidden ?? s.hidden ?? 0;
    if (videosShownEl)
      videosShownEl.textContent = s.videosShown ?? s.shown ?? 0;

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

    chrome.storage.sync.set({ edutubeStats: s });
  });

  // Whitelist/Blacklist management
  initListManagement();
}

// Whitelist/Blacklist Management
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

  wlList.innerHTML = "";
  blList.innerHTML = "";

  // Load existing lists (channels, videos, keywords)
  chrome.storage.sync.get(
    [
      "edutubeWhitelist",
      "edutubeBlacklist",
      "edutubeWhitelistVideos",
      "edutubeBlacklistVideos",
      "edutubeWhitelistKeywords",
      "edutubeBlacklistKeywords",
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
      renderList(
        wlList,
        data.edutubeWhitelistKeywords || [],
        "keyword",
        "whitelist"
      );
      renderList(
        blList,
        data.edutubeBlacklistKeywords || [],
        "keyword",
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

  // --------- Keyword Normalization (fuzzy equivalence) ----------
  function normalizeKeyword(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") // remove spaces, punctuation, hyphens, underscores
      .trim();
  }

  function handleAdd(list, idKind, raw, hintEl) {
    if (!raw) return showHint(hintEl, "Enter a YouTube URL, ID, or name", true);

    const parsed = parseInput(raw);
    let finalKind = idKind === "auto" ? parsed.kind : idKind;
    let id = idKind === "auto" ? parsed.id : raw.trim();

    // Fallback → keyword rule when auto-detect fails
    if (!finalKind || !id) {
      finalKind = "keyword";
      id = raw.trim();
    }

    // KEYWORD PATH (names/titles): normalize + dedupe immediately
    if (finalKind === "keyword") {
      const normalized = normalizeKeyword(id);
      if (!normalized) return showHint(hintEl, "Invalid keyword", true);

      const storageKey =
        list === "whitelist"
          ? "edutubeWhitelistKeywords"
          : "edutubeBlacklistKeywords";

      chrome.storage.sync.get([storageKey], (data) => {
        const current = data[storageKey] || [];

        const exists = current.some(
          (item) => normalizeKeyword(item) === normalized
        );
        if (exists) {
          return showHint(hintEl, "Already exists in this list", true);
        }

        const updated = [...current, normalized];

        chrome.storage.sync.set({ [storageKey]: updated }, () => {
          updateCounts();

          // UI shows what user typed (id), but engine gets normalized version
          addItemToList(
            list === "whitelist" ? wlList : blList,
            "keyword",
            id,
            list
          );

          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs?.length) return;
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "edutubeListUpdate",
              list,
              action: "add",
              idKind: "keyword",
              id: normalized,
            });
          });

          showHint(hintEl, "Added.");
        });
      });

      return; // keyword path handled completely
    }

    // CHANNEL / VIDEO PATH (ID-based)
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

    let prefix;
    if (
      idKind === "keyword" ||
      idKind === "channelName" ||
      idKind === "videoTitle"
    ) {
      prefix = "KW";
    } else if (idKind === "channel") {
      prefix = "CH";
    } else {
      prefix = "VID";
    }

    const textSpan = document.createElement("span");
    textSpan.textContent = `${prefix}: ${id}`;

    const btn = document.createElement("button");
    btn.textContent = "✖";
    btn.addEventListener("click", () => removeItem(idKind, id, list, li));

    li.appendChild(textSpan);
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

          if (
            idKind === "keyword" ||
            idKind === "channelName" ||
            idKind === "videoTitle"
          ) {
            // match against normalized form
            const storageKey =
              list === "whitelist"
                ? "edutubeWhitelistKeywords"
                : "edutubeBlacklistKeywords";
            chrome.storage.sync.get([storageKey], (data) => {
              const current = data[storageKey] || [];
              const filtered = current.filter(
                (item) => normalizeKeyword(item) !== normalizeKeyword(id)
              );
              chrome.storage.sync.set({ [storageKey]: filtered }, updateCounts);
            });
          } else {
            chrome.storage.sync.get([key], (data) => {
              const arr = new Set(data[key] || []);
              arr.delete(id);
              chrome.storage.sync.set({ [key]: Array.from(arr) }, updateCounts);
            });
          }

          li.remove();
          updateCounts();
        }
      );
    });
  }

  function mapKey(list, kind) {
    if (kind === "keyword" || kind === "channelName" || kind === "videoTitle") {
      return list === "whitelist"
        ? "edutubeWhitelistKeywords"
        : "edutubeBlacklistKeywords";
    }

    if (kind === "channel") {
      return list === "whitelist" ? "edutubeWhitelist" : "edutubeBlacklist";
    }

    // default: video
    return list === "whitelist"
      ? "edutubeWhitelistVideos"
      : "edutubeBlacklistVideos";
  }

  function updateCounts() {
    chrome.storage.sync.get(
      [
        "edutubeWhitelist",
        "edutubeBlacklist",
        "edutubeWhitelistVideos",
        "edutubeBlacklistVideos",
        "edutubeWhitelistKeywords",
        "edutubeBlacklistKeywords",
      ],
      (d) => {
        const wlCount =
          (d.edutubeWhitelist?.length || 0) +
          (d.edutubeWhitelistVideos?.length || 0) +
          (d.edutubeWhitelistKeywords?.length || 0);
        const blCount =
          (d.edutubeBlacklist?.length || 0) +
          (d.edutubeBlacklistVideos?.length || 0) +
          (d.edutubeBlacklistKeywords?.length || 0);
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
      const ch = t.match(/(?:channel\/|\bUC)[A-Za-z0-9_-]{20,}/i);
      if (ch) {
        const id = ch[0].includes("channel/")
          ? ch[0].split("channel/")[1]
          : ch[0];
        return { kind: "channel", id };
      }
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

// ===============================
// YOUTUBE SEARCH SUGGESTIONS
// ===============================

function initSuggestions() {
  const wlInput = document.getElementById("wlInput");
  const blInput = document.getElementById("blInput");

  setupSuggestionBox(wlInput);
  setupSuggestionBox(blInput);
}

function setupSuggestionBox(inputEl) {
  if (!inputEl) return;

  // Parent is the flex input row (input + select + button)
  const parent = inputEl.parentElement;
  if (!parent) return;

  // Ensure positioning so suggestion-box overlays below without breaking layout
  if (!parent.style.position || parent.style.position === "static") {
    parent.style.position = "relative";
  }

  // Create suggestion dropdown
  const box = document.createElement("div");
  box.className = "suggestion-box";
  box.style.display = "none";

  // Insert BELOW the input row, still visually under the input
  parent.appendChild(box);

  let currentIndex = -1;
  let suggestions = [];
  let debounceId = null;

  inputEl.addEventListener("input", () => {
    const q = inputEl.value.trim();

    if (debounceId) clearTimeout(debounceId);

    if (!q) {
      box.style.display = "none";
      suggestions = [];
      return;
    }

    debounceId = setTimeout(async () => {
      suggestions = await fetchYoutubeSuggestions(q);
      renderSuggestions();
    }, 200);
  });

  inputEl.addEventListener("keydown", (e) => {
    if (box.style.display === "none" || !suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % suggestions.length;
      highlightSuggestion();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      currentIndex =
        (currentIndex - 1 + suggestions.length) % suggestions.length;
      highlightSuggestion();
    } else if (e.key === "Enter") {
      if (currentIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[currentIndex]);
      }
    } else if (e.key === "Escape") {
      box.style.display = "none";
    }
  });

  // Hide suggestions on blur (with slight delay so click on item still works)
  inputEl.addEventListener("blur", () => {
    setTimeout(() => {
      box.style.display = "none";
    }, 150);
  });

  // Hide when clicking outside
  document.addEventListener("click", (e) => {
    if (e.target === inputEl) return;
    if (!box.contains(e.target)) {
      box.style.display = "none";
    }
  });

  function renderSuggestions() {
    box.innerHTML = "";
    currentIndex = -1;

    if (!suggestions.length) {
      box.style.display = "none";
      return;
    }

    suggestions.forEach((s) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.textContent = s;

      // mousedown so it fires before blur hides box
      div.addEventListener("mousedown", () => selectSuggestion(s));

      box.appendChild(div);
    });

    box.style.display = "block";
  }

  function highlightSuggestion() {
    Array.from(box.children).forEach((child, idx) => {
      child.classList.toggle("active", idx === currentIndex);
    });

    if (currentIndex >= 0) {
      inputEl.value = suggestions[currentIndex];
    }
  }

  function selectSuggestion(text) {
    inputEl.value = text;
    box.style.display = "none";
  }
}

// Fetch suggestions from YouTube (no API key needed)
async function fetchYoutubeSuggestions(query) {
  try {
    const url =
      "https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=" +
      encodeURIComponent(query);

    const res = await fetch(url);
    const data = await res.json();

    return data[1] || [];
  } catch (e) {
    console.error("[popup] Suggestion fetch error:", e);
    return [];
  }
}

// Wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPopup);
} else {
  initPopup();
}
