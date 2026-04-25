import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Detect native Capacitor environment
if (window.Capacitor || navigator.userAgent.includes('Capacitor')) {
  document.body.classList.add('capacitor');
  const platform = window.Capacitor?.getPlatform?.();
  if (platform) document.body.classList.add(`capacitor-${platform}`);

  // Global keyboard-avoidance system.
  // 1. Sets --kb-height CSS variable when keyboard opens.
  // 2. Toggles body.keyboard-open BEFORE iOS slides the keyboard up, so our
  //    CSS transitions (BottomNav slide-out, sheet max-height re-anchor) run
  //    in lockstep with the native keyboard animation rather than chasing it.
  // 3. Scrolls focused input into view within its scrollable parent.
  if (window.Capacitor?.isNativePlatform?.()) {
    import('@capacitor/keyboard').then(({ Keyboard }) => {
      Keyboard.addListener('keyboardWillShow', (info) => {
        // Set CSS var first (no transition consumer on this), then add the
        // class on the next frame so the browser sees the start state and
        // animates to the end state instead of jumping to it.
        document.documentElement.style.setProperty('--kb-height', `${info.keyboardHeight}px`);
        requestAnimationFrame(() => {
          document.body.classList.add('keyboard-open');
        });
      });
      Keyboard.addListener('keyboardWillHide', () => {
        document.documentElement.style.setProperty('--kb-height', '0px');
        requestAnimationFrame(() => {
          document.body.classList.remove('keyboard-open');
        });
      });
    }).catch(() => {});
  }

  // NOTE: We deliberately do NOT manually scrollIntoView focused inputs.
  //
  // With Capacitor's `Keyboard.resize: "native"`, both iOS WKWebView and
  // Android WebView shrink their frame as the keyboard slides up and natively
  // scroll the focused input into the new visible area. Layering a JS
  // setTimeout + smooth scrollIntoView on top of that causes the "jump":
  //   1. iOS scrolls the input into view as part of the keyboard animation.
  //   2. 250ms later our handler fires a SECOND smooth scroll to "center" —
  //      visible double-motion.
  //   3. The math also double-counts the keyboard height (innerHeight
  //      already excludes the keyboard with resize: native), so the
  //      handler almost always thought the input was off-screen and
  //      triggered the redundant scroll.
  // Removing it lets the native keyboard animation be the only motion.
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
  <App />
)
