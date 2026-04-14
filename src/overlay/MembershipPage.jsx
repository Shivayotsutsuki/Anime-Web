import React, { useState } from 'react';
import AuthModal from './AuthModal.jsx';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    features: [
      'Watch anime with ads',
      'SD & HD quality (720p)',
      'Japanese & English subtitles',
      'Browse all anime catalog',
      'Basic search & filters',
    ],
    btnClass: 'am-plan-btn-free',
    btnLabel: 'Current Plan',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '₹199',
    period: '/month',
    features: [
      'Ad-free streaming',
      'Full HD & 4K quality',
      'Japanese, English subtitles',
      'Download episodes offline',
      'Early access to new episodes',
      'Priority support',
    ],
    featured: true,
    btnClass: 'am-plan-btn-premium',
    btnLabel: 'Go Premium',
  },
  {
    id: 'vip',
    name: 'VIP',
    price: '₹499',
    period: '/month',
    features: [
      'Everything in Premium',
      'Multi-device streaming (5 screens)',
      'Exclusive VIP content',
      'No regional restrictions',
      'Dedicated 24/7 support',
      'Early beta features',
    ],
    btnClass: 'am-plan-btn-vip',
    btnLabel: 'Get VIP',
  },
];

export default function MembershipPage({ user, onClose, onLogin, onLogout }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [upgradeMsg, setUpgradeMsg] = useState('');

  const handleUpgrade = (planId) => {
    if (!user) { setAuthTab('register'); setShowAuth(true); return; }
    if (planId === 'free') return;
    setUpgradeMsg(`To upgrade to ${planId.toUpperCase()}, please contact us at support@animemist.com or use the payment link sent to your email.`);
    setTimeout(() => setUpgradeMsg(''), 6000);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('am_token');
      if (token) await fetch('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    localStorage.removeItem('am_token');
    localStorage.removeItem('am_user');
    onLogout();
  };

  const membership = user?.membership || 'free';

  return (
    <div className="am-panel">
      {showAuth && (
        <AuthModal
          defaultTab={authTab}
          onClose={() => setShowAuth(false)}
          onLogin={(u) => { setShowAuth(false); onLogin(u); }}
        />
      )}
      <div className="am-panel-header">
        <img src="/animemist-logo.png" alt="Anime Mist" />
        <h1>Membership</h1>
        {user ? (
          <button className="am-close-btn" style={{ marginRight: 8, width: 'auto', padding: '0 14px', fontSize: 13 }} onClick={handleLogout}>Sign Out</button>
        ) : (
          <button className="am-close-btn" style={{ marginRight: 8, width: 'auto', padding: '0 14px', fontSize: 13 }} onClick={() => { setAuthTab('login'); setShowAuth(true); }}>Sign In</button>
        )}
        <button className="am-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="am-content">
        {user ? (
          <div className="am-user-bar">
            <div className="am-avatar">{user.username?.[0]?.toUpperCase() || '?'}</div>
            <div className="am-user-info">
              <h3>{user.username}</h3>
              <p>{user.email}</p>
            </div>
            <span className={`am-badge am-badge-${membership}`}>
              {membership.toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="am-sign-in-prompt">
            <h3>Sign in to manage your membership</h3>
            <p>Create a free account to track your anime, access premium features, and more.</p>
            <button className="am-btn" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => { setAuthTab('login'); setShowAuth(true); }}>Sign In / Create Account</button>
          </div>
        )}

        {upgradeMsg && <div className="am-success" style={{ marginBottom: 24 }}>{upgradeMsg}</div>}

        <h2 className="am-section-title">Choose Your Plan</h2>
        <div className="am-plans">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`am-plan-card ${plan.featured ? 'featured' : ''}`}>
              <div className="am-plan-name">{plan.name}</div>
              <div className="am-plan-price">{plan.price}<span> {plan.period}</span></div>
              <ul className="am-plan-features">
                {plan.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button
                className={`am-plan-btn ${plan.btnClass}`}
                disabled={plan.id === 'free' || (user && user.membership === plan.id)}
                onClick={() => handleUpgrade(plan.id)}
              >
                {user && user.membership === plan.id ? '✓ Current Plan' : plan.btnLabel}
              </button>
            </div>
          ))}
        </div>

        <h2 className="am-section-title">Frequently Asked Questions</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { q: 'Can I cancel anytime?', a: 'Yes! You can cancel your subscription at any time. Your premium access will remain until the end of the billing period.' },
            { q: 'What payment methods are accepted?', a: 'We accept UPI, credit/debit cards, net banking, and popular wallets (Paytm, PhonePe, Google Pay).' },
            { q: 'Is content available in Hindi?', a: 'We stream content directly from HiAnime which provides Japanese (sub) and English (dub) audio. Hindi-dubbed anime is not currently available in our source.' },
            { q: 'Can I use my account on multiple devices?', a: 'Free and Premium plans support 2 devices. VIP members can stream on up to 5 devices simultaneously.' },
          ].map((faq) => (
            <div key={faq.q} style={{ background: '#13131f', border: '1px solid #7c3aed22', borderRadius: 10, padding: '16px 20px' }}>
              <p style={{ color: '#a78bfa', fontWeight: 700, margin: '0 0 8px', fontSize: 15 }}>{faq.q}</p>
              <p style={{ color: '#9ca3af', margin: 0, fontSize: 14, lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
