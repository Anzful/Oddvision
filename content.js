// Oddvision Content Script
// Handles text extraction, overlay injection, and AI communication
// Config is loaded from config.js

let overlayVisible = false;
let extensionEnabled = true; // Always enabled now
let pageContent = ''; // Stores captured page context
let lastAIResponse = ''; // Stores last AI response
let overlayElement = null;
let isProcessing = false; // Prevent multiple simultaneous requests

// Check if extension is enabled on load
chrome.storage.local.get(['enabled'], (result) => {
  extensionEnabled = result.enabled || false;
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleEnabled') {
    extensionEnabled = request.enabled;
    if (!extensionEnabled && overlayVisible) {
      hideOverlay();
    }
  } else if (request.action === 'toggleOverlay') {
    toggleOverlay();
  }
});

// Listen for keyboard shortcuts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture-context') {
    // Capture page context silently
    capturePageContext();
  } else if (request.action === 'ask-ai') {
    // Send captured context to AI
    sendContextToAI();
  } else if (request.action === 'toggle-overlay') {
    // Toggle overlay visibility
    toggleOverlay();
  } else if (request.action === 'toggle-text-color') {
    // Toggle text color
    toggleTextColor();
  }
});

// Capture page context (triggered by Ctrl+Shift+1)
function capturePageContext() {
  pageContent = extractPageText();
  console.log('Oddvision: Captured', pageContent.length, 'characters from page');
  
  // Show yellow indicator dot
  showIndicatorDot('yellow');
}

// Send context to AI (triggered by Ctrl+Shift+2)
async function sendContextToAI() {
  if (isProcessing) {
    showNotification('⏳ Please wait for current request...', 'warning');
    return;
  }
  
  if (!pageContent || pageContent.length === 0) {
    showNotification('❌ No context captured! Press Ctrl+Shift+1 first.', 'error');
    return;
  }
  
  // Get settings
  const settings = await chrome.storage.sync.get(['provider', 'apiKey']);
  if (!settings.provider) {
    showNotification('❌ Configure AI provider in extension options', 'error');
    return;
  }
  
  if (settings.provider !== 'ollama' && !settings.apiKey) {
    showNotification('❌ Add API key in extension options', 'error');
    return;
  }
  
  isProcessing = true;
  // Show green indicator dot
  showIndicatorDot('green');
  
  try {
    // Send just the context as the prompt
    const prompt = `Please analyze and summarize the following webpage content:\n\n${pageContent}`;
    
    // Call background script (no CORS restrictions!)
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'callAI',
          provider: settings.provider,
          apiKey: settings.apiKey,
          prompt: prompt
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.success) {
            resolve(response.response);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
    
    lastAIResponse = response;
    console.log('Oddvision: AI response received');
    
    // If overlay is already visible, update it
    if (overlayVisible && overlayElement) {
      displayAIResponse(response);
    }
  } catch (error) {
    console.error('Oddvision AI Error:', error);
    showNotification(`❌ AI Error: ${error.message}`, 'error');
  } finally {
    isProcessing = false;
  }
}

// Show brief notification
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.querySelector('#oddvision-notification');
  if (existing) {
    existing.remove();
  }
  
  const notification = document.createElement('div');
  notification.id = 'oddvision-notification';
  notification.className = `oddvision-notification oddvision-notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('oddvision-notification-fadeout');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Show small colored indicator dot
function showIndicatorDot(color) {
  // Remove existing indicator
  const existing = document.querySelector('#oddvision-indicator-dot');
  if (existing) {
    existing.remove();
  }
  
  const indicator = document.createElement('div');
  indicator.id = 'oddvision-indicator-dot';
  indicator.className = `oddvision-indicator-dot oddvision-indicator-${color}`;
  
  document.body.appendChild(indicator);
  
  // Auto-remove after 1 second
  setTimeout(() => {
    indicator.classList.add('oddvision-indicator-fadeout');
    setTimeout(() => indicator.remove(), 300);
  }, 1000);
}

// Extract all visible text from the page
function extractPageText() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip script, style, and hidden elements
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        const tagName = parent.tagName.toLowerCase();
        if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Check if element is visible
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip our overlay
        if (parent.closest('#oddvision-overlay')) {
          return NodeFilter.FILTER_REJECT;
        }
        
        const text = node.textContent.trim();
        if (text.length > 0) {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        return NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  const textContent = [];
  let node;
  
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text) {
      textContent.push(text);
    }
  }
  
  // Join and clean up the text
  let fullText = textContent.join(' ');
  // Remove excessive whitespace
  fullText = fullText.replace(/\s+/g, ' ').trim();
  
  // Truncate to ~4000 characters to avoid token limits
  if (fullText.length > 4000) {
    fullText = fullText.substring(0, 4000) + '...';
  }
  
  return fullText;
}

// Create and inject overlay
function createOverlay() {
  if (overlayElement) return overlayElement;
  
  const overlay = document.createElement('div');
  overlay.id = 'oddvision-overlay';
  overlay.innerHTML = `
    <div class="oddvision-container">
      <div class="oddvision-header">
        <h2>🔮 Oddvision</h2>
        <div class="oddvision-header-buttons">
          <button class="oddvision-color-toggle" id="oddvision-color-toggle-btn" title="Toggle text color (Alt+4)">⚫</button>
          <button class="oddvision-close" id="oddvision-close-btn" title="Close (Alt+3)">×</button>
        </div>
      </div>
      <div class="oddvision-content">
        <div class="oddvision-chat-area" id="oddvision-chat-area">
          <div class="oddvision-welcome">
            <p>AI analysis will appear here</p>
            <p class="oddvision-tip">💡 Press Alt+1 to capture, Alt+2 to analyze</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  overlayElement = overlay;
  
  // Apply initial position class
  overlay.classList.add('oddvision-position-top-right');
  
  // Prevent events from bubbling to the page
  overlay.addEventListener('mousedown', (e) => e.stopPropagation());
  overlay.addEventListener('mouseup', (e) => e.stopPropagation());
  overlay.addEventListener('click', (e) => e.stopPropagation());
  overlay.addEventListener('keydown', (e) => e.stopPropagation());
  overlay.addEventListener('keyup', (e) => e.stopPropagation());
  overlay.addEventListener('keypress', (e) => e.stopPropagation());
  overlay.addEventListener('focus', (e) => e.stopPropagation(), true);
  
  // Set up event listeners
  const closeBtn = overlay.querySelector('#oddvision-close-btn');
  const colorToggleBtn = overlay.querySelector('#oddvision-color-toggle-btn');
  
  closeBtn.addEventListener('click', hideOverlay);
  colorToggleBtn.addEventListener('click', toggleTextColor);
  
  // Load saved text color preference
  chrome.storage.sync.get(['textColor'], (result) => {
    const textColor = result.textColor || 'white';
    applyTextColor(textColor);
  });
  
  return overlay;
}

// Toggle overlay visibility
function toggleOverlay() {
  if (overlayVisible) {
    hideOverlay();
  } else {
    showOverlay();
  }
}

// Show overlay
function showOverlay() {
  if (!overlayElement) {
    createOverlay();
  }
  
  // Ensure position class is applied
  chrome.storage.sync.get(['overlayPosition'], (result) => {
    const position = result.overlayPosition || 'top-right';
    overlayElement.className = '';
    overlayElement.classList.add('oddvision-position-' + position);
  });
  
  overlayElement.style.display = 'flex';
  overlayVisible = true;
  
  // If we have AI response, display it
  if (lastAIResponse) {
    displayAIResponse(lastAIResponse);
  }
}

// Display AI response in overlay
function displayAIResponse(response) {
  const chatArea = overlayElement.querySelector('#oddvision-chat-area');
  
  // Clear existing content
  chatArea.innerHTML = '';
  
  // Add AI response
  const messageDiv = document.createElement('div');
  messageDiv.className = 'oddvision-message oddvision-message-ai';
  
  const label = document.createElement('div');
  label.className = 'oddvision-message-label';
  label.textContent = '🤖';
  
  const text = document.createElement('div');
  text.className = 'oddvision-message-text';
  text.textContent = response;
  
  messageDiv.appendChild(label);
  messageDiv.appendChild(text);
  chatArea.appendChild(messageDiv);
  
  // Scroll to top
  chatArea.scrollTop = 0;
}

// Hide overlay
function hideOverlay() {
  if (overlayElement) {
    overlayElement.style.display = 'none';
  }
  overlayVisible = false;
}

// Toggle text color between white and black
function toggleTextColor() {
  chrome.storage.sync.get(['textColor'], (result) => {
    const currentColor = result.textColor || 'white';
    const newColor = currentColor === 'white' ? 'black' : 'white';
    
    chrome.storage.sync.set({ textColor: newColor }, () => {
      applyTextColor(newColor);
    });
  });
}

// Apply text color to overlay
function applyTextColor(color) {
  if (!overlayElement) return;
  
  const colorToggleBtn = overlayElement.querySelector('#oddvision-color-toggle-btn');
  
  if (color === 'black') {
    overlayElement.classList.add('oddvision-text-black');
    overlayElement.classList.remove('oddvision-text-white');
    if (colorToggleBtn) colorToggleBtn.textContent = '⚪';
  } else {
    overlayElement.classList.add('oddvision-text-white');
    overlayElement.classList.remove('oddvision-text-black');
    if (colorToggleBtn) colorToggleBtn.textContent = '⚫';
  }
}

// All API calls now handled by background.js (no CORS restrictions!)

