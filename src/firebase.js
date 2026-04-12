import { initializeApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  CustomProvider,
} from 'firebase/app-check';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => {
          const { token } = await FirebaseAppCheck.getToken({
            forceRefresh: false,
          });
          // The plugin returns expiry as ms-since-epoch; SDK wants ms-from-now.
          return {
            token,
            expireTimeMillis: Date.now() + 60 * 60 * 1000, // 1h
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
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
