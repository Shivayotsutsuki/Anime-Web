import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import MembershipPage from './MembershipPage.jsx';
import AdminPanel from './AdminPanel.jsx';
import ScheduleView from './ScheduleView.jsx';
import './styles.css';

function loadUser() {
  try { return JSON.parse(localStorage.getItem('am_user')) || null; } catch { return null; }
}

function AnimeMistOverlay() {
  const [panel, setPanel] = useState(null);
  const [user, setUser] = useState(loadUser);
  const [authTab, setAuthTab] = useState('login');
  const [upgradeMsg, setUpgradeMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('am_token');
    if (!token) return;
    fetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.user) { setUser(d.user); localStorage.setItem('am_user', JSON.stringify(d.user)); }
        else { setUser(null); localStorage.removeItem('am_user'); localStorage.removeItem('am_token'); }
      })
      .catch(() => {});
  }, []);

  const close = useCallback(() => setPanel(null), []);
  const login = useCallback((u) => { setUser(u); localStorage.setItem('am_user', JSON.stringify(u)); }, []);
  const logout = useCallback(() => { setUser(null); setPanel(null); localStorage.removeItem('am_lang'); }, []);

  useEffect(() => {
    window.__amOpenPanel = (p) => setPanel(p);
    window.__amUser = user;
    window.__amSetAuthTab = (tab) => setAuthTab(tab);
    window.__amShowUpgradeMsg = (msg) => {
      setUpgradeMsg(msg);
      setPanel('membership');
      setTimeout(() => setUpgradeMsg(''), 7000);
    };
    return () => {
      window.__amOpenPanel = null;
      window.__amSetAuthTab = null;
      window.__amShowUpgradeMsg = null;
    };
  }, [user]);

  return (
    <>
      {panel === 'membership' && (
        <MembershipPage
          user={user}
          onClose={close}
          onLogin={login}
          onLogout={logout}
          defaultAuthTab={authTab}
          upgradeMsg={upgradeMsg}
        />
      )}
      {panel === 'admin' && (
        <AdminPanel user={user} onClose={close} />
      )}
      {panel === 'schedule' && (
        <ScheduleView onClose={close} />
      )}
    </>
  );
}

export default AnimeMistOverlay;

const overlayEl = document.getElementById('animemist-overlay');
if (overlayEl && !overlayEl._amRoot) {
  overlayEl._amRoot = ReactDOM.createRoot(overlayEl);
  overlayEl._amRoot.render(<AnimeMistOverlay />);
}
