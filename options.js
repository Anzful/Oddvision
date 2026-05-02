// Oddvision Options Script - Mission Control Analytics v2
//
// Features: Date-range chart, bar click drill-down, sortable/filterable user table,
//           accurate analytics from usage_logs (not resetting prompts_count).

// ── DOM Elements ──────────────────────────────────────────────────────────────
const settingsForm         = document.getElementById('settings-form');
const notification         = document.getElementById('notification');
const overlayPositionSelect = document.getElementById('overlay-position');
const accountEmailEl       = document.getElementById('account-email');
const logoutBtn            = document.getElementById('logout-btn');
const adminTab             = document.getElementById('admin-tab');
const userSearchInput      = document.getElementById('user-search');

// ── State ─────────────────────────────────────────────────────────────────────
let currentPeriod     = 'today';
let allUsers          = [];
let usageData         = {};
let chartData         = [];    // [{ day, prompt_count, unique_users }]
let chartRange        = 30;    // days shown by default
let chartMetric       = 'prompts'; // 'prompts' | 'users'
let customRangeStart  = null;
let customRangeEnd    = null;
let sortColumn        = 'last_active_at';
let sortDirection     = 'desc';
let statusFilter      = 'all'; // 'all' | 'pro' | 'free'
let selectedDays      = new Set(); // ISO date strings (yyyy-mm-dd) — multi-select bars
let usersTableReqId   = 0;         // last-write-wins token for concurrent table reloads

// ── Initialize ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await initPage();
  setupTabs();
  setupPeriodTabs();
  setupSearch();
  setupAnalyticsControls();
  setupMetricToggle();
  setupTableSort();
  setupStatusFilter();
  setupDayDetailClose();
});

async function initPage() {
  chrome.storage.sync.get(['overlayPosition'], (result) => {
    overlayPositionSelect.value = result.overlayPosition || 'top-right';
  });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      accountEmailEl.textContent = session.user.email;
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

// ── Tab Navigation ────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');

      // Re-scroll chart to today (rightmost bar) when admin tab becomes visible
      if (tabId === 'admin') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const wrapper = document.querySelector('.chart-scroll-wrapper');
            if (wrapper) wrapper.scrollLeft = wrapper.scrollWidth;
          });
        });
      }
    });
  });
}

// ── Period Tabs (stats cards) ─────────────────────────────────────────────────
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

// ── Analytics Date-Range Controls ─────────────────────────────────────────────
function setupAnalyticsControls() {
  const rangeBtns      = document.querySelectorAll('.range-btn');
  const customInputs   = document.getElementById('custom-range-inputs');
  const applyBtn       = document.getElementById('apply-range');
  const rangeStartEl   = document.getElementById('range-start');
  const rangeEndEl     = document.getElementById('range-end');

  // Pre-fill custom inputs with a sensible default (local/Tbilisi date)
  const today = new Date();
  rangeEndEl.value = localDateStr(today);
  const ago30 = new Date(today);
  ago30.setDate(ago30.getDate() - 29);
  rangeStartEl.value = localDateStr(ago30);

  rangeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      rangeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const days = btn.dataset.days;
      if (days === 'custom') {
        customInputs.classList.remove('hidden');
      } else {
        customInputs.classList.add('hidden');
        chartRange       = parseInt(days, 10);
        customRangeStart = null;
        customRangeEnd   = null;
        loadChartData();
      }
    });
  });

  applyBtn?.addEventListener('click', () => {
    const s = rangeStartEl.value;
    const e = rangeEndEl.value;
    if (s && e && s <= e) {
      customRangeStart = s;
      customRangeEnd   = e;
      loadChartData();
    }
  });
}

// ── Metric Toggle (Prompts / Unique Users) ────────────────────────────────────
function setupMetricToggle() {
  document.querySelectorAll('.metric-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.metric-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chartMetric = btn.dataset.metric;
      renderChart(chartData);
    });
  });
}

// ── Table Sort ────────────────────────────────────────────────────────────────
function setupTableSort() {
  document.querySelectorAll('.users-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (sortColumn === col) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn    = col;
        sortDirection = 'desc';
      }
      updateSortIcons();
      applyFilters();
    });
  });
  // Set initial icon state
  updateSortIcons();
}

function updateSortIcons() {
  document.querySelectorAll('.users-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === sortColumn) {
      th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

// ── Status Filter ─────────────────────────────────────────────────────────────
function setupStatusFilter() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      statusFilter = btn.dataset.filter;
      applyFilters();
    });
  });
}

// ── Search ────────────────────────────────────────────────────────────────────
function setupSearch() {
  userSearchInput?.addEventListener('input', () => applyFilters());
}

// ── Combined Filter + Sort + Render ──────────────────────────────────────────
function applyFilters() {
  const query = (userSearchInput?.value || '').toLowerCase();

  let filtered = allUsers.filter(user => {
    const email         = (user.email || '').toLowerCase();
    const matchSearch   = email.includes(query);
    const matchStatus   =
      statusFilter === 'all'  ? true :
      statusFilter === 'pro'  ? !!user.is_pro :
      /* free */                !user.is_pro;
    return matchSearch && matchStatus;
  });

  filtered = sortUsers(filtered, sortColumn, sortDirection);
  renderUsersTable(filtered);
  updateUserCountLabel(filtered.length, allUsers.length);
}

function sortUsers(users, col, dir) {
  const dateCols = new Set(['created_at', 'last_reset_at', 'last_active_at']);
  return [...users].sort((a, b) => {
    let av = a[col];
    let bv = b[col];

    if (dateCols.has(col)) {
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    } else if (typeof av === 'string') {
      av = av.toLowerCase();
      bv = (bv || '').toLowerCase();
    } else {
      av = Number(av) || 0;
      bv = Number(bv) || 0;
    }

    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

function updateUserCountLabel(shown, total) {
  const el = document.getElementById('user-count-label');
  if (!el) return;
  el.textContent = shown === total ? `(${total})` : `(${shown} / ${total})`;
}

// ── Day Detail Panel (supports multi-select) ─────────────────────────────────
function setupDayDetailClose() {
  document.getElementById('close-day-detail')?.addEventListener('click', () => {
    selectedDays.clear();
    document.querySelectorAll('#usage-chart .chart-bar.selected')
      .forEach(b => b.classList.remove('selected'));
    onSelectionChange();
  });
}

// Builds a human header for the current selection
function describeSelection() {
  const days = Array.from(selectedDays).sort();
  if (days.length === 0) return '';

  const fmt = d => new Date(d + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  if (days.length === 1) {
    const d = new Date(days[0] + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Check if contiguous (consecutive calendar days)
  const first = new Date(days[0] + 'T00:00:00');
  const last  = new Date(days[days.length - 1] + 'T00:00:00');
  const span  = Math.round((last - first) / 86_400_000) + 1;
  const contiguous = span === days.length;

  if (contiguous) return `${fmt(days[0])} → ${fmt(days[days.length - 1])} · ${days.length} days`;
  if (days.length <= 4) return days.map(fmt).join(', ');
  return `${days.length} days selected`;
}

// Called when selection changes (after table re-fetches with new range)
function updateDayDetailPanel() {
  const panel = document.getElementById('day-detail-panel');
  if (selectedDays.size === 0) { panel.classList.remove('visible'); return; }

  document.getElementById('day-detail-date').textContent = describeSelection();

  // Aggregate prompts from chartData (single source of truth for the chart)
  const sumPrompts = chartData
    .filter(r => selectedDays.has(r.day))
    .reduce((acc, r) => acc + (r.prompt_count || 0), 0);

  document.getElementById('day-detail-prompts').textContent = formatNumber(sumPrompts);

  // Unique users = count of users with any usage in the selected range
  const usersWithUsage = allUsers.filter(u => (u.range_prompts || 0) > 0).length;
  document.getElementById('day-detail-users').textContent = formatNumber(usersWithUsage);

  panel.classList.add('visible');
}

function hideDayDetail() {
  document.getElementById('day-detail-panel').classList.remove('visible');
}

// ── Load Admin Data ───────────────────────────────────────────────────────────
async function loadAdminData() {
  await Promise.all([
    loadAnalytics(),
    loadUsersTable(),
    loadChartData(),
  ]);
}

// ── Analytics (Stats Cards) ───────────────────────────────────────────────────
async function loadAnalytics() {
  try {
    const { data, error } = await supabase.rpc('get_admin_stats_detailed');
    if (error) return loadAnalyticsFallback();
    if (data) { usageData = data; updateStatsDisplay(); }
  } catch (_) {
    loadAnalyticsFallback();
  }
}

async function loadAnalyticsFallback() {
  try {
    const { data: users } = await supabase.from('user_usage').select('*');
    const { data: logs  } = await supabase.from('usage_logs').select('created_at, user_id');

    if (!users) return;

    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart); monthStart.setMonth(monthStart.getMonth() - 1);

    let todayPrompts = 0, weekPrompts = 0, monthPrompts = 0, allPrompts = 0;
    const activeTodaySet = new Set();

    (logs || []).forEach(log => {
      const d = new Date(log.created_at);
      allPrompts++;
      if (d >= monthStart) monthPrompts++;
      if (d >= weekStart)  weekPrompts++;
      if (d >= todayStart) { todayPrompts++; activeTodaySet.add(log.user_id); }
    });

    const proUsers   = users.filter(u => u.is_pro).length;
    const totalUsers = users.length;

    usageData = {
      total_users:     totalUsers,
      pro_users:       proUsers,
      free_users:      users.filter(u => !u.is_pro).length,
      conversion_rate: totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : '0',
      active_today:    activeTodaySet.size,
      new_users_today: 0,
      prompts_today:   todayPrompts,
      prompts_week:    weekPrompts,
      prompts_month:   monthPrompts,
      prompts_all:     allPrompts,
    };
    updateStatsDisplay();
  } catch (err) {
    console.error('Fallback analytics error:', err);
  }
}

function updateStatsDisplay() {
  const d = usageData;

  document.getElementById('stat-total-users').textContent  = formatNumber(d.total_users || 0);
  document.getElementById('stat-pro-users').textContent    = formatNumber(d.pro_users   || 0);
  document.getElementById('stat-free-users').textContent   = formatNumber(d.free_users  || 0);
  document.getElementById('stat-active-today').textContent = formatNumber(d.active_today    || 0);
  document.getElementById('stat-new-today').textContent    = formatNumber(d.new_users_today || 0);

  let count = 0;
  let label = 'Prompts Today';
  switch (currentPeriod) {
    case 'today': count = d.prompts_today  || 0; label = 'Prompts Today';  break;
    case 'week':  count = d.prompts_week   || 0; label = 'Prompts (7d)';   break;
    case 'month': count = d.prompts_month  || 0; label = 'Prompts (30d)';  break;
    case 'all':   count = d.prompts_all    || 0; label = 'Prompts (All)';  break;
  }
  document.getElementById('stat-prompts-period').textContent = formatNumber(count);
  document.getElementById('stat-prompts-label').textContent  = label;
}

// ── Chart Data Loader ─────────────────────────────────────────────────────────
async function loadChartData() {
  const chartEl = document.getElementById('usage-chart');
  chartEl.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
  // Changing the chart range invalidates the prior selection
  const hadSelection = selectedDays.size > 0;
  selectedDays.clear();
  hideDayDetail();
  setUsageColLabel('today');
  if (hadSelection) loadUsersTable(); // revert users table to today's data

  try {
    let startDate, endDate;

    if (customRangeStart && customRangeEnd) {
      startDate = new Date(customRangeStart + 'T00:00:00');
      endDate   = new Date(customRangeEnd   + 'T23:59:59');
    } else {
      endDate   = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - (chartRange - 1));
      startDate.setHours(0, 0, 0, 0);
    }

    const { data, error } = await supabase.rpc('get_chart_data', {
      p_start: startDate.toISOString(),
      p_end:   endDate.toISOString(),
    });
    if (error) throw error;

    // Build a full day-by-day array (fill missing days with zeros)
    // Use local (Tbilisi) date keys to match the RPC's Asia/Tbilisi grouping
    const dayMap = {};
    (data || []).forEach(row => { dayMap[row.day] = row; });

    chartData = [];
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (cur <= end) {
      const key = localDateStr(cur);
      chartData.push({
        day:           key,
        prompt_count:  Number(dayMap[key]?.prompt_count  || 0),
        unique_users:  Number(dayMap[key]?.unique_users  || 0),
        flash30_count: Number(dayMap[key]?.flash30_count || 0),
        flash25_count: Number(dayMap[key]?.flash25_count || 0),
        flash20_count: Number(dayMap[key]?.flash20_count || 0),
        other_count:   Number(dayMap[key]?.other_count   || 0),
      });
      cur.setDate(cur.getDate() + 1);
    }

    renderChart(chartData);
  } catch (err) {
    console.error('Chart error:', err);
    chartEl.innerHTML =
      '<div style="text-align:center;color:var(--text-muted);padding:40px;">Unable to load chart data</div>';
  }
}

// ── Chart Renderer ────────────────────────────────────────────────────────────

// Build stacked model-color segments inside a bar
function buildModelSegments(row) {
  const f30   = row.flash30_count || 0;
  const f25   = row.flash25_count || 0;
  const f20   = row.flash20_count || 0;
  const other = row.other_count   || 0;
  const total = f30 + f25 + f20 + other;

  if (total === 0) {
    // Fallback: single neutral bar
    return `<div class="bar-seg" style="flex:1;background:var(--accent);"></div>`;
  }

  // Rendered top→bottom in DOM (flex-direction:column), so top=first in list
  // Visual stacking: Other (gray) at top, Flash 3.0 (darkest) at bottom
  const segs = [
    { count: other, color: '#374151' },  // top
    { count: f20,   color: '#a78bfa' },
    { count: f25,   color: '#7c3aed' },
    { count: f30,   color: '#4c1d95' },  // bottom (darkest)
  ].filter(s => s.count > 0);

  return segs.map((s, i) => {
    const isTop    = i === 0;
    const isBottom = i === segs.length - 1;
    const radius   = isTop && isBottom ? '8px 8px 4px 4px'
                   : isTop             ? '8px 8px 0 0'
                   : isBottom          ? '0 0 4px 4px'
                   : '0';
    return `<div class="bar-seg" style="flex:${s.count};background:${s.color};border-radius:${radius};"></div>`;
  }).join('');
}

function renderChart(data) {
  const chartEl = document.getElementById('usage-chart');
  if (!data || data.length === 0) {
    chartEl.innerHTML =
      '<div style="text-align:center;color:var(--text-muted);padding:40px;">No data for this range</div>';
    return;
  }

  const getValue = row =>
    chartMetric === 'users' ? (row.unique_users || 0) : (row.prompt_count || 0);
  const maxVal = Math.max(...data.map(getValue), 1);

  // Fixed-width bars so date labels line up perfectly
  const barWidth =
    data.length <= 14 ? 56 :
    data.length <= 30 ? 44 :
    data.length <= 60 ? 32 :
    24;
  const gap =
    data.length <= 14 ? 12 :
    data.length <= 30 ?  8 :
    4;
  const labelStep =
    data.length <= 30 ? 1 :
    data.length <= 60 ? 2 :
    7;

  chartEl.style.gap = `${gap}px`;
  // Use local (Tbilisi) date to match the RPC's Asia/Tbilisi grouping
  const todayKey = localDateStr(new Date());

  chartEl.innerHTML = data.map((row, i) => {
    const val        = getValue(row);
    const height     = Math.max((val / maxVal) * 160, val > 0 ? 5 : 2);
    const date       = new Date(row.day + 'T00:00:00');
    const label      = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isToday    = row.day === todayKey;
    const isSelected = selectedDays.has(row.day);
    const showLbl    = (i === 0) || (i === data.length - 1) || (i % labelStep === 0);

    const segments = chartMetric === 'prompts' ? buildModelSegments(row) :
      `<div class="bar-seg" style="flex:1;background:var(--accent);"></div>`;

    return `
      <div class="chart-bar-wrapper" style="width:${barWidth}px;" data-index="${i}">
        <div class="chart-bar${isToday ? ' today-bar' : ''}${isSelected ? ' selected' : ''}"
             style="height:${height}px;" data-index="${i}" data-day="${row.day}">
          ${segments}
          <span class="chart-bar-value">${val}</span>
        </div>
        <span class="chart-bar-label" ${showLbl ? '' : 'style="visibility:hidden"'}>${label}</span>
      </div>`;
  }).join('');

  // Bar click → toggle multi-select
  chartEl.querySelectorAll('.chart-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      const day = bar.dataset.day;
      if (selectedDays.has(day)) {
        selectedDays.delete(day);
        bar.classList.remove('selected');
      } else {
        selectedDays.add(day);
        bar.classList.add('selected');
      }
      onSelectionChange();
    });
  });

  // Scroll today's bar (rightmost) into view.
  // Double rAF ensures layout is fully painted before measuring scrollWidth.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const wrapper = chartEl.closest('.chart-scroll-wrapper');
      if (wrapper) wrapper.scrollLeft = wrapper.scrollWidth;
    });
  });
}

// Called whenever selectedDays changes — updates panel + reloads users table
function onSelectionChange() {
  if (selectedDays.size === 0) {
    hideDayDetail();
    setUsageColLabel('today');
    loadUsersTable(); // default = today
    return;
  }
  updateDayDetailPanel();
  setUsageColLabel(selectedDays.size === 1 ? '1 day' : `${selectedDays.size} days`);
  loadUsersTable(Array.from(selectedDays).sort());
}

function setUsageColLabel(text) {
  const el = document.getElementById('usage-col-sub');
  if (el) el.textContent = text;
}

// ── Users Table ───────────────────────────────────────────────────────────────
// `days` = array of yyyy-mm-dd strings to count usage over.
//          null/undefined → backend defaults to today (UTC)
async function loadUsersTable(days = null) {
  const tbody = document.getElementById('users-table-body');
  const reqId = ++usersTableReqId;

  try {
    const { data, error } = await supabase.rpc('get_users_table_data', {
      p_days: days && days.length ? days : null,
    });

    // A newer request superseded this one — drop the result
    if (reqId !== usersTableReqId) return;

    let users;
    if (error) {
      console.warn('get_users_table_data failed, falling back:', error);
      const { data: fb } = await supabase.rpc('get_all_users_for_admin');
      if (reqId !== usersTableReqId) return;
      users = (fb || []).map(u => ({
        ...u,
        range_prompts:    u.prompts_count || 0,
        lifetime_prompts: u.total_prompts || 0,
        last_active_at:   u.last_reset_at,
      }));
    } else {
      users = data || [];
    }

    if (!users || users.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No users found</td></tr>';
      return;
    }

    allUsers = users;
    applyFilters();

    // If selection is active, refresh the day-detail panel's "unique users" count
    if (selectedDays.size > 0) updateDayDetailPanel();
  } catch (err) {
    if (reqId !== usersTableReqId) return;
    console.error('Users table error:', err);
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--red);">Error loading users</td></tr>';
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  const FREE_LIMIT = 5;

  if (users.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">No users match the current filter</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const isPro        = user.is_pro || false;
    const email        = user.email || 'Unknown';
    // Usage = prompts in selected range (today by default), counted from usage_logs
    const rangeUsage   = Number(user.range_prompts || 0);
    // Lifetime = total prompts ever, counted from usage_logs
    const lifetime     = Number(user.lifetime_prompts || 0);
    const initial      = email.charAt(0).toUpperCase();
    const userId       = user.user_id;

    const expiryInfo = getExpiryInfo(isPro, user.pro_expires_at, user.pro_granted_by);
    // Bar width: free users capped at 5/day; pro users uncapped (visualize against day's max or fixed)
    const usagePct   = isPro
      ? Math.min((rangeUsage / Math.max(rangeUsage, 10)) * 100, 100)
      : Math.min((rangeUsage / FREE_LIMIT) * 100, 100);
    const isHigh     = !isPro && rangeUsage >= FREE_LIMIT;

    const joinedStr     = user.created_at     ? formatRelativeDate(user.created_at)     : '—';
    const lastActiveStr = user.last_active_at ? formatRelativeDate(user.last_active_at) : '—';

    return `
      <tr data-user-id="${userId}">
        <td>
          <div class="user-cell">
            <div class="user-avatar">${initial}</div>
            <div class="user-info">
              <span class="user-email">${escapeHtml(email)}</span>
              <span class="user-id">${userId.substring(0, 8)}…</span>
            </div>
          </div>
        </td>
        <td><span class="badge ${isPro ? 'badge-pro' : 'badge-free'}">${isPro ? 'Pro' : 'Free'}</span></td>
        <td><span class="expiry-info ${expiryInfo.class}">${expiryInfo.text}</span></td>
        <td>
          <div class="usage-bar-container">
            <span>${rangeUsage}${isPro ? '' : `/${FREE_LIMIT}`}</span>
            <div class="usage-bar">
              <div class="usage-bar-fill ${isHigh ? 'high' : ''}" style="width:${usagePct}%"></div>
            </div>
          </div>
        </td>
        <td>${formatNumber(lifetime)}</td>
        <td>${joinedStr}</td>
        <td>${lastActiveStr}</td>
        <td>
          <button class="toggle-pro-btn ${isPro ? 'is-pro' : ''}"
            data-user-id="${userId}"
            data-is-pro="${isPro}"
            data-expires="${user.pro_expires_at || ''}"
            data-granted-by="${user.pro_granted_by || ''}">
            ${isPro ? 'Remove Pro' : 'Make Pro'}
          </button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('.toggle-pro-btn').forEach(btn => {
    btn.addEventListener('click', handleProToggle);
  });
}

// ── Pro Expiry Info ───────────────────────────────────────────────────────────
function getExpiryInfo(isPro, expiresAt, grantedBy) {
  if (!isPro) return { text: '—', class: '' };
  if (grantedBy) return { text: 'Never (Founder)', class: 'founder' };
  if (!expiresAt) return { text: 'Never', class: 'founder' };

  const expiry   = new Date(expiresAt);
  const diffDays = Math.ceil((expiry - new Date()) / 86400000);

  if (diffDays < 0)  return { text: 'Expired',        class: 'expired' };
  if (diffDays <= 7) return { text: `${diffDays}d left`, class: 'warning' };
  return { text: `${diffDays}d left`, class: '' };
}

// ── Pro Status Toggle ─────────────────────────────────────────────────────────
async function handleProToggle(e) {
  const btn          = e.target;
  const userId       = btn.dataset.userId;
  const currentlyPro = btn.dataset.isPro === 'true';
  const newStatus    = !currentlyPro;

  let expiresInDays = null;
  if (newStatus) {
    const choice = prompt(
      'Grant Pro Status:\n\n' +
      'Enter number of days for paid pro (e.g., 30)\n' +
      'Or leave empty for founder-granted (never expires)',
      ''
    );
    if (choice === null) return;
    if (choice.trim() !== '') {
      const days = parseInt(choice.trim(), 10);
      if (isNaN(days) || days <= 0) { showNotification('Invalid number of days'); return; }
      expiresInDays = days;
    }
  }

  btn.disabled = true;
  btn.textContent = '…';

  try {
    const { error } = await supabase.rpc('toggle_user_pro_status', {
      target_user_id: userId,
      new_pro_status: newStatus,
      expires_in_days: expiresInDays,
    });

    if (error) {
      const { error: ue } = await supabase
        .from('user_usage')
        .update({ is_pro: newStatus })
        .eq('user_id', userId);
      if (ue) throw ue;
    }

    await Promise.all([loadUsersTable(), loadAnalytics()]);

    showNotification(
      newStatus
        ? (expiresInDays ? `Granted ${expiresInDays}-day Pro` : 'Granted permanent Pro')
        : 'Removed Pro status'
    );
  } catch (err) {
    console.error('Toggle error:', err);
    showNotification('Failed to update user');
    btn.textContent = currentlyPro ? 'Remove Pro' : 'Make Pro';
  } finally {
    btn.disabled = false;
  }
}

// ── AI Roles ──────────────────────────────────────────────────────────────────
const roleGrid             = document.getElementById('role-grid');
const customPromptSection  = document.getElementById('custom-prompt-section');
const customPromptTextarea = document.getElementById('custom-prompt');

function initRoles() {
  chrome.storage.sync.get(['enabledRoles', 'customRolePrompt'], (result) => {
    const enabledRoles = result.enabledRoles || ['picker'];

    roleGrid.querySelectorAll('.role-card').forEach(card => {
      const role = card.dataset.role;
      card.classList.toggle('enabled', enabledRoles.includes(role));
    });

    if (enabledRoles.includes('custom')) customPromptSection.classList.add('visible');
    if (result.customRolePrompt) customPromptTextarea.value = result.customRolePrompt;
  });

  roleGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.role-card');
    if (!card) return;
    card.classList.toggle('enabled');

    const enabledRoles = [];
    roleGrid.querySelectorAll('.role-card.enabled').forEach(c => enabledRoles.push(c.dataset.role));

    chrome.storage.sync.get(['activeRole'], (result) => {
      const updates = { enabledRoles };
      if (result.activeRole && !enabledRoles.includes(result.activeRole)) {
        updates.activeRole = enabledRoles[0] || 'picker';
      }
      chrome.storage.sync.set(updates);
    });

    if (card.dataset.role === 'custom') {
      customPromptSection.classList.toggle('visible', card.classList.contains('enabled'));
    }
    showNotification('Roles updated');
  });

  let customPromptTimer;
  customPromptTextarea.addEventListener('input', () => {
    clearTimeout(customPromptTimer);
    customPromptTimer = setTimeout(() => {
      chrome.storage.sync.set({ customRolePrompt: customPromptTextarea.value });
      showNotification('Custom prompt saved');
    }, 800);
  });
}

initRoles();

// ── Logout ────────────────────────────────────────────────────────────────────
logoutBtn?.addEventListener('click', async () => {
  try {
    await supabase.auth.signOut();
    accountEmailEl.textContent = 'Not signed in';
    adminTab.classList.add('hidden');
    document.querySelector('.tab[data-tab="settings"]').click();
    showNotification('Signed out');
  } catch (_) {
    showNotification('Failed to sign out');
  }
});

// ── Settings Form ─────────────────────────────────────────────────────────────
settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  chrome.storage.sync.set({ overlayPosition: overlayPositionSelect.value }, () => {
    showNotification('Settings saved!');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
// Returns a yyyy-mm-dd string in the browser's LOCAL timezone (matches Asia/Tbilisi grouping in RPC)
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatNumber(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K';
  return String(num);
}

function formatRelativeDate(dateString) {
  if (!dateString) return 'Never';
  const date     = new Date(dateString);
  const now      = new Date();
  const diffMs   = now - date;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHrs  = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs  < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function showNotification(message) {
  const notificationText = notification.querySelector('.notification-text');
  notificationText.textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}
