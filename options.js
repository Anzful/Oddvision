// Oddvision Options Script

const providerSelect = document.getElementById('provider');
const apiKeyGroup = document.getElementById('api-key-group');
const apiKeyInput = document.getElementById('api-key');
const providerInfoDiv = document.getElementById('provider-info');
const toggleVisibility = document.getElementById('toggle-visibility');
const settingsForm = document.getElementById('settings-form');
const notification = document.getElementById('notification');

// Provider information
const providerInfo = {
  huggingface: {
    name: 'Hugging Face (Mistral-7B)',
    badge: 'free',
    description: 'Free access to Mistral-7B-Instruct model via Hugging Face API.',
    details: 'Free tier available. Fast and capable 7B parameter model.',
    apiLink: 'https://huggingface.co/settings/tokens',
    needsKey: true
  },
  gemini: {
    name: 'Google Gemini 1.5 Flash',
    badge: 'free',
    description: 'Fast and free AI from Google with generous rate limits.',
    details: 'Free tier: 15 requests/minute, 1500 requests/day',
    apiLink: 'https://aistudio.google.com/app/apikey',
    needsKey: true
  },
  'openai-mini': {
    name: 'OpenAI GPT-4o-mini',
    badge: 'paid',
    description: 'Cost-effective OpenAI model with great performance.',
    details: 'Paid service with token-based pricing (~$0.15/1M input tokens)',
    apiLink: 'https://platform.openai.com/api-keys',
    needsKey: true
  },
  'openai-4o': {
    name: 'OpenAI GPT-4o',
    badge: 'paid',
    description: 'Most advanced OpenAI model with superior capabilities.',
    details: 'Paid service with token-based pricing (~$2.50/1M input tokens)',
    apiLink: 'https://platform.openai.com/api-keys',
    needsKey: true
  },
  'claude-sonnet': {
    name: 'Claude 3.5 Sonnet',
    badge: 'paid',
    description: 'Anthropic\'s most capable model with excellent reasoning.',
    details: 'Paid service with token-based pricing (~$3/1M input tokens)',
    apiLink: 'https://console.anthropic.com/settings/keys',
    needsKey: true
  },
  'claude-haiku': {
    name: 'Claude 3.5 Haiku',
    badge: 'paid',
    description: 'Fast and affordable Claude model for quick responses.',
    details: 'Paid service with token-based pricing (~$0.80/1M input tokens)',
    apiLink: 'https://console.anthropic.com/settings/keys',
    needsKey: true
  },
  openrouter: {
    name: 'OpenRouter',
    badge: 'free',
    description: 'Access multiple AI models through one API. Includes free options.',
    details: 'Free and paid models available. Defaults to Gemini Flash (free)',
    apiLink: 'https://openrouter.ai/keys',
    needsKey: true
  },
  ollama: {
    name: 'Ollama (Local AI)',
    badge: 'local',
    description: 'Run AI models locally on your computer. No API key needed!',
    details: 'Requires Ollama installed and running on http://localhost:11434',
    apiLink: 'https://ollama.ai/download',
    needsKey: false
  }
};

// Load saved settings
chrome.storage.sync.get(['provider', 'apiKey'], (result) => {
  if (result.provider) {
    providerSelect.value = result.provider;
    updateProviderInfo(result.provider);
  }
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
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
    apiKey: apiKey
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

