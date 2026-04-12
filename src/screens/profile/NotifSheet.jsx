import React, { useState, useEffect } from 'react';

export default function NotifSheet({ currentUser, isDark, onClose }) {
  const storageKey = currentUser ? `coinova_notif_prefs_${currentUser.uid}` : null;
  const [permStatus, setPermStatus] = useState('unknown');
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = storageKey ? localStorage.getItem(storageKey) : null;
      return saved ? JSON.parse(saved) : { budgetAlerts: true, billReminders: true, weeklySummary: false, savingsGoalMilestones: true };
    } catch { return { budgetAlerts: true, billReminders: true, weeklySummary: false, savingsGoalMilestones: true }; }
  });
  const [budgetThreshold, setBudgetThreshold] = useState(() => {
    try { return storageKey ? parseInt(localStorage.getItem(storageKey + '_threshold') || '80') : 80; } catch { return 80; }
  });

  useEffect(() => {
    import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
      LocalNotifications.checkPermissions().then(result => setPermStatus(result.display)).catch(() => {});
    }).catch(() => setPermStatus('web'));
  }, []);

  async function toggle(key) {
    if (!prefs[key]) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') { const req = await LocalNotifications.requestPermissions(); setPermStatus(req.display); if (req.display === 'denied') return; }
      } catch {}
    }
    setPrefs(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }

  function updateThreshold(val) {
    setBudgetThreshold(val);
    if (storageKey) localStorage.setItem(storageKey + '_threshold', String(val));
  }

  const notifOptions = [
    { key: 'budgetAlerts', label: 'Budget Alerts', sub: `Alert when spending hits ${budgetThreshold}% of your budget limit`, icon: '📊', hasSlider: true },
    { key: 'billReminders', label: 'Bill Reminders', sub: 'Upcoming recurring bills (3 days before due)', icon: '📅' },
    { key: 'weeklySummary', label: 'Weekly Summary', sub: 'Spending summary every Sunday', icon: '📈' },
    { key: 'savingsGoalMilestones', label: 'Savings Milestones', sub: 'When you hit 25%, 50%, 75%, 100% of a goal', icon: '🎯' },
  ];

  return (
    <div className="sheet-slide-in" style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="safe-top" style={{ padding: '0 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</div>
        <div onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div className="card" style={{ padding: '0 16px' }}>
          {notifOptions.map((opt, i) => (
            <div key={opt.key} style={{ padding: '14px 0', borderBottom: i < notifOptions.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{opt.icon}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>{opt.sub}</div></div>
                <div onClick={() => toggle(opt.key)} style={{ width: 48, height: 28, borderRadius: 14, cursor: 'pointer', flexShrink: 0, background: prefs[opt.key] ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.25s ease' }}><div style={{ position: 'absolute', top: 3, left: prefs[opt.key] ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)' }} /></div>
              </div>
              {opt.hasSlider && prefs[opt.key] && (
                <div style={{ marginTop: 12, marginLeft: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Alert threshold</span><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{budgetThreshold}%</span></div>
                  <input type="range" min="50" max="100" step="5" value={budgetThreshold} onChange={e => updateThreshold(parseInt(e.target.value))} style={{ width: '100%', height: 4, borderRadius: 2, appearance: 'none', WebkitAppearance: 'none', background: `linear-gradient(to right, var(--accent) ${(budgetThreshold - 50) * 2}%, var(--surface2) ${(budgetThreshold - 50) * 2}%)`, outline: 'none', cursor: 'pointer' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>50%</span><span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>75%</span><span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>100%</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '14px 16px', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 20, flexShrink: 0 }}>📳</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Haptic Feedback</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>Vibration on taps & actions</div></div>
            <div onClick={() => { const current = localStorage.getItem('coinova_haptic_enabled') !== 'false'; localStorage.setItem('coinova_haptic_enabled', current ? 'false' : 'true'); setPrefs(p => ({ ...p })); }} style={{ width: 48, height: 28, borderRadius: 14, cursor: 'pointer', background: localStorage.getItem('coinova_haptic_enabled') !== 'false' ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.25s ease', flexShrink: 0 }}><div style={{ position: 'absolute', top: 3, left: localStorage.getItem('coinova_haptic_enabled') !== 'false' ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)' }} /></div>
          </div>
        </div>
        <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: permStatus === 'granted' ? 'rgba(16,185,129,0.06)' : isDark ? 'rgba(10,108,255,0.06)' : 'rgba(10,108,255,0.04)', border: `1px solid ${permStatus === 'granted' ? 'rgba(16,185,129,0.15)' : 'rgba(10,108,255,0.1)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: permStatus === 'granted' && Object.values(prefs).some(v => v) ? 'var(--success)' : permStatus === 'denied' ? 'var(--danger)' : 'var(--warning)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: permStatus === 'granted' && Object.values(prefs).some(v => v) ? 'var(--success)' : permStatus === 'denied' ? 'var(--danger)' : 'var(--text-tertiary)' }}>
              {permStatus === 'granted' ? (Object.values(prefs).some(v => v) ? 'Notifications enabled' : 'All notifications turned off') : permStatus === 'denied' ? 'Notifications blocked — enable in Settings' : permStatus === 'web' ? 'Notifications available on iOS app' : 'Tap a toggle to enable notifications'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>Local notifications for budget alerts, bill reminders, and savings milestones.</div>
        </div>
      </div>
    </div>
  );
}
