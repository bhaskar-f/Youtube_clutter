// ======================================================
// YouTube Declutter + EduTube – Stable Baseline (Hybrid v11.5)
// - Preserves all existing features & selectors
// - Keeps declutter-hide-* class names
// - Aligned with popup.js + EduTubeEngine v11.5 hybrid
// - Whole-channel shelf hiding: WL/BL IDs + keywords only (no scoring)
// - Keyword rules also match channel handles/rawChannelId (@ezsnippet etc.)
// - Watch-page auto-block uses unified isEducational(info)
// ======================================================

const DEBUG = false;
function log(...args) {
  if (DEBUG) console.log("[declutter]", ...args);
}

// ---------- Soft fuzzy match helper (content-side only) ----------
function smartKeywordMatch(text, keyword) {
  if (!text || !keyword) return false;
  const textNorm = text.toLowerCase();
  const kwNorm = keyword.toLowerCase().trim();
  if (!kwNorm) return false;

  // STAGE 1: exact substring
  if (textNorm.includes(kwNorm)) return true;

  // STAGE 2: word-boundary match
  const wordBoundaryRegex = new RegExp(
    `\\b${kwNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i"
  );
  if (wordBoundaryRegex.test(text)) return true;

  // STAGE 3: stemming tolerance
  if (kwNorm.length >= 4) {
    const stem = kwNorm.replace(/(s|es|ing|ed|er|ly)$/, "");
    if (stem.length >= 3 && textNorm.includes(stem)) {
      const stemRegex = new RegExp(
        `\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[a-z]*\\b`,
        "i"
      );
      return stemRegex.test(text);
    }
  }

  return false;
}

/* ========== DECLUTTER SETTINGS ========== */

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

let shortsCleanerInterval = null;
let mutationObserver = null;
let isExtensionValid = true;

let edutubeEngine = null;
let isEduTubeInitialized = false;
let edutubeFilterTimeout = null;
let isFiltering = false; // throttle guard for MutationObserver
let observerCooldown = false;

// Blocked video IDs (per session) to avoid loops when bouncing back
const blockedVideoIds = new Set();

// Inline preview CSS guard
let inlinePreviewStyleInjected = false;

function checkExtensionContext() {
  if (!chrome?.runtime?.id) {
    isExtensionValid = false;
    cleanup();
    return false;
  }
  return true;
}

/* ========== EduTube element helpers ========== */

function hideEduVideoElement(el) {
  if (!el) return;
  if (!el.hasAttribute("data-edutube-original-display")) {
    el.setAttribute("data-edutube-original-display", el.style.display || "");
  }
  el.style.display = "none";
  el.setAttribute("data-edutube-hidden", "true");
}

function showEduVideoElement(el) {
  if (!el) return;
  const orig = el.getAttribute("data-edutube-original-display");
  if (orig !== null) {
    el.style.display = orig;
  } else {
    el.style.display = "";
  }
  el.removeAttribute("data-edutube-original-display");
  el.removeAttribute("data-edutube-hidden");
}

/* ========== EduTube init + watch-page check ========== */

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

    // Properly wire up API service
    if (typeof YouTubeAPIService !== "undefined" && !edutubeEngine.apiService) {
      const apiService = new YouTubeAPIService();
      await apiService.init();
      edutubeEngine.setApiService(apiService);
      console.log("[EduTube] API service connected:", apiService.enabled);
    }

    isEduTubeInitialized = true;
    console.log(
      "[EduTube] Engine initialized, enabled =",
      edutubeEngine.enabled
    );

    if (edutubeEngine.enabled) {
      scheduleFilter();
      checkWatchPageGlobally();
    }
  } catch (e) {
    console.error("[EduTube] Init failed:", e);
  }
}

function checkWatchPageGlobally() {
  try {
    if (!edutubeEngine?.enabled) return;

    // Explicit blacklist-based watch-page checks (if engine implements it)
    if (typeof edutubeEngine.checkWatchPageBlacklist === "function") {
      try {
        edutubeEngine.checkWatchPageBlacklist();
        setTimeout(() => {
          try {
            edutubeEngine.checkWatchPageBlacklist();
          } catch (_) {}
        }, 2000);
      } catch (e) {
        console.debug("[EduTube] checkWatchPageBlacklist error:", e);
      }
    }

    // Scoring-aware guard for watch pages (non-educational auto-block)
    autoBlockCurrentWatchIfNeeded();
  } catch (e) {
    console.debug("[EduTube] Watch page check error:", e);
  }
}

/* ========== Watch-page autoplay + navigation guard ========== */

/**
 * Disable YouTube inline preview / hover autoplay globally.
 * This only affects inline thumbnail previews – not the main player.
 */
function disableInlinePreviews() {
  try {
    if (inlinePreviewStyleInjected) return;
    const root = document.documentElement || document;
    const style = document.createElement("style");
    style.setAttribute("data-edutube-inline-preview-style", "true");
    style.textContent = `
      ytd-thumbnail-overlay-inline-preview-renderer,
      ytd-inline-preview-renderer,
      ytd-thumbnail #inline-preview-player,
      ytd-thumbnail-overlay-toggle-mode-renderer[inline-preview-state],
      ytd-thumbnail-overlay-toggle-mode-renderer[overlay-style="INLINE_PREVIEW"] {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    root.appendChild(style);
    inlinePreviewStyleInjected = true;
  } catch (e) {
    console.debug("[EduTube] disableInlinePreviews error:", e);
  }
}

/**
 * Hard stop the main watch player(s) to avoid any unwanted playback.
 * If hideVideo = true, video elements are temporarily hidden while we decide.
 */
function hardStopWatchPlayer(hideVideo) {
  try {
    const videos = document.querySelectorAll("video");
    videos.forEach((v) => {
      try {
        v.pause();
        v.autoplay = false;
        v.removeAttribute("autoplay");
        v.muted = true;
        if (hideVideo) {
          v.style.visibility = "hidden";
        }
      } catch (_) {}
    });

    // Try to keep the "Autoplay" toggle off where possible
    try {
      const autoToggle = document.querySelector(
        "ytd-compact-autoplay-renderer [role='button'][aria-pressed='true'], " +
          "ytd-watch-next-secondary-results-renderer [role='button'][aria-pressed='true']"
      );
      if (autoToggle) {
        autoToggle.click();
      }
    } catch (_) {}
  } catch (e) {
    console.debug("[EduTube] hardStopWatchPlayer error:", e);
  }
}

/**
 * Navigate away from a blocked video as safely as possible.
 * Prefer going back to the previous YouTube page; fall back to home.
 */
function safeBounceFromBlockedVideo() {
  try {
    showEduTubeBlockOverlay();
    const ref = document.referrer || "";
    const isYouTubeRef =
      ref.includes("youtube.com") || ref.includes("youtu.be");

    hardStopWatchPlayer(true);

    if (isYouTubeRef) {
      setTimeout(() => history.back(), 700);

      // Fallback: if still on a watch/shorts URL after a moment, go home
      setTimeout(() => {
        try {
          const url = new URL(location.href);
          if (
            url.pathname === "/watch" ||
            url.pathname.startsWith("/shorts/")
          ) {
            setTimeout(() => location.replace("/"), 700);
          }
        } catch (_) {}
      }, 1200);
    } else {
      setTimeout(() => location.replace("/"), 700);
    }
  } catch (e) {
    console.debug("[EduTube] safeBounceFromBlockedVideo error:", e);
  }
}

/**
 * Check the current /watch (or shorts) page and, if clearly non-educational
 * according to the hybrid v11.5 engine, block it and bounce back.
 */
async function autoBlockCurrentWatchIfNeeded() {
  try {
    if (!edutubeEngine || !edutubeEngine.enabled) return;

    const path = location.pathname;
    if (!path.startsWith("/watch") && !path.startsWith("/shorts")) return;

    // --- Extract videoId from URL (/watch or /shorts) ---
    let videoId = null;
    try {
      const url = new URL(location.href);
      videoId =
        url.searchParams.get("v") ||
        (path.startsWith("/shorts")
          ? path.split("/shorts/")[1]?.split("?")[0]
          : null);
    } catch {
      return;
    }
    if (!videoId) return;

    // If we already blocked this ID in this session, just bounce
    if (blockedVideoIds.has(videoId)) {
      safeBounceFromBlockedVideo();
      return;
    }

    // Pause/hide the player while we decide
    hardStopWatchPlayer(true);

    // --- Extract watch-page metadata ---
    const title =
      document
        .querySelector("h1.ytd-watch-metadata yt-formatted-string")
        ?.textContent?.trim() ||
      document
        .querySelector("#title h1 yt-formatted-string")
        ?.textContent?.trim() ||
      document.querySelector("ytd-watch-metadata h1")?.textContent?.trim() ||
      document.title.replace(" - YouTube", "").trim() ||
      "";

    const channelName =
      document.querySelector("#channel-name a")?.textContent?.trim() ||
      document.querySelector("ytd-channel-name a")?.textContent?.trim() ||
      document.querySelector("#owner #channel-name")?.textContent?.trim() ||
      "";

    const description =
      document
        .querySelector("ytd-watch-metadata #description-inline-expander")
        ?.innerText?.trim() ||
      document
        .querySelector("#description yt-formatted-string")
        ?.innerText?.trim() ||
      "";

    // For now, treat longDescription as the same description (engine can still use it)
    const longDescription = description;

    // Hashtags/tags text from watch metadata & description
    let tagsText = "";
    try {
      const tagEls = document.querySelectorAll(
        "ytd-watch-metadata a[href*='/hashtag/'], #description a[href*='/hashtag/']"
      );
      const tags = Array.from(tagEls)
        .map((a) => a.textContent?.trim())
        .filter(Boolean);
      tagsText = tags.join(" ");
    } catch (_) {
      tagsText = "";
    }

    // Channel description is not directly on watch page in most layouts
    const channelDescription = "";

    // --- Channel ID from link ---
    let channelId = null;
    const channelLink = document.querySelector(
      "#owner a[href*='/channel/'], #owner a[href^='/@']"
    );
    if (channelLink) {
      const href = channelLink.getAttribute("href") || "";
      const m1 = href.match(/\/channel\/([^/?#]+)/);
      const m2 = href.match(/\/@([^/?#]+)/);
      if (m1) channelId = m1[1];
      else if (m2) channelId = `@${m2[1]}`;
    }

    // Unified info object for engine (v11.5 expects these fields)
    const info = {
      title,
      description,
      channelName,
      channelDescription,
      longDescription,
      tagsText,
      videoId,
      channelId,
    };

    // === SINGLE SOURCE OF TRUTH ===
    let isEdu = true;
    try {
      isEdu = await edutubeEngine.isEducational(info);
    } catch (e) {
      console.warn("[EduTube] Watch-page engine error, failing open:", e);
      isEdu = true; // fail-open
    }

    if (!isEdu) {
      console.log("[EduTube] Watch page BLOCK via engine:", title);
      blockedVideoIds.add(videoId);
      showEduTubeBlockOverlay();
      safeBounceFromBlockedVideo();
      return;
    }

    // Allow video
    console.log("[EduTube] Watch page ALLOW via engine:", title);
    try {
      document
        .querySelectorAll("video")
        .forEach((v) => (v.style.visibility = ""));
    } catch (_) {}
  } catch (e) {
    console.debug("[EduTube] autoBlockCurrentWatchIfNeeded error", e);
    // On error, fail-open (allow)
    try {
      document
        .querySelectorAll("video")
        .forEach((v) => (v.style.visibility = ""));
    } catch (_) {}
  }
}

// ---------- ADD: robust per-element async processor ----------

async function processVideoElement(element) {
  if (!element || typeof element !== "object") return { processed: false };

  // Try to get IDs via engine helpers
  let videoId = null;
  let channelId = null;

  try {
    if (edutubeEngine && typeof edutubeEngine.extractVideoId === "function") {
      videoId = edutubeEngine.extractVideoId(element);
    }
  } catch (_) {}

  try {
    if (edutubeEngine && typeof edutubeEngine.extractChannelId === "function") {
      channelId = edutubeEngine.extractChannelId(element);
    }
  } catch (_) {}

  // Fallback: data-video-id attribute
  if (!videoId && element.getAttribute) {
    videoId = element.getAttribute("data-video-id") || null;
  }

  // Extract basic info (reusing engine helper if available)
  let info = {
    title: "",
    description: "",
    channelName: "",
    channelDescription: "",
    longDescription: "",
    tagsText: "",
    videoId,
    channelId,
  };
  try {
    if (edutubeEngine && typeof edutubeEngine.extractVideoInfo === "function") {
      const tmp = edutubeEngine.extractVideoInfo(element) || {};
      info.title = tmp.title || "";
      info.description = tmp.description || "";
      info.channelName = tmp.channelName || "";
      info.channelDescription = tmp.channelDescription || "";
      info.longDescription = tmp.longDescription || "";
      info.tagsText = tmp.tagsText || "";
      info.videoId = tmp.videoId || info.videoId;
      info.channelId = tmp.channelId || info.channelId;
    } else {
      // Minimal fallback
      info.title = (
        element.querySelector("#video-title")?.textContent ||
        element.querySelector("a#video-title")?.textContent ||
        ""
      ).trim();
      info.channelName = (
        element.querySelector("#channel-name")?.textContent ||
        element.querySelector("ytd-channel-name a")?.textContent ||
        ""
      ).trim();
    }
  } catch (e) {
    console.warn("[EduTube] extractVideoInfo error:", e);
  }

  const token = info.videoId || info.title || "noid";

  // Prevent double-processing
  if (element.hasAttribute("data-edutube-processing")) {
    return { processed: false, reason: "already_processing" };
  }
  element.setAttribute("data-edutube-processing", "1");

  try {
    const prev = element.getAttribute("data-edutube-processed");

    // Engine disabled → show everything
    if (!edutubeEngine || edutubeEngine.enabled === false) {
      element.removeAttribute("data-edutube-processing");
      return { processed: false, reason: "engine_disabled" };
    }

    // Already processed with same token
    if (prev && prev === token) {
      element.removeAttribute("data-edutube-processing");
      return { processed: false, reason: "already_processed" };
    }

    // === SINGLE SOURCE OF TRUTH ===
    let isEdu = true;
    try {
      isEdu = await edutubeEngine.isEducational(info);
    } catch (err) {
      console.warn("[EduTube] Engine decision error - failing open:", err);
      isEdu = true; // fail-open → show
    }

    // Apply decision to DOM
    if (isEdu) {
      // SHOW
      const orig = element.getAttribute("data-edutube-original-display");
      if (typeof orig === "string") element.style.display = orig;
      else element.style.display = "";
      element.removeAttribute("data-edutube-hidden");
    } else {
      // HIDE
      if (!element.hasAttribute("data-edutube-original-display")) {
        const cs = window.getComputedStyle(element);
        element.setAttribute(
          "data-edutube-original-display",
          (cs && cs.display) || ""
        );
      }
      element.style.display = "none";
      element.setAttribute("data-edutube-hidden", "1");
    }

    element.setAttribute("data-edutube-processed", token);
    element.removeAttribute("data-edutube-processing");

    return {
      processed: true,
      decision: isEdu,
      videoId: info.videoId || null,
      channelId: info.channelId || null,
    };
  } catch (fatal) {
    console.error("[EduTube] processVideoElement fatal:", fatal);
    // Fail-open: restore visibility
    try {
      const orig = element.getAttribute("data-edutube-original-display");
      if (typeof orig === "string") element.style.display = orig;
      else element.style.display = "";
      element.removeAttribute("data-edutube-hidden");
      element.removeAttribute("data-edutube-processed");
      element.removeAttribute("data-edutube-processing");
    } catch (_) {}
    return { processed: false, error: fatal?.message || String(fatal) };
  }
}

// ---------- runFullFiltering with async sequential processor ----------

async function runFullFiltering() {
  let stats = {
    processed: 0,
    shown: 0,
    hidden: 0,
    byLayer: {
      whitelist: 0,
      blacklist: 0,
      keywords: 0,
      api: 0,
      heuristics: 0,
      error: 0,
    },
  };

  try {
    const videoSelector = `
      ytd-rich-item-renderer,
      ytd-video-renderer,
      ytd-grid-video-renderer,
      ytd-compact-video-renderer,
      ytd-search-video-renderer,
      ytd-playlist-panel-video-renderer
    `;
    const nodes = Array.from(document.querySelectorAll(videoSelector));
    if (!nodes || nodes.length === 0) return;

    for (const el of nodes) {
      try {
        const result = await processVideoElement(el);
        if (result.processed) {
          stats.processed++;
          if (result.decision) {
            stats.shown++;
          } else {
            stats.hidden++;
          }
          if (result.layer && stats.byLayer[result.layer] !== undefined) {
            stats.byLayer[result.layer]++;
          }
        } else if (result.error) {
          stats.byLayer.error++;
        }
      } catch (err) {
        console.warn("[EduTube] Element processing error:", err);
        stats.byLayer.error++;
      }
    }

    // Send stats update (debounced)
    sendStatsUpdate(stats);
  } catch (e) {
    console.error("[EduTube] runFullFiltering fatal:", e);
    // Best-effort restore on catastrophic failure
    try {
      document.querySelectorAll("[data-edutube-hidden]").forEach((el) => {
        try {
          const orig = el.getAttribute("data-edutube-original-display");
          if (typeof orig === "string") el.style.display = orig;
          else el.style.display = "";
          el.removeAttribute("data-edutube-hidden");
          el.removeAttribute("data-edutube-processed");
        } catch (_) {}
      });
    } catch (_) {}
  }
}

// Debounced stats sender
let statsUpdateTimer = null;
let pendingStats = null;

function sendStatsUpdate(newStats) {
  // Accumulate stats
  if (!pendingStats) {
    pendingStats = newStats;
  } else {
    pendingStats.processed += newStats.processed;
    pendingStats.shown += newStats.shown;
    pendingStats.hidden += newStats.hidden;
    Object.keys(newStats.byLayer).forEach((layer) => {
      pendingStats.byLayer[layer] =
        (pendingStats.byLayer[layer] || 0) + newStats.byLayer[layer];
    });
  }

  if (statsUpdateTimer) clearTimeout(statsUpdateTimer);

  statsUpdateTimer = setTimeout(() => {
    try {
      if (!edutubeEngine) return;

      // Update engine's persistent stats
      edutubeEngine.stats.videosHidden += pendingStats.hidden;
      edutubeEngine.stats.videosShown += pendingStats.shown;
      edutubeEngine.stats.sessionsFiltered += 1;

      Object.keys(pendingStats.byLayer).forEach((layer) => {
        if (edutubeEngine.stats.layerStats[layer] !== undefined) {
          edutubeEngine.stats.layerStats[layer] += pendingStats.byLayer[layer];
        }
      });

      if (typeof edutubeEngine.saveSettings === "function") {
        edutubeEngine.saveSettings().catch((err) => {
          console.warn("[EduTube] Stats save error:", err);
        });
      }

      chrome.runtime.sendMessage({
        type: "edutubeStatsUpdate",
        stats: {
          ...pendingStats,
          videosShown: edutubeEngine.stats.videosShown,
          videosHidden: edutubeEngine.stats.videosHidden,
          layerStats: edutubeEngine.stats.layerStats,
          aggregate: edutubeEngine.getStats
            ? edutubeEngine.getStats()
            : edutubeEngine.stats,
        },
      });

      pendingStats = null;
    } catch (err) {
      console.warn("[EduTube] Stats update error:", err);
    }
  }, 1000);
}

/* ========== MAIN EduTube FILTER ========== */

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
    log("[EduTube] Disabled – skipping filter");
    document.body.classList.remove("declutter-edutube-active");
    document.querySelectorAll("[data-edutube-hidden]").forEach((el) => {
      showEduVideoElement(el);
      el.removeAttribute("data-edutube-processed");
    });
    return;
  }

  isFiltering = true;
  document.body.classList.add("declutter-edutube-active");

  try {
    await runFullFiltering();
  } catch (e) {
    console.error("[EduTube] Filter error:", e);
  } finally {
    isFiltering = false;
  }

  setTimeout(() => {
    filterChannelShelves().catch((e) =>
      console.warn("[EduTube] filterChannelShelves error:", e)
    );
  }, 200);
}

function scheduleFilter() {
  if (edutubeFilterTimeout) clearTimeout(edutubeFilterTimeout);
  edutubeFilterTimeout = setTimeout(() => {
    filterEducationalContent();
  }, 250);
}

function stopEduTubeFilter() {
  if (edutubeFilterTimeout) {
    clearTimeout(edutubeFilterTimeout);
    edutubeFilterTimeout = null;
  }
  document.querySelectorAll("[data-edutube-hidden]").forEach((el) => {
    showEduVideoElement(el);
    el.removeAttribute("data-edutube-processed");
  });

  document.querySelectorAll("[data-edutube-shelf-hidden]").forEach((shelf) => {
    const orig = shelf.getAttribute("data-edutube-shelf-original-display");
    shelf.style.display = orig === null ? "" : orig;
    shelf.removeAttribute("data-edutube-shelf-original-display");
    shelf.removeAttribute("data-edutube-shelf-hidden");
  });

  document.body.classList.remove("declutter-edutube-active");
  console.log("[EduTube] Filter stopped");
}

/* ========== Whole-channel shelf hiding (WL/BL IDs + keywords only) ========== */

async function filterChannelShelves() {
  try {
    if (!edutubeEngine || !edutubeEngine.enabled) {
      document
        .querySelectorAll("[data-edutube-shelf-hidden]")
        .forEach((shelf) => {
          const orig = shelf.getAttribute(
            "data-edutube-shelf-original-display"
          );
          shelf.style.display = orig === null ? "" : orig;
          shelf.removeAttribute("data-edutube-shelf-original-display");
          shelf.removeAttribute("data-edutube-shelf-hidden");
        });
      return;
    }

    const wlChRaw = edutubeEngine.whitelist || new Set();
    const blChRaw = edutubeEngine.blacklist || new Set();
    const whitelistChannels =
      wlChRaw instanceof Set ? wlChRaw : new Set(wlChRaw || []);
    const blacklistChannels =
      blChRaw instanceof Set ? blChRaw : new Set(blChRaw || []);

    const whitelistKw = edutubeEngine.whitelistKeywords || [];
    const blacklistKw = edutubeEngine.blacklistKeywords || [];

    const selectors = [
      "ytd-rich-section-renderer",
      "ytd-shelf-renderer",
      "ytd-rich-shelf-renderer",
      "ytd-channel-info-renderer",
      "ytd-item-section-renderer",
      "ytm-rich-section-renderer",
    ];

    const normalize = (s) =>
      (s || "")
        .toLowerCase()
        .replace(/[^\w\s@]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    for (const sel of selectors) {
      const shelves = document.querySelectorAll(sel);
      for (const shelf of shelves) {
        try {
          const textNorm = normalize(shelf.innerText);

          let channelId = null;
          const link = shelf.querySelector(
            'a[href*="/channel/"], a[href^="/@"]'
          );
          if (link) {
            const href = link.getAttribute("href") || "";
            const m1 = href.match(/\/channel\/([^/?#]+)/);
            const m2 = href.match(/@([^/?#]+)/);
            if (m1) channelId = m1[1];
            else if (m2) channelId = "@" + m2[1];
          }

          const channelIdNorm = normalize(
            channelId && channelId.startsWith("@")
              ? channelId + " " + channelId.slice(1)
              : channelId || ""
          );

          let isEducational = true;

          // 1) Whitelist always wins
          if (channelId && whitelistChannels.has(channelId)) {
            isEducational = true;
          } else if (
            whitelistKw.some((kw) => {
              const normKw = normalize(kw);
              if (!normKw) return false;
              return (
                textNorm.includes(normKw) || channelIdNorm.includes(normKw)
              );
            })
          ) {
            isEducational = true;
          }

          // 2) Blacklist explicit
          else if (channelId && blacklistChannels.has(channelId)) {
            isEducational = false;
          } else if (
            blacklistKw.some((kw) => {
              const normKw = normalize(kw);
              if (!normKw) return false;
              return (
                textNorm.includes(normKw) || channelIdNorm.includes(normKw)
              );
            })
          ) {
            isEducational = false;
          } else {
            // 3) No strong info → treat as educational
            isEducational = true;
          }

          if (!isEducational) {
            if (!shelf.hasAttribute("data-edutube-shelf-original-display")) {
              shelf.setAttribute(
                "data-edutube-shelf-original-display",
                shelf.style.display || ""
              );
            }
            shelf.style.display = "none";
            shelf.setAttribute("data-edutube-shelf-hidden", "true");
          } else {
            if (shelf.hasAttribute("data-edutube-shelf-hidden")) {
              const orig = shelf.getAttribute(
                "data-edutube-shelf-original-display"
              );
              shelf.style.display = orig === null ? "" : orig;
              shelf.removeAttribute("data-edutube-shelf-original-display");
              shelf.removeAttribute("data-edutube-shelf-hidden");
            }
          }
        } catch (err) {
          console.warn(
            "[EduTube] filterChannelShelves shelf error:",
            err && err.message ? err.message : err
          );
        }
      }
    }
  } catch (err) {
    console.warn(
      "[EduTube] filterChannelShelves fatal:",
      err && err.message ? err.message : err
    );
  }
}

/* ========== Cleanup ========== */

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

/* ========== Explore helpers ========== */

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

// Show it's blocked video
function injectBlockOverlayCSS() {
  try {
    if (document.getElementById("edutube-block-overlay-style")) return;
    const style = document.createElement("style");
    style.id = "edutube-block-overlay-style";
    style.textContent = `
      #edutube-block-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999999 !important;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease-out;
      }
      #edutube-block-overlay.show {
        opacity: 1;
        pointer-events: auto;
      }
      #edutube-block-overlay .card {
        background: #111;
        color: #fff;
        border-radius: 12px;
        padding: 24px 30px;
        text-align: center;
        max-width: 260px;
        font-family: Inter, Roboto, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.35);
        transform: scale(0.92);
        transition: transform 0.25s ease-out;
      }
      #edutube-block-overlay.show .card {
        transform: scale(1);
      }
      #edutube-block-overlay .title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      #edutube-block-overlay .subtitle {
        font-size: 12px;
        opacity: 0.8;
      }
      #edutube-block-overlay .icon {
        width: 42px;
        height: 42px;
        margin-bottom: 10px;
        opacity: 0.9;
      }
    `;
    document.documentElement.appendChild(style);
  } catch (_) {}
}

function showEduTubeBlockOverlay() {
  try {
    injectBlockOverlayCSS();
    let overlay = document.getElementById("edutube-block-overlay");
    if (overlay) {
      overlay.classList.add("show");
      return;
    }
    overlay = document.createElement("div");
    overlay.id = "edutube-block-overlay";
    overlay.innerHTML = `
      <div class="card">
        <svg class="icon" viewBox="0 0 24 24">
          <path fill="currentColor"
            d="M12 2L2 20h20L12 2zm0 4.8L18.2 18H5.8L12 6.8zM11 10v4h2v-4h-2zm0 6v2h2v-2z" />
        </svg>
        <div class="title">Blocked by EduTube</div>
        <div class="subtitle">This video looks non-educational based on your settings.</div>
      </div>
    `;
    document.documentElement.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
  } catch (_) {}
}
// ======================================================
// MAIN EXECUTION & MESSAGE LISTENERS (PATCH)
// ======================================================

// 1. Initialize EduTube on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEduTube);
} else {
  initEduTube();
}

// 2. Listen for messages from Popup & Background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle Settings Toggles (e.g., hideShorts, hideSidebar)
  if (message.setting && Object.keys(settings).includes(message.setting)) {
    settings[message.setting] = message.value;

    // Map setting ID to CSS class
    const cls = SETTING_TO_CLASS[message.setting];
    if (cls) {
      if (message.value) document.body.classList.add(cls);
      else document.body.classList.remove(cls);
    }
    sendResponse({ ok: true });
    return;
  }

  // Handle EduTube Main Toggle
  if (message.type === "edutubeToggle") {
    if (edutubeEngine) {
      edutubeEngine.toggle(message.enabled).then(() => {
        if (message.enabled) {
          scheduleFilter();
          checkWatchPageGlobally();
        } else {
          stopEduTubeFilter();
        }
      });
    }
    return;
  }

  // Handle Sensitivity Update
  if (message.type === "edutubeSensitivity") {
    if (edutubeEngine) {
      edutubeEngine.setSensitivity(message.value).then(() => {
        // Re-run filter with new sensitivity
        if (edutubeEngine.enabled) scheduleFilter();
      });
    }
    return;
  }

  // Handle WL/BL Updates (from Popup or Context Menu)
  if (message.type === "edutubeListUpdate") {
    if (!edutubeEngine) return;

    const { list, action, idKind, id } = message;
    const isWhitelist = list === "whitelist";

    // Helper to route to correct engine method
    const updateEngine = async () => {
      if (idKind === "channel") {
        if (isWhitelist) {
          return action === "add"
            ? edutubeEngine.addToWhitelist(id)
            : edutubeEngine.removeFromWhitelist(id);
        } else {
          return action === "add"
            ? edutubeEngine.addToBlacklist(id)
            : edutubeEngine.removeFromBlacklist(id);
        }
      } else if (idKind === "video") {
        if (isWhitelist) {
          return action === "add"
            ? edutubeEngine.addVideoToWhitelist(id)
            : edutubeEngine.removeVideoFromWhitelist(id);
        } else {
          return action === "add"
            ? edutubeEngine.addVideoToBlacklist(id)
            : edutubeEngine.removeVideoFromBlacklist(id);
        }
      } else if (idKind === "keyword") {
        if (isWhitelist) {
          return action === "add"
            ? edutubeEngine.addWhitelistKeyword(id)
            : edutubeEngine.removeWhitelistKeyword(id);
        } else {
          return action === "add"
            ? edutubeEngine.addBlacklistKeyword(id)
            : edutubeEngine.removeBlacklistKeyword(id);
        }
      }
    };

    updateEngine().then(() => {
      if (edutubeEngine.enabled) scheduleFilter();
      sendResponse({ success: true });
    });

    return true; // Keep channel open for async response
  }

  // Handle API Key Updates
  if (message.type === "apiKeyUpdated") {
    if (edutubeEngine && edutubeEngine.apiService) {
      edutubeEngine.apiService.init().then(() => {
        console.log("[EduTube] API Key re-initialized via message");
      });
    }
  }
});

// 3. Global Mutation Observer (Auto-run on page changes)
mutationObserver = new MutationObserver((mutations) => {
  if (!edutubeEngine || !edutubeEngine.enabled) return;

  // Throttle observer to prevent performance kill
  if (observerCooldown) return;
  observerCooldown = true;
  setTimeout(() => {
    observerCooldown = false;
  }, 500);

  // Check for watch page navigation
  checkWatchPageGlobally();

  // Run filter
  scheduleFilter();
});

const target = document.body || document.documentElement;
if (target) {
  mutationObserver.observe(target, {
    childList: true,
    subtree: true,
  });
} else {
  console.warn("[EduTube] MutationObserver target not ready, retrying...");
  const retry = setInterval(() => {
    const t = document.body || document.documentElement;
    if (t) {
      clearInterval(retry);
      mutationObserver.observe(t, { childList: true, subtree: true });
    }
  }, 50);
}
