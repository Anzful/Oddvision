// Oddvision Background Service Worker
// API keys are now secured server-side via Supabase Edge Functions

import './secrets.js';
import './lib/supabase.js';
import './lib/supabase-setup.js';

// Request queue for rate limiting
const requestQueue = [];
let isProcessingQueue = false;
const BASE_DELAY = 1200;
const JITTER_MAX = 800;
let totalProcessed = 0;
let lastRequestTime = 0;

// Get delay with random jitter
function getJitteredDelay() {
  return BASE_DELAY + Math.floor(Math.random() * JITTER_MAX);
}

// Handle keyboard shortcut commands
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
      } else if (command === 'capture-screenshot') {
        action = 'capture-screenshot';
      }

      if (action) {
        chrome.tabs.sendMessage(tabs[0].id, { action }).catch(() => { });
      }
    }
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callAI') {
    addToQueue(request.prompt, sendResponse, sender.tab?.id, request.role, request.customPrompt, request.image);
    return true;
  }

  if (request.action === 'captureTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 90 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true;
  }

  if (request.action === 'getQueueCount') {
    sendResponse({ count: requestQueue.length });
    return true;
  }

  if (request.action === 'startLogin') {
    handleLogin().then(sendResponse).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'logout') {
    supabase.auth.signOut().then(() => sendResponse({ success: true })).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Handle Google OAuth login in background (popup closes when auth window opens)
async function handleLogin() {
  const redirectUrl = chrome.identity.getRedirectURL();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true
    }
  });
  if (error) throw error;

  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({
      url: data.url,
      interactive: true
    }, (url) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(url);
      }
    });
  });

  if (!responseUrl) throw new Error('No response from auth flow');

  const urlObj = new URL(responseUrl);
  const params = new URLSearchParams(urlObj.hash.substring(1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token) {
    const errorDesc = params.get('error_description') || params.get('error');
    throw new Error(errorDesc || 'No access token received');
  }

  const { data: { session }, error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token
  });
  if (sessionError) throw sessionError;

  return { success: true, session };
}

// Add request to queue
async function addToQueue(prompt, sendResponse, tabId, role, customPrompt, image) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  requestQueue.push({ prompt, sendResponse, tabId, timestamp: now, role, customPrompt, image });
  notifyQueueUpdate();

  if (!isProcessingQueue && timeSinceLastRequest >= BASE_DELAY) {
    lastRequestTime = now;
    processQueue();
  } else if (!isProcessingQueue) {
    processQueue();
  }
}

// Notify tabs about queue update
function notifyQueueUpdate() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'queueUpdate',
        count: requestQueue.length
      }).catch(() => { });
    });
  });
}

// Process single request via Edge Function
async function processRequest(prompt, sendResponse, tabId, timestamp, role, customPrompt, image) {
  const waitTime = ((Date.now() - timestamp) / 1000).toFixed(1);
  totalProcessed++;

  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      sendResponse({ success: false, error: "Sign in to continue" });
      return;
    }

    // Build request body
    const body = { prompt, role: role || 'picker', customPrompt };
    if (image) {
      body.image = image;
    }

    // Call Edge Function (API keys are secure on server)
    const response = await fetch(`${OddvisionConfig.supabaseUrl}/functions/v1/call-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        sendResponse({ success: false, error: "Limit reached" });
      } else if (response.status === 401) {
        sendResponse({ success: false, error: "Sign in to continue" });
      } else {
        sendResponse({ success: false, error: data.error || "Request failed" });
      }
      return;
    }

    sendResponse({
      success: true,
      response: data.response,
      model: data.model,
      remaining: data.remaining
    });

  } catch (error) {
    console.error("Oddvision request error:", error);
    sendResponse({ success: false, error: "Connection error" });
  }
}

// Process queue with rate limiting
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const { prompt, sendResponse, tabId, timestamp, role, customPrompt, image } = requestQueue.shift();
    notifyQueueUpdate();

    await processRequest(prompt, sendResponse, tabId, timestamp, role, customPrompt, image);

    if (requestQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, getJitteredDelay()));
      lastRequestTime = Date.now();
    }
  }

  isProcessingQueue = false;
  notifyQueueUpdate();
}

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true });
});
