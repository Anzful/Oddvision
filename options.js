// Oddvision Options Script
//
// This page only manages non-sensitive UI preferences (overlay position).
//
const settingsForm = document.getElementById('settings-form');
const notification = document.getElementById('notification');
const overlayPositionSelect = document.getElementById('overlay-position');

// Load saved settings
chrome.storage.sync.get(['overlayPosition'], (result) => {
  if (result.overlayPosition) {
    overlayPositionSelect.value = result.overlayPosition;
  } else {
    overlayPositionSelect.value = 'top-right'; // Default
  }
});

// Handle form submission
settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const overlayPosition = overlayPositionSelect.value;

  // Save settings
  chrome.storage.sync.set(
    {
      overlayPosition: overlayPosition
    },
    () => {
      showNotification('Settings saved successfully!');
    }
  );
});

// Show notification
function showNotification(message) {
  const notificationText = notification.querySelector('.notification-text');
  notificationText.textContent = message;
  notification.classList.add('show', 'success');

  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}


