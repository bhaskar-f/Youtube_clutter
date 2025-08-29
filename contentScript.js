let settings = {};

function applyHiding() {
  if (settings.hideHome) {
    document.querySelector('#contents.ytd-rich-grid-renderer')?.remove();
  }
  if (settings.hideSidebar) {
    document.querySelector('#related')?.remove();
  }
  if (settings.hideComments) {
    document.querySelector('#comments')?.remove();
  }
  if (settings.hideShorts) {
    document.querySelectorAll('ytd-reel-shelf-renderer').forEach(el => el.remove());
    document.querySelectorAll('ytd-compact-video-renderer a[href*="shorts"]').forEach(el => {
      el.closest('ytd-compact-video-renderer')?.remove();
    });
  }
}

// Watch for DOM changes
const observer = new MutationObserver(applyHiding);
observer.observe(document.body, { childList: true, subtree: true });

// Load settings initially
chrome.storage.sync.get(null, data => {
  settings = data;
  applyHiding();
});

// Listen for live updates from popup
chrome.runtime.onMessage.addListener((message) => {
  settings[message.setting] = message.value;
  applyHiding();
});
