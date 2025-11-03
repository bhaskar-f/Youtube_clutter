// ======================================================
// YouTube API Service - Category-based filtering
// ======================================================

class YouTubeAPIService {
  constructor() {
    this.apiKey = "";
    this.quotaUsed = 0;
    this.quotaLimit = 10000; // Daily limit
    this.quotaResetTime = null;
    this.cache = null; // IndexedDB cache
    this.enabled = false;

    // Educational category IDs
    this.eduCategories = new Set([
      "27", // Education
      "28", // Science & Technology
      "26", // Howto & Style (partially educational)
    ]);

    // Non-educational category IDs
    this.nonEduCategories = new Set([
      "20", // Gaming
      "24", // Entertainment
      "23", // Comedy
      "10", // Music
      "17", // Sports
      "25", // News & Politics (can be filtered)
      "22", // People & Blogs
    ]);

    this.init();
  }

  async init() {
    // Load API key and settings
    const data = await this.loadSettings();
    this.apiKey = data.youtubeApiKey || "";
    this.enabled = data.youtubeApiEnabled ?? false;
    this.quotaUsed = data.youtubeQuotaUsed || 0;
    this.quotaResetTime = data.youtubeQuotaResetTime || this.getNextResetTime();

    // Check if quota needs reset (daily)
    if (Date.now() > this.quotaResetTime) {
      this.quotaUsed = 0;
      this.quotaResetTime = this.getNextResetTime();
      await this.saveSettings();
    }

    // Initialize IndexedDB cache
    await this.initCache();

    console.log("[YouTube API] Initialized:", {
      enabled: this.enabled,
      hasKey: !!this.apiKey,
      quotaUsed: this.quotaUsed,
      quotaRemaining: this.quotaLimit - this.quotaUsed,
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
          "youtubeApiKey",
          "youtubeApiEnabled",
          "youtubeQuotaUsed",
          "youtubeQuotaResetTime",
        ],
        resolve
      );
    });
  }

  async saveSettings() {
    if (!chrome?.storage?.sync) return;

    await chrome.storage.sync.set({
      youtubeApiKey: this.apiKey,
      youtubeApiEnabled: this.enabled,
      youtubeQuotaUsed: this.quotaUsed,
      youtubeQuotaResetTime: this.quotaResetTime,
    });
  }

  getNextResetTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Midnight
    return tomorrow.getTime();
  }

  // Initialize IndexedDB for caching
  async initCache() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("EduTubeCache", 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.cache = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains("videos")) {
          const videoStore = db.createObjectStore("videos", { keyPath: "id" });
          videoStore.createIndex("timestamp", "timestamp", { unique: false });
          videoStore.createIndex("categoryId", "categoryId", { unique: false });
        }

        if (!db.objectStoreNames.contains("channels")) {
          const channelStore = db.createObjectStore("channels", {
            keyPath: "id",
          });
          channelStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  // Get video data from cache
  async getCachedVideo(videoId) {
    if (!this.cache) return null;

    return new Promise((resolve) => {
      try {
        const transaction = this.cache.transaction(["videos"], "readonly");
        const store = transaction.objectStore("videos");
        const request = store.get(videoId);

        request.onsuccess = () => {
          const data = request.result;

          // Cache expires after 7 days
          if (data && Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
            resolve(data);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Cache video data
  async cacheVideo(videoId, data) {
    if (!this.cache) return;

    return new Promise((resolve) => {
      try {
        const transaction = this.cache.transaction(["videos"], "readwrite");
        const store = transaction.objectStore("videos");

        store.put({
          id: videoId,
          categoryId: data.categoryId,
          title: data.title,
          channelId: data.channelId,
          timestamp: Date.now(),
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  // Check if API quota is available
  hasQuotaAvailable(units = 3) {
    return (
      this.enabled && this.apiKey && this.quotaUsed + units <= this.quotaLimit
    );
  }

  // Fetch video details from YouTube API
  async fetchVideoDetails(videoId) {
    if (!this.hasQuotaAvailable(3)) {
      console.debug("[YouTube API] Quota exceeded or disabled");
      return null;
    }

    // Check cache first
    const cached = await this.getCachedVideo(videoId);
    if (cached) {
      console.debug("[YouTube API] Using cached data for:", videoId);
      return cached;
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn("[YouTube API] Request failed:", response.status);
        return null;
      }

      const data = await response.json();

      // Update quota
      this.quotaUsed += 3; // Video details cost 3 units
      await this.saveSettings();

      if (!data.items || data.items.length === 0) {
        return null;
      }

      const video = data.items[0];
      const result = {
        id: videoId,
        categoryId: video.snippet.categoryId,
        title: video.snippet.title,
        channelId: video.snippet.channelId,
        channelTitle: video.snippet.channelTitle,
        description: video.snippet.description,
        tags: video.snippet.tags || [],
        duration: video.contentDetails.duration,
        viewCount: parseInt(video.statistics.viewCount || 0),
        likeCount: parseInt(video.statistics.likeCount || 0),
        commentCount: parseInt(video.statistics.commentCount || 0),
      };

      // Cache the result
      await this.cacheVideo(videoId, result);

      console.debug(
        "[YouTube API] Fetched data for:",
        videoId,
        "Category:",
        result.categoryId
      );

      return result;
    } catch (error) {
      console.warn("[YouTube API] Fetch error:", error);
      return null;
    }
  }

  // Determine if video is educational based on category
  isEducationalCategory(categoryId) {
    if (!categoryId) return null; // Unknown

    if (this.eduCategories.has(categoryId)) {
      return true;
    }

    if (this.nonEduCategories.has(categoryId)) {
      return false;
    }

    // Category 26 (Howto & Style) needs additional filtering
    if (categoryId === "26") {
      return null; // Uncertain, needs keyword analysis
    }

    return null; // Unknown category
  }

  // Set API key
  async setApiKey(key) {
    this.apiKey = key;
    this.enabled = !!key;
    await this.saveSettings();
    console.log("[YouTube API] API key updated");
  }

  // Toggle API usage
  async toggle(enabled) {
    this.enabled = enabled && !!this.apiKey;
    await this.saveSettings();
    console.log("[YouTube API] Toggled:", this.enabled);
  }

  // Get quota info
  getQuotaInfo() {
    return {
      used: this.quotaUsed,
      limit: this.quotaLimit,
      remaining: this.quotaLimit - this.quotaUsed,
      percentage: ((this.quotaUsed / this.quotaLimit) * 100).toFixed(1),
      resetTime: new Date(this.quotaResetTime).toLocaleString(),
    };
  }

  // Clear cache
  async clearCache() {
    if (!this.cache) return;

    return new Promise((resolve) => {
      const transaction = this.cache.transaction(
        ["videos", "channels"],
        "readwrite"
      );

      transaction.objectStore("videos").clear();
      transaction.objectStore("channels").clear();

      transaction.oncomplete = () => {
        console.log("[YouTube API] Cache cleared");
        resolve();
      };

      transaction.onerror = () => resolve();
    });
  }
}

// Export for use in content script
if (typeof module !== "undefined" && module.exports) {
  module.exports = YouTubeAPIService;
}
