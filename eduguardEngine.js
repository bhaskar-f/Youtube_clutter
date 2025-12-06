// ======================================================
// EduGuard Hybrid Engine v11.5
// - v12-style architecture (modular pipeline + caching + overrides)
// - v11-style intelligence (scoring, types, modes, hard entertainment)
// - WL/BL: channels + videos + keywords
// - Single unified entry: isEducational(input)
//   * input can be DOM element OR { title, description, channelName, videoId, channelId, ... }
// ======================================================

const DEV_MODE = true; // keep ON while debugging

class EduGuardEngine {
  constructor(opts = {}) {
    // Core state
    this.enabled = false;
    this.sensitivity = 50;

    // ID-based overrides
    this.whitelist = new Set(); // channel IDs
    this.blacklist = new Set(); // channel IDs
    this.whitelistVideos = new Set(); // video IDs
    this.blacklistVideos = new Set(); // video IDs

    // Keyword overrides (lowercased strings)
    this.whitelistKeywords = [];
    this.blacklistKeywords = [];

    // Stats
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

    // Decision cache
    this.decisionCache = new Map(); // id -> { decision, ts }
    this.MAX_CACHE_SIZE = opts.maxCacheSize || 600;
    this.cacheTTL = opts.cacheTTL || 1000 * 60 * 3; // 3 minutes

    // Optional YouTube API service (wired externally)
    this.apiService =
      (window.YouTubeAPI && window.YouTubeAPI.apiService) || null;

    // v11 scoring meta
    this._lastScoreMeta = null;

    // --------------------------------------------------
    // v11 SIGNAL DEFINITIONS
    // --------------------------------------------------

    // Strong EDU indicators (institutions, formats)
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
      "openlearn",
      "crash course",
      "tutorial series",
      "course",
      "class",
      "workshop",
      "seminar",
      "bootcamp",
      "training program",
      "certificate course",
      "online course",
      "playlist course",
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
      "part 1",
      "part 2",
      "episode 1",
      "unit",
      "session",
      "week 1",
      "week 2",
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
      "upsc",
      "ssc",
      "bank po",
      "coding interview",
    ];

    // General EDU keywords
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
      "lesson",
      "homework",
      "assignment",
      "lab",
      "practical",
      "academic",
      "college notes",
      "revision notes",
      "exam solution",
      "previous year question",
      "mcq",
      "quiz",
      "test series",
      "mock test",
      "solution",
      "solved example",
    ];

    // Academic subjects
    this.academicSubjects = [
      "mathematics",
      "math",
      "calculus",
      "algebra",
      "geometry",
      "trigonometry",
      "statistics",
      "probability",
      "linear algebra",
      "number theory",
      "graph theory",
      "discrete math",
      "physics",
      "chemistry",
      "biology",
      "anatomy",
      "physiology",
      "biochemistry",
      "genetics",
      "botany",
      "zoology",
      "microbiology",
      "organic chemistry",
      "inorganic chemistry",
      "thermodynamics",
      "quantum mechanics",
      "electromagnetism",
      "astronomy",
      "ecology",
      "environmental science",
      "programming",
      "coding",
      "computer science",
      "software engineering",
      "algorithm",
      "data structure",
      "dsa",
      "machine learning",
      "deep learning",
      "artificial intelligence",
      "neural networks",
      "data analysis",
      "data science",
      "python",
      "javascript",
      "java",
      "c++",
      "c language",
      "c#",
      "html",
      "css",
      "react",
      "nodejs",
      "sql",
      "dbms",
      "operating system",
      "computer network",
      "networking",
      "compiler design",
      "digital electronics",
      "microprocessor",
      "cloud computing",
      "aws",
      "azure",
      "electrical engineering",
      "electronics",
      "mechanical engineering",
      "civil engineering",
      "robotics",
      "control systems",
      "signals and systems",
      "fluid mechanics",
      "embedded systems",
      "history",
      "geography",
      "political science",
      "economics",
      "psychology",
      "philosophy",
      "sociology",
      "linguistics",
      "literature",
      "grammar",
      "language learning",
      "english",
      "hindi",
      "french",
      "german",
      "spanish",
      "jee",
      "neet",
      "upsc",
      "ssc",
      "gate",
      "ielts",
      "toefl",
      "gre",
      "gmat",
      "sat",
      "act",
      "cat exam",
      "aptitude",
      "reasoning",
      "quantitative aptitude",
      "logical reasoning",
      "ncert",
      "board exam",
    ];

    // STRONG non-EDU indicators (music, comedy, etc.)
    this.strongNonEduIndicators = [
      "song",
      "songs",
      "music",
      "music video",
      "official video",
      "official audio",
      "lyrics",
      "lyric video",
      "remix",
      "dj",
      "dj mix",
      "album",
      "track",
      "single",
      "mixtape",
      "rap",
      "hip hop",
      "cover song",
      "instrumental",
      "bgm",
      "soundtrack",
      "ost",
      "video song",
      "vlog",
      "daily vlog",
      "travel vlog",
      "reaction",
      "reaction video",
      "trailer",
      "teaser",
      "movie",
      "film",
      "cinema",
      "series",
      "clip",
      "funny",
      "comedy",
      "skit",
      "parody",
      "spoof",
      "roast",
      "memes",
      "meme",
      "challenge",
      "prank",
      "shorts",
      "short video",
      "reel",
      "behind the scenes",
      "bts",
      "gaming",
      "gameplay",
      "let's play",
      "livestream",
      "live stream",
      "esports",
      "fortnite",
      "minecraft",
      "roblox",
      "pubg",
      "bgmi",
      "gta",
      "valorant",
      "fifa",
      "haul",
      "makeup",
      "fashion",
      "skincare",
      "lifestyle",
      "ootd",
      "mukbang",
      "asmr",
      "dance cover",
      "dance video",
    ];

    // Softer non-EDU words
    this.softNonEduKeywords = [
      "review",
      "unboxing",
      "routine",
      "room tour",
      "house tour",
      "setup tour",
      "travel",
      "trip",
      "vacation",
      "prank",
      "challenge",
      "funny",
      "comedy",
      "meme",
    ];

    // Hard entertainment patterns (system 1)
    this.hardEntertainmentPatterns = [
      "movie explained",
      "ending explained",
      "movie breakdown",
      "film breakdown",
      "scene breakdown",
      "scene by scene",
      "watched it in",
      "chapter 1 in 0.25x",
      "chapter 1 in 0.5x",
      "chapter 2 in 0.25x",
      "recap of",
      "netflix",
      "prime video",
      "hotstar",
      "disney+",
      "marvel",
      "avengers",
      "dc universe",
      "dc comics",
      "anime",
      "manga",
      "story critic",
      "storycritic",
      "the canadian lad",
      "story of",
      "lore of",
      "backstory of",
      "true story of",
      "origin story",
      "dispatch",
      "episode",
      "season",
      "saga",
      "arc",
      "ufc",
      "mma",
      "knockout",
      "ko",
      "fight highlights",
      "fight night",
      "boxing",
      "wwe",
      "fifa",
      "footballer",
      "football highlights",
      "cricket highlights",
      "goal highlights",
      "match highlights",
      "full match",
      "athletic interest",
      "day in my life",
      "daily vlog",
      "morning routine",
      "night routine",
      "travel vlog",
      "my vlog",
      "podcast",
      "episode #",
      "story time",
      "reaction to",
      "reacts to",
      "reacting to",
      "commentary on",
      "side hustle ideas",
      "get rich",
    ];

    // App tutorials (lighter)
    this.appTutorialIndicators = [
      "paytm",
      "phonepe",
      "gpay",
      "upi app",
      "whatsapp trick",
      "instagram hack",
      "facebook trick",
      "mobile app",
      "online form",
      "registration form",
    ];

    // Clickbait
    this.clickbaitPatterns = [
      "you won't believe",
      "shocking",
      "must watch",
      "urgent",
      "breaking news",
      "exposed",
      "secret revealed",
      "truth behind",
      "real reason",
      "hidden truth",
    ];

    // Educational channel patterns
    this.eduChannelPatterns = [
      "university",
      "academy",
      "institute",
      "education",
      "learning",
      "school",
      "college",
      "teacher",
      "professor",
      "tutor",
      "edu",
      "academic",
      "official",
      "lectures",
      "classes",
    ];

    // Non-EDU channel patterns
    this.nonEduChannelPatterns = [
      "vlogs",
      "vlog",
      "gaming",
      "beats",
      "music",
      "entertainment",
      "films",
      "studios",
      "clips",
      "shorts",
    ];

    // Hobby hints (allowed in relaxed).
    this.hobbyHints = ["cooking", "recipe", "guitar", "piano", "drawing"];

    // Trusted channels
    this.trustedChannelRegex =
      /physics\s*wallah|pw(\s*(jee|neet))?|jee\s*wallah|nptel|gate\s*smashers|unacademy|vedantu|byju'?s|khan\s*academy|neetprep|examrace|study\s*iq|adda247|tutorialspoint/i;

    // Study-related content detector
    this.studySupportRegex =
      /(study\s+(motivation|motivational|tips|tricks|hacks|routine|routines|plan|planner|strategy|strategies|schedule|timetable|discipline|habits|method|methods|system|systems|technique|techniques|hours|for long hours|12 hours|10 hours))|((motivation|motivational)\s+for\s+(study|students|exams))|((how\s+to)\s+(study|focus|concentrate|avoid\s+distractions|stop\s+procrastinating))|(toppers?'?\s+(routine|strategy|plan|timetable|schedule))/i;

    // Kick off async init from extension bootstrap, not here.
  }

  // ------------------------------------------------------
  // Init / storage
  // ------------------------------------------------------

  async init() {
    const data = await this._getStorage([
      "eduguardEnabled",
      "eduguardSensitivity",
      "eduguardWhitelist",
      "eduguardBlacklist",
      "eduguardWhitelistVideos",
      "eduguardBlacklistVideos",
      "eduguardWhitelistKeywords",
      "eduguardBlacklistKeywords",
      "eduguardStats",
    ]);

    this.enabled = !!data.eduguardEnabled;
    this.sensitivity = Number.isFinite(data.eduguardSensitivity)
      ? data.eduguardSensitivity
      : 50;

    this.whitelist = new Set(data.eduguardWhitelist || []);
    this.blacklist = new Set(data.eduguardBlacklist || []);
    this.whitelistVideos = new Set(data.eduguardWhitelistVideos || []);
    this.blacklistVideos = new Set(data.eduguardBlacklistVideos || []);

    this.whitelistKeywords = Array.isArray(data.eduguardWhitelistKeywords)
      ? data.eduguardWhitelistKeywords
      : [];
    this.blacklistKeywords = Array.isArray(data.eduguardBlacklistKeywords)
      ? data.eduguardBlacklistKeywords
      : [];

    if (data.eduguardStats && typeof data.eduguardStats === "object") {
      this.stats = {
        ...this.stats,
        ...data.eduguardStats,
        layerStats: {
          ...this.stats.layerStats,
          ...(data.eduguardStats.layerStats || {}),
        },
      };
    }

    // refresh API reference if global wrapper exists
    if (window.YouTubeAPI && window.YouTubeAPI.apiService) {
      this.apiService = window.YouTubeAPI.apiService;
    }

    if (DEV_MODE) {
      console.log("[EduGuardEngine v12] init", {
        enabled: this.enabled,
        sensitivity: this.sensitivity,
        wlChannels: this.whitelist.size,
        blChannels: this.blacklist.size,
        wlVideos: this.whitelistVideos.size,
        blVideos: this.blacklistVideos.size,
      });
    }
  }

  _getStorage(keys) {
    return new Promise((resolve) => {
      try {
        if (!chrome?.storage?.sync) {
          resolve({});
          return;
        }
        chrome.storage.sync.get(keys, (res) => {
          if (chrome.runtime.lastError) {
            if (DEV_MODE) {
              console.warn(
                "[EduGuardEngine] storage error:",
                chrome.runtime.lastError.message
              );
            }
            resolve({});
          } else {
            resolve(res || {});
          }
        });
      } catch {
        resolve({});
      }
    });
  }

  async saveSettings() {
    try {
      // Extension got unloaded (SPA navigation)
      if (!chrome?.runtime?.id || !chrome?.storage?.sync) return;

      chrome.storage.sync.set(
        {
          eduguardEnabled: this.enabled,
          eduguardSensitivity: this.sensitivity,
          eduguardWhitelist: Array.from(this.whitelist),
          eduguardBlacklist: Array.from(this.blacklist),
          eduguardWhitelistVideos: Array.from(this.whitelistVideos),
          eduguardBlacklistVideos: Array.from(this.blacklistVideos),
          eduguardWhitelistKeywords: this.whitelistKeywords,
          eduguardBlacklistKeywords: this.blacklistKeywords,
          eduguardStats: this.stats,
        },
        () => {
          if (chrome.runtime.lastError && DEV_MODE) {
            console.warn(
              "[EduGuardEngine] safe saveSettings warning:",
              chrome.runtime.lastError.message
            );
          }
        }
      );
    } catch (e) {
      if (DEV_MODE) {
        console.warn("[EduGuardEngine] saveSettings skipped:", e);
      }
    }
  }

  // ------------------------------------------------------
  // Cache helpers
  // ------------------------------------------------------

  _now() {
    return Date.now();
  }

  _cacheSet(id, decision) {
    if (!id || typeof id !== "string") return;
    this.decisionCache.set(id, { decision, ts: this._now() });

    if (this.decisionCache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.decisionCache.entries());
      entries.sort((a, b) => a[1].ts - b[1].ts);
      const toDelete = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2));
      toDelete.forEach(([key]) => this.decisionCache.delete(key));
    }
  }

  _cacheGet(id) {
    if (!id) return null;
    const v = this.decisionCache.get(id);
    if (!v) return null;
    if (this._now() - v.ts > this.cacheTTL) {
      this.decisionCache.delete(id);
      return null;
    }
    return v.decision;
  }

  // ------------------------------------------------------
  // Extractors (hybrid)
  // ------------------------------------------------------

  extractVideoId(element) {
    if (!element || typeof element !== "object") return null;
    try {
      const selectors = [
        'a[href*="/watch?v="]',
        'a[href*="youtube.com/watch"]',
        'a[href*="/shorts/"]',
        'a[href*="youtu.be/"]',
        "a#thumbnail",
        "a.yt-simple-endpoint",
      ];
      for (const sel of selectors) {
        const link = element.querySelector(sel);
        if (!link) continue;
        const href = link.getAttribute("href") || link.href || "";
        if (!href) continue;

        let m = href.match(/[?&]v=([^&]+)/);
        if (m) return m[1];
        m = href.match(/\/shorts\/([^/?#]+)/);
        if (m) return m[1];
        m = href.match(/youtu\.be\/([^/?#]+)/);
        if (m) return m[1];
        m = href.match(/\/embed\/([^/?#]+)/);
        if (m) return m[1];
      }

      // Fallback: data-video-id
      return element.getAttribute("data-video-id") || null;
    } catch {
      return null;
    }
  }

  extractChannelId(element) {
    if (!element || typeof element !== "object") return null;
    try {
      const selectors = [
        'a[href*="/channel/"]',
        'a[href*="/@"]',
        'a[href*="/c/"]',
        'a[href*="/user/"]',
        "ytd-channel-name a",
        "#channel-name a",
      ];
      for (const sel of selectors) {
        const link = element.querySelector(sel);
        if (!link) continue;
        const href = link.getAttribute("href") || link.href || "";
        if (!href) continue;

        let m = href.match(/\/channel\/([^/?#]+)/);
        if (m) return m[1];
        m = href.match(/\/@([^/?#]+)/);
        if (m) return "@" + m[1];
        m = href.match(/\/c\/([^/?#]+)/);
        if (m) return "c/" + m[1];
        m = href.match(/\/user\/([^/?#]+)/);
        if (m) return "user/" + m[1];
      }
      return null;
    } catch {
      return null;
    }
  }

  extractVideoInfo(element) {
    if (!element || typeof element !== "object") {
      return {
        title: "",
        description: "",
        channelName: "",
        channelDescription: "",
        longDescription: "",
        tagsText: "",
      };
    }

    try {
      const titleSelectors = [
        "#video-title",
        "h3",
        ".title",
        "yt-formatted-string#video-title",
        "a#video-title-link",
        "#video-title yt-formatted-string",
      ];
      let title = "";
      for (const sel of titleSelectors) {
        const el = element.querySelector(sel);
        if (el) {
          title =
            el.textContent?.trim() ||
            el.getAttribute("aria-label") ||
            el.getAttribute("title") ||
            "";
          if (title) break;
        }
      }

      const descSelectors = [
        "#description-text",
        ".description",
        "yt-formatted-string.description",
        "#description-snippet",
      ];
      let description = "";
      for (const sel of descSelectors) {
        const el = element.querySelector(sel);
        if (el) {
          description = el.textContent?.trim() || "";
          if (description) break;
        }
      }

      const channelSelectors = [
        "#channel-name",
        ".channel-name",
        "#text.ytd-channel-name",
        "ytd-channel-name #text",
        "yt-formatted-string.ytd-channel-name",
      ];
      let channelName = "";
      for (const sel of channelSelectors) {
        const el = element.querySelector(sel);
        if (el) {
          channelName = el.textContent?.trim() || "";
          if (channelName) break;
        }
      }

      // channel description (best-effort)
      let channelDescription = "";
      try {
        const channelDescEl =
          document.querySelector(
            "yt-formatted-string#description, #description-inline-expander yt-formatted-string"
          ) ||
          document.querySelector(
            "ytd-channel-about-metadata-renderer #description yt-formatted-string"
          );
        if (channelDescEl) {
          channelDescription = channelDescEl.textContent?.trim() || "";
        }
      } catch {
        channelDescription = "";
      }

      const longDescription = element.dataset?.eduguardLongDescription || "";
      const tagsText = element.dataset?.eduguardTags || "";

      return {
        title,
        description,
        channelName,
        channelDescription,
        longDescription,
        tagsText,
      };
    } catch {
      return {
        title: "",
        description: "",
        channelName: "",
        channelDescription: "",
        longDescription: "",
        tagsText: "",
      };
    }
  }

  // ------------------------------------------------------
  // Helpers
  // ------------------------------------------------------

  _wordRegex(phrase) {
    const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${esc}\\b`, "i");
  }

  _extractHashtags(text) {
    if (!text) return [];
    const tags = [];
    const re = /#([^\s#]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const tag = m[1].trim().toLowerCase();
      if (tag && !tags.includes(tag)) tags.push(tag);
    }
    return tags;
  }

  _getModeFromSensitivity() {
    const s = this.sensitivity ?? 50;
    if (s <= 35) return "relaxed";
    if (s <= 65) return "balanced";
    return "strict";
  }

  _baseThresholdForMode(mode) {
    if (mode === "relaxed") return 20;
    if (mode === "strict") return 55;
    return 35;
  }

  getModeFromSensitivity() {
    return this._getModeFromSensitivity();
  }

  thresholdForMode(mode) {
    return this._thresholdForMode(mode);
  }

  _thresholdForMode(mode) {
    // v11-style sensitivity curves
    const s = this.sensitivity ?? 50;
    if (mode === "relaxed") {
      const local = Math.min(35, Math.max(0, s));
      return Math.round(10 + (local / 35) * 15); // 10–25
    }
    if (mode === "balanced") {
      const local = Math.min(65, Math.max(36, s)) - 36;
      return Math.round(30 + (local / 29) * 15); // 30–45
    }
    // strict
    const local = Math.min(100, Math.max(66, s)) - 66;
    return Math.round(50 + (local / 34) * 25); // 50–75
  }

  get lastScoreMeta() {
    return (
      this._lastScoreMeta || {
        score: 0,
        type: "unknown",
        eduScore: 0,
        nonEduScore: 0,
        trustedChannel: false,
        hardEntertainment: false,
      }
    );
  }

  // ------------------------------------------------------
  // v11-style scoring (adapted)
  // ------------------------------------------------------

  scoreKeywords(videoInfo) {
    const rawTitle = (videoInfo.title || "").trim();
    const rawDesc = (videoInfo.description || "").trim();
    const rawChannel = (videoInfo.channelName || "").trim();
    const rawChannelDesc = (videoInfo.channelDescription || "").trim();
    const extraLongDesc = (videoInfo.longDescription || "").trim();
    const extraTagsText = (
      videoInfo.tagsText ||
      videoInfo.hashtagsString ||
      ""
    ).trim();

    const hashtagSource = [
      rawTitle,
      rawDesc,
      rawChannel,
      rawChannelDesc,
      extraLongDesc,
      extraTagsText,
    ]
      .filter(Boolean)
      .join(" ");

    const hashtagTokens = this._extractHashtags(hashtagSource);
    const hashtagText = hashtagTokens.join(" ");

    const title = rawTitle.toLowerCase();
    const description = (rawDesc + " " + extraLongDesc).toLowerCase();
    const channel = rawChannel.toLowerCase();
    const channelDesc = rawChannelDesc.toLowerCase();
    const tagsLower = hashtagText.toLowerCase();

    const text = `${title} ${description} ${channel} ${channelDesc} ${tagsLower}`;
    const wordRegex = this._wordRegex.bind(this);

    let score = 0;
    const breakdown = [];
    let eduScore = 0;
    let nonEduScore = 0;

    let type = "unknown";
    let trustedChannel = false;
    let hasStrongEdu = false;
    let hasAcademicSubject = false;
    let hasEduKeyword = false;
    let hasStrongNonEdu = false;
    let hasSoftNonEdu = false;
    let hasStrongNonEduHashtags = false;
    let hasEduHashtags = false;
    let hardEntertainment = false;
    let isStudySupport = false;

    const eduContextRegex =
      /lecture|lec\b|course|tutorial|chapter|lesson|class|notes|mcq|gate\b|jee\b|neet\b|exam|board\s+exam|computer\s*network|dbms|operating\s*system|normal\s*form|dsa\b|algorithm|previous\s+year|mock\s*test|test\s*series|ncert/i;
    const hasEduContext = eduContextRegex.test(text);

    // 1) Channel reputation
    if (this.trustedChannelRegex.test(channel)) {
      const delta = 80;
      score += delta;
      eduScore += delta;
      trustedChannel = true;
      type = "academic";
      breakdown.push({ reason: "trustedChannelRegex", delta });
    }

    for (const p of this.eduChannelPatterns) {
      if (wordRegex(p).test(channel)) {
        const delta = 35;
        score += delta;
        eduScore += delta;
        if (type === "unknown") type = "academic";
        breakdown.push({ reason: `eduChannel:${p}`, delta });
        break;
      }
    }

    for (const p of this.nonEduChannelPatterns) {
      if (wordRegex(p).test(channel)) {
        const delta = 35;
        score -= delta;
        nonEduScore += delta;
        hasStrongNonEdu = true;
        breakdown.push({ reason: `nonEduChannel:${p}`, delta: -delta });
      }
    }

    // 2) Strong EDU
    let strongEduMatches = 0;
    for (const kw of this.strongEduIndicators) {
      if (!wordRegex(kw).test(text)) continue;
      strongEduMatches++;
      hasStrongEdu = true;
      const delta = strongEduMatches === 1 ? 14 : 24;
      score += delta;
      eduScore += delta;
      breakdown.push({ reason: `strongEdu:${kw}`, delta });
    }

    // 3) Subjects
    let subjectMatches = 0;
    for (const kw of this.academicSubjects) {
      if (!wordRegex(kw).test(text)) continue;
      subjectMatches++;
      hasAcademicSubject = true;
      const delta = subjectMatches === 1 ? 10 : 20;
      score += delta;
      eduScore += delta;
      breakdown.push({ reason: `subject:${kw}`, delta });
    }

    // 4) General EDU keywords
    let eduKwMatches = 0;
    for (const kw of this.eduKeywords) {
      if (!wordRegex(kw).test(text)) continue;
      eduKwMatches++;
      hasEduKeyword = true;
      const delta = eduKwMatches === 1 ? 4 : 10;
      score += delta;
      eduScore += delta;
      breakdown.push({ reason: `eduKw:${kw}`, delta });
    }

    // 5) Exam-related
    if (
      /\b(jee|neet|gate|ssc|upsc|board\s+exam|study|revision|notes|mcq|previous\s+year|exam\s+strategy|mock\s*test|test\s*series|ncert)\b/i.test(
        text
      )
    ) {
      const delta = 28;
      score += delta;
      eduScore += delta;
      if (type === "unknown") type = "academic";
      breakdown.push({ reason: "examRelated", delta });
    }

    // 6) CS/OS/CN topics
    if (
      /\b(dbms|operating\s*system|os\b|computer\s*network|cn\b|data\s*structure|dsa\b|algorithm|compiler\s*design|normal\s*form)\b/i.test(
        text
      )
    ) {
      const delta = 22;
      score += delta;
      eduScore += delta;
      if (type === "unknown") type = "technical";
      breakdown.push({ reason: "csCoreTopic", delta });
    }

    // 7) App tutorials
    let appTutMatches = 0;
    for (const kw of this.appTutorialIndicators) {
      if (!wordRegex(kw).test(text)) continue;
      appTutMatches++;
      const delta = appTutMatches === 1 ? 6 : 10;
      score += delta;
      eduScore += delta;
      breakdown.push({ reason: `appTutorial:${kw}`, delta });
    }

    // 8) Strong non-EDU
    let strongNonEduMatches = 0;
    for (const indicator of this.strongNonEduIndicators) {
      if (!wordRegex(indicator).test(text)) continue;
      strongNonEduMatches++;
      hasStrongNonEdu = true;
      let base = strongNonEduMatches === 1 ? 28 : 40;
      if (
        /song|music video|official video|lyrics|lyric video|remix|dj|soundtrack|ost/.test(
          indicator
        )
      ) {
        base += 8;
      }
      const delta = base;
      score -= delta;
      nonEduScore += delta;
      breakdown.push({ reason: `strongNonEdu:${indicator}`, delta: -delta });
    }

    // 9) Soft non-EDU
    let softNonEduMatches = 0;
    for (const kw of this.softNonEduKeywords) {
      if (!wordRegex(kw).test(text)) continue;
      softNonEduMatches++;
      hasSoftNonEdu = true;
      const delta = softNonEduMatches === 1 ? 12 : 20;
      score -= delta;
      nonEduScore += delta;
      breakdown.push({ reason: `softNonEdu:${kw}`, delta: -delta });
    }

    // 10) Hashtags
    if (hashtagTokens.length > 0) {
      let strongNonEduTagCount = 0;
      let eduTagCount = 0;

      for (const tag of hashtagTokens) {
        const tagLower = tag.toLowerCase();

        if (
          [
            "music",
            "song",
            "lofi",
            "beats",
            "funny",
            "comedy",
            "skit",
            "meme",
            "vlog",
            "shorts",
            "gaming",
            "pubg",
            "gta",
            "fifa",
          ].some((kw) => tagLower.includes(kw))
        ) {
          strongNonEduTagCount++;
        }

        if (
          ["gate", "jee", "neet", "upsc", "exam", "study", "notes"].some((kw) =>
            tagLower.includes(kw)
          ) ||
          ["python", "javascript", "dbms", "nptel", "math", "coding"].some(
            (kw) => tagLower.includes(kw)
          ) ||
          ["machinelearning", "ai", "ml"].some((kw) => tagLower.includes(kw))
        ) {
          eduTagCount++;
        }
      }

      if (strongNonEduTagCount >= 2) {
        hasStrongNonEduHashtags = true;
        const delta = 32;
        score -= delta;
        nonEduScore += delta;
        breakdown.push({
          reason: "strongNonEduHashtags(>=2)",
          delta: -delta,
          tags: hashtagTokens,
        });
      }

      if (eduTagCount >= 2) {
        hasEduHashtags = true;
        const delta = 20;
        score += delta;
        eduScore += delta;
        breakdown.push({
          reason: "eduHashtags(>=2)",
          delta,
          tags: hashtagTokens,
        });
      }
    }

    // 11) Clickbait / format
    for (const pattern of this.clickbaitPatterns) {
      if (wordRegex(pattern).test(title)) {
        const delta = 15;
        score -= delta;
        nonEduScore += delta;
        breakdown.push({ reason: `clickbait:${pattern}`, delta: -delta });
      }
    }
    if (/!!+|\?\?+/.test(title)) {
      const delta = 8;
      score -= delta;
      nonEduScore += delta;
      breakdown.push({ reason: "excessPunct", delta: -delta });
    }
    if (title === title.toUpperCase() && title.length > 10) {
      const delta = 12;
      score -= delta;
      nonEduScore += delta;
      breakdown.push({ reason: "allCaps", delta: -delta });
    }

    // 12) "how to" without context
    if (
      /how to\b/i.test(text) &&
      !hasStrongEdu &&
      !hasAcademicSubject &&
      !this.eduChannelPatterns.some((p) => wordRegex(p).test(channel))
    ) {
      const delta = 6;
      score -= delta;
      nonEduScore += delta;
      breakdown.push({ reason: "howto_no_context", delta: -delta });
    }

    // 13) Hard entertainment patterns
    for (const patt of this.hardEntertainmentPatterns) {
      const re = new RegExp(patt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (re.test(title) || re.test(description) || re.test(channel)) {
        hardEntertainment = true;
        const delta = 30;
        score -= delta;
        nonEduScore += delta;
        breakdown.push({ reason: `hardEntertainment:${patt}`, delta: -delta });
      }
    }

    // 14) Study-support detector
    if (this.studySupportRegex.test(text)) {
      isStudySupport = true;
      const delta = 20;
      score += delta;
      eduScore += delta;
      breakdown.push({ reason: "studySupport", delta });
    }

    // 15) Final type decision (v11)
    const eduDominant = eduScore >= nonEduScore + 10;
    const nonEduDominant = nonEduScore >= eduScore + 10;

    if (
      (nonEduDominant || hardEntertainment || hasStrongNonEduHashtags) &&
      !hasEduContext &&
      !hasStrongEdu &&
      !hasAcademicSubject &&
      !isStudySupport
    ) {
      type = "entertainment";
    } else if (
      eduDominant ||
      trustedChannel ||
      hasAcademicSubject ||
      hasStrongEdu ||
      hasEduHashtags
    ) {
      if (type === "unknown") type = "academic";
    } else if (isStudySupport) {
      type = "study";
    } else if (hasEduKeyword || appTutMatches > 0) {
      const isHobby = this.hobbyHints.some((h) => text.includes(h));
      type = isHobby ? "hobby" : "technical";
    } else if (nonEduDominant) {
      type = "entertainment";
    } else {
      type = "unknown";
    }

    score = Math.max(-400, Math.min(400, score));

    if (DEV_MODE) {
      console.groupCollapsed(
        `[EduGuard-BREAKDOWN v11.5] "${rawTitle}" => score=${score}, type=${type}, edu=${eduScore}, nonEdu=${nonEduScore}`
      );
      console.table(breakdown);
      console.groupEnd();
    }

    this._lastScoreMeta = {
      score,
      type,
      breakdown,
      eduScore,
      nonEduScore,
      trustedChannel,
      title: rawTitle,
      channel: rawChannel,
      description: rawDesc,
      channelDescription: rawChannelDesc,
      hashtags: hashtagTokens,
      hasStrongNonEduHashtags,
      hasEduHashtags,
      hardEntertainment,
      isStudySupport,
    };

    return score;
  }

  // ------------------------------------------------------
  // API category helper (hybrid)
  // ------------------------------------------------------

  _apiAlwaysBlockCategories() {
    // Music, Entertainment, Gaming, Comedy, etc.
    return [
      "1", // Film & Animation
      "10", // Music
      "17", // Sports
      "20", // Gaming
      "21", // Videoblogging
      "22", // People & Blogs
      "23", // Comedy
      "24", // Entertainment
      "30", // Movies
      "31", // Anime/Animation
      "32", // Action/Adventure
      "33", // Classics
      "34", // Comedy
    ];
  }

  _apiAlwaysAllowCategories() {
    // Education, Nonprofits
    return ["27", "36"];
  }

  _apiSoftEduDecision(cat, text) {
    // v11-style softer decisions, used in borderline
    if (["27", "28", "35"].includes(cat)) return true;
    if (
      cat === "26" &&
      /how\s+to|tutorial|guide|install|setup|build|create|learn/i.test(text)
    ) {
      return true;
    }
    if (["1", "10", "17", "20", "22", "23", "24"].includes(cat)) return false;
    return null;
  }

  // ------------------------------------------------------
  // MAIN DECISION PIPELINE (Hybrid v12 + v11)
  // ------------------------------------------------------

  async isEducational(input) {
    try {
      if (!this.enabled) return true;

      let videoId = null;
      let channelId = null;
      let info = {
        title: "",
        description: "",
        channelName: "",
        channelDescription: "",
        longDescription: "",
        tagsText: "",
      };

      // Accept DOM node or info object
      if (input && typeof input === "object") {
        if (input.nodeType) {
          // DOM element
          videoId = this.extractVideoId(input);
          channelId = this.extractChannelId(input);
          info = this.extractVideoInfo(input);
        } else {
          // Info object
          videoId = input.videoId || null;
          channelId = input.channelId || null;
          info = {
            title: input.title || "",
            description: input.description || "",
            channelName: input.channelName || "",
            channelDescription: input.channelDescription || "",
            longDescription: input.longDescription || "",
            tagsText: input.tagsText || "",
          };
        }
      }

      const mode = this._getModeFromSensitivity();

      // 0) Cache check
      if (videoId) {
        const cached = this._cacheGet(videoId);
        if (typeof cached === "boolean") {
          if (DEV_MODE) {
            console.log(
              `[EduGuard] CACHE ${cached ? "ALLOW" : "BLOCK"}:`,
              info.title
            );
          }
          return cached;
        }
      }

      // 1) WL/BL ID overrides (strongest)
      if (channelId && this.whitelist.has(channelId)) {
        this.stats.layerStats.whitelist++;
        this._cacheSet(videoId || channelId, true);
        if (DEV_MODE)
          console.log("[EduGuard] WHITELIST ALLOW (channel):", info.title);
        return true;
      }
      if (channelId && this.blacklist.has(channelId)) {
        this.stats.layerStats.blacklist++;
        this._cacheSet(videoId || channelId, false);
        if (DEV_MODE)
          console.log("[EduGuard] BLACKLIST BLOCK (channel):", info.title);
        return false;
      }
      if (videoId && this.whitelistVideos.has(videoId)) {
        this.stats.layerStats.whitelist++;
        this._cacheSet(videoId, true);
        if (DEV_MODE)
          console.log("[EduGuard] WHITELIST ALLOW (video):", info.title);
        return true;
      }
      if (videoId && this.blacklistVideos.has(videoId)) {
        this.stats.layerStats.blacklist++;
        this._cacheSet(videoId, false);
        if (DEV_MODE)
          console.log("[EduGuard] BLACKLIST BLOCK (video):", info.title);
        return false;
      }

      // 2) Keyword overrides
      const titleLower = (info.title || "").toLowerCase();
      const channelLower = (info.channelName || "").toLowerCase();

      for (const kw of this.whitelistKeywords) {
        if (titleLower.includes(kw) || channelLower.includes(kw)) {
          this.stats.layerStats.keywords++;
          this._cacheSet(videoId, true);
          if (DEV_MODE)
            console.log("[EduGuard] KEYWORD WHITELIST ALLOW:", info.title);
          return true;
        }
      }
      for (const kw of this.blacklistKeywords) {
        if (titleLower.includes(kw) || channelLower.includes(kw)) {
          this.stats.layerStats.keywords++;
          this._cacheSet(videoId, false);
          if (DEV_MODE)
            console.log("[EduGuard] KEYWORD BLACKLIST BLOCK:", info.title);
          return false;
        }
      }

      // 3) Single API fetch (used for both hard override & borderline)
      let apiData = null;
      let apiCategory = null;
      if (videoId && this.apiService && this.apiService.enabled) {
        try {
          apiData = await this.apiService.fetchVideoDetails(videoId);
          if (apiData && apiData.categoryId) {
            apiCategory = String(apiData.categoryId);
          }
        } catch (e) {
          if (DEV_MODE) console.warn("[EduGuard] API error:", e);
        }
      }

      // 3a) Hard category override (v12-style pre-decision)
      if (apiCategory) {
        const textForApi = (
          titleLower +
          " " +
          (info.description || "").toLowerCase()
        ).trim();

        const ALWAYS_BLOCK = this._apiAlwaysBlockCategories();
        const ALWAYS_ALLOW = this._apiAlwaysAllowCategories();

        if (ALWAYS_BLOCK.includes(apiCategory)) {
          this.stats.layerStats.api++;
          this._cacheSet(videoId || apiCategory, false);
          if (DEV_MODE)
            console.log(
              "[EduGuard] API HARD BLOCK (category):",
              apiCategory,
              info.title
            );
          return false;
        }

        if (ALWAYS_ALLOW.includes(apiCategory)) {
          this.stats.layerStats.api++;
          this._cacheSet(videoId || apiCategory, true);
          if (DEV_MODE)
            console.log(
              "[EduGuard] API HARD ALLOW (category):",
              apiCategory,
              info.title
            );
          return true;
        }

        // You can optionally add more category-specific tweaks here if needed.
        if (DEV_MODE) {
          console.log(
            "[EduGuard] API soft category (no hard override):",
            apiCategory,
            info.title
          );
        }
      }

      // 4) v11 scoring
      const score = this.scoreKeywords(info);
      const meta = this._lastScoreMeta;
      this.stats.layerStats.keywords++;

      if (DEV_MODE) {
        console.log("[EduGuard] SCORE_RESULT v11.5", {
          title: info.title,
          score,
          mode,
          type: meta.type,
          eduScore: meta.eduScore,
          nonEduScore: meta.nonEduScore,
          trustedChannel: meta.trustedChannel,
          hardEntertainment: meta.hardEntertainment,
        });
      }

      // 4a) Unknown type = blocked in all modes
      if (meta.type === "unknown") {
        if (DEV_MODE) {
          console.log("[EduGuard] BLOCK_UNKNOWN_TYPE:", info.title);
        }
        this.stats.layerStats.fallback++;
        this._cacheSet(videoId, false);
        return false;
      }

      // 4b) Hard entertainment always blocked (unless trusted)
      if (meta.hardEntertainment && !meta.trustedChannel) {
        if (DEV_MODE) {
          console.log(
            "[EduGuard] HARD_ENTERTAINMENT_BLOCK:",
            info.title,
            "score=",
            score
          );
        }
        this.stats.layerStats.fallback++;
        this._cacheSet(videoId, false);
        return false;
      }

      // 4c) Strong entertainment dominance
      if (
        meta.type === "entertainment" &&
        meta.nonEduScore >= meta.eduScore + 20 &&
        meta.nonEduScore >= 40
      ) {
        if (DEV_MODE) {
          console.log(
            "[EduGuard] STRONG_ENTERTAINMENT_BLOCK:",
            info.title,
            "score=",
            score
          );
        }
        this.stats.layerStats.fallback++;
        this._cacheSet(videoId, false);
        return false;
      }

      // 4d) Mode-aware rules (v11)
      let allowedByMode = true;

      if (mode === "strict") {
        if (
          meta.type !== "academic" &&
          meta.type !== "technical" &&
          !meta.trustedChannel
        ) {
          allowedByMode = false;
        }
        if (meta.hasStrongNonEduHashtags && !meta.trustedChannel) {
          allowedByMode = false;
        }
        if (meta.eduScore <= meta.nonEduScore && !meta.trustedChannel) {
          allowedByMode = false;
        }
      } else if (mode === "balanced") {
        if (meta.type === "entertainment") {
          allowedByMode = false;
        }
        if (meta.type === "hobby" && meta.eduScore < meta.nonEduScore + 20) {
          allowedByMode = false;
        }
        if (
          meta.hasStrongNonEduHashtags &&
          !meta.trustedChannel &&
          meta.eduScore < meta.nonEduScore + 40
        ) {
          allowedByMode = false;
        }
      } else if (mode === "relaxed") {
        if (meta.type === "entertainment") {
          allowedByMode = false;
        }
        if (
          meta.hasStrongNonEduHashtags &&
          !meta.trustedChannel &&
          meta.eduScore <= meta.nonEduScore
        ) {
          allowedByMode = false;
        }
      }

      if (!allowedByMode) {
        if (DEV_MODE) {
          console.log("[EduGuard] MODE_BLOCK:", {
            mode,
            title: info.title,
            type: meta.type,
          });
        }
        this.stats.layerStats.fallback++;
        this._cacheSet(videoId, false);
        return false;
      }

      // 4e) Strict trusted override
      if (mode === "strict" && meta.trustedChannel) {
        if (DEV_MODE) {
          console.log("[EduGuard] STRICT_TRUSTED_ALLOW:", info.title);
        }
        this.stats.layerStats.fallback++;
        this._cacheSet(videoId, true);
        return true;
      }

      // 4f) Strong EDU shortcut
      let strongEduCutoff = 50;
      const sens = this.sensitivity ?? 50;
      if (sens <= 35) strongEduCutoff = 40;
      else if (sens >= 66) strongEduCutoff = 60;

      if (
        (meta.type === "academic" || meta.type === "technical") &&
        score >= strongEduCutoff
      ) {
        if (DEV_MODE) {
          console.log("[EduGuard] STRONG_EDU_ALLOW:", info.title, score);
        }
        this.stats.layerStats.fallback++;
        this._cacheSet(videoId, true);
        return true;
      }

      // 5) Threshold + borderline API fallback (v11 style)
      let effectiveThreshold = this._thresholdForMode(mode);

      const borderlineMargin = 10;
      const isBorderline =
        score > effectiveThreshold - borderlineMargin &&
        score < effectiveThreshold + borderlineMargin;

      if (
        videoId &&
        apiCategory &&
        this.apiService &&
        this.apiService.enabled &&
        isBorderline &&
        score > -50
      ) {
        const textForApi = (
          titleLower +
          " " +
          (info.description || "").toLowerCase()
        ).trim();
        const apiSoftDecision = this._apiSoftEduDecision(
          apiCategory,
          textForApi
        );

        if (apiSoftDecision === true) {
          this.stats.layerStats.api++;
          if (DEV_MODE) {
            console.log("[EduGuard] API_BORDERLINE_ALLOW:", {
              videoId,
              category: apiCategory,
              score,
            });
          }
          this._cacheSet(videoId, true);
          return true;
        }
        if (apiSoftDecision === false) {
          this.stats.layerStats.api++;
          if (DEV_MODE) {
            console.log("[EduGuard] API_BORDERLINE_BLOCK:", {
              videoId,
              category: apiCategory,
              score,
            });
          }
          this._cacheSet(videoId, false);
          return false;
        }
      }

      // 6) Relaxed mode forgiveness when no effective API help
      if (
        (!this.apiService || !this.apiService.enabled || !apiCategory) &&
        mode === "relaxed" &&
        score >= effectiveThreshold - 5 &&
        score < effectiveThreshold
      ) {
        effectiveThreshold -= 5;
        if (DEV_MODE) {
          console.log("[EduGuard] RELAXED_BORDERLINE_ADJUST:", {
            newThreshold: effectiveThreshold,
          });
        }
      }

      const decision = score >= effectiveThreshold;
      this.stats.layerStats.fallback++;
      this._cacheSet(videoId, decision);

      if (DEV_MODE) {
        console.log("[EduGuard] FINAL_DECISION v11.5", {
          decision: decision ? "ALLOW" : "BLOCK",
          score,
          threshold: effectiveThreshold,
          mode,
          type: meta.type,
          title: info.title,
        });
      }

      return decision;
    } catch (e) {
      console.error("[EduGuard] isEducational error:", e);
      return true; // fail-open
    }
  }

  // ------------------------------------------------------
  // Public helpers for popup/contentScript
  // ------------------------------------------------------
  setApiService(service) {
    this.apiService = service;
  }

  getStats() {
    return this.stats;
  }

  toggle(enable) {
    this.enabled = !!enable;
    return this.saveSettings();
  }

  setSensitivity(value) {
    const oldValue = this.sensitivity;
    this.sensitivity = Number(value) || this.sensitivity;
    if (Math.abs(oldValue - this.sensitivity) >= 10) {
      console.log(
        "[EduGuard] Clearing decision cache due to sensitivity change"
      );
      this.decisionCache.clear();
    }
    return this.saveSettings();
  }

  async addToWhitelist(channelId) {
    if (!channelId) return;
    this.whitelist.add(channelId);
    this.blacklist.delete(channelId);
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

  async removeVideoFromWhitelist(videoId) {
    if (!videoId) return;
    this.whitelistVideos.delete(videoId);
    await this.saveSettings();
  }

  async addVideoToBlacklist(videoId) {
    if (!videoId) return;
    this.blacklistVideos.add(videoId);
    this.whitelistVideos.delete(videoId);
    await this.saveSettings();
  }

  async removeVideoFromBlacklist(videoId) {
    if (!videoId) return;
    this.blacklistVideos.delete(videoId);
    await this.saveSettings();
  }

  async addWhitelistKeyword(kw) {
    if (!kw) return;
    const key = kw.toLowerCase();
    if (!this.whitelistKeywords.includes(key)) {
      this.whitelistKeywords.push(key);
      this.blacklistKeywords = this.blacklistKeywords.filter((k) => k !== key);
      await this.saveSettings();
    }
  }

  async addBlacklistKeyword(kw) {
    if (!kw) return;
    const key = kw.toLowerCase();
    if (!this.blacklistKeywords.includes(key)) {
      this.blacklistKeywords.push(key);
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

// Expose globally
window.EduGuardEngine = EduGuardEngine;
