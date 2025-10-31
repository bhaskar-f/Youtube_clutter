// ======================================================
// YouTube Declutter – Robust contentScript (Explore fixed)
// Expects popup to send: chrome.tabs.sendMessage(tabId, { setting: id, value });
// ======================================================

/* SETTINGS (must match popup checkbox IDs exactly) */
let settings = {
  hideHeader: false,
  hideHome: false,
  hideSidebar: false,
  hideComments: false,
  hideShorts: false,
  hideChipBar: false,
  hideExplore: false,
};

const SETTING_TO_CLASS = {
  hideHeader: "declutter-hide-header",
  hideHome: "declutter-hide-home",
  hideSidebar: "declutter-hide-sidebar",
  hideComments: "declutter-hide-comments",
  hideShorts: "declutter-hide-shorts",
  hideChipBar: "declutter-hide-chipbar",
  hideExplore: "declutter-hide-explore",
};

let shortsCleanerInterval = null;
let mutationObserver = null;
let isExtensionValid = true; // Track if extension context is valid

function log(...args) {
  // Use debug to avoid spamming normal console in production
  console.debug("[declutter]", ...args);
}

// Check if extension context is still valid
function checkExtensionContext() {
  if (!chrome?.runtime?.id) {
    isExtensionValid = false;
    log("Extension context invalidated - stopping execution");
    // Clean up any intervals
    if (shortsCleanerInterval) {
      clearInterval(shortsCleanerInterval);
      shortsCleanerInterval = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    return false;
  }
  return true;
}

// -------------------- Robust Explore hide/restore --------------------
function hideExploreElements() {
  try {
    const found = new Set();

    // 1) anchors that point to /feed/explore (works across locales)
    document.querySelectorAll("a[href*='/feed/explore']").forEach((a) => {
      const wrapper =
        a.closest(
          "ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytd-guide-section-renderer"
        ) || a;
      found.add(wrapper);
    });

    // 2) any guide entry whose visible text contains "explore" (case-insensitive)
    document
      .querySelectorAll(
        "ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytd-guide-section-renderer"
      )
      .forEach((el) => {
        try {
          const txt = (el.innerText || "").trim().toLowerCase();
          if (txt.includes("explore")) found.add(el);
        } catch (_) {
          /* ignore */
        }
      });

    // 3) fallback: if nothing found, try searching for short text nodes (last resort)
    if (found.size === 0) {
      document
        .querySelectorAll(
          "[id^='guide'], ytd-guide-renderer, ytd-guide-section-renderer"
        )
        .forEach((el) => {
          const txt = (el.innerText || "").trim().toLowerCase();
          if (txt.includes("explore")) found.add(el);
        });
    }

    // Hide each found element but save original inline display so it can be restored
    found.forEach((el) => {
      if (!el) return;
      if (!el.hasAttribute("data-declutter-explore-hidden")) {
        el.setAttribute(
          "data-declutter-explore-original-display",
          el.style.display || ""
        );
        el.style.display = "none";
        el.setAttribute("data-declutter-explore-hidden", "true");
      }
    });

    log(`Explore: hid ${found.size} elements`);

    // If user lands on the explore page, redirect to avoid blank page
    if (location.pathname.includes("/feed/explore")) {
      location.replace("/");
    }
  } catch (e) {
    console.warn("[declutter] hideExploreElements error:", e);
  }
}

function restoreExploreElements() {
  try {
    const elements = document.querySelectorAll(
      "[data-declutter-explore-hidden]"
    );
    log(`Explore: restoring ${elements.length} elements`);

    elements.forEach((el) => {
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
      } catch (e) {
        // ignore selector failures
      }
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
  } catch (e) {
    // ignore
  }
}

function interceptShortsNavigation() {
  try {
    if (location.pathname.startsWith("/shorts/"))
      redirectShorts(location.pathname);

    // Click interception
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

    // SPA navigation
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

// -------------------- Apply Hiding (central) --------------------
function applyHiding() {
  const body = document.body;
  if (!body) return;

  // Toggle classes on html and body consistently
  Object.keys(SETTING_TO_CLASS).forEach((key) => {
    const cls = SETTING_TO_CLASS[key];
    const enabled = !!settings[key];
    if (document.documentElement)
      document.documentElement.classList.toggle(cls, enabled);
    body.classList.toggle(cls, enabled);
  });

  // Header fallback: hide via inline style so it can be restored
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

  // Explore handling (FIXED: using the correct function names)
  if (settings.hideExplore) {
    hideExploreElements();
  } else {
    restoreExploreElements();
  }

  // Shorts
  if (settings.hideShorts) {
    removeShortsBlocks();
    interceptShortsNavigation();
    startShortsCleaner();
  } else {
    stopShortsCleaner();
    restoreShorts();
  }
}

// -------------------- Init, storage and message handling --------------------
function attachObserverSafely() {
  if (!checkExtensionContext()) return;

  try {
    const target = document.documentElement || document.body;
    if (!target) {
      // Retry a bit later
      setTimeout(attachObserverSafely, 350);
      return;
    }

    // Avoid creating multiple observers
    if (mutationObserver) return;

    mutationObserver = new MutationObserver(() => {
      if (!checkExtensionContext()) return;
      // Reapply quickly when page mutates (YouTube SPA)
      applyHiding();
    });
    mutationObserver.observe(target, { childList: true, subtree: true });
    log("MutationObserver attached");
  } catch (e) {
    console.warn("[declutter] attachObserverSafely error:", e);
  }
}

function safeInit() {
  // Check if extension context is valid before doing anything
  if (!checkExtensionContext()) {
    log("Cannot initialize - extension context invalid");
    return;
  }

  // Load settings with error handling for invalidated context
  try {
    chrome.storage.sync.get(Object.keys(settings), (data) => {
      // Check for chrome.runtime.lastError (standard way to detect errors)
      if (chrome.runtime.lastError) {
        log("Storage access error:", chrome.runtime.lastError.message);
        return;
      }

      if (!checkExtensionContext()) return;

      settings = { ...settings, ...data };
      log("Loaded settings:", settings);
      applyHiding();
    });
  } catch (e) {
    console.warn("[declutter] safeInit storage error:", e);
    // If storage fails, still try to apply default settings
    applyHiding();
  }

  // Listen for popup messages in format { setting: id, value: bool }
  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!checkExtensionContext()) return false;

      try {
        if (msg && typeof msg.setting === "string") {
          // validate key exists
          if (Object.prototype.hasOwnProperty.call(settings, msg.setting)) {
            settings[msg.setting] = !!msg.value;
            log(`Setting changed: ${msg.setting} = ${msg.value}`);
            applyHiding();
            if (typeof sendResponse === "function") sendResponse({ ok: true });
          } else if (
            msg.type === "updateAll" &&
            typeof msg.settings === "object"
          ) {
            settings = { ...settings, ...msg.settings };
            applyHiding();
            if (typeof sendResponse === "function") sendResponse({ ok: true });
          }
        }
      } catch (e) {
        console.warn("[declutter] onMessage error:", e);
      }
      return false;
    });
  } catch (e) {
    console.warn("[declutter] Message listener setup error:", e);
  }

  attachObserverSafely();
  log("Declutter init complete");
}

// Run when DOM ready (safe)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", safeInit);
} else {
  safeInit();
}
