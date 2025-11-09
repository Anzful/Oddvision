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
  }
});

// Capture page context (triggered by Ctrl+Shift+1)
function capturePageContext() {
  pageContent = extractPageText();
  console.log('Oddvision: Captured', pageContent.length, 'characters from page');
  
  // Show brief notification
  showNotification('📄 Page context captured!', 'success');
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
  showNotification('🤖 Asking AI...', 'info');
  
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
    
    showNotification('✅ AI response ready! Press Ctrl+Shift+Y to view', 'success');
    
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
        <button class="oddvision-close" id="oddvision-close-btn" title="Close (Ctrl+Shift+Y)">×</button>
      </div>
      <div class="oddvision-content">
        <div class="oddvision-chat-area" id="oddvision-chat-area">
          <div class="oddvision-welcome">
            <p>Ask me anything about this page! I've analyzed the content and I'm ready to help.</p>
            <p class="oddvision-tip">💡 Tip: Press Ctrl+Enter to submit your question</p>
          </div>
        </div>
        <div class="oddvision-input-area">
          <textarea 
            id="oddvision-input" 
            placeholder="Ask a question about this page..." 
            rows="3"
          ></textarea>
          <button id="oddvision-submit-btn" class="oddvision-submit">
            <span class="oddvision-submit-text">Ask AI</span>
            <span class="oddvision-loading" style="display: none;">
              <span class="oddvision-spinner"></span> Thinking...
            </span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  overlayElement = overlay;
  
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
  const submitBtn = overlay.querySelector('#oddvision-submit-btn');
  const inputArea = overlay.querySelector('#oddvision-input');
  
  closeBtn.addEventListener('click', hideOverlay);
  submitBtn.addEventListener('click', submitQuestion);
  
  inputArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      submitQuestion();
    }
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
  
  // Add context info
  const contextInfo = document.createElement('div');
  contextInfo.className = 'oddvision-context-info';
  contextInfo.innerHTML = `
    <div style="font-size: 11px; color: #777; margin-bottom: 12px; padding: 8px 10px; background: rgba(40, 40, 55, 0.4); border-radius: 6px; border: 1px solid rgba(70, 70, 90, 0.3);">
      📄 ${pageContent.length} chars • 🤖 Ready
    </div>
  `;
  chatArea.appendChild(contextInfo);
  
  // Add AI response
  const messageDiv = document.createElement('div');
  messageDiv.className = 'oddvision-message oddvision-message-ai';
  
  const label = document.createElement('div');
  label.className = 'oddvision-message-label';
  label.textContent = '🤖 AI Analysis';
  
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

// Submit question to AI
async function submitQuestion() {
  const input = overlayElement.querySelector('#oddvision-input');
  const submitBtn = overlayElement.querySelector('#oddvision-submit-btn');
  const chatArea = overlayElement.querySelector('#oddvision-chat-area');
  const submitText = submitBtn.querySelector('.oddvision-submit-text');
  const loadingIndicator = submitBtn.querySelector('.oddvision-loading');
  
  const question = input.value.trim();
  if (!question) {
    showError('Please enter a question');
    return;
  }
  
  // Get settings
  const settings = await chrome.storage.sync.get(['provider', 'apiKey']);
  if (!settings.provider) {
    showError('Please configure AI provider in extension options');
    return;
  }
  
  if (settings.provider !== 'ollama' && !settings.apiKey) {
    showError('Please add API key in extension options');
    return;
  }
  
  // Add question to chat
  addMessage('user', question);
  input.value = '';
  
  // Show loading state
  submitBtn.disabled = true;
  submitText.style.display = 'none';
  loadingIndicator.style.display = 'flex';
  
  try {
    // Build the full prompt with context
    const fullPrompt = pageContent 
      ? `Context: ${pageContent}\n\nQuestion: ${question}`
      : question;
    
    // Call background script (no CORS restrictions!)
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'callAI',
          provider: settings.provider,
          apiKey: settings.apiKey,
          prompt: fullPrompt
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
    
    addMessage('ai', response);
  } catch (error) {
    console.error('Oddvision AI Error:', error);
    showError(`AI Error: ${error.message}`);
  } finally {
    // Reset loading state
    submitBtn.disabled = false;
    submitText.style.display = 'inline';
    loadingIndicator.style.display = 'none';
  }
}

// Add message to chat area
function addMessage(type, content) {
  const chatArea = overlayElement.querySelector('#oddvision-chat-area');
  
  // Remove welcome message if present
  const welcome = chatArea.querySelector('.oddvision-welcome');
  if (welcome) {
    welcome.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `oddvision-message oddvision-message-${type}`;
  
  const label = document.createElement('div');
  label.className = 'oddvision-message-label';
  label.textContent = type === 'user' ? '👤 You' : '🤖 AI';
  
  const text = document.createElement('div');
  text.className = 'oddvision-message-text';
  text.textContent = content;
  
  messageDiv.appendChild(label);
  messageDiv.appendChild(text);
  chatArea.appendChild(messageDiv);
  
  // Scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Show error message
function showError(message) {
  const chatArea = overlayElement.querySelector('#oddvision-chat-area');
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'oddvision-error';
  errorDiv.textContent = `⚠️ ${message}`;
  
  chatArea.appendChild(errorDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
  
  // Remove error after 5 seconds
  setTimeout(() => errorDiv.remove(), 5000);
}

// All API calls now handled by background.js (no CORS restrictions!)

