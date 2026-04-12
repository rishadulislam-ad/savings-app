import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Detect native Capacitor environment
if (window.Capacitor || navigator.userAgent.includes('Capacitor')) {
  document.body.classList.add('capacitor');
  const platform = window.Capacitor?.getPlatform?.();
  if (platform) document.body.classList.add(`capacitor-${platform}`);

  // Capacitor handles keyboard avoidance natively.
  // No manual scrollIntoView needed — it causes jumping in modals/sheets.
}

// Initialize Google Auth plugin for native platforms
if (window.Capacitor?.isNativePlatform?.()) {
  const isIOS = window.Capacitor?.getPlatform?.() === 'ios';
  const clientId = isIOS
    ? '985643050956-jquj5kljd3gpshltjtjtmc11oh3qi7ce.apps.googleusercontent.com'
    : '985643050956-nno9t52tggabra5slqorc0v2582s08uc.apps.googleusercontent.com';
  import('@codetrix-studio/capacitor-google-auth').then(({ GoogleAuth }) => {
    GoogleAuth.initialize({
      clientId,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
  }).catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
