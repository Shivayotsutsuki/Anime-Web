import React, { useState, useEffect } from 'react';
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
      'Japanese & English audio',
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
      'Japanese, English & Hindi audio 🇮🇳',
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
      'Hindi audio for all anime 🇮🇳',
      'Multi-device streaming (5 screens)',
      'Exclusive VIP content',
      'No regional restrictions',
      'Dedicated 24/7 support',
    ],
    btnClass: 'am-plan-btn-vip',
    btnLabel: 'Get VIP',
  },
];

export default function MembershipPage({ user, onClose, onLogin, onLogout, defaultAuthTab, upgradeMsg }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState(defaultAuthTab || 'login');
  const [localUpgradeMsg, setLocalUpgradeMsg] = useState(upgradeMsg || '');
  const [internalMsg, setInternalMsg] = useState('');
  const [hindiActive, setHindiActive] = useState(localStorage.getItem('am_lang') === 'HI');

  useEffect(() => {
    if (upgradeMsg) setLocalUpgradeMsg(upgradeMsg);
  }, [upgradeMsg]);

  useEffect(() => {
    setAuthTab(defaultAuthTab || 'login');
  }, [defaultAuthTab]);

  const handleUpgrade = (planId) => {
    if (!user) { setAuthTab('register'); setShowAuth(true); return; }
    if (planId === 'free') return;
    setInternalMsg(`To upgrade to ${planId.toUpperCase()}, please contact us at support@animemist.com`);
    setTimeout(() => setInternalMsg(''), 6000);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('am_token');
      if (token) await fetch('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    localStorage.removeItem('am_token');
    localStorage.removeItem('am_user');
    localStorage.removeItem('am_lang');
    onLogout();
  };

  const toggleHindi = () => {
    if (hindiActive) {
      localStorage.removeItem('am_lang');
      setHindiActive(false);
    } else {
      localStorage.setItem('am_lang', 'HI');
      setHindiActive(true);
    }
  };

  const membership = user?.membership || 'free';
  const isPremium = membership === 'premium' || membership === 'vip';
  const openAuth = (tab) => { setAuthTab(tab); setShowAuth(true); };

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
          <>
            <button className="am-close-btn" style={{ marginRight: 4, width: 'auto', padding: '0 14px', fontSize: 13 }} onClick={() => openAuth('login')}>Sign In</button>
            <button className="am-close-btn" style={{ marginRight: 8, width: 'auto', padding: '0 14px', fontSize: 13, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', border: 'none' }} onClick={() => openAuth('register')}>Sign Up</button>
          </>
        )}
        <button className="am-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="am-content">
        {localUpgradeMsg && (
          <div className="am-error" style={{ background: '#1a0a3f', borderColor: '#7c3aed66', color: '#c4b5fd', marginBottom: 24 }}>
            🔒 {localUpgradeMsg}
          </div>
        )}

        {internalMsg && <div className="am-success" style={{ marginBottom: 24 }}>{internalMsg}</div>}

        {user ? (
          <>
            <div className="am-user-bar">
              <div className="am-avatar">{user.username?.[0]?.toUpperCase() || '?'}</div>
              <div className="am-user-info">
                <h3>{user.username}</h3>
                <p>{user.email}</p>
              </div>
              <span className={`am-badge am-badge-${membership}`}>{membership.toUpperCase()}</span>
            </div>

            {isPremium && (
              <div style={{ background: '#13131f', border: '1px solid #7c3aed44', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 28 }}>🇮🇳</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#fff', fontWeight: 700, margin: '0 0 4px', fontSize: 15 }}>Hindi Audio</p>
                  <p style={{ color: '#6b7280', margin: 0, fontSize: 13 }}>
                    {hindiActive ? 'Hindi mode is ON — selected as your preferred language.' : 'Enable Hindi as your preferred audio language.'}
                  </p>
                </div>
                <button
                  onClick={toggleHindi}
                  style={{
                    background: hindiActive ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#1f2937',
                    color: hindiActive ? '#fff' : '#9ca3af',
                    border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {hindiActive ? '✓ Enabled' : 'Enable'}
                </button>
              </div>
            )}

            {!isPremium && (
              <div style={{ background: '#13131f', border: '1px solid #374151', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, opacity: 0.7 }}>
                <span style={{ fontSize: 28 }}>🇮🇳</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#fff', fontWeight: 700, margin: '0 0 4px', fontSize: 15 }}>Hindi Audio <span style={{ background: '#7c3aed22', color: '#a78bfa', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>PREMIUM</span></p>
                  <p style={{ color: '#6b7280', margin: 0, fontSize: 13 }}>Upgrade to Premium or VIP to unlock Hindi audio support.</p>
                </div>
                <button
                  onClick={() => handleUpgrade('premium')}
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Upgrade
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="am-sign-in-prompt">
            <h3>Sign in to manage your membership</h3>
            <p>Create a free account or sign in to access all features.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="am-btn" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => openAuth('login')}>Sign In</button>
              <button className="am-btn am-btn-secondary" style={{ width: 'auto', padding: '12px 28px' }} onClick={() => openAuth('register')}>Create Account</button>
            </div>
          </div>
        )}

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
            { q: 'How does Hindi audio work?', a: 'Premium and VIP members can enable Hindi audio mode from their account. When available, anime will play with Hindi dubbing. For titles without Hindi dub, the best available audio is used.' },
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
