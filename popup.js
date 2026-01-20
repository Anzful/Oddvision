// Oddvision Popup Script

// UI Elements
const views = {
  loading: document.getElementById('loading-view'),
  auth: document.getElementById('auth-view'),
  app: document.getElementById('app-view')
};
const userInfo = document.getElementById('user-info');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const loginBtn = document.getElementById('login-btn');

// Existing elements
const enableToggle = document.getElementById('enable-toggle');
const statusText = document.getElementById('status-text');
const settingsBtn = document.getElementById('settings-btn');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
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
  } else {
    views.app.style.display = 'block';
  }
}

function handleSession(session) {
  userEmail.textContent = session.user.email;
  userInfo.style.display = 'block';
  showView('app');
  initAppLogic(); 
  fetchUsage(session.user);
}

async function fetchUsage(user) {
    const usageCountEl = document.getElementById('usage-count');
    const usageResetEl = document.getElementById('usage-reset');

    if (!user) return;

    try {
        // We use 'maybeSingle' instead of 'single' to handle no rows gracefully if preferred,
        // but checking error code is also fine.
        const { data, error } = await supabase
            .from('user_usage')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            // console.error('Error fetching usage:', error);
            usageCountEl.textContent = 'Error';
            return;
        }

        let count = 0;
        let limit = 3;
        let isPro = false;
        let daysLeft = 0;

        if (data) {
            isPro = data.is_pro;
            
            const lastReset = new Date(data.last_reset_at);
            const now = new Date();
            // Calculate difference in milliseconds
            const diffTime = now - lastReset;
            // Convert to days
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            
            if (diffDays >= 7) {
                count = 0; // Visual reset (actual reset happens on next use)
                daysLeft = 7;
            } else {
                count = data.prompts_count;
                daysLeft = Math.ceil(7 - diffDays);
            }
        } else {
            // No record found => New user who hasn't used it yet
            count = 0;
            daysLeft = 7;
        }

        if (isPro) {
            usageCountEl.textContent = 'Unlimited';
            usageCountEl.style.color = '#22d3ee'; // Cyan
            usageResetEl.textContent = 'Pro Plan Active';
        } else {
            // Clamp count to limit for display if not pro
            const displayCount = count > limit ? limit : count;
            usageCountEl.textContent = `${displayCount} / ${limit}`;
            usageResetEl.textContent = `Resets in ~${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
            
            if (count >= limit) {
                usageCountEl.style.color = '#ef4444'; // Red
            } else {
                 usageCountEl.style.color = '#eaeaf0'; // var(--text)
            }
        }
        
    } catch (err) {
        // console.error('Usage fetch error:', err);
    }
}

// Login Flow
loginBtn.addEventListener('click', async () => {
  try {
    const redirectUrl = chrome.identity.getRedirectURL();
    console.log('Redirect URL:', redirectUrl); 
    // User must add this URL to Supabase > Authentication > URL Configuration > Redirect URLs

    // 1. Get Auth URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true
      }
    });
    if (error) throw error;

    // 2. Launch Web Auth Flow
    chrome.identity.launchWebAuthFlow({
      url: data.url,
      interactive: true
    }, async (responseUrl) => {
      // Handle User Cancelation or Errors
      if (chrome.runtime.lastError) {
        // console.warn('Auth flow warning:', chrome.runtime.lastError.message);
        // Don't alert immediately if it's just "User cancelled" which can be noisy
        if (!chrome.runtime.lastError.message.includes("User cancelled")) {
            alert('Login failed: ' + chrome.runtime.lastError.message);
        }
        return;
      }
      
      // 3. Parse tokens
      if (responseUrl) {
        // Supabase returns tokens in the hash fragment
        const urlObj = new URL(responseUrl);
        const params = new URLSearchParams(urlObj.hash.substring(1)); // remove #
        
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token) {
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          if (error) throw error;
          
          // SUCCESS!
          handleSession(session);
          
          // Optional: Close the popup? No, let user see they are logged in.
        } else {
            // Check for error in query params (sometimes Supabase returns errors there)
            const errorDesc = params.get('error_description');
            const error = params.get('error');
            
            if (errorDesc || error) {
                // console.error('Supabase Auth Error:', error, errorDesc);
                alert('Login failed: ' + (errorDesc || error));
            } else {
                 // Fallback if no tokens and no error (shouldn't happen on success)
                 // console.warn('No access token found in response URL:', responseUrl);
            }
        }
      }
    });
  } catch (err) {
    // console.error('Login failed:', err);
    alert('Login init failed: ' + err.message);
  }
});

// Logout Flow
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  userInfo.style.display = 'none';
  showView('auth');
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
