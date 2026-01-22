// Oddvision Background Service Worker
// API keys are now secured server-side via Supabase Edge Functions

try {
  importScripts('secrets.js', 'lib/supabase.js', 'lib/supabase-setup.js');
} catch (e) {
  console.error("Oddvision: Script import failed", e);
}

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
      } else if (command === 'toggle-fake-mode') {
        chrome.storage.local.get(['fakeMode'], (result) => {
          const newState = !result.fakeMode;
          chrome.storage.local.set({ fakeMode: newState });
        });
        return;
      }

      if (action) {
        chrome.tabs.sendMessage(tabs[0].id, { action }).catch(() => {});
      }
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callAI') {
    addToQueue(request.prompt, sendResponse, sender.tab?.id);
    return true;
  }

  if (request.action === 'getQueueCount') {
    sendResponse({ count: requestQueue.length });
    return true;
  }
});

// Add request to queue
async function addToQueue(prompt, sendResponse, tabId) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  requestQueue.push({ prompt, sendResponse, tabId, timestamp: now });
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
      }).catch(() => {});
    });
  });
}

// Process single request via Edge Function
async function processRequest(prompt, sendResponse, tabId, timestamp) {
  const waitTime = ((Date.now() - timestamp) / 1000).toFixed(1);
  totalProcessed++;

  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      sendResponse({ success: false, error: "Sign in to continue" });
      return;
    }

    // Get provider preference
    let provider = 'default';
    try {
      const result = await new Promise(resolve => {
        chrome.storage.sync.get(['aiProvider'], resolve);
      });
      provider = result.aiProvider || 'default';
    } catch (e) {}

    // Call Edge Function (API keys are secure on server)
    const response = await fetch(`${OddvisionConfig.supabaseUrl}/functions/v1/call-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ prompt, provider }),
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
    const { prompt, sendResponse, tabId, timestamp } = requestQueue.shift();
    notifyQueueUpdate();

    await processRequest(prompt, sendResponse, tabId, timestamp);

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
