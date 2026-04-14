import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import MembershipPage from './MembershipPage.jsx';
import AdminPanel from './AdminPanel.jsx';
import ScheduleView from './ScheduleView.jsx';
import './styles.css';

function loadUser() {
  try {
    return JSON.parse(localStorage.getItem('am_user')) || null;
  } catch { return null; }
}

function AnimeMistOverlay() {
  const [panel, setPanel] = useState(null);
  const [user, setUser] = useState(loadUser);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('am_token');
      if (!token) return;
      fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.user) { setUser(d.user); localStorage.setItem('am_user', JSON.stringify(d.user)); } else { setUser(null); localStorage.removeItem('am_user'); localStorage.removeItem('am_token'); } })
        .catch(() => {});
    }
  }, []);

  const close = () => setPanel(null);
  const login = (u) => { setUser(u); localStorage.setItem('am_user', JSON.stringify(u)); };
  const logout = () => { setUser(null); setPanel(null); };

  return (
    <div className="am-overlay-root">
      <div className="am-float-btn">
        <button className="am-tab" onClick={() => setPanel(panel === 'schedule' ? null : 'schedule')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Schedule
        </button>
        <button className="am-tab" onClick={() => setPanel(panel === 'membership' ? null : 'membership')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
          </svg>
          {user ? user.username?.split(' ')[0] : 'Join'}
        </button>
        <button className="am-tab" onClick={() => setPanel(panel === 'admin' ? null : 'admin')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07"/>
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          Admin
        </button>
      </div>

      {panel === 'membership' && (
        <MembershipPage user={user} onClose={close} onLogin={login} onLogout={logout} />
      )}
      {panel === 'admin' && (
        <AdminPanel user={user} onClose={close} />
      )}
      {panel === 'schedule' && (
        <ScheduleView onClose={close} />
      )}
    </div>
  );
}

const overlayRoot = document.getElementById('animemist-overlay');
if (overlayRoot) {
  ReactDOM.createRoot(overlayRoot).render(<AnimeMistOverlay />);
}
