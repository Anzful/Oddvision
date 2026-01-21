// Oddvision Options Script
//
// This page manages UI preferences and admin panel for founders.
//
const settingsForm = document.getElementById('settings-form');
const notification = document.getElementById('notification');
const overlayPositionSelect = document.getElementById('overlay-position');
const accountEmailEl = document.getElementById('account-email');
const settingsLogoutBtn = document.getElementById('settings-logout-btn');
const foundersPanel = document.getElementById('founders-panel');
const aiProviderSelect = document.getElementById('ai-provider');

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await initPage();
});

async function initPage() {
  // Load overlay position setting
  chrome.storage.sync.get(['overlayPosition'], (result) => {
    if (result.overlayPosition) {
      overlayPositionSelect.value = result.overlayPosition;
    } else {
      overlayPositionSelect.value = 'top-right';
    }
  });

  // Check session and load user info
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      accountEmailEl.textContent = session.user.email;

      // Check if user is a founder
      const isFounder = OddvisionConfig.founderIds &&
                        OddvisionConfig.founderIds.includes(session.user.id);

      if (isFounder) {
        showFoundersPanel();
      }
    } else {
      accountEmailEl.textContent = 'Not signed in';
    }
  } catch (err) {
    accountEmailEl.textContent = 'Error loading account';
  }
}

// Show founders panel and load data
async function showFoundersPanel() {
  foundersPanel.classList.add('visible');

  // Load AI provider setting
  chrome.storage.sync.get(['aiProvider'], (result) => {
    if (result.aiProvider) {
      aiProviderSelect.value = result.aiProvider;
    } else {
      aiProviderSelect.value = 'default';
    }
  });

  // Load analytics
  await loadAnalytics();
  await loadUsersTable();
}

// Load analytics stats using RPC function
async function loadAnalytics() {
  try {
    // Use the admin stats RPC function
    const { data, error } = await supabase.rpc('get_admin_stats');

    if (error) throw error;

    if (data && data[0]) {
      const stats = data[0];
      document.getElementById('stat-total-users').textContent = stats.total_auth_users;
      document.getElementById('stat-pro-users').textContent = stats.pro_users;
      document.getElementById('stat-total-prompts').textContent = stats.total_prompts;
    }
  } catch (err) {
    console.error('Failed to load analytics:', err);
    // Fallback to old method if RPC doesn't exist yet
    try {
      const { data: users } = await supabase.from('user_usage').select('*');
      if (users) {
        document.getElementById('stat-total-users').textContent = users.length;
        document.getElementById('stat-pro-users').textContent = users.filter(u => u.is_pro).length;
        document.getElementById('stat-total-prompts').textContent = users.reduce((sum, u) => sum + (u.prompts_count || 0), 0);
      }
    } catch (e) {}
  }
}

// Load users table - gets ALL auth users via RPC
async function loadUsersTable() {
  const tbody = document.getElementById('users-table-body');

  try {
    // Use RPC function to get all auth users with their usage data
    const { data: users, error } = await supabase.rpc('get_all_users_for_admin');

    if (error) {
      console.error('RPC error:', error);
      // Fallback to old method if RPC doesn't exist
      return await loadUsersTableFallback();
    }

    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No users found</td></tr>';
      return;
    }

    // Build table rows
    tbody.innerHTML = users.map(user => {
      const isPro = user.is_pro || false;
      const lastActive = user.last_reset_at ? formatDate(user.last_reset_at) : 'Never';
      const email = user.email || 'No email';
      const prompts = user.prompts_count || 0;

      return `
        <tr data-user-id="${user.user_id}">
          <td>${escapeHtml(email)}</td>
          <td>${prompts}</td>
          <td><span class="badge ${isPro ? 'badge-pro' : 'badge-free'}">${isPro ? 'Pro' : 'Free'}</span></td>
          <td>${lastActive}</td>
          <td>
            <button class="toggle-pro-btn ${isPro ? 'is-pro' : ''}" data-user-id="${user.user_id}" data-is-pro="${isPro}">
              ${isPro ? '→ Free' : '→ Pro'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Add click handlers for toggle buttons
    tbody.querySelectorAll('.toggle-pro-btn').forEach(btn => {
      btn.addEventListener('click', handleProToggle);
    });

  } catch (err) {
    console.error('Failed to load users:', err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #ef4444;">Error loading users</td></tr>';
  }
}

// Fallback if RPC function doesn't exist yet
async function loadUsersTableFallback() {
  const tbody = document.getElementById('users-table-body');

  const { data: users, error } = await supabase
    .from('user_usage')
    .select('*')
    .order('last_reset_at', { ascending: false });

  if (error || !users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">No users found (run SQL setup)</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const isPro = user.is_pro;
    const lastActive = user.last_reset_at ? formatDate(user.last_reset_at) : 'Never';
    const email = user.email || user.user_id.substring(0, 8) + '...';

    return `
      <tr data-user-id="${user.user_id}">
        <td>${escapeHtml(email)}</td>
        <td>${user.prompts_count || 0}</td>
        <td><span class="badge ${isPro ? 'badge-pro' : 'badge-free'}">${isPro ? 'Pro' : 'Free'}</span></td>
        <td>${lastActive}</td>
        <td>
          <button class="toggle-pro-btn ${isPro ? 'is-pro' : ''}" data-user-id="${user.user_id}" data-is-pro="${isPro}">
            ${isPro ? '→ Free' : '→ Pro'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.toggle-pro-btn').forEach(btn => {
    btn.addEventListener('click', handleProToggle);
  });
}

// Handle pro status toggle
async function handleProToggle(e) {
  const btn = e.target;
  const userId = btn.dataset.userId;
  const currentlyPro = btn.dataset.isPro === 'true';
  const newProStatus = !currentlyPro;

  // Disable button during update
  btn.disabled = true;
  btn.textContent = '...';

  try {
    // Use RPC function to toggle pro status (handles insert/update)
    const { data, error } = await supabase.rpc('toggle_user_pro_status', {
      target_user_id: userId,
      new_pro_status: newProStatus
    });

    if (error) {
      console.error('RPC error:', error);
      // Fallback to direct update if RPC doesn't exist
      const { error: updateError } = await supabase
        .from('user_usage')
        .update({ is_pro: newProStatus })
        .eq('user_id', userId);

      if (updateError) throw new Error(updateError.message);
    }

    // Update UI
    btn.dataset.isPro = newProStatus.toString();
    btn.textContent = newProStatus ? '→ Free' : '→ Pro';
    btn.classList.toggle('is-pro', newProStatus);

    // Update badge in same row
    const row = btn.closest('tr');
    const badge = row.querySelector('.badge');
    badge.className = `badge ${newProStatus ? 'badge-pro' : 'badge-free'}`;
    badge.textContent = newProStatus ? 'Pro' : 'Free';

    // Refresh analytics
    await loadAnalytics();

    showNotification(`User ${newProStatus ? 'upgraded to Pro' : 'downgraded to Free'}`);
  } catch (err) {
    console.error('Failed to toggle pro status:', err);
    showNotification(`Failed: ${err.message}`);
    btn.textContent = currentlyPro ? '→ Free' : '→ Pro';
  } finally {
    btn.disabled = false;
  }
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle AI provider change
aiProviderSelect?.addEventListener('change', () => {
  const provider = aiProviderSelect.value;
  chrome.storage.sync.set({ aiProvider: provider }, () => {
    showNotification(`AI provider set to: ${provider}`);
  });
});

// Handle logout from settings page
settingsLogoutBtn?.addEventListener('click', async () => {
  try {
    await supabase.auth.signOut();
    accountEmailEl.textContent = 'Not signed in';
    foundersPanel.classList.remove('visible');
    showNotification('Signed out successfully');
  } catch (err) {
    showNotification('Failed to sign out');
  }
});

// Handle form submission
settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const overlayPosition = overlayPositionSelect.value;

  // Save settings
  chrome.storage.sync.set(
    {
      overlayPosition: overlayPosition
    },
    () => {
      showNotification('Settings saved successfully!');
    }
  );
});

// Show notification
function showNotification(message) {
  const notificationText = notification.querySelector('.notification-text');
  notificationText.textContent = message;
  notification.classList.add('show', 'success');

  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}
