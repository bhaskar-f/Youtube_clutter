// ======================================================
// EduTube Engine v7 – DEV MODE
// - High-accuracy scoring from your old balanced engine
// - Adds type classification (academic / technical / hobby / entertainment)
// - Sensitivity-aware (relaxed / balanced / strict)
// - Full console logging for debugging (DEV_MODE = true)
// ======================================================

const DEV_MODE = true; // 👈 change to false for production: no logs

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

    // last score info for this video (for debug / decisions)
    this._lastScoreMeta = null;

    // --------------------------------------------------
    // Strong EDU indicators (institutions, formats, etc.)
    // --------------------------------------------------
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
      // Certifications / exams
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

    // --------------------------------------------------
    // General education keywords
    // --------------------------------------------------
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

    // --------------------------------------------------
    // Academic subjects (STEM + humanities + skills)
    // --------------------------------------------------
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
      // Music
      "song",
      "lo-fi",
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

      // Entertainment & Pop Culture
      "studios",
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
      "marvel",
      "avengers",
      "mcu",
      "dc",
      "dceu",
      "superhero",
      "idol",
      "mv",
      "concert",
      "dance cover",
      "fan cam",
      "kpop",
      "bts",
      "blackpink",
      "taylor swift",
      "funny edit",
      "edit compilation",

      // Gaming & Esports
      "gaming",
      "gameplay",
      "let's play",
      "playthrough",
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

      // Comedy, Pranks & Challenges
      "vines",
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

      // Lifestyle & Beauty
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

      // Finance Clickbait
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

      // Tech Reviews & Casual
      "first look",
      "hands-on",
      "camera test",
      "benchmark",
      "speed test",
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

      // Food & Casual Content
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

      // Drama, Gossip & Misc
      "drama",
      "gossip",
      "controversy",
      "beef",
      "exposed",
      "rant",
      "scandal",
      "influencer drama",
      "tiktok",
      "instagram",
      "shorts",
      "short video",
      "viral clip",
      "trend",

      // Sports & Highlights
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

      // Popular TV series
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

  // ------------------------------------------------------
  // Init / storage
  // ------------------------------------------------------
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

    if (DEV_MODE) {
      console.log("[EduTube] Engine initialized (v7 DEV):", {
        enabled: this.enabled,
        sensitivity: this.sensitivity,
        whitelist: this.whitelist.size,
        blacklist: this.blacklist.size,
      });
    }
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
            if (DEV_MODE) {
              console.error(
                "[EduTube] Storage error:",
                chrome.runtime.lastError.message
              );
            }
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
      if (DEV_MODE) {
        console.error("[EduTube] Save settings error:", e);
      }
    }
  }

  // ------------------------------------------------------
  // Extractors
  // ------------------------------------------------------
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
    } catch {
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
    } catch {
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
    } catch {
      return { title: "", description: "", channelName: "" };
    }
  }

  // ------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------
  _wordRegex(phrase) {
    const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${esc}\\b`, "i");
  }

  _getModeFromSensitivity() {
    const s = this.sensitivity ?? 50;
    if (s <= 35) return "relaxed";
    if (s <= 65) return "balanced";
    return "strict";
  }

  // ------------------------------------------------------
  // Core scoring – returns score, sets this._lastScoreMeta
  // ------------------------------------------------------
  scoreKeywords(videoInfo) {
    const rawTitle = (videoInfo.title || "").trim();
    const rawDesc = (videoInfo.description || "").trim();
    const rawChannel = (videoInfo.channelName || "").trim();

    const title = rawTitle.toLowerCase();
    const description = rawDesc.toLowerCase();
    const channel = rawChannel.toLowerCase();
    const text = `${title} ${description} ${channel}`;

    const wordRegex = this._wordRegex.bind(this);

    let score = 0;
    const breakdown = [];
    let type = "unknown";

    // 0) strong non-edu immediate reject (with edu context safety)
    const eduContextRegex =
      /lecture|lec\b|course|tutorial|chapter|lesson|class|notes|mcq|gate\b|jee\b|neet\b|exam|computer|network|cn\b|operating\s*system|os\b|dbms\b|sql\b|normal\s*form|paging|memory\s*management|algorithm|data\s*structure|dsa\b/i;

    for (const indicator of this.strongNonEduIndicators) {
      if (!wordRegex(indicator).test(text)) continue;

      const hasEduContext = eduContextRegex.test(text);
      if (
        hasEduContext &&
        (indicator === "vs" ||
          indicator === "season" ||
          indicator === "episode")
      ) {
        continue;
      }

      if (!hasEduContext) {
        // immediate entertainment reject
        breakdown.push({
          reason: `strongNonEdu:${indicator}`,
          delta: -300,
        });
        if (DEV_MODE) {
          console.log(`[EduTube DEBUG] STRONG_NON_ACADEMIC_BLOCK`, {
            indicator,
            title: rawTitle,
          });
        }
        this._lastScoreMeta = {
          score: -300,
          type: "entertainment",
          breakdown,
        };
        return -300;
      }
    }

    // 1) educational channels
    if (
      /physics\s*wallah|vedantu|unacademy|byjus|neetprep|examrace|gate\s*smashers|study\s*iq|adda247|tutorialspoint/i.test(
        channel
      )
    ) {
      score += 40;
      breakdown.push({ reason: "EduChannel +40", delta: 40 });
      type = "academic";
    }

    for (const p of this.eduChannelPatterns) {
      if (wordRegex(p).test(channel)) {
        score += 60;
        breakdown.push({ reason: `trusted-channel:${p}`, delta: 60 });
        type = "academic";
        break;
      }
    }

    // 2) strong EDU indicators
    let strongMatches = 0;
    for (const kw of this.strongEduIndicators) {
      if (wordRegex(kw).test(text)) {
        strongMatches++;
        if (strongMatches <= 2) {
          score += 20;
          breakdown.push({ reason: `strongEdu:${kw}`, delta: 20 });
        }
        type = "academic";
      }
    }

    // 3) academic subjects
    let subjectMatches = 0;
    let hasAcademicSubject = false;
    for (const kw of this.academicSubjects) {
      if (wordRegex(kw).test(text)) {
        subjectMatches++;
        hasAcademicSubject = true;
        if (subjectMatches <= 2) {
          score += 15;
          breakdown.push({ reason: `subject:${kw}`, delta: 15 });
        }
        if (type === "unknown") type = "academic";
      }
    }

    // 4) general educational keywords
    let eduKwMatches = 0;
    let hasEduKeyword = false;
    for (const kw of this.eduKeywords) {
      if (wordRegex(kw).test(text)) {
        eduKwMatches++;
        hasEduKeyword = true;
        if (eduKwMatches <= 2) {
          score += 8;
          breakdown.push({ reason: `eduKw:${kw}`, delta: 8 });
        }
      }
    }

    // 5) exam-related boost
    if (
      /\b(jee|neet|gate|ssc|upsc|board\s+exam|study|revision|notes|mcq|previous\s+year|exam\s+strategy)\b/i.test(
        text
      )
    ) {
      score += 25;
      breakdown.push({ reason: "ExamRelated +25", delta: 25 });
      if (type === "unknown") type = "academic";
    }

    // 6) targeted CS/OS/CN topics
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

    // "lec-76"
    if (/\blec\s*[-_.]??\s*\d+/i.test(title) || /\blec\b/i.test(title)) {
      score += 12;
      breakdown.push({ reason: "abbr_lecture_lec", delta: 12 });
      if (type === "unknown") type = "academic";
    }

    if (/\b(one\s+shot|in\s+one\s+shot)\b/i.test(title)) {
      score += 8;
      breakdown.push({ reason: "one_shot_course", delta: 8 });
      if (type === "unknown") type = "academic";
    }

    if (/\bhow\s+\w+\s+works?\b/i.test(title)) {
      score += 10;
      breakdown.push({ reason: "how_it_works", delta: 10 });
      if (type === "unknown") type = "technical";
    }

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

    // 7) negative adjustments
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
    let hasSoftNonEdu = false;
    for (const kw of softNonEdu) {
      if (wordRegex(kw).test(text)) {
        score -= 25;
        breakdown.push({ reason: `softNonEdu:${kw}`, delta: -25 });
        hasSoftNonEdu = true;
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

    // "how to" but no educational context
    if (
      /how to\b/i.test(text) &&
      strongMatches === 0 &&
      subjectMatches === 0 &&
      !this.eduChannelPatterns.some((p) => wordRegex(p).test(channel))
    ) {
      score -= 6;
      breakdown.push({ reason: "howto_no_context", delta: -6 });
    }

    // 8) final type decision
    if (hasSoftNonEdu && score <= -40) {
      type = "entertainment";
    } else if (hasAcademicSubject || strongMatches > 0) {
      if (type === "unknown") type = "academic";
    } else if (hasEduKeyword) {
      const hobbyHints = ["cooking", "recipe", "guitar", "piano", "drawing"];
      if (hobbyHints.some((h) => text.includes(h))) {
        if (type === "unknown") type = "hobby";
      } else {
        if (type === "unknown") type = "technical";
      }
    }

    // clamp
    score = Math.max(-400, Math.min(400, score));

    if (DEV_MODE) {
      console.groupCollapsed(
        `[EduTube-BREAKDOWN] "${rawTitle}" => score=${score}, type=${type}`
      );
      console.table(breakdown);
      console.groupEnd();
    }

    this._lastScoreMeta = { score, type, breakdown };
    return score;
  }

  // ------------------------------------------------------
  // Main decision
  // ------------------------------------------------------
  async isEducational(element) {
    if (!this.enabled) return true;

    const channelId = this.extractChannelId(element);
    const videoId = this.extractVideoId(element);
    const videoInfo = this.extractVideoInfo(element);
    const mode = this._getModeFromSensitivity();

    if (DEV_MODE) {
      console.log("[EduTube Debug] CHECK_START", {
        videoId,
        channelId,
        title: videoInfo.title,
        sensitivity: this.sensitivity,
        mode,
      });
    }

    // 1) whitelist
    if (channelId && this.whitelist.has(channelId)) {
      this.stats.layerStats.whitelist++;
      if (DEV_MODE) {
        console.log(
          "[EduTube Debug] WHITELIST_HIT",
          videoInfo.title.substring(0, 80)
        );
      }
      return true;
    }

    // 2) blacklist
    if (channelId && this.blacklist.has(channelId)) {
      this.stats.layerStats.blacklist++;
      if (DEV_MODE) {
        console.log(
          "[EduTube Debug] BLACKLIST_HIT",
          videoInfo.title.substring(0, 80)
        );
      }
      return false;
    }

    // 3) keyword scoring
    const score = this.scoreKeywords(videoInfo);
    const meta = this._lastScoreMeta || {
      score,
      type: "unknown",
      breakdown: [],
    };
    this.stats.layerStats.keywords++;

    if (DEV_MODE) {
      console.log("[EduTube Debug] SCORE_RESULT", {
        title: videoInfo.title,
        score,
        type: meta.type,
        mode,
      });
    }

    // hard entertainment block
    if (meta.type === "entertainment" && score <= -60) {
      if (DEV_MODE) {
        console.log("[EduTube Debug] SCORE_BLOCK_STRONG", {
          videoId,
          title: videoInfo.title,
          score,
          finalType: "entertainment",
        });
      }
      return false;
    }

    // strong educational shortcut
    const sens = this.sensitivity ?? 50;
    let strongEduCutoff = 50;
    if (sens <= 35) strongEduCutoff = 40;
    else if (sens >= 66) strongEduCutoff = 60;

    if (
      (meta.type === "academic" || meta.type === "technical") &&
      score >= strongEduCutoff
    ) {
      if (DEV_MODE) {
        console.log("[EduTube Debug] SCORE_ALLOW_STRONG", {
          videoId,
          title: videoInfo.title,
          score,
          finalType: meta.type,
        });
      }
      return true;
    }

    // mode-based coarse filtering
    if (mode === "strict") {
      if (meta.type !== "academic") {
        if (DEV_MODE) {
          console.log("[EduTube Debug] STRICT_NON_ACADEMIC_BLOCK", {
            videoId,
            title: videoInfo.title,
            score,
            finalType: meta.type,
          });
        }
        return false;
      }
    } else if (mode === "balanced") {
      if (meta.type === "hobby" || meta.type === "entertainment") {
        if (DEV_MODE) {
          console.log("[EduTube Debug] BALANCED_NON_CORE_BLOCK", {
            videoId,
            title: videoInfo.title,
            score,
            finalType: meta.type,
          });
        }
        return false;
      }
    } else if (mode === "relaxed") {
      if (meta.type === "entertainment") {
        if (DEV_MODE) {
          console.log("[EduTube Debug] RELAXED_ENTERTAINMENT_BLOCK", {
            videoId,
            title: videoInfo.title,
            score,
            finalType: meta.type,
          });
        }
        return false;
      }
    }

    // 4) API fallback for borderline scores (optional key)
    if (
      videoId &&
      this.apiService?.enabled &&
      score < strongEduCutoff &&
      score > -50
    ) {
      try {
        const apiData = await this.apiService.fetchVideoDetails(videoId);
        if (apiData && apiData.categoryId) {
          const cat = apiData.categoryId;
          const decision = this.apiService.isEducationalCategory(cat);

          if (decision === true) {
            this.stats.layerStats.api++;
            if (DEV_MODE) {
              console.log("[EduTube Debug] API_EDU_OK", {
                videoId,
                title: videoInfo.title,
                score,
                category: cat,
              });
            }
            return true;
          } else if (decision === false) {
            this.stats.layerStats.api++;
            if (DEV_MODE) {
              console.log("[EduTube Debug] API_NON_EDU_BLOCK", {
                videoId,
                title: videoInfo.title,
                score,
                category: cat,
              });
            }
            return false;
          } else {
            // ambiguous categories
            if (["1", "10", "17", "20", "22", "23", "24"].includes(cat)) {
              if (DEV_MODE) {
                console.log("[EduTube Debug] API_AMBIG_ENT_CAT_BLOCK", {
                  videoId,
                  title: videoInfo.title,
                  score,
                  category: cat,
                });
              }
              return false;
            }
            if (
              ["27", "28", "35"].includes(cat) ||
              (cat === "26" &&
                /how\s+to|tutorial|guide|install|setup|build|create|learn/i.test(
                  videoInfo.title + " " + videoInfo.description
                ))
            ) {
              if (DEV_MODE) {
                console.log("[EduTube Debug] API_AMBIG_EDU_CAT_ALLOW", {
                  videoId,
                  title: videoInfo.title,
                  score,
                  category: cat,
                });
              }
              return true;
            }
          }
        }
      } catch (e) {
        if (DEV_MODE) {
          console.log("[EduTube Debug] API_ERROR", e?.message || e);
        }
      }
    }

    // 5) final fallback threshold from sensitivity
    let effectiveThreshold;
    const s = this.sensitivity ?? 50;
    if (s <= 35) {
      const t = Math.max(10, s);
      effectiveThreshold = Math.round(Math.min(35, 20 + (t - 10) * (15 / 25)));
    } else if (s <= 65) {
      effectiveThreshold = Math.round(45 + (s - 36) * (10 / 29));
    } else {
      effectiveThreshold = Math.round(65 + (s - 66) * (20 / 34));
    }

    // little forgiveness in relaxed mode without API
    if (
      !this.apiService?.enabled &&
      mode === "relaxed" &&
      score >= effectiveThreshold - 5 &&
      score < effectiveThreshold
    ) {
      if (DEV_MODE) {
        console.log("[EduTube Debug] RELAXED_BORDERLINE_ADJUST", {
          oldThreshold: effectiveThreshold,
          newThreshold: effectiveThreshold - 5,
        });
      }
      effectiveThreshold -= 5;
    }

    const decision = score >= effectiveThreshold;
    this.stats.layerStats.fallback++;

    if (DEV_MODE) {
      console.log("[EduTube Debug] FINAL_DECISION", {
        decision: decision ? "SHOW" : "HIDE",
        score,
        threshold: effectiveThreshold,
        mode,
        type: meta.type,
        title: videoInfo.title,
      });
    }

    return decision;
  }

  // ------------------------------------------------------
  // Public helpers
  // ------------------------------------------------------
  async addToWhitelist(channelId) {
    if (!channelId) return;
    this.whitelist.add(channelId);
    this.blacklist.delete(channelId);
    await this.saveSettings();
    if (DEV_MODE) {
      console.log("[EduTube] Added to whitelist:", channelId);
    }
  }

  async addToBlacklist(channelId) {
    if (!channelId) return;
    this.blacklist.add(channelId);
    this.whitelist.delete(channelId);
    await this.saveSettings();
    if (DEV_MODE) {
      console.log("[EduTube] Added to blacklist:", channelId);
    }
  }

  async toggle(enabled) {
    this.enabled = enabled;
    await this.saveSettings();
    if (DEV_MODE) {
      console.log("[EduTube] Mode:", enabled ? "ON" : "OFF");
    }
  }

  async setSensitivity(level) {
    this.sensitivity = level;
    await this.saveSettings();
    if (DEV_MODE) {
      console.log("[EduTube] Sensitivity:", level);
    }
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
