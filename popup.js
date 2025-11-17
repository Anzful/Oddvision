// Oddvision Popup Script

const enableToggle = document.getElementById('enable-toggle');
const statusText = document.getElementById('status-text');
const settingsBtn = document.getElementById('settings-btn');

// Load current state (default to enabled if unset)
chrome.storage.local.get(['enabled'], (result) => {
  const enabled = (typeof result.enabled === 'boolean') ? result.enabled : true;
  enableToggle.checked = enabled;
  updateStatus(enabled);
});

// Handle toggle change
enableToggle.addEventListener('change', () => {
  const enabled = enableToggle.checked;
  chrome.storage.local.set({ enabled }, () => {
    updateStatus(enabled);
    
    // Notify all tabs about the state change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'toggleEnabled',
          enabled: enabled
        }).catch(() => {
          // Ignore errors for tabs without content script
        });
      });
    });
  });
});

// Update status text
function updateStatus(enabled) {
  if (enabled) {
    statusText.textContent = '✓ Enabled';
    statusText.classList.add('enabled');
  } else {
    statusText.textContent = '✗ Disabled';
    statusText.classList.remove('enabled');
  }
}

// Open settings page
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

