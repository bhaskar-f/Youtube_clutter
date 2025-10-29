// ======================================================
// YouTube Declutter — Ultimate Shorts Remover (2025)
// ======================================================

let settings = {
  hideHome: false,
  hideSidebar: false,
  hideComments: false,
  hideShorts: false,
  hideAds: false,
};

// ------------------------------------------------------
// Utility
// ------------------------------------------------------
function log(...msg) {
  console.log("[declutter]", ...msg);
}

// ------------------------------------------------------
// Apply settings
// ------------------------------------------------------
function applyHiding() {
  const body = document.body;
  if (!body) return;

  body.classList.toggle("declutter-hide-home", settings.hideHome);
  body.classList.toggle("declutter-hide-sidebar", settings.hideSidebar);
  body.classList.toggle("declutter-hide-comments", settings.hideComments);
  body.classList.toggle("declutter-hide-shorts", settings.hideShorts);
  body.classList.toggle("declutter-hide-ads", settings.hideAds);

  if (settings.hideShorts) {
    removeShortsBlocks();
    interceptShortsNavigation();
  }

  // Always remove Explore (or make optional if you prefer)
  removeExploreSection();
}

// ------------------------------------------------------
// Shorts Removal + Navigation Blocking
// ------------------------------------------------------
function removeShortsBlocks() {
  try {
    const selectors = [
      "ytd-reel-shelf-renderer",
      "ytd-rich-shelf-renderer[is-shorts]",
      "ytd-reel-item-renderer",
      "ytd-reel-video-renderer",
      "ytd-rich-item-renderer a[href*='/shorts/']",
      "a[href*='/shorts/']",
      "tp-yt-paper-tab[tab-title='Shorts']",
      "ytd-guide-entry-renderer[title='Shorts']",
      "ytd-mini-guide-entry-renderer[aria-label='Shorts']",
      "grid-shelf-view-model",
    ];

    // remove known Shorts elements
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (
          el.tagName.toLowerCase() === "grid-shelf-view-model" &&
          !/shorts/i.test(el.innerText.trim().split("\n")[0])
        )
          return; // skip non-Shorts shelves
        el.remove();
      });
    });

    // remove #contents > grid-shelf-view-model (new layout)
    document
      .querySelectorAll("#contents > grid-shelf-view-model")
      .forEach((shelf) => {
        const title = shelf.querySelector("h2 span, h2");
        if (title && title.textContent.trim().toLowerCase() === "shorts") {
          shelf.remove();
        }
        // also catch shelves containing only Shorts thumbnails
        const hasShortsThumbs = shelf.querySelector("a[href*='/shorts/']");
        if (hasShortsThumbs) shelf.remove();
      });

    // clean inside shadow roots (for lazy-loaded sections)
    document.querySelectorAll("*").forEach((el) => {
      if (!el.shadowRoot) return;
      el.shadowRoot
        .querySelectorAll("grid-shelf-view-model")
        .forEach((shelf) => {
          const title = shelf.querySelector("h2 span, h2");
          if (
            (title && title.textContent.trim().toLowerCase() === "shorts") ||
            shelf.querySelector("a[href*='/shorts/']")
          ) {
            shelf.remove();
          }
        });
    });
  } catch (err) {
    console.warn("[declutter] removeShortsBlocks error:", err);
  }
}

// ------------------------------------------------------
// Explore Section Removal
// ------------------------------------------------------
// ------------------------------------------------------
// Remove full Explore section (sidebar group + header)
// ------------------------------------------------------
function removeExploreSection() {
  try {
    // Remove any sidebar "Explore" group and its children
    document
      .querySelectorAll("ytd-guide-section-renderer")
      .forEach((section) => {
        const header = section.querySelector(
          "ytd-guide-entry-renderer[title='Explore'], #header, h3, span"
        );
        if (header && /explore/i.test(header.innerText || "")) {
          section.remove();
        }
      });

    // Remove the collapsed mini sidebar version
    document
      .querySelectorAll("ytd-mini-guide-entry-renderer[aria-label='Explore']")
      .forEach((el) => el.remove());

    // Also remove any direct Explore links elsewhere
    document
      .querySelectorAll("a[href*='/feed/explore']")
      .forEach((el) => el.remove());

    // If user lands directly on Explore page, redirect to Home
    if (location.pathname.includes("/feed/explore")) {
      location.replace("/");
    }
  } catch (err) {
    console.warn("[declutter] removeExploreSection error:", err);
  }
}

// ------------------------------------------------------
// Shorts redirection
// ------------------------------------------------------
function redirectShorts(url) {
  const id = url.split("/shorts/")[1]?.split(/[/?#]/)[0];
  if (id) location.replace(`/watch?v=${id}`);
  else location.replace("/");
}

function interceptShortsNavigation() {
  // Redirect if already on Shorts page
  if (location.pathname.startsWith("/shorts/"))
    redirectShorts(location.pathname);

  // Intercept link clicks
  document.addEventListener(
    "click",
    (e) => {
      const link = e.target.closest("a[href*='/shorts/']");
      if (link) {
        e.preventDefault();
        e.stopImmediatePropagation();
        redirectShorts(link.href);
      }
    },
    true
  );

  // Intercept internal YouTube SPA navigations
  window.addEventListener("yt-navigate-start", (e) => {
    const url = e.detail?.url || location.href;
    if (url.includes("/shorts/")) {
      e.stopImmediatePropagation();
      redirectShorts(url);
    }
  });

  // Keep scanning periodically for newly injected shelves
  clearInterval(window._declutterShortsCleaner);
  window._declutterShortsCleaner = setInterval(() => {
    if (settings.hideShorts) removeShortsBlocks();
  }, 1500);
}

// ------------------------------------------------------
// Observers & Init
// ------------------------------------------------------
chrome.storage.sync.get(Object.keys(settings), (data) => {
  settings = { ...settings, ...data };
  applyHiding();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || typeof msg.setting !== "string") return;
  settings[msg.setting] = msg.value;
  applyHiding();
});

const observer = new MutationObserver(() => applyHiding());
observer.observe(document.documentElement, { childList: true, subtree: true });

log("Declutter content script loaded — Ultimate Shorts Remover active");
