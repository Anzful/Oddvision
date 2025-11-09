// Oddvision Background Service Worker
// Configuration is loaded from secrets.js
try {
  importScripts('secrets.js');
} catch (error) {
  console.error('Failed to load secrets.js:', error);
  // Define a fallback config
  var OddvisionConfig = {
    defaultProvider: 'groq',
    apiKey: ''
  };
}

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

// Handle API calls from content script (no CORS restrictions in background!)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callAI') {
    callAI(request.provider, request.apiKey, request.prompt)
      .then(response => sendResponse({ success: true, response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// AI API calls (no CORS restrictions here!)
async function callAI(provider, apiKey, prompt) {
  switch (provider) {
    case 'groq':
      return await callGroq(apiKey, prompt);
    case 'huggingface':
      return await callHuggingFace(apiKey, prompt);
    case 'gemini':
      return await callGemini(apiKey, prompt);
    case 'openai-mini':
      return await callOpenAI(apiKey, prompt, 'gpt-4o-mini');
    case 'openai-4o':
      return await callOpenAI(apiKey, prompt, 'gpt-4o');
    case 'claude-sonnet':
      return await callClaude(apiKey, prompt, 'claude-3-5-sonnet-20241022');
    case 'claude-haiku':
      return await callClaude(apiKey, prompt, 'claude-3-5-haiku-20241022');
    case 'openrouter':
      return await callOpenRouter(apiKey, prompt);
    case 'ollama':
      return await callOllama(prompt);
    default:
      throw new Error('Unknown provider');
  }
}

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

async function callHuggingFace(apiKey, prompt) {
  // Using Hugging Face Inference API with chat format
  const url = 'https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.2-3B-Instruct',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that analyzes web content concisely.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.7,
      stream: false
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMsg = errorJson.error || errorJson.message || errorText;
    } catch (e) {
      // Keep errorText as is
    }
    throw new Error(`Hugging Face error: ${errorMsg}`);
  }
  
  const data = await response.json();
  
  // Handle chat completion format
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  
  // Fallback for other formats
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text;
  }
  
  if (data.generated_text) {
    return data.generated_text;
  }
  
  throw new Error('Unexpected response format from Hugging Face');
}

async function callGemini(apiKey, prompt) {
  // Using correct v1beta API with gemini-1.5-flash-latest model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
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
    throw new Error(errorMsg);
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callOpenAI(apiKey, prompt, model) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI error');
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callClaude(apiKey, prompt, model) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Claude error');
  }
  
  const data = await response.json();
  return data.content[0].text;
}

async function callOpenRouter(apiKey, prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'google/gemini-flash-1.5',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenRouter error');
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callOllama(prompt) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama2',
      prompt: prompt,
      stream: false
    })
  });
  
  if (!response.ok) {
    throw new Error('Ollama error - Make sure Ollama is running');
  }
  
  const data = await response.json();
  return data.response;
}

// Initialize extension state on install with default config
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true }); // Auto-enable on install
  
  // Set default provider and API key from config.js
  chrome.storage.sync.get(['provider', 'apiKey'], (result) => {
    if (!result.provider || !result.apiKey) {
      chrome.storage.sync.set({
        provider: OddvisionConfig.defaultProvider,
        apiKey: OddvisionConfig.apiKey
      }, () => {
        console.log('Oddvision: Extension installed with default config');
      });
    }
  });
});

