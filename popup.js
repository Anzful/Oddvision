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
    console.error('Session check failed:', err);
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
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        alert('Login canceled or failed: ' + chrome.runtime.lastError.message);
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
          handleSession(session);
        } else {
            // Sometimes error is in query params
            const errorDesc = params.get('error_description');
            if (errorDesc) alert('Login error: ' + errorDesc);
        }
      }
    });
  } catch (err) {
    console.error('Login failed:', err);
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
