import { createContext, useContext, useState, useEffect } from 'react';
import { saveUserData } from '../utils/firestore';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const ThemeContext = createContext();

const DARK_BG  = '#0E0F14';
const LIGHT_BG = '#F5F6FA';

function applyStatusBar(isDark) {
  // Update HTML meta theme-color for Android Chrome / PWA
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? DARK_BG : LIGHT_BG);

  // Native status bar via Capacitor plugin.
  // NOTE: The Style enum naming is counterintuitive:
  //   Style.Dark  = "DARK"  = light/white text (for dark backgrounds)
  //   Style.Light = "LIGHT" = dark/black text (for light backgrounds)
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
  }
}

export function ThemeProvider({ children, userId }) {
  const themeKey = userId ? `coinova-theme-${userId}` : 'coinova-theme';
  const currencyKey = userId ? `coinova-currency-${userId}` : 'coinova-currency';

  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem(themeKey) !== 'light'; } catch { return true; }
  });

  const [currency, setCurrency] = useState(() => {
    try { return localStorage.getItem(currencyKey) || 'USD'; } catch { return 'USD'; }
  });

  // Re-load when userId changes
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(themeKey);
      setIsDark(savedTheme !== 'light');
      const savedCur = localStorage.getItem(currencyKey);
      setCurrency(savedCur || 'USD');
    } catch {}
  }, [themeKey, currencyKey]);

  // Re-read currency when Firestore sync delivers data from another device
  useEffect(() => {
    function handleSync() {
      try {
        const savedCur = localStorage.getItem(currencyKey);
        if (savedCur) setCurrency(prev => prev !== savedCur ? savedCur : prev);
      } catch {}
    }
    window.addEventListener('coinova-data-sync', handleSync);
    return () => window.removeEventListener('coinova-data-sync', handleSync);
  }, [currencyKey]);

  useEffect(() => {
    try { localStorage.setItem(themeKey, isDark ? 'dark' : 'light'); } catch {}
    applyStatusBar(isDark);
  }, [isDark, themeKey]);

  useEffect(() => {
    try { localStorage.setItem(currencyKey, currency); } catch {}
    if (userId) saveUserData(userId, { currency });
  }, [currency, currencyKey, userId]);

  function toggleTheme() {
    setIsDark(prev => !prev);
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, currency, setCurrency }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
