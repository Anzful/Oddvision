// Oddvision Options Script

const providerSelect = document.getElementById('provider');
const apiKeyGroup = document.getElementById('api-key-group');
const apiKeyInput = document.getElementById('api-key');
const providerInfoDiv = document.getElementById('provider-info');
const toggleVisibility = document.getElementById('toggle-visibility');
const settingsForm = document.getElementById('settings-form');
const notification = document.getElementById('notification');
const overlayPositionSelect = document.getElementById('overlay-position');

// Provider information - Only FREE options with automatic failover
const providerInfo = {
  groq: {
    name: 'Groq (Llama 3.3 70B) ⚡ PRIMARY',
    badge: 'free',
    description: 'Lightning-fast FREE AI with Llama 3.3 70B. Best free option!',
    details: 'Free: 30 requests/min, 14,400/day. Ultra-fast inference!',
    apiLink: 'https://console.groq.com/keys',
    needsKey: true,
    priority: 1
  },
  openrouter: {
    name: 'OpenRouter (MiniMax M2) 🆓 BACKUP',
    badge: 'free',
    description: 'Free MiniMax M2 10B model. Auto-used if Groq fails.',
    details: 'Free tier: 200 requests/day, 197K context',
    apiLink: 'https://openrouter.ai/keys',
    needsKey: true,
    priority: 2
  }
};

// Load saved settings
chrome.storage.sync.get(['provider', 'apiKey', 'overlayPosition', 'groqKey', 'openrouterKey'], (result) => {
  if (result.provider) {
    providerSelect.value = result.provider;
    updateProviderInfo(result.provider);
  }
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
  }
  if (result.overlayPosition) {
    overlayPositionSelect.value = result.overlayPosition;
  } else {
    overlayPositionSelect.value = 'top-right'; // Default
  }
});

// Handle provider change
providerSelect.addEventListener('change', () => {
  const provider = providerSelect.value;
  updateProviderInfo(provider);
});

// Update provider information display
function updateProviderInfo(provider) {
  if (!provider) {
    providerInfoDiv.style.display = 'none';
    apiKeyGroup.style.display = 'none';
    return;
  }

  const info = providerInfo[provider];
  if (!info) return;

  providerInfoDiv.style.display = 'block';
  providerInfoDiv.innerHTML = `
    <h3>${info.name} <span class="badge ${info.badge}">${info.badge}</span></h3>
    <p>${info.description}</p>
    <p><strong>Details:</strong> ${info.details}</p>
    ${info.needsKey ? `<p><strong>Get API Key:</strong> <a href="${info.apiLink}" target="_blank">${info.apiLink}</a></p>` : `<p><strong>Download:</strong> <a href="${info.apiLink}" target="_blank">${info.apiLink}</a></p>`}
  `;

  if (info.needsKey) {
    apiKeyGroup.style.display = 'block';
  } else {
    apiKeyGroup.style.display = 'none';
  }
}

// Toggle API key visibility
toggleVisibility.addEventListener('click', () => {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleVisibility.textContent = '🙈';
  } else {
    apiKeyInput.type = 'password';
    toggleVisibility.textContent = '👁️';
  }
});

// Handle form submission
settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();
  const overlayPosition = overlayPositionSelect.value;

  if (!provider) {
    alert('Please select an AI provider');
    return;
  }

  const info = providerInfo[provider];
  if (info.needsKey && !apiKey) {
    alert('Please enter an API key for this provider');
    return;
  }

  // Save settings
  chrome.storage.sync.set({
    provider: provider,
    apiKey: apiKey,
    overlayPosition: overlayPosition
  }, () => {
    showNotification('Settings saved successfully!');
  });
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

