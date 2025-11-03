// ======================================================
// EduTube Engine - BALANCED VERSION (patched fixes only)
// - Small, targeted fixes to scoring weights and thresholds
// - Avoids changing feature surface or APIs
// ======================================================

class EduTubeEngine {
  constructor() {
    this.enabled = false;
    this.sensitivity = 50;
    this.whitelist = new Set();
    this.blacklist = new Set();
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

    this.strongEduIndicators = [
      // Institutions & Platforms
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
      // Institutions / brands
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
      // Format phrases
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
      "episode 2",
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
      "bootcamp tutorial",
      // Certifications
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
    // education keywords
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

    //academic subjects

    this.academicSubjects = [
      // 🧮 Mathematics
      "mathematics",
      "math",
      "calculus",
      "algebra",
      "geometry",
      "trigonometry",
      "statistics",
      "probability",
      "arithmetic",
      "differentiation",
      "integration",
      "linear algebra",
      "matrix",
      "derivative",
      "limits",
      "graph theory",
      "discrete math",
      "number theory",

      // 🧪 Science
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
      "astrophysics",
      "geology",
      "meteorology",
      "climate science",
      "ecology",
      "environmental science",
      "earth science",

      // 💻 Computer Science / Programming
      "programming",
      "coding",
      "software engineering",
      "computer science",
      "algorithm",
      "data structure",
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
      "go",
      "rust",
      "html",
      "css",
      "react",
      "nodejs",
      "sql",
      "mongodb",
      "firebase",
      "flutter",
      "android development",
      "ios development",
      "web development",
      "frontend development",
      "backend development",
      "devops",
      "cloud computing",
      "aws",
      "azure",
      "docker",
      "kubernetes",
      "cybersecurity",
      "ethical hacking",
      "operating system",
      "networking",
      "compiler design",
      "dbms",
      "os concepts",
      "cn",
      "dsa",
      "oop",
      "software testing",
      "version control",
      "git",
      "github",
      "code review",

      // ⚙️ Engineering / Technical
      "electrical engineering",
      "electronics",
      "mechanical engineering",
      "civil engineering",
      "chemical engineering",
      "industrial engineering",
      "robotics",
      "control systems",
      "signals and systems",
      "microprocessor",
      "circuit analysis",
      "fluid mechanics",
      "thermodynamics",
      "design of machine elements",
      "engineering drawing",
      "manufacturing process",
      "power systems",
      "embedded systems",
      "digital electronics",
      "vlsi",
      "communication systems",

      // 📚 Humanities & Social Sciences
      "history",
      "geography",
      "political science",
      "economics",
      "psychology",
      "philosophy",
      "sociology",
      "archaeology",
      "anthropology",
      "education theory",
      "linguistics",
      "literature",
      "grammar",
      "language learning",
      "english",
      "spanish",
      "french",
      "german",
      "chinese",
      "hindi",
      "translation",
      "writing skills",
      "poetry analysis",

      // 💼 Professional Skills & Careers
      "interview preparation",
      "resume writing",
      "career guidance",
      "public speaking",
      "communication skills",
      "presentation skills",
      "time management",
      "leadership",
      "entrepreneurship",
      "marketing",
      "business analysis",
      "project management",
      "pmp",
      "finance basics",
      "excel tutorial",
      "spreadsheet",
      "statistics for data science",
      "management studies",
      "econometrics",

      // 🎨 Arts, Design & Creativity
      "art",
      "design",
      "drawing",
      "sketching",
      "animation",
      "3d modeling",
      "photoshop tutorial",
      "illustrator tutorial",
      "ui ux design",
      "architecture",
      "graphic design",
      "film studies",
      "storytelling",
      "music theory",
      "sound design",
      "music production",
      "editing tutorial",
      "color theory",

      // 🌍 Exams, Certifications & Skills
      "jee",
      "neet",
      "upsc",
      "ssc",
      "bank po",
      "gate",
      "ielts",
      "toefl",
      "gre",
      "gmat",
      "sat",
      "act",
      "cat exam",
      "placement preparation",
      "aptitude",
      "reasoning",
      "logical reasoning",
      "quantitative aptitude",
      "english grammar",
      "vocabulary",
      "mock test",
      "sample paper",
      "previous year questions",
    ];

    // STRONG non-educational indicators (immediate disqualification)
    this.strongNonEduIndicators = [
      // Add these at the end of strongNonEduIndicators
      "song",
      "songs",
      "music",
      "music video",
      "official video",
      "official audio",
      "audio",
      "lyrics",
      "lyric video",
      "karaoke",
      "remix",
      "dj mix",
      "album",
      "track",
      "single",
      "mixtape",
      "rap",
      "hip hop",
      "pop music",
      "classical music",
      "cover song",
      "instrumental",
      "bgm",
      "theme song",
      "soundtrack",
      "ost",
      "video song",
      "love song",
      "romantic song",
      "devotional song",
      "bhajan",
      "worship song",
      "t-series",
      "zee music",
      "sony music",
      "tips official",
      "speed records",
      "yash raj films",
      "label",
      "record label",
      "official trailer song",

      // 🎬 Entertainment & Pop Culture
      "vlog",
      "daily vlog",
      "travel vlog",
      "fun vlog",
      "reaction",
      "reaction video",
      "trailer",
      "teaser",
      "movie",
      "film",
      "cinema",
      "series",
      "episode",
      "season",
      "behind the scenes",
      "celebrity",
      "hollywood",
      "bollywood",
      "tollywood",
      "idol",
      "music video",
      "mv",
      "lyrics",
      "concert",
      "dance cover",
      "fan cam",
      "kpop",
      "bts",
      "blackpink",
      "taylor swift",
      "funny edit",
      "edit compilation",

      // 🎮 Gaming & Esports
      "gaming",
      "gameplay",
      "let's play",
      "playthrough",
      "walkthrough",
      "speedrun",
      "live stream",
      "livestream",
      "esports",
      "tournament",
      "match highlights",
      "fortnite",
      "minecraft",
      "roblox",
      "pubg",
      "valorant",
      "gta",
      "call of duty",
      "apex legends",
      "csgo",
      "fifa",
      "pokemon",
      "league of legends",
      "mlbb",
      "bgmi",

      // 😂 Comedy, Pranks & Challenges
      "prank",
      "challenge",
      "try not to laugh",
      "funny moments",
      "fails compilation",
      "comedy",
      "standup",
      "skit",
      "parody",
      "spoof",
      "roast",
      "trolling",
      "memes",
      "meme",
      "shorts compilation",
      "viral video",
      "trending video",

      // 🧍 Lifestyle & Beauty
      "haul",
      "makeup",
      "beauty",
      "skincare",
      "fashion",
      "ootd",
      "outfit",
      "style tips",
      "unboxing",
      "review",
      "shopping",
      "routine",
      "morning routine",
      "night routine",
      "room tour",
      "house tour",
      "setup tour",
      "workspace tour",
      "transformation",
      "glow up",
      "weight loss",
      "gym motivation",
      "fitness challenge",

      // 💰 Finance Clickbait
      "earn money",
      "make money fast",
      "side hustle",
      "crypto",
      "bitcoin",
      "nft",
      "dropshipping",
      "affiliate marketing",
      "millionaire mindset",
      "get rich quick",
      "trading strategy",
      "investment hack",

      // ⚡ Tech Reviews & Casual
      "unboxing",
      "first look",
      "hands-on",
      "camera test",
      "benchmark",
      "speed test",
      "comparison",
      "leak",
      "rumor",
      "specs",
      "tech news",
      "iphone",
      "samsung",
      "android",
      "smartwatch",
      "gadget review",
      "product review",
      "vs",
      "versus",

      // 🍔 Food & Casual Content
      "mukbang",
      "eating show",
      "food vlog",
      "street food",
      "restaurant review",
      "taste test",
      "snack review",
      "cook off",
      "baking vlog",
      "recipe hack",
      "dessert",
      "asmr",

      // 🎭 Drama, Gossip & Misc
      "drama",
      "gossip",
      "controversy",
      "beef",
      "exposed",
      "rant",
      "leak",
      "scandal",
      "influencer drama",
      "tiktok",
      "instagram",
      "shorts",
      "short video",
      "viral clip",
      "trend",

      // 🏋️‍♂️ Sports & Highlight Reels
      "boxing",
      "ufc",
      "mma",
      "fight highlights",
      "match highlights",
      "goals compilation",
      "cricket highlights",
      "football highlights",
      "nba highlights",
      "wwe",
      "race highlights",
      "sports news",
      "game highlights",
    ];

    // App/software tutorials (specific apps, not programming)
    this.appTutorialIndicators = [
      "blo app",
      "paytm",
      "phonepe",
      "gpay",
      "whatsapp trick",
      "instagram hack",
      "facebook trick",
      "tiktok hack",
      "mobile app",
      "android app",
      "ios app",
      "form filling",
      "online form",
      "registration form",
      "download link",
      "free download",
      "cracked version",
    ];

    // Clickbait patterns
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
      "scholar",
      "official",
      "lectures",
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
    this.stats = data.edutubeStats || this.stats;

    if (typeof YouTubeAPIService !== "undefined") {
      this.apiService = new YouTubeAPIService();
      await this.apiService.init();
    }

    console.log("[EduTube] Initialized:", {
      enabled: this.enabled,
      sensitivity: this.sensitivity,
      whitelist: this.whitelist.size,
      blacklist: this.blacklist.size,
    });
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
        'a[href*="youtube.com/watch"]',
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

        match = href.match(/\/embed\/([^/?#]+)/);
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
        'a[href*="/user/"]',
        "ytd-channel-name a",
        "#channel-name a",
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

        match = href.match(/\/user\/([^/?#]+)/);
        if (match) return `user/${match[1]}`;
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  extractVideoInfo(element) {
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

      return { title, description, channelName };
    } catch (e) {
      return { title: "", description: "", channelName: "" };
    }
  }

  // BALANCED scoring logic (tuned weights and stronger penalties)
  // Put this function in place of your existing scoreKeywords(videoInfo)
  scoreKeywords(videoInfo) {
    const DEBUG = true;

    const rawTitle = (videoInfo.title || "").trim();
    const rawDesc = (videoInfo.description || "").trim();
    const rawChannel = (videoInfo.channelName || "").trim();

    const title = rawTitle.toLowerCase();
    const description = rawDesc.toLowerCase();
    const channel = rawChannel.toLowerCase();

    const text = `${title} ${description} ${channel}`;

    // Helper for regex
    const wordRegex = (phrase) => {
      const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${esc}\\b`, "i");
    };

    // --- Immediate rejects (context-aware strong non-edu) ---
    for (const indicator of this.strongNonEduIndicators) {
      // only trigger if NOT clearly educational
      if (
        wordRegex(indicator).test(text) &&
        !/lecture|course|tutorial|chapter|lesson|class|network|math|computer/i.test(
          text
        )
      ) {
        if (DEBUG)
          console.debug(
            `[EduTube-BREAKDOWN] immediate non-edu match (context-checked): "${indicator}"`
          );
        return -300; // immediate strong reject
      }
    }

    // --- Scoring pools ---
    let score = 0;
    const breakdown = [];

    // 🔍 Boost known educational channels
    if (
      /physics\s*wallah|vedantu|unacademy|byjus|neetprep|examrace|gate\s*smashers|study\s*iq|adda247|tutorialspoint/i.test(
        channel
      )
    ) {
      score += 40;
      breakdown.push({ reason: "EduChannel +40", delta: 40 });
    }

    // Trusted channels list
    for (const p of this.eduChannelPatterns) {
      if (wordRegex(p).test(channel)) {
        score += 60;
        breakdown.push({ reason: `trusted-channel:${p}`, delta: 60 });
        break;
      }
    }

    // Strong educational indicators (20 each, cap 40)
    let strongMatches = 0;
    for (const kw of this.strongEduIndicators) {
      if (wordRegex(kw).test(text)) {
        strongMatches++;
        if (strongMatches <= 2) {
          score += 20;
          breakdown.push({ reason: `strongEdu:${kw}`, delta: 20 });
        }
      }
    }

    // Academic subjects (15 each, cap 30)
    let subjectMatches = 0;
    for (const kw of this.academicSubjects) {
      if (wordRegex(kw).test(text)) {
        subjectMatches++;
        if (subjectMatches <= 2) {
          score += 15;
          breakdown.push({ reason: `subject:${kw}`, delta: 15 });
        }
      }
    }

    // Educational keywords (8 each, cap 16)
    let eduKwMatches = 0;
    for (const kw of this.eduKeywords) {
      if (wordRegex(kw).test(text)) {
        eduKwMatches++;
        if (eduKwMatches <= 2) {
          score += 8;
          breakdown.push({ reason: `eduKw:${kw}`, delta: 8 });
        }
      }
    }

    // Structured/series bonuses
    if (
      /part\s*\d+|lesson\s*\d+|episode\s*\d+|chapter\s*\d+|lecture\s*\d+/i.test(
        text
      )
    ) {
      score += 10;
      breakdown.push({ reason: "structured_series", delta: 10 });
    }
    if (
      /series|playlist|complete course|full course|tutorial series/i.test(text)
    ) {
      score += 8;
      breakdown.push({ reason: "course_series", delta: 8 });
    }

    // 🔍 Boost exam-related educational topics
    if (
      /\b(jee|neet|gate|ssc|upsc|board\s+exam|study|revision|notes|mcq|previous\s+year|exam\s+strategy)\b/i.test(
        title + " " + description
      )
    ) {
      score += 25;
      breakdown.push({ reason: "ExamRelated +25", delta: 25 });
    }

    // --- Negative adjustments (penalties) ---
    for (const pattern of this.clickbaitPatterns) {
      if (wordRegex(pattern).test(title)) {
        score -= 20;
        breakdown.push({ reason: `clickbait:${pattern}`, delta: -20 });
      }
    }

    const softNonEdu = [
      "song",
      "music",
      "lyrics",
      "trailer",
      "movie",
      "film",
      "vlog",
      "prank",
      "challenge",
      "haul",
      "unboxing",
      "review",
      "reaction",
      "gaming",
      "gameplay",
      "pov",
      "travel",
      "apartment",
    ];
    for (const kw of softNonEdu) {
      if (wordRegex(kw).test(text)) {
        score -= 25;
        breakdown.push({ reason: `softNonEdu:${kw}`, delta: -25 });
      }
    }

    if (/!!+|\?\?+/.test(title)) {
      score -= 8;
      breakdown.push({ reason: "excessPunct", delta: -8 });
    }
    if (title === title.toUpperCase() && title.length > 10) {
      score -= 12;
      breakdown.push({ reason: "allCaps", delta: -12 });
    }

    // "How to" without context penalty
    if (
      /how to\b/i.test(text) &&
      strongMatches === 0 &&
      subjectMatches === 0 &&
      !this.eduChannelPatterns.some((p) => wordRegex(p).test(channel))
    ) {
      score -= 6;
      breakdown.push({ reason: "howto_no_context", delta: -6 });
    }

    score = Math.max(-400, Math.min(400, score));

    if (DEBUG) {
      console.groupCollapsed(
        `[EduTube-BREAKDOWN] "${rawTitle}" => score: ${score}`
      );
      console.table(breakdown);
      console.groupEnd();
    }

    return score;
  }

  // Main decision function (tuned thresholds only)
  async isEducational(element) {
    if (!this.enabled) return true;

    const channelId = this.extractChannelId(element);
    const videoId = this.extractVideoId(element);
    const videoInfo = this.extractVideoInfo(element);

    // 🧩 1. Whitelist check
    if (channelId && this.whitelist.has(channelId)) {
      this.stats.layerStats.whitelist++;
      console.debug("[EduTube] ✓ Whitelist:", videoInfo.title.substring(0, 50));
      return true;
    }

    // 🧩 2. Blacklist check
    if (channelId && this.blacklist.has(channelId)) {
      this.stats.layerStats.blacklist++;
      console.debug("[EduTube] ✗ Blacklist:", videoInfo.title.substring(0, 50));
      return false;
    }

    // 🧩 3. Keyword scoring
    const score = this.scoreKeywords(videoInfo);
    this.stats.layerStats.keywords++;

    // Adjusted thresholds:
    // - Very strong educational -> >= 50
    // - Strong non-educational -> <= 20
    if (score >= 50) {
      this.stats.layerStats.keywords++;
      console.debug(
        `[EduTube] ✓ Strong Educational (${score}):`,
        videoInfo.title.substring(0, 80)
      );
      return true;
    }

    if (score <= 20) {
      this.stats.layerStats.keywords++;
      console.debug(
        `[EduTube] ✗ Strong Non-Educational (${score}):`,
        videoInfo.title.substring(0, 80)
      );
      return false;
    }

    // 🧩 4. YouTube API fallback (only if uncertain)
    // keep existing behavior but clearer: only when api enabled and uncertain
    // 🧠 Layer 4: YouTube API for uncertain or weakly scored videos
    // 🧠 Use YouTube API for uncertain or weakly scored videos (-50 ≤ score < 60)
    if (videoId && this.apiService?.enabled && score < 60 && score >= -50) {
      try {
        const apiData = await this.apiService.fetchVideoDetails(videoId);
        if (apiData && apiData.categoryId) {
          const cat = apiData.categoryId;
          const categoryDecision = this.apiService.isEducationalCategory(cat);

          if (categoryDecision === true) {
            this.stats.layerStats.api++;
            console.debug(
              `[EduTube] ✓ API Educational (cat ${cat}, score ${score})`,
              videoInfo.title.substring(0, 80)
            );
            return true;
          } else if (categoryDecision === false) {
            this.stats.layerStats.api++;
            console.debug(
              `[EduTube] ✗ API Non-Educational (cat ${cat}, score ${score})`,
              videoInfo.title.substring(0, 80)
            );
            return false;
          } else {
            // 🧩 Cross-check for ambiguous categories (fallback logic)
            if (["1", "10", "17", "20", "22", "23", "24"].includes(cat)) {
              console.debug(
                `[EduTube] ✗ Cross-check (entertainment cat ${cat}) — override`,
                videoInfo.title.substring(0, 80)
              );
              return false;
            }
            // Accept HowTo (26) only if it really looks like a tutorial
            if (
              ["27", "28", "35"].includes(cat) ||
              (cat === "26" &&
                /how\s+to|tutorial|guide|install|setup|build|create|learn/i.test(
                  videoInfo.title + " " + videoInfo.description
                ))
            ) {
              console.debug(
                `[EduTube] ✓ Cross-check (educational cat ${cat}) — override`,
                videoInfo.title.substring(0, 80)
              );
              return true;
            }
          }
        }
      } catch (e) {
        console.debug("[EduTube] API call failed:", e.message);
      }
    }

    // 🧩 5. Final fallback — adapt to sensitivity mapping
    // Map user sensitivity to an effective threshold
    // Keep user-configured numeric sensitivity but interpret sensibly:
    // 0-35 => relaxed (~30), 36-65 => balanced (~50), 66-100 => strict (~70)
    // 🧩 Adaptive fallback sensitivity tuning
    let effectiveThreshold = this.sensitivity || 50;

    // Gradual mapping: if user slider is numeric (0–100)
    if (this.sensitivity <= 35)
      effectiveThreshold = 40; // Relaxed → more forgiving
    else if (this.sensitivity <= 65) effectiveThreshold = 50; // Balanced
    else effectiveThreshold = 60; // Strict but not extreme (was 70)

    // If API not enabled and score is borderline, lower threshold slightly
    if (
      !this.apiService?.enabled &&
      effectiveThreshold > 40 &&
      score >= effectiveThreshold - 10
    ) {
      console.debug(
        "[EduTube] ⚙️ Adjusted fallback threshold (API off, borderline case)"
      );
      effectiveThreshold -= 5;
    }

    const decision = score >= effectiveThreshold;
    this.stats.layerStats.fallback++;

    console.debug(
      `[EduTube] ${
        decision ? "✓" : "✗"
      } Fallback (${score} vs ${effectiveThreshold}):`,
      videoInfo.title.substring(0, 80)
    );

    return decision;
  }

  async addToWhitelist(channelId) {
    if (!channelId) return;
    this.whitelist.add(channelId);
    this.blacklist.delete(channelId);
    await this.saveSettings();
    console.log("[EduTube] Added to whitelist:", channelId);
  }

  async addToBlacklist(channelId) {
    if (!channelId) return;
    this.blacklist.add(channelId);
    this.whitelist.delete(channelId);
    await this.saveSettings();
    console.log("[EduTube] Added to blacklist:", channelId);
  }

  async toggle(enabled) {
    this.enabled = enabled;
    await this.saveSettings();
    console.log("[EduTube] Mode:", enabled ? "ON" : "OFF");
  }

  async setSensitivity(level) {
    this.sensitivity = level;
    await this.saveSettings();
    console.log("[EduTube] Sensitivity:", level);
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
