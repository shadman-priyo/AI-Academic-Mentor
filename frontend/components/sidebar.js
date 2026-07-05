/* =============================================
   SIDEBAR COMPONENT — CSE4104-7C-T05
   Admin link only visible to admin role.
   ============================================= */

function renderSidebar(activePage) {
  const user = Auth.get();
  if (!user) return;

  const navItems = [
    { href: 'dashboard.html',   icon: '⬡',  label: 'Dashboard',      id: 'dashboard'   },
    { href: 'chatbot.html',     icon: '🤖', label: 'AI Chatbot',      id: 'chatbot'     },
    { href: 'quiz.html',        icon: '⚡', label: 'Quiz Generator',  id: 'quiz'        },
    { href: 'summarizer.html',  icon: '📝', label: 'Note Summarizer', id: 'summarizer'  },
    { href: 'planner.html',     icon: '📅', label: 'Study Planner',   id: 'planner'     },
    { href: 'progress.html',    icon: '📊', label: 'Progress',        id: 'progress'    },
  ];

  // Admin section — only injected for admin role, never visible to students
  const adminItems = user.role === 'admin' ? `
    <div class="sidebar-section-label">Administration</div>
    <a href="admin.html" class="${activePage === 'admin' ? 'active' : ''}" style="color:${activePage === 'admin' ? '' : '#f0c060'};">
      <span class="nav-icon">🛡</span> Admin Panel
    </a>
  ` : '';

  const notifCount = Notifications.unreadCount();

  document.getElementById('sidebar-root').innerHTML = `
    <aside class="sidebar" id="sidebar">
      <a href="dashboard.html" class="sidebar-logo">
        <span class="logo-icon">⬡</span>
        <span>AI<strong>Mentor</strong></span>
      </a>
      <nav class="sidebar-nav">
        <div class="sidebar-section-label">Navigation</div>
        ${navItems.map(item => `
          <a href="${item.href}" class="${activePage === item.id ? 'active' : ''}">
            <span class="nav-icon">${item.icon}</span> ${item.label}
          </a>
        `).join('')}
        <div class="sidebar-section-label">System</div>
        <a href="notifications.html" class="${activePage === 'notifications' ? 'active' : ''}">
          <span class="nav-icon">🔔</span> Notifications
          ${notifCount > 0 ? `<span style="margin-left:auto;background:var(--accent-2);color:#fff;font-size:0.65rem;font-weight:700;padding:2px 7px;border-radius:999px;">${notifCount}</span>` : ''}
        </a>
        <a href="settings.html" class="${activePage === 'settings' ? 'active' : ''}">
          <span class="nav-icon">⚙</span> Settings
        </a>
        ${adminItems}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" onclick="Auth.logout()" title="Sign out">
          <div class="user-avatar">${Auth.initials(user.name)}</div>
          <div class="user-info">
            <div class="user-name">${escapeHtml(user.name)}</div>
            <div class="user-role">${user.role === 'admin' ? '🛡 Admin' : '🎓 Student'} · Sign out</div>
          </div>
        </div>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
  `;

  // Show mobile menu button
  const mobBtn = document.getElementById('mobMenuBtn');
  if (mobBtn) mobBtn.style.display = '';
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('active');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}
