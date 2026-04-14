import React, { useState } from 'react';

export default function AuthModal({ onClose, onLogin, defaultTab = 'login' }) {
  const [tab, setTab] = useState(defaultTab);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = tab === 'login'
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password };

      const res = await fetch(`/auth/${tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }

      localStorage.setItem('am_token', data.token);
      localStorage.setItem('am_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="am-auth-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="am-auth-box">
        <button className="am-close-btn" style={{ position: 'absolute', top: 12, right: 12 }} onClick={onClose}>✕</button>
        <div className="am-auth-logo">
          <img src="/animemist-logo.png" alt="Anime Mist" />
        </div>
        <div className="am-tabs">
          <button className={`am-tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>Sign In</button>
          <button className={`am-tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>Create Account</button>
        </div>
        {error && <div className="am-error">{error}</div>}
        <form onSubmit={submit}>
          {tab === 'register' && (
            <div className="am-field">
              <label>Username</label>
              <input type="text" placeholder="Choose a username" value={form.username} onChange={set('username')} required />
            </div>
          )}
          <div className="am-field">
            <label>Email</label>
            <input type="email" placeholder="Your email address" value={form.email} onChange={set('email')} required />
          </div>
          <div className="am-field">
            <label>Password</label>
            <input type="password" placeholder={tab === 'login' ? 'Your password' : 'At least 6 characters'} value={form.password} onChange={set('password')} required />
          </div>
          <button className="am-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div className="am-toggle-link">
          {tab === 'login' ? (
            <>Don't have an account? <span onClick={() => { setTab('register'); setError(''); }}>Sign Up</span></>
          ) : (
            <>Already have an account? <span onClick={() => { setTab('login'); setError(''); }}>Sign In</span></>
          )}
        </div>
      </div>
    </div>
  );
}
