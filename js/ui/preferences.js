// Unified Preferences Modal Logic
// Provides open/close, tab switching, profile, dark mode, account deletion, and bug report.
// Relies on global supabase and getCurrentUser() if available.
(function() {
  let initialized = false;
  let modalInjected = false;

  function ensureModalPresent() {
    if (document.getElementById('preferencesModal')) return;
    // Try data-include loader first (load-footer.js handles it). If not yet loaded, fetch directly.
    const includeHost = document.querySelector('[data-include="preferences-modal"]');
    if (includeHost && includeHost.innerHTML.trim() === '') {
      // It will be filled by load-footer.js soon; poll briefly
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (document.getElementById('preferencesModal') || attempts > 20) {
          clearInterval(interval);
          if (!document.getElementById('preferencesModal')) {
            // Fallback fetch
            fetch('preferences-modal.html').then(r => r.text()).then(html => {
              includeHost.innerHTML = html;
              modalInjected = true;
            }).catch(err => console.error('Preferences modal fetch failed', err));
          }
        }
      }, 150);
    } else {
      // Fallback direct append if no placeholder
      fetch('preferences-modal.html').then(r => r.text()).then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        modalInjected = true;
      }).catch(err => console.error('Preferences modal fetch failed', err));
    }
  }

  function initPreferencesTabs() {
    const tabs = document.querySelectorAll('.preferences-tab');
    const panels = document.querySelectorAll('.preferences-panel');
    if (!tabs.length || !panels.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById(`${tabName}-panel`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  function loadPreferencesData() {
    const currentUser = window.currentUser || null;
    if (!currentUser) return;

    // Profile
    const displayName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email.split('@')[0];
    const username = currentUser.user_metadata?.username || '';
    const dnEl = document.getElementById('prefDisplayName');
    const unEl = document.getElementById('prefUsername');
    if (dnEl) dnEl.textContent = displayName;
    if (unEl) unEl.value = username;

    // Dark mode state
    const darkModeEnabled = localStorage.getItem('darkMode') === 'enabled';
    const toggle = document.getElementById('darkModeToggle');
    const status = document.getElementById('darkModeStatus');
    if (toggle) toggle.checked = darkModeEnabled;
    if (status) status.textContent = darkModeEnabled ? 'Dark Mode' : 'Light Mode';

    // Connected accounts
    const connectedAccountsDiv = document.getElementById('connectedAccounts');
    if (connectedAccountsDiv) {
      connectedAccountsDiv.innerHTML = '';
      const providers = currentUser.app_metadata?.providers || [currentUser.app_metadata?.provider || 'email'];
      const email = currentUser.email;
      providers.forEach(provider => {
        const accountDiv = document.createElement('div');
        accountDiv.className = 'connected-account';
        let providerIcon = '';
        let providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        if (provider === 'github') {
          providerIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>';
        } else if (provider === 'google') {
          providerIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';
        } else {
          providerIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6"/></svg>';
        }
        accountDiv.innerHTML = `${providerIcon}<div class="connected-account-info"><div class="connected-account-name">${providerName}</div><div class="connected-account-email">${email}</div></div>`;
        connectedAccountsDiv.appendChild(accountDiv);
      });
    }
  }

  // Public API
  window.openPreferencesModal = async function() {
    ensureModalPresent();
    if (!window.currentUser) {
      if (typeof getCurrentUser === 'function') {
        try { await getCurrentUser(); } catch(e){ console.warn('getCurrentUser failed', e); }
      } else {
        try {
          const authMod = await import('../auth/auth.js');
          const user = await authMod.getCurrentUser();
          window.currentUser = user;
        } catch(e){ console.warn('Dynamic auth import failed', e); }
      }
    }
    // Close any user dropdowns
    ['editorUserDropdown','userDropdown'].forEach(id => {
      const dd = document.getElementById(id); if (dd) dd.classList.remove('active');
    });
    const modal = document.getElementById('preferencesModal');
    if (!modal) return;
    modal.style.display = 'flex';
    initPreferencesTabs();
    loadPreferencesData();
  };

  window.closePreferencesModal = function() {
    const modal = document.getElementById('preferencesModal');
    if (modal) modal.style.display = 'none';
  };

  window.updateUsername = async function() {
    if (!window.currentUser && typeof getCurrentUser === 'function') { await getCurrentUser(); }
    const currentUser = window.currentUser; if (!currentUser) return;
    const newUsername = document.getElementById('prefUsername').value.trim();
    if (!newUsername || newUsername.length < 3 || newUsername.length > 20) { showNotification && showNotification('Username must be 3-20 characters','error'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) { showNotification && showNotification('Username can only contain letters, numbers and underscore','error'); return; }
    try {
      const { data: existingUser } = await supabase.from('user_profiles').select('id').eq('username', newUsername).single();
      if (existingUser && existingUser.id !== currentUser.id) { showNotification && showNotification('Username already taken','error'); return; }
      const { error: updateError } = await supabase.auth.updateUser({ data: { username: newUsername } });
      if (updateError) throw updateError;
      const { error: profileError } = await supabase.from('user_profiles').upsert({ id: currentUser.id, username: newUsername, email: currentUser.email });
      if (profileError) console.error(profileError);
      showNotification && showNotification('Username updated','success');
      loadPreferencesData();
    } catch (e) {
      console.error('Username update failed', e);
      showNotification && showNotification('Failed to update username','error');
    }
  };

  window.confirmDeleteAccount = async function() {
    if (!window.currentUser && typeof getCurrentUser === 'function') { await getCurrentUser(); }
    const currentUser = window.currentUser; if (!currentUser) return;
    const confirmed = confirm('⚠️ WARNING: This will permanently delete your account and all your data.\n\nType "DELETE" to confirm.');
    if (!confirmed) return;
    const check = prompt('Type DELETE to confirm:');
    if (check !== 'DELETE') { showNotification && showNotification('Account deletion cancelled','info'); return; }
    try {
      const { error: profileError } = await supabase.from('user_profiles').delete().eq('id', currentUser.id);
      if (profileError) throw profileError;
      const { error: projectsError } = await supabase.from('projects').delete().eq('user_id', currentUser.id);
      if (projectsError) throw projectsError;
      await supabase.auth.signOut();
      showNotification && showNotification('Account deleted','success');
      setTimeout(() => window.location.href = 'index.html', 1200);
    } catch (e) {
      console.error('Delete failed', e);
      showNotification && showNotification('Failed to delete account','error');
    }
  };

  window.toggleDarkMode = function() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    const status = document.getElementById('darkModeStatus');
    if (status) status.textContent = isDark ? 'Dark Mode' : 'Light Mode';
  };

  window.reportBug = function() { window.open('https://github.com/remyvallot/papergraph/issues/new','_blank'); };

  function initOnce() {
    if (initialized) return; initialized = true;
    ensureModalPresent();
    // Modal background click to close
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('preferencesModal');
      if (modal && modal.style.display === 'flex' && e.target === modal) {
        closePreferencesModal();
      }
    });
    // Apply stored dark mode
    const darkModeEnabled = localStorage.getItem('darkMode') === 'enabled';
    if (darkModeEnabled) document.body.classList.add('dark-theme');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnce);
  } else {
    initOnce();
  }
})();
