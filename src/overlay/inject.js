let sidebarWasOpen = false;

function clearInjected() {
  document.querySelectorAll('.am-injected').forEach((el) => el.remove());
  const hiBtn = document.querySelector('.am-hi-btn');
  if (hiBtn) hiBtn.remove();
}

function injectHindiOption() {
  const langSwitcher = document.querySelector('.language-switcher');
  if (!langSwitcher || langSwitcher.querySelector('.am-hi-btn')) return;

  const isHindiActive = localStorage.getItem('am_lang') === 'HI';

  const hiBtn = document.createElement('button');
  hiBtn.className = `lang-button am-hi-btn ${isHindiActive ? 'active' : ''}`;
  hiBtn.title = 'Hindi';
  hiBtn.textContent = 'HI';
  hiBtn.style.cursor = 'pointer';
  hiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentLang = localStorage.getItem('am_lang');
    if (currentLang === 'HI') {
      localStorage.removeItem('am_lang');
      hiBtn.classList.remove('active');
    } else {
      localStorage.setItem('am_lang', 'HI');
      document.querySelectorAll('.lang-button').forEach(b => b.classList.remove('active'));
      hiBtn.classList.add('active');
    }
  });

  langSwitcher.appendChild(hiBtn);

  const langLabel = langSwitcher.parentElement?.querySelector('.text-white\\/60');
  if (langLabel) langLabel.textContent = 'Language';
}

function injectSidebarItems() {
  const grid = document.querySelector('.quick-actions-grid');
  if (!grid || grid.querySelector('.am-injected')) return;

  const user = window.__amUser;

  if (!user) {
    const signInBtn = document.createElement('div');
    signInBtn.className = 'quick-action-item am-injected';
    signInBtn.setAttribute('role', 'button');
    signInBtn.style.cursor = 'pointer';
    signInBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;display:block">
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
      <span style="font-size:0.75rem;font-weight:500">Sign In</span>
    `;
    signInBtn.addEventListener('click', () => {
      document.querySelector('.close-button')?.click();
      setTimeout(() => {
        window.__amOpenPanel?.('membership');
        window.__amSetAuthTab?.('login');
      }, 200);
    });

    const signUpBtn = document.createElement('div');
    signUpBtn.className = 'quick-action-item am-injected';
    signUpBtn.setAttribute('role', 'button');
    signUpBtn.style.cursor = 'pointer';
    signUpBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;display:block">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/>
        <line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
      <span style="font-size:0.75rem;font-weight:500">Sign Up</span>
    `;
    signUpBtn.addEventListener('click', () => {
      document.querySelector('.close-button')?.click();
      setTimeout(() => {
        window.__amOpenPanel?.('membership');
        window.__amSetAuthTab?.('register');
      }, 200);
    });

    grid.appendChild(signInBtn);
    grid.appendChild(signUpBtn);
  } else {
    const membership = user.membership || 'free';
    const badgeColor = membership === 'vip' ? '#f59e0b' : membership === 'premium' ? '#a78bfa' : '#9ca3af';

    const accountBtn = document.createElement('div');
    accountBtn.className = 'quick-action-item am-injected';
    accountBtn.setAttribute('role', 'button');
    accountBtn.style.cursor = 'pointer';
    accountBtn.innerHTML = `
      <div style="width:20px;height:20px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0">
        ${user.username?.[0]?.toUpperCase() || '?'}
      </div>
      <span style="font-size:0.75rem;font-weight:600;color:${badgeColor}">${user.username?.split(' ')[0] || 'Account'}</span>
    `;
    accountBtn.addEventListener('click', () => {
      document.querySelector('.close-button')?.click();
      setTimeout(() => window.__amOpenPanel?.('membership'), 200);
    });
    grid.appendChild(accountBtn);
  }

  const adminBtn = document.createElement('div');
  adminBtn.className = 'quick-action-item am-injected';
  adminBtn.setAttribute('role', 'button');
  adminBtn.style.cursor = 'pointer';
  adminBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;display:block">
      <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
    </svg>
    <span style="font-size:0.75rem;font-weight:500">Admin</span>
  `;
  adminBtn.addEventListener('click', () => {
    document.querySelector('.close-button')?.click();
    setTimeout(() => window.__amOpenPanel?.('admin'), 200);
  });
  grid.appendChild(adminBtn);

  injectHindiOption();
}

function injectScheduleButton() {
  const headers = document.querySelectorAll('.font-bold.text-2xl.text-white');
  headers.forEach((header) => {
    if (
      header.textContent.includes('Estimated Schedule') &&
      !header.querySelector('.am-sched-btn')
    ) {
      const btn = document.createElement('button');
      btn.className = 'am-sched-btn';
      btn.textContent = '📆 Full Calendar';
      btn.style.cssText = `
        margin-left: 10px;
        background: linear-gradient(135deg, #7c3aed, #4f46e5);
        color: #fff;
        border: none;
        border-radius: 20px;
        padding: 3px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        vertical-align: middle;
        transition: opacity 0.2s;
      `;
      btn.addEventListener('mouseenter', () => (btn.style.opacity = '0.85'));
      btn.addEventListener('mouseleave', () => (btn.style.opacity = '1'));
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.__amOpenPanel?.('schedule');
      });
      header.appendChild(btn);
    }
  });
}

const observer = new MutationObserver(() => {
  const isOpen = !!document.querySelector('.sidebar-main.sidebar-open');

  if (isOpen && !sidebarWasOpen) {
    sidebarWasOpen = true;
    injectSidebarItems();
  } else if (!isOpen && sidebarWasOpen) {
    sidebarWasOpen = false;
    clearInjected();
  }

  injectScheduleButton();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class'],
});

setTimeout(() => {
  injectScheduleButton();
}, 1500);
