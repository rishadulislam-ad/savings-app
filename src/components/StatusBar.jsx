export default function StatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="status-bar">
      <span className="status-time">{time}</span>
      <div className="status-icons">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          <rect x="0" y="4" width="3" height="8" rx="1" fill="#0D1117" fillOpacity="0.35"/>
          <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" fill="#0D1117" fillOpacity="0.55"/>
          <rect x="9" y="0.5" width="3" height="11.5" rx="1" fill="#0D1117" fillOpacity="0.75"/>
          <rect x="13.5" y="0" width="3" height="12" rx="1" fill="#0D1117"/>
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 2.4C10.65 2.4 13.05 3.46 14.8 5.2L16 4C13.9 1.9 11.1 0.6 8 0.6C4.9 0.6 2.1 1.9 0 4L1.2 5.2C2.95 3.46 5.35 2.4 8 2.4Z" fill="#0D1117" fillOpacity="0.35"/>
          <path d="M8 5.2C9.85 5.2 11.53 5.94 12.77 7.14L13.97 5.94C12.38 4.38 10.3 3.4 8 3.4C5.7 3.4 3.62 4.38 2.03 5.94L3.23 7.14C4.47 5.94 6.15 5.2 8 5.2Z" fill="#0D1117" fillOpacity="0.65"/>
          <path d="M8 8C9.1 8 10.1 8.44 10.83 9.16L12 8C10.93 6.95 9.54 6.3 8 6.3C6.46 6.3 5.07 6.95 4 8L5.17 9.16C5.9 8.44 6.9 8 8 8Z" fill="#0D1117" fillOpacity="0.85"/>
          <circle cx="8" cy="11" r="1.5" fill="#0D1117"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#0D1117" strokeOpacity="0.35"/>
          <rect x="2" y="2" width="16" height="8" rx="2" fill="#0D1117"/>
          <path d="M23 4.5V7.5C23.83 7.22 24.5 6.69 24.5 6C24.5 5.31 23.83 4.78 23 4.5Z" fill="#0D1117" fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}
