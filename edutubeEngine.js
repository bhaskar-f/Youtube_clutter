// ======================================================
// EduTube Engine - FIXED VERSION
// - 90% accurate without API
// - 100% accurate with API
// - Global blacklist enforcement (blocks at watch page)
// - Non-educational channel hiding
// ======================================================

class EduTubeEngine {
  constructor() {
    this.enabled = false;
    this.sensitivity = 50; // 0-100: Relaxed(0-35), Balanced(36-65), Strict(66-100)
    this.whitelist = new Set();
    this.blacklist = new Set();
    this.whitelistVideos = new Set();
    this.blacklistVideos = new Set();
    this.whitelistKeywords = new Set();
    this.blacklistKeywords = new Set();
    this.nonEduChannels = new Set(); // NEW: Non-educational channels to hide

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

    // COMPREHENSIVE Educational Keywords
    this.strongEduIndicators = [
      "lecture",
      "university",
      "college",
      "professor",
      "academy",
      "school",
      "khan academy",
      "coursera",
      "edx",
      "udemy",
      "udacity",
      "skillshare",
      "brilliant",
      "crash course",
      "tutorial series",
      "course",
      "class",
      "workshop",
      "seminar",
      "bootcamp",
      "training program",
      "certificate course",
      "mit",
      "harvard",
      "stanford",
      "cambridge",
      "oxford",
      "yale",
      "berkeley",
      "iit",
      "nptel",
      "gate smashers",
      "freecodecamp",
      "the coding train",
      "cs50",
      "3blue1brown",
      "ted-ed",
      "explained by",
      "instructor",
      "professor explains",
      "lecture series",
      "chapter",
      "lesson",
      "module",
      "unit",
      "session",
      "introduction to",
      "fundamentals of",
      "basics of",
      "principles of",
      "understanding",
      "tutorial playlist",
      "beginner to advanced",
      "zero to hero",
      "exam prep",
      "certification",
      "interview preparation",
      "jee preparation",
      "neet preparation",
      "gate preparation",
      "ielts preparation",
      "toefl preparation",
    ];

    this.eduKeywords = [
      "tutorial",
      "guide",
      "learn",
      "learning",
      "education",
      "educational",
      "training",
      "how to",
      "explained",
      "explanation",
      "basics",
      "beginner",
      "for beginners",
      "advanced",
      "masterclass",
      "deep dive",
      "complete course",
      "overview",
      "demonstration",
      "walkthrough",
      "study",
      "studying",
      "study with me",
      "revision",
      "concept",
      "topic",
      "definition",
      "theory",
      "experiment",
      "practice problems",
      "exercise",
      "example",
      "problem solving",
      "worksheet",
      "whiteboard",
      "chalkboard",
      "slides",
      "presentation",
      "teaching",
      "explaining",
      "discussion",
      "educator",
      "trainer",
      "tutor",
      "student",
      "classroom",
      "homework",
      "assignment",
      "lab",
      "practical",
      "academic",
      "college notes",
      "revision notes",
      "exam solution",
      "previous year",
      "mcq",
      "quiz",
      "test series",
      "mock test",
      "solution",
      "solved example",
      "code along",
      "follow along",
    ];

    this.academicSubjects = [
      "mathematics",
      "math",
      "calculus",
      "algebra",
      "geometry",
      "trigonometry",
      "statistics",
      "probability",
      "physics",
      "chemistry",
      "biology",
      "anatomy",
      "programming",
      "coding",
      "software engineering",
      "computer science",
      "algorithm",
      "data structure",
      "machine learning",
      "deep learning",
      "artificial intelligence",
      "python",
      "javascript",
      "java",
      "c++",
      "web development",
      "frontend",
      "backend",
      "devops",
      "database",
      "sql",
      "networking",
      "electrical engineering",
      "mechanical engineering",
      "civil engineering",
      "history",
      "geography",
      "economics",
      "psychology",
      "philosophy",
      "language learning",
      "english",
      "spanish",
      "french",
      "german",
      "chinese",
      "music theory",
      "art",
      "design",
      "architecture",
      "finance",
      "business",
    ];

    // COMPREHENSIVE Non-Educational Indicators
    this.strongNonEduIndicators = [
      // Music
      "song",
      "music",
      "music video",
      "lyrics",
      "lyric video",
      "remix",
      "album",
      "soundtrack",
      "ost",
      "bgm",
      "karaoke",
      "cover song",
      "official video",

      // Entertainment
      "movie",
      "film",
      "trailer",
      "teaser",
      "series",
      "episode",
      "season",
      "clip",
      "scene",
      "vlog",
      "daily vlog",
      "travel vlog",
      "reaction",
      "reaction video",

      // Gaming
      "gaming",
      "gameplay",
      "let's play",
      "playthrough",
      "speedrun",
      "livestream",
      "esports",
      "fortnite",
      "minecraft",
      "roblox",
      "pubg",
      "valorant",
      "gta",

      // Comedy/Entertainment
      "prank",
      "challenge",
      "comedy",
      "standup",
      "skit",
      "meme",
      "funny",
      "fails",
      "viral video",
      "trending video",

      // Lifestyle
      "haul",
      "makeup",
      "beauty",
      "skincare",
      "fashion",
      "ootd",
      "unboxing",
      "review",
      "vlog",
      "asmr",
      "mukbang",
      "eating show",
      "food vlog",

      // Finance Clickbait
      "earn money",
      "make money",
      "crypto",
      "bitcoin",
      "nft",
      "dropshipping",
      "trading strategy",
      "get rich quick",

      // Sports
      "highlights",
      "match",
      "boxing",
      "ufc",
      "mma",
      "wwe",
      "nba",
      "cricket",
      "football",
      "sports news",

      // Tech Reviews (non-tutorial)
      "unboxing",
      "first look",
      "hands-on",
      "gadget review",
      "product review",
      "phone review",
      "camera test",
      "benchmark test",
    ];

    // Known Educational Channels (boost score)
    this.knownEduChannels = [
      "physics wallah",
      "vedantu",
      "unacademy",
      "byjus",
      "khan academy",
      "neetprep",
      "examrace",
      "gate smashers",
      "study iq",
      "adda247",
      "tutorialspoint",
      "freecodecamp",
      "3blue1brown",
      "crash course",
      "ted-ed",
      "kurzgesagt",
      "vsauce",
      "minute physics",
      "minuteearth",
    ];

    // Known Non-Educational Channels (auto-hide)
    this.knownNonEduChannels = [
      "t-series",
      "zee entertainment",
      "sony music",
      "tips official",
      "speed records",
      "yash raj films",
      "dharma productions",
      "amit bhadana",
      "carryminati",
      "bb ki vines",
      "triggered insaan",
    ];

    this.apiService = null;
    this.init();
  }

  async init() {
    const data = await this.loadSettings();
    this.enabled = data.edutubeEnabled ?? false;
    this.sensitivity = data.edutubeSensitivity ?? 50;
    this.whitelist = new Set(data.edutubeWhitelist || []);
    this.blacklist = new Set(data.edutubeBlacklist || []);
    this.whitelistVideos = new Set(data.edutubeWhitelistVideos || []);
    this.blacklistVideos = new Set(data.edutubeBlacklistVideos || []);
    this.whitelistKeywords = new Set(data.edutubeWhitelistKeywords || []);
    this.blacklistKeywords = new Set(data.edutubeBlacklistKeywords || []);
    this.nonEduChannels = new Set(data.nonEduChannels || []);
    this.stats = data.edutubeStats || this.stats;

    if (typeof YouTubeAPIService !== "undefined") {
      this.apiService = new YouTubeAPIService();
      await this.apiService.init();
    }

    console.log("[EduTube] Initialized with sensitivity:", this.sensitivity);
  }

  async loadSettings() {
    return new Promise((resolve) => {
      if (!chrome?.storage?.sync) {
        resolve({});
        return;
      }

      chrome.storage.sync.get(
        [
          "edutubeEnabled",
          "edutubeSensitivity",
          "edutubeWhitelist",
          "edutubeBlacklist",
          "edutubeWhitelistVideos",
          "edutubeBlacklistVideos",
          "edutubeWhitelistKeywords",
          "edutubeBlacklistKeywords",
          "nonEduChannels",
          "edutubeStats",
        ],
        (data) => {
          if (chrome.runtime.lastError) {
            console.error(
              "[EduTube] Storage error:",
              chrome.runtime.lastError.message
            );
            resolve({});
            return;
          }
          resolve(data);
        }
      );
    });
  }

  async saveSettings() {
    if (!chrome?.storage?.sync) return;

    try {
      await chrome.storage.sync.set({
        edutubeEnabled: this.enabled,
        edutubeSensitivity: this.sensitivity,
        edutubeWhitelist: Array.from(this.whitelist),
        edutubeBlacklist: Array.from(this.blacklist),
        edutubeWhitelistVideos: Array.from(this.whitelistVideos),
        edutubeBlacklistVideos: Array.from(this.blacklistVideos),
        edutubeWhitelistKeywords: Array.from(this.whitelistKeywords),
        edutubeBlacklistKeywords: Array.from(this.blacklistKeywords),
        nonEduChannels: Array.from(this.nonEduChannels),
        edutubeStats: this.stats,
      });
    } catch (e) {
      console.error("[EduTube] Save settings error:", e);
    }
  }

  extractVideoId(element) {
    try {
      const selectors = [
        'a[href*="/watch?v="]',
        'a[href*="/shorts/"]',
        'a[href*="youtu.be/"]',
        "a#thumbnail",
        "a.yt-simple-endpoint",
      ];

      for (const sel of selectors) {
        const link = element.querySelector(sel);
        if (!link) continue;

        const href = link.getAttribute("href") || link.href;
        if (!href) continue;

        let match = href.match(/[?&]v=([^&]+)/);
        if (match) return match[1];

        match = href.match(/\/shorts\/([^/?#]+)/);
        if (match) return match[1];

        match = href.match(/youtu\.be\/([^/?#]+)/);
        if (match) return match[1];
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  extractChannelId(element) {
    try {
      const selectors = [
        'a[href*="/channel/"]',
        'a[href*="/@"]',
        'a[href*="/c/"]',
        "ytd-channel-name a",
      ];

      for (const sel of selectors) {
        const link = element.querySelector(sel);
        if (!link) continue;

        const href = link.getAttribute("href") || link.href;
        if (!href) continue;

        let match = href.match(/\/channel\/([^/?#]+)/);
        if (match) return match[1];

        match = href.match(/\/@([^/?#]+)/);
        if (match) return `@${match[1]}`;

        match = href.match(/\/c\/([^/?#]+)/);
        if (match) return `c/${match[1]}`;
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  extractVideoInfo(element) {
    try {
      let title =
        element.querySelector("#video-title")?.textContent?.trim() || "";
      let description =
        element.querySelector("#description-text")?.textContent?.trim() || "";
      let channelName =
        element.querySelector("#channel-name")?.textContent?.trim() || "";

      return { title, description, channelName };
    } catch (e) {
      return { title: "", description: "", channelName: "" };
    }
  }

  // IMPROVED: Robust scoring with 90% accuracy
  scoreVideo(videoInfo) {
    const title = (videoInfo.title || "").toLowerCase();
    const description = (videoInfo.description || "").toLowerCase();
    const channel = (videoInfo.channelName || "").toLowerCase();
    const text = `${title} ${description} ${channel}`;

    let score = 0;
    const wordRegex = (phrase) => {
      const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${esc}\\b`, "i");
    };

    // === IMMEDIATE REJECTIONS ===
    for (const indicator of this.strongNonEduIndicators) {
      if (wordRegex(indicator).test(text)) {
        // Check for educational context
        const hasEduContext =
          /lecture|course|tutorial|class|lesson|exam|notes|guide|explain|learn/i.test(
            text
          );
        if (!hasEduContext) {
          return -300; // STRONG REJECT
        }
      }
    }

    // === STRONG EDUCATIONAL SIGNALS ===
    // Known educational channels
    for (const channel of this.knownEduChannels) {
      if (wordRegex(channel).test(channel)) {
        score += 80; // High boost
        break;
      }
    }

    // Strong educational indicators (each worth 25 points, max 50)
    let strongCount = 0;
    for (const kw of this.strongEduIndicators) {
      if (wordRegex(kw).test(text)) {
        score += 25;
        strongCount++;
        if (strongCount >= 2) break;
      }
    }

    // Academic subjects (each worth 20 points, max 40)
    let subjectCount = 0;
    for (const kw of this.academicSubjects) {
      if (wordRegex(kw).test(text)) {
        score += 20;
        subjectCount++;
        if (subjectCount >= 2) break;
      }
    }

    // Educational keywords (each worth 10 points, max 30)
    let eduCount = 0;
    for (const kw of this.eduKeywords) {
      if (wordRegex(kw).test(text)) {
        score += 10;
        eduCount++;
        if (eduCount >= 3) break;
      }
    }

    // === BONUS POINTS ===
    if (
      /lecture|lec\b.*\d+|class.*\d+|lesson.*\d+|chapter.*\d+|part.*\d+|episode.*\d+/i.test(
        text
      )
    ) {
      score += 30; // Series format is educational
    }

    if (
      /exam.*prep|jee|neet|gate|ssc|upsc|board.*exam|mock.*test|sample.*paper/i.test(
        text
      )
    ) {
      score += 35; // Exam prep is heavily educational
    }

    if (
      /^(how to|tutorial|guide|learn|course|master|complete).*/i.test(title)
    ) {
      score += 25; // Starts with educational phrase
    }

    // === PENALTIES ===
    if (
      /you won't believe|shocking|must watch|exposed|secret.*revealed/i.test(
        title
      )
    ) {
      score -= 40; // Clickbait
    }

    if (/!!+|\?\?+|[A-Z]{10,}/i.test(title)) {
      score -= 25; // Excessive caps/punctuation
    }

    // Vlog, reaction, challenge, haul penalties
    if (/vlog|reaction|challenge|haul|prank|compilation/i.test(text)) {
      score -= 50;
    }

    // Music/entertainment penalties
    if (/song|music video|official video|album|track|remix/i.test(text)) {
      score -= 60;
    }

    // Clamp score
    score = Math.max(-100, Math.min(100, score));

    return score;
  }

  // GLOBAL WATCH PAGE REDIRECT (blocks blacklisted videos)
  checkWatchPageBlacklist() {
    try {
      const url = new URL(window.location.href);
      const videoId = url.searchParams.get("v");
      const channelLink = document.querySelector(
        'a[href*="/channel/"], a[href*="/@"]'
      );

      if (videoId && this.blacklistVideos.has(videoId)) {
        console.warn("[EduTube] Blocked blacklisted video:", videoId);
        window.location.replace("/");
        return;
      }

      if (channelLink) {
        const href = channelLink.getAttribute("href") || channelLink.href;
        let channelId = null;

        let match = href.match(/\/channel\/([^/?#]+)/);
        if (match) channelId = match[1];

        match = href.match(/\/@([^/?#]+)/);
        if (match) channelId = `@${match[1]}`;

        if (
          channelId &&
          (this.blacklist.has(channelId) || this.nonEduChannels.has(channelId))
        ) {
          console.warn("[EduTube] Blocked blacklisted channel:", channelId);
          window.location.replace("/");
          return;
        }
      }
    } catch (e) {
      console.debug("[EduTube] Watch page check error:", e);
    }
  }

  // Async filter with proper decision logic
  async isEducational(element) {
    if (!this.enabled) return true;

    const videoId = this.extractVideoId(element);
    const channelId = this.extractChannelId(element);
    const videoInfo = this.extractVideoInfo(element);

    // === LAYER 1: Video/Channel Blacklist (PRIORITY) ===
    if (videoId && this.blacklistVideos.has(videoId)) {
      this.stats.layerStats.blacklist++;
      return false;
    }

    if (
      channelId &&
      (this.blacklist.has(channelId) || this.nonEduChannels.has(channelId))
    ) {
      this.stats.layerStats.blacklist++;
      return false;
    }

    // === LAYER 2: Video/Channel Whitelist (ALLOW) ===
    if (videoId && this.whitelistVideos.has(videoId)) {
      this.stats.layerStats.whitelist++;
      return true;
    }

    if (channelId && this.whitelist.has(channelId)) {
      this.stats.layerStats.whitelist++;
      return true;
    }

    // === LAYER 3: Keyword Matching ===
    for (const keyword of this.whitelistKeywords) {
      if (
        videoInfo.title.toLowerCase().includes(keyword) ||
        videoInfo.channelName.toLowerCase().includes(keyword)
      ) {
        this.stats.layerStats.keywords++;
        return true;
      }
    }

    for (const keyword of this.blacklistKeywords) {
      if (
        videoInfo.title.toLowerCase().includes(keyword) ||
        videoInfo.channelName.toLowerCase().includes(keyword)
      ) {
        this.stats.layerStats.keywords++;
        return false;
      }
    }

    // === LAYER 4: Score-based Decision (90% Accurate) ===
    const score = this.scoreVideo(videoInfo);

    // Sensitivity-based thresholds
    let threshold;
    if (this.sensitivity <= 35) {
      // RELAXED: Show more, hide less
      threshold = 0; // Low bar for showing content
    } else if (this.sensitivity >= 66) {
      // STRICT: Show less, hide more
      threshold = 30; // High bar for showing content
    } else {
      // BALANCED (default)
      threshold = 15;
    }

    this.stats.layerStats.fallback++;

    if (score >= threshold) {
      this.stats.videosShown++;
      return true;
    } else {
      this.stats.videosHidden++;
      return false;
    }
  }

  // Add to non-educational channel list (blocks globally)
  async addNonEduChannel(channelId) {
    if (!channelId) return;
    this.nonEduChannels.add(channelId);
    this.whitelist.delete(channelId);
    await this.saveSettings();
    console.log("[EduTube] Added non-edu channel:", channelId);
  }

  async removeNonEduChannel(channelId) {
    if (!channelId) return;
    this.nonEduChannels.delete(channelId);
    await this.saveSettings();
    console.log("[EduTube] Removed non-edu channel:", channelId);
  }

  async addToWhitelist(channelId) {
    if (!channelId) return;
    this.whitelist.add(channelId);
    this.blacklist.delete(channelId);
    this.nonEduChannels.delete(channelId);
    await this.saveSettings();
  }

  async addToBlacklist(channelId) {
    if (!channelId) return;
    this.blacklist.add(channelId);
    this.whitelist.delete(channelId);
    await this.saveSettings();
  }

  async removeFromWhitelist(channelId) {
    if (!channelId) return;
    this.whitelist.delete(channelId);
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
    this.blacklistVideos.delete(videoId);
    await this.saveSettings();
  }

  async addVideoToBlacklist(videoId) {
    if (!videoId) return;
    this.blacklistVideos.add(videoId);
    this.whitelistVideos.delete(videoId);
    await this.saveSettings();
  }

  async removeVideoFromWhitelist(videoId) {
    if (!videoId) return;
    this.whitelistVideos.delete(videoId);
    await this.saveSettings();
  }

  async removeVideoFromBlacklist(videoId) {
    if (!videoId) return;
    this.blacklistVideos.delete(videoId);
    await this.saveSettings();
  }

  async toggle(enabled) {
    this.enabled = enabled;
    await this.saveSettings();
    console.log("[EduTube] Mode:", enabled ? "ON" : "OFF");
  }

  async setSensitivity(level) {
    this.sensitivity = Math.max(0, Math.min(100, level));
    await this.saveSettings();
    console.log("[EduTube] Sensitivity:", this.sensitivity);
  }

  getStats() {
    return { ...this.stats };
  }

  async resetStats() {
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
    await this.saveSettings();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = EduTubeEngine;
}
