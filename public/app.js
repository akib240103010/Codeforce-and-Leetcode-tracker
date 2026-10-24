// ========================================================
// Codeforces & LeetCode Tracker - Frontend Application
// Universal Single-Username Performance Tracer
// ========================================================

// Application State
const state = {
  username: '',
  cfHandle: '',
  lcHandle: '',
  isSplitMode: false,
  cfData: null,
  lcData: null,
  contests: [],
  activeTab: 'overviewTab',
  charts: {
    cfRating: null,
    cfDifficulty: null,
    cfTags: null,
    lcDonut: null,
    lcRating: null
  },
  countdownTimer: null,
  registeredContestIds: JSON.parse(localStorage.getItem('registeredContestIds') || '[]'),
  cfSessionCookie: localStorage.getItem('cfSessionCookie') || '',
  lcSessionCookie: localStorage.getItem('lcSessionCookie') || '',
  cfAccountHandle: localStorage.getItem('cfAccountHandle') || '',
  lcAccountUsername: localStorage.getItem('lcAccountUsername') || '',
  currentContestFilter: 'all'
};

// Rank Colors Mapping for Codeforces
function getCfRankClass(rank) {
  if (!rank) return 'cf-rank-newbie';
  const r = rank.toLowerCase().replace(/\s+/g, '-');
  return `cf-rank-${r}`;
}

// Generate inline SVG Avatar data URI fallback
function generateClientSvgAvatar(name, color1 = '#3b82f6', color2 = '#1d4ed8') {
  const initial = ((name || 'U').charAt(0) || 'U').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(#g)"/><text x="50" y="62" font-size="44" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Bulletproof multi-candidate avatar loader with cascading fallbacks
function setSafeAvatar(imgEl, candidateUrls, name, color1 = '#3b82f6', color2 = '#1d4ed8') {
  if (!imgEl) return;
  imgEl.setAttribute('referrerpolicy', 'no-referrer');

  // Build ordered list of unique valid candidate URLs
  const list = (Array.isArray(candidateUrls) ? candidateUrls : [candidateUrls])
    .filter(u => u && typeof u === 'string' && u.trim().length > 0)
    .map(u => u.trim());

  const uniqueUrls = Array.from(new Set(list));
  let index = 0;

  function tryNext() {
    if (index < uniqueUrls.length) {
      const nextUrl = uniqueUrls[index++];
      imgEl.onerror = tryNext;
      imgEl.src = nextUrl;
    } else {
      imgEl.onerror = null;
      imgEl.src = generateClientSvgAvatar(name, color1, color2);
    }
  }

  tryNext();
}


// Format Unix Timestamp
function formatDateTime(timestampInSeconds) {
  if (!timestampInSeconds) return '--';
  const d = new Date(timestampInSeconds * 1000);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(durationInSeconds) {
  if (!durationInSeconds) return '--';
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours} hrs ${minutes} mins`;
  if (hours > 0) return `${hours} hrs`;
  return `${minutes} mins`;
}

// Show alert banner
function showAlert(message, type = 'error') {
  const banner = document.getElementById('alertBanner');
  const msgEl = document.getElementById('alertMessage');
  if (!banner || !msgEl) return;

  banner.className = `rounded-xl p-4 border text-sm flex items-start justify-between gap-3 ${
    type === 'error'
      ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
      : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
  }`;
  msgEl.textContent = message;
  banner.classList.remove('hidden');
}

function hideAlert() {
  const banner = document.getElementById('alertBanner');
  if (banner) banner.classList.add('hidden');
}

// Toast notification for copying links
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  const msgEl = document.getElementById('toastMessage');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('flex');

  setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('flex');
  }, 3000);
}

// --------------------------------------------------------
// URL QUERY PARSING & INITIALIZATION
// --------------------------------------------------------
function parseInitialHandles() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace('#', '').trim();

  // Robustly extract 'u' query parameter, along with aliases and hash
  const uParam = params.get('u');
  const userParam = params.get('username') || params.get('user') || params.get('handle');
  const directUser = (uParam || userParam || hash || '').trim();
  const cfParam = (params.get('cf') || '').trim();
  const lcParam = (params.get('lc') || '').trim();

  let targetUsername = '';
  let targetCf = '';
  let targetLc = '';
  let isSplit = false;
  let hasExplicitParam = false;

  if (cfParam || lcParam) {
    targetCf = cfParam ? decodeURIComponent(cfParam).replace(/^@+/, '') : '';
    targetLc = lcParam ? decodeURIComponent(lcParam).replace(/^@+/, '') : '';
    targetUsername = targetCf || targetLc || '';
    isSplit = true;
    hasExplicitParam = true;
  } else if (directUser) {
    const cleanUser = decodeURIComponent(directUser).replace(/^@+/, '');
    targetUsername = cleanUser;
    targetCf = cleanUser;
    targetLc = cleanUser;
    isSplit = false;
    hasExplicitParam = true;
  } else {
    // Default fallback from localStorage or default handle
    const savedUser = localStorage.getItem('cp_last_username');
    const savedCf = localStorage.getItem('cp_cf_handle') || savedUser || 'tourist';
    const savedLc = localStorage.getItem('cp_lc_handle') || savedUser || 'neal_wu';
    targetUsername = savedUser || (savedCf === savedLc ? savedCf : savedCf);
    targetCf = savedCf;
    targetLc = savedLc;
    isSplit = savedCf !== savedLc;
    hasExplicitParam = false;
  }

  // Update application state
  state.username = targetUsername;
  state.cfHandle = targetCf;
  state.lcHandle = targetLc;
  state.isSplitMode = isSplit;

  // Sync inputs in UI
  const universalInput = document.getElementById('universalUsernameInput');
  const cfInput = document.getElementById('cfHandleInput');
  const lcInput = document.getElementById('lcHandleInput');

  if (universalInput) universalInput.value = state.username;
  if (cfInput) cfInput.value = state.cfHandle;
  if (lcInput) lcInput.value = state.lcHandle;

  updateSplitModeUI();

  return {
    username: targetUsername,
    cfHandle: targetCf,
    lcHandle: targetLc,
    isSplitMode: isSplit,
    hasExplicitParam
  };
}

function updateSplitModeUI() {
  const singleBox = document.getElementById('singleSearchBox');
  const splitBox = document.getElementById('splitInputsContainer');
  const toggleBtn = document.getElementById('toggleSplitBtn');

  if (state.isSplitMode) {
    singleBox?.classList.add('hidden');
    splitBox?.classList.remove('hidden');
    splitBox?.classList.add('flex');
    toggleBtn?.classList.add('bg-indigo-600', 'text-white');
    toggleBtn?.classList.remove('text-slate-400');
  } else {
    singleBox?.classList.remove('hidden');
    splitBox?.classList.add('hidden');
    splitBox?.classList.remove('flex');
    toggleBtn?.classList.remove('bg-indigo-600', 'text-white');
    toggleBtn?.classList.add('text-slate-400');
  }
}

// Update Browser URL on search without reloading
function updateBrowserUrl() {
  const url = new URL(window.location);
  if (state.isSplitMode && state.cfHandle !== state.lcHandle) {
    url.searchParams.delete('u');
    url.searchParams.delete('username');
    if (state.cfHandle) url.searchParams.set('cf', state.cfHandle);
    else url.searchParams.delete('cf');
    if (state.lcHandle) url.searchParams.set('lc', state.lcHandle);
    else url.searchParams.delete('lc');
  } else {
    url.searchParams.delete('cf');
    url.searchParams.delete('lc');
    if (state.username) url.searchParams.set('u', state.username);
    else url.searchParams.delete('u');
  }
  window.history.replaceState({}, '', url.toString());
}

// ========================================================
// THEME SWITCHER MANAGER (Light, Dark, Automatic / System)
// ========================================================
const ThemeManager = {
  STORAGE_KEY: 'cp_theme_preference',

  getSavedPreference() {
    try {
      return localStorage.getItem(this.STORAGE_KEY) || 'system';
    } catch (e) {
      return 'system';
    }
  },

  getSystemTheme() {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  },

  getEffectiveTheme(preference) {
    if (preference === 'system') {
      return this.getSystemTheme();
    }
    return preference === 'light' ? 'light' : 'dark';
  },

  applyTheme(preference) {
    const effectiveTheme = this.getEffectiveTheme(preference);
    const html = document.documentElement;

    if (effectiveTheme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }

    // Update toggle button icon and active state in dropdown
    this.updateUI(preference, effectiveTheme);

    // Update Chart.js themes
    if (typeof updateChartsTheme === 'function') {
      updateChartsTheme();
    }
  },

  setTheme(preference) {
    try {
      localStorage.setItem(this.STORAGE_KEY, preference);
    } catch (e) {}
    this.applyTheme(preference);
  },

  updateUI(preference, effectiveTheme) {
    const toggleIcon = document.getElementById('themeToggleIcon');
    if (toggleIcon) {
      if (preference === 'system') {
        toggleIcon.setAttribute('data-lucide', 'laptop');
      } else if (preference === 'light') {
        toggleIcon.setAttribute('data-lucide', 'sun');
      } else {
        toggleIcon.setAttribute('data-lucide', 'moon');
      }
    }

    // Update checkmark and active classes in dropdown
    document.querySelectorAll('.theme-option').forEach(opt => {
      const optVal = opt.getAttribute('data-theme-value');
      const isSelected = optVal === preference;
      const checkIcon = opt.querySelector('.check-icon');

      if (isSelected) {
        opt.classList.add('active');
        if (checkIcon) checkIcon.classList.remove('hidden');
      } else {
        opt.classList.remove('active');
        if (checkIcon) checkIcon.classList.add('hidden');
      }
    });

    if (window.lucide) lucide.createIcons();
  },

  init() {
    const currentPref = this.getSavedPreference();
    this.applyTheme(currentPref);

    // Listen for OS system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.getSavedPreference() === 'system') {
          this.applyTheme('system');
        }
      });
    }

    // Toggle button click -> open/close dropdown
    const toggleBtn = document.getElementById('themeToggleBtn');
    const dropdown = document.getElementById('themeDropdown');

    if (toggleBtn && dropdown) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdown.classList.contains('hidden');
        if (isHidden) {
          dropdown.classList.remove('hidden');
          toggleBtn.setAttribute('aria-expanded', 'true');
        } else {
          dropdown.classList.add('hidden');
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Options click
      document.querySelectorAll('.theme-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetTheme = opt.getAttribute('data-theme-value');
          if (targetTheme) {
            this.setTheme(targetTheme);
            dropdown.classList.add('hidden');
            toggleBtn.setAttribute('aria-expanded', 'false');
          }
        });
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
          dropdown.classList.add('hidden');
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Close dropdown on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !dropdown.classList.contains('hidden')) {
          dropdown.classList.add('hidden');
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }
};

function getChartThemeColors() {
  const isLight = document.documentElement.classList.contains('light');
  return {
    isLight,
    gridColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)',
    tickColor: isLight ? '#475569' : '#64748b',
    tooltipBg: isLight ? '#ffffff' : '#0f172a',
    tooltipTitle: isLight ? '#0f172a' : '#f8fafc',
    tooltipBody: isLight ? '#334155' : '#cbd5e1',
    tooltipBorder: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
    donutBorder: isLight ? '#ffffff' : '#090d16'
  };
}

function updateChartsTheme() {
  const colors = getChartThemeColors();

  Object.entries(state.charts).forEach(([key, chart]) => {
    if (!chart) return;

    if (key === 'lcDonut' && chart.data && chart.data.datasets && chart.data.datasets[0]) {
      chart.data.datasets[0].borderColor = colors.donutBorder;
    }

    if (chart.options && chart.options.scales) {
      if (chart.options.scales.x) {
        if (chart.options.scales.x.grid && chart.options.scales.x.grid.display !== false) {
          chart.options.scales.x.grid.color = colors.gridColor;
        }
        if (chart.options.scales.x.ticks) {
          chart.options.scales.x.ticks.color = colors.tickColor;
        }
      }
      if (chart.options.scales.y) {
        if (chart.options.scales.y.grid && chart.options.scales.y.grid.display !== false) {
          chart.options.scales.y.grid.color = colors.gridColor;
        }
        if (chart.options.scales.y.ticks) {
          chart.options.scales.y.ticks.color = colors.tickColor;
        }
      }
    }

    if (chart.options && chart.options.plugins && chart.options.plugins.tooltip) {
      chart.options.plugins.tooltip.backgroundColor = colors.tooltipBg;
      chart.options.plugins.tooltip.titleColor = colors.tooltipTitle;
      chart.options.plugins.tooltip.bodyColor = colors.tooltipBody;
      chart.options.plugins.tooltip.borderColor = colors.tooltipBorder;
    }

    chart.update();
  });
}

// --------------------------------------------------------
// APPLICATION BOOTSTRAP
// --------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  if (window.lucide) lucide.createIcons();

  // Correctly parse the 'u' query parameter via URLSearchParams
  const initialUser = parseInitialHandles();
  setupEventListeners();
  renderHistoryPills();

  // Pass parsed username into data fetching hook and trigger fetch
  const targetUser = (initialUser && (initialUser.username || initialUser.cfHandle || initialUser.lcHandle))
    ? initialUser
    : (state.username || 'tourist');

  fetchAllData(targetUser);
  fetchContests();
});

// Setup DOM Event Listeners
function setupEventListeners() {
  // Trace action button
  document.getElementById('trackBtn').addEventListener('click', triggerTrace);

  // Toggle Split mode button
  document.getElementById('toggleSplitBtn').addEventListener('click', () => {
    state.isSplitMode = !state.isSplitMode;
    if (state.isSplitMode) {
      document.getElementById('cfHandleInput').value = state.cfHandle || state.username;
      document.getElementById('lcHandleInput').value = state.lcHandle || state.username;
    } else {
      document.getElementById('universalUsernameInput').value = state.cfHandle || state.lcHandle || state.username;
    }
    updateSplitModeUI();
  });

  // Enter key in inputs
  ['universalUsernameInput', 'cfHandleInput', 'lcHandleInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') triggerTrace();
      });
    }
  });

  // Force Refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    fetchAllData(true);
    fetchContests();
  });

  // Share Link Buttons
  ['shareLinkBtn', 'shareBannerBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', copyProfileLink);
  });

  // Alert close
  document.getElementById('alertClose').addEventListener('click', hideAlert);

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = btn.getAttribute('data-username');
      applySingleUsername(user);
    });
  });

  // Contests Filter
  document.querySelectorAll('.contest-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.contest-filter').forEach(b => {
        b.classList.remove('active', 'bg-indigo-600', 'text-white');
        b.classList.add('text-slate-400');
      });
      btn.classList.add('active', 'bg-indigo-600', 'text-white');
      btn.classList.remove('text-slate-400');
      renderContests(btn.getAttribute('data-filter'));
    });
  });

  // Compare Button
  document.getElementById('compareBtn').addEventListener('click', handleCompare);

  // Contest Session Modal Listeners & Registered Badges
  setupContestSessionModalListeners();
  updateRegisteredBadges();

  // Window resize handler with debounce for responsive charts
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      Object.values(state.charts).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
          chart.resize();
        }
      });
    }, 150);
  });
}

function triggerTrace() {
  if (state.isSplitMode) {
    state.cfHandle = document.getElementById('cfHandleInput').value.trim();
    state.lcHandle = document.getElementById('lcHandleInput').value.trim();
    state.username = state.cfHandle || state.lcHandle;
  } else {
    const val = document.getElementById('universalUsernameInput').value.trim();
    state.username = val;
    state.cfHandle = val;
    state.lcHandle = val;
  }

  updateBrowserUrl();
  saveToHistory(state.cfHandle, state.lcHandle);
  fetchAllData();
}

function copyProfileLink() {
  const currentUrl = window.location.href;
  navigator.clipboard.writeText(currentUrl).then(() => {
    showToast(`Profile link copied! Anyone can trace @${state.username || state.cfHandle || state.lcHandle} with this link.`);
  }).catch(() => {
    showToast('Failed to copy link automatically. Please copy the URL from your browser address bar.');
  });
}

// Tab Switcher
function switchTab(tabId) {
  state.activeTab = tabId;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isTarget = btn.getAttribute('data-tab') === tabId;
    if (isTarget) {
      btn.classList.add('active', 'bg-indigo-600/20', 'text-indigo-300', 'border', 'border-indigo-500/30');
      btn.classList.remove('text-slate-400', 'hover:bg-white/5');
    } else {
      btn.classList.remove('active', 'bg-indigo-600/20', 'text-indigo-300', 'border', 'border-indigo-500/30');
      btn.classList.add('text-slate-400', 'hover:bg-white/5');
    }
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === tabId) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });

  // Resize charts on tab display
  setTimeout(() => {
    Object.values(state.charts).forEach(chart => {
      if (chart) chart.resize();
    });
  }, 50);


  if (window.lucide) lucide.createIcons();
}

// --------------------------------------------------------
// DATA FETCHING (SIMULTANEOUS DUAL-PLATFORM TRACING)
// --------------------------------------------------------
async function fetchAllData(targetUser = null, forceRefresh = false) {
  // Support overloaded calls: fetchAllData(true) for forceRefresh
  if (typeof targetUser === 'boolean') {
    forceRefresh = targetUser;
    targetUser = null;
  }

  // If a target user was passed into the hook/function, apply it to state
  if (typeof targetUser === 'string' && targetUser.trim().length > 0) {
    const clean = decodeURIComponent(targetUser).trim().replace(/^@+/, '');
    state.username = clean;
    state.cfHandle = clean;
    state.lcHandle = clean;
    state.isSplitMode = false;
  } else if (targetUser && typeof targetUser === 'object') {
    if (targetUser.username) state.username = decodeURIComponent(targetUser.username).trim().replace(/^@+/, '');
    if (targetUser.cfHandle) state.cfHandle = decodeURIComponent(targetUser.cfHandle).trim().replace(/^@+/, '');
    if (targetUser.lcHandle) state.lcHandle = decodeURIComponent(targetUser.lcHandle).trim().replace(/^@+/, '');
    if (typeof targetUser.isSplitMode === 'boolean') state.isSplitMode = targetUser.isSplitMode;
    if (!state.username) state.username = state.cfHandle || state.lcHandle;
  }

  // Ensure non-empty fallback handles
  if (!state.username && !state.cfHandle && !state.lcHandle) {
    state.username = 'tourist';
    state.cfHandle = 'tourist';
    state.lcHandle = 'tourist';
  }

  // Synchronize inputs in UI
  const universalInput = document.getElementById('universalUsernameInput');
  const cfInput = document.getElementById('cfHandleInput');
  const lcInput = document.getElementById('lcHandleInput');
  if (universalInput && state.username) universalInput.value = state.username;
  if (cfInput && state.cfHandle) cfInput.value = state.cfHandle;
  if (lcInput && state.lcHandle) lcInput.value = state.lcHandle;
  updateSplitModeUI();

  // Save to recent search history
  saveToHistory(state.cfHandle || state.username, state.lcHandle || state.username);

  hideAlert();
  const trackBtn = document.getElementById('trackBtn');
  const originalHtml = trackBtn ? trackBtn.innerHTML : '';
  if (trackBtn) {
    trackBtn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span><span>Tracing...</span>`;
    trackBtn.disabled = true;
  }

  const refreshQuery = forceRefresh ? '?refresh=true' : '';

  // Update current traced banner
  const tracedBadge = document.getElementById('currentTracedBadge');
  const displayName = state.isSplitMode && state.cfHandle !== state.lcHandle
    ? `CF: ${state.cfHandle || 'None'} | LC: ${state.lcHandle || 'None'}`
    : `@${state.username || 'unknown'}`;
  if (tracedBadge) tracedBadge.textContent = displayName;

  // Render initial loading indicator in status bar
  const indicators = document.getElementById('currentStatusIndicators');
  if (indicators) {
    indicators.innerHTML = `
      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
        <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        Fetching stats for @${state.username || state.cfHandle || state.lcHandle}...
      </span>
    `;
  }

  const promises = [];
  if (state.cfHandle) {
    promises.push(
      fetch(`/api/cf/user/${encodeURIComponent(state.cfHandle)}${refreshQuery}`)
        .then(res => res.json())
        .then(data => ({ platform: 'cf', data }))
        .catch(err => ({ platform: 'cf', error: err.message }))
    );
  } else {
    state.cfData = null;
  }

  if (state.lcHandle) {
    promises.push(
      fetch(`/api/lc/user/${encodeURIComponent(state.lcHandle)}${refreshQuery}`)
        .then(res => res.json())
        .then(data => ({ platform: 'lc', data }))
        .catch(err => ({ platform: 'lc', error: err.message }))
    );
  } else {
    state.lcData = null;
  }

  const results = await Promise.allSettled(promises);
  trackBtn.innerHTML = originalHtml;
  trackBtn.disabled = false;

  let cfFound = false;
  let lcFound = false;

  results.forEach(res => {
    if (res.status === 'fulfilled') {
      const val = res.value;
      if (val.platform === 'cf') {
        if (val.data?.success) {
          state.cfData = val.data.data;
          cfFound = true;
        } else {
          state.cfData = null;
        }
      }
      if (val.platform === 'lc') {
        if (val.data?.success) {
          state.lcData = val.data.data;
          lcFound = true;
        } else {
          state.lcData = null;
        }
      }
    }
  });

  // Render Status indicators next to banner
  if (indicators) {
    indicators.innerHTML = `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${cfFound ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-500'}">
        <span class="w-1.5 h-1.5 rounded-full ${cfFound ? 'bg-blue-400' : 'bg-slate-600'}"></span>
        CF ${cfFound ? 'Active' : 'Not Found'}
      </span>
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${lcFound ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-500'}">
        <span class="w-1.5 h-1.5 rounded-full ${lcFound ? 'bg-amber-400' : 'bg-slate-600'}"></span>
        LC ${lcFound ? 'Active' : 'Not Found'}
      </span>
    `;
  }

  if (!cfFound && !lcFound) {
    showAlert(`No profile found under '${state.username}' on either Codeforces or LeetCode. Check spelling or try a preset!`);
  }

  renderOverview();
  renderCodeforces();
  renderLeetCode();

  if (window.lucide) lucide.createIcons();
}

// --------------------------------------------------------
// OVERVIEW RENDERING
// --------------------------------------------------------
function renderOverview() {
  const cf = state.cfData;
  const lc = state.lcData;

  const cfCard = document.getElementById('overviewCfCard');
  const lcCard = document.getElementById('overviewLcCard');

  // 1. Codeforces Overview Card
  if (cf) {
    const cfAvatarEl = document.getElementById('overviewCfAvatar');
    const cfCandidates = [
      cf.profile.avatar,
      cf.profile.titlePhoto,
      cf.profile.avatarUrl,
      cf.profile.photoUrl,
      cf.profile.rawAvatar,
      cf.profile.rawTitlePhoto,
      cf.profile.proxyAvatar || `/api/cf/avatar/${encodeURIComponent(cf.profile.handle)}`
    ].filter(Boolean);

    setSafeAvatar(
      cfAvatarEl,
      cfCandidates,
      cf.profile.handle,
      '#3b82f6',
      '#1d4ed8'
    );
    document.getElementById('overviewCfHandle').textContent = cf.profile.handle;
    document.getElementById('overviewCfHandle').className = `text-lg font-bold font-mono ${getCfRankClass(cf.profile.rank)}`;
    
    document.getElementById('overviewCfRankBadge').textContent = cf.profile.rank;
    document.getElementById('overviewCfOrg').textContent = [cf.profile.organization, cf.profile.city, cf.profile.country].filter(Boolean).join(', ') || 'No affiliation listed';
    document.getElementById('overviewCfRating').textContent = cf.profile.rating || 'Unrated';
    document.getElementById('overviewCfMaxRating').textContent = `Max: ${cf.profile.maxRating || '--'}`;

    document.getElementById('overviewCfSolved').textContent = cf.stats.totalSolved.toLocaleString();
    document.getElementById('overviewCfContests').textContent = cf.ratingHistory.length;
    document.getElementById('overviewCfContrib').textContent = cf.profile.contribution > 0 ? `+${cf.profile.contribution}` : cf.profile.contribution;
    document.getElementById('overviewCfCurrentStreak').textContent = `${cf.stats.currentStreak || 0} days`;
    document.getElementById('overviewCfMaxStreak').textContent = `${cf.stats.maxStreak || 0} days`;

    // Recent Submissions
    const cfList = document.getElementById('overviewCfRecentList');
    if (cf.stats.recentSubmissions?.length) {
      cfList.innerHTML = cf.stats.recentSubmissions.slice(0, 5).map(s => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-white/5 text-xs">
          <div class="truncate max-w-[220px]">
            <a href="${s.url}" target="_blank" class="font-medium text-slate-200 hover:text-blue-400 truncate flex items-center gap-1">
              <span>${s.problemName}</span>
              ${s.problemRating ? `<span class="text-[10px] text-slate-400 font-mono">(${s.problemRating})</span>` : ''}
            </a>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.verdict === 'OK' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
            ${s.verdict === 'OK' ? 'Accepted' : s.verdict.replace(/_/g, ' ')}
          </span>
        </div>
      `).join('');
    } else {
      cfList.innerHTML = `<p class="text-xs text-slate-500">No recent submissions found.</p>`;
    }
  } else {
    const cfAvatarEl = document.getElementById('overviewCfAvatar');
    if (cfAvatarEl) {
      cfAvatarEl.onerror = null;
      cfAvatarEl.src = generateClientSvgAvatar(state.cfHandle || 'CF', '#3b82f6', '#1d4ed8');
    }
    document.getElementById('overviewCfHandle').textContent = state.cfHandle || 'Not Found';
    document.getElementById('overviewCfRating').textContent = '--';
    document.getElementById('overviewCfSolved').textContent = '--';
    document.getElementById('overviewCfContests').textContent = '--';
    document.getElementById('overviewCfContrib').textContent = '--';
    document.getElementById('overviewCfCurrentStreak').textContent = '--';
    document.getElementById('overviewCfMaxStreak').textContent = '--';
    document.getElementById('overviewCfRecentList').innerHTML = `
      <div class="p-3 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-lg">
        No Codeforces account found under '${state.cfHandle || state.username}'.
      </div>
    `;
  }

  // 2. LeetCode Overview Card
  if (lc) {
    const lcAvatarEl = document.getElementById('overviewLcAvatar');
    const lcCandidates = [
      lc.profile.avatar,
      lc.profile.userAvatar,
      lc.profile.avatarUrl,
      lc.profile.rawAvatar,
      lc.profile.proxyAvatar || `/api/lc/avatar/${encodeURIComponent(lc.profile.username)}`
    ].filter(Boolean);

    setSafeAvatar(
      lcAvatarEl,
      lcCandidates,
      lc.profile.username,
      '#f59e0b',
      '#d97706'
    );
    document.getElementById('overviewLcHandle').textContent = lc.profile.username;
    
    const badgeEl = document.getElementById('overviewLcBadge');
    if (lc.contest.badge) {
      badgeEl.textContent = lc.contest.badge;
      badgeEl.className = `px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
        lc.contest.badge.toLowerCase().includes('guardian') ? 'badge-guardian' : 'badge-knight'
      }`;
    } else {
      badgeEl.textContent = 'Coder';
      badgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300';
    }

    document.getElementById('overviewLcRank').textContent = `Global Ranking: ${lc.profile.ranking?.toLocaleString() || '--'}`;
    document.getElementById('overviewLcRating').textContent = lc.contest.rating || 'Unrated';
    document.getElementById('overviewLcTopPercent').textContent = lc.contest.topPercentage ? `Top ${lc.contest.topPercentage}%` : 'Unrated';

    document.getElementById('overviewLcTotal').textContent = lc.stats.totalSolved.toLocaleString();
    document.getElementById('overviewLcEasy').textContent = lc.stats.easySolved.toLocaleString();
    document.getElementById('overviewLcMedium').textContent = lc.stats.mediumSolved.toLocaleString();
    document.getElementById('overviewLcHard').textContent = lc.stats.hardSolved.toLocaleString();
    document.getElementById('overviewLcCurrentStreak').textContent = `${lc.stats.currentStreak || 0} days`;
    document.getElementById('overviewLcMaxStreak').textContent = `${lc.stats.maxStreak || 0} days`;

    // Recent Submissions
    const lcList = document.getElementById('overviewLcRecentList');
    if (lc.stats.recentSubmissions?.length) {
      lcList.innerHTML = lc.stats.recentSubmissions.slice(0, 5).map(s => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-white/5 text-xs">
          <a href="${s.url}" target="_blank" class="font-medium text-slate-200 hover:text-amber-400 truncate max-w-[240px]">
            ${s.title}
          </a>
          <span class="text-[10px] text-slate-500 font-mono">${s.date.split(',')[0]}</span>
        </div>
      `).join('');
    } else {
      lcList.innerHTML = `<p class="text-xs text-slate-500">No submissions found.</p>`;
    }
  } else {
    const lcAvatarEl = document.getElementById('overviewLcAvatar');
    if (lcAvatarEl) {
      lcAvatarEl.onerror = null;
      lcAvatarEl.src = generateClientSvgAvatar(state.lcHandle || 'LC', '#f59e0b', '#d97706');
    }
    document.getElementById('overviewLcHandle').textContent = state.lcHandle || 'Not Found';
    document.getElementById('overviewLcRating').textContent = '--';
    document.getElementById('overviewLcTotal').textContent = '--';
    document.getElementById('overviewLcEasy').textContent = '--';
    document.getElementById('overviewLcMedium').textContent = '--';
    document.getElementById('overviewLcHard').textContent = '--';
    document.getElementById('overviewLcCurrentStreak').textContent = '--';
    document.getElementById('overviewLcMaxStreak').textContent = '--';
    document.getElementById('overviewLcRecentList').innerHTML = `
      <div class="p-3 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-lg">
        No LeetCode account found under '${state.lcHandle || state.username}'.
      </div>
    `;
  }

  // 3. Combined Stats Matrix
  const cfSolved = cf?.stats?.totalSolved || 0;
  const lcSolved = lc?.stats?.totalSolved || 0;
  document.getElementById('combinedTotalSolved').textContent = (cfSolved + lcSolved).toLocaleString();

  document.getElementById('combinedCfPeak').textContent = `CF: ${cf?.profile?.maxRating || '--'}`;
  document.getElementById('combinedLcPeak').textContent = `LC: ${lc?.contest?.rating || '--'}`;

  const cfContests = cf?.ratingHistory?.length || 0;
  const lcContests = lc?.contest?.attendedContestsCount || 0;
  document.getElementById('combinedContestsTotal').textContent = (cfContests + lcContests).toLocaleString();

  document.getElementById('combinedAcceptanceRate').textContent = lc?.stats?.acceptanceRate ? `${lc.stats.acceptanceRate}%` : '--%';
}

// --------------------------------------------------------
// CODEFORCES TAB RENDERING
// --------------------------------------------------------
function renderCodeforces() {
  const cf = state.cfData;
  if (!cf) {
    const cfDetailAvatarEl = document.getElementById('cfDetailAvatar');
    if (cfDetailAvatarEl) {
      cfDetailAvatarEl.onerror = null;
      cfDetailAvatarEl.src = generateClientSvgAvatar(state.cfHandle || state.username || 'CF', '#3b82f6', '#1d4ed8');
    }
    const handleEl = document.getElementById('cfDetailHandle');
    if (handleEl) {
      handleEl.textContent = state.cfHandle || state.username || 'Not Found';
      handleEl.className = 'text-xl sm:text-2xl font-bold text-slate-400 font-mono';
    }
    const rankEl = document.getElementById('cfDetailRank');
    if (rankEl) {
      rankEl.textContent = 'Unranked';
      rankEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400';
    }
    const metaEl = document.getElementById('cfDetailMeta');
    if (metaEl) metaEl.textContent = `No Codeforces profile found under '${state.cfHandle || state.username}'.`;
    const friendsEl = document.getElementById('cfDetailFriends');
    if (friendsEl) friendsEl.textContent = '--';
    const contribEl = document.getElementById('cfDetailContrib');
    if (contribEl) contribEl.textContent = '--';
    const ratingEl = document.getElementById('cfDetailRating');
    if (ratingEl) ratingEl.textContent = '--';
    const maxRatingEl = document.getElementById('cfDetailMaxRating');
    if (maxRatingEl) maxRatingEl.textContent = '--';
    const maxRankEl = document.getElementById('cfDetailMaxRank');
    if (maxRankEl) maxRankEl.textContent = '--';
    const contestsEl = document.getElementById('cfContestsCount');
    if (contestsEl) contestsEl.textContent = '0 Contests';
    const cfCurStreakEl = document.getElementById('cfDetailCurrentStreak');
    if (cfCurStreakEl) cfCurStreakEl.textContent = '0d';
    const cfMaxStreakEl = document.getElementById('cfDetailMaxStreak');
    if (cfMaxStreakEl) cfMaxStreakEl.textContent = '0d';
    const tbody = document.getElementById('cfSubmissionsBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-slate-500 py-8">No Codeforces profile found under '${state.cfHandle || state.username}'. If this user has a different handle on Codeforces, click the Split button in the header.</td></tr>`;
    }
    return;
  }

  const cfDetailAvatarEl = document.getElementById('cfDetailAvatar');
  const cfCandidates = [
    cf.profile.titlePhoto,
    cf.profile.avatar,
    cf.profile.photoUrl,
    cf.profile.avatarUrl,
    cf.profile.rawTitlePhoto,
    cf.profile.rawAvatar,
    cf.profile.proxyAvatar || `/api/cf/avatar/${encodeURIComponent(cf.profile.handle)}`
  ].filter(Boolean);

  setSafeAvatar(
    cfDetailAvatarEl,
    cfCandidates,
    cf.profile.handle,
    '#3b82f6',
    '#1d4ed8'
  );
  document.getElementById('cfDetailHandle').textContent = cf.profile.handle;
  document.getElementById('cfDetailHandle').className = `text-2xl font-bold font-mono ${getCfRankClass(cf.profile.rank)}`;
  document.getElementById('cfDetailRank').textContent = cf.profile.rank;
  document.getElementById('cfDetailRank').className = `px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 ${getCfRankClass(cf.profile.rank)}`;

  document.getElementById('cfDetailMeta').textContent = [cf.profile.organization, cf.profile.city, cf.profile.country].filter(Boolean).join(', ') || 'No organization specified';
  document.getElementById('cfDetailFriends').textContent = cf.profile.friendOfCount.toLocaleString();
  document.getElementById('cfDetailContrib').textContent = cf.profile.contribution > 0 ? `+${cf.profile.contribution}` : cf.profile.contribution;
  document.getElementById('cfDetailRating').textContent = cf.profile.rating || 'Unrated';
  document.getElementById('cfDetailMaxRating').textContent = cf.profile.maxRating || '--';
  document.getElementById('cfDetailMaxRank').textContent = `Max: ${cf.profile.maxRank || '--'}`;
  document.getElementById('cfContestsCount').textContent = `${cf.ratingHistory.length} Contests Attended`;

  const cfCurStreakEl = document.getElementById('cfDetailCurrentStreak');
  const cfMaxStreakEl = document.getElementById('cfDetailMaxStreak');
  if (cfCurStreakEl) cfCurStreakEl.textContent = `${cf.stats.currentStreak || 0}d`;
  if (cfMaxStreakEl) cfMaxStreakEl.textContent = `${cf.stats.maxStreak || 0}d`;

  // 1. Rating History Line Chart
  renderCfRatingChart(cf.ratingHistory);

  // 2. Solved Problems Difficulty Histogram
  renderCfDifficultyChart(cf.stats.ratingDistribution);

  // 3. Problem Tags Bar Chart
  renderCfTagsChart(cf.stats.tagStats);

  // 4. Submissions Feed Table
  const tbody = document.getElementById('cfSubmissionsBody');
  if (cf.stats.recentSubmissions?.length) {
    tbody.innerHTML = cf.stats.recentSubmissions.map((s, idx) => `
      <tr>
        <td class="font-mono text-slate-500">${idx + 1}</td>
        <td>
          <a href="${s.url}" target="_blank" class="font-semibold text-slate-200 hover:text-blue-400">
            ${s.problemName}
          </a>
        </td>
        <td>
          ${s.problemRating ? `<span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-blue-300">${s.problemRating}</span>` : '<span class="text-slate-600">-</span>'}
        </td>
        <td>
          <span class="px-2.5 py-1 rounded text-xs font-semibold ${
            s.verdict === 'OK' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }">
            ${s.verdict === 'OK' ? 'Accepted' : s.verdict.replace(/_/g, ' ')}
          </span>
        </td>
        <td class="font-mono text-xs text-slate-400">${s.programmingLanguage}</td>
        <td class="font-mono text-xs text-slate-400">${s.timeConsumedMillis}ms / ${Math.round(s.memoryConsumedBytes / 1024)}KB</td>
        <td>
          <a href="${s.url}" target="_blank" class="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold">
            <span>Solve</span>
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
          </a>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-slate-500 py-6">No recent submissions found.</td></tr>`;
  }
}

function renderCfRatingChart(history) {
  const ctx = document.getElementById('cfRatingChart').getContext('2d');
  if (state.charts.cfRating) state.charts.cfRating.destroy();

  const labels = history.map(h => h.date);
  const data = history.map(h => h.newRating);
  const colors = getChartThemeColors();

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

  state.charts.cfRating = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Codeforces Rating',
        data,
        borderColor: '#3b82f6',
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        tension: 0.25,
        pointBackgroundColor: '#3b82f6',
        pointRadius: history.length > 50 ? 2 : 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              return history[idx]?.contestName || '';
            },
            label: (item) => {
              const h = history[item.dataIndex];
              const change = h.ratingChange > 0 ? `+${h.ratingChange}` : h.ratingChange;
              return [
                `Rating: ${h.newRating} (${change})`,
                `Rank: #${h.rank}`,
                `Date: ${h.date}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: colors.gridColor },
          ticks: { color: colors.tickColor, maxTicksLimit: 10 }
        },
        y: {
          grid: { color: colors.gridColor },
          ticks: { color: colors.tickColor }
        }
      }
    }
  });
}

function renderCfDifficultyChart(ratingDist) {
  const ctx = document.getElementById('cfDifficultyChart').getContext('2d');
  if (state.charts.cfDifficulty) state.charts.cfDifficulty.destroy();

  const ratings = Object.keys(ratingDist).map(Number).sort((a, b) => a - b);
  const counts = ratings.map(r => ratingDist[r]);
  const colors = getChartThemeColors();

  state.charts.cfDifficulty = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ratings,
      datasets: [{
        label: 'Solved Problems',
        data: counts,
        backgroundColor: ratings.map(r => {
          if (r < 1200) return '#94a3b8';
          if (r < 1400) return '#22c55e';
          if (r < 1600) return '#06b6d4';
          if (r < 1900) return '#3b82f6';
          if (r < 2200) return '#a855f7';
          if (r < 2400) return '#f59e0b';
          return '#ef4444';
        }),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          borderColor: colors.tooltipBorder,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.tickColor, maxTicksLimit: 12 }
        },
        y: {
          grid: { color: colors.gridColor },
          ticks: { color: colors.tickColor }
        }
      }
    }
  });
}

function renderCfTagsChart(tagStats) {
  const ctx = document.getElementById('cfTagsChart').getContext('2d');
  if (state.charts.cfTags) state.charts.cfTags.destroy();

  const topTags = (tagStats || []).slice(0, 10);
  const labels = topTags.map(t => t.tag);
  const counts = topTags.map(t => t.count);
  const colors = getChartThemeColors();

  state.charts.cfTags = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Solved',
        data: counts,
        backgroundColor: '#10b981',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          borderColor: colors.tooltipBorder,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: colors.gridColor },
          ticks: { color: colors.tickColor }
        },
        y: {
          grid: { display: false },
          ticks: { color: colors.tickColor, font: { size: 11 } }
        }
      }
    }
  });
}

// --------------------------------------------------------
function renderLeetCode() {
  const lc = state.lcData;
  if (!lc) {
    const lcDetailAvatarEl = document.getElementById('lcDetailAvatar');
    if (lcDetailAvatarEl) {
      lcDetailAvatarEl.onerror = null;
      lcDetailAvatarEl.src = generateClientSvgAvatar(state.lcHandle || state.username || 'LC', '#f59e0b', '#d97706');
    }
    const userEl = document.getElementById('lcDetailUsername');
    if (userEl) userEl.textContent = state.lcHandle || state.username || 'Not Found';
    const nameEl = document.getElementById('lcDetailName');
    if (nameEl) nameEl.textContent = `No LeetCode profile found under '${state.lcHandle || state.username}'.`;
    const rankEl = document.getElementById('lcDetailRank');
    if (rankEl) rankEl.textContent = '--';
    const repEl = document.getElementById('lcDetailRep');
    if (repEl) repEl.textContent = '--';
    const badgeEl = document.getElementById('lcDetailBadge');
    if (badgeEl) {
      badgeEl.textContent = 'Unranked';
      badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400';
    }
    const ratingEl = document.getElementById('lcDetailRating');
    if (ratingEl) ratingEl.textContent = '--';
    const topPercentEl = document.getElementById('lcDetailTopPercent');
    if (topPercentEl) topPercentEl.textContent = 'Unrated';
    const attendedEl = document.getElementById('lcDetailAttended');
    if (attendedEl) attendedEl.textContent = '0 contests attended';
    const curStreakEl = document.getElementById('lcDetailCurrentStreak');
    if (curStreakEl) curStreakEl.textContent = '0d';
    const maxStreakEl = document.getElementById('lcDetailMaxStreak');
    if (maxStreakEl) maxStreakEl.textContent = '0d';
    const donutTotal = document.getElementById('lcDonutTotal');
    if (donutTotal) donutTotal.textContent = '0';
    const easyCount = document.getElementById('lcEasyCount');
    if (easyCount) easyCount.textContent = '0';
    const medCount = document.getElementById('lcMediumCount');
    if (medCount) medCount.textContent = '0';
    const hardCount = document.getElementById('lcHardCount');
    if (hardCount) hardCount.textContent = '0';
    const easyBar = document.getElementById('lcEasyBar');
    if (easyBar) easyBar.style.width = '0%';
    const medBar = document.getElementById('lcMediumBar');
    if (medBar) medBar.style.width = '0%';
    const hardBar = document.getElementById('lcHardBar');
    if (hardBar) hardBar.style.width = '0%';
    const totalSub = document.getElementById('lcTotalSubmissionsText');
    if (totalSub) totalSub.textContent = '0 Total Submissions';
    const accBadge = document.getElementById('lcAcceptanceRateBadge');
    if (accBadge) accBadge.textContent = '--%';
    const contestHistoryCount = document.getElementById('lcContestHistoryCount');
    if (contestHistoryCount) contestHistoryCount.textContent = '0 Contests Rated';
    const tbody = document.getElementById('lcSubmissionsBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-slate-500 py-8">No LeetCode questions or profile found under '${state.lcHandle || state.username}'. If this user has a different username on LeetCode, click the Split button in the header.</td></tr>`;
    }
    return;
  }

  const lcDetailAvatarEl = document.getElementById('lcDetailAvatar');
  const lcCandidates = [
    lc.profile.avatar,
    lc.profile.userAvatar,
    lc.profile.avatarUrl,
    lc.profile.rawAvatar,
    lc.profile.proxyAvatar || `/api/lc/avatar/${encodeURIComponent(lc.profile.username)}`
  ].filter(Boolean);

  setSafeAvatar(
    lcDetailAvatarEl,
    lcCandidates,
    lc.profile.username,
    '#f59e0b',
    '#d97706'
  );
  document.getElementById('lcDetailUsername').textContent = lc.profile.username;
  document.getElementById('lcDetailName').textContent = [lc.profile.realName, lc.profile.school, lc.profile.country].filter(Boolean).join(' • ') || 'Competitive Programmer';
  document.getElementById('lcDetailRank').textContent = lc.profile.ranking ? `#${lc.profile.ranking.toLocaleString()}` : '--';
  document.getElementById('lcDetailRep').textContent = lc.profile.reputation?.toLocaleString() || '0';

  const badgeEl = document.getElementById('lcDetailBadge');
  if (lc.contest.badge) {
    badgeEl.textContent = lc.contest.badge;
    badgeEl.className = `px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
      lc.contest.badge.toLowerCase().includes('guardian') ? 'badge-guardian' : 'badge-knight'
    }`;
  } else {
    badgeEl.textContent = 'Coder';
    badgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300';
  }

  document.getElementById('lcDetailRating').textContent = lc.contest.rating || 'Unrated';
  document.getElementById('lcDetailTopPercent').textContent = lc.contest.topPercentage ? `Top ${lc.contest.topPercentage}%` : 'Unrated';
  document.getElementById('lcDetailAttended').textContent = `${lc.contest.attendedContestsCount} contests attended`;

  const lcCurStreakEl = document.getElementById('lcDetailCurrentStreak');
  const lcMaxStreakEl = document.getElementById('lcDetailMaxStreak');
  if (lcCurStreakEl) lcCurStreakEl.textContent = `${lc.stats.currentStreak || 0}d`;
  if (lcMaxStreakEl) lcMaxStreakEl.textContent = `${lc.stats.maxStreak || 0}d`;

  // Solved Numbers
  const total = lc.stats.totalSolved;
  const easy = lc.stats.easySolved;
  const med = lc.stats.mediumSolved;
  const hard = lc.stats.hardSolved;

  document.getElementById('lcDonutTotal').textContent = total.toLocaleString();
  document.getElementById('lcEasyCount').textContent = easy.toLocaleString();
  document.getElementById('lcMediumCount').textContent = med.toLocaleString();
  document.getElementById('lcHardCount').textContent = hard.toLocaleString();

  document.getElementById('lcEasyBar').style.width = `${Math.min(100, (easy / 900) * 100)}%`;
  document.getElementById('lcMediumBar').style.width = `${Math.min(100, (med / 1800) * 100)}%`;
  document.getElementById('lcHardBar').style.width = `${Math.min(100, (hard / 800) * 100)}%`;

  document.getElementById('lcTotalSubmissionsText').textContent = `${lc.stats.totalSubmissions?.toLocaleString() || 0} Total Submissions`;
  document.getElementById('lcAcceptanceRateBadge').textContent = `${lc.stats.acceptanceRate || 0}%`;
  document.getElementById('lcContestHistoryCount').textContent = `${lc.contest.history?.length || 0} Contests Rated`;

  // Render Donut Chart
  renderLcDonutChart(easy, med, hard);

  // Render LC Contest Rating Chart
  renderLcRatingChart(lc.contest.history || []);

  // Recent Accepted Questions Table
  const tbody = document.getElementById('lcSubmissionsBody');
  if (lc.stats.recentSubmissions?.length) {
    tbody.innerHTML = lc.stats.recentSubmissions.map(s => `
      <tr>
        <td>
          <a href="${s.url}" target="_blank" class="font-semibold text-slate-200 hover:text-amber-400 flex items-center gap-2">
            <span>${s.title}</span>
          </a>
        </td>
        <td class="font-mono text-xs text-slate-400">${s.date}</td>
        <td>
          <a href="${s.url}" target="_blank" class="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold">
            <span>Solve Problem</span>
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
          </a>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-slate-500 py-6">No recent submissions found.</td></tr>`;
  }
}

function renderLcDonutChart(easy, med, hard) {
  const ctx = document.getElementById('lcDifficultyDonut').getContext('2d');
  if (state.charts.lcDonut) state.charts.lcDonut.destroy();
  const colors = getChartThemeColors();

  state.charts.lcDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Easy', 'Medium', 'Hard'],
      datasets: [{
        data: [easy, med, hard],
        backgroundColor: ['#00b8a3', '#ffc01e', '#ff375f'],
        borderColor: colors.donutBorder,
        borderWidth: 4,
        hoverOffset: 4
      }]
    },
    options: {
      cutout: '75%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          borderColor: colors.tooltipBorder,
          borderWidth: 1
        }
      }
    }
  });
}

function renderLcRatingChart(history) {
  const ctx = document.getElementById('lcRatingChart').getContext('2d');
  if (state.charts.lcRating) state.charts.lcRating.destroy();
  const colors = getChartThemeColors();

  const labels = history.map(h => h.date);
  const data = history.map(h => h.rating);

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(255, 161, 22, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 161, 22, 0.0)');

  state.charts.lcRating = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'LeetCode Rating',
        data,
        borderColor: '#ffa116',
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        tension: 0.25,
        pointBackgroundColor: '#ffa116',
        pointRadius: history.length > 50 ? 2 : 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipTitle,
          bodyColor: colors.tooltipBody,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              return history[idx]?.contestTitle || '';
            },
            label: (item) => {
              const h = history[item.dataIndex];
              return [
                `Rating: ${h.rating}`,
                `Rank: #${h.ranking || '--'}`,
                `Date: ${h.date}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: colors.gridColor },
          ticks: { color: colors.tickColor, maxTicksLimit: 10 }
        },
        y: {
          grid: { color: colors.gridColor },
          ticks: { color: colors.tickColor }
        }
      }
    }
  });
}

// --------------------------------------------------------
// UPCOMING CONTESTS & COUNTDOWN
// --------------------------------------------------------
async function fetchContests() {
  try {
    const res = await fetch('/api/contests');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      state.contests = data.data;
      const countEl = document.getElementById('upcomingCountBadge');
      if (countEl) countEl.textContent = state.contests.length;
      setupNextContestCountdown();
      renderContests('all');
    }
  } catch (err) {
    console.error('Failed to load contests:', err);
  }
}

function setupNextContestCountdown() {
  if (!state.contests || state.contests.length === 0) {
    document.getElementById('nextContestTitle').textContent = 'No upcoming contests found';
    return;
  }

  const next = state.contests[0];
  const isRegistered = state.registeredContestIds.includes(next.id);

  // Update platform badge
  document.getElementById('nextContestPlatform').textContent = next.platform;
  document.getElementById('nextContestPlatform').className = `px-2 py-0.5 rounded text-xs font-semibold ${
    next.platform === 'Codeforces' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'
  }`;

  // Update registered status badge in banner
  const regBadge = document.getElementById('nextContestRegisteredBadge');
  if (regBadge) {
    if (isRegistered) {
      regBadge.classList.remove('hidden');
      regBadge.classList.add('inline-flex');
    } else {
      regBadge.classList.add('hidden');
      regBadge.classList.remove('inline-flex');
    }
  }

  document.getElementById('nextContestTitle').textContent = next.title;
  document.getElementById('nextContestTime').innerHTML = `
    <i data-lucide="clock" class="w-4 h-4 text-slate-400"></i>
    <span>${formatDateTime(next.startTime)} &bull; Duration: ${formatDuration(next.duration)}</span>
  `;

  // Register button in banner
  const regBtn = document.getElementById('nextContestRegisterBtn');
  if (regBtn) {
    if (isRegistered) {
      regBtn.innerHTML = `<span>Registered ✓</span> <i data-lucide="check" class="w-4 h-4"></i>`;
      regBtn.className = 'w-full sm:w-auto justify-center px-4 py-3 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98]';
      regBtn.href = next.url;
      regBtn.onclick = null;
    } else {
      regBtn.innerHTML = `<span>Register In-App</span> <i data-lucide="sparkles" class="w-4 h-4"></i>`;
      regBtn.className = 'w-full sm:w-auto justify-center px-4 py-3 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]';
      regBtn.href = 'javascript:void(0)';
      regBtn.onclick = () => handleRegisterContest(next.id);
    }
  }

  if (state.countdownTimer) clearInterval(state.countdownTimer);

  function updateTicker() {
    const now = Math.floor(Date.now() / 1000);
    const diff = next.startTime - now;

    if (diff <= 0) {
      document.getElementById('countdownDays').textContent = '00';
      document.getElementById('countdownHours').textContent = '00';
      document.getElementById('countdownMins').textContent = '00';
      document.getElementById('countdownSecs').textContent = '00';
      return;
    }

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;

    document.getElementById('countdownDays').textContent = String(days).padStart(2, '0');
    document.getElementById('countdownHours').textContent = String(hours).padStart(2, '0');
    document.getElementById('countdownMins').textContent = String(mins).padStart(2, '0');
    document.getElementById('countdownSecs').textContent = String(secs).padStart(2, '0');
  }

  updateTicker();
  state.countdownTimer = setInterval(updateTicker, 1000);
  if (window.lucide) lucide.createIcons();
}

function renderContests(filter = 'all') {
  state.currentContestFilter = filter;
  const container = document.getElementById('contestsGrid');
  let list = state.contests;

  if (filter === 'registered') {
    list = list.filter(c => state.registeredContestIds.includes(c.id));
  } else if (filter !== 'all') {
    list = list.filter(c => c.platform.toLowerCase() === filter.toLowerCase());
  }

  updateRegisteredBadges();

  if (list.length === 0) {
    if (filter === 'registered') {
      container.innerHTML = `
        <div class="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 text-slate-400 glass-card p-8 space-y-3">
          <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <i data-lucide="check-circle" class="w-6 h-6"></i>
          </div>
          <p class="font-bold text-white text-base">No registered contests found</p>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">Click <strong>Register In-App</strong> on any upcoming contest card to register directly from your dashboard!</p>
        </div>
      `;
    } else {
      container.innerHTML = `<div class="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 text-slate-500">No upcoming ${filter} contests found.</div>`;
    }
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = list.map(c => {
    const isCf = c.platform === 'Codeforces';
    const isReg = state.registeredContestIds.includes(c.id);
    const calUrl = generateGoogleCalendarUrl(c);

    return `
      <div class="glass-card p-4 sm:p-6 flex flex-col justify-between space-y-4 border-t-2 ${isReg ? 'border-t-emerald-500 ring-1 ring-emerald-500/20' : (isCf ? 'border-t-blue-500' : 'border-t-amber-500')}">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 rounded text-xs font-semibold ${isCf ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}">
              ${c.platform}
            </span>
            <div class="flex items-center gap-2">
              ${isReg ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i>Registered</span>' : ''}
              <span class="text-xs text-slate-400 font-mono">${formatDuration(c.duration)}</span>
            </div>
          </div>

          <h3 class="text-base font-bold text-white hover:text-indigo-400 transition-colors">
            <a href="${c.url}" target="_blank" rel="noopener noreferrer">${c.title}</a>
          </h3>

          <div class="space-y-1 text-xs text-slate-400">
            <div class="flex items-center gap-2">
              <i data-lucide="calendar" class="w-4 h-4 text-slate-500 shrink-0"></i>
              <span>${formatDateTime(c.startTime)}</span>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-white/5 flex items-center justify-between gap-2">
          ${isReg ? `
            <div class="flex-1 py-2.5 min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold shadow-md">
              <i data-lucide="check-circle-2" class="w-4 h-4"></i>
              <span>Registered</span>
            </div>
            <button onclick="handleUnregisterContest('${c.id}')" title="Remove from registered list" class="p-2.5 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-white/5 transition-all active:scale-95">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          ` : `
            <button onclick="handleRegisterContest('${c.id}')" id="regBtn_${c.id}" class="flex-1 py-2.5 min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl ${isCf ? 'bg-blue-600 hover:bg-blue-500' : 'bg-amber-600 hover:bg-amber-500'} text-white font-semibold text-xs shadow-md transition-all active:scale-[0.98]">
              <i data-lucide="sparkles" class="w-4 h-4"></i>
              <span>Register In-App</span>
            </button>
            <a href="${c.url}" target="_blank" rel="noopener noreferrer" title="Direct registration page" class="p-2.5 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition-all active:scale-95">
              <i data-lucide="external-link" class="w-4 h-4"></i>
            </a>
          `}
          <a href="${calUrl}" target="_blank" rel="noopener noreferrer" title="Add to Google Calendar" class="p-2.5 min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition-all active:scale-95">
            <i data-lucide="calendar-plus" class="w-4 h-4"></i>
          </a>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// --------------------------------------------------------
// IN-APP CONTEST REGISTRATION LOGIC
// --------------------------------------------------------
async function handleRegisterContest(contestId) {
  const contest = state.contests.find(c => c.id === contestId);
  if (!contest) return;

  const isCf = contest.platform === 'Codeforces';
  const cookie = isCf ? state.cfSessionCookie : state.lcSessionCookie;

  // If no cookie configured yet, guide user to Session Settings modal
  if (!cookie || !cookie.trim()) {
    openContestSessionModal(isCf ? 'codeforces' : 'leetcode');
    showToast(`Please enter your ${contest.platform} session cookie first to register directly in-app!`);
    return;
  }

  const btn = document.getElementById(`regBtn_${contestId}`);
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span> <span>Registering...</span>`;
  }

  try {
    const payload = {
      platform: contest.platform,
      contestId: isCf ? contest.id.replace('cf-', '') : contest.id,
      contestSlug: !isCf ? contest.id.replace('lc-', '') : '',
      contestTitle: contest.title,
      cookie: cookie
    };

    const res = await fetch('/api/contests/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      if (!state.registeredContestIds.includes(contest.id)) {
        state.registeredContestIds.push(contest.id);
        saveRegisteredContests();
      }
      showToast(data.message || `Successfully registered for ${contest.title}!`);
      renderContests(state.currentContestFilter || 'all');
      setupNextContestCountdown();
    } else {
      showToast(`Registration note: ${data.error || 'Check status'}`);
      if (data.directUrl) {
        window.open(data.directUrl, '_blank');
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
  } catch (err) {
    showToast(`Error registering: ${err.message}`);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

function handleUnregisterContest(contestId) {
  state.registeredContestIds = state.registeredContestIds.filter(id => id !== contestId);
  saveRegisteredContests();
  showToast('Removed contest from your registered list.');
  renderContests(state.currentContestFilter || 'all');
  setupNextContestCountdown();
}

function saveRegisteredContests() {
  localStorage.setItem('registeredContestIds', JSON.stringify(state.registeredContestIds));
  updateRegisteredBadges();
}

function updateRegisteredBadges() {
  const badge = document.getElementById('registeredFilterBadge');
  if (badge) {
    const count = state.registeredContestIds.length;
    badge.textContent = count;
    if (count > 0) {
      badge.classList.remove('hidden');
      badge.classList.add('inline-flex');
    } else {
      badge.classList.add('hidden');
      badge.classList.remove('inline-flex');
    }
  }
}

// --------------------------------------------------------
// CONTEST SESSION SETTINGS MODAL MANAGEMENT
// --------------------------------------------------------
function openContestSessionModal(defaultTab = 'codeforces') {
  const modal = document.getElementById('contestSessionModal');
  if (!modal) return;

  // Set inputs to saved values
  const cfInput = document.getElementById('cfCookieInput');
  const lcInput = document.getElementById('lcCookieInput');
  if (cfInput) cfInput.value = state.cfSessionCookie || '';
  if (lcInput) lcInput.value = state.lcSessionCookie || '';

  // Switch to requested tab
  switchSessionTab(defaultTab);
  updateSessionStatusBadges();

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeContestSessionModal() {
  const modal = document.getElementById('contestSessionModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function switchSessionTab(platform) {
  const cfBtn = document.getElementById('cfSessionTabBtn');
  const lcBtn = document.getElementById('lcSessionTabBtn');
  const cfPanel = document.getElementById('cfSessionPanel');
  const lcPanel = document.getElementById('lcSessionPanel');

  if (!cfBtn || !lcBtn || !cfPanel || !lcPanel) return;

  if (platform === 'codeforces') {
    cfBtn.className = 'flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 bg-blue-600 text-white transition-all shadow-sm';
    lcBtn.className = 'flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-all';
    cfPanel.classList.remove('hidden');
    lcPanel.classList.add('hidden');
  } else {
    lcBtn.className = 'flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 bg-amber-600 text-white transition-all shadow-sm';
    cfBtn.className = 'flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-all';
    lcPanel.classList.remove('hidden');
    cfPanel.classList.add('hidden');
  }
}

function updateSessionStatusBadges() {
  const cfBadge = document.getElementById('cfSessionStatusBadge');
  const lcBadge = document.getElementById('lcSessionStatusBadge');
  const dot = document.getElementById('sessionStatusDot');

  // Codeforces status
  if (cfBadge) {
    if (state.cfAccountHandle) {
      cfBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span class="text-emerald-400">Connected as @${state.cfAccountHandle}</span>`;
    } else if (state.cfSessionCookie) {
      cfBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span><span class="text-amber-400">Cookie Saved (Ready)</span>`;
    } else {
      cfBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-500"></span><span class="text-slate-400">Not Configured</span>`;
    }
  }

  // LeetCode status
  if (lcBadge) {
    if (state.lcAccountUsername) {
      lcBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span class="text-emerald-400">Connected as @${state.lcAccountUsername}</span>`;
    } else if (state.lcSessionCookie) {
      lcBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span><span class="text-amber-400">Cookie Saved (Ready)</span>`;
    } else {
      lcBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-500"></span><span class="text-slate-400">Not Configured</span>`;
    }
  }

  // Header status dot
  if (dot) {
    const hasBoth = state.cfSessionCookie && state.lcSessionCookie;
    const hasOne = state.cfSessionCookie || state.lcSessionCookie;
    dot.className = hasBoth
      ? 'w-2 h-2 rounded-full bg-emerald-400'
      : (hasOne ? 'w-2 h-2 rounded-full bg-amber-400' : 'w-2 h-2 rounded-full bg-slate-500');
  }
}

async function testSession(platform) {
  const isCf = platform === 'codeforces';
  const input = document.getElementById(isCf ? 'cfCookieInput' : 'lcCookieInput');
  const btn = document.getElementById(isCf ? 'testCfSessionBtn' : 'testLcSessionBtn');
  const cookie = input ? input.value.trim() : '';

  if (!cookie) {
    showToast(`Please paste your ${isCf ? 'Codeforces' : 'LeetCode'} cookie string first.`);
    return;
  }

  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span> <span>Verifying...</span>`;
  }

  try {
    const res = await fetch('/api/contests/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, cookie })
    });

    const data = await res.json();

    if (data.success) {
      if (isCf) {
        state.cfSessionCookie = cookie;
        state.cfAccountHandle = data.handle || '';
        localStorage.setItem('cfSessionCookie', cookie);
        if (data.handle) localStorage.setItem('cfAccountHandle', data.handle);
        showToast(`Codeforces session verified: ${data.handle}!`);
      } else {
        state.lcSessionCookie = cookie;
        state.lcAccountUsername = data.username || '';
        localStorage.setItem('lcSessionCookie', cookie);
        if (data.username) localStorage.setItem('lcAccountUsername', data.username);
        showToast(`LeetCode session verified: @${data.username}!`);
      }
      updateSessionStatusBadges();
    } else {
      showToast(`Verification failed: ${data.error || 'Invalid session cookie'}`);
    }
  } catch (err) {
    showToast(`Error verifying session: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

function saveSession(platform) {
  const isCf = platform === 'codeforces';
  const input = document.getElementById(isCf ? 'cfCookieInput' : 'lcCookieInput');
  const cookie = input ? input.value.trim() : '';

  if (!cookie) {
    showToast(`Please enter a valid ${isCf ? 'Codeforces' : 'LeetCode'} cookie string.`);
    return;
  }

  if (isCf) {
    state.cfSessionCookie = cookie;
    localStorage.setItem('cfSessionCookie', cookie);
    showToast('Codeforces session cookie saved locally!');
  } else {
    state.lcSessionCookie = cookie;
    localStorage.setItem('lcSessionCookie', cookie);
    showToast('LeetCode session cookie saved locally!');
  }

  updateSessionStatusBadges();
  testSession(platform);
}

function clearAllSessions() {
  state.cfSessionCookie = '';
  state.lcSessionCookie = '';
  state.cfAccountHandle = '';
  state.lcAccountUsername = '';
  localStorage.removeItem('cfSessionCookie');
  localStorage.removeItem('lcSessionCookie');
  localStorage.removeItem('cfAccountHandle');
  localStorage.removeItem('lcAccountUsername');

  const cfInput = document.getElementById('cfCookieInput');
  const lcInput = document.getElementById('lcCookieInput');
  if (cfInput) cfInput.value = '';
  if (lcInput) lcInput.value = '';

  updateSessionStatusBadges();
  showToast('All saved contest sessions have been cleared.');
}

function setupContestSessionModalListeners() {
  const openBtn = document.getElementById('openContestAuthModalBtn');
  const closeBtn = document.getElementById('closeContestSessionModalBtn');
  const cfTab = document.getElementById('cfSessionTabBtn');
  const lcTab = document.getElementById('lcSessionTabBtn');
  const testCfBtn = document.getElementById('testCfSessionBtn');
  const saveCfBtn = document.getElementById('saveCfSessionBtn');
  const testLcBtn = document.getElementById('testLcSessionBtn');
  const saveLcBtn = document.getElementById('saveLcSessionBtn');
  const clearBtn = document.getElementById('clearAllSessionsBtn');

  if (openBtn) openBtn.addEventListener('click', () => openContestSessionModal('codeforces'));
  if (closeBtn) closeBtn.addEventListener('click', closeContestSessionModal);
  if (cfTab) cfTab.addEventListener('click', () => switchSessionTab('codeforces'));
  if (lcTab) lcTab.addEventListener('click', () => switchSessionTab('leetcode'));
  if (testCfBtn) testCfBtn.addEventListener('click', () => testSession('codeforces'));
  if (saveCfBtn) saveCfBtn.addEventListener('click', () => saveSession('codeforces'));
  if (testLcBtn) testLcBtn.addEventListener('click', () => testSession('leetcode'));
  if (saveLcBtn) saveLcBtn.addEventListener('click', () => saveSession('leetcode'));
  if (clearBtn) clearBtn.addEventListener('click', clearAllSessions);

  // Close when clicking modal backdrop
  const modal = document.getElementById('contestSessionModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeContestSessionModal();
    });
  }

  updateSessionStatusBadges();
}

function generateGoogleCalendarUrl(contest) {
  const start = new Date(contest.startTime * 1000).toISOString().replace(/-|:|\.\d\d\d/g, '');
  const end = new Date((contest.startTime + contest.duration) * 1000).toISOString().replace(/-|:|\.\d\d\d/g, '');
  const title = encodeURIComponent(`${contest.platform}: ${contest.title}`);
  const details = encodeURIComponent(`Contest URL: ${contest.url}\nPlatform: ${contest.platform}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

// --------------------------------------------------------
// HEAD-TO-HEAD COMPARE
// --------------------------------------------------------
async function handleCompare() {
  const u1 = document.getElementById('cmp1Cf').value.trim();
  const u2 = document.getElementById('cmp2Cf').value.trim();

  if (!u1 || !u2) {
    showAlert('Please enter two usernames to compare.');
    return;
  }

  const cmpBtn = document.getElementById('compareBtn');
  cmpBtn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span><span>Comparing...</span>`;
  cmpBtn.disabled = true;

  try {
    const [c1CfRes, c1LcRes, c2CfRes, c2LcRes] = await Promise.all([
      fetch(`/api/cf/user/${encodeURIComponent(u1)}`).then(r => r.json()).catch(() => null),
      fetch(`/api/lc/user/${encodeURIComponent(u1)}`).then(r => r.json()).catch(() => null),
      fetch(`/api/cf/user/${encodeURIComponent(u2)}`).then(r => r.json()).catch(() => null),
      fetch(`/api/lc/user/${encodeURIComponent(u2)}`).then(r => r.json()).catch(() => null),
    ]);

    const data1 = {
      name: u1,
      cfRating: c1CfRes?.data?.profile?.rating || 0,
      cfMaxRating: c1CfRes?.data?.profile?.maxRating || 0,
      cfSolved: c1CfRes?.data?.stats?.totalSolved || 0,
      cfStreak: c1CfRes?.data?.stats?.currentStreak || 0,
      cfMaxStreak: c1CfRes?.data?.stats?.maxStreak || 0,
      lcRating: c1LcRes?.data?.contest?.rating || 0,
      lcSolved: c1LcRes?.data?.stats?.totalSolved || 0,
      lcStreak: c1LcRes?.data?.stats?.currentStreak || 0,
      lcMaxStreak: c1LcRes?.data?.stats?.maxStreak || 0,
      lcContests: c1LcRes?.data?.contest?.attendedContestsCount || 0
    };

    const data2 = {
      name: u2,
      cfRating: c2CfRes?.data?.profile?.rating || 0,
      cfMaxRating: c2CfRes?.data?.profile?.maxRating || 0,
      cfSolved: c2CfRes?.data?.stats?.totalSolved || 0,
      cfStreak: c2CfRes?.data?.stats?.currentStreak || 0,
      cfMaxStreak: c2CfRes?.data?.stats?.maxStreak || 0,
      lcRating: c2LcRes?.data?.contest?.rating || 0,
      lcSolved: c2LcRes?.data?.stats?.totalSolved || 0,
      lcStreak: c2LcRes?.data?.stats?.currentStreak || 0,
      lcMaxStreak: c2LcRes?.data?.stats?.maxStreak || 0,
      lcContests: c2LcRes?.data?.contest?.attendedContestsCount || 0
    };

    renderCompareTable(data1, data2);
  } catch (err) {
    showAlert(`Comparison error: ${err.message}`);
  } finally {
    cmpBtn.innerHTML = `<i data-lucide="arrow-right-left" class="w-4 h-4"></i><span>Compare Now</span>`;
    cmpBtn.disabled = false;
    if (window.lucide) lucide.createIcons();
  }
}

function renderCompareTable(d1, d2) {
  const card = document.getElementById('compareResultsCard');
  card.classList.remove('hidden');

  document.getElementById('cmpCol1Header').textContent = d1.name;
  document.getElementById('cmpCol2Header').textContent = d2.name;

  const metrics = [
    { label: 'Codeforces Current Rating', v1: d1.cfRating, v2: d2.cfRating },
    { label: 'Codeforces Max Rating', v1: d1.cfMaxRating, v2: d2.cfMaxRating },
    { label: 'Codeforces Solved Problems', v1: d1.cfSolved, v2: d2.cfSolved },
    { label: 'Codeforces Current Streak', v1: d1.cfStreak, v2: d2.cfStreak },
    { label: 'Codeforces Max Streak', v1: d1.cfMaxStreak, v2: d2.cfMaxStreak },
    { label: 'LeetCode Contest Rating', v1: d1.lcRating, v2: d2.lcRating },
    { label: 'LeetCode Solved Problems', v1: d1.lcSolved, v2: d2.lcSolved },
    { label: 'LeetCode Current Streak', v1: d1.lcStreak, v2: d2.lcStreak },
    { label: 'LeetCode Max Streak', v1: d1.lcMaxStreak, v2: d2.lcMaxStreak },
    { label: 'LeetCode Contests Attended', v1: d1.lcContests, v2: d2.lcContests }
  ];

  const tbody = document.getElementById('compareBody');
  tbody.innerHTML = metrics.map(m => {
    let leader = 'Tie';
    if (m.v1 > m.v2) leader = `<span class="text-blue-400 font-bold">${d1.name} 🏆</span>`;
    else if (m.v2 > m.v1) leader = `<span class="text-purple-400 font-bold">${d2.name} 🏆</span>`;

    return `
      <tr>
        <td class="font-medium text-slate-300">${m.label}</td>
        <td class="font-mono ${m.v1 > m.v2 ? 'text-emerald-400 font-bold' : 'text-slate-200'}">${m.v1.toLocaleString()}</td>
        <td class="font-mono ${m.v2 > m.v1 ? 'text-emerald-400 font-bold' : 'text-slate-200'}">${m.v2.toLocaleString()}</td>
        <td class="text-xs">${leader}</td>
      </tr>
    `;
  }).join('');
}

// --------------------------------------------------------
// LOCAL STORAGE & HISTORY
// --------------------------------------------------------
function saveToHistory(cf, lc) {
  const username = cf || lc;
  if (!username) return;

  localStorage.setItem('cp_cf_handle', cf || '');
  localStorage.setItem('cp_lc_handle', lc || '');

  let history = JSON.parse(localStorage.getItem('cp_single_history') || '[]');
  history = history.filter(h => h.toLowerCase() !== username.toLowerCase());
  history.unshift(username);
  if (history.length > 5) history.pop();
  localStorage.setItem('cp_single_history', JSON.stringify(history));

  renderHistoryPills();
}

function renderHistoryPills() {
  const container = document.getElementById('historyPills');
  const history = JSON.parse(localStorage.getItem('cp_single_history') || '[]');

  if (history.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <span class="text-[11px] text-slate-500 uppercase tracking-wider font-semibold ml-2">Recent:</span>
    ${history.slice(0, 4).map(u => `
      <button class="px-2.5 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 font-mono text-xs transition-all" onclick="applySingleUsername('${u}')">
        ${u}
      </button>
    `).join('')}
  `;
}

window.applySingleUsername = function(user) {
  state.username = user;
  state.cfHandle = user;
  state.lcHandle = user;
  state.isSplitMode = false;

  const universalInput = document.getElementById('universalUsernameInput');
  if (universalInput) universalInput.value = user;

  updateSplitModeUI();
  updateBrowserUrl();
  saveToHistory(user, user);
  fetchAllData();
};

