// popup.js – Optimized & synced with final popup.html + v12 engine
// - Declutter toggles
// - Theme toggle
// - EduTube enable/sensitivity
// - Stats
// - Whitelist/Blacklist management
// - YouTube API key (Option C: add/manage/remove)
// - YouTube search suggestions

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

  // Generic declutter toggles
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
  initSuggestions(); // YouTube-style suggestions for wl/bl inputs
}

// ===============================
// Theme Toggle
// ===============================
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

// ===============================
// Tab Switching for Whitelist/Blacklist
// ===============================
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

// ===============================
// EduTube Controls + API UI
// ===============================
function initEduTubeControls() {
  const enableToggle = document.getElementById("edutubeEnabled");
  const sensitivitySlider = document.getElementById("edutubeSensitivity");
  const sensitivityValue = document.getElementById("sensitivityValue");
  const settingsContainer = document.getElementById("edutubeSettings");
  const videosHiddenEl = document.getElementById("videosHidden");
  const videosShownEl = document.getElementById("videosShown");

  // New API UI (Option C)
  const apiAddMode = document.getElementById("api-add-mode");
  const apiManageMode = document.getElementById("api-manage-mode");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const apiSaveBtn = document.getElementById("apiSaveBtn");
  const apiRemoveBtn = document.getElementById("apiRemoveBtn");
  const apiStatusText = document.getElementById("apiStatusText");
  const apiKeyMasked = document.getElementById("apiKeyMasked");
  const apiQuotaText = document.getElementById("apiQuotaText");

  if (!enableToggle) {
    console.error("[popup] EduTube controls not found");
    return;
  }

  // Load saved EduTube settings + API key
  chrome.storage.sync.get(
    [
      "edutubeEnabled",
      "edutubeSensitivity",
      "edutubeStats",
      "edutubeApiKey",
      "youtubeApiKey", // old key name (for migration)
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

      // EduTube UI
      enableToggle.checked = enabled;
      sensitivitySlider.value = sensitivity;
      updateSensitivityLabel(sensitivity, sensitivityValue);

      if (enabled) {
        settingsContainer.style.display = "block";
        updateStats(stats, videosHiddenEl, videosShownEl);
      } else {
        settingsContainer.style.display = "none";
      }

      // API key (migrate from old youtubeApiKey if needed)
      let key = data.edutubeApiKey || data.youtubeApiKey || "";

      if (data.youtubeApiKey && !data.edutubeApiKey) {
        chrome.storage.sync.set({ edutubeApiKey: data.youtubeApiKey });
      }

      if (key) {
        showApiManageMode(
          key,
          apiAddMode,
          apiManageMode,
          apiKeyMasked,
          apiStatusText,
          apiQuotaText
        );
        fetchApiHealth(key, apiQuotaText);
      } else {
        showApiAddMode(apiAddMode, apiManageMode, apiStatusText, apiKeyInput);
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
    updateSensitivityLabel(value, sensitivityValue);
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

  // Save API Key (Add Mode)
  if (apiSaveBtn && apiKeyInput) {
    apiSaveBtn.addEventListener("click", () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        alert("Please enter a valid YouTube API key.");
        return;
      }

      chrome.storage.sync.set({ edutubeApiKey: key }, () => {
        showApiManageMode(
          key,
          apiAddMode,
          apiManageMode,
          apiKeyMasked,
          apiStatusText,
          apiQuotaText
        );
        fetchApiHealth(key, apiQuotaText);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs?.length) return;
          chrome.tabs.sendMessage(tabs[0].id, { type: "apiKeyUpdated" });
        });
      });
    });
  }

  // Remove API Key (Manage Mode)
  if (apiRemoveBtn) {
    apiRemoveBtn.addEventListener("click", () => {
      if (!confirm("Remove API Key?")) return;

      chrome.storage.sync.set({ edutubeApiKey: "" }, () => {
        showApiAddMode(apiAddMode, apiManageMode, apiStatusText, apiKeyInput);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs?.length) return;
          chrome.tabs.sendMessage(tabs[0].id, { type: "apiKeyUpdated" });
        });
      });
    });
  }

  // Periodic stats refresh (in case only storage is updated)
  setInterval(() => {
    chrome.storage.sync.get(["edutubeStats"], (data) => {
      if (data.edutubeStats) {
        updateStats(data.edutubeStats, videosHiddenEl, videosShownEl);
      }
    });
  }, 2000);

  // Live stats updates via message
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== "edutubeStatsUpdate" || !msg.stats) return;
    const s = msg.stats || {};
    updateStats(s, videosHiddenEl, videosShownEl);

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

  // WL/BL management
  initListManagement();
}

// --- Helpers for EduTube controls ---

function updateSensitivityLabel(value, el) {
  if (!el) return;

  if (value <= 35) {
    el.textContent = "Relaxed";
  } else if (value >= 70) {
    el.textContent = "Strict";
  } else {
    el.textContent = "Balanced";
  }
}

function updateStats(stats, videosHiddenEl, videosShownEl) {
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

// Switch API UI to "Add" mode
function showApiAddMode(apiAddMode, apiManageMode, apiStatusText, apiKeyInput) {
  if (apiAddMode) apiAddMode.style.display = "block";
  if (apiManageMode) apiManageMode.style.display = "none";
  if (apiStatusText) apiStatusText.textContent = "No API key added.";
  if (apiKeyInput) apiKeyInput.value = "";
}

// Switch API UI to "Manage" mode
function showApiManageMode(
  key,
  apiAddMode,
  apiManageMode,
  apiKeyMasked,
  apiStatusText,
  apiQuotaText
) {
  if (apiAddMode) apiAddMode.style.display = "none";
  if (apiManageMode) apiManageMode.style.display = "block";

  // Mask the key (first 3 + last 3 chars)
  if (apiKeyMasked) {
    const masked =
      key.length <= 6
        ? "******"
        : key.substring(0, 3) + "********" + key.substring(key.length - 3);
    apiKeyMasked.textContent = masked;
  }

  if (apiStatusText) apiStatusText.textContent = "API key saved.";
  if (apiQuotaText) apiQuotaText.textContent = "Checking…";
}

// Simple health check for API key (no quota math, just validity check)
async function fetchApiHealth(apiKey, apiQuotaText) {
  if (!apiKey || !apiQuotaText) return;

  try {
    apiQuotaText.textContent = "Checking…";

    const url =
      "https://www.googleapis.com/youtube/v3/videos?part=id&id=dummy&key=" +
      encodeURIComponent(apiKey);

    const res = await fetch(url);

    if (res.status === 400 || res.status === 403) {
      apiQuotaText.textContent = "Invalid API key";
    } else {
      apiQuotaText.textContent = "Active";
    }
  } catch (e) {
    console.error("[popup] API health check failed:", e);
    apiQuotaText.textContent = "Unable to check";
  }
}

// ===============================
// Whitelist/Blacklist Management
// ===============================
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
    handleAdd("whitelist", wlKind.value, wlInput.value.trim(), wlHint, wlList)
  );
  blAddBtn?.addEventListener("click", () =>
    handleAdd("blacklist", blKind.value, blInput.value.trim(), blHint, blList)
  );

  wlAddCurrentVideo?.addEventListener("click", () =>
    handleAddCurrent("whitelist", "video", wlHint, wlList)
  );
  wlAddCurrentChannel?.addEventListener("click", () =>
    handleAddCurrent("whitelist", "channel", wlHint, wlList)
  );
  blAddCurrentVideo?.addEventListener("click", () =>
    handleAddCurrent("blacklist", "video", blHint, blList)
  );
  blAddCurrentChannel?.addEventListener("click", () =>
    handleAddCurrent("blacklist", "channel", blHint, blList)
  );

  // --------- Keyword Normalization (fuzzy equivalence) ----------
  function normalizeKeyword(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  function handleAdd(list, idKind, raw, hintEl, ul) {
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
          addItemToList(ul, "keyword", id, list);

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
          addItemToList(ul, finalKind, id, list);
          showHint(hintEl, "Added.");
          updateCounts();
        }
      );
    });
  }

  function handleAddCurrent(list, idKind, hintEl, ul) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.length) return;
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "edutubeGetCurrentIds" },
        (res) => {
          if (!res?.ok) return;
          const id = idKind === "channel" ? res.channelId : res.videoId;
          if (id) handleAdd(list, idKind, id, hintEl, ul);
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

  function normalizeKeyword(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim();
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

  const parent = inputEl.parentElement;
  if (!parent) return;

  // Ensure positioning so suggestion-box overlays below without breaking layout
  if (!parent.style.position || parent.style.position === "static") {
    parent.style.position = "relative";
  }

  const box = document.createElement("div");
  box.className = "suggestion-box";
  box.style.display = "none";
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

  inputEl.addEventListener("blur", () => {
    setTimeout(() => {
      box.style.display = "none";
    }, 150);
  });

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

// ===============================
// DOM Ready
// ===============================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPopup);
} else {
  initPopup();
}
// ===============================
// QUOTA BAR MANAGEMENT
// ===============================

/**
 * Updates the quota bar visual display
 * @param {number} percent - Percentage (0-100)
 */
function setQuotaBar(percent) {
  const bar = document.getElementById("apiQuotaBar");
  const percentText = document.getElementById("apiQuotaPercent");

  if (!bar || !percentText) return;

  // Clamp between 0-100
  const clampedPercent = Math.max(0, Math.min(100, percent));

  // Update bar width
  bar.style.width = clampedPercent + "%";

  // Update percent text
  percentText.textContent = clampedPercent.toFixed(0) + "%";

  // Update color based on usage
  bar.classList.remove("warning", "danger");

  if (clampedPercent >= 80) {
    bar.classList.add("danger");
    percentText.style.color = "#f44336";
  } else if (clampedPercent >= 60) {
    bar.classList.add("warning");
    percentText.style.color = "#ff9800";
  } else {
    percentText.style.color = "#4caf50";
  }
}

// ===============================
// UPDATED API UI MODE SWITCHING
// ===============================

// Updated showApiAddMode function
function showApiAddMode(apiAddMode, apiManageMode, apiStatusText, apiKeyInput) {
  if (apiAddMode) apiAddMode.style.display = "block";
  if (apiManageMode) apiManageMode.style.display = "none";
  if (apiStatusText) apiStatusText.textContent = "No API key configured";
  if (apiKeyInput) apiKeyInput.value = "";
}

// Updated showApiManageMode function
function showApiManageMode(
  key,
  apiAddMode,
  apiManageMode,
  apiKeyMasked,
  apiStatusText,
  apiQuotaText
) {
  if (apiAddMode) apiAddMode.style.display = "none";
  if (apiManageMode) apiManageMode.style.display = "block";

  // Mask the key (first 4 + last 4 chars)
  if (apiKeyMasked) {
    const masked =
      key.length <= 8
        ? "••••••••••••"
        : key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
    apiKeyMasked.textContent = masked;
  }

  if (apiQuotaText) apiQuotaText.textContent = "Checking status...";

  // Initialize quota bar at 0%
  setQuotaBar(0);
}

// ===============================
// UPDATED API HEALTH CHECK
// ===============================

async function fetchApiHealth(apiKey, apiQuotaText) {
  if (!apiKey || !apiQuotaText) return;

  try {
    apiQuotaText.textContent = "Checking status...";
    setQuotaBar(0);

    const url =
      "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=" +
      encodeURIComponent(apiKey);

    const res = await fetch(url);

    if (res.status === 400 || res.status === 403) {
      apiQuotaText.textContent = "Invalid API key";
      setQuotaBar(100); // Show full red bar for error
      return;
    }

    if (res.ok) {
      apiQuotaText.textContent = "Active • Free tier (10,000 units/day)";

      // Simulate quota usage (you can replace this with actual quota API call)
      // For now, show 15% usage as example
      setQuotaBar(15);
    } else {
      apiQuotaText.textContent = "Unable to verify";
      setQuotaBar(0);
    }
  } catch (e) {
    console.error("[popup] API health check failed:", e);
    apiQuotaText.textContent = "Connection error";
    setQuotaBar(0);
  }
}
