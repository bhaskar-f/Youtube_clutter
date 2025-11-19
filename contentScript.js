// ======================================================
// YouTube Declutter – CORRECTED VERSION
// - Preserves all existing features
// - Fixes broken EduTube filtering & global blacklist
// - Adds watch page protection
// ======================================================

function fuzzyMatch(a, b) {
  if (!a || !b) return false;
  a = a.toLowerCase().replace(/\s+|[-_]/g, "");
  b = b.toLowerCase().replace(/\s+|[-_]/g, "");
  if (a === b) return true;
  const len = Math.max(a.length, b.length);
  let diff = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) diff++;
  }
  return 1 - diff / len >= 0.8;
}

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
let isFiltering = false;

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

    // FIX: Check watch page blacklist globally
    checkWatchPageGlobally();
  } catch (e) {
    console.error("[EduTube] Init failed:", e);
  }
}

// NEW: Check watch page for blacklisted videos/channels
function checkWatchPageGlobally() {
  try {
    if (!edutubeEngine?.enabled) return;
    if (typeof edutubeEngine.checkWatchPageBlacklist !== "function") return;

    // Check immediately
    edutubeEngine.checkWatchPageBlacklist();

    // Check again after page fully loads
    setTimeout(() => {
      edutubeEngine.checkWatchPageBlacklist();
    }, 2000);
  } catch (e) {
    console.debug("[EduTube] Watch page check error:", e);
  }
}

// Async filtering with proper await
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

        // === Keyword-based filtering (channel/title match) ===
        const titleText =
          element.querySelector("#video-title")?.innerText?.toLowerCase() || "";
        const channelText =
          element.querySelector("#channel-name")?.innerText?.toLowerCase() ||
          "";

        // Check for whitelist/blacklist keyword hits
        const inWhitelistKeyword = Array.from(
          edutubeEngine.whitelistKeywords || []
        ).some(
          (kw) =>
            titleText.includes(kw.toLowerCase()) ||
            channelText.includes(kw.toLowerCase()) ||
            fuzzyMatch(titleText, kw) ||
            fuzzyMatch(channelText, kw)
        );
        const inBlacklistKeyword = Array.from(
          edutubeEngine.blacklistKeywords || []
        ).some(
          (kw) =>
            titleText.includes(kw.toLowerCase()) ||
            channelText.includes(kw.toLowerCase()) ||
            fuzzyMatch(titleText, kw) ||
            fuzzyMatch(channelText, kw)
        );

        // If keyword triggers, apply immediately and skip deeper analysis
        if (inWhitelistKeyword) {
          element.removeAttribute("data-edutube-hidden");
          shownCount++;
          edutubeEngine.stats.layerStats.keywords++;
          continue;
        }
        if (inBlacklistKeyword) {
          element.setAttribute("data-edutube-hidden", "true");
          hiddenCount++;
          edutubeEngine.stats.layerStats.keywords++;
          continue;
        }

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

  // === Robust stats update + standardized message ===
  try {
    if (!edutubeEngine) throw new Error("edutubeEngine missing for stats");

    // Ensure stats object exists and numeric fields initialized
    edutubeEngine.stats = edutubeEngine.stats || {};
    edutubeEngine.stats.videosHidden =
      Number(edutubeEngine.stats.videosHidden) || 0;
    edutubeEngine.stats.videosShown =
      Number(edutubeEngine.stats.videosShown) || 0;
    edutubeEngine.stats.sessionsFiltered =
      Number(edutubeEngine.stats.sessionsFiltered) || 0;
    edutubeEngine.stats.layerStats = edutubeEngine.stats.layerStats || {};

    // Increment safely
    edutubeEngine.stats.videosHidden += Number(hiddenCount || 0);
    edutubeEngine.stats.videosShown += Number(shownCount || 0);
    edutubeEngine.stats.sessionsFiltered += 1;

    // Persist
    try {
      if (typeof edutubeEngine.saveSettings === "function") {
        await edutubeEngine.saveSettings();
      }
    } catch (saveErr) {
      console.warn(
        "[EduTube] saveSettings failed:",
        saveErr && saveErr.message ? saveErr.message : saveErr
      );
    }

    // Standardized payload that popup listens for
    const payload = {
      processed: Number(processedCount || 0),
      shown: Number(shownCount || 0),
      hidden: Number(hiddenCount || 0),
      videosShown: edutubeEngine.stats.videosShown,
      videosHidden: edutubeEngine.stats.videosHidden,
      layerStats: edutubeEngine.stats.layerStats || {},
      aggregate: edutubeEngine.getStats
        ? edutubeEngine.getStats()
        : edutubeEngine.stats,
    };

    console.debug("[EduTube] Stats sending:", payload);

    chrome.runtime.sendMessage({
      type: "edutubeStatsUpdate",
      stats: payload,
    });
  } catch (err) {
    console.warn(
      "[EduTube] Stats update error:",
      err && err.message ? err.message : err
    );
  }
}

// DEBOUNCED scheduling
function scheduleFilter() {
  if (edutubeFilterTimeout) {
    clearTimeout(edutubeFilterTimeout);
  }

  edutubeFilterTimeout = setTimeout(() => {
    filterEducationalContent();
  }, 1200);
}

function stopEduTubeFilter() {
  if (edutubeFilterTimeout) {
    clearTimeout(edutubeFilterTimeout);
    edutubeFilterTimeout = null;
  }

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
  "grid-shelf-view-model",
  "ytm-shorts-lockup-view-model",
  "ytm-shorts-lockup-view-model-v2",
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

    // Target individual Shorts videos (ytd-video-renderer)
    try {
      document.querySelectorAll("ytd-video-renderer").forEach((video) => {
        const hasShortsOverlay = video.querySelector(
          'ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]'
        );
        const shortsLink = video.querySelector('a[href*="/shorts/"]');

        if (hasShortsOverlay || shortsLink) {
          if (!video.hasAttribute("data-declutter-shorts-hidden")) {
            video.setAttribute(
              "data-declutter-shorts-original-display",
              video.style.display || ""
            );
            video.style.display = "none";
            video.setAttribute("data-declutter-shorts-hidden", "true");
          }
        }
      });
    } catch (e) {}
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

// -------------------- Observer --------------------
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

      // Check watch page on mutations
      if (edutubeEngine?.enabled) {
        checkWatchPageGlobally();
        scheduleFilter();
      }
    });

    mutationObserver.observe(target, {
      childList: true,
      subtree: true,
    });

    log("MutationObserver attached");

    window.addEventListener("yt-navigate-finish", () => {
      if (edutubeEngine?.enabled) {
        checkWatchPageGlobally();
        scheduleFilter();
      }
    });
  } catch (e) {
    console.warn("[declutter] attachObserverSafely error:", e);
  }
}

// --- Input resolution helper ---
async function resolveYouTubeInput(raw) {
  try {
    if (!raw || typeof raw !== "string") return { kind: null, id: null };
    const text = raw.trim();

    const channelMatch = text.match(
      /(?:channel\/|\/c\/|@|UC)[A-Za-z0-9_-]{2,}/i
    );
    if (channelMatch) {
      const maybe = channelMatch[0];
      if (/^UC[A-Za-z0-9_-]{20,}$/.test(maybe)) {
        return { kind: "channel", id: maybe };
      }
      if (maybe.includes("channel/")) {
        const id = maybe.split("channel/")[1];
        return { kind: "channel", id };
      }
      const handle = text.match(/@([\w\-]+)/);
      if (handle) return { kind: "channelName", id: handle[1].toLowerCase() };
    }

    const vidMatch =
      text.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
      text.match(/shorts\/([A-Za-z0-9_-]{11})/) ||
      text.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (vidMatch) return { kind: "video", id: vidMatch[1] };
    if (/^[A-Za-z0-9_-]{11}$/.test(text)) return { kind: "video", id: text };

    if (/^[a-zA-Z0-9\s]+$/.test(text)) {
      return { kind: "channelName", id: text.toLowerCase() };
    }

    return { kind: "videoTitle", id: text.toLowerCase() };
  } catch (e) {
    console.warn("[EduTube] resolveYouTubeInput error:", e);
    return { kind: null, id: null };
  }
}

// -------------------- Message Listener --------------------
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
              if (msg.enabled) {
                scheduleFilter();
                checkWatchPageGlobally();
              } else {
                stopEduTubeFilter();
              }
            }
            sendResponse({ ok: true });
          });
          return true;
        }

        edutubeEngine.toggle(msg.enabled).then(() => {
          if (msg.enabled) {
            scheduleFilter();
            checkWatchPageGlobally();
          } else {
            stopEduTubeFilter();
          }
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

      // NEW: Add non-educational channel
      if (msg.type === "edutubeAddNonEduChannel") {
        if (edutubeEngine) {
          edutubeEngine.addNonEduChannel(msg.channelId).then(() => {
            checkWatchPageGlobally();
            scheduleFilter();
            sendResponse({ ok: true });
          });
          return true;
        }
      }

      // NEW: Remove non-educational channel
      if (msg.type === "edutubeRemoveNonEduChannel") {
        if (edutubeEngine) {
          edutubeEngine.removeNonEduChannel(msg.channelId).then(() => {
            scheduleFilter();
            sendResponse({ ok: true });
          });
          return true;
        }
      }

      // Whitelist/Blacklist management
      if (edutubeEngine && msg.type === "edutubeListUpdate") {
        const { list, action, idKind, id } = msg;
        (async () => {
          try {
            const parsed = await resolveYouTubeInput(id);
            const resolvedKind = parsed.kind || idKind;
            const resolvedId = parsed.id || id;

            const doSchedule = () => {
              document
                .querySelectorAll("[data-edutube-processed]")
                .forEach((el) => el.removeAttribute("data-edutube-processed"));
              checkWatchPageGlobally();
              scheduleFilter();
            };

            // Handle keyword-based lists
            if (
              resolvedKind === "channelName" ||
              resolvedKind === "videoTitle"
            ) {
              const keyword = String(resolvedId || "").toLowerCase();
              if (!keyword) {
                sendResponse({ ok: false, error: "Could not parse input" });
                return;
              }

              edutubeEngine.whitelistKeywords =
                edutubeEngine.whitelistKeywords || new Set();
              edutubeEngine.blacklistKeywords =
                edutubeEngine.blacklistKeywords || new Set();

              if (list === "whitelist") {
                if (action === "add") {
                  edutubeEngine.whitelistKeywords.add(keyword);
                  edutubeEngine.blacklistKeywords.delete(keyword);
                } else {
                  edutubeEngine.whitelistKeywords.delete(keyword);
                }
              } else {
                if (action === "add") {
                  edutubeEngine.blacklistKeywords.add(keyword);
                  edutubeEngine.whitelistKeywords.delete(keyword);
                } else {
                  edutubeEngine.blacklistKeywords.delete(keyword);
                }
              }

              await edutubeEngine.saveSettings?.();

              edutubeEngine.stats = edutubeEngine.stats || {};
              edutubeEngine.stats.layerStats =
                edutubeEngine.stats.layerStats || {};
              const ls = edutubeEngine.stats.layerStats;
              if (action === "add") ls[list] = (ls[list] || 0) + 1;
              else if (action === "remove" && ls[list] > 0) ls[list] -= 1;

              chrome.runtime.sendMessage({
                type: "edutubeStatsUpdate",
                stats: edutubeEngine.getStats
                  ? edutubeEngine.getStats()
                  : edutubeEngine.stats,
              });
              doSchedule();
              sendResponse({ ok: true });
              return;
            }

            if (!resolvedKind || !resolvedId) {
              sendResponse({
                ok: false,
                error: "Could not determine ID kind or value",
              });
              return;
            }

            // Handle channel/video IDs
            const engineOps = {
              channel: {
                add: edutubeEngine.addToWhitelist.bind(edutubeEngine),
                remove: edutubeEngine.removeFromWhitelist.bind(edutubeEngine),
              },
              channel_black: {
                add: edutubeEngine.addToBlacklist.bind(edutubeEngine),
                remove: edutubeEngine.removeFromBlacklist.bind(edutubeEngine),
              },
              video: {
                add: edutubeEngine.addVideoToWhitelist.bind(edutubeEngine),
                remove:
                  edutubeEngine.removeVideoFromWhitelist.bind(edutubeEngine),
              },
              video_black: {
                add: edutubeEngine.addVideoToBlacklist.bind(edutubeEngine),
                remove:
                  edutubeEngine.removeVideoFromBlacklist.bind(edutubeEngine),
              },
            };

            let fn = null;
            if (list === "whitelist" && resolvedKind === "channel")
              fn = engineOps.channel[action];
            else if (list === "blacklist" && resolvedKind === "channel")
              fn = engineOps.channel_black[action];
            else if (list === "whitelist" && resolvedKind === "video")
              fn = engineOps.video[action];
            else if (list === "blacklist" && resolvedKind === "video")
              fn = engineOps.video_black[action];

            if (typeof fn !== "function") {
              sendResponse({ ok: false, error: "Unsupported operation" });
              return;
            }

            await fn(resolvedId);

            // Immediate DOM apply
            try {
              const selectors = [
                "ytd-video-renderer",
                "ytd-grid-video-renderer",
                "ytd-compact-video-renderer",
                "ytd-rich-item-renderer",
                "ytd-playlist-panel-video-renderer",
                "ytm-rich-item-renderer",
                "ytm-grid-video-renderer",
              ];

              const matchers = {
                channel: (el) => {
                  try {
                    const link = el.querySelector(
                      'a[href*="/channel/"], a[href*="/@"], a[href*="/c/"]'
                    );
                    if (!link) return null;
                    const href = link.getAttribute("href") || link.href || "";
                    let m = href.match(/\/channel\/([^/?#]+)/);
                    if (m) return m[1];
                    m = href.match(/@([^/?#]+)/);
                    if (m) return `@${m[1]}`;
                    m = href.match(/\/c\/([^/?#]+)/);
                    if (m) return `c/${m[1]}`;
                    return null;
                  } catch (e) {
                    return null;
                  }
                },
                video: (el) => {
                  try {
                    const a = el.querySelector(
                      'a[href*="/watch?v="], a#thumbnail, a.yt-simple-endpoint'
                    );
                    const href = a?.getAttribute("href") || a?.href || "";
                    const m =
                      href.match(/[?&]v=([^&]+)/) ||
                      href.match(/shorts\/([^/?#]+)/) ||
                      href.match(/youtu\.be\/([^/?#]+)/);
                    return m ? m[1] : null;
                  } catch (e) {
                    return null;
                  }
                },
              };

              for (const sel of selectors) {
                document.querySelectorAll(sel).forEach((el) => {
                  try {
                    const got = matchers[resolvedKind]?.(el);
                    if (!got) return;
                    if (got !== resolvedId) return;

                    if (list === "blacklist" && action === "add") {
                      el.setAttribute("data-edutube-hidden", "true");
                    } else if (list === "whitelist" && action === "add") {
                      el.removeAttribute("data-edutube-hidden");
                    } else if (action === "remove") {
                      el.removeAttribute("data-edutube-processed");
                    }
                  } catch (_) {}
                });
              }
            } catch (_) {}

            // Update layer stats
            edutubeEngine.stats = edutubeEngine.stats || {};
            edutubeEngine.stats.layerStats =
              edutubeEngine.stats.layerStats || {};
            const ls = edutubeEngine.stats.layerStats;
            ls[list] =
              (ls[list] || 0) +
              (action === "add" ? 1 : action === "remove" ? -1 : 0);
            if (ls[list] < 0) ls[list] = 0;

            // Persist stats & lists
            try {
              await edutubeEngine.saveSettings?.();
              chrome.storage.sync.set(
                { edutubeStats: edutubeEngine.stats },
                () => {}
              );
            } catch (saveErr) {
              console.warn("[EduTube] saveSettings error:", saveErr);
            }

            // Send live stats update
            chrome.runtime.sendMessage({
              type: "edutubeStatsUpdate",
              stats: edutubeEngine.getStats
                ? edutubeEngine.getStats()
                : edutubeEngine.stats,
            });

            // If we blacklisted the current video/channel, redirect
            try {
              const url = new URL(location.href);
              const currentVid =
                url.searchParams.get("v") ||
                (location.pathname.startsWith("/shorts/")
                  ? location.pathname.split("/shorts/")[1]?.split(/[?#]/)[0]
                  : null);
              const currentChannelEl = document.querySelector(
                'a[href*="/channel/"], a[href*="/@"]'
              );
              let currentChannel = null;
              if (currentChannelEl) {
                const chHref =
                  currentChannelEl.getAttribute("href") ||
                  currentChannelEl.href ||
                  "";
                const m =
                  chHref.match(/\/channel\/([^/?#]+)/) ||
                  chHref.match(/@([^/?#]+)/);
                if (m)
                  currentChannel = m[1]
                    ? chHref.includes("@")
                      ? `@${m[1]}`
                      : m[1]
                    : null;
              }

              if (list === "blacklist" && action === "add") {
                let shouldRemove = false;
                if (
                  resolvedKind === "video" &&
                  resolvedId &&
                  currentVid === resolvedId
                )
                  shouldRemove = true;
                if (
                  resolvedKind === "channel" &&
                  resolvedId &&
                  currentChannel === resolvedId
                )
                  shouldRemove = true;
                if (shouldRemove) {
                  location.replace("/");
                }
              }
            } catch (e) {}

            doSchedule();
            sendResponse({ ok: true });
          } catch (err) {
            console.error("[EduTube] edutubeListUpdate handler error:", err);
            sendResponse({
              ok: false,
              error: err && err.message ? err.message : String(err),
            });
          }
        })();
        return true;
      }

      if (msg.type === "edutubeGetCurrentIds") {
        try {
          const current = { videoId: null, channelId: null };
          const url = new URL(location.href);
          current.videoId =
            url.searchParams.get("v") ||
            (location.pathname.startsWith("/shorts/")
              ? location.pathname.split("/shorts/")[1]?.split(/[?#]/)[0]
              : null);
          const channelLink = document.querySelector('a[href*="/channel/"]');
          if (channelLink) {
            const m = channelLink.href.match(/\/channel\/([^/?#]+)/);
            if (m) current.channelId = m[1];
          }
          sendResponse({ ok: true, ...current });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
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
