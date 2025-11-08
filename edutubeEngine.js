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
    this.whitelistVideos = new Set();
    this.blacklistVideos = new Set();
    this.whitelistKeywords = new Set();
    this.blacklistKeywords = new Set();

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
      "clip",
      "clips",
      "scene",
      "scenes",
      "compilation",
      "behind the scenes",
      "celebrity",
      "hollywood",
      "bollywood",
      "tollywood",
      // Pop-culture franchises (non-educational explainers)
      "marvel",
      "avengers",
      "mcu",
      "dc",
      "dceu",
      "superhero",
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
      // Specific TV series/franchises commonly non-educational
      "young sheldon",
      "friends",
      "the office",
      "modern family",
      "suits",
      "seinfeld",
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
    this.whitelistVideos = new Set(data.edutubeWhitelistVideos || []);
    this.blacklistVideos = new Set(data.edutubeBlacklistVideos || []);
    this.whitelistKeywords = data.edutubeWhitelistKeywords || [];
    this.blacklistKeywords = data.edutubeBlacklistKeywords || [];
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
      whitelistVideos: this.whitelistVideos.size,
      blacklistVideos: this.blacklistVideos.size,
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
          "edutubeWhitelistVideos",
          "edutubeBlacklistVideos",
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
        // Core EduTube configuration
        edutubeEnabled: this.enabled,
        edutubeSensitivity: this.sensitivity,

        // Channel/video allow/block lists
        edutubeWhitelist: Array.from(this.whitelist),
        edutubeBlacklist: Array.from(this.blacklist),
        edutubeWhitelistVideos: Array.from(this.whitelistVideos),
        edutubeBlacklistVideos: Array.from(this.blacklistVideos),

        // 🆕 Keyword-based filters (user-friendly)
        edutubeWhitelistKeywords: Array.from(this.whitelistKeywords || []),
        edutubeBlacklistKeywords: Array.from(this.blacklistKeywords || []),

        // Stats
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
      if (!wordRegex(indicator).test(text)) continue;

      // Broader educational context detection
      const eduContextRegex =
        /lecture|lec\b|course|tutorial|chapter|lesson|class|notes|mcq|gate\b|jee\b|neet\b|exam|computer|network|cn\b|operating\s*system|os\b|dbms\b|pl[-\s]*sql|sql\b|normal\s*form|paging|memory\s*management|algorithm|data\s*structure/i;
      const hasEduContext = eduContextRegex.test(text);

      // Loosen some indicators when educational context is present
      if (
        (indicator === "vs" ||
          indicator === "season" ||
          indicator === "episode") &&
        hasEduContext
      ) {
        continue; // don't immediate-reject educational comparisons or lecture series
      }

      // Default: only immediate-reject if no educational context
      if (!hasEduContext) {
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

    // Targeted boosts for lectures/courses
    if (
      /(?:lecture|lec|class|course|module|session)[\s\d#:-]*([\d]+)/i.test(text)
    ) {
      score += 12;
      breakdown.push({ reason: "abbr_lecture_lec", delta: 12 });
    }
    if (/\b(one\s+shot|in\s+one\s+shot)\b/i.test(title)) {
      score += 8;
      breakdown.push({ reason: "one_shot_course", delta: 8 });
    }
    if (/\bdbms\b/i.test(text)) {
      score += 12;
      breakdown.push({ reason: "subject_dbms", delta: 12 });
    }
    if (/\boperating\s+system\b/i.test(text)) {
      score += 10;
      breakdown.push({ reason: "subject_os", delta: 10 });
    }
    if (/\b(1nf|2nf|3nf|normal\s+form)\b/i.test(text)) {
      score += 10;
      breakdown.push({ reason: "topic_normal_forms", delta: 10 });
    }
    if (
      /\b(memory\s+management|paging|segmentation|scheduling|synchronization)\b/i.test(
        text
      )
    ) {
      score += 10;
      breakdown.push({ reason: "os_core_topics", delta: 10 });
    }
    if (
      /\b(computer\s+network|osi\s*model|arq\b|tcp\/?ip|routing|subnet|nat)\b/i.test(
        text
      )
    ) {
      score += 10;
      breakdown.push({ reason: "cn_topics", delta: 10 });
    }
    if (/\bhow\s+\w+\s+works?\b/i.test(title)) {
      score += 10;
      breakdown.push({ reason: "how_it_works", delta: 10 });
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

    // Boost for fitness content that explains science/form
    if (
      /(?:fitness|exercise|workout|gym|build|muscle|fat loss|training)/i.test(
        text
      ) &&
      /(?:science|form|technique|mistakes|how to|guide|tutorial)/i.test(text)
    ) {
      score += 15;
      breakdown.push({ reason: "edu_fitness", delta: 15 });
    }

    // Boost for educational comparisons
    if (
      /(?:vs|versus|comparison|difference)/i.test(text) &&
      /(?:explained|analysis|showdown|which is better)/i.test(text)
    ) {
      score += 12;
      breakdown.push({ reason: "edu_comparison", delta: 12 });
    }

    // Boost for exam-related educational topics
    const examPattern =
      /\b(jee|neet|upsc|gate|ias|ssc|ibps|cat|xat|gre|gmat|sat|ielts|toefl|prelims|mains|advanced|foundation|olympiad|ntse|kvpy|board exam|exam prep|exam strategy|study plan|revision|mock test|sample paper|previous year questions)\b/i;
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
      "challenge",
      "haul",
      "gaming",
      "gameplay",
      "series",
      "review",
      "trailer",
      "teaser",
      "vlog",
      "reaction",
      "unboxing",
    ];

    // Low-value, often clickbait
    for (const kw of softNonEdu) {
      if (wordRegex(kw).test(text)) {
        score -= 35; // Increased penalty
        breakdown.push({ reason: `softNonEdu:${kw}`, delta: -35 });
      }
    }

    if (/!!+|\?\?+/.test(title)) {
      score -= 15; // Increased penalty
      breakdown.push({ reason: "excessPunct", delta: -15 });
    }
    if (title === title.toUpperCase() && title.length > 10) {
      score -= 20; // Increased penalty
      breakdown.push({ reason: "allCaps", delta: -20 });
    }

    // Penalize misleading "educational" clickbait
    if (
      /(\d+\s+)?(secrets|hacks|tricks|myths|facts)/i.test(title) &&
      score < 40
    ) {
      score -= 25;
      breakdown.push({ reason: "edu_clickbait", delta: -25 });
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

    // 🧩 0. Video-level blacklist/whitelist (blacklist priority)
    if (videoId && this.blacklistVideos.has(videoId)) {
      this.stats.layerStats.blacklist++;
      console.debug(
        "[EduTube] ✗ Video Blacklist:",
        videoInfo.title.substring(0, 50)
      );
      return false;
    }
    if (videoId && this.whitelistVideos.has(videoId)) {
      this.stats.layerStats.whitelist++;
      console.debug(
        "[EduTube] ✓ Video Whitelist:",
        videoInfo.title.substring(0, 50)
      );
      return true;
    }

    // 🧩 1. Channel blacklist (priority)
    if (channelId && this.blacklist.has(channelId)) {
      this.stats.layerStats.blacklist++;
      console.debug("[EduTube] ✗ Blacklist:", videoInfo.title.substring(0, 50));
      return false;
    }
    // 🧩 2. Channel whitelist
    if (channelId && this.whitelist.has(channelId)) {
      this.stats.layerStats.whitelist++;
      console.debug("[EduTube] ✓ Whitelist:", videoInfo.title.substring(0, 50));
      return true;
    }

    // 🧩 3. Keyword scoring
    const score = this.scoreKeywords(videoInfo);
    this.stats.layerStats.keywords++;

    // Sensitivity-aware early thresholds
    const sens = this.sensitivity ?? 50;
    let strongEduCutoff = 60; // Stricter default
    let strongNonEduCutoff = -10; // Stricter default
    if (sens <= 35) {
      // Relaxed: easier to pass, require worse score to hard-fail
      strongEduCutoff = 50;
      strongNonEduCutoff = -30;
    } else if (sens >= 66) {
      // Strict: harder to pass, easier to hard-fail
      strongEduCutoff = 70;
      strongNonEduCutoff = 0;
    }

    // Adjusted thresholds (sensitivity-aware):
    if (score >= strongEduCutoff) {
      this.stats.layerStats.keywords++;
      console.debug(
        `[EduTube] ✓ Strong Educational (${score}):`,
        videoInfo.title.substring(0, 80)
      );
      return true;
    }

    if (score <= strongNonEduCutoff) {
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
    // 🧠 Use YouTube API for uncertain or weakly scored videos, band depends on sensitivity
    let apiUpper = 60;
    let apiLower = -50;
    if (sens <= 35) {
      // Relaxed: widen API band to rescue borderline content
      apiUpper = 70;
      apiLower = -80;
    } else if (sens >= 66) {
      // Strict: narrow band to avoid rescuing marginal items
      apiUpper = 50;
      apiLower = -30;
    }
    if (
      videoId &&
      this.apiService?.enabled &&
      score < apiUpper &&
      score >= apiLower
    ) {
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
    // Map user sensitivity to documented thresholds:
    // Relaxed = 30, Balanced = 50, Strict = 80
    let effectiveThreshold = this.sensitivity || 50;

    // Map numeric slider (0–100) into three bands with slight intra-band scaling
    if (this.sensitivity <= 35) {
      // 10–35 maps to 20–35
      const t = Math.max(10, this.sensitivity);
      effectiveThreshold = Math.round(Math.min(35, 20 + (t - 10) * (15 / 25)));
    } else if (this.sensitivity <= 65) {
      // 36–65 maps to 45–55
      effectiveThreshold = Math.round(45 + (this.sensitivity - 36) * (10 / 29));
    } else {
      // 66–100 maps to 65–85
      effectiveThreshold = Math.round(65 + (this.sensitivity - 66) * (20 / 34));
    }

    // If API not enabled and score is just below threshold, be slightly forgiving only for Relaxed
    if (
      !this.apiService?.enabled &&
      effectiveThreshold === 30 &&
      score >= 25 &&
      score < 30
    ) {
      console.debug(
        "[EduTube] ⚙️ Adjusted fallback (Relaxed, API off, borderline)"
      );
      effectiveThreshold = 25;
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

  async removeFromWhitelist(channelId) {
    if (!channelId) return;
    this.whitelist.delete(channelId);
    await this.saveSettings();
    console.log("[EduTube] Removed from whitelist:", channelId);
  }

  async removeFromBlacklist(channelId) {
    if (!channelId) return;
    this.blacklist.delete(channelId);
    await this.saveSettings();
    console.log("[EduTube] Removed from blacklist:", channelId);
  }

  async addVideoToWhitelist(videoId) {
    if (!videoId) return;
    this.whitelistVideos.add(videoId);
    this.blacklistVideos.delete(videoId);
    await this.saveSettings();
    console.log("[EduTube] Added VIDEO to whitelist:", videoId);
  }

  async addVideoToBlacklist(videoId) {
    if (!videoId) return;
    this.blacklistVideos.add(videoId);
    this.whitelistVideos.delete(videoId);
    await this.saveSettings();
    console.log("[EduTube] Added VIDEO to blacklist:", videoId);
  }

  async removeVideoFromWhitelist(videoId) {
    if (!videoId) return;
    this.whitelistVideos.delete(videoId);
    await this.saveSettings();
    console.log("[EduTube] Removed VIDEO from whitelist:", videoId);
  }

  async removeVideoFromBlacklist(videoId) {
    if (!videoId) return;
    this.blacklistVideos.delete(videoId);
    await this.saveSettings();
    console.log("[EduTube] Removed VIDEO from blacklist:", videoId);
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
