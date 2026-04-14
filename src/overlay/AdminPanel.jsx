import React, { useState, useEffect } from 'react';

const MEMBERSHIPS = ['free', 'premium', 'vip'];
const ROLES = ['user', 'admin'];

export default function AdminPanel({ user, onClose }) {
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('users');
  const [saving, setSaving] = useState({});
  const [msg, setMsg] = useState('');

  const headers = (extra = {}) => ({
    'Content-Type': 'application/json',
    'x-admin-key': adminKey,
    ...(user ? { Authorization: `Bearer ${localStorage.getItem('am_token')}` } : {}),
    ...extra,
  });

  const tryAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const res = await fetch('/admin/stats', { headers: headers() });
      if (!res.ok) { setAuthError('Invalid admin password'); return; }
      const data = await res.json();
      setStats(data);
      setAuthenticated(true);
      loadUsers();
    } catch { setAuthError('Connection error'); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [ur, sr] = await Promise.all([
        fetch('/admin/users', { headers: headers() }),
        fetch('/admin/stats', { headers: headers() }),
      ]);
      if (ur.ok) setUsers((await ur.json()).users || []);
      if (sr.ok) setStats(await sr.json());
    } catch {}
    finally { setLoading(false); }
  };

  const updateUser = async (id, field, value) => {
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/admin/users/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const updated = (await res.json()).user;
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updated } : u));
        setMsg('User updated successfully');
        setTimeout(() => setMsg(''), 3000);
      }
    } catch {}
    finally { setSaving((s) => ({ ...s, [id]: false })); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      const res = await fetch(`/admin/users/${id}`, { method: 'DELETE', headers: headers() });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setMsg('User deleted');
        setTimeout(() => setMsg(''), 3000);
        loadUsers();
      }
    } catch {}
  };

  if (!authenticated) {
    return (
      <div className="am-panel">
        <div className="am-panel-header">
          <img src="/animemist-logo.png" alt="Anime Mist" />
          <h1>Admin Panel</h1>
          <button className="am-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="am-content">
          <div className="am-admin-login">
            <h2>Admin Access</h2>
            <p>Enter your admin password to continue</p>
            {authError && <div className="am-error">{authError}</div>}
            <form onSubmit={tryAuth}>
              <div className="am-field">
                <label>Admin Password</label>
                <input
                  type="password"
                  placeholder="Enter admin password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  required
                />
              </div>
              <button className="am-btn" type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Access Admin Panel'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="am-panel">
      <div className="am-panel-header">
        <img src="/animemist-logo.png" alt="Anime Mist" />
        <h1>Admin Panel</h1>
        <button className="am-close-btn" style={{ marginRight: 8, width: 'auto', padding: '0 14px', fontSize: 13 }} onClick={loadUsers}>↻ Refresh</button>
        <button className="am-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="am-content">
        {msg && <div className="am-success" style={{ marginBottom: 16 }}>{msg}</div>}

        {stats && (
          <div className="am-admin-stats">
            <div className="am-stat-card"><h4>Total Users</h4><p>{stats.total}</p></div>
            <div className="am-stat-card"><h4>Free Members</h4><p style={{ color: '#9ca3af' }}>{stats.free}</p></div>
            <div className="am-stat-card"><h4>Premium</h4><p>{stats.premium}</p></div>
            <div className="am-stat-card"><h4>VIP</h4><p style={{ color: '#fbbf24' }}>{stats.vip}</p></div>
            <div className="am-stat-card"><h4>Admins</h4><p style={{ color: '#ef4444' }}>{stats.admins}</p></div>
          </div>
        )}

        <div className="am-tabs" style={{ marginBottom: 24 }}>
          <button className={`am-tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users</button>
          <button className={`am-tab-btn ${tab === 'memberships' ? 'active' : ''}`} onClick={() => setTab('memberships')}>Memberships</button>
        </div>

        {loading ? (
          <div className="am-loading"><div className="am-spinner"></div><p>Loading...</p></div>
        ) : (
          <div className="am-table-wrap">
            <table className="am-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Membership</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#4b5563' }}>No users yet</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ color: '#fff', fontWeight: 600 }}>{u.username}</td>
                    <td style={{ color: '#9ca3af' }}>{u.email}</td>
                    <td>
                      <select
                        className="am-select"
                        value={u.role}
                        disabled={saving[u.id]}
                        onChange={(e) => updateUser(u.id, 'role', e.target.value)}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      <select
                        className="am-select"
                        value={u.membership}
                        disabled={saving[u.id]}
                        onChange={(e) => updateUser(u.id, 'membership', e.target.value)}
                      >
                        {MEMBERSHIPS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="am-action-btn" onClick={() => deleteUser(u.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
