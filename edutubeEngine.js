// edutubeEngine.js
// Robust filtering: whitelist → blacklist → keyword rules → scoring → optional API → sensitivity fallback.

class EduTubeEngine {
  constructor(opts = {}) {
    // runtime configurable
    this.enabled = false;
    this.sensitivity = 50; // 0-100

    // ID-based lists
    this.whitelist = new Set();
    this.blacklist = new Set();
    this.whitelistVideos = new Set();
    this.blacklistVideos = new Set();

    // keyword-style lists (names / title keywords) – ALWAYS arrays
    this.whitelistKeywords = []; // channel/video name substrings
    this.blacklistKeywords = [];

    this.stats = {
      videosHidden: 0,
      videosShown: 0,
      sessionsFiltered: 0,
      layerStats: {
        whitelist: 0,
        blacklist: 0,
        keywords: 0,
        api: 0,
        fallback: 0,
      },
    };

    // optional external API service (if you attach one elsewhere)
    this.apiService = window.YouTubeAPIService || null;
    this.decisionCache = new Map(); // videoId => { decision, ts }
    this.cacheTTL = opts.cacheTTL || 1000 * 60 * 3; // 3 minutes

    this.sensitivityMap = opts.sensitivityMap || {
      relaxed: 30,
      balanced: 45,
      strict: 60,
    };

    // scoring pools (can be extended)
    this.strongNonEduIndicators = [
      "vlog",
      "prank",
      "reaction",
      "mukbang",
      "gaming",
      "let's play",
      "gameplay",
      "compilation",
      "shorts",
      "tiktok",
      "haul",
      "unboxing",
      "challenge",
      "song",
      "music",
      "lyrics",
      "trailer",
      "movie",
      "film",
      "top 10",
    ];

    this.strongEduIndicators = [
      "lecture",
      "university",
      "college",
      "professor",
      "academy",
      "khan academy",
      "coursera",
      "edx",
      "udemy",
      "crash course",
      "explained by",
      "introduction to",
      "fundamentals",
      "basics of",
      "tutorial",
      "course",
      "lesson",
      "study",
    ];

    this.eduKeywords = [
      "tutorial",
      "guide",
      "learn",
      "education",
      "how to",
      "demonstration",
      "walkthrough",
      "study",
      "training",
      "workshop",
      "seminar",
    ];

    // clickbait patterns for slight penalties
    this.clickbaitPatterns = [
      "shocking",
      "must see",
      "you won't believe",
      "unbelievable",
      "amazing",
      "insane",
    ];
  }

  // ---------- persistence ----------
  async init() {
    try {
      const data = await this._getStorage([
        "edutubeEnabled",
        "edutubeSensitivity",
        "edutubeWhitelist",
        "edutubeBlacklist",
        "edutubeWhitelistVideos",
        "edutubeBlacklistVideos",
        "edutubeWhitelistKeywords",
        "edutubeBlacklistKeywords",
        "edutubeStats",
      ]);

      this.enabled = !!data.edutubeEnabled;
      this.sensitivity = Number.isFinite(data.edutubeSensitivity)
        ? data.edutubeSensitivity
        : this.sensitivity;

      (data.edutubeWhitelist || []).forEach((id) => this.whitelist.add(id));
      (data.edutubeBlacklist || []).forEach((id) => this.blacklist.add(id));
      (data.edutubeWhitelistVideos || []).forEach((id) =>
        this.whitelistVideos.add(id)
      );
      (data.edutubeBlacklistVideos || []).forEach((id) =>
        this.blacklistVideos.add(id)
      );

      // Repair weird stored shapes (arrays vs objects) for keyword lists
      const wlKw = data.edutubeWhitelistKeywords;
      const blKw = data.edutubeBlacklistKeywords;

      this.whitelistKeywords = Array.isArray(wlKw)
        ? wlKw
        : wlKw && typeof wlKw === "object"
        ? Object.values(wlKw)
        : this.whitelistKeywords;

      this.blacklistKeywords = Array.isArray(blKw)
        ? blKw
        : blKw && typeof blKw === "object"
        ? Object.values(blKw)
        : this.blacklistKeywords;

      if (data.edutubeStats && typeof data.edutubeStats === "object") {
        this.stats = {
          ...this.stats,
          ...data.edutubeStats,
          layerStats: {
            ...this.stats.layerStats,
            ...(data.edutubeStats.layerStats || {}),
          },
        };
      }
    } catch (e) {
      console.warn("[EduTubeEngine] init load error:", e);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        edutubeEnabled: this.enabled,
        edutubeSensitivity: this.sensitivity,
        edutubeWhitelist: Array.from(this.whitelist),
        edutubeBlacklist: Array.from(this.blacklist),
        edutubeWhitelistVideos: Array.from(this.whitelistVideos),
        edutubeBlacklistVideos: Array.from(this.blacklistVideos),
        edutubeWhitelistKeywords: this.whitelistKeywords,
        edutubeBlacklistKeywords: this.blacklistKeywords,
        edutubeStats: this.stats,
      });
    } catch (e) {
      console.warn("[EduTubeEngine] saveSettings error:", e);
    }
  }

  _getStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, (res) => resolve(res || {}));
    });
  }

  // ---------- helpers ----------
  _now() {
    return Date.now();
  }

  _cacheSet(videoId, decision) {
    if (!videoId) return;
    this.decisionCache.set(videoId, { decision, ts: this._now() });
  }

  _cacheGet(videoId) {
    if (!videoId) return null;
    const v = this.decisionCache.get(videoId);
    if (!v) return null;
    if (this._now() - v.ts > this.cacheTTL) {
      this.decisionCache.delete(videoId);
      return null;
    }
    return v.decision;
  }

  /**
   * Basic fuzzy match:
   * 1) NEW: normalized no-space comparison (handles "Mr Beast" vs "mrbeast")
   * 2) OLD: token-based substring / overlap (kept to avoid breaking past behavior)
   */
  fuzzyMatch(text, pattern) {
    if (!text || !pattern) return false;

    // --- FIX: handle normalized popup keywords like "mrbeast" vs "Mr Beast" ---
    const normalizeNoSpace = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ""); // remove spaces + punctuation + symbols

    const tNorm = normalizeNoSpace(text);
    const pNorm = normalizeNoSpace(pattern);

    if (!tNorm || !pNorm) return false;

    // exact or substring match on normalized forms
    if (tNorm === pNorm) return true;
    if (tNorm.includes(pNorm)) return true;
    if (pNorm.includes(tNorm)) return true;
    // --- END FIX ---

    // old behavior: token-based overlap (kept as fallback so nothing breaks)
    const a = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const b = pattern
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    if (!a.length || !b.length) return false;

    // exact substring of token-joined text
    const joined = a.join(" ");
    if (joined.includes(b.join(" "))) return true;

    // token overlap
    const setA = new Set(a);
    let match = 0;
    for (const token of b) if (setA.has(token)) match++;
    const ratio = match / b.length;
    return ratio >= 0.6; // 60% of tokens matched
  }

  // ---------- canonical channel ID resolver (NEW, non-breaking) ----------
  async resolveCanonicalChannelId(rawId) {
    if (!rawId) return rawId;

    // already canonical UC ID
    if (/^UC[A-Za-z0-9_-]{20,}$/.test(rawId)) return rawId;

    if (!this.channelIdCache) this.channelIdCache = new Map();

    // cache lookup
    if (this.channelIdCache.has(rawId)) {
      return this.channelIdCache.get(rawId);
    }

    let path;
    if (rawId.startsWith("@")) {
      path = rawId;
    } else if (rawId.startsWith("c/") || rawId.startsWith("user/")) {
      path = rawId;
    } else {
      path = `channel/${rawId}`;
    }

    const url = `https://www.youtube.com/${path.replace(/^\/+/, "")}`;

    try {
      const res = await fetch(url, { credentials: "omit" });
      const text = await res.text();
      const m = text.match(/"channelId":"(UC[0-9A-Za-z_-]{20,})"/);
      if (m && m[1]) {
        const canonical = m[1];
        this.channelIdCache.set(rawId, canonical);
        return canonical;
      }
    } catch (e) {
      console.debug("[EduTubeEngine] resolveCanonicalChannelId error:", e);
    }

    // fallback: treat raw as-is so nothing breaks
    this.channelIdCache.set(rawId, rawId);
    return rawId;
  }

  // ---------- extraction helpers ----------
  extractVideoId(element) {
    try {
      const a = element.querySelector(
        'a[href*="/watch?v="], a#thumbnail, a.yt-simple-endpoint'
      );
      const href = a?.getAttribute("href") || a?.href || "";
      let m = href.match(/[?&]v=([^&]+)/);
      if (m) return m[1];
      m = href.match(/\/shorts\/([^/?#]+)/);
      if (m) return m[1];

      const dataVid =
        element.getAttribute("data-video-id") || element.dataset?.videoId;
      if (dataVid) return dataVid;

      const anchors = element.getElementsByTagName("a");
      for (const a2 of anchors) {
        const hh = a2.getAttribute("href") || a2.href || "";
        const mm = hh.match(/[?&]v=([^&]+)/);
        if (mm) return mm[1];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  extractChannelId(element) {
    try {
      const link = element.querySelector(
        'a[href*="/channel/"], a.yt-simple-endpoint[href*="/channel/"], a[href^="/@"]'
      );
      const href = link?.getAttribute("href") || link?.href || "";
      if (!href) return null;

      let m = href.match(/\/channel\/([^/?#]+)/);
      if (m) return m[1];

      m = href.match(/\/@([^/?#]+)/);
      if (m) return `@${m[1]}`;

      return null;
    } catch (e) {
      return null;
    }
  }

  extractVideoInfo(element) {
    try {
      const titleEl =
        element.querySelector("#video-title") ||
        element.querySelector("a[title]") ||
        element.querySelector("h3");
      const title = (
        titleEl?.innerText ||
        titleEl?.getAttribute("title") ||
        ""
      ).trim();

      const descEl =
        element.querySelector("#description-text") ||
        element.querySelector(".ytd-rich-item-renderer .yt-lockup-description");
      const description = (descEl?.innerText || "").trim();

      const channelEl = element.querySelector(
        "#channel-name, .ytd-channel-name, .yt-simple-endpoint.yt-formatted-string, a.yt-simple-endpoint"
      );
      const channelName = (
        channelEl?.innerText ||
        channelEl?.textContent ||
        ""
      ).trim();

      return { title, description, channelName };
    } catch (e) {
      return { title: "", description: "", channelName: "" };
    }
  }

  // ---------- whitelist/blacklist methods ----------
  async addToWhitelist(channelId) {
    if (!channelId) return;
    this.whitelist.add(channelId);
    await this.saveSettings();
  }
  async removeFromWhitelist(channelId) {
    if (!channelId) return;
    this.whitelist.delete(channelId);
    await this.saveSettings();
  }
  async addToBlacklist(channelId) {
    if (!channelId) return;
    this.blacklist.add(channelId);
    await this.saveSettings();
  }
  async removeFromBlacklist(channelId) {
    if (!channelId) return;
    this.blacklist.delete(channelId);
    await this.saveSettings();
  }

  async addVideoToWhitelist(videoId) {
    if (!videoId) return;
    this.whitelistVideos.add(videoId);
    await this.saveSettings();
  }
  async removeVideoFromWhitelist(videoId) {
    if (!videoId) return;
    this.whitelistVideos.delete(videoId);
    await this.saveSettings();
  }
  async addVideoToBlacklist(videoId) {
    if (!videoId) return;
    this.blacklistVideos.add(videoId);
    await this.saveSettings();
  }
  async removeVideoFromBlacklist(videoId) {
    if (!videoId) return;
    this.blacklistVideos.delete(videoId);
    await this.saveSettings();
  }

  // aliases used by contentScript for "non edu channel" buttons
  async addNonEduChannel(channelId) {
    return this.addToBlacklist(channelId);
  }
  async removeNonEduChannel(channelId) {
    return this.removeFromBlacklist(channelId);
  }

  // keywords (name-based) – arrays with de-dup
  async addWhitelistKeyword(kw) {
    if (!kw) return;
    const key = kw.toLowerCase();
    if (!this.whitelistKeywords.includes(key)) {
      this.whitelistKeywords.push(key);
      // ensure it isn’t in blacklist
      this.blacklistKeywords = this.blacklistKeywords.filter((k) => k !== key);
      await this.saveSettings();
    }
  }
  async addBlacklistKeyword(kw) {
    if (!kw) return;
    const key = kw.toLowerCase();
    if (!this.blacklistKeywords.includes(key)) {
      this.blacklistKeywords.push(key);
      // ensure it isn’t in whitelist
      this.whitelistKeywords = this.whitelistKeywords.filter((k) => k !== key);
      await this.saveSettings();
    }
  }
  async removeWhitelistKeyword(kw) {
    if (!kw) return;
    const key = kw.toLowerCase();
    this.whitelistKeywords = this.whitelistKeywords.filter((k) => k !== key);
    await this.saveSettings();
  }
  async removeBlacklistKeyword(kw) {
    if (!kw) return;
    const key = kw.toLowerCase();
    this.blacklistKeywords = this.blacklistKeywords.filter((k) => k !== key);
    await this.saveSettings();
  }

  getStats() {
    return this.stats;
  }

  setSensitivity(value) {
    this.sensitivity = Number(value) || this.sensitivity;
    return Promise.resolve();
  }

  toggle(enable) {
    this.enabled = !!enable;
    return this.saveSettings();
  }

  // ---------- watch page hard blocking ----------
  async checkWatchPageBlacklist() {
    try {
      if (!this.enabled) return;

      const url = new URL(location.href);
      let videoId =
        url.searchParams.get("v") ||
        (location.pathname.startsWith("/shorts/")
          ? location.pathname.split("/shorts/")[1]?.split(/[?#]/)[0]
          : null);

      let channelId = null;
      const chEl = document.querySelector(
        'a[href*="/channel/"], a[href^="/@"]'
      );
      if (chEl) {
        const href = chEl.getAttribute("href") || chEl.href || "";
        let m = href.match(/\/channel\/([^/?#]+)/);
        if (m) channelId = m[1];
        m = href.match(/\/@([^/?#]+)/);
        if (m) channelId = `@${m[1]}`;
      }

      let canonicalChannelId = null;
      if (channelId) {
        canonicalChannelId = await this.resolveCanonicalChannelId(channelId);
      }

      if (
        (videoId && this.blacklistVideos.has(videoId)) ||
        (channelId && this.blacklist.has(channelId)) ||
        (canonicalChannelId && this.blacklist.has(canonicalChannelId))
      ) {
        location.replace("/");
      }
    } catch (e) {
      console.warn("[EduTubeEngine] checkWatchPageBlacklist error:", e);
    }
  }

  // ---------- scoring ----------
  scoreKeywords(videoInfo) {
    const rawTitle = (videoInfo.title || "").toLowerCase();
    const rawDesc = (videoInfo.description || "").toLowerCase();
    const rawChannel = (videoInfo.channelName || "").toLowerCase();
    const text = `${rawTitle} ${rawDesc} ${rawChannel}`;

    // Immediate strong non-edu reject
    for (const s of this.strongNonEduIndicators) {
      if (text.includes(s)) return -300;
    }

    // Immediate strong edu
    for (const s of this.strongEduIndicators) {
      if (text.includes(s)) return 200;
    }

    let score = 0;
    for (const kw of this.eduKeywords) {
      if (text.includes(kw)) score += 8;
    }

    const subjects = [
      "math",
      "physics",
      "chemistry",
      "biology",
      "history",
      "economics",
      "programming",
      "javascript",
      "python",
      "algebra",
      "calculus",
      "engineering",
      "cs",
      "computer science",
    ];
    for (const s of subjects) {
      if (text.includes(s)) score += 15;
    }

    for (const c of this.clickbaitPatterns) {
      if (rawTitle.includes(c)) score -= 20;
    }

    const soft = [
      "song",
      "music",
      "lyrics",
      "trailer",
      "vlog",
      "review",
      "reaction",
      "gaming",
      "gameplay",
    ];
    for (const s of soft) {
      if (text.includes(s)) score -= 20;
    }

    return Math.max(-400, Math.min(400, score));
  }

  // ---------- isEducational: orchestrates layers ----------
  async isEducational(element) {
    try {
      if (!this.enabled) return true;

      const videoId = this.extractVideoId(element);
      const rawChannelId = this.extractChannelId(element);
      const info = this.extractVideoInfo(element);

      let canonicalChannelId = null;
      if (rawChannelId) {
        canonicalChannelId = await this.resolveCanonicalChannelId(rawChannelId);
      }

      if (videoId) {
        const cached = this._cacheGet(videoId);
        if (typeof cached === "boolean") return cached;
      }

      // Layer 1: whitelist IDs (channel + video)
      if (
        (rawChannelId && this.whitelist.has(rawChannelId)) ||
        (canonicalChannelId && this.whitelist.has(canonicalChannelId))
      ) {
        this.stats.layerStats.whitelist++;
        this._cacheSet(videoId || canonicalChannelId || rawChannelId, true);
        return true;
      }
      if (videoId && this.whitelistVideos.has(videoId)) {
        this.stats.layerStats.whitelist++;
        this._cacheSet(videoId, true);
        return true;
      }

      // Layer 1b: whitelist keywords
      for (const kw of this.whitelistKeywords) {
        if (
          this.sequenceTokenMatch(info.channelName, kw) ||
          this.sequenceTokenMatch(info.title, kw) ||
          this.fuzzyMatch(info.channelName, kw) ||
          this.fuzzyMatch(info.title, kw)
        ) {
          this.stats.layerStats.whitelist++;
          this._cacheSet(videoId || kw, true);
          return true;
        }
      }

      // Layer 2: blacklist IDs (channel + video)
      if (
        (rawChannelId && this.blacklist.has(rawChannelId)) ||
        (canonicalChannelId && this.blacklist.has(canonicalChannelId))
      ) {
        this.stats.layerStats.blacklist++;
        this._cacheSet(videoId || canonicalChannelId || rawChannelId, false);
        return false;
      }
      if (videoId && this.blacklistVideos.has(videoId)) {
        this.stats.layerStats.blacklist++;
        this._cacheSet(videoId, false);
        return false;
      }

      // Layer 2b: blacklist keywords
      for (const kw of this.blacklistKeywords) {
        if (
          this.sequenceTokenMatch(info.channelName, kw) ||
          this.sequenceTokenMatch(info.title, kw) ||
          this.fuzzyMatch(info.channelName, kw) ||
          this.fuzzyMatch(info.title, kw)
        ) {
          this.stats.layerStats.blacklist++;
          this._cacheSet(videoId || kw, false);
          return false;
        }
      }

      // Layer 3: keyword scoring
      const score = this.scoreKeywords(info);

      if (score >= 60) {
        this.stats.layerStats.keywords++;
        this._cacheSet(videoId, true);
        return true;
      }
      if (score <= -50) {
        this.stats.layerStats.keywords++;
        this._cacheSet(videoId, false);
        return false;
      }

      // Layer 4: optional API
      if (videoId && this.apiService?.enabled && score > -50 && score < 60) {
        try {
          const apiData = await this.apiService.fetchVideoDetails(videoId);
          if (apiData && apiData.categoryId) {
            const cat = String(apiData.categoryId);
            const categoryDecision = this.apiService.isEducationalCategory(cat);
            if (categoryDecision === true) {
              this.stats.layerStats.api++;
              this._cacheSet(videoId, true);
              return true;
            } else if (categoryDecision === false) {
              this.stats.layerStats.api++;
              this._cacheSet(videoId, false);
              return false;
            } else {
              if (["27", "28", "35"].includes(cat)) {
                this.stats.layerStats.api++;
                this._cacheSet(videoId, true);
                return true;
              }
              if (["1", "10", "17", "20", "22", "23", "24"].includes(cat)) {
                this.stats.layerStats.api++;
                this._cacheSet(videoId, false);
                return false;
              }
            }
          }
        } catch (e) {
          console.debug("[EduTubeEngine] API call failed:", e);
        }
      }

      // Layer 5: fallback sensitivity-based decision
      let effectiveThreshold = this.sensitivityMap.balanced;
      if (this.sensitivity <= 35)
        effectiveThreshold = this.sensitivityMap.relaxed;
      else if (this.sensitivity >= 70)
        effectiveThreshold = this.sensitivityMap.strict;

      if (!this.apiService?.enabled) {
        effectiveThreshold -= 5;
      }

      const decision = score >= effectiveThreshold;
      this.stats.layerStats.fallback++;
      this._cacheSet(videoId, decision);

      return decision;
    } catch (e) {
      console.warn("[EduTubeEngine] isEducational error:", e);
      // fail-open: do not hide everything on error
      return true;
    }
  }

  sequenceTokenMatch(text, pattern) {
    if (!text || !pattern) return false;

    const normalize = (s) =>
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const textNorm = normalize(text).split(" ");
    const patNorm = normalize(pattern).split(" ");

    // Ensure all pattern tokens appear in order inside the text tokens
    let idx = 0;
    for (let token of textNorm) {
      if (token === patNorm[idx]) {
        idx++;
        if (idx === patNorm.length) return true; // All matched in order
      }
    }
    return false;
  }
}

window.EduTubeEngine = EduTubeEngine;
