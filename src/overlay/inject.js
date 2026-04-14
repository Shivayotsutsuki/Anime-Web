function injectSidebarItems() {
  const grid = document.querySelector('.quick-actions-grid');
  if (!grid || grid.querySelector('.am-injected')) return;

  const user = window.__amUser;

  const membershipBtn = document.createElement('div');
  membershipBtn.className = 'quick-action-item am-injected';
  membershipBtn.setAttribute('role', 'button');
  membershipBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;display:block">
      <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
    </svg>
    <span style="font-size:0.75rem;font-weight:500">${user ? (user.username?.split(' ')[0] || 'Account') : 'Join'}</span>
  `;
  membershipBtn.style.cursor = 'pointer';
  membershipBtn.addEventListener('click', () => {
    document.querySelector('.close-button')?.click();
    setTimeout(() => window.__amOpenPanel?.('membership'), 200);
  });

  const adminBtn = document.createElement('div');
  adminBtn.className = 'quick-action-item am-injected';
  adminBtn.setAttribute('role', 'button');
  adminBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;display:block">
      <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
    </svg>
    <span style="font-size:0.75rem;font-weight:500">Admin</span>
  `;
  adminBtn.style.cursor = 'pointer';
  adminBtn.addEventListener('click', () => {
    document.querySelector('.close-button')?.click();
    setTimeout(() => window.__amOpenPanel?.('admin'), 200);
  });

  grid.appendChild(membershipBtn);
  grid.appendChild(adminBtn);
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
  if (document.querySelector('.sidebar-main.sidebar-open')) {
    injectSidebarItems();
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
  injectSidebarItems();
  injectScheduleButton();
}, 1500);
