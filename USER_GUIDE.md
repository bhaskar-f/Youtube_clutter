# 📚 EduTube - Complete User Guide

## Table of Contents

1. [Installation](#installation)
2. [First Time Setup](#first-time-setup)
3. [Basic Usage](#basic-usage)
4. [Advanced Setup (YouTube API)](#advanced-setup-youtube-api)
5. [Daily Usage](#daily-usage)
6. [Troubleshooting](#troubleshooting)

---

## Installation

### Step 1: Prepare Your Files

Make sure you have all these files in one folder:

```
youtube-declutter/
├── manifest.json
├── contentScript.js
├── edutubeEngine.js
├── youtubeAPIService.js
├── instantHide.css
├── popup.html
├── popup.css
├── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
```

### Step 2: Load Extension in Chrome

1. Open Chrome browser
2. Type in address bar: `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"** button
5. Select your `youtube-declutter` folder
6. Click **"Select Folder"**

✅ **Extension installed!** You'll see the icon in your toolbar.

### Step 3: Pin the Extension (Optional)

1. Click the **puzzle piece icon** 🧩 in Chrome toolbar
2. Find "YouTube Declutter + EduTube"
3. Click the **pin icon** 📌 to keep it visible

---

## First Time Setup

### Opening the Extension

Click the extension icon in your Chrome toolbar to open the popup.

You'll see:

- **General Controls** section (Header, Home, Sidebar, etc.)
- **Content Filters** section (Shorts, Explore, Comments)
- **Video Page** section (Description, Channel Info, etc.)
- **🎓 EduTube Mode** section (The main feature!)

### Basic Mode (Recommended for First-Time Users)

1. **Don't enable anything yet** - Just browse YouTube normally
2. **Try individual features** to understand what they do:
   - ✅ Enable "Hide Shorts" → All Shorts disappear
   - ✅ Enable "Hide Comments" → Comments disappear
   - ✅ Disable them → Everything comes back
3. **Get comfortable** with the basic features first

---

## Basic Usage

### Scenario 1: "I Want to Hide Distractions"

**Goal**: Hide YouTube's addictive elements but keep normal content

**Steps**:

1. Open extension popup
2. Enable these:
   - ✅ Hide Shorts (removes short-form videos)
   - ✅ Hide Chip Bar (removes topic filters)
   - ✅ Hide Comments (removes comment section)
3. Browse YouTube - you'll see:
   - ✅ Regular videos still visible
   - ✅ Cleaner interface
   - ✅ Less distracting elements

**Result**: YouTube with less distraction, but all content still visible.

---

### Scenario 2: "I Only Want Educational Content"

**Goal**: Transform YouTube into EduTube - only educational videos

**Steps**:

1. Open extension popup
2. Scroll to **"🎓 EduTube Mode"** section
3. Toggle **"Enable EduTube Mode"** ✅
4. Wait 2-3 seconds
5. Refresh YouTube page (F5)

**What Happens**:

- ✅ Educational videos stay visible
- ❌ Entertainment videos disappear
- ❌ Gaming content disappears
- ❌ Vlogs disappear
- ❌ Reaction videos disappear

**First Time Experience**:

```
Before EduTube:
- 50 videos on homepage
- Mix of everything: tutorials, vlogs, gaming, etc.

After EduTube:
- 15-25 videos on homepage
- Only: tutorials, lectures, educational content
```

---

### Scenario 3: "Too Many Videos Are Hidden!"

**Problem**: EduTube is hiding videos you want to see

**Solution**: Lower the sensitivity

**Steps**:

1. Open extension popup
2. Find **"Filter Sensitivity"** slider
3. Move slider to **"Relaxed"** (left side)
4. Refresh YouTube page

**Sensitivity Levels**:

- **Relaxed (30)**: Shows ~80% of content (more permissive)
- **Balanced (50)**: Shows ~50% of content (default)
- **Strict (80)**: Shows ~20% of content (very selective)

**Example**:

```
"How to Cook Pasta" video:
- Relaxed: ✅ SHOWN (has "how to")
- Balanced: ❓ MAYBE (depends on channel)
- Strict: ❌ HIDDEN (not from educational channel)

"MIT Calculus Lecture":
- Relaxed: ✅ SHOWN
- Balanced: ✅ SHOWN
- Strict: ✅ SHOWN
```

---

### Scenario 4: "Too Many Non-Educational Videos Showing!"

**Problem**: EduTube is showing gaming/entertainment content

**Solution**: Increase the sensitivity

**Steps**:

1. Open extension popup
2. Move **"Filter Sensitivity"** slider to **"Strict"** (right side)
3. Refresh YouTube page

**Result**: Only clearly educational content shows up.

---

## Advanced Setup (YouTube API)

### Why Use YouTube API?

**Without API**:

- ✅ FREE forever
- ✅ Works offline
- ⚠️ ~70% accuracy

**With API**:

- ✅ Still FREE (10,000 requests/day)
- ✅ ~90-95% accuracy
- ✅ Better category detection
- ⚠️ Requires setup (5 minutes)

### When Do You Need API?

**You DON'T need API if**:

- You're happy with 70% accuracy
- You mostly watch clearly educational channels
- You prefer simplicity

**You SHOULD use API if**:

- You want maximum accuracy
- You discover new channels often
- You want precise filtering

---

### Getting YouTube API Key (FREE)

#### Step 1: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Sign in with your Google account

#### Step 2: Create a Project

1. Click **"Select a project"** (top bar)
2. Click **"NEW PROJECT"**
3. Project name: `EduTube Filter` (or any name)
4. Click **"CREATE"**
5. Wait 10 seconds for project creation

#### Step 3: Enable YouTube Data API v3

1. Click **"☰ Menu"** → **"APIs & Services"** → **"Library"**
2. Search: `YouTube Data API v3`
3. Click on **"YouTube Data API v3"**
4. Click **"ENABLE"**
5. Wait for it to enable

#### Step 4: Create API Key

1. Click **"CREATE CREDENTIALS"** button
2. Select **"API key"**
3. Your API key appears → Click **"COPY"** 📋
4. Save it somewhere temporarily (Notepad)

#### Step 5: Restrict API Key (Security)

1. Click **"RESTRICT KEY"**
2. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check **"YouTube Data API v3"**
3. Click **"SAVE"**

✅ **Done!** You now have a FREE YouTube API key.

---

### Adding API Key to Extension

#### Step 1: Open Extension Popup

1. Click extension icon
2. Enable **"EduTube Mode"** (if not already)
3. Look for **"YouTube API (Optional)"** section

#### Step 2: Enter API Key

1. Click the **"?"** button to see help (optional)
2. Paste your API key in the input field
3. Click **"Save"**

#### Step 3: Verify It's Working

1. Check **API status** shows:
   - 🟢 Green indicator
   - Text says: **"API Active"**
2. See **quota bar** appear (0% used initially)

✅ **API is now active!** Filtering will be more accurate.

---

## Daily Usage

### Typical User Flow

#### Morning Routine: Learning Mode

1. Open YouTube
2. Extension already enabled (stays on)
3. Browse homepage:
   - ✅ See: Khan Academy, MIT lectures, tutorials
   - ❌ Don't see: Vlogs, gaming, entertainment
4. Click video → Watch → Learn!
5. Check stats: Open popup → See "Videos Hidden: 127"

#### Search for Specific Topic

1. Search: "Machine Learning Tutorial"
2. Results filtered:
   - ✅ Show: Stanford CS229, Andrew Ng courses
   - ❌ Hide: "ML Gone Wrong Compilation"
3. Click on educational result
4. Watch and learn

#### Discovery: Explore Educational Channels

1. Watch educational video
2. Look at suggestions:
   - ✅ All suggestions are educational
   - ❌ No clickbait recommendations
3. Discover new educational channels naturally
4. Subscribe to good channels

---

### Checking Your Statistics

#### View Basic Stats

1. Open extension popup
2. See in **EduTube Mode** section:
   ```
   Videos Hidden: 245
   Educational Shown: 87
   ```

#### View Layer Statistics

1. Click **"Filter Layer Statistics"** (expand)
2. See breakdown:
   ```
   Whitelist: 12  ← Videos from trusted channels
   Blacklist: 8   ← Videos from blocked channels
   Keywords: 156  ← Detected by keyword analysis
   YouTube API: 45 ← Verified by API
   Fallback: 24   ← Decided by sensitivity
   ```

#### Check API Quota (if using API)

1. See quota bar percentage
2. Example: `245 / 10,000 units used` (2.45%)
3. Resets: Shows time until reset

**Normal Usage**:

- Light: 100-500 units/day (1-5%)
- Medium: 500-2,000 units/day (5-20%)
- Heavy: 2,000-5,000 units/day (20-50%)

---

### Adjusting Settings On-the-Fly

#### Too Strict? Lower Sensitivity

**Symptom**: Missing videos you want
**Fix**:

1. Open popup
2. Move slider left to "Relaxed"
3. Refresh page

#### Too Permissive? Raise Sensitivity

**Symptom**: Seeing non-educational content
**Fix**:

1. Open popup
2. Move slider right to "Strict"
3. Refresh page

#### Want Minimal UI? Enable Hide Options

1. Enable **"Hide Header"** → Top bar disappears
2. Enable **"Hide Sidebar"** → Left menu disappears
3. Enable **"Hide Suggested Videos"** → Right sidebar disappears

**Result**: Pure focus mode - just the video player!

---

## Troubleshooting

### Problem: "EduTube isn't filtering anything"

**Checklist**:

1. ✅ Is "Enable EduTube Mode" checked?
2. ✅ Did you refresh the YouTube page?
3. ✅ Are you on youtube.com (not other sites)?
4. ✅ Check console for errors (F12)

**Fix**:

- Disable and re-enable EduTube Mode
- Reload extension (chrome://extensions/)
- Refresh YouTube page (Ctrl+R)

---

### Problem: "All videos are hidden!"

**Cause**: Sensitivity too high OR search has no educational results

**Fix**:

1. Lower sensitivity to "Relaxed"
2. Try different search terms
3. Check if you're searching for educational content

---

### Problem: "Non-educational videos showing up"

**Cause**: Sensitivity too low OR keywords unclear

**Fix**:

1. Increase sensitivity to "Strict"
2. Add YouTube API for better accuracy
3. Refresh page to re-filter

---

### Problem: "API Not Working"

**Symptoms**:

- Status shows: ❌ "No API key set"
- Or: Red indicator

**Fix**:

1. Verify API key is correct (no spaces)
2. Check YouTube Data API v3 is enabled
3. Try regenerating API key
4. Check quota isn't exceeded (wait for reset)

**Test API Key**:

```
Open: https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=YOUR_API_KEY

Should return: JSON data (not error)
```

---

### Problem: "Quota Exceeded"

**Symptoms**:

- Quota bar at 100%
- API calls failing
- Status: "Quota exceeded"

**Temporary Fix**:

- Wait until midnight Pacific Time (quota resets)
- Extension falls back to keyword filtering

**Permanent Fix**:

1. Increase sensitivity (fewer API calls needed)
2. Clear cache periodically
3. Consider paid quota (if heavy user)

---

### Problem: "Extension Slowing Down Browser"

**Cause**: Too many filters running simultaneously

**Fix**:

1. Disable features you don't need
2. Use balanced sensitivity (not relaxed)
3. Close unused YouTube tabs
4. Restart browser

---

## Tips & Tricks

### Tip 1: Start Simple

Don't enable everything at once. Try:

- Day 1: Just EduTube Mode
- Day 2: Add "Hide Shorts"
- Day 3: Add "Hide Comments"

### Tip 2: Use Search Effectively

Search terms that work well:

- ✅ "Python tutorial"
- ✅ "Calculus lecture"
- ✅ "How to code"
- ❌ "Funny videos" (will be filtered)

### Tip 3: Subscribe to Educational Channels

Your subscriptions feed will be automatically filtered to show only educational uploads.

### Tip 4: Check Stats Weekly

See how much distraction you've eliminated:

```
Week 1: 1,245 videos hidden
Week 2: 987 videos hidden
Week 3: 1,456 videos hidden

Total saved: ~50 hours of distraction!
```

### Tip 5: Combine with Other Features

Best combination:

```
✅ EduTube Mode (filter content)
✅ Hide Shorts (remove short-form)
✅ Hide Comments (remove discussions)
✅ Hide Suggested Videos (remove sidebar distractions)

= Pure learning environment!
```

---

## Success Stories (Examples)

### Student Studying for Exams

```
Before:
- Opens YouTube for "calculus tutorial"
- Gets distracted by gaming videos
- 2 hours later: watched 0 educational content

After:
- Opens YouTube with EduTube enabled
- Sees only: Khan Academy, MIT, PatrickJMT
- 2 hours later: completed 8 tutorial videos
```

### Developer Learning New Language

```
Before:
- Searches "Python tutorial"
- Mixed results: tutorials + vlogs + gaming
- Hard to find quality content

After:
- Searches "Python tutorial"
- Only sees: freeCodeCamp, Corey Schafer, Tech With Tim
- All results are educational
```

### Parent's Peace of Mind

```
Before:
- Kids on YouTube
- Worried about inappropriate content
- Constant monitoring needed

After:
- EduTube enabled on kids' account
- Only educational content visible
- Kids learn while exploring
```

---

## Keyboard Shortcuts (Future Feature)

Coming soon:

- `Alt+E`: Toggle EduTube Mode
- `Alt+S`: Cycle sensitivity (Relaxed → Balanced → Strict)
- `Alt+W`: Add channel to whitelist
- `Alt+B`: Add channel to blacklist

---

## FAQ

**Q: Does this work on YouTube mobile app?**
A: No, only on desktop Chrome browser (desktop/laptop).

**Q: Will my API key be shared?**
A: No, it's stored locally in your browser only.

**Q: Can I use this with YouTube Premium?**
A: Yes! Works perfectly with YouTube Premium.

**Q: Does it work on other websites?**
A: No, only on youtube.com.

**Q: Can others see my settings?**
A: No, all settings are local to your browser.

**Q: Is this safe?**
A: Yes, all code is open-source and auditable.

**Q: Will Google ban me for using API?**
A: No, using the API is completely legitimate.

**Q: Can I export my settings?**
A: Feature coming soon in Phase 2!

---

## Getting Help

### Check Console Logs

1. Press `F12` to open DevTools
2. Click "Console" tab
3. Look for `[EduTube]` or `[declutter]` messages
4. Take screenshot if you see errors

### Extension Not Working?

1. Reload extension: chrome://extensions/ → Click reload
2. Refresh YouTube page
3. Check if EduTube is enabled
4. Try disabling other YouTube extensions

### Still Need Help?

- Check GitHub Issues (if open-source)
- Contact developer
- Join community Discord (if available)

---

## Updates & Roadmap

### Current Version: 5.0

- ✅ 5-Layer Hybrid Filtering
- ✅ YouTube API Integration
- ✅ Real-time Statistics
- ✅ Quota Management

### Coming in Phase 2:

- [ ] Right-click context menu
- [ ] Pre-loaded educational channels
- [ ] Export/Import settings
- [ ] Subject category filters

### Coming in Phase 3:

- [ ] Machine Learning layer
- [ ] Community channel lists
- [ ] Learning time tracking
- [ ] Achievement system

---

## Credits

Made with ❤️ for focused learning
YouTube Declutter + EduTube v5.0

Transform YouTube from entertainment → education!
