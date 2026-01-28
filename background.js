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

    // Handle Gemini Provider directly (Client-side)
    if (provider === 'gemini') {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${OddvisionConfig.geminiKey}`;
        
        // System instruction (Pre-prompt)
        const systemInstruction = `Always determine the correct answer.

If the question contains answer choices labeled with letters or numbers (A, B, C, 1, 2, etc.):
- Respond ONLY with the correct choice label(s).
- Do NOT explain, even if the question asks for an explanation.

If the question contains NO answer choices:
- If the question asks to explain, describe, or justify, provide an explanation.
- Otherwise, provide only the direct answer.

Never add unnecessary text.
Never explain when choices are present.
Respond in the same language as the question.

`;
        const finalPrompt = systemInstruction + prompt;

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: finalPrompt }] }]
          })
        });

        const data = await response.json();

        if (!response.ok) {
           throw new Error(data.error?.message || 'Gemini API Error');
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) throw new Error('No content generated');

        sendResponse({
          success: true,
          response: text,
          model: 'gemini-2.0-flash',
          remaining: 9999 // Placeholder as this is client-side key
        });
        return;

      } catch (error) {
        console.error("Gemini Error:", error);
        sendResponse({ success: false, error: "Gemini failed" });
        return;
      }
    }

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
