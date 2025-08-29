const checkboxes = ["hideHome", "hideSidebar", "hideComments", "hideShorts"];

checkboxes.forEach(id => {
  const el = document.getElementById(id);
  
  // Load saved setting
  chrome.storage.sync.get(id, data => {
    el.checked = data[id] ?? false;
  });

  // Save on change + send live update
  el.addEventListener("change", () => {
    chrome.storage.sync.set({ [id]: el.checked }, () => {
      // Send message to active tab
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { setting: id, value: el.checked });
      });
    });
  });
});
