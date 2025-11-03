# 🎓 EduTube Mode - Transform YouTube into an Educational Platform

## Overview

EduTube Mode is an intelligent filtering system that automatically hides non-educational content on YouTube, transforming it into a focused learning platform.

## How It Works

### Multi-Layer Filtering System

```
Video/Channel Found
       ↓
┌─────────────────────────┐
│ Layer 1: Whitelist      │
│ ✓ Trusted channels      │ → SHOW (1000 points)
└─────────────────────────┘
       ↓ (not whitelisted)
┌─────────────────────────┐
│ Layer 2: Keywords       │
│ ✓ Educational terms     │ → +5-10 points each
└─────────────────────────┘
       ↓
┌─────────────────────────┐
│ Layer 3: Channel Info   │
│ ✓ University, Academy   │ → +50 points
└─────────────────────────┘
       ↓
┌─────────────────────────┐
│ Layer 4: Content Style  │
│ ✓ Series/Course format  │ → +20 points
│ ✗ Clickbait patterns    │ → -15 points
└─────────────────────────┘
       ↓
┌─────────────────────────┐
│ Layer 5: Blacklist      │
│ ✗ Non-educational       │ → HIDE (-1000 points)
└─────────────────────────┘
       ↓
   Score >= Threshold?
   YES → SHOW | NO → HIDE
```

### Educational Indicators (What Gets Shown)

**Keywords** (+5-10 points each):

- tutorial, lecture, course, learn, education, lesson
- how to, explained, guide, introduction, basics
- mathematics, science, history, programming, language
- university, college, professor, teacher, academy
- python, javascript, physics, chemistry, biology

**Channel Patterns** (+50 points):

- University, Academy, Institute, Education, Learning
- Official educational institutions (MIT, Stanford, Khan Academy)
- Course/Tutorial/Lecture in channel name

**Content Structure** (+20 points):

- Part/Lesson/Episode/Chapter numbering
- Playlist/Series format
- Longer duration videos (10+ minutes)

### Non-Educational Indicators (What Gets Hidden)

**Keywords** (-10 points each):

- vlog, prank, reaction, drama, gossip
- unboxing, haul, challenge, mukbang
- gaming, let's play, gameplay, streaming
- funny, comedy, meme, entertainment

**Clickbait Patterns** (-15 points):

- Multiple exclamation marks (!!!)
- All caps titles
- "YOU WON'T BELIEVE", "SHOCKING", etc.

## Sensitivity Levels

### Relaxed (30 points threshold)

- Shows most content with any educational hints
- Good for discovery
- May include some non-educational content

### Balanced (50 points threshold) - **Recommended**

- Shows clearly educational content
- Filters most entertainment
- Best for general use

### Strict (80 points threshold)

- Only verified educational content
- Very aggressive filtering
- Best for distraction-free learning

## Features

### 1. Automatic Filtering

- Runs continuously in the background
- Checks every video on YouTube (home, search, suggestions)
- Updates every second for new content

### 2. Smart Scoring

- Analyzes titles, descriptions, channel names
- Multi-factor scoring algorithm
- Learns from your whitelist/blacklist

### 3. Channel Management

**Whitelist** (Future feature):

- Mark channels as 100% educational
- Instant approval for all their videos
- Never filtered out

**Blacklist** (Future feature):

- Mark channels as non-educational
- All their videos instantly hidden
- Improves filtering accuracy

### 4. Real-time Statistics

- Videos Hidden: Count of non-educational content filtered
- Educational Shown: Count of educational content displayed
- Updates every 2 seconds

## Usage

### Enable EduTube Mode

1. Open the extension popup
2. Toggle "Enable EduTube Mode"
3. YouTube instantly filters to educational content only

### Adjust Sensitivity

1. Use the slider to change strictness
2. Changes apply immediately
3. Refresh feed to see results

### View Statistics

- Open popup to see filtering stats
- Reset stats by disabling and re-enabling

## Technical Details

### Files Structure

```
edutubeEngine.js    - Core filtering logic
contentScript.js    - Integration with YouTube
popup.html/js/css   - User interface
manifest.json       - Extension configuration
```

### Storage Keys

- `edutubeEnabled`: Boolean - Is EduTube mode ON
- `edutubeSensitivity`: Number (30-80) - Filter threshold
- `edutubeWhitelist`: Array - Trusted channel IDs
- `edutubeBlacklist`: Array - Blocked channel IDs
- `edutubeStats`: Object - Usage statistics

### Performance

- Checks videos every 1 second
- Minimal CPU usage (~1-2%)
- No network requests (all local)
- Works offline

## Future Enhancements

### Phase 2 (Coming Soon)

- [ ] Right-click menu to whitelist/blacklist channels
- [ ] Pre-loaded database of 500+ educational channels
- [ ] Subject category filters (Math, Science, Programming, etc.)
- [ ] Export/Import whitelist/blacklist
- [ ] Community-shared channel lists

### Phase 3 (Advanced)

- [ ] YouTube API integration for category detection
- [ ] Machine learning content analysis
- [ ] Learning time tracking
- [ ] Achievement system for learning goals
- [ ] Weekly learning reports

## Troubleshooting

### Videos not being filtered

1. Make sure EduTube Mode is enabled (checkbox checked)
2. Check sensitivity level - lower it for more content
3. Refresh the YouTube page
4. Check console for errors (F12)

### Too many videos hidden

1. Lower sensitivity to "Relaxed"
2. Whitelist your favorite educational channels
3. Check stats to see filtering ratio

### Extension not working

1. Reload the extension
2. Refresh YouTube tabs
3. Check browser console for errors
4. Reinstall extension if needed

## Tips for Best Results

1. **Start with Balanced** - Best for most users
2. **Whitelist trusted channels** - Ensures they always show
3. **Use Search** - Search for specific topics you want to learn
4. **Subscribe wisely** - Subscribe only to educational channels
5. **Check stats regularly** - Understand what's being filtered

## Examples

### What Shows Up (Balanced Mode)

✅ "Python Tutorial for Beginners - Full Course"
✅ "MIT 6.006 Introduction to Algorithms, Lecture 1"
✅ "Khan Academy: Calculus - Derivatives"
✅ "How does a Computer Work? - Explained"
✅ "Spanish Grammar Lesson 5: Past Tense"

### What Gets Hidden (Balanced Mode)

❌ "MY CRAZY MORNING ROUTINE VLOG!!!"
❌ "Minecraft Let's Play Episode 47"
❌ "UNBOXING the NEW iPhone 15 Pro Max"
❌ "Reacting to TikTok Compilations"
❌ "TOP 10 GAMING FAILS YOU WON'T BELIEVE"

## Credits

Built with ❤️ for focused learning
Part of YouTube Declutter Extension v5.0
