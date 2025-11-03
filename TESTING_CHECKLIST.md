# ✅ Testing Checklist - EduTube Extension

## Pre-Testing Setup

### Files Required

```
☐ manifest.json
☐ contentScript.js
☐ edutubeEngine.js
☐ youtubeAPIService.js
☐ instantHide.css
☐ popup.html
☐ popup.css
☐ popup.js
☐ icons/ folder (with icon16.png, icon48.png, icon128.png)
```

### Installation

```
☐ Open chrome://extensions/
☐ Enable "Developer mode"
☐ Click "Load unpacked"
☐ Select extension folder
☐ Extension appears in list (no errors)
☐ Pin extension to toolbar
```

---

## Test 1: Basic Extension Loading

### Steps:

1. ☐ Click extension icon in toolbar
2. ☐ Popup opens (no blank screen)
3. ☐ See "YouTube Declutter" header
4. ☐ See theme toggle buttons (light/dark)
5. ☐ See General, Content Filters, Video Page, EduTube sections

### Expected Result:

✅ Popup displays correctly with all sections visible

### If Failed:

- Check popup.html, popup.css, popup.js exist
- Check console for errors (F12 in popup)
- Verify manifest.json has correct popup path

---

## Test 2: Theme Toggle

### Steps:

1. ☐ Open extension popup
2. ☐ Default: Dark mode active (dark button highlighted)
3. ☐ Click light mode button ☀️
4. ☐ Popup switches to light theme
5. ☐ Click dark mode button 🌙
6. ☐ Popup switches to dark theme
7. ☐ Close and reopen popup
8. ☐ Theme persists (remembers last choice)

### Expected Result:

✅ Theme switches smoothly and persists

### If Failed:

- Check popup.js theme toggle code
- Check chrome.storage.sync permissions
- Clear extension storage and retry

---

## Test 3: Basic Hiding Features

### Test 3A: Hide Shorts

```
☐ Go to youtube.com
☐ Open extension popup
☐ Enable "Hide Shorts" checkbox
☐ Close popup
☐ Refresh YouTube page
☐ Result: All Shorts videos disappear
☐ Disable "Hide Shorts"
☐ Result: Shorts reappear
```

### Test 3B: Hide Header

```
☐ Enable "Hide Header"
☐ Result: YouTube top bar disappears
☐ Disable: Top bar reappears
```

### Test 3C: Hide Comments

```
☐ Open any video
☐ Enable "Hide Comments"
☐ Result: Comment section disappears
☐ Disable: Comments reappear
```

### Expected Result:

✅ All basic hiding features work instantly

---

## Test 4: EduTube Mode (Keywords Only)

### Setup:

```
☐ Go to youtube.com (homepage)
☐ Count total videos visible (note number: ___)
☐ Open extension popup
☐ Enable "Enable EduTube Mode" checkbox
☐ Close popup
☐ Wait 3 seconds
```

### Test 4A: Home Page Filtering

```
☐ Refresh YouTube page
☐ Wait 5 seconds for filtering
☐ Count videos now visible (note number: ___)
☐ Result: Fewer videos visible (50-70% hidden)
☐ Open browser console (F12)
☐ Look for [EduTube] debug messages
```

### Test 4B: Check Console Logs

```
Expected logs:
[EduTube] Initialized (Hybrid Mode)
[EduTube] ✓ Keywords (high): 85 ...
[EduTube] ✗ Keywords (low): 15 ...
[EduTube] ✓ Fallback: 55 vs 50 ...
```

### Test 4C: Verify Filtering Logic

```
Videos that SHOULD stay visible:
☐ Titles with: "tutorial", "lecture", "course"
☐ Channel names with: "Academy", "University", "Education"
☐ Educational content clearly marked

Videos that SHOULD be hidden:
☐ Titles with: "vlog", "gaming", "reaction"
☐ Gaming channels
☐ Entertainment content
☐ Clickbait titles (ALL CAPS!!!)
```

### Expected Result:

✅ 40-60% of videos filtered out
✅ Educational videos still visible
✅ Entertainment/gaming hidden

### If Failed:

- Check edutubeEngine.js loaded correctly
- Check contentScript.js has EduTube integration
- Look for errors in console
- Verify settings saved (chrome.storage.sync)

---

## Test 5: Sensitivity Slider

### Steps:

```
☐ Enable EduTube Mode
☐ Set sensitivity to "Relaxed" (30)
☐ Refresh page
☐ Count videos: ___ (should be ~70-80% visible)

☐ Set sensitivity to "Balanced" (50)
☐ Refresh page
☐ Count videos: ___ (should be ~40-50% visible)

☐ Set sensitivity to "Strict" (80)
☐ Refresh page
☐ Count videos: ___ (should be ~10-20% visible)
```

### Expected Result:

✅ Relaxed: More videos shown
✅ Balanced: Medium filtering
✅ Strict: Heavy filtering

---

## Test 6: Statistics Display

### Steps:

```
☐ Enable EduTube Mode
☐ Browse YouTube for 2 minutes
☐ Open extension popup
☐ Check "Videos Hidden" count (should be > 0)
☐ Check "Videos Shown" count (should be > 0)
☐ Expand "Filter Layer Statistics"
☐ Verify layer counts (Keywords, Fallback should have numbers)
```

### Expected Result:

✅ Stats update in real-time
✅ Numbers increase as you browse
✅ Layer breakdown shows which layers are used

---

## Test 7: YouTube API Integration (Optional)

### Prerequisite:

```
☐ Have YouTube API key ready
☐ API key is valid (test at: https://console.cloud.google.com/)
```

### Test 7A: Add API Key

```
☐ Enable EduTube Mode
☐ Paste API key in input field
☐ Click "Save"
☐ Check status indicator turns green 🟢
☐ Text changes to "API Active"
☐ Quota bar appears
☐ Shows "0 / 10,000 units used"
```

### Test 7B: API Filtering

```
☐ Refresh YouTube page
☐ Wait 10 seconds
☐ Open browser console (F12)
☐ Look for: [YouTube API] Fetched data for: ...
☐ Look for: [EduTube] ✓ API Category: 27 ...
☐ Open popup → Check quota increased (e.g., "15 / 10,000")
```

### Test 7C: Category Detection

```
Search for known educational video:
☐ Search: "Khan Academy calculus"
☐ Click first result
☐ Console should show: [YouTube API] Category: 27 (Education)
☐ Video should be visible

Search for known gaming video:
☐ Search: "Minecraft gameplay"
☐ Console should show: [YouTube API] Category: 20 (Gaming)
☐ Video should be hidden
```

### Expected Result:

✅ API calls successful
✅ Category-based filtering works
✅ Quota increases with each unique video
✅ Cached videos don't use quota

### If Failed:

- Verify API key is correct
- Check YouTube Data API v3 is enabled in Google Cloud
- Check API key restrictions allow youtube.com
- Look for 403/401 errors in console

---

## Test 8: Caching System

### Steps:

```
☐ Enable API
☐ Visit YouTube homepage
☐ Note quota usage: ___ units
☐ Refresh page (Ctrl+R)
☐ Check quota usage: ___ units (should be same or very small increase)
☐ Console should show: [YouTube API] Using cached data
```

### Expected Result:

✅ Repeated videos don't call API
✅ Quota doesn't increase significantly on refresh
✅ Cache messages in console

---

## Test 9: Quota Management

### Simulate Quota Exceeded:

```
☐ Browse YouTube extensively
☐ Monitor quota in popup
☐ If quota reaches high % (90%+):
  - API should show warning (future feature)
  - Filtering continues with keywords
  - No errors in console
```

### Expected Result:

✅ Extension gracefully falls back to keywords when quota low

---

## Test 10: Search Filtering

### Test 10A: Educational Search

```
☐ Search: "Python programming tutorial"
☐ Results load
☐ Educational videos visible (freeCodeCamp, Corey Schafer, etc.)
☐ Non-educational filtered out
```

### Test 10B: Non-Educational Search

```
☐ Search: "funny cat videos"
☐ Results mostly hidden (entertainment)
☐ Any educational cat science videos might show
```

### Test 10C: Mixed Search

```
☐ Search: "cooking"
☐ See both filtered:
  - ✅ "Cooking tutorial" visible
  - ❌ "Cooking vlog" hidden
```

---

## Test 11: Video Page Features

### Test Video Description

```
☐ Open any video
☐ Enable "Hide Video Description"
☐ Description disappears
☐ Disable: Description reappears
```

### Test Channel Info

```
☐ Enable "Hide Channel Info"
☐ Channel name, avatar, subscribe button disappear
☐ Disable: They reappear
```

### Test Engagement Buttons

```
☐ Enable "Hide Engagement Buttons"
☐ Like, share, download buttons disappear
☐ Disable: Buttons reappear
```

---

## Test 12: Multi-Tab Testing

### Steps:

```
☐ Open 3 YouTube tabs
☐ Enable EduTube in popup
☐ Tab 1: Homepage should filter
☐ Tab 2: Search results should filter
☐ Tab 3: Subscriptions should filter
☐ All tabs filter independently
```

### Expected Result:

✅ All tabs filter correctly
✅ Settings sync across tabs
✅ No conflicts or errors

---

## Test 13: Performance Testing

### Monitor Performance:

```
☐ Open Task Manager (Shift+Esc in Chrome)
☐ Find extension process
☐ Memory usage: ___ MB (should be < 100MB)
☐ CPU usage: ___ % (should be < 5%)
☐ Browse YouTube for 5 minutes
☐ Check if browser slows down (should not)
```

### Expected Result:

✅ Low memory footprint
✅ Minimal CPU usage
✅ No browser lag

---

## Test 14: Error Handling

### Test Invalid API Key:

```
☐ Enter fake API key: "abcd1234"
☐ Click Save
☐ Try to browse YouTube
☐ Console shows API errors (expected)
☐ Extension falls back to keywords (no crash)
```

### Test Network Offline:

```
☐ Disconnect internet
☐ Browse YouTube (with cached pages)
☐ EduTube should still filter using keywords
☐ No console errors
```

### Expected Result:

✅ Extension handles errors gracefully
✅ Always has fallback mechanism
✅ No crashes or blank screens

---

## Test 15: Settings Persistence

### Steps:

```
☐ Enable EduTube Mode
☐ Set sensitivity to Strict
☐ Add API key
☐ Enable "Hide Shorts"
☐ Close browser completely
☐ Reopen browser
☐ Go to YouTube
☐ Open extension popup
☐ All settings should be saved:
  - ✅ EduTube still enabled
  - ✅ Sensitivity still on Strict
  - ✅ API key still saved (masked)
  - ✅ Hide Shorts still enabled
```

### Expected Result:

✅ All settings persist across sessions

---

## Test 16: Disable/Re-enable

### Steps:

```
☐ Enable EduTube Mode
☐ Verify filtering works
☐ Disable EduTube Mode
☐ All videos reappear (no filtering)
☐ Re-enable EduTube Mode
☐ Filtering resumes
```

### Expected Result:

✅ Toggle works instantly
✅ No residual hidden videos when disabled

---

## Common Issues & Fixes

### Issue: Popup doesn't open

```
Fix:
☐ Check manifest.json has correct popup path
☐ Reload extension
☐ Check for console errors
```

### Issue: Filtering not working

```
Fix:
☐ Verify EduTube Mode is enabled (checkbox checked)
☐ Refresh YouTube page
☐ Check console for [EduTube] messages
☐ Try disabling other extensions
```

### Issue: Stats not updating

```
Fix:
☐ Wait 2 seconds (stats update every 2s)
☐ Check if EduTube is actually filtering
☐ Reload extension
```

### Issue: API not working

```
Fix:
☐ Verify API key is correct
☐ Check YouTube Data API v3 is enabled
☐ Try regenerating API key
☐ Check quota isn't exceeded
```

---

## Final Checklist

### Before Release:

```
☐ All 16 tests passed
☐ No console errors on clean install
☐ Performance acceptable
☐ Settings persist correctly
☐ Both modes work (with/without API)
☐ Documentation complete
☐ Icons present and displaying
☐ Extension description clear
☐ Version number updated
```

### Known Limitations:

```
☐ Only works on desktop Chrome (not mobile)
☐ Requires page refresh for filtering
☐ API has daily quota (10,000 units)
☐ Whitelist/blacklist UI not yet implemented (Phase 2)
```

---

## Success Criteria

✅ **Minimum Viable Product**:

- Extension loads without errors
- Basic hiding features work
- EduTube mode filters ~50-70% of content
- Settings persist
- No major bugs

✅ **Full Feature Set**:

- API integration works
- 90%+ accuracy with API
- Stats display correctly
- Quota management works
- Performance acceptable

✅ **Production Ready**:

- All tests pass
- Error handling robust
- User experience smooth
- Documentation complete

---

## Testing Complete! 🎉

Once all tests pass, the extension is ready for:

1. Personal use
2. Beta testing
3. Chrome Web Store submission
4. Public release

Good luck testing! 🚀
