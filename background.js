// Oddvision Background Service Worker
// Configuration is loaded from secrets.js
importScripts('secrets.js', 'lib/supabase.js', 'lib/supabase-setup.js');

// Request queue for rate limiting
const requestQueue = [];
let isProcessingQueue = false;
const RATE_LIMIT_DELAY = 1200; // 1.2 seconds between requests (50 req/min max)
const MAX_CONCURRENT = 2; // Process up to 2 requests simultaneously without queue
let totalProcessed = 0;
let lastRequestTime = 0;

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
  console.log(`🔮 Oddvision: Queued request #${totalProcessed + requestQueue.length} (${requestQueue.length} in queue)`);
  
  // Notify all tabs about queue update
  notifyQueueUpdate();
  
  // Smart queueing: If we're under rate limit and not already processing, start immediately
  if (!isProcessingQueue && timeSinceLastRequest >= RATE_LIMIT_DELAY) {
    console.log(`⚡ Oddvision: Starting queue processing immediately`);
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
      }).catch(() => {});
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
      sendResponse({ success: false, error: "Please log in via the extension popup to use AI features." });
      return;
    }

    if (waitTime > 0.1) {
      console.log(`⚡ Oddvision: Processing request #${totalProcessed} (waited ${waitTime}s)`);
    }

    // Check usage limits via RPC
    const { data: usageData, error: usageError } = await supabase.rpc('increment_prompt_usage');
    
    if (usageError) {
      console.error('Usage check failed:', usageError);
      // Fail open or closed? Closed for now to prevent abuse if DB is down, but be careful.
      // Actually, if RPC fails, it might be network. Let's fail safe if possible, but strict for limits.
      // If error is "function not found", it means SQL wasn't run.
      // Let's throw to be safe.
      throw new Error("Could not verify usage limits: " + usageError.message);
    }

    if (usageData && !usageData.allowed) {
      console.warn('Oddvision: Usage limit reached');
      sendResponse({ 
        success: false, 
        error: usageData.error || "Weekly limit reached (3/3). Wait for reset or upgrade." 
      });
      return;
    }

    const remaining = usageData?.remaining;
    console.log(`Oddvision: Usage approved. Remaining: ${remaining}`);

    const result = await callAIWithFailover(prompt);
    
    // Track usage (fire and forget)
    // We already tracked the *count* via RPC, but we still log details here if we want
    trackUsage(prompt, result.model);
    
    sendResponse({ success: true, response: result.response, model: result.model, remaining });
    console.log(`✅ Oddvision: Completed request #${totalProcessed} via ${result.model}`);
  } catch (error) {
    console.error(`❌ Oddvision: Failed request #${totalProcessed}:`, error.message);
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
    
    // Rate limiting: Wait before next request
    if (requestQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      lastRequestTime = Date.now();
    }
  }
  
  isProcessingQueue = false;
  notifyQueueUpdate();
  console.log(`🎉 Oddvision: Queue cleared! Total processed: ${totalProcessed}`);
}

// Automatic failover: Try providers in order until one works
// Uses static, preconfigured API keys from secrets.js (OddvisionConfig)
async function callAIWithFailover(prompt) {
  // Define providers in priority order, using built-in credentials
  const providers = [
    { name: 'groq', key: OddvisionConfig.apiKey, fn: callGroq },
    { name: 'openrouter', key: OddvisionConfig.openrouterKey, fn: callOpenRouter }
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
      return { response, model: provider.name };
    } catch (error) {
      console.log(`Oddvision: ❌ ${provider.name} failed:`, error.message);
      lastError = error;
      // Continue to next provider
    }
  }
  
  // All providers failed
  throw new Error(`All providers failed. Last error: ${lastError?.message || 'No API provider available'}`);
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
  // Auto-enable on install; no API keys are stored in chrome.storage
  chrome.storage.local.set({ enabled: true }, () => {
    console.log('Oddvision: Extension installed with default settings');
  });
});

// Track usage in Supabase
async function trackUsage(prompt, model) {
  try {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Optional: Log anonymous usage or skip
      console.log('Oddvision: Usage not tracked (no session)');
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
      console.error('Supabase tracking error:', error.message);
    } else {
      console.log('Oddvision: Usage tracked successfully');
    }
  } catch (err) {
    console.error('Supabase tracking exception:', err);
  }
}
