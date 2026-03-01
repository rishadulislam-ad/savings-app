export default function BottomNav({ activeTab, onTabChange, onAdd }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'transactions', label: 'Transactions', icon: ListIcon },
    { id: 'add', label: '', icon: null },
    { id: 'budgets', label: 'Budgets', icon: ChartIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className="bottom-nav">
      {tabs.map(tab => {
        if (tab.id === 'add') {
          return (
            <div key="add" className="fab-container">
              <button className="fab" onClick={onAdd} aria-label="Add transaction">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 4V18M4 11H18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          );
        }
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <div className="nav-icon">
              <Icon active={isActive} />
            </div>
            <span className="nav-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HomeIcon({ active }) {
  const c = active ? '#0A6CFF' : '#9CA3AF';
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3L19 9.5V19C19 19.55 18.55 20 18 20H14V14H8V20H4C3.45 20 3 19.55 3 19V9.5Z"
        fill={active ? c : 'none'} stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}
function ListIcon({ active }) {
  const c = active ? '#0A6CFF' : '#9CA3AF';
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="5" width="16" height="2.5" rx="1.25" fill={c}/>
      <rect x="3" y="10" width="16" height="2.5" rx="1.25" fill={c} fillOpacity={active ? 1 : 0.5}/>
      <rect x="3" y="15" width="10" height="2.5" rx="1.25" fill={c} fillOpacity={active ? 1 : 0.35}/>
    </svg>
  );
}
function ChartIcon({ active }) {
  const c = active ? '#0A6CFF' : '#9CA3AF';
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="12" width="4" height="7" rx="1.5" fill={c} fillOpacity={active ? 1 : 0.5}/>
      <rect x="9" y="7" width="4" height="12" rx="1.5" fill={c}/>
      <rect x="15" y="4" width="4" height="15" rx="1.5" fill={c} fillOpacity={active ? 1 : 0.6}/>
    </svg>
  );
}
function UserIcon({ active }) {
  const c = active ? '#0A6CFF' : '#9CA3AF';
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="4" fill={active ? c : 'none'} stroke={c} strokeWidth="1.8"/>
      <path d="M4 19C4 15.686 7.134 13 11 13C14.866 13 18 15.686 18 19"
        stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
