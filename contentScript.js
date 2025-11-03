// ======================================================
// YouTube Declutter – FINAL Fixed Version
// - Debounced filtering (no continuous loops)
// - Improved scoring logic
// - Single message listener
// ======================================================

/* SETTINGS */
let settings = {
  hideHeader: false,
  hideHome: false,
  hideSidebar: false,
  hideComments: false,
  hideShorts: false,
  hideChipBar: false,
  hideExplore: false,
  hideVideoDescription: false,
  hideChannelInfo: false,
  hideEngagementButtons: false,
  hideSuggestedVideos: false,
  hideVideoTitle: false,
  hideMerchShelf: false,
};

const SETTING_TO_CLASS = {
  hideHeader: "declutter-hide-header",
  hideHome: "declutter-hide-home",
  hideSidebar: "declutter-hide-sidebar",
  hideComments: "declutter-hide-comments",
  hideShorts: "declutter-hide-shorts",
  hideChipBar: "declutter-hide-chipbar",
  hideExplore: "declutter-hide-explore",
  hideVideoDescription: "declutter-hide-video-description",
  hideChannelInfo: "declutter-hide-channel-info",
  hideEngagementButtons: "declutter-hide-engagement-buttons",
  hideSuggestedVideos: "declutter-hide-suggested-videos",
  hideVideoTitle: "declutter-hide-video-title",
  hideMerchShelf: "declutter-hide-merch-shelf",
};

const DEBUG = false;

let shortsCleanerInterval = null;
let mutationObserver = null;
let isExtensionValid = true;
let edutubeEngine = null;
let edutubeFilterTimeout = null;
let isEduTubeInitialized = false;
let isFiltering = false; // Prevent overlapping filter runs

function log(...args) {
  if (DEBUG) console.log("[declutter]", ...args);
}

function checkExtensionContext() {
  if (!chrome?.runtime?.id) {
    isExtensionValid = false;
    log("Extension context invalidated");
    cleanup();
    return false;
  }
  return true;
}

// Initialize EduTube only once
async function initEduTube() {
  if (isEduTubeInitialized) {
    log("[EduTube] Already initialized");
    return;
  }

  try {
    if (typeof EduTubeEngine === "undefined") {
      console.error("[EduTube] EduTubeEngine class not found!");
      return;
    }

    edutubeEngine = new EduTubeEngine();
    await edutubeEngine.init();
    isEduTubeInitialized = true;

    console.log("[EduTube] Engine initialized");

    if (edutubeEngine.enabled) {
      scheduleFilter();
      console.log("[EduTube] Filtering enabled");
    }
  } catch (e) {
    console.error("[EduTube] Init failed:", e);
  }
}

// IMPROVED: Async filtering with proper await
async function filterEducationalContent() {
  if (isFiltering) {
    log("[EduTube] Filter already running, skipping");
    return;
  }

  if (!edutubeEngine) {
    log("[EduTube] Engine not initialized");
    return;
  }

  if (!edutubeEngine.enabled) {
    log("[EduTube] Filtering skipped - disabled");
    document.body.classList.remove("declutter-edutube-active");
    return;
  }

  isFiltering = true;
  document.body.classList.add("declutter-edutube-active");

  let processedCount = 0;
  let hiddenCount = 0;
  let shownCount = 0;

  try {
    const videoSelectors = [
      "ytd-video-renderer",
      "ytd-grid-video-renderer",
      "ytd-compact-video-renderer",
      "ytd-rich-item-renderer",
      "ytd-playlist-panel-video-renderer",
      "ytm-rich-item-renderer",
      "ytm-grid-video-renderer",
    ];

    for (const selector of videoSelectors) {
      const elements = document.querySelectorAll(selector);

      for (const element of elements) {
        const vid = edutubeEngine.extractVideoId(element);
        if (!vid) continue;

        const proc = element.getAttribute("data-edutube-processed");

        // If different video ID, clear old data
        if (proc && proc !== vid) {
          element.removeAttribute("data-edutube-processed");
          element.removeAttribute("data-edutube-hidden");
        }

        // Skip if already processed this video
        if (element.getAttribute("data-edutube-processed") === vid) {
          if (element.hasAttribute("data-edutube-hidden")) hiddenCount++;
          else shownCount++;
          continue;
        }

        element.setAttribute("data-edutube-processed", vid);
        processedCount++;

        // AWAIT the async isEducational call
        let isEdu = false;
        try {
          isEdu = await edutubeEngine.isEducational(element);
        } catch (e) {
          console.warn("[EduTube] isEducational error:", e);
          isEdu = false;
        }

        if (!isEdu) {
          element.setAttribute("data-edutube-hidden", "true");
          hiddenCount++;
        } else {
          element.removeAttribute("data-edutube-hidden");
          shownCount++;
        }
      }
    }

    if (processedCount > 0) {
      console.log(
        `[EduTube] Processed ${processedCount} videos: ${shownCount} shown, ${hiddenCount} hidden`
      );
    }
  } catch (e) {
    console.error("[EduTube] Filter error:", e);
  } finally {
    isFiltering = false;
  }
  // 🧩 Update EduTube stats and notify popup
  try {
    if (typeof edutubeEngine !== "undefined" && edutubeEngine.stats) {
      edutubeEngine.stats.videosHidden += hiddenCount;
      edutubeEngine.stats.videosShown += shownCount;
      edutubeEngine.stats.sessionsFiltered =
        (edutubeEngine.stats.sessionsFiltered || 0) + 1;

      // Save to storage for persistence
      if (typeof edutubeEngine.saveSettings === "function") {
        await edutubeEngine.saveSettings();
      }

      // Send live stats to popup
      chrome.runtime.sendMessage({
        type: "edutubeStatsUpdate",
        stats: edutubeEngine.getStats
          ? edutubeEngine.getStats()
          : edutubeEngine.stats,
      });
    }
  } catch (err) {
    console.warn("[EduTube] Stats update error:", err);
  }
}

// DEBOUNCED scheduling - prevents continuous filtering
function scheduleFilter() {
  if (edutubeFilterTimeout) {
    clearTimeout(edutubeFilterTimeout);
  }

  // Debounce to 1200ms (only runs 1.2s after last mutation)
  edutubeFilterTimeout = setTimeout(() => {
    filterEducationalContent();
  }, 1200);
}

// Remove setInterval entirely - use mutation observer only
function stopEduTubeFilter() {
  if (edutubeFilterTimeout) {
    clearTimeout(edutubeFilterTimeout);
    edutubeFilterTimeout = null;
  }

  // Restore all hidden videos
  document.querySelectorAll("[data-edutube-hidden]").forEach((el) => {
    el.removeAttribute("data-edutube-hidden");
    el.removeAttribute("data-edutube-processed");
  });

  document.body.classList.remove("declutter-edutube-active");

  console.log("[EduTube] Filter stopped");
}

function cleanup() {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  if (shortsCleanerInterval) {
    clearInterval(shortsCleanerInterval);
    shortsCleanerInterval = null;
  }
  if (edutubeFilterTimeout) {
    clearTimeout(edutubeFilterTimeout);
    edutubeFilterTimeout = null;
  }
}

// -------------------- Explore hide/restore --------------------
function hideExploreElements() {
  try {
    const found = new Set();

    document.querySelectorAll("a[href*='/feed/explore']").forEach((a) => {
      const wrapper =
        a.closest(
          "ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytd-guide-section-renderer"
        ) || a;
      found.add(wrapper);
    });

    document
      .querySelectorAll(
        "ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytd-guide-section-renderer"
      )
      .forEach((el) => {
        try {
          const txt = (el.innerText || "").trim().toLowerCase();
          if (txt.includes("explore")) found.add(el);
        } catch (_) {}
      });

    found.forEach((el) => {
      if (!el || el.hasAttribute("data-declutter-explore-hidden")) return;
      el.setAttribute(
        "data-declutter-explore-original-display",
        el.style.display || ""
      );
      el.style.display = "none";
      el.setAttribute("data-declutter-explore-hidden", "true");
    });

    if (location.pathname.includes("/feed/explore")) {
      location.replace("/");
    }
  } catch (e) {
    console.warn("[declutter] hideExploreElements error:", e);
  }
}

function restoreExploreElements() {
  try {
    document
      .querySelectorAll("[data-declutter-explore-hidden]")
      .forEach((el) => {
        const orig = el.getAttribute("data-declutter-explore-original-display");
        el.style.display = orig === null ? "" : orig;
        el.removeAttribute("data-declutter-explore-original-display");
        el.removeAttribute("data-declutter-explore-hidden");
      });
  } catch (e) {
    console.warn("[declutter] restoreExploreElements error:", e);
  }
}

// -------------------- Shorts helpers --------------------
const SHORTS_SELECTORS = [
  "ytd-reel-shelf-renderer",
  "ytd-rich-shelf-renderer[is-shorts]",
  "ytd-reel-item-renderer",
  "ytd-reel-video-renderer",
  "ytd-rich-item-renderer:has(a[href*='/shorts/'])",
  "ytd-grid-video-renderer:has(a[href*='/shorts/'])",
  "a[href*='/shorts/']",
  "tp-yt-paper-tab[tab-title='Shorts']",
  "ytd-guide-entry-renderer[title='Shorts']",
  "ytd-mini-guide-entry-renderer[aria-label='Shorts']",
];

function removeShortsBlocks() {
  try {
    SHORTS_SELECTORS.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          if (!el.hasAttribute("data-declutter-shorts-hidden")) {
            el.setAttribute(
              "data-declutter-shorts-original-display",
              el.style.display || ""
            );
            el.style.display = "none";
            el.setAttribute("data-declutter-shorts-hidden", "true");
          }
        });
      } catch (e) {}
    });
  } catch (e) {
    console.warn("[declutter] removeShortsBlocks error:", e);
  }
}

function restoreShorts() {
  try {
    document
      .querySelectorAll("[data-declutter-shorts-hidden]")
      .forEach((el) => {
        const orig = el.getAttribute("data-declutter-shorts-original-display");
        el.style.display = orig === null ? "" : orig;
        el.removeAttribute("data-declutter-shorts-original-display");
        el.removeAttribute("data-declutter-shorts-hidden");
      });
  } catch (e) {
    console.warn("[declutter] restoreShorts error:", e);
  }
}

function redirectShorts(url) {
  try {
    const id = url.split("/shorts/")[1]?.split(/[/?#]/)[0];
    if (id) location.replace(`/watch?v=${id}`);
    else location.replace("/");
  } catch (e) {}
}

function interceptShortsNavigation() {
  try {
    if (location.pathname.startsWith("/shorts/"))
      redirectShorts(location.pathname);

    document.addEventListener(
      "click",
      (ev) => {
        const a = ev.target.closest && ev.target.closest("a[href*='/shorts/']");
        if (a) {
          ev.preventDefault();
          ev.stopImmediatePropagation();
          redirectShorts(a.href);
        }
      },
      true
    );

    window.addEventListener("yt-navigate-start", (e) => {
      const url = e.detail?.url || location.href;
      if (url.includes("/shorts/")) {
        e.stopImmediatePropagation();
        redirectShorts(url);
      }
    });
  } catch (e) {
    console.warn("[declutter] interceptShortsNavigation error:", e);
  }
}

function startShortsCleaner() {
  if (shortsCleanerInterval) return;
  shortsCleanerInterval = setInterval(() => {
    if (!checkExtensionContext()) return;
    if (settings.hideShorts) removeShortsBlocks();
  }, 1500);
}

function stopShortsCleaner() {
  if (shortsCleanerInterval) {
    clearInterval(shortsCleanerInterval);
    shortsCleanerInterval = null;
  }
}

// -------------------- Apply Hiding --------------------
function applyHiding() {
  const body = document.body;
  if (!body) return;

  Object.keys(SETTING_TO_CLASS).forEach((key) => {
    const cls = SETTING_TO_CLASS[key];
    const enabled = !!settings[key];
    if (document.documentElement)
      document.documentElement.classList.toggle(cls, enabled);
    body.classList.toggle(cls, enabled);
  });

  const mast = document.querySelector("ytd-masthead, #masthead");
  if (mast) {
    if (settings.hideHeader) {
      if (!mast.hasAttribute("data-declutter-hidden")) {
        mast.setAttribute(
          "data-declutter-original-display",
          mast.style.display || ""
        );
        mast.style.display = "none";
        mast.setAttribute("data-declutter-hidden", "true");
      }
    } else if (mast.hasAttribute("data-declutter-hidden")) {
      const orig = mast.getAttribute("data-declutter-original-display");
      mast.style.display = orig === null ? "" : orig;
      mast.removeAttribute("data-declutter-original-display");
      mast.removeAttribute("data-declutter-hidden");
    }
  }

  if (settings.hideExplore) hideExploreElements();
  else restoreExploreElements();

  if (settings.hideShorts) {
    removeShortsBlocks();
    interceptShortsNavigation();
    startShortsCleaner();
  } else {
    stopShortsCleaner();
    restoreShorts();
  }
}

// -------------------- Observer with debouncing --------------------
function attachObserverSafely() {
  if (!checkExtensionContext()) return;

  try {
    const target = document.documentElement || document.body;
    if (!target) {
      setTimeout(attachObserverSafely, 350);
      return;
    }

    if (mutationObserver) return;

    mutationObserver = new MutationObserver(() => {
      if (!checkExtensionContext()) return;
      applyHiding();

      // Schedule EduTube filter (debounced)
      if (edutubeEngine?.enabled) {
        scheduleFilter();
      }
    });

    mutationObserver.observe(target, {
      childList: true,
      subtree: true,
    });

    log("MutationObserver attached");

    // Re-filter on navigation
    window.addEventListener("yt-navigate-finish", () => {
      if (edutubeEngine?.enabled) {
        scheduleFilter();
      }
    });
  } catch (e) {
    console.warn("[declutter] attachObserverSafely error:", e);
  }
}

// -------------------- Single Message Listener --------------------
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!checkExtensionContext()) {
      sendResponse({ ok: false, error: "Extension context invalid" });
      return false;
    }

    try {
      // EduTube toggle
      if (msg.type === "edutubeToggle") {
        if (!edutubeEngine) {
          initEduTube().then(() => {
            if (edutubeEngine) {
              edutubeEngine.enabled = msg.enabled;
              if (msg.enabled) scheduleFilter();
              else stopEduTubeFilter();
            }
            sendResponse({ ok: true });
          });
          return true;
        }

        edutubeEngine.toggle(msg.enabled).then(() => {
          if (msg.enabled) scheduleFilter();
          else stopEduTubeFilter();
          sendResponse({ ok: true });
        });
        return true;
      }

      // Sensitivity change
      if (msg.type === "edutubeSensitivity") {
        if (!edutubeEngine) {
          sendResponse({ ok: false, error: "Engine not initialized" });
          return false;
        }

        edutubeEngine.setSensitivity(msg.value).then(() => {
          // Clear processed flags to re-evaluate
          document
            .querySelectorAll("[data-edutube-processed]")
            .forEach((el) => {
              el.removeAttribute("data-edutube-processed");
            });
          scheduleFilter();
          sendResponse({ ok: true });
        });
        return true;
      }

      // Whitelist/blacklist
      if (msg.type === "edutubeWhitelist" && edutubeEngine) {
        edutubeEngine.addToWhitelist(msg.channelId).then(() => {
          sendResponse({ ok: true });
        });
        return true;
      }

      if (msg.type === "edutubeBlacklist" && edutubeEngine) {
        edutubeEngine.addToBlacklist(msg.channelId).then(() => {
          sendResponse({ ok: true });
        });
        return true;
      }

      // Regular settings
      if (msg && typeof msg.setting === "string") {
        if (Object.prototype.hasOwnProperty.call(settings, msg.setting)) {
          settings[msg.setting] = !!msg.value;
          log(`Setting changed: ${msg.setting} = ${msg.value}`);
          applyHiding();
          sendResponse({ ok: true });
          return false;
        }
      }

      sendResponse({ ok: false, error: "Unknown message type" });
      return false;
    } catch (e) {
      console.error("[declutter] onMessage error:", e);
      sendResponse({ ok: false, error: e.message });
      return false;
    }
  });

  log("Message listener registered");
}

// -------------------- Init --------------------
function safeInit() {
  if (!checkExtensionContext()) {
    log("Cannot initialize - extension context invalid");
    return;
  }

  // Register message listener first
  setupMessageListener();

  // Initialize EduTube after delay
  setTimeout(() => {
    initEduTube();
  }, 1500);

  // Load settings
  try {
    chrome.storage.sync.get(Object.keys(settings), (data) => {
      if (chrome.runtime.lastError) {
        log("Storage error:", chrome.runtime.lastError.message);
        return;
      }

      if (!checkExtensionContext()) return;

      settings = { ...settings, ...data };
      log("Loaded settings:", settings);
      applyHiding();
    });
  } catch (e) {
    console.warn("[declutter] safeInit storage error:", e);
    applyHiding();
  }

  attachObserverSafely();
  log("Declutter init complete");
}

// Run when DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", safeInit);
} else {
  safeInit();
}
