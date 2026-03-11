// Oddvision Options Script - Enhanced Admin Panel
//
// Features: Tabbed interface, Usage analytics, User management
//

// DOM Elements
const settingsForm = document.getElementById('settings-form');
const notification = document.getElementById('notification');
const overlayPositionSelect = document.getElementById('overlay-position');
const accountEmailEl = document.getElementById('account-email');
const logoutBtn = document.getElementById('logout-btn');
const adminTab = document.getElementById('admin-tab');
const aiProviderSelect = document.getElementById('ai-provider');
const userSearchInput = document.getElementById('user-search');

// State
let currentPeriod = 'today';
let allUsers = [];
let usageData = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await initPage();
  setupTabs();
  setupPeriodTabs();
  setupSearch();
});

async function initPage() {
  // Load overlay position
  chrome.storage.sync.get(['overlayPosition'], (result) => {
    overlayPositionSelect.value = result.overlayPosition || 'top-right';
  });

  // Check session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      accountEmailEl.textContent = session.user.email;

      // Check founder status
      const isFounder = OddvisionConfig.founderIds?.includes(session.user.id);
      if (isFounder) {
        adminTab.classList.remove('hidden');
        loadAdminData();
      }
    } else {
      accountEmailEl.textContent = 'Not signed in';
    }
  } catch (err) {
    accountEmailEl.textContent = 'Error';
  }
}

// Tab Navigation
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      
      // Update tab buttons
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update tab content
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });
}

// Period Tabs for Analytics
function setupPeriodTabs() {
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPeriod = tab.dataset.period;
      updateStatsDisplay();
    });
  });
}

// Search functionality
function setupSearch() {
  userSearchInput?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterUsersTable(query);
  });
}

function filterUsersTable(query) {
  const rows = document.querySelectorAll('#users-table-body tr');
  rows.forEach(row => {
    const email = row.querySelector('.user-email')?.textContent.toLowerCase() || '';
    row.style.display = email.includes(query) ? '' : 'none';
  });
}

// Load Admin Data
async function loadAdminData() {
  await Promise.all([
    loadAnalytics(),
    loadUsersTable(),
    loadUsageChart()
  ]);
  
  // Load AI provider setting
  chrome.storage.sync.get(['aiProvider'], (result) => {
    if (aiProviderSelect) {
      aiProviderSelect.value = result.aiProvider || 'default';
    }
  });
}

// Load Analytics
async function loadAnalytics() {
  try {
    // Try RPC first
    const { data, error } = await supabase.rpc('get_admin_stats_detailed');
    
    if (error) {
      // Fallback to basic query
      return await loadAnalyticsFallback();
    }
    
    if (data) {
      usageData = data;
      updateStatsDisplay();
    }
  } catch (err) {
    console.error('Analytics error:', err);
    await loadAnalyticsFallback();
  }
}

async function loadAnalyticsFallback() {
  try {
    const { data: users } = await supabase.from('user_usage').select('*');
    const { data: logs } = await supabase.from('usage_logs').select('created_at');
    
    if (users) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(todayStart);
      monthStart.setMonth(monthStart.getMonth() - 1);
      
      const totalPrompts = users.reduce((sum, u) => sum + (u.prompts_count || 0), 0);
      
      // Count logs by period
      let todayPrompts = 0, weekPrompts = 0, monthPrompts = 0;
      if (logs) {
        logs.forEach(log => {
          const logDate = new Date(log.created_at);
          if (logDate >= todayStart) todayPrompts++;
          if (logDate >= weekStart) weekPrompts++;
          if (logDate >= monthStart) monthPrompts++;
        });
      }
      
      // Count active users today
      const activeToday = users.filter(u => {
        const lastActive = new Date(u.last_reset_at);
        return lastActive >= todayStart;
      }).length;
      
      usageData = {
        total_users: users.length,
        pro_users: users.filter(u => u.is_pro).length,
        active_today: activeToday,
        prompts_today: todayPrompts,
        prompts_week: weekPrompts,
        prompts_month: monthPrompts,
        prompts_all: totalPrompts
      };
      
      updateStatsDisplay();
    }
  } catch (err) {
    console.error('Fallback analytics error:', err);
  }
}

function updateStatsDisplay() {
  const d = usageData;
  
  document.getElementById('stat-total-users').textContent = d.total_users || 0;
  document.getElementById('stat-pro-users').textContent = d.pro_users || 0;
  document.getElementById('stat-active-today').textContent = d.active_today || 0;
  
  // Update prompts based on period
  let promptCount = 0;
  switch (currentPeriod) {
    case 'today':
      promptCount = d.prompts_today || 0;
      break;
    case 'week':
      promptCount = d.prompts_week || 0;
      break;
    case 'month':
      promptCount = d.prompts_month || 0;
      break;
    case 'all':
      promptCount = d.prompts_all || 0;
      break;
  }
  
  document.getElementById('stat-prompts-period').textContent = formatNumber(promptCount);
  
  // Average per user
  const avgPerUser = d.total_users > 0 ? (promptCount / d.total_users).toFixed(1) : '0';
  document.getElementById('stat-avg-prompts').textContent = avgPerUser;
}

// Load Usage Chart
async function loadUsageChart() {
  const chartContainer = document.getElementById('usage-chart');
  
  try {
    // Get last 7 days of usage
    const { data: logs, error } = await supabase
      .from('usage_logs')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (error) throw error;
    
    // Group by day
    const days = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      days[key] = { count: 0, label: dayNames[date.getDay()] };
    }
    
    // Count logs per day
    if (logs) {
      logs.forEach(log => {
        const key = log.created_at.split('T')[0];
        if (days[key]) {
          days[key].count++;
        }
      });
    }
    
    // Find max for scaling
    const maxCount = Math.max(...Object.values(days).map(d => d.count), 1);
    
    // Build chart HTML
    chartContainer.innerHTML = Object.entries(days).map(([date, data]) => {
      const height = Math.max((data.count / maxCount) * 160, 4);
      return `
        <div class="chart-bar-wrapper">
          <div class="chart-bar" style="height: ${height}px;">
            <span class="chart-bar-value">${data.count}</span>
          </div>
          <span class="chart-bar-label">${data.label}</span>
        </div>
      `;
    }).join('');
    
  } catch (err) {
    console.error('Chart error:', err);
    chartContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Unable to load chart data</div>';
  }
}

// Load Users Table
async function loadUsersTable() {
  const tbody = document.getElementById('users-table-body');
  
  try {
    // Try RPC function for full user data
    let users;
    const { data, error } = await supabase.rpc('get_all_users_for_admin');
    
    if (error) {
      // Fallback to direct query
      const { data: fallbackData } = await supabase
        .from('user_usage')
        .select('*')
        .order('last_reset_at', { ascending: false });
      users = fallbackData;
    } else {
      users = data;
    }
    
    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">No users found</td></tr>';
      return;
    }
    
    allUsers = users;
    renderUsersTable(users);
    
  } catch (err) {
    console.error('Users table error:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--red);">Error loading users</td></tr>';
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  const limit = 5; // Free user limit

  tbody.innerHTML = users.map(user => {
    const isPro = user.is_pro || false;
    const email = user.email || 'Unknown';
    const weekPrompts = user.prompts_count || 0;
    const totalPrompts = user.total_prompts || weekPrompts;
    const lastActive = formatRelativeDate(user.last_reset_at);
    const initial = email.charAt(0).toUpperCase();
    const userId = user.user_id;

    // Pro expiry info
    const proExpiresAt = user.pro_expires_at;
    const proGrantedBy = user.pro_granted_by;
    const expiryInfo = getExpiryInfo(isPro, proExpiresAt, proGrantedBy);

    // Usage percentage for bar
    const usagePercent = isPro ? 30 : Math.min((weekPrompts / limit) * 100, 100);
    const isHighUsage = !isPro && weekPrompts >= limit;

    return `
      <tr data-user-id="${userId}">
        <td>
          <div class="user-cell">
            <div class="user-avatar">${initial}</div>
            <div class="user-info">
              <span class="user-email">${escapeHtml(email)}</span>
              <span class="user-id">${userId.substring(0, 8)}...</span>
            </div>
          </div>
        </td>
        <td><span class="badge ${isPro ? 'badge-pro' : 'badge-free'}">${isPro ? 'Pro' : 'Free'}</span></td>
        <td><span class="expiry-info ${expiryInfo.class}">${expiryInfo.text}</span></td>
        <td>
          <div class="usage-bar-container">
            <span>${weekPrompts}${isPro ? '' : `/${limit}`}</span>
            <div class="usage-bar">
              <div class="usage-bar-fill ${isHighUsage ? 'high' : ''}" style="width: ${usagePercent}%"></div>
            </div>
          </div>
        </td>
        <td>${formatNumber(totalPrompts)}</td>
        <td>${lastActive}</td>
        <td>
          <button class="toggle-pro-btn ${isPro ? 'is-pro' : ''}" data-user-id="${userId}" data-is-pro="${isPro}" data-expires="${proExpiresAt || ''}" data-granted-by="${proGrantedBy || ''}">
            ${isPro ? 'Remove Pro' : 'Make Pro'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners
  tbody.querySelectorAll('.toggle-pro-btn').forEach(btn => {
    btn.addEventListener('click', handleProToggle);
  });
}

// Get expiry info for display
function getExpiryInfo(isPro, expiresAt, grantedBy) {
  if (!isPro) {
    return { text: '—', class: '' };
  }

  // Founder-granted (never expires)
  if (grantedBy) {
    return { text: 'Never (Founder)', class: 'founder' };
  }

  // No expiry set (legacy or unlimited)
  if (!expiresAt) {
    return { text: 'Never', class: 'founder' };
  }

  // Check expiry
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: 'Expired', class: 'expired' };
  }

  if (diffDays <= 7) {
    return { text: `${diffDays}d left`, class: 'warning' };
  }

  return { text: `${diffDays}d left`, class: '' };
}

// Handle Pro Status Toggle
async function handleProToggle(e) {
  const btn = e.target;
  const userId = btn.dataset.userId;
  const currentlyPro = btn.dataset.isPro === 'true';
  const newStatus = !currentlyPro;

  // If granting pro, ask about expiry
  let expiresInDays = null;
  if (newStatus) {
    const choice = prompt(
      'Grant Pro Status:\n\n' +
      'Enter number of days for paid pro (e.g., 30)\n' +
      'Or leave empty for founder-granted (never expires)',
      ''
    );

    if (choice === null) {
      return; // User cancelled
    }

    if (choice.trim() !== '') {
      const days = parseInt(choice.trim(), 10);
      if (isNaN(days) || days <= 0) {
        showNotification('Invalid number of days');
        return;
      }
      expiresInDays = days;
    }
    // null = founder-granted (never expires)
  }

  btn.disabled = true;
  btn.textContent = '...';

  try {
    // Try RPC with expiry parameter
    const { error } = await supabase.rpc('toggle_user_pro_status', {
      target_user_id: userId,
      new_pro_status: newStatus,
      expires_in_days: expiresInDays
    });

    if (error) {
      console.error('RPC error:', error);
      // Fallback to direct update (without expiry support)
      const { error: updateError } = await supabase
        .from('user_usage')
        .update({ is_pro: newStatus })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    }

    // Refresh the entire table to get updated expiry info
    await loadUsersTable();

    // Refresh analytics
    await loadAnalytics();

    const msg = newStatus
      ? (expiresInDays ? `Granted ${expiresInDays}-day Pro` : 'Granted permanent Pro')
      : 'Removed Pro status';
    showNotification(msg);

  } catch (err) {
    console.error('Toggle error:', err);
    showNotification('Failed to update user');
    btn.textContent = currentlyPro ? 'Remove Pro' : 'Make Pro';
  } finally {
    btn.disabled = false;
  }
}

// AI Provider Change
aiProviderSelect?.addEventListener('change', () => {
  chrome.storage.sync.set({ aiProvider: aiProviderSelect.value }, () => {
    showNotification(`Provider set to: ${aiProviderSelect.value}`);
  });
});

// Logout
logoutBtn?.addEventListener('click', async () => {
  try {
    await supabase.auth.signOut();
    accountEmailEl.textContent = 'Not signed in';
    adminTab.classList.add('hidden');
    
    // Switch to settings tab
    document.querySelector('.tab[data-tab="settings"]').click();
    
    showNotification('Signed out');
  } catch (err) {
    showNotification('Failed to sign out');
  }
});

// Settings Form
settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  chrome.storage.sync.set({ overlayPosition: overlayPositionSelect.value }, () => {
    showNotification('Settings saved!');
  });
});

// Helper Functions
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatRelativeDate(dateString) {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message) {
  const notificationText = notification.querySelector('.notification-text');
  notificationText.textContent = message;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}
