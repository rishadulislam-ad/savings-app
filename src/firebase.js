import { initializeApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  CustomProvider,
} from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const app = initializeApp(firebaseConfig);

// App Check — protects Firebase backend from unauthorized clients.
// Web (PWA / browser): reCAPTCHA v3
// Native (iOS / Android via Capacitor): App Attest / Play Integrity through
// the @capacitor-firebase/app-check plugin, bridged into the JS SDK via a
// CustomProvider so the WebView's Firestore calls carry valid tokens.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const isNative = Capacitor.isNativePlatform();

try {
  if (isNative) {
    // Native: bridge tokens from the native plugin into the JS SDK.
    //
    // Token TTL is 15 min instead of 1h. Reasoning: the SDK auto-refreshes
    // on expiry, and shorter tokens mean a much smaller window in which a
    // leaked token could be replayed by an off-device attacker. The native
    // App Attest / Play Integrity attestation behind the token isn't free
    // but is well within mobile data/battery budget at 4 refreshes/hour.
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => {
          // forceRefresh: true ensures the plugin re-attests with the OS on
          // each fetch instead of returning a cached token, so the 15-min
          // window is real (and not extended by a stale cache).
          const { token } = await FirebaseAppCheck.getToken({
            forceRefresh: true,
          });
          return {
            token,
            expireTimeMillis: Date.now() + 15 * 60 * 1000, // 15 min
          };
        },
      }),
      isTokenAutoRefreshEnabled: true,
    });
  } else if (recaptchaSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch (e) {
  console.warn('App Check init failed:', e);
}

export const auth = getAuth(app);
// Persist auth session in localStorage so user stays logged in offline
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const googleProvider = new GoogleAuthProvider();

// Firestore with offline persistence — reads/writes work without internet,
// and sync automatically when connection returns
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
});
