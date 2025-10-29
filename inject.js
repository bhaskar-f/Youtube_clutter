// inject.js - Runs in page context (not isolated)
(function () {
  "use strict";

  console.log("[YT AdBlock] Initializing page-level blocking...");

  // ============================================
  // EARLY INTERCEPTION - Before YouTube loads
  // ============================================

  // 1. Block ad configuration at the earliest point
  const config = {
    get: function (target, prop) {
      if (
        prop === "playerAds" ||
        prop === "adPlacements" ||
        prop === "adSlots"
      ) {
        return [];
      }
      return Reflect.get(target, prop);
    },
  };

  // Intercept ytInitialPlayerResponse before YouTube reads it
  let playerResponse = {};
  Object.defineProperty(window, "ytInitialPlayerResponse", {
    configurable: true,
    enumerable: true,
    get() {
      return playerResponse;
    },
    set(value) {
      if (value && typeof value === "object") {
        // Strip all ad data
        if (value.playerAds) delete value.playerAds;
        if (value.adPlacements) delete value.adPlacements;
        if (value.adSlots) delete value.adSlots;

        if (value.playerResponse) {
          if (value.playerResponse.playerAds)
            delete value.playerResponse.playerAds;
          if (value.playerResponse.adPlacements)
            delete value.playerResponse.adPlacements;
        }
      }
      playerResponse = value;
    },
  });

  // 2. Intercept all JSON parsing
  const originalParse = JSON.parse;
  JSON.parse = function (...args) {
    const data = originalParse.apply(this, args);

    if (data && typeof data === "object") {
      // Remove ads from any parsed response
      if (data.playerAds) data.playerAds = [];
      if (data.adPlacements) data.adPlacements = [];
      if (data.adSlots) data.adSlots = [];

      if (data.playerResponse) {
        if (data.playerResponse.playerAds) data.playerResponse.playerAds = [];
        if (data.playerResponse.adPlacements)
          data.playerResponse.adPlacements = [];
      }

      // Remove ads from feed responses
      stripAdsFromObject(data);
    }

    return data;
  };

  function stripAdsFromObject(obj) {
    if (!obj || typeof obj !== "object") return;

    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        obj[key] = obj[key].filter((item) => {
          if (!item || typeof item !== "object") return true;

          // Filter out ad renderers
          const adRenderers = [
            "adSlotRenderer",
            "displayAdRenderer",
            "promotedSparklesWebRenderer",
            "inFeedAdLayoutRenderer",
            "bannerPromoRenderer",
            "playerLegacyDesktopWatchAdsRenderer",
          ];

          return !adRenderers.some((renderer) => renderer in item);
        });

        obj[key].forEach((item) => stripAdsFromObject(item));
      } else if (typeof obj[key] === "object") {
        stripAdsFromObject(obj[key]);
      }
    }
  }

  // 3. Block fetch requests to ad endpoints
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";

    // Block known ad endpoints
    const adPatterns = [
      "/api/stats/ads",
      "/pagead/",
      "/ptracking",
      "doubleclick.net",
      "googleadservices.com",
    ];

    if (adPatterns.some((pattern) => url.includes(pattern))) {
      console.log("[YT AdBlock] Blocked fetch:", url);
      return Promise.resolve(
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    // Check for ad parameters in URL
    if (url.includes("youtube.com") && /[&?]ad(_type|format|_cpn)=/.test(url)) {
      console.log("[YT AdBlock] Blocked ad request:", url);
      return Promise.resolve(new Response("{}", { status: 200 }));
    }

    return originalFetch.apply(this, args);
  };

  // 4. Block XMLHttpRequest to ad endpoints
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    const urlStr = url?.toString() || "";

    const adPatterns = [
      "/api/stats/ads",
      "/pagead/",
      "/ptracking",
      "doubleclick.net",
    ];

    if (adPatterns.some((pattern) => urlStr.includes(pattern))) {
      console.log("[YT AdBlock] Blocked XHR:", urlStr);
      // Create no-op XHR
      this.abort = () => {};
      this.send = () => {};
      return;
    }

    return originalOpen.call(this, method, url, ...rest);
  };

  // 5. Prevent ad scripts from loading
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Element node
          // Block ad scripts
          if (node.tagName === "SCRIPT" && node.src) {
            const src = node.src;
            if (
              src.includes("doubleclick") ||
              src.includes("googleadservices") ||
              src.includes("/pagead/")
            ) {
              node.remove();
              console.log("[YT AdBlock] Blocked ad script:", src);
            }
          }

          // Block ad iframes
          if (node.tagName === "IFRAME" && node.src) {
            const src = node.src;
            if (
              src.includes("doubleclick") ||
              src.includes("googleadservices")
            ) {
              node.remove();
              console.log("[YT AdBlock] Blocked ad iframe:", src);
            }
          }
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  console.log("[YT AdBlock] ✅ Page-level protection active");
})();
