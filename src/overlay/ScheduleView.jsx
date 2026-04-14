import React, { useState, useEffect } from 'react';

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function formatDayLabel(d) {
  const today = new Date();
  const diff = Math.round((d - new Date(formatDate(today))) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeUntil(seconds) {
  if (seconds <= 0) return 'Aired';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

export default function ScheduleView({ onClose }) {
  const [date, setDate] = useState(new Date());
  const [animes, setAnimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/schedule?date=${formatDate(date)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setAnimes(Array.isArray(data.results) ? data.results : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setError('Failed to load schedule'); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [date]);

  const goDay = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d);
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i - 3);
    return d;
  });

  return (
    <div className="am-panel">
      <div className="am-panel-header">
        <img src="/animemist-logo.png" alt="Anime Mist" />
        <h1>Release Calendar</h1>
        <button className="am-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="am-content">
        <div className="am-date-nav">
          <button className="am-date-btn" onClick={() => goDay(-1)}>← Prev</button>
          <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {days.map((d) => {
              const ds = formatDate(d);
              const active = formatDate(date) === ds;
              return (
                <button
                  key={ds}
                  className={`am-date-btn ${active ? 'active' : ''}`}
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => setDate(new Date(d))}
                >
                  {formatDayLabel(d)}
                </button>
              );
            })}
          </div>
          <button className="am-date-btn" onClick={() => goDay(1)}>Next →</button>
        </div>

        <h3 style={{ color: '#fff', margin: '0 0 20px', fontSize: 18 }}>
          {formatDayLabel(date)} —{' '}
          <span style={{ color: '#6b7280', fontSize: 14 }}>
            {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </h3>

        {loading && (
          <div className="am-loading">
            <div className="am-spinner"></div>
            <p>Loading schedule...</p>
          </div>
        )}

        {!loading && error && <div className="am-error">{error}</div>}

        {!loading && !error && animes.length === 0 && (
          <div className="am-empty">No anime scheduled for this date.</div>
        )}

        {!loading && !error && animes.length > 0 && (
          <>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px' }}>
              {animes.length} anime airing on this date (times in JST)
            </p>
            <div className="am-schedule-grid">
              {animes
                .sort((a, b) => (a.airingTimestamp || 0) - (b.airingTimestamp || 0))
                .map((anime) => (
                  <div key={anime.id} className="am-schedule-card">
                    <div className="am-schedule-time">
                      {anime.time || '--:--'}
                      <small>JST</small>
                    </div>
                    <div className="am-schedule-info">
                      <h4>{anime.name}</h4>
                      {anime.jname && <p>{anime.jname}</p>}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {anime.episode && (
                          <span className="am-schedule-ep">Episode {anime.episode}</span>
                        )}
                        {anime.secondsUntilAiring !== undefined && (
                          <span style={{ color: anime.secondsUntilAiring > 0 ? '#a78bfa' : '#6b7280', fontSize: 12 }}>
                            {timeUntil(anime.secondsUntilAiring)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
