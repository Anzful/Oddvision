// Oddvision Background Service Worker
// Configuration is loaded from secrets.js
importScripts('secrets.js');

// Handle keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      let action = '';
      
      if (command === 'capture-context') {
        action = 'capture-context';
      } else if (command === 'ask-ai') {
        action = 'ask-ai';
      } else if (command === 'toggle-overlay') {
        action = 'toggle-overlay';
      } else if (command === 'toggle-text-color') {
        action = 'toggle-text-color';
      }
      
      if (action) {
        chrome.tabs.sendMessage(tabs[0].id, { action }).catch(err => {
          console.log('Oddvision: Could not send message to tab', err);
        });
      }
    }
  });
});

// Handle API calls from content script with automatic failover
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callAI') {
    callAIWithFailover(request.prompt)
      .then(response => sendResponse({ success: true, response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Automatic failover: Try providers in order until one works
async function callAIWithFailover(prompt) {
  // Get all API keys from storage
  const keys = await chrome.storage.sync.get(['groqKey', 'openrouterKey']);
  
  // Define providers in priority order
  const providers = [
    { name: 'groq', key: keys.groqKey, fn: callGroq },
    { name: 'openrouter', key: keys.openrouterKey, fn: callOpenRouter }
  ];
  
  let lastError = null;
  
  // Try each provider in order
  for (const provider of providers) {
    if (!provider.key) {
      console.log(`Oddvision: Skipping ${provider.name} (no API key)`);
      continue;
    }
    
    try {
      console.log(`Oddvision: Trying ${provider.name}...`);
      const response = await provider.fn(provider.key, prompt);
      console.log(`Oddvision: ✅ Success with ${provider.name}`);
      return response;
    } catch (error) {
      console.log(`Oddvision: ❌ ${provider.name} failed:`, error.message);
      lastError = error;
      // Continue to next provider
    }
  }
  
  // All providers failed
  throw new Error(`All providers failed. Last error: ${lastError?.message || 'No API keys configured'}`);
}

// AI API calls (no CORS restrictions here!) - Only FREE providers

async function callGroq(apiKey, prompt) {
  // Groq - Super fast and free AI API with generous limits
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // Fast and capable free model
      messages: [
        { role: 'system', content: 'You are a helpful assistant that analyzes web page content and answers questions concisely and accurately.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMsg = errorJson.error?.message || errorText;
    } catch (e) {
      // Keep errorText as is
    }
    throw new Error(`Groq API error: ${errorMsg}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callOpenRouter(apiKey, prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://oddvision-extension.com',
      'X-Title': 'Oddvision Extension'
    },
    body: JSON.stringify({
      model: 'minimax/minimax-m2:free', // MiniMax M2 - FREE and working (10B params, 197K context)
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter error response:', errorText);
    let errorMsg = errorText;
    try {
      const error = JSON.parse(errorText);
      errorMsg = error.error?.message || error.message || errorText;
    } catch (e) {
      // Keep errorText as is
    }
    throw new Error(`OpenRouter: ${errorMsg}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Initialize extension state on install with default config
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true }); // Auto-enable on install
  
  // Set all API keys from secrets.js
  chrome.storage.sync.get(['groqKey', 'openrouterKey'], (result) => {
    const updates = {};
    
    if (!result.groqKey && OddvisionConfig.apiKey) {
      updates.groqKey = OddvisionConfig.apiKey;
    }
    if (!result.openrouterKey && OddvisionConfig.openrouterKey) {
      updates.openrouterKey = OddvisionConfig.openrouterKey;
    }
    
    if (Object.keys(updates).length > 0) {
      chrome.storage.sync.set(updates, () => {
        console.log('Oddvision: Extension installed with 2-provider failover');
      });
    }
  });
});

