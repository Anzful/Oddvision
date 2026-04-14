// Oddvision Popup Script

// UI Elements
const views = {
  loading: document.getElementById('loading-view'),
  auth: document.getElementById('auth-view'),
  app: document.getElementById('app-view'),
  fake: document.getElementById('fake-view')
};
const logoutBtn = document.getElementById('logout-btn');
const loginBtn = document.getElementById('login-btn');

// Existing elements
const enableToggle = document.getElementById('enable-toggle');
const statusText = document.getElementById('status-text');
const settingsBtn = document.getElementById('settings-btn');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check fake mode first
  chrome.storage.local.get(['fakeMode'], async (result) => {
    if (result.fakeMode) {
      showView('fake');
    } else {
      await checkSession();
    }
  });

  // Listen for fake mode changes while popup is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.fakeMode) {
      if (changes.fakeMode.newValue) {
        showView('fake');
      } else {
        checkSession();
      }
    }
  });
});

async function checkSession() {
  showView('loading');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      handleSession(session);
    } else {
      showView('auth');
    }
  } catch (err) {
    // console.error('Session check failed:', err);
    showView('auth');
  }
}

function showView(viewName) {
  Object.values(views).forEach(el => el.style.display = 'none');
  
  if (viewName === 'auth') {
    views.auth.style.display = 'flex';
  } else if (viewName === 'loading') {
    views.loading.style.display = 'flex';
  } else if (viewName === 'fake') {
    views.fake.style.display = 'flex';
  } else {
    views.app.style.display = 'block';
  }
}

function handleSession(session) {
  showView('app');
  initAppLogic();
  fetchUsage(session.user);
}

async function fetchUsage(user) {
    const usageCountEl = document.getElementById('usage-count');
    const usageResetEl = document.getElementById('usage-reset');

    if (!user) return;

    try {
        const { data, error } = await supabase
            .from('user_usage')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            usageCountEl.textContent = 'Error';
            return;
        }

        let count = 0;
        let limit = 5;
        let isPro = false;
        let hoursLeft = 0;

        if (data) {
            isPro = data.is_pro;

            // Check pro expiry
            if (isPro && data.pro_expires_at) {
                const expiryDate = new Date(data.pro_expires_at);
                const now = new Date();
                if (expiryDate <= now) {
                    // Pro expired
                    isPro = false;
                }
            }

            const lastReset = new Date(data.last_reset_at);
            const now = new Date();
            const diffTime = now - lastReset;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays >= 1) {
                count = 0;
                hoursLeft = 24;
            } else {
                count = data.prompts_count;
                hoursLeft = Math.ceil((1 - diffDays) * 24);
            }
        } else {
            count = 0;
            hoursLeft = 24;
        }

        if (isPro) {
            usageCountEl.textContent = 'Pro';
            usageCountEl.style.color = '#22d3ee'; // Cyan

            // Show expiry info if applicable
            if (data.pro_expires_at) {
                const expiryDate = new Date(data.pro_expires_at);
                const now = new Date();
                const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

                if (daysRemaining <= 7) {
                    usageResetEl.textContent = `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
                    usageResetEl.style.color = '#f97316'; // Orange warning
                } else {
                    usageResetEl.textContent = `Pro • ${daysRemaining} days left`;
                    usageResetEl.style.color = '';
                }
            } else {
                usageResetEl.textContent = 'Pro Plan Active';
                usageResetEl.style.color = '';
            }
        } else {
            const displayCount = count > limit ? limit : count;
            usageCountEl.textContent = `${displayCount} / ${limit}`;
            usageResetEl.textContent = `Resets in ~${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`;
            usageResetEl.style.color = '';

            if (count >= limit) {
                usageCountEl.style.color = '#ef4444'; // Red
            } else {
                usageCountEl.style.color = '#eaeaf0';
            }
        }

    } catch (err) {
        // Silent fail
    }
}

// Login Flow — delegated to background script (popup closes when auth window opens)
loginBtn.addEventListener('click', async () => {
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  chrome.runtime.sendMessage({ action: 'startLogin' }, (response) => {
    if (chrome.runtime.lastError) {
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"></path><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.715H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"></path><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"></path><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.159 6.656 3.58 9 3.58z" fill="#EA4335"></path></svg> Sign in with Google';
      return;
    }

    if (response?.success) {
      handleSession(response.session);
    } else if (response?.error && !response.error.includes('cancelled')) {
      alert('Login failed: ' + response.error);
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"></path><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.715H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"></path><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"></path><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.159 6.656 3.58 9 3.58z" fill="#EA4335"></path></svg> Sign in with Google';
    } else {
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"></path><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.715H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"></path><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"></path><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.159 6.656 3.58 9 3.58z" fill="#EA4335"></path></svg> Sign in with Google';
    }
  });
});

// Logout Flow — delegated to background script
logoutBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'logout' }, (response) => {
    showView('auth');
  });
});

// --- Existing Logic ---
function initAppLogic() {
    // Load current state (default to enabled if unset)
    chrome.storage.local.get(['enabled'], (result) => {
        const enabled = (typeof result.enabled === 'boolean') ? result.enabled : true;
        enableToggle.checked = enabled;
        updateStatus(enabled);
    });

    // Handle toggle change
    enableToggle.addEventListener('change', () => {
        const enabled = enableToggle.checked;
        chrome.storage.local.set({ enabled }, () => {
            updateStatus(enabled);
            
            // Notify all tabs about the state change
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'toggleEnabled',
                        enabled: enabled
                    }).catch(() => {
                        // Ignore errors for tabs without content script
                    });
                });
            });
        });
    });

    // Open settings page
    settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
}

// Update status text helper
function updateStatus(enabled) {
  if (enabled) {
    statusText.textContent = '✓ Enabled';
    statusText.classList.add('enabled');
  } else {
    statusText.textContent = '✗ Disabled';
    statusText.classList.remove('enabled');
  }
}
