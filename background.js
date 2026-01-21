// Oddvision Background Service Worker
// Configuration is loaded from secrets.js
// console.log("🔮 Oddvision: Service Worker Starting...");

try {
  importScripts('secrets.js', 'lib/supabase.js', 'lib/supabase-setup.js');
  // console.log("🔮 Oddvision: Scripts imported successfully");
} catch (e) {
  console.error("🔮 Oddvision: Script import failed", e);
}

// Request queue for rate limiting
const requestQueue = [];
let isProcessingQueue = false;
const BASE_DELAY = 1200; // 1.2 seconds base delay
const JITTER_MAX = 800; // 0-800ms random extra delay to spread out multi-user requests
let totalProcessed = 0;
let lastRequestTime = 0;

// Get delay with random jitter to prevent multi-user API overload
function getJitteredDelay() {
  return BASE_DELAY + Math.floor(Math.random() * JITTER_MAX);
}

// Retry with exponential backoff on rate limit errors
async function callWithRetry(fn, apiKey, prompt, maxRetries = 2) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn(apiKey, prompt);
    } catch (error) {
      if (error.message.includes('429') && i < maxRetries) {
        // Rate limited - wait longer with exponential backoff
        const waitTime = (2 ** i) * 1000 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      throw error;
    }
  }
}

// Hardcoded instruction appended to every AI request
const HARDCODED_PROMPT = `Always determine the correct answer.

If the question contains answer choices labeled with letters or numbers (A, B, C, 1, 2, etc.):
- Respond ONLY with the correct choice label(s).
- Do NOT explain, even if the question asks for an explanation.

If the question contains NO answer choices:
- If the question asks to explain, describe, or justify, provide an explanation.
- Otherwise, provide only the direct answer.

Never add unnecessary text.
Never explain when choices are present.`;
// Handle keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  // console.log("🔮 Oddvision: Command received:", command);

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
        // Toggle fake mode state
        chrome.storage.local.get(['fakeMode'], (result) => {
          const newState = !result.fakeMode;
          chrome.storage.local.set({ fakeMode: newState });
        });
        return; // No message to tab needed
      }

      if (action) {
        // console.log("🔮 Oddvision: Sending action to tab:", action, tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, { action }).catch(err => {
          // console.log('Oddvision: Could not send message to tab (Tab might be restricted or loading)', err);
        });
      }
    } else {
      // console.log("🔮 Oddvision: No active tab found");
    }
  });
});

// Handle API calls from content script with automatic failover + queue
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callAI') {
    // Add to queue instead of calling immediately
    addToQueue(request.prompt, sendResponse, sender.tab?.id);
    return true; // Keep channel open for async response
  }

  // Get queue count (minimal)
  if (request.action === 'getQueueCount') {
    sendResponse({ count: requestQueue.length });
    return true;
  }
});

// Add request to queue and process
async function addToQueue(prompt, sendResponse, tabId) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  // Always add to queue first
  requestQueue.push({ prompt, sendResponse, tabId, timestamp: now });
  // console.log(`🔮 Oddvision: Queued request #${totalProcessed + requestQueue.length} (${requestQueue.length} in queue)`);

  // Notify all tabs about queue update
  notifyQueueUpdate();

  // Smart queueing: If we're under rate limit and not already processing, start immediately
  if (!isProcessingQueue && timeSinceLastRequest >= BASE_DELAY) {
    // console.log(`⚡ Oddvision: Starting queue processing immediately`);
    lastRequestTime = now;
    processQueue();
  } else if (!isProcessingQueue) {
    // Need to wait for rate limit
    processQueue();
  }
}

// Notify all tabs about queue count
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

// Process single request
async function processRequest(prompt, sendResponse, tabId, timestamp) {
  const waitTime = ((Date.now() - timestamp) / 1000).toFixed(1);
  totalProcessed++;

  try {
    // Enforce Login: Check session before processing
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('Oddvision: Request blocked (not logged in)');
      sendResponse({ success: false, error: "Sign in to continue" });
      return;
    }

    if (waitTime > 0.1) {
      // console.log(`⚡ Oddvision: Processing request #${totalProcessed} (waited ${waitTime}s)`);
    }

    // Check usage limits via RPC
    const { data: usageData, error: usageError } = await supabase.rpc('increment_prompt_usage');

    if (usageError) {
      // console.error('Usage check failed:', usageError);
      // Fail open or closed? Closed for now to prevent abuse if DB is down, but be careful.
      // Actually, if RPC fails, it might be network. Let's fail safe if possible, but strict for limits.
      // If error is "function not found", it means SQL wasn't run.
      // Let's throw to be safe.
      throw new Error("Connection issue");
    }

    if (usageData && !usageData.allowed) {
      // console.warn('Oddvision: Usage limit reached');
      sendResponse({
        success: false,
        error: "Limit reached"
      });
      return;
    }

    const remaining = usageData?.remaining;
    // console.log(`Oddvision: Usage approved. Remaining: ${remaining}`);

    const result = await callAIWithFailover(prompt);

    // Track usage (fire and forget)
    // We already tracked the *count* via RPC, but we still log details here if we want
    trackUsage(prompt, result.model);

    sendResponse({ success: true, response: result.response, model: result.model, remaining });
    // console.log(`✅ Oddvision: Completed request #${totalProcessed} via ${result.model}`);
  } catch (error) {
    // console.error(`❌ Oddvision: Failed request #${totalProcessed}:`, error.message);
    sendResponse({ success: false, error: error.message });
  }
}

// Process queue with rate limiting
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const { prompt, sendResponse, tabId, timestamp } = requestQueue.shift();

    // Notify all tabs about queue update
    notifyQueueUpdate();

    await processRequest(prompt, sendResponse, tabId, timestamp);

    // Rate limiting: Wait with jitter before next request
    if (requestQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, getJitteredDelay()));
      lastRequestTime = Date.now();
    }
  }

  isProcessingQueue = false;
  notifyQueueUpdate();
  // console.log(`🎉 Oddvision: Queue cleared! Total processed: ${totalProcessed}`);
}

// Automatic failover: Try providers in order until one works
// Uses static, preconfigured API keys from secrets.js (OddvisionConfig)
async function callAIWithFailover(prompt) {
  // Define all providers in priority order, using built-in credentials
  const allProviders = [
    { name: 'groq', key: OddvisionConfig.apiKey, fn: callGroq },
    { name: 'openrouter', key: OddvisionConfig.openrouterKey, fn: callOpenRouter }
  ];

  // Check if admin has set a specific provider preference
  let providers = allProviders;
  try {
    const result = await new Promise(resolve => {
      chrome.storage.sync.get(['aiProvider'], resolve);
    });
    const aiProvider = result.aiProvider || 'default';

    if (aiProvider === 'groq') {
      providers = allProviders.filter(p => p.name === 'groq');
    } else if (aiProvider === 'openrouter') {
      providers = allProviders.filter(p => p.name === 'openrouter');
    }
    // 'default' uses all providers with failover
  } catch (e) {
    // If storage read fails, use default behavior
  }

  let lastError = null;

  // Try each provider in order with retry logic
  for (const provider of providers) {
    if (!provider.key) {
      // console.log(`Oddvision: Skipping ${provider.name} (no API key)`);
      continue;
    }

    try {
      // console.log(`Oddvision: Trying ${provider.name}...`);
      const response = await callWithRetry(provider.fn, provider.key, prompt);
      // console.log(`Oddvision: ✅ Success with ${provider.name}`);
      return { response, model: provider.name };
    } catch (error) {
      // console.log(`Oddvision: ❌ ${provider.name} failed:`, error.message);
      lastError = error;
      // Continue to next provider
    }
  }

  // All providers failed - use short, friendly message
  throw new Error("Busy, try again");
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
        { role: 'system', content: 'You are a helpful assistant that analyzes web page content and answers questions concisely and accurately.\n\n' + HARDCODED_PROMPT },
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
      model: 'nvidia/nemotron-3-nano-30b-a3b:free', // NVIDIA Nemotron 30B - FREE
      messages: [
        { role: 'system', content: 'You are a helpful assistant that analyzes web page content and answers questions concisely and accurately.\n\n' + HARDCODED_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
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
  // Auto-enable on install; no API keys are stored in chrome.storage
  chrome.storage.local.set({ enabled: true }, () => {
    // console.log('Oddvision: Extension installed with default settings');
  });
});

// Track usage in Supabase
async function trackUsage(prompt, model) {
  try {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Optional: Log anonymous usage or skip
      return;
    }

    // Insert into 'usage_logs' table
    // Note: Create this table in Supabase dashboard if not exists:
    // create table usage_logs (
    //   id uuid default gen_random_uuid() primary key,
    //   user_id uuid references auth.users,
    //   prompt_length int,
    //   model text,
    //   created_at timestamptz default now()
    // );
    const { error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: session.user.id,
        prompt_length: prompt ? prompt.length : 0,
        model: model
      });

    if (error) {
      // Silent fail in production
    }
  } catch (err) {
    // Silent fail in production
  }
}
