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

  // Global haptic feedback on every tap of an interactive element.
  // Centralised here so we don't have to remember to call lightTap() on
  // every onClick across the codebase — TravelTracker rows, profile
  // toggles, settings rows, Add Transaction's category chips, etc. all
  // get press feedback automatically.
  //
  // Explicit per-action haptics (successTap on save, errorTap on delete)
  // keep working — those layer on top of this press-down feedback.
  //
  // Opt out on a specific element with:  data-haptic="off"
  // (or any ancestor with the same attribute — useful for inert content
  //  blocks that happen to be inside a tappable card).
  if (window.Capacitor?.isNativePlatform?.()) {
    const HAPTIC_SELECTOR = 'button, a, [role="button"], [data-haptic], .nav-item, .fab, .chip, .form-input, .nav-pill, summary, label';
    let _hapticsModule = null;
    let _lastFireAt = 0;
    function fireGlobalLightTap() {
      // 50ms debounce — protects against double-fires (pointerdown can
      // sometimes fire alongside synthetic events on iOS) and avoids
      // overlapping with explicit haptic calls in the same gesture.
      const now = Date.now();
      if (now - _lastFireAt < 50) return;
      _lastFireAt = now;
      try { if (localStorage.getItem('coinova_haptic_enabled') === 'false') return; } catch {}
      const fire = () => {
        try { _hapticsModule.Haptics.impact({ style: _hapticsModule.ImpactStyle.Light }).catch(() => {}); } catch {}
      };
      if (_hapticsModule) { fire(); return; }
      import('@capacitor/haptics').then(mod => { _hapticsModule = mod; fire(); }).catch(() => {});
    }
    // Defer the haptic until pointerup so we can distinguish taps from
    // scrolls. pointerdown fires for every touch — including the start
    // of a scroll gesture, which would otherwise buzz every time the
    // user lifts a finger to scroll a list. We only fire if:
    //   - The pointer moved less than 10px between down and up (tap),
    //   - The press was shorter than 500ms (not a long-press / context menu).
    let pending = null;
    const TAP_MAX_MOVE = 10;   // px slack — fingers wiggle slightly even on a clean tap
    const TAP_MAX_TIME = 500;  // ms — anything longer is a long-press, not a tap

    function resolveHapticTarget(eventTarget) {
      let target = eventTarget?.closest?.(HAPTIC_SELECTOR);
      if (!target) {
        // Fallback: walk up to ~6 ancestors looking for cursor:pointer.
        // 6 deep is enough to cover any sane component nesting and avoids
        // walking the whole document on a stray tap.
        let el = eventTarget;
        for (let i = 0; i < 6 && el && el !== document.body; i++) {
          try {
            if (window.getComputedStyle(el).cursor === 'pointer') { target = el; break; }
          } catch {}
          el = el.parentElement;
        }
      }
      if (!target) return null;
      if (target.disabled || target.getAttribute?.('aria-disabled') === 'true') return null;
      if (target.dataset?.haptic === 'off' || target.closest?.('[data-haptic="off"]')) return null;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (document.activeElement === target) return null;
      }
      return target;
    }

    document.addEventListener('pointerdown', (e) => {
      const target = resolveHapticTarget(e.target);
      if (!target) { pending = null; return; }
      pending = { x: e.clientX, y: e.clientY, t: Date.now() };
    }, { capture: true, passive: true });

    document.addEventListener('pointermove', (e) => {
      if (!pending) return;
      const dx = Math.abs(e.clientX - pending.x);
      const dy = Math.abs(e.clientY - pending.y);
      if (dx > TAP_MAX_MOVE || dy > TAP_MAX_MOVE) pending = null;
    }, { capture: true, passive: true });

    document.addEventListener('pointerup', (e) => {
      if (!pending) return;
      const dx = Math.abs(e.clientX - pending.x);
      const dy = Math.abs(e.clientY - pending.y);
      const dt = Date.now() - pending.t;
      pending = null;
      if (dx <= TAP_MAX_MOVE && dy <= TAP_MAX_MOVE && dt <= TAP_MAX_TIME) {
        fireGlobalLightTap();
      }
    }, { capture: true, passive: true });

    document.addEventListener('pointercancel', () => { pending = null; },
      { capture: true, passive: true });
    // iOS sometimes converts a touch sequence into a `scroll` and silently
    // drops pointerup. Cancel pending tap on document scroll for safety.
    document.addEventListener('scroll', () => { pending = null; },
      { capture: true, passive: true });
  }
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
